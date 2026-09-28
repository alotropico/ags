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

export function writeAtomic(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(temp, data);
  fs.renameSync(temp, file);
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

export function validBranchName(name) {
  if (typeof name !== "string" || !name || name !== name.trim()) return false;
  if (name.startsWith("refs/") || name.includes("..") || name.includes("@{") || /[\u0000-\u001f\u007f\s]/.test(name)) return false;
  const result = spawnSync("git", ["check-ref-format", "--branch", name], {
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0;
}

export function ensureHostTmpIgnored(repo) {
  const result = git(["check-ignore", "--", ".tmp"], repo, { allow: [0, 1] });
  if (result.status === 0) return { ignored: true, changed: false };
  const gitPath = git(["rev-parse", "--git-path", "info/exclude"], repo).stdout.trim();
  const excludeFile = path.isAbsolute(gitPath) ? gitPath : path.resolve(repo, gitPath);
  fs.mkdirSync(path.dirname(excludeFile), { recursive: true });
  const block = "# AGS:BEGIN\n/.tmp/\n# AGS:END\n";
  const current = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, "utf8") : "";
  if (current.includes("# AGS:BEGIN\n/.tmp/\n# AGS:END")) return { ignored: true, changed: false, excludeFile };
  const next = current.length === 0 || current.endsWith("\n") ? `${current}${block}` : `${current}\n${block}`;
  fs.writeFileSync(excludeFile, next);
  return { ignored: true, changed: true, excludeFile };
}

export function commandText(value, label) {
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value)) {
    throw new AgsError(`${label} must be a nonempty single-line command`);
  }
  return value;
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

export function mapsEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (right.get(key) !== value) return false;
  }
  return true;
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

export function quarantine(hostRoot, absPath, backupName = null) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const leaf = backupName || path.relative(hostRoot, absPath);
  const dest = path.join(hostRoot, ".tmp", "ags-quarantine", stamp, leaf);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(absPath, dest);
  return dest;
}

export function assertCanonicalAccess(root) {
  try {
    fs.accessSync(root, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    throw new AgsError(`Canonical root is not readable and writable: ${root} (${error.message})`);
  }
  const probeDir = path.join(root, ".tmp");
  const probe = path.join(probeDir, `.access-${process.pid}-${Date.now()}`);
  try {
    fs.mkdirSync(probeDir, { recursive: true });
    fs.writeFileSync(probe, "ok");
    fs.readFileSync(probe);
  } catch (error) {
    throw new AgsError(`Canonical root write failed: ${probe} (${error.message})`);
  } finally {
    if (fs.existsSync(probe)) fs.unlinkSync(probe);
  }
}

export function singleLine(value, label) {
  if (value == null || value === "") return undefined;
  const text = String(value);
  if (text.includes("\n") || text.includes("\r")) {
    throw new AgsError(`${label} must be a single line`);
  }
  return text;
}
