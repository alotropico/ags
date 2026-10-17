import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));

export const AGS_ROOT = path.resolve(LIB_DIR, "..", "..");

export class AgsError extends Error {
  constructor(message, { exitCode = 1, written = [] } = {}) {
    super(message);
    this.exitCode = exitCode;
    this.written = written;
  }
}

export function posix(value) {
  return process.platform === "win32" ? value.replaceAll("\\", "/") : value;
}

export function displayPath(value) {
  return posix(path.resolve(value));
}

export function normalizeIdentity(value) {
  const resolved = path.resolve(value);
  try {
    const stat = fs.statSync(resolved, { bigint: true });
    // Directory identity follows the filesystem, including case aliases on
    // default macOS volumes and distinct names on case-sensitive volumes.
    if (stat.isDirectory() && stat.ino !== 0n) return `directory:${stat.dev}:${stat.ino}`;
    const real = fs.realpathSync.native(resolved);
    return process.platform === "win32" ? real.toLowerCase() : real;
  } catch (error) {
    if (!["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code)) throw error;
    let physical;
    try { physical = physicalPath(resolved); }
    catch (linkError) {
      if (!(linkError instanceof AgsError) && !["EACCES", "EPERM"].includes(linkError.code)) throw linkError;
      // A missing/broken registered path still has an inspectable identity.
      physical = resolved;
    }
    return process.platform === "win32" ? physical.toLowerCase() : physical;
  }
}

export function pathExists(value) {
  try { fs.lstatSync(value); return true; }
  catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error.code)) return false;
    throw error;
  }
}

