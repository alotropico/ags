import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { git, gitRoot } from "./util.mjs";
import { AgsError } from "./util.mjs";

export function diffBaseName(name) {
  if (!name || name !== path.basename(name) || /[\\/:*?"<>|]/.test(name)) {
    throw new AgsError(`Name must be a plain filename: ${name}`);
  }
  const base = name.toLowerCase().endsWith(".diff") ? name.slice(0, -5) : name;
  if (!base || base === "." || base === "..") throw new AgsError(`Name must contain a filename: ${name}`);
  return base;
}

export function positiveCount(value, available) {
  if (!/^[1-9]\d*$/.test(String(value))) throw new AgsError(`Commit count must be a positive integer: ${value}`);
  const count = Number(value);
  if (available != null && count > available) {
    throw new AgsError(`N=${count} exceeds commit count on HEAD (${available})`);
  }
  return count;
}

export function commitCount(repo) {
  return Number(git(["rev-list", "--first-parent", "--count", "HEAD"], repo).stdout.trim());
}

export function resolveCommit(repo, ref) {
  const result = git(["rev-parse", "--verify", `${ref}^{commit}`], repo);
  return result.stdout.trim();
}

export function emptyTreeId(repo) {
  const result = git(["hash-object", "-t", "tree", "--stdin"], repo, { input: "" });
  const id = result.stdout.trim();
  if (!id) throw new AgsError("Git did not return an empty tree id");
  return id;
}

function resolveDiffBase(repo, value) {
  const available = commitCount(repo);
  const count = positiveCount(value, available);
  if (count < available) {
    const base = `HEAD~${count}`;
    resolveCommit(repo, base);
    return { count, base, atRoot: false };
  }
  return { count, base: emptyTreeId(repo), atRoot: true };
}

function gitBytes(repo, args, { allow = [0] } = {}) {
  const result = git(["-c", "core.quotepath=false", ...args], repo, { allow });
  return Buffer.from(result.stdout || "", "utf8");
}

let nullSpec;

function gitNullSpec(repo) {
  if (nullSpec) return nullSpec;
  const probe = path.join(os.tmpdir(), `ags-null-${process.pid}.txt`);
  fs.writeFileSync(probe, "probe\n");
  const candidates = process.platform === "win32" ? ["NUL", "/dev/null"] : ["/dev/null"];
  try {
    for (const candidate of candidates) {
      const result = git(["diff", "--no-color", "--no-index", "--", candidate, probe], repo, { allow: [0, 1, 128, 129] });
      if ((result.status === 0 || result.status === 1) && (result.stdout || "").includes(path.basename(probe))) {
        nullSpec = candidate;
        return nullSpec;
      }
    }
  } finally {
    fs.rmSync(probe, { force: true });
  }
  throw new AgsError("Git did not accept a null diff target");
}

function untrackedPatch(repo) {
  const list = git(["ls-files", "--others", "--exclude-standard"], repo).stdout;
  const files = list.split(/\r?\n/).filter(Boolean);
  const empty = gitNullSpec(repo);
  const parts = [];
  for (const file of files) {
    parts.push(gitBytes(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--no-index", "--", empty, file], { allow: [0, 1] }));
  }
  return Buffer.concat(parts);
}

export function writeDiff(repoInput, name, mode, extra) {
  const repo = gitRoot(repoInput);
  const base = diffBaseName(name);
  const tmpDir = path.join(repo, ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, `${base}.diff`);
  let tracked = Buffer.alloc(0);
  let summary = mode;
  if (mode === "commits") {
    const resolved = resolveDiffBase(repo, extra);
    summary = resolved.atRoot ? `commits ${resolved.base}..HEAD` : `commits HEAD~${resolved.count}..HEAD`;
    const args = resolved.atRoot
      ? ["diff", "--no-color", "--no-ext-diff", "--no-textconv", resolved.base, "HEAD"]
      : ["diff", "--no-color", "--no-ext-diff", "--no-textconv", `HEAD~${resolved.count}..HEAD`];
    tracked = gitBytes(repo, args);
  } else if (mode === "range") {
    const from = resolveCommit(repo, extra.from);
    const to = resolveCommit(repo, extra.to || "HEAD");
    summary = `range ${from}..${to}`;
    tracked = gitBytes(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", `${from}..${to}`]);
  } else if (mode === "staged") {
    summary = "staged";
    tracked = gitBytes(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--cached"]);
  } else if (mode === "changes") {
    summary = "changes";
    tracked = gitBytes(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv"]);
  } else if (mode === "untracked") {
    summary = "untracked";
  } else if (mode === "current") {
    if (extra) {
      const resolved = resolveDiffBase(repo, extra);
      summary = resolved.atRoot ? `current ${resolved.base}` : `current HEAD~${resolved.count}`;
      const args = resolved.atRoot
        ? ["diff", "--no-color", "--no-ext-diff", "--no-textconv", resolved.base]
        : ["diff", "--no-color", "--no-ext-diff", "--no-textconv", `HEAD~${resolved.count}`];
      tracked = gitBytes(repo, args);
    } else {
      summary = "current HEAD";
      tracked = gitBytes(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD"]);
    }
  } else throw new AgsError(`Unknown diff mode: ${mode}`);
  const extraBytes = mode === "untracked" || mode === "current" ? untrackedPatch(repo) : Buffer.alloc(0);
  const body = Buffer.concat([tracked, extraBytes]);
  const staging = `${outPath}.${process.pid}.tmp`;
  fs.writeFileSync(staging, body);
  fs.renameSync(staging, outPath);
  return { path: outPath, bytes: body.length, summary };
}
