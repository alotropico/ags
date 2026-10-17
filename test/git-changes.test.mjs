import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PassThrough, Writable } from 'node:stream';
import { test } from 'node:test';
import { collectChanges, collectDiff, copyToClipboard, defaultFileName, parseOptions, runGitChanges } from "../scripts/commands/git-changes.mjs";
import { makeHostRepo } from "./helpers/fixtures.mjs";

const script = fileURLToPath(new URL("../scripts/commands/git-changes.mjs", import.meta.url));
const ags = fileURLToPath(new URL("../scripts/ags.mjs", import.meta.url));
const gitEnv = {
  ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_AUTHOR_NAME: 'AGS Test', GIT_AUTHOR_EMAIL: 'ags-test@example.invalid',
  GIT_COMMITTER_NAME: 'AGS Test', GIT_COMMITTER_EMAIL: 'ags-test@example.invalid',
};
// Isolate fixtures from Git environment overrides in the invoking shell.
for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR']) delete gitEnv[name];

function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'ags-changes-'));
  const root = join(parent, 'repo with spaces');
  mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, env: gitEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (name, text) => writeFileSync(join(root, name), text);
  git('init', '-b', 'main');
  git('config', 'core.autocrlf', 'false');
  mkdirSync(join(root, 'subdir'));
  write('base.txt', 'base\n');
  write('partial.txt', 'initial\n');
  write('rename-source.txt', 'rename me\n');
  write('delete.txt', 'delete me\n');
  write('subdir/inside.txt', 'inside\n');
  write('.gitignore', 'ignored.txt\n');
  git('add', '.');
  git('commit', '-m', 'Initial');
  const initial = git('rev-parse', 'HEAD');
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  return { parent, root, git, write, initial };
}

function changes(f) {
  f.write('base.txt', 'unstaged\n');
  f.write('partial.txt', 'staged\n');
  f.git('add', 'partial.txt');
  f.write('partial.txt', 'staged then unstaged\n');
  f.write('staged-new.txt', 'new\n');
  f.git('add', 'staged-new.txt');
  f.git('mv', 'rename-source.txt', 'renamed target.txt');
  unlinkSync(join(f.root, 'delete.txt'));
  f.write('space café 😀.txt', 'untracked\n');
  f.write('ignored.txt', 'ignored\n');
}

function collect(f, args = [], cwd = f.root) {
  return collectChanges(parseOptions(args), { cwd, env: gitEnv }).lines.join('\n');
}

function capture() {
  let stdout = '';
  let stderr = '';
  return {
    input: { isTTY: false },
    output: { isTTY: false, write: (value) => { stdout += value; } },
    error: { isTTY: false, write: (value) => { stderr += value; } },
    get stdout() { return stdout; }, get stderr() { return stderr; },
  };
}

test('CLI scopes combine, empty scope is explicit, file implies destination, invalid values fail', () => {
  assert.deepEqual(parseOptions([]).scopes, ['unstaged', 'untracked', 'staged']);
  assert.deepEqual(parseOptions(['--unstaged-only', '--staged']).scopes, ['unstaged', 'staged']);
  assert.deepEqual(parseOptions(['--no-working-tree']).scopes, []);
  assert.equal(parseOptions(['--file', 'export.txt']).destination, 'file');
  assert.equal(parseOptions(['--output-to', 'Clipboard']).destination, 'clipboard');
  assert.deepEqual(parseOptions(['--commit', 'HEAD', '--commits', 'a, b']).commitRefs, ['HEAD', 'a', 'b']);
  assert.equal(parseOptions(['--format', 'diff']).format, 'diff');
  assert.equal(parseOptions([]).format, undefined);
  for (const argv of [['--latest', 'no'], ['--latest=1.5'], ['--latest=9007199254740992'], ['--no-working-tree', '--staged'], ['--output', 'bad'], ['--file', 'out', '--output', 'stdout'], ['--commits', ','], ['--commit', ''], ['--cwd', ''], ['--format', 'patch'], ['--unknown']]) {
    assert.throws(() => parseOptions(argv));
  }
});

