import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { backupStamp } from "./backup.mjs";
import { collectTreeSnapshot } from "./tree-snapshot.mjs";
import { AgsError, assertRelativePath, git, insidePath, pathExists, posix } from "./util.mjs";

const CRC_TABLE = crc32Table();

function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function localHeader(nameBuffer, data, crc, offsetDate) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(offsetDate.time, 10);
  header.writeUInt16LE(offsetDate.day, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function centralHeader(nameBuffer, data, crc, offset, offsetDate) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(offsetDate.time, 12);
  header.writeUInt16LE(offsetDate.day, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return header;
}

export function buildZip(entries) {
  if (entries.length > 65535) throw new AgsError("Snapshot exceeds ZIP entry limits; narrow the selection.");
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const date = dosDateTime(new Date(0));
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    if (name.length > 65535 || entry.data.length > 0xffffffff || offset + 30 + name.length + entry.data.length > 0xffffffff) {
      throw new AgsError("Snapshot exceeds ZIP size limits; narrow the selection.");
    }
    const crc = crc32(entry.data);
    const local = localHeader(name, entry.data, crc, date);
    localParts.push(local, name, entry.data);
    centralParts.push(centralHeader(name, entry.data, crc, offset, date), name);
    offset += local.length + name.length + entry.data.length;
  }
  const central = Buffer.concat(centralParts);
  if (central.length > 0xffffffff || offset + central.length > 0xffffffff) throw new AgsError("Snapshot exceeds ZIP size limits; narrow the selection.");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, central, end]);
}

export const SNAPSHOTS_REL = ".tmp/ags/snapshots";

function hostFiles(hostRoot) {
  const found = [];
  const agents = path.join(hostRoot, "AGENTS.md");
  if (fs.existsSync(agents) && fs.lstatSync(agents).isFile()) found.push("AGENTS.md");
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(hostRoot, ...rel.split("/")), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      assertRelativePath(child);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) found.push(child);
    }
  };
  const dir = path.join(hostRoot, ".agents");
  if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) walk(".agents");
  return found.sort();
}

