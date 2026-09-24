import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { catalogById, includedSkillIds } from "./catalog.mjs";
import { claudeModeOf } from "./render.mjs";
import { AgsError, displayPath, relativeInside, samePath, walkFiles } from "./util.mjs";

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
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const date = dosDateTime(new Date(0));
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const local = localHeader(name, entry.data, crc, date);
    localParts.push(local, name, entry.data);
    centralParts.push(centralHeader(name, entry.data, crc, offset, date), name);
    offset += local.length + name.length + entry.data.length;
  }
  const central = Buffer.concat(centralParts);
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

const CREDENTIAL = /(^|\/)(\.env(\..*)?|credentials\.json|id_rsa|[^/]*\.pem)$/i;
const LOCK_BASES = new Set(["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml"]);
const RESERVED_ARCHIVE = new Set(["manifest.json"]);
const LEGACY_PARTS = ["hooks", "archive", "stewardship", "graphify"];

export function normalizeRel(rel) {
  return String(rel || "").replaceAll("\\", "/");
}

export function isStandardSensitivePath(rel) {
  return CREDENTIAL.test(normalizeRel(rel));
}

export function isOperationalCanonicalPath(rel) {
  const name = normalizeRel(rel);
  if (!name || name === "hosts.yaml" || name.startsWith("reports/") || name.startsWith(".tmp/") || name.startsWith(".git/") || name.split("/").includes("node_modules")) return true;
  if (name.split("/").some((part) => LEGACY_PARTS.includes(part))) return true;
  if (name.endsWith("versioning-todo.md")) return true;
  return false;
}

export function excludedRelative(rel) {
  return isOperationalCanonicalPath(rel) || isStandardSensitivePath(rel);
}

