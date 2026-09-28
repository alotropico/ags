#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODES = ["commits", "range", "staged", "changes", "untracked", "current"];
const DIFF = ["diff", "--no-color", "--no-ext-diff", "--no-textconv"];

export class DiffError extends Error {}

function git(args, cwd, { allow = [0], input } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", input, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  if (result.error) throw new DiffError(`git failed to start: ${result.error.message}`);
  if (!allow.includes(result.status)) throw new DiffError(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  return result;
}

export function repoRoot(start) {
  return path.resolve(git(["rev-parse", "--show-toplevel"], start).stdout.trim());
}

export function diffBaseName(name) {
  if (!name || name !== path.basename(name) || /[\\/:*?"<>|]/.test(name)) throw new DiffError(`Name must be a plain filename: ${name}`);
  const base = name.toLowerCase().endsWith(".diff") ? name.slice(0, -5) : name;
  if (!base || base === "." || base === "..") throw new DiffError(`Name must contain a filename: ${name}`);
  return base;
}

export function positiveCount(value, available) {
  if (!/^[1-9]\d*$/.test(String(value))) throw new DiffError(`Commit count must be a positive integer: ${value}`);
  const count = Number(value);
  if (available != null && count > available) throw new DiffError(`N=${count} exceeds commit count on HEAD (${available})`);
  return count;
}

export function commitCount(repo) {
  return Number(git(["rev-list", "--first-parent", "--count", "HEAD"], repo).stdout.trim());
}

function resolveCommit(repo, ref) {
  return git(["rev-parse", "--verify", `${ref}^{commit}`], repo).stdout.trim();
}

export function emptyTreeId(repo) {
  const id = git(["hash-object", "-t", "tree", "--stdin"], repo, { input: "" }).stdout.trim();
  if (!id) throw new DiffError("Git did not return an empty tree id");
  return id;
}

function resolveBase(repo, value) {
  const available = commitCount(repo);
  const count = positiveCount(value, available);
  if (count < available) {
    resolveCommit(repo, `HEAD~${count}`);
    return { count, base: `HEAD~${count}`, atRoot: false };
  }
  return { count, base: emptyTreeId(repo), atRoot: true };
}

function gitBytes(repo, args) {
  return Buffer.from(git(["-c", "core.quotepath=false", ...args], repo).stdout || "", "utf8");
}

let nullSpec;

function gitNullSpec(repo) {
  if (nullSpec) return nullSpec;
  const probe = path.join(os.tmpdir(), `write-commit-diff-null-${process.pid}.txt`);
  fs.writeFileSync(probe, "probe\n");
  try {
    for (const candidate of process.platform === "win32" ? ["NUL", "/dev/null"] : ["/dev/null"]) {
      const result = git(["diff", "--no-color", "--no-index", "--", candidate, probe], repo, { allow: [0, 1, 128, 129] });
      if ((result.status === 0 || result.status === 1) && (result.stdout || "").includes(path.basename(probe))) {
        nullSpec = candidate;
        return nullSpec;
      }
    }
  } finally {
    fs.rmSync(probe, { force: true });
  }
  throw new DiffError("Git did not accept a null diff target");
}

function untrackedPatch(repo) {
  const files = (git(["-c", "core.quotepath=false", "ls-files", "-z", "--others", "--exclude-standard"], repo).stdout || "").split("\0").filter(Boolean);
  const parts = [];
  for (const file of files) {
    const result = git(["-c", "core.quotepath=false", ...DIFF, "--no-index", "--", gitNullSpec(repo), file], repo, { allow: [0, 1, 128, 129] });
    const stderr = result.stderr || "";
    if ((result.status !== 0 && result.status !== 1) || /^(?:error|fatal):/m.test(stderr)) {
      throw new DiffError(`Untracked diff failed for ${file}: ${stderr.trim() || "git diff failed"}`);
    }
    parts.push(Buffer.from(result.stdout || "", "utf8"));
  }
  return Buffer.concat(parts);
}

export function writeDiff(start, name, mode, extra) {
  const repo = repoRoot(start);
  const base = diffBaseName(name);
  let tracked = Buffer.alloc(0);
  let summary = mode;
  if (mode === "commits") {
    const resolved = resolveBase(repo, extra);
    summary = resolved.atRoot ? `commits ${resolved.base}..HEAD` : `commits HEAD~${resolved.count}..HEAD`;
    tracked = gitBytes(repo, resolved.atRoot ? [...DIFF, resolved.base, "HEAD"] : [...DIFF, `HEAD~${resolved.count}..HEAD`]);
  } else if (mode === "range") {
    const from = resolveCommit(repo, extra?.from);
    const to = resolveCommit(repo, extra?.to || "HEAD");
    summary = `range ${from}..${to}`;
    tracked = gitBytes(repo, [...DIFF, `${from}..${to}`]);
  } else if (mode === "staged") {
    tracked = gitBytes(repo, [...DIFF, "--cached"]);
  } else if (mode === "changes") {
    tracked = gitBytes(repo, DIFF);
  } else if (mode === "current") {
    if (extra) {
      const resolved = resolveBase(repo, extra);
      summary = resolved.atRoot ? `current ${resolved.base}` : `current HEAD~${resolved.count}`;
      tracked = gitBytes(repo, [...DIFF, resolved.atRoot ? resolved.base : `HEAD~${resolved.count}`]);
    } else {
      summary = "current HEAD";
      tracked = gitBytes(repo, [...DIFF, "HEAD"]);
    }
  } else if (mode !== "untracked") {
    throw new DiffError(`Unknown mode: ${mode}. Modes: ${MODES.join(", ")}`);
  }
  const body = Buffer.concat([tracked, mode === "untracked" || mode === "current" ? untrackedPatch(repo) : Buffer.alloc(0)]);
  const dir = path.join(repo, ".tmp", "scratch");
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${base}.diff`);
  const staging = `${outPath}.${process.pid}.tmp`;
  fs.writeFileSync(staging, body);
  fs.renameSync(staging, outPath);
  return { path: outPath, bytes: body.length, summary };
}

const USAGE = `Usage: node .agents/skills/write-commit-diff/scripts/write-commit-diff.mjs <mode> <name> [args]
  commits <name> <N>          last N first-parent commits
  range <name> <from> [to]    from..to (to defaults to HEAD)
  staged <name>               the index against HEAD
  changes <name>              the working tree against the index
  untracked <name>            untracked files, not ignored
  current <name> [N]          working tree against HEAD (or HEAD~N), plus untracked files`;

export function main(argv, cwd = process.cwd()) {
  const [mode, name, a, b] = argv;
  if (!mode || mode === "--help" || !MODES.includes(mode) || !name) {
    process.stderr.write(`${USAGE}\n`);
    return mode === "--help" ? 0 : 2;
  }
  try {
    const extra = mode === "range" ? { from: a, to: b || "HEAD" } : a;
    const result = writeDiff(cwd, name, mode, extra);
    process.stdout.write(`${result.path}\nbytes: ${result.bytes}\nsource: ${result.summary}\n`);
    return 0;
  } catch (error) {
    if (!(error instanceof DiffError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