test('empty list exports write no output file or clipboard payload', async (t) => {
  const f = fixture(t);
  const c = capture();
  const before = readdirSync(f.root);
  assert.equal(await runGitChanges(['--no-working-tree', '--output-to', 'stdout'], { ...c, cwd: f.root, env: gitEnv }), 0);
  assert.equal(c.stdout, '');
  assert.match(c.stderr, /No changes matched/);
  assert.deepEqual(readdirSync(f.root), before);
  let copied;
  assert.equal(await runGitChanges(['--no-working-tree', '--output-to', 'clipboard'], {
    ...c, cwd: f.root, env: gitEnv, copyToClipboard: (text) => { copied = text; },
  }), 0);
  assert.equal(copied, undefined);
  assert.match(c.stderr, /No changes matched/);
});

test('initial-commit patches ignore the working tree and match diff-tree', (t) => {
  const f = fixture(t);
  const expected = execFileSync('git', ['diff-tree', '--no-commit-id', '-p', '-r', '--root', f.initial], { cwd: f.root, env: gitEnv, encoding: 'utf8' }).trimEnd();
  const clean = collectDiff(parseOptions(['--commit', f.initial, '--no-working-tree', '--format', 'diff']), { cwd: f.root, env: gitEnv }).text.trimEnd();
  assert.equal(clean, `--- Commit ${f.initial} ---\n${expected}`);
  f.write('base.txt', 'dirty working tree\n');
  const dirty = collectDiff(parseOptions(['--commit', f.initial, '--no-working-tree', '--format', 'diff']), { cwd: f.root, env: gitEnv }).text.trimEnd();
  assert.equal(dirty, clean);
  assert.doesNotMatch(dirty, /dirty working tree/);
});

test('diff format exports patches for scoped working-tree and commit selections', (t) => {
  const f = fixture(t);
  changes(f);
  const patch = collectDiff(parseOptions(['--unstaged-only', '--format', 'diff']), { cwd: f.root, env: gitEnv }).text;
  assert.match(patch, /--- Working Tree ---\ndiff --git a\/base\.txt/);
  assert.doesNotMatch(patch, /staged-new\.txt/);
  f.write('base.txt', 'second\n');
  f.git('add', 'base.txt');
  f.git('commit', '-m', 'Second');
  const commitPatch = collectDiff(parseOptions(['--commit', 'HEAD', '--no-working-tree', '--format', 'diff']), { cwd: f.root, env: gitEnv }).text;
  assert.match(commitPatch, /--- Commit [0-9a-f]+ ---\ndiff --git/);
});

test('working-tree scopes, partial staging, deletion, rename, Unicode and ignored files', (t) => {
  const f = fixture(t);
  changes(f);
  const all = collect(f);
  assert.match(all, /Unstaged Modification: base\.txt/);
  assert.match(all, /Partially Staged .*: partial\.txt/);
  assert.match(all, /Staged New File: staged-new\.txt/);
  assert.match(all, /Unstaged Deletion: delete\.txt/);
  assert.match(all, /Staged Rename: rename-source\.txt -> renamed target\.txt/);
  assert.match(all, /Untracked: space café 😀\.txt/);
  assert.doesNotMatch(all, /ignored\.txt/);
  const staged = collect(f, ['--staged-only']);
  assert.match(staged, /partial\.txt/);
  assert.doesNotMatch(staged, /base\.txt|Untracked:/);
  const unstaged = collect(f, ['--unstaged-only']);
  assert.match(unstaged, /partial\.txt/);
  assert.doesNotMatch(unstaged, /staged-new\.txt|Untracked:/);
  const untracked = collect(f, ['--untracked-only']);
  assert.equal(untracked, '--- Working Tree Changes ---\nUntracked: space café 😀.txt');
  assert.equal((collect(f, ['--staged', '--unstaged']).match(/partial\.txt/g) ?? []).length, 1);
});

test('paths with tabs, newlines, escape characters and rename-like text remain one readable line', { skip: process.platform === 'win32' }, (t) => {
  const f = fixture(t);
  f.write('tab\tline\n\x1bfile.txt', 'x');
  f.git('mv', 'rename-source.txt', 'new -> name.txt');
  const all = collect(f);
  assert.match(all, /Untracked: "tab\\tline\\n\\u001bfile\.txt"/);
  assert.match(all, /Staged Rename: rename-source\.txt -> "new -> name\.txt"/);
  assert.equal(all.split('\n').length, 3);
});

