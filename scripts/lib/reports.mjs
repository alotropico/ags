import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgsError } from "./util.mjs";

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

export function hostLockPath(hostRoot) {
  return path.join(hostRoot, ".tmp", "ags", "locks", "host");
}

export function agsLockPath(agsRoot) {
  return path.join(agsRoot, ".tmp", "ags", "locks", "ags");
}

export function runsLockPath(agsRoot) {
  return path.join(agsRoot, ".tmp", "ags", "locks", "runs");
}

export function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readOwner(lockDir) {
  try {
    const owner = JSON.parse(fs.readFileSync(path.join(lockDir, "owner.json"), "utf8"));
    return owner && typeof owner === "object" && Number.isInteger(owner.pid) ? owner : null;
  } catch {
    return null;
  }
}

export function lockState(lockDir, { staleMs = STALE_MS } = {}) {
  let stat;
  try {
    stat = fs.statSync(lockDir);
  } catch (error) {
    if (error.code === "ENOENT") return { held: false };
    throw error;
  }
  const owner = readOwner(lockDir);
  if (owner) return { held: true, owner, stale: !processAlive(owner.pid) };
  return { held: true, owner: null, stale: Date.now() - stat.mtimeMs > staleMs };
}

function describeHolder(owner) {
  if (!owner) return "an unknown process";
  return `${owner.command || "an unknown command"} (pid ${owner.pid}${owner.startedAt ? `, since ${owner.startedAt}` : ""})`;
}

function removeStale(lockDir) {
  const aside = `${lockDir}.stale-${process.pid}-${Date.now()}`;
  try {
    fs.renameSync(lockDir, aside);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  fs.rmSync(aside, { recursive: true, force: true });
}

export async function acquireLock(lockDir, command, { waitMs = WAIT_MS, staleMs = STALE_MS } = {}) {
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const state = lockState(lockDir, { staleMs });
      if (!state.held) continue;
      if (state.stale) {
        removeStale(lockDir);
        continue;
      }
      if (Date.now() - started > waitMs) {
        throw new AgsError(`Lock held by ${describeHolder(state.owner)}: ${lockDir}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  }
  fs.writeFileSync(path.join(lockDir, "owner.json"), `${JSON.stringify({ command, pid: process.pid, startedAt: new Date().toISOString() })}\n`);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    fs.rmSync(lockDir, { recursive: true, force: true });
  };
}

export async function acquireLocks(lockDirs, command, options) {
  const releases = [];
  const releaseAll = () => {
    while (releases.length) releases.pop()();
  };
  try {
    for (const lockDir of lockDirs.filter(Boolean)) releases.push(await acquireLock(lockDir, command, options));
  } catch (error) {
    releaseAll();
    throw error;
  }
  return releaseAll;
}

export function operationLocks({ hostRoot = null, agsRoot = null } = {}) {
  return [hostRoot ? hostLockPath(hostRoot) : null, agsRoot ? agsLockPath(agsRoot) : null].filter(Boolean);
}

export async function withLock(lockDir, command, fn, options) {
  return withLocks([lockDir], command, fn, options);
}

export async function withLocks(lockDirs, command, fn, options) {
  const release = await acquireLocks(lockDirs, command, options);
  try {
    return await fn();
  } finally {
    release();
  }
}

export const USAGE_REL = ".tmp/ags/reports/usage.jsonl";

export function usageFiles(hostRoot, values, managed) {
  const normalized = parseUsageFiles(values).map(({ path: input, level }) => ({ input, path: String(input).trim().replaceAll("\\", "/").replace(/^\.\//, ""), level }));
  for (const { input, path: rel } of normalized) {
    if (!managed.has(rel)) throw new AgsError(`Not a managed file of this host: ${input}. Report AGENTS.md or files AGS installed under .agents/.`);
  }
  return dedupeReportedFiles(normalized).map(({ path: rel, level }) => {
    const file = path.join(hostRoot, ...rel.split("/"));
    let buffer;
    try {
      buffer = fs.readFileSync(file);
    } catch {
      throw new AgsError(`Managed file is missing: ${rel}`);
    }
    return { path: rel, level, sha256: createHash("sha256").update(buffer).digest("hex") };
  });
}

export async function reportUsage({ hostRoot, config, managed, values, label }) {
  if (config.reporting === false) return { recorded: false, file: null };
  return withLock(hostLockPath(hostRoot), "report usage", () => {
    const files = usageFiles(hostRoot, values, managed);
    const record = {
      id: randomUUID(),
      timestamp: `${new Date().toISOString().slice(0, 19)}Z`,
      agsVersion: String(config.agsVersion),
      label: label ?? "",
      files,
    };
    const file = path.join(hostRoot, ...USAGE_REL.split("/"));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
    return { recorded: true, file };
  });
}