function physicalPath(value) {
  let cursor = path.resolve(value);
  const suffix = [];
  while (!pathExists(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) return path.resolve(value);
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  try { return path.join(fs.realpathSync.native(cursor), ...suffix); }
  catch (error) {
    if (isReparsePoint(cursor)) throw new AgsError(`Unresolvable link blocks path: ${cursor}`);
    throw error;
  }
}

function escapes(rel) {
  return rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
}

export function assertRelativePath(value, { portable = false } = {}) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes(":") ||
      /[\u0000-\u001f\u007f]/.test(value) || value.startsWith("/") ||
      value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new AgsError(`Path escapes root or cannot be represented as a repository-relative path: ${JSON.stringify(value)}`);
  }
  if (portable && value.split("/").some((part) => /[<>"|?*]/.test(part) || part !== part.trim() ||
      /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new AgsError(`Material path is not portable to Windows/macOS: ${JSON.stringify(value)}`);
  }
  return value;
}

export function assertPortablePaths(values) {
  const seen = new Map();
  for (const value of values) {
    assertRelativePath(value, { portable: true });
    // Check directory components too: A/a files must not merge on Windows.
    const parts = value.split("/");
    for (let n = 1; n <= parts.length; n += 1) {
      const name = parts.slice(0, n).join("/");
      const key = name.toLowerCase();
      if (seen.has(key) && seen.get(key) !== name) throw new AgsError(`Portable material case collision: ${seen.get(key)} and ${name}`);
      seen.set(key, name);
    }
  }
  return values;
}

export function samePath(left, right) {
  return normalizeIdentity(left) === normalizeIdentity(right);
}

export function relativeInside(root, target) {
  const absRoot = path.resolve(root);
  const absTarget = path.resolve(target);
  const rel = path.relative(absRoot, absTarget);
  const realRel = path.relative(physicalPath(absRoot), physicalPath(absTarget));
  if (escapes(realRel)) throw new AgsError(`Path escapes root through a link: ${target}`);
  if (escapes(rel)) return posix(realRel);
  return posix(rel);
}

export function assertInside(root, target) {
  relativeInside(root, target);
  return path.resolve(target);
}

export function readText(file) {
  return fs.readFileSync(file, "utf8");
}

export function readYaml(file) {
  return parse(readText(file));
}

export function writeYamlAtomic(file, value) {
  const body = stringify(value, { lineWidth: 0 });
  writeAtomic(file, body.endsWith("\n") ? body : `${body}\n`);
}

let atomicCounter = 0;

export function writeAtomic(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  atomicCounter += 1;
  const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.${atomicCounter}.tmp`);
  try {
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, file);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
}

export function git(args, cwd, { allow = [0], input } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    input,
  });
  if (result.error) {
    const remedy = result.error.code === "ENOENT" ? "Install Git and add it to PATH."
      : ["EACCES", "EPERM"].includes(result.error.code) ? "Check Git executable permissions and PATH." : result.error.message;
    throw new AgsError(`Could not run Git (${result.error.code ?? "spawn failure"}). ${remedy}`);
  }
  if (result.signal) throw new AgsError(`git ${args[0]} terminated by signal ${result.signal}.`);
  if (!allow.includes(result.status)) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new AgsError(detail ? `git ${args[0]} failed: ${detail}` : `git ${args[0]} failed`);
  }
  return result;
}

export function gitRoot(start) {
  const result = git(["rev-parse", "--show-toplevel"], path.resolve(start));
  return path.resolve(result.stdout.trim());
}

export function worktreeInfo(start) {
  const root = gitRoot(start);
  const [gitDir, commonDir] = git(["rev-parse", "--git-dir", "--git-common-dir"], root).stdout.trim().split(/\r?\n/);
  const absGitDir = path.resolve(root, gitDir);
  const dotGit = path.join(root, ".git");
  const main = samePath(absGitDir, dotGit) && fs.existsSync(dotGit) && fs.statSync(dotGit).isDirectory();
  let mainWorktree = null;
  if (!main) {
    const listed = git(["worktree", "list", "--porcelain"], root, { allow: [0, 128] }).stdout || "";
    const first = listed.split(/\r?\n/).find((line) => line.startsWith("worktree "));
    const candidate = first ? path.resolve(first.slice("worktree ".length)) : null;
    if (candidate && !samePath(candidate, root)) mainWorktree = candidate;
  }
  return { root, main, gitDir: absGitDir, commonDir: path.resolve(root, commonDir), mainWorktree };
}

export function assertMainWorktree(info, command) {
  if (info.main) return;
  const where = info.mainWorktree ? ` The main worktree is ${displayPath(info.mainWorktree)}; run it there.` : "";
  throw new AgsError(`${command} needs a repository's main worktree, with its git directory at .git in the root. ${displayPath(info.root)} is a linked worktree, a submodule, or uses a separate git directory.${where}`);
}

export function normalizeText(text) {
  return String(text).replaceAll("\r\n", "\n");
}

const UTF8 = new TextDecoder("utf-8", { fatal: true });

export function isBinary(buffer) {
  if (buffer.includes(0)) return true;
  try {
    UTF8.decode(buffer);
    return false;
  } catch {
    return true;
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentBytes(buffer) {
  if (buffer == null) return null;
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(String(buffer), "utf8");
  return isBinary(bytes) ? bytes : Buffer.from(normalizeText(bytes.toString("utf8")), "utf8");
}

export function contentHash(buffer) {
  const bytes = contentBytes(buffer);
  return bytes == null ? null : sha256(bytes);
}

export function shortHash(hash) {
  return hash == null ? "-" : String(hash).slice(0, 12);
}

export function sameContent(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return contentHash(left) === contentHash(right);
}

export function readFileOrNull(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return null;
    return fs.readFileSync(file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

export function fileHash(file) {
  return contentHash(readFileOrNull(file));
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugError(value, label = "id") {
  const text = value == null ? "" : String(value);
  if (!text || text !== text.trim()) return `${label} is empty`;
  if (/[\u0000-\u001f\u007f\\/]/.test(text) || text.includes("..") || /^[a-zA-Z]:/.test(text) || text.startsWith("\\\\")) {
    return `${label} is not a safe slug: ${text}`;
  }
  if (!SLUG_PATTERN.test(text)) return `${label} is not a safe slug: ${text}`;
  return null;
}

export function assertSlug(value, label = "id") {
  const error = slugError(value, label);
  if (error) throw new AgsError(error);
  return String(value);
}

export function isReparsePoint(target) {
  if (!pathExists(target)) return false;
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) return true;
  try {
    fs.readlinkSync(target);
    return true;
  } catch {
    return false;
  }
}

export function assertNoLinkEscape(root, target) {
  const absRoot = fs.realpathSync(path.resolve(root));
  const resolved = path.resolve(target);
  const rel = path.relative(path.resolve(root), resolved);
  let cursor = path.resolve(root);
  if (rel === "") return cursor;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!pathExists(cursor)) return path.resolve(target);
    if (!isReparsePoint(cursor)) continue;
    let real;
    try { real = fs.realpathSync(cursor); }
    catch (error) { throw new AgsError(`Unresolvable link blocks path: ${cursor}: ${error.message}`); }
    const realRel = path.relative(absRoot, real);
    if (escapes(realRel)) {
      throw new AgsError(`Path escapes root through a link: ${target}`);
    }
  }
  return path.resolve(target);
}

export function insidePath(root, rel) {
  const name = assertRelativePath(posix(rel));
  const target = path.resolve(root, ...name.split("/"));
  assertInside(root, target);
  return assertNoLinkEscape(root, target);
}

export function validBranchName(name) {
  if (typeof name !== "string" || !name || name !== name.trim()) return false;
  if (name.startsWith("refs/") || name.includes("..") || name.includes("@{") || /[\u0000-\u001f\u007f\s]/.test(name)) return false;
  const result = spawnSync("git", ["check-ref-format", "--branch", name], {
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0;
}

export function walkFiles(directory) {
  if (!pathExists(directory)) return [];
  if (isReparsePoint(directory)) throw new AgsError(`Refusing to follow symlink: ${directory}`);
  const stat = fs.statSync(directory);
  if (stat.isFile()) return [directory];
  const output = [];
  for (const name of fs.readdirSync(directory)) {
    const child = path.join(directory, name);
    const childStat = fs.lstatSync(child);
    if (childStat.isSymbolicLink()) {
      throw new AgsError(`Refusing to follow symlink: ${child}`);
    }
    if (childStat.isDirectory()) output.push(...walkFiles(child));
    else if (childStat.isFile()) output.push(child);
  }
  return output;
}

export function normalizedFileMap(directory) {
  const map = new Map();
  for (const file of walkFiles(directory)) {
    const rel = posix(path.relative(directory, file));
    const raw = fs.readFileSync(file);
    const text = raw.toString("utf8").replaceAll("\r\n", "\n");
    map.set(rel, text);
  }
  return map;
}

export function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const file of walkFiles(from)) {
    const rel = path.relative(from, file);
    const dest = path.join(to, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
}