export function localExcluded(hostRoot, abs) {
  const rel = relativeInside(path.join(hostRoot, ".agents", "local"), abs);
  const listFile = path.join(hostRoot, ".agents", "local", ".ags-exclude");
  if (!fs.existsSync(listFile)) return false;
  const listed = fs.readFileSync(listFile, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return listed.includes(rel);
}

export function collectSnapshot(root, hostRoot, catalog, settings) {
  const files = [];
  const warnings = [];
  const add = (abs, name, { required = false, label = name } = {}) => {
    if (RESERVED_ARCHIVE.has(name)) return;
    if (LOCK_BASES.has(path.posix.basename(name))) return;
    if (!fs.existsSync(abs) || !fs.lstatSync(abs).isFile()) {
      if (required) warnings.push(`missing ${label}`);
      return;
    }
    if (excludedRelative(name) || isStandardSensitivePath(name)) return;
    files.push({ name, data: fs.readFileSync(abs) });
  };
  add(path.join(hostRoot, "AGENTS.md"), "host/AGENTS.md");
  const claudeMode = claudeModeOf(settings.adapters?.claude);
  if (claudeMode === "block" || claudeMode === "override") {
    add(path.join(hostRoot, "CLAUDE.md"), "host/CLAUDE.md", { required: true, label: "CLAUDE.md" });
  }
  add(path.join(hostRoot, ".agents", "AGS.md"), "host/.agents/AGS.md");
  add(path.join(hostRoot, ".agents", "ags.yaml"), "host/.agents/ags.yaml");
  const local = path.join(hostRoot, ".agents", "local");
  for (const file of walkFiles(local)) {
    if (localExcluded(hostRoot, file)) continue;
    const rel = relativeInside(local, file);
    if (rel === ".ags-exclude") continue;
    add(file, `host/.agents/local/${rel}`);
  }
  add(path.join(root, "AGENTS.md"), "canonical/AGENTS.md");
  add(path.join(root, "rules", "core.md"), "canonical/rules/core.md");
  for (const id of settings.rules.enabled) {
    const entry = catalogById(catalog).get(id);
    if (!entry) throw new AgsError(`Selected rule missing from catalog: ${id}`);
    add(path.join(root, ...entry.path.split("/")), `canonical/${entry.path}`, { required: true, label: entry.path });
  }
  const skillIds = [];
  const seenSkills = new Set();
  for (const id of [...settings.skills.enabled, ...includedSkillIds(catalog, settings.skills.enabled)]) {
    if (seenSkills.has(id)) continue;
    seenSkills.add(id);
    skillIds.push(id);
  }
  for (const id of skillIds) {
    const entry = catalogById(catalog).get(id);
    if (!entry) throw new AgsError(`Selected skill missing from catalog: ${id}`);
    const skillFile = path.join(root, ...entry.path.split("/"));
    if (!fs.existsSync(skillFile)) {
      warnings.push(`missing ${entry.path}`);
      continue;
    }
    const dir = path.dirname(skillFile);
    for (const file of walkFiles(dir)) {
      const rel = relativeInside(dir, file);
      add(file, `canonical/skills/${id}/${rel}`);
    }
  }
  for (const item of settings.skills?.localExceptions || []) {
    const skillFile = path.join(hostRoot, ...String(item.path || "").split("/"));
    if (!fs.existsSync(skillFile)) {
      warnings.push(`missing host-local exception: ${item.path}`);
      continue;
    }
    const dir = path.dirname(skillFile);
    for (const file of walkFiles(dir)) {
      const rel = relativeInside(dir, file);
      add(file, `host/.agents/skills/${item.id}/${rel}`);
    }
  }
  const resolution = {
    host: settings.host,
    canonicalRoot: displayPath(root),
    git: settings.git || null,
    checks: settings.checks || null,
    rules: settings.rules.enabled.map((id) => ({ id, path: catalogById(catalog).get(id).path })),
    skills: settings.skills.enabled.map((id) => {
      const entry = catalogById(catalog).get(id);
      return { id, path: entry.path, kind: entry.kind, includes: entry.includes || [] };
    }),
  };
  files.push({ name: "resolution.json", data: Buffer.from(`${JSON.stringify(resolution, null, 2)}\n`) });
  files.sort((a, b) => a.name.localeCompare(b.name));
  const manifest = {
    warnings,
    files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: sha256(file.data) })),
  };
  files.push({ name: "manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) });
  return { files, manifest, warnings };
}

export function assertSnapshotTarget(root, hostRoot, catalog, settings, outPath) {
  const abs = path.resolve(outPath);
  if (!abs.toLowerCase().endsWith(".zip")) throw new AgsError("Snapshot output must end in .zip");
  const forbidden = [];
  if (hostRoot) {
    forbidden.push(
      path.join(hostRoot, "AGENTS.md"),
      path.join(hostRoot, "CLAUDE.md"),
      path.join(hostRoot, ".agents", "AGS.md"),
      path.join(hostRoot, ".agents", "ags.yaml"),
    );
    for (const id of settings?.rules?.enabled || []) {
      const entry = catalogById(catalog).get(id);
      if (entry) forbidden.push(path.join(root, ...entry.path.split("/")));
    }
    const skillIds = [...(settings?.skills?.enabled || []), ...includedSkillIds(catalog, settings?.skills?.enabled || [])];
    for (const id of skillIds) {
      const entry = catalogById(catalog).get(id);
      if (!entry) continue;
      const file = path.join(root, ...entry.path.split("/"));
      forbidden.push(file, path.dirname(file));
    }
  }
  for (const file of forbidden) {
    if (samePath(abs, file)) throw new AgsError(`Refusing to overwrite managed or selected file: ${abs}`);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      const rel = path.relative(file, abs);
      if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
        throw new AgsError(`Refusing to overwrite selected skill: ${abs}`);
      }
    }
  }
  const canonRoot = path.resolve(root);
  const canonRel = path.relative(canonRoot, abs);
  const insideCanon = canonRel !== "" && !canonRel.startsWith("..") && !path.isAbsolute(canonRel);
  const canonTmp = path.resolve(root, ".tmp");
  const tmpRel = path.relative(canonTmp, abs);
  const insideTmp = tmpRel === "" || (!tmpRel.startsWith("..") && !path.isAbsolute(tmpRel));
  if (insideCanon && !insideTmp) throw new AgsError(`Refusing to overwrite canonical source: ${abs}`);
}

function writeZipAtomic(outPath, body) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const staging = `${outPath}.${process.pid}.tmp`;
  fs.writeFileSync(staging, body);
  fs.renameSync(staging, outPath);
}

export function writeSnapshot(root, hostRoot, catalog, settings, outPath) {
  assertSnapshotTarget(root, hostRoot, catalog, settings, outPath);
  const packed = collectSnapshot(root, hostRoot, catalog, settings);
  const body = buildZip(packed.files);
  writeZipAtomic(outPath, body);
  return { path: outPath, bytes: body.length, count: packed.files.length, manifest: packed.manifest };
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