test('subdirectory invocation covers the entire repository; --cwd works outside it', (t) => {
  const f = fixture(t);
  changes(f);
  assert.equal(collect(f, [], join(f.root, 'subdir')), collect(f));
  assert.equal(collect(f, ['--cwd', f.root], f.parent), collect(f));
});

test('latest commits include the initial commit, tolerate short history, and deduplicate refs by SHA', (t) => {
  const f = fixture(t);
  f.write('base.txt', 'second\n');
  f.git('add', 'base.txt');
  f.git('commit', '-m', 'Second');
  const text = collect(f, ['--latest', '99', '--commit', 'HEAD', '--commits', `${f.initial},HEAD~1`, '--no-working-tree']);
  assert.equal((text.match(/--- Files in Commit:/g) ?? []).length, 2);
  assert.ok(text.indexOf(f.git('rev-parse', 'HEAD')) < text.indexOf(f.initial));
  assert.match(text, /Added: base\.txt/);
  assert.match(text, /Modified: base\.txt/);
  assert.doesNotMatch(text, /Working Tree/);
});

test('commit renames preserve both paths', (t) => {
  const f = fixture(t);
  f.git('mv', 'rename-source.txt', 'new name.txt');
  f.git('commit', '-m', 'Rename');
  assert.match(collect(f, ['--commit', 'HEAD', '--no-working-tree']), /Renamed: rename-source\.txt -> new name\.txt/);
});

test('merge commits compare against their first parent', (t) => {
  const f = fixture(t);
  f.git('checkout', '-b', 'feature');
  f.write('feature.txt', 'feature\n');
  f.git('add', '.');
  f.git('commit', '-m', 'Feature');
  f.git('checkout', 'main');
  f.write('main-only.txt', 'main\n');
  f.git('add', '.');
  f.git('commit', '-m', 'Main');
  f.git('merge', '--no-ff', 'feature', '-m', 'Merge');
  const text = collect(f, ['--commit', 'HEAD', '--no-working-tree']);
  assert.match(text, /Added: feature\.txt/);
  assert.doesNotMatch(text, /main-only\.txt/);
});

test('merge conflicts are labelled explicitly in both staged and unstaged scope', (t) => {
  const f = fixture(t);
  f.git('checkout', '-b', 'feature');
  f.write('base.txt', 'feature\n');
  f.git('add', '.');
  f.git('commit', '-m', 'Feature');
  f.git('checkout', 'main');
  f.write('base.txt', 'main\n');
  f.git('add', '.');
  f.git('commit', '-m', 'Main');
  assert.throws(() => f.git('merge', 'feature'));
  for (const scope of ['--staged', '--unstaged']) assert.match(collect(f, [scope]), /Unmerged Conflict \(UU\): base\.txt/);
});

test('unborn repositories export untracked files and skip latest commits explicitly', (t) => {
  const f = fixture(t);
  const root = join(f.parent, 'unborn');
  mkdirSync(root);
  execFileSync('git', ['init', '-b', 'main'], { cwd: root, env: gitEnv, stdio: 'pipe' });
  writeFileSync(join(root, 'new.txt'), 'new');
  const result = collectChanges(parseOptions(['--latest', '3']), { cwd: root, env: gitEnv });
  assert.match(result.lines.join('\n'), /Untracked: new\.txt/);
  assert.match(result.warnings[0], /no commits/);
});

test('shallow boundaries fail clearly instead of claiming every file was added', (t) => {
  const f = fixture(t);
  f.write('base.txt', 'second\n');
  f.git('add', '.');
  f.git('commit', '-m', 'Second');
  const shallow = join(f.parent, 'shallow');
  execFileSync('git', ['clone', '--depth=1', pathToFileURL(f.root).href, shallow], { env: gitEnv, stdio: 'pipe' });
  assert.throws(() => collect(f, ['--latest', '1', '--no-working-tree'], shallow), /first parent is unavailable/);
});

