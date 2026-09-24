#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSnapshotTarget, buildZip, isOperationalCanonicalPath, isStandardSensitivePath, sha256 } from "./lib/snapshot.mjs";
import { AgsError, CANONICAL_ROOT, git } from "./lib/util.mjs";

export function ignoredCanonicalPaths(root, files) {
  if (!files.length) return new Set();
  const result = git(["check-ignore", "--no-index", "-z", "--stdin"], root, {
    allow: [0, 1],
    input: `${files.join("\0")}\0`,
  });
  return new Set((result.stdout || "").split("\0").filter(Boolean).map((rel) => rel.replaceAll("\\", "/")));
}

export function listCanonicalFiles(root) {
  const tracked = git(["ls-files", "-z"], root).stdout.split("\0").filter(Boolean);
  const extra = git(["ls-files", "--others", "--exclude-standard", "-z"], root).stdout.split("\0").filter(Boolean);
  return [...new Set([...tracked, ...extra])]
    .map((rel) => rel.replaceAll("\\", "/"))
    .filter((rel) => rel !== "manifest.json")
    .sort();
}

function matches(rel, token) {
  const name = token.replaceAll("\\", "/").replace(/\/$/, "");
  return rel === name || rel.startsWith(`${name}/`);
}

export function selectCanonicalFiles(files, { only = [], except = [] } = {}) {
  if (only.length && except.length) throw new AgsError("Use either --only or --except");
  if (except.length) return files.filter((rel) => !except.some((token) => matches(rel, token)));
  if (!only.length) return files;
  const base = only.includes("base");
  const folders = only.filter((token) => token !== "base");
  return files.filter((rel) => (base && !rel.includes("/")) || folders.some((token) => matches(rel, token)));
}

export function filterCanonicalSnapshotFiles(files, { includeStandardExcluded = false, destination = null, root = null } = {}) {
  return files.filter((rel) => {
    if (rel === "manifest.json") return false;
    if (isOperationalCanonicalPath(rel)) return false;
    if (!includeStandardExcluded && isStandardSensitivePath(rel)) return false;
    if (destination && root && path.resolve(root, rel) === path.resolve(destination)) return false;
    return true;
  });
}

export function writeCanonicalSnapshot(root, { only = [], except = [], out, includeStandardExcluded = false } = {}) {
  const destination = path.resolve(out || path.join(root, ".tmp", "snapshots", "ags-canonical.zip"));
  assertSnapshotTarget(root, null, { rules: [], skills: [] }, { rules: { enabled: [] }, skills: { enabled: [] } }, destination);
  const candidates = selectCanonicalFiles(listCanonicalFiles(root), { only, except });
  const ignored = ignoredCanonicalPaths(root, candidates);
  const selected = filterCanonicalSnapshotFiles(candidates.filter((rel) => !ignored.has(rel)), {
    includeStandardExcluded,
    destination,
    root,
  });
  const files = selected.map((rel) => ({ name: rel, data: fs.readFileSync(path.join(root, rel)) }));
  files.sort((a, b) => a.name.localeCompare(b.name));
  const manifest = {
    standardExcludesApplied: !includeStandardExcluded,
    files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: sha256(file.data) })),
  };
  files.push({ name: "manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) });
  const body = buildZip(files);
  const staging = `${destination}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(staging, body);
  fs.renameSync(staging, destination);
  return { path: destination, bytes: body.length, count: files.length };
}

function flag(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return [];
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invoked) {
  const outIndex = process.argv.indexOf("--out");
  const result = writeCanonicalSnapshot(CANONICAL_ROOT, {
    only: flag("--only"),
    except: flag("--except"),
    out: outIndex >= 0 ? process.argv[outIndex + 1] : undefined,
    includeStandardExcluded: process.argv.includes("--include-standard-excluded"),
  });
  console.log(`${result.path} ${result.bytes} bytes ${result.count} files`);
}
