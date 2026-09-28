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
  return value.replaceAll("\\", "/");
}

export function displayPath(value) {
  return posix(path.resolve(value));
}

export function normalizeIdentity(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function samePath(left, right) {
  return normalizeIdentity(left) === normalizeIdentity(right);
}

export function relativeInside(root, target) {
  const absRoot = path.resolve(root);
  const absTarget = path.resolve(target);
  const rel = path.relative(absRoot, absTarget);
  if (rel === "") return "";
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new AgsError(`Path escapes root: ${target}`);
  }
  const realRoot = fs.existsSync(absRoot) ? fs.realpathSync(absRoot) : absRoot;
  if (fs.existsSync(absTarget)) {
    const realTarget = fs.realpathSync(absTarget);
    const realRel = path.relative(realRoot, realTarget);
    if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
      throw new AgsError(`Path escapes root through a link: ${target}`);
    }
  }
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
  if (!fs.existsSync(target)) return false;
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
    if (!fs.existsSync(cursor)) return path.resolve(target);
    if (!isReparsePoint(cursor)) continue;
    const real = fs.realpathSync(cursor);
    const realRel = path.relative(absRoot, real);
    if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
      throw new AgsError(`Path escapes root through a link: ${target}`);
    }
  }
  return path.resolve(target);
}

export function insidePath(root, rel) {
  const target = path.resolve(root, ...posix(rel).split("/"));
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
  if (!fs.existsSync(directory)) return [];
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