test('linked Git worktrees do not require a .git directory or an AGS host install', (t) => {
  const f = fixture(t);
  const linked = join(f.parent, 'linked worktree');
  f.git('worktree', 'add', '--detach', linked, 'HEAD');
  writeFileSync(join(linked, 'base.txt'), 'linked\n');
  assert.match(collect(f, [], linked), /Unstaged Modification: base\.txt/);
});

test('non-TTY defaults to stdout, help works outside a repository, and explicit interactive needs a TTY', async (t) => {
  const f = fixture(t);
  changes(f);
  let c = capture();
  assert.equal(await runGitChanges([], { ...c, cwd: f.root, env: gitEnv }), 0);
  assert.equal(c.stdout, `${collect(f)}\n`);
  assert.equal(c.stderr, '');
  c = capture();
  assert.equal(await runGitChanges(['--help'], { ...c, cwd: f.parent }), 0);
  assert.match(c.stdout, /Usage: ags git-changes/);
  c = capture();
  assert.equal(await runGitChanges(['--interactive'], { ...c, cwd: f.root }), 2);
  assert.match(c.stderr, /requires terminal/);
});

test('relative file paths use invocation cwd, existing files are protected, and --force is explicit', async (t) => {
  const f = fixture(t);
  changes(f);
  const invocation = join(f.root, 'subdir');
  const path = join(invocation, 'export.txt');
  let c = capture();
  assert.equal(await runGitChanges(['--staged', '--file', 'export.txt'], { ...c, cwd: invocation, env: gitEnv }), 0);
  assert.equal(readFileSync(path, 'utf8'), `${collect(f, ['--staged'])}\n`);
  assert.equal(c.stdout, '');
  c = capture();
  assert.equal(await runGitChanges(['--staged', '--file', 'export.txt'], { ...c, cwd: invocation, env: gitEnv }), 1);
  assert.match(c.stderr, /Output file exists/);
  c = capture();
  assert.equal(await runGitChanges(['--staged', '--file', 'export.txt', '--force'], { ...c, cwd: invocation, env: gitEnv }), 0);
});

test('invalid refs produce no partial export or file writes', async (t) => {
  const f = fixture(t);
  const c = capture();
  const before = readdirSync(f.root);
  assert.equal(await runGitChanges(['--commit', 'HEAD', '--commit', 'does-not-exist', '--output', 'file'], { ...c, cwd: f.root, env: gitEnv }), 1);
  assert.equal(c.stdout, '');
  assert.deepEqual(readdirSync(f.root), before);
});

test('clipboard failure preserves the export in a UTF-8 file', async (t) => {
  const f = fixture(t);
  changes(f);
  const c = capture();
  const now = new Date(2026, 0, 2, 3, 4, 5, 6);
  assert.equal(await runGitChanges(['--untracked', '--output', 'clipboard'], {
    ...c, cwd: f.root, env: gitEnv, now: () => now,
    copyToClipboard: () => { throw new Error('Clipboard unavailable'); },
  }), 0);
  assert.equal(readFileSync(join(f.root, defaultFileName(now)), 'utf8'), '--- Working Tree Changes ---\nUntracked: space café 😀.txt\n');
  assert.match(c.stderr, /Saving a UTF-8 file instead/);
  // A wizard destination change must not reuse or overwrite a seeded file path.
  f.write('existing-export.txt', 'preserve this');
  const term = terminalContext(['\n', '\n', '\n', '2\n', '1\n']);
  const later = new Date(2026, 0, 2, 3, 4, 5, 7);
  assert.equal(await runGitChanges(['--interactive', '--untracked', '--file', 'existing-export.txt', '--force'], {
    ...term, cwd: f.root, env: gitEnv, now: () => later,
    copyToClipboard: () => { throw new Error('Clipboard unavailable'); },
  }), 0);
  assert.equal(readFileSync(join(f.root, 'existing-export.txt'), 'utf8'), 'preserve this');
  assert.ok(readFileSync(join(f.root, defaultFileName(later)), 'utf8').includes('space café 😀.txt'));
});

