#!/usr/bin/env node
// Node.js 20+. No npm dependencies. All Git operations use the caller's repository.
import { execFileSync } from "node:child_process";
import { realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolve } from "node:path";
import { createInterface } from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const SCOPES = ['unstaged', 'untracked', 'staged'];
const CONFLICTS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);
const CHANGE = { M: 'Modification', A: 'New File', D: 'Deletion', R: 'Rename', C: 'Copy', T: 'Type Change', U: 'Conflict' };
const COMMIT_CHANGE = { M: 'Modified', A: 'Added', D: 'Deleted', R: 'Renamed', C: 'Copied', T: 'Type Changed', U: 'Unmerged' };

const DIFF = ["diff", "--no-color", "--no-ext-diff", "--no-textconv"];

export const HELP = `Usage: ags git-changes [options]

Export changed files as a patch diff or as a readable status list.
No arguments opens the wizard when stdin, stdout and stderr are terminals.
Other invocations use the output defaults below, unless overridden.

  --interactive, -i       Open the wizard, using supplied options as defaults
  --format KIND           diff or list; non-interactive default is list
  --unstaged-only         Include tracked working-tree changes
  --untracked-only        Include untracked, non-ignored files
  --staged-only           Include index changes
                         Combine these flags; none selects all three scopes
  --no-working-tree       Exclude working-tree/index/untracked changes
  --latest-commits N      Include the latest N commits reachable from HEAD
  --commit REF           Include a specific commit; repeat for more commits
  --commits A,B          Include comma-separated commit refs; repeatable
  --output-to DEST       clipboard, file, or stdout (case-insensitive)
  --file-path PATH       Save to this file; implies --output-to file
  --force                Allow replacing an existing output file
  --cwd PATH             Select a Git directory instead of the invocation directory
  --help, -h             Show this help without requiring a Git repository

Aliases: --unstaged, --untracked, --staged, --latest, --output, --file.
Default output: clipboard in a terminal, stdout when redirected.
Clipboard unavailable: save a UTF-8 file in the invocation directory.
Relative output paths always use the invocation directory, including with --cwd.
Merge commits compare against their first parent; initial commits include additions.
Ignored files are excluded. No Git mutations, host registration, or AGS host copy needed.
`;

class UsageError extends Error {}
class Cancelled extends Error {}

function count(value) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new UsageError('Latest commits must be a non-negative safe integer.');
  }
  return Number(value);
}

function commaRefs(value) {
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

export function parseOptions(argv) {
  const booleans = ['interactive', 'unstaged-only', 'untracked-only', 'staged-only', 'unstaged', 'untracked', 'staged', 'no-working-tree', 'force', 'help'];
  const strings = ['latest-commits', 'latest', 'output-to', 'output', 'file-path', 'file', 'cwd', 'format'];
  const options = Object.fromEntries(booleans.map((name) => [name, { type: 'boolean' }]));
  for (const name of strings) options[name] = { type: 'string' };
  options.interactive.short = 'i';
  options.help.short = 'h';
  options.commit = { type: 'string', multiple: true };
  options.commits = { type: 'string', multiple: true };
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options, strict: true, allowPositionals: false }));
  } catch (error) {
    throw new UsageError(error.message);
  }
  if (values.help) return { help: true };
  function alias(long, short) {
    if (values[long] !== undefined && values[short] !== undefined && values[long] !== values[short]) {
      throw new UsageError(`Use only one value for --${long} / --${short}.`);
    }
    return values[long] ?? values[short];
  }
  const selected = SCOPES.filter((name) => values[`${name}-only`] || values[name]);
  if (values['no-working-tree'] && selected.length) {
    throw new UsageError('--no-working-tree cannot be combined with working-tree scope flags.');
  }
  const filePath = alias('file-path', 'file');
  const destination = alias('output-to', 'output')?.toLowerCase();
  if (destination !== undefined && !['clipboard', 'file', 'stdout'].includes(destination)) {
    throw new UsageError('--output-to must be clipboard, file, or stdout.');
  }
  if (filePath !== undefined && !filePath.trim()) throw new UsageError('--file-path cannot be empty.');
  if (filePath !== undefined && destination && destination !== 'file') {
    throw new UsageError('--file-path requires file output.');
  }
  if (values.force && destination !== 'file' && filePath === undefined && !values.interactive) {
    throw new UsageError('--force requires file output.');
  }
  const commitRefs = [...(values.commit ?? []), ...(values.commits ?? []).flatMap(commaRefs)];
  if ((values.commits ?? []).some((value) => commaRefs(value).length === 0) || commitRefs.some((ref) => !ref.trim() || ref.includes('\0'))) {
    throw new UsageError('Commit refs cannot be empty or contain NUL characters.');
  }
  if (values.cwd !== undefined && !values.cwd.trim()) throw new UsageError('--cwd cannot be empty.');
  const format = values.format?.toLowerCase();
  if (format !== undefined && !['diff', 'list'].includes(format)) {
    throw new UsageError('--format must be diff or list.');
  }
  return {
    interactive: Boolean(values.interactive),
    scopes: values['no-working-tree'] ? [] : selected.length ? selected : [...SCOPES],
    latestCommits: count(alias('latest-commits', 'latest') ?? '0'),
    commitRefs,
    destination: destination ?? (filePath !== undefined ? 'file' : undefined),
    filePath,
    force: Boolean(values.force),
    gitDirectory: values.cwd,
    format,
  };
}