export function collectSnapshot(hostRoot, { host, agsVersion, claudeAliases = [], now = new Date() }) {
  const files = hostFiles(hostRoot).map((rel) => ({ name: rel, data: fs.readFileSync(path.join(hostRoot, ...rel.split("/"))) }));
  const manifest = {
    host,
    agsVersion,
    createdAt: now.toISOString(),
    files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: sha256(file.data) })),
    ...(claudeAliases.length ? { claudeAliases } : {}),
  };
  return { files: [...files, { name: "manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) }], manifest };
}

export function snapshotTarget(hostRoot, out, now = new Date()) {
  const abs = out ? path.resolve(out) : path.join(hostRoot, ...SNAPSHOTS_REL.split("/"), `${backupStamp(now)}.zip`);
  if (!abs.toLowerCase().endsWith(".zip")) throw new AgsError("Snapshot output must end in .zip");
  const rel = path.relative(path.resolve(hostRoot), abs);
  const name = rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel) ? null : posix(rel);
  if (name == null) throw new AgsError(`Snapshot output must be inside the host: ${abs}`);
  insidePath(hostRoot, name);
  if (name === "AGENTS.md" || name === ".agents" || name?.startsWith(".agents/")) throw new AgsError(`Refusing to write a snapshot inside the files it captures: ${name}`);
  if (pathExists(abs)) throw new AgsError(`Snapshot output already exists: ${abs}`);
  return abs;
}

export function writeSnapshot(hostRoot, { host, agsVersion, claudeAliases = [], out = null, now = new Date() }) {
  const target = snapshotTarget(hostRoot, out, now);
  const packed = collectSnapshot(hostRoot, { host, agsVersion, claudeAliases, now });
  const body = buildZip(packed.files);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staging = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(staging, body);
  fs.renameSync(staging, target);
  return { path: target, bytes: body.length, count: packed.manifest.files.length, manifest: packed.manifest };
}

const SOURCE_SENSITIVE = /(^|\/)(\.env(\..*)?|credentials\.json|id_rsa|[^/]*\.pem)$/i;

function sourceOperational(rel) {
  return rel === "hosts.yaml" || rel === "manifest.json" ||
    /^(reports|\.tmp|\.git)(\/|$)/.test(rel) || rel.split("/").includes("node_modules");
}

function sourceSelection(values) {
  return values.map((value) => {
    const name = posix(value).replace(/\/$/, "");
    if (!name || name.startsWith("/") || name.includes(":") || name.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new AgsError(`Invalid snapshot selection: ${value}. Use repository-relative files or folders.`, { exitCode: 2 });
    }
    return name;
  });
}

export function writeSourceSnapshot(agsRoot, { only = [], except = [], includeStandardExcluded = false, preset = null, out = null, now = new Date() } = {}) {
  if (preset) {
    if (only.length || except.length || includeStandardExcluded) throw new AgsError("A preset cannot combine with --only, --except or --include-standard-excluded.", { exitCode: 2 });
    const packed = collectSourcePreset(agsRoot, preset);
    const target = snapshotTarget(agsRoot, out || path.join(agsRoot, SNAPSHOTS_REL, `${preset}-${backupStamp(now)}.zip`), now);
    const body = buildZip(packed.files);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body, { flag: "wx" });
    return { path: target, bytes: body.length, count: packed.files.length, manifest: packed.manifest };
  }
  if (only.length && except.length) throw new AgsError("Use either --only or --except, not both.", { exitCode: 2 });
  only = sourceSelection(only);
  except = sourceSelection(except);
  const target = snapshotTarget(agsRoot, out || path.join(agsRoot, ...SNAPSHOTS_REL.split("/"), `source-${backupStamp(now)}.zip`), now);
  const targetRel = posix(path.relative(agsRoot, target));
  if (/^\.git(\/|$)/.test(targetRel)) throw new AgsError("Refusing to write a snapshot inside .git.");
  const tracked = [...new Set(git(["ls-files", "--cached", "-z"], agsRoot).stdout.split("\0").filter(Boolean))].sort();
  const matches = (rel, name) => rel === name || rel.startsWith(`${name}/`);
  const candidates = tracked.filter((rel) => !sourceOperational(rel) &&
    (!only.length || only.some((name) => name === "base" ? !rel.includes("/") : matches(rel, name))) &&
    !except.some((name) => name === "base" ? !rel.includes("/") : matches(rel, name)));
  const ignored = candidates.length ? new Set(git(["check-ignore", "--no-index", "-z", "--stdin"], agsRoot, {
    allow: [0, 1], input: `${candidates.join("\0")}\0`,
  }).stdout.split("\0").filter(Boolean)) : new Set();
  const files = [];
  for (const rel of candidates) {
    if (ignored.has(rel) || (!includeStandardExcluded && SOURCE_SENSITIVE.test(rel))) continue;
    const abs = insidePath(agsRoot, rel);
    if (!fs.existsSync(abs)) continue;
    if (!fs.lstatSync(abs).isFile()) throw new AgsError(`Source snapshot requires a regular file: ${rel}`);
    files.push({ name: rel, data: fs.readFileSync(abs) });
  }
  if (!files.length) throw new AgsError("No source files selected for the snapshot.");
  const manifest = {
    kind: "source",
    agsVersion: JSON.parse(fs.readFileSync(path.join(agsRoot, "package.json"), "utf8")).version,
    revision: git(["rev-parse", "HEAD"], agsRoot).stdout.trim(),
    createdAt: now.toISOString(),
    trackedFilesOnly: true,
    standardExcludesApplied: !includeStandardExcluded,
    only,
    except,
    files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: sha256(file.data) })),
  };
  const body = buildZip([...files, { name: "manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) }]);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staging = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(staging, body, { flag: "wx" });
    fs.renameSync(staging, target);
  } finally {
    fs.rmSync(staging, { force: true });
  }
  return { path: target, bytes: body.length, count: files.length, manifest };
}

const REVIEW_ROOTS = ["AGENTS.md", "README.md", "CHANGELOG.md", "catalog.yaml", "hosts.yaml", "package.json", ".gitignore"];
const LITE_FILES = ["AGENTS.md", "README.md", "catalog.yaml", "hosts.yaml", "package.json", "scripts/ags.mjs", ...["catalog", "config", "doctor", "host", "migrations", "operation", "registry", "reports", "skills", "snapshot", "tree-snapshot", "util", "version"].map((name) => `scripts/lib/${name}.mjs`), "templates/ags.yaml", ...["install", "update", "doctor", "registry", "settings", "skills-list", "snapshot", "usage"].map((name) => `test/${name}.test.mjs`)];

export function collectSourcePreset(root, preset) {
  if (!["review", "review-lite"].includes(preset)) throw new AgsError("--preset takes review or review-lite.", { exitCode: 2 });
  const paths = new Set(preset === "review" ? [...REVIEW_ROOTS, "scripts/ags.mjs", "scripts/install-global.mjs"] : LITE_FILES);
  const omissions = [];
  const visit = (rel) => {
    const file = insidePath(root, rel);
    if (!fs.existsSync(file)) { omissions.push({ path: rel, reason: "missing" }); return; }
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new AgsError(`Preset requires regular paths: ${rel}`);
    if (stat.isFile()) { paths.add(rel); return; }
    for (const name of fs.readdirSync(file).sort()) visit(`${rel}/${name}`);
  };
  if (preset === "review") for (const dir of ["scripts/lib", "templates", "rules", "skills", "test"]) visit(dir);
  const files = [];
  for (const rel of [...paths].sort()) {
    const file = insidePath(root, rel);
    if (!fs.existsSync(file)) { omissions.push({ path: rel, reason: "missing" }); continue; }
    if (!fs.lstatSync(file).isFile()) throw new AgsError(`Preset requires a regular file: ${rel}`);
    files.push({ name: rel, data: fs.readFileSync(file) });
  }
  const tree = collectTreeSnapshot(root);
  files.push({ name: "repository-tree.md", data: Buffer.from(["# Repository tree", "", "```text", ...tree.lines, "```", ""].join("\n")) });
  files.sort((a, b) => a.name < b.name ? -1 : 1);
  const manifest = {
    kind: "source", preset, revision: git(["rev-parse", "HEAD"], root).stdout.trim(),
    resolvedPaths: [...files.map((file) => file.name), "snapshot-manifest.json"].sort(),
    omissions: omissions.sort((a, b) => a.path < b.path ? -1 : 1),
    files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: sha256(file.data) })),
  };
  files.push({ name: "snapshot-manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) });
  files.sort((a, b) => a.name < b.name ? -1 : 1);
  return { files, manifest };
}

export function readStoredZip(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const size = buffer.readUInt32LE(offset + 18);
    const nameStart = offset + 30;
    const name = buffer.subarray(nameStart, nameStart + nameLen).toString("utf8");
    const dataStart = nameStart + nameLen + extraLen;
    entries.push({ name, data: Buffer.from(buffer.subarray(dataStart, dataStart + size)) });
    offset = dataStart + size;
  }
  return entries;
}