test('clipboard adapters pass payload on stdin and keep Windows commands fixed', () => {
  const payload = "café 😀 $([Console]::Write('unsafe')) `text`\n";
  const calls = [];
  const execute = (command, args, options) => {
    calls.push({ command, args, options });
    if (command === 'pwsh') throw Object.assign(new Error('missing'), { code: 'ENOENT' });
  };
  copyToClipboard(payload, { platform: 'win32', execute });
  assert.equal(calls[1].command, 'powershell.exe');
  assert.equal(calls[1].options.input, payload);
  assert.ok(!calls[1].args.join(' ').includes(payload));
  assert.match(calls[1].args.at(-1), /InputEncoding/);
  calls.length = 0;
  copyToClipboard(payload, { platform: 'darwin', env: { LANG: 'C' }, execute });
  assert.equal(calls[0].command, '/usr/bin/pbcopy');
  assert.equal(calls[0].options.env.LC_ALL, 'en_US.UTF-8');
  assert.equal(calls[0].options.input, payload);
});

test('standalone execution and a POSIX symlink work from another repository', (t) => {
  const f = fixture(t);
  changes(f);
  const text = execFileSync(process.execPath, [script, '--staged', '--output', 'stdout'], { cwd: join(f.root, 'subdir'), env: gitEnv, encoding: 'utf8' });
  assert.equal(text, `${collect(f, ['--staged'])}\n`);
  if (process.platform !== 'win32') {
    const link = join(f.parent, 'changes-link.mjs');
    symlinkSync(script, link);
    assert.equal(execFileSync(process.execPath, [link, '--help'], { cwd: f.parent, encoding: 'utf8' }).startsWith('Usage:'), true);
  }
});

function terminalContext(answers) {
  const input = new PassThrough();
  input.isTTY = true;
  let transcript = '';
  const output = new Writable({ write(chunk, encoding, callback) { callback(); } });
  output.isTTY = true;
  const error = new Writable({
    write(chunk, encoding, callback) {
      const text = String(chunk);
      transcript += text;
      if (text.endsWith(': ') && !text.startsWith('\x1b')) {
        const answer = answers.shift();
        if (answer === undefined) callback(new Error('Unexpected wizard prompt'));
        else { setImmediate(() => input.write(answer)); callback(); }
      } else callback();
    },
  });
  error.isTTY = true;
  return { input, output, error, get transcript() { return transcript; } };
}

test('interactive Enter defaults preserve the wizard and copy the selected export', async (t) => {
  const f = fixture(t);
  changes(f);
  const term = terminalContext(['\n', '\n', '\n', '\n', '\n']);
  let copied;
  assert.equal(await runGitChanges([], { ...term, cwd: f.root, env: gitEnv, copyToClipboard: (text) => { copied = text; } }), 0);
  assert.match(copied, /^--- Working Tree ---\ndiff --git /m);
  assert.match(term.transcript, /Interactive Wizard/);
});

test('interactive custom selection of no scopes really exports nothing', async (t) => {
  const f = fixture(t);
  changes(f);
  const term = terminalContext(['4\n', '\n', '\n', '\n', '\n', '\n', '\n', '3\n']);
  assert.equal(await runGitChanges(['--interactive'], { ...term, cwd: f.root, env: gitEnv }), 0);
  assert.match(term.transcript, /No changes matched/);
});

test("ags git-changes passes command flags through the CLI dispatcher", () => {
  const help = spawnSync(process.execPath, [ags, "git-changes", "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: ags git-changes/);
  const repo = makeHostRepo({ name: "ags git-changes café", files: { "base.txt": "base\n" } });
  const subdir = join(repo, "nested");
  mkdirSync(subdir);
  writeFileSync(join(repo, "base.txt"), "changed\n");
  const run = spawnSync(process.execPath, [ags, "git-changes", "--unstaged-only", "--output-to", "stdout", "--cwd", repo], { cwd: subdir, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Unstaged Modification: base\.txt/);
});

test('Ctrl+C and EOF cancel the wizard cleanly without creating output', async (t) => {
  const f = fixture(t);
  for (const key of ['\x03', '\x04']) {
    const term = terminalContext([key]);
    assert.equal(await runGitChanges(['--interactive'], { ...term, cwd: f.root, env: gitEnv }), 130);
    assert.match(term.transcript, /Cancelled/);
  }
});