// Keep control characters and ambiguous rename delimiters within one readable line.
export function displayPath(path) {
  if (!/[\u0000-\u001f\u007f-\u009f"\\]| -> |^\s|\s$/u.test(path)) return path;
  return JSON.stringify(path).replace(/[\u007f-\u009f]/gu, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function nulFields(raw) {
  if (!raw) return [];
  if (!raw.endsWith('\0')) throw new Error('Git returned an incomplete NUL-delimited response.');
  return raw.slice(0, -1).split('\0');
}

export function parseStatus(raw) {
  const fields = nulFields(raw);
  const entries = [];
  for (let i = 0; i < fields.length; i++) {
    const record = fields[i];
    if (record.length < 4 || record[2] !== ' ') throw new Error('Git returned an invalid porcelain status record.');
    const code = record.slice(0, 2);
    const path = record.slice(3);
    // Porcelain v1 -z emits the destination first, then the source.
    let source;
    if (/[RC]/.test(code)) {
      source = fields[++i];
      if (!source) throw new Error('Git returned an incomplete rename/copy record.');
    }
    entries.push({ code, path, source });
  }
  return entries;
}

export function parseCommitChanges(raw) {
  const fields = nulFields(raw);
  const entries = [];
  for (let i = 0; i < fields.length;) {
    const code = fields[i++];
    if (!/^[A-Z]\d*$/.test(code)) throw new Error('Git returned an invalid name-status record.');
    const first = fields[i++];
    if (!first) throw new Error('Git returned an incomplete name-status record.');
    if (/^[RC]/.test(code)) {
      const path = fields[i++];
      if (!path) throw new Error('Git returned an incomplete rename/copy record.');
      entries.push({ code, source: first, path });
    } else entries.push({ code, path: first });
  }
  return entries;
}

function pathDescription(entry) {
  return entry.source === undefined ? displayPath(entry.path) : `${displayPath(entry.source)} -> ${displayPath(entry.path)}`;
}

function workingTreeLabel(code) {
  if (code === '??') return 'Untracked';
  if (CONFLICTS.has(code)) return `Unmerged Conflict (${code})`;
  const [index, worktree] = code;
  if (index !== ' ' && worktree !== ' ') {
    return `Partially Staged (index: ${CHANGE[index] ?? index}; working tree: ${CHANGE[worktree] ?? worktree})`;
  }
  return index !== ' ' ? `Staged ${CHANGE[index] ?? `Change (${index})`}` : `Unstaged ${CHANGE[worktree] ?? `Change (${worktree})`}`;
}

function matchesScope(code, scopes) {
  if (code === '??') return scopes.includes('untracked');
  return (code[0] !== ' ' && scopes.includes('staged')) || (code[1] !== ' ' && scopes.includes('unstaged'));
}

function git(args, cwd, env, allowMissing = false) {
  try {
    return execFileSync('git', ['--no-pager', '--no-optional-locks', '-c', 'color.ui=false', ...args], {
      cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30_000, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (allowMissing && error.status === 1) return null;
    if (error.code === 'ENOENT') throw new Error('Git is not available on PATH.');
    throw new Error(`Git failed: ${String(error.stderr ?? '').trim() || error.message}`);
  }
}

function resolveExportContext(options, { cwd = process.cwd(), env = process.env } = {}) {
  const target = resolve(cwd, options.gitDirectory ?? '.');
  if (git(['rev-parse', '--is-inside-work-tree'], target, env).trim() !== 'true') {
    throw new Error('Run this command inside a Git working tree, or supply --cwd <repository>.');
  }
  const rootOutput = git(['rev-parse', '--show-toplevel'], target, env);
  const root = rootOutput.endsWith('\n') ? rootOutput.slice(0, -1) : rootOutput;
  const commits = [];
  const warnings = [];
  if (options.latestCommits > 0) {
    const head = git(['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], root, env, true);
    if (head === null) warnings.push('Repository has no commits; skipping --latest-commits.');
    else commits.push(...git(['rev-list', `--max-count=${options.latestCommits}`, 'HEAD', '--'], root, env).trim().split('\n').filter(Boolean));
  }
  for (const ref of options.commitRefs) {
    const sha = git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`], root, env, true);
    if (sha === null) throw new Error(`Cannot resolve commit ${displayPath(ref)}. Supply individual commit refs, not ranges.`);
    commits.push(sha.trim());
  }
  return { root, warnings, commits: [...new Set(commits)] };
}

function gitDiffOutput(args, root, env) {
  try {
    return execFileSync("git", ["--no-pager", "--no-optional-locks", "-c", "color.ui=false", "-c", "core.quotepath=false", ...args], {
      cwd: root, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 30_000, windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (error.status === 0 || error.status === 1) return error.stdout ?? "";
    if (error.code === "ENOENT") throw new Error("Git is not available on PATH.");
    throw new Error(`Git failed: ${String(error.stderr ?? "").trim() || error.message}`);
  }
}

let nullDiffTarget;

function gitNullDiffTarget(root, env) {
  if (nullDiffTarget) return nullDiffTarget;
  const probe = path.join(os.tmpdir(), `git-changes-null-${process.pid}.txt`);
  writeFileSync(probe, "probe\n");
  try {
    for (const candidate of process.platform === "win32" ? ["NUL", "/dev/null"] : ["/dev/null"]) {
      const out = gitDiffOutput(["diff", "--no-color", "--no-index", "--", candidate, probe], root, env);
      if (out.includes(path.basename(probe))) {
        nullDiffTarget = candidate;
        return nullDiffTarget;
      }
    }
  } finally {
    rmSync(probe, { force: true });
  }
  throw new Error("Git did not accept a null diff target.");
}

function commitPatch(sha, root, env) {
  const headers = git(["cat-file", "-p", sha], root, env).split("\n\n", 1)[0];
  const parents = [...headers.matchAll(/^parent ([0-9a-f]+)$/gm)].map((match) => match[1]);
  if (parents.length && git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${parents[0]}^{commit}`], root, env, true) === null) {
    throw new Error(`Cannot compare commit ${sha}: its first parent is unavailable. Deepen the shallow clone or select other commits.`);
  }
  const comparison = parents.length ? [parents[0], sha] : ["--root", sha];
  return gitDiffOutput(["diff-tree", "--no-commit-id", "-p", "-r", ...comparison, "--"], root, env);
}

function workingTreeDiff(scopes, root, env) {
  const parts = [];
  if (scopes.includes("staged")) {
    const staged = gitDiffOutput([...DIFF, "--cached"], root, env);
    if (staged) parts.push(staged);
  }
  if (scopes.includes("unstaged")) {
    const unstaged = gitDiffOutput(DIFF, root, env);
    if (unstaged) parts.push(unstaged);
  }
  if (scopes.includes("untracked")) {
    const files = (git(["ls-files", "-z", "--others", "--exclude-standard", "--", ".", ":(exclude).tmp/**"], root, env) || "")
      .split("\0").filter(Boolean);
    for (const file of files) {
      const patch = gitDiffOutput([...DIFF, "--no-index", "--", gitNullDiffTarget(root, env), file], root, env);
      if (patch) parts.push(patch);
    }
  }
  return parts.join("");
}

export function collectDiff(options, { cwd = process.cwd(), env = process.env } = {}) {
  const { root, warnings, commits } = resolveExportContext(options, { cwd, env });
  const sections = [];
  for (const sha of commits) {
    const patch = commitPatch(sha, root, env);
    if (patch) sections.push(`--- Commit ${sha} ---\n${patch}`);
  }
  if (options.scopes.length) {
    const patch = workingTreeDiff(options.scopes, root, env);
    if (patch) sections.push(`--- Working Tree ---\n${patch}`);
  }
  const text = sections.length ? `${sections.join("\n")}\n` : "";
  return { text, warnings, root };
}

export function collectChanges(options, { cwd = process.cwd(), env = process.env } = {}) {
  const { root, warnings, commits } = resolveExportContext(options, { cwd, env });
  const lines = [];
  for (const sha of commits) {
    // Read the actual object headers so a shallow boundary is not mistaken for an initial commit.
    const headers = git(['cat-file', '-p', sha], root, env).split('\n\n', 1)[0];
    const parents = [...headers.matchAll(/^parent ([0-9a-f]+)$/gm)].map((match) => match[1]);
    if (parents.length && git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${parents[0]}^{commit}`], root, env, true) === null) {
      throw new Error(`Cannot compare commit ${sha}: its first parent is unavailable. Deepen the shallow clone or select other commits.`);
    }
    // Explicit tree pairs make merge semantics independent of Git's merge-diff defaults.
    const comparison = parents.length ? [parents[0], sha] : ['--root', sha];
    const entries = parseCommitChanges(git(['diff-tree', '--no-commit-id', '--name-status', '-z', '-r', '--find-renames', ...comparison, '--'], root, env));
    if (!entries.length) continue;
    lines.push(`--- Files in Commit: ${sha} ---`);
    for (const entry of entries) lines.push(`${COMMIT_CHANGE[entry.code[0]] ?? `Changed (${entry.code})`}: ${pathDescription(entry)}`);
  }
  if (options.scopes.length) {
    const entries = parseStatus(git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--renames', '--ignore-submodules=none'], root, env))
      .filter((entry) => matchesScope(entry.code, options.scopes));
    if (entries.length) {
      lines.push('--- Working Tree Changes ---');
      for (const entry of entries) lines.push(`${workingTreeLabel(entry.code)}: ${pathDescription(entry)}`);
    }
  }
  return { lines, warnings, root };
}

export function defaultFileName(now = new Date(), format = "list") {
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  const ext = format === "diff" ? "diff" : "txt";
  return `git_export_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${pad(now.getMilliseconds(), 3)}.${ext}`;
}

export function copyToClipboard(text, { platform = process.platform, env = process.env, execute = execFileSync } = {}) {
  const powershell = "$ErrorActionPreference = 'Stop'; [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false); $text = [Console]::In.ReadToEnd(); Set-Clipboard -Value $text";
  let commands;
  if (platform === 'darwin') commands = [['/usr/bin/pbcopy', []]];
  else if (platform === 'win32') commands = [['pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', powershell]], ['powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', powershell]]];
  else if (platform === 'linux') commands = [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]];
  else throw new Error(`No clipboard backend for ${platform}.`);
  const failures = [];
  for (const [command, args] of commands) {
    try {
      execute(command, args, {
        input: text, encoding: 'utf8', env: platform === 'darwin' ? { ...env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' } : env,
        timeout: 5_000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      });
      return;
    } catch (error) {
      failures.push(`${command}: ${error.code ?? error.status ?? 'failed'}`);
    }
  }
  throw new Error(`Clipboard unavailable (${failures.join('; ')}).`);
}

async function wizard(options, input, output) {
  if (!input.isTTY || !output.isTTY) throw new UsageError('--interactive requires terminal input and stderr. Use explicit options for automation.');
  const rl = createInterface({ input, output, terminal: true });
  const abort = new AbortController();
  const cancel = () => abort.abort();
  rl.on('SIGINT', cancel);
  rl.on('close', cancel);
  async function ask(prompt) {
    try {
      return (await rl.question(prompt, { signal: abort.signal })).trim();
    } catch (error) {
      if (abort.signal.aborted) throw new Cancelled();
      throw error;
    }
  }
  async function choice(prompt, allowed, fallback) {
    while (true) {
      const answer = (await ask(prompt)) || fallback;
      if (allowed.includes(answer)) return answer;
      output.write(`Choose ${allowed.join(', ')}.\n`);
    }
  }
  try {
    output.write('=== Git Export Interactive Wizard ===\nPress Enter to accept the displayed default. Ctrl+C cancels.\n\n');
    output.write('File scope:\n  [1] Unstaged only\n  [2] Untracked only\n  [3] Staged only\n  [4] Custom combination\n  [5] All three scopes\n  [6] No working-tree changes\n');
    const initialScope = !options.scopes.length ? '6' : options.scopes.length === 3 ? '5' : options.scopes.length === 1 ? String(SCOPES.indexOf(options.scopes[0]) + 1) : '0';
    const scope = await choice(`Selection [${initialScope === '0' ? 'current combination' : initialScope}]: `, ['0', '1', '2', '3', '4', '5', '6'], initialScope);
    if (scope === '4') {
      options.scopes = [];
      for (const name of SCOPES) {
        if ((await choice(`Include ${name}? [y/N]: `, ['y', 'Y', 'n', 'N'], 'n')).toLowerCase() === 'y') options.scopes.push(name);
      }
    } else if (scope !== '0') options.scopes = scope === '5' ? [...SCOPES] : scope === '6' ? [] : [SCOPES[Number(scope) - 1]];
    while (true) {
      const answer = await ask(`How many latest commits? [${options.latestCommits}]: `);
      try {
        options.latestCommits = count(answer || String(options.latestCommits));
        break;
      } catch (error) { output.write(`${error.message}\n`); }
    }
    const refs = await ask(`Specific commits, comma-separated [${options.commitRefs.length ? options.commitRefs.join(', ') : 'none'}; '-' clears]: `);
    if (refs) options.commitRefs = refs === '-' ? [] : commaRefs(refs);
    output.write('\nOutput format:\n  [1] Patch diff (default)\n  [2] File list with change types\n');
    const formats = ['diff', 'list'];
    const initialFormat = options.format ? String(formats.indexOf(options.format) + 1) : '1';
    const formatChoice = await choice(`Selection [${initialFormat}]: `, ['1', '2'], initialFormat);
    options.format = formats[Number(formatChoice) - 1];
    output.write('\nDestination:\n  [1] Clipboard\n  [2] File\n  [3] Stdout\n');
    const destinations = ['clipboard', 'file', 'stdout'];
    const destination = await choice(`Selection [${destinations.indexOf(options.destination) + 1}]: `, ['1', '2', '3'], String(destinations.indexOf(options.destination) + 1));
    options.destination = destinations[Number(destination) - 1];
    if (options.destination === 'file') {
      const ext = options.format === "diff" ? "diff" : "txt";
      const path = await ask(`File path [${options.filePath ?? `git_export_[timestamp].${ext} in the invocation directory`}]: `);
      if (path) options.filePath = path;
    }
    return options;
  } finally {
    rl.removeListener('SIGINT', cancel);
    rl.removeListener('close', cancel);
    rl.close();
  }
}

export async function runGitChanges(argv = [], context = {}) {
  const cwd = resolve(context.cwd ?? process.cwd());
  const input = context.input ?? process.stdin;
  const output = context.output ?? process.stdout;
  const errorOutput = context.error ?? process.stderr;
  const env = context.env ?? process.env;
  try {
    let options = parseOptions(argv);
    if (options.help) { output.write(HELP); return 0; }
    options.destination ??= output.isTTY ? 'clipboard' : 'stdout';
    if (options.interactive || (argv.length === 0 && input.isTTY && output.isTTY && errorOutput.isTTY)) {
      options = await wizard(options, input, errorOutput);
    }
    options.format ??= "list";
    const useDiff = options.format === "diff";
    const result = useDiff ? collectDiff(options, { cwd, env }) : collectChanges(options, { cwd, env });
    for (const warning of result.warnings) errorOutput.write(`${warning}\n`);
    const text = useDiff ? result.text : (result.lines.length ? `${result.lines.join("\n")}\n` : "");
    const lineCount = useDiff ? (text ? text.split("\n").length - 1 : 0) : result.lines.length;
    if (!text) { errorOutput.write("No changes matched your criteria.\n"); return 0; }
    if (options.destination === 'stdout') { output.write(text); return 0; }
    if (options.destination === 'clipboard') {
      try {
        (context.copyToClipboard ?? copyToClipboard)(text, { platform: context.platform ?? process.platform, env });
        errorOutput.write(`${lineCount} lines copied to clipboard.\n`);
        return 0;
      } catch (error) {
        errorOutput.write(`${error.message} Saving a UTF-8 file instead.\n`);
        options.filePath = undefined;
        options.force = false;
      }
    }
    const destination = resolve(cwd, options.filePath ?? defaultFileName(context.now?.() ?? new Date(), options.format));
    try { writeFileSync(destination, text, { encoding: 'utf8', flag: options.force ? 'w' : 'wx' }); }
    catch (error) {
      if (error.code === 'EEXIST') throw new Error(`Output file exists: ${displayPath(destination)}. Choose another path or use --force.`);
      throw error;
    }
    errorOutput.write(`${lineCount} lines saved to ${displayPath(destination)}.\n`);
    return 0;
  } catch (error) {
    if (error instanceof Cancelled) { errorOutput.write('\nCancelled.\n'); return 130; }
    errorOutput.write(`${error.message}\n`);
    return error instanceof UsageError ? 2 : 1;
  }
}

function entryPointMatchesModule() {
  if (!process.argv[1]) return false;
  try {
    const entry = pathToFileURL(realpathSync.native(path.resolve(process.argv[1]))).href;
    const module = pathToFileURL(realpathSync.native(fileURLToPath(import.meta.url))).href;
    return entry === module;
  } catch {
    return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
  }
}
if (entryPointMatchesModule()) process.exitCode = await runGitChanges(process.argv.slice(2));
