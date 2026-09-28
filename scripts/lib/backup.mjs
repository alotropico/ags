import fs from "node:fs";
import path from "node:path";
import { AgsError, git, posix, sha256, writeAtomic } from "./util.mjs";

export const BACKUPS_REL = ".tmp/ags/backups";
export const ENTRY_FILES = ["AGENTS.md", "AGENTS.override.md", "CLAUDE.md", "CLAUDE.local.md", "GEMINI.md"];

export function backupName(rel) {
  const segments = posix(rel).split("/").filter(Boolean);
  if (!segments.length || segments.includes("..")) throw new AgsError(`Not a host-relative path: ${rel}`);
  return segments
    .map((segment, index) => {
      let name = segment.startsWith(".") ? `_${segment.slice(1)}` : segment;
      if (index === segments.length - 1 && ENTRY_FILES.includes(segment)) name = `${name}.bak`;
      return name;
    })
    .join("/");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function backupStamp(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function createBackupFolder(hostRoot, operation, now = new Date()) {
  const parent = path.join(hostRoot, ...BACKUPS_REL.split("/"));
  fs.mkdirSync(parent, { recursive: true });
  const base = `${backupStamp(now)}-${operation}`;
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? base : `${base}-${n}`;
    const abs = path.join(parent, name);
    try {
      fs.mkdirSync(abs);
      return { abs, rel: `${BACKUPS_REL}/${name}` };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
}

export function trackedPaths(hostRoot, rels) {
  if (!rels.length) return new Set();
  const result = git(["ls-files", "-z", "--", ...rels.map((rel) => `:(literal)${rel}`)], hostRoot);
  return new Set(result.stdout.split("\0").filter(Boolean).map(posix));
}

export function backupFile(hostRoot, folder, rel, { tracked = false } = {}) {
  const source = path.join(hostRoot, ...posix(rel).split("/"));
  const bytes = fs.readFileSync(source);
  const backupRel = backupName(rel);
  const dest = path.join(folder.abs, ...backupRel.split("/"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  return { original: posix(rel), backup: backupRel, tracked, bytes: bytes.length, sha256: sha256(bytes) };
}

export function backupFiles(hostRoot, folder, rels, { onCopied = () => {} } = {}) {
  const tracked = trackedPaths(hostRoot, rels);
  const entries = [];
  rels.forEach((rel, index) => {
    entries.push(backupFile(hostRoot, folder, rel, { tracked: tracked.has(posix(rel)) }));
    onCopied(index, rels.length);
  });
  return entries;
}

export function writeManifest(folder, { operation, from = null, to = null, digest, files, ...extra }) {
  const manifest = { operation, from, to, digest, ...extra, files };
  writeAtomic(path.join(folder.abs, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function readManifest(folderAbs) {
  const file = path.join(folderAbs, "manifest.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
