import fs from "node:fs";
import path from "node:path";
import { AgsError, relativeInside } from "./util.mjs";

const STALE_MS = 15_000;
const WAIT_MS = 2_000;

export function parseLevel(value, { max = 8, min = 0 } = {}) {
  if (!/^\d+$/.test(String(value))) throw new AgsError(`Invalid engagement level: ${value}`);
  const level = Number(value);
  if (level < min || level > max) throw new AgsError(`Engagement level out of range: ${level}`);
  return level;
}

export function parseUsageFiles(values) {
  if (!values?.length) throw new AgsError("At least one --file is required");
  const best = new Map();
  for (const value of values) {
    const eq = value.lastIndexOf("=");
    if (eq <= 0) throw new AgsError(`Expected path=level, got ${value}`);
    const file = value.slice(0, eq);
    const level = parseLevel(value.slice(eq + 1), { min: 0, max: 8 });
    const prev = best.get(file);
    if (prev == null || level > prev) best.set(file, level);
  }
  return [...best].map(([file, level]) => ({ path: file, level }));
}

export function dedupeReportedFiles(files) {
  const best = new Map();
  for (const file of files) {
    const prev = best.get(file.path);
    if (prev == null || file.level > prev) best.set(file.path, file.level);
  }
  return [...best].map(([filePath, level]) => ({ path: filePath, level }));
}

export function canonicalFile(root, input) {
  const raw = String(input).trim();
  if (!raw || /[\u0000\r\n]/.test(raw)) throw new AgsError(`Not a canonical file: ${input}`);
  const abs = path.resolve(root, raw);
  const rel = relativeInside(root, abs);
  if (!rel || rel === ".") throw new AgsError(`Not a canonical file: ${input}`);
  const normalized = rel.replaceAll("\\", "/");
  if (normalized === "hosts.yaml" || normalized.startsWith("reports/") || normalized.startsWith(".tmp/") || normalized.split("/").includes("..")) {
    throw new AgsError(`Not a reportable guidance file: ${normalized}`);
  }
  if (!fs.existsSync(abs)) throw new AgsError(`Not a canonical file: ${normalized}`);
  const stat = fs.lstatSync(abs);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new AgsError(`Not a canonical file: ${normalized}`);
  return normalized;
}

export async function appendReport(root, kind, record) {
  const month = record.timestamp.slice(0, 7);
  const dir = path.join(root, "reports", kind);
  const file = path.join(dir, `${month}.jsonl`);
  const lock = path.join(root, "reports", ".locks", `${kind}.lock`);
  fs.mkdirSync(dir, { recursive: true });
  await withLock(lock, () => {
    const line = `${JSON.stringify(record)}\n`;
    if (line.includes("\n\n")) throw new AgsError("Refusing to write a partial report line");
    fs.appendFileSync(file, line);
  });
  return file;
}

export async function withLock(lockPath, fn) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(lockPath);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const age = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (age > STALE_MS) {
        fs.rmSync(lockPath, { recursive: true, force: true });
        continue;
      }
      if (Date.now() - started > WAIT_MS) {
        throw new AgsError(`Timed out waiting for report lock: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(lockPath, { recursive: true, force: true });
  }
}

export function reportStamp() {
  return new Date().toISOString();
}
