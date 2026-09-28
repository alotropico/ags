import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { backupStamp } from "./backup.mjs";
import { AgsError, insidePath } from "./util.mjs";

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

export const SNAPSHOTS_REL = ".tmp/ags/snapshots";

function hostFiles(hostRoot) {
  const found = [];
  const agents = path.join(hostRoot, "AGENTS.md");
  if (fs.existsSync(agents) && fs.lstatSync(agents).isFile()) found.push("AGENTS.md");
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(hostRoot, ...rel.split("/")), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) found.push(child);
    }
  };
  const dir = path.join(hostRoot, ".agents");
  if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) walk(".agents");
  return found.sort();
}

export function collectSnapshot(hostRoot, { host, agsVersion, now = new Date() }) {
  const files = hostFiles(hostRoot).map((rel) => ({ name: rel, data: fs.readFileSync(path.join(hostRoot, ...rel.split("/"))) }));
  const manifest = {
    host,
    agsVersion,
    createdAt: now.toISOString(),
    files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: sha256(file.data) })),
  };
  return { files: [...files, { name: "manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) }], manifest };
}

export function snapshotTarget(hostRoot, out, now = new Date()) {
  const abs = out ? path.resolve(out) : path.join(hostRoot, ...SNAPSHOTS_REL.split("/"), `${backupStamp(now)}.zip`);
  if (!abs.toLowerCase().endsWith(".zip")) throw new AgsError("Snapshot output must end in .zip");
  const rel = path.relative(path.resolve(hostRoot), abs);
  const name = rel.startsWith("..") || path.isAbsolute(rel) ? null : rel.replaceAll("\\", "/");
  if (name == null) throw new AgsError(`Snapshot output must be inside the host: ${abs}`);
  insidePath(hostRoot, name);
  if (name === "AGENTS.md" || name === ".agents" || name?.startsWith(".agents/")) throw new AgsError(`Refusing to write a snapshot inside the files it captures: ${name}`);
  if (fs.existsSync(abs)) throw new AgsError(`Snapshot output already exists: ${abs}`);
  return abs;
}

export function writeSnapshot(hostRoot, { host, agsVersion, out = null, now = new Date() }) {
  const target = snapshotTarget(hostRoot, out, now);
  const packed = collectSnapshot(hostRoot, { host, agsVersion, now });
  const body = buildZip(packed.files);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staging = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(staging, body);
  fs.renameSync(staging, target);
  return { path: target, bytes: body.length, count: packed.manifest.files.length, manifest: packed.manifest };
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
