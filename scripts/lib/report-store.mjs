import fs from "node:fs";
import path from "node:path";
import { canonicalJson, planItem, runOperation } from "./operation.mjs";
import { USAGE_REL, withLock } from "./reports.mjs";
import { loadRegistry } from "./registry.mjs";
import { readConfig } from "./config.mjs";
import { AgsError, contentHash, gitRoot, sha256, writeAtomic } from "./util.mjs";

const SEGMENT = /^(\d{4}-(?:0[1-9]|1[0-2]))-(\d{3,})\.jsonl$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export function reportingLock(root) { return path.join(root, ".tmp", "ags", "locks", "reporting"); }
const usageDir = (root) => path.join(root, "reports", "usage");
const retentionFile = (root) => path.join(usageDir(root), "retention.json");
const currentMonth = (now) => now.toISOString().slice(0, 7);
const jsonl = (records) => records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");

export function readHostEvents(file, warn = () => {}) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.pop(); // Only newline-terminated records are complete.
  const records = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (!record || typeof record.id !== "string" || !record.id || typeof record.timestamp !== "string" || !MONTH.test(record.timestamp.slice(0, 7)) || !Number.isFinite(Date.parse(record.timestamp))) throw new Error("invalid event shape");
      records.push(record);
    } catch { warn(`Warning: ${file}:${index + 1}: malformed complete usage line skipped.`); }
  }
  return records;
}

function centralSegments(root) {
  const result = [];
  for (const compact of [false, true]) {
    const dir = compact ? path.join(usageDir(root), "compact") : usageDir(root);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      const match = name.match(SEGMENT);
      if (!match) continue;
      const file = path.join(dir, name);
      if (!fs.lstatSync(file).isFile()) throw new AgsError(`Central segment is not a regular file: ${file}`);
      const text = fs.readFileSync(file, "utf8");
      if (text && !text.endsWith("\n")) throw new AgsError(`Incomplete central segment: ${file}`);
      let records;
      try { records = text.split("\n").filter(Boolean).map(JSON.parse); } catch { throw new AgsError(`Malformed central segment: ${file}`); }
      if (records.some((record) => compact ? !Array.isArray(record.sourceEventIds) || record.sourceEventIds.some((id) => typeof id !== "string") : !record?.id || !record.timestamp)) throw new AgsError(`Invalid central record: ${file}`);
      result.push({ file, name, month: match[1], number: Number(match[2]), compact, records, text });
    }
  }
  return result;
}

function cutoff(root) {
  if (!fs.existsSync(retentionFile(root))) return null;
  const value = JSON.parse(fs.readFileSync(retentionFile(root), "utf8")).before;
  if (!MONTH.test(value)) throw new AgsError("Invalid reporting cleanup cutoff.");
  return value;
}

function verifiedWrite(file, text) {
  writeAtomic(file, text);
  if (sha256(fs.readFileSync(file)) !== sha256(text)) throw new AgsError(`Reporting verification failed: ${file}`);
}

export async function collectReports({ agsRoot, route, hostId, all = false, terminal, now = new Date(), fault = () => {} }) {
  if (Number(Boolean(route)) + Number(Boolean(hostId)) + Number(all) > 1) throw new AgsError("Pass --route, --host or --all.", { exitCode: 2 });
  const registry = loadRegistry(agsRoot);
  let entries;
  if (all) entries = [...registry.hosts].sort((a, b) => a.id < b.id ? -1 : 1);
  else if (hostId) {
    const entry = registry.hosts.find((host) => host.id === hostId);
    if (!entry) throw new AgsError(`Unknown host: ${hostId}`);
    entries = [entry];
  } else {
    const root = gitRoot(route ?? process.cwd());
    entries = [{ id: readConfig(root)?.data.host, path: root }];
  }
  return withLock(reportingLock(agsRoot), "report collect", () => {
    const segments = centralSegments(agsRoot);
    const ids = new Set(segments.flatMap((segment) => segment.records.flatMap((record) => segment.compact ? record.sourceEventIds : [record.id])));
    const before = cutoff(agsRoot);
    const batches = new Map();
    let count = 0;
    for (const entry of entries) {
      if (!fs.existsSync(entry.path)) { terminal.warn(`Warning: Host ${entry.id} unavailable; skipped.`); continue; }
      for (const record of readHostEvents(path.join(entry.path, USAGE_REL), terminal.warn.bind(terminal))) {
        const month = record.timestamp.slice(0, 7);
        if (ids.has(record.id) || before && month < before) continue;
        ids.add(record.id);
        if (!batches.has(month)) batches.set(month, []);
        batches.get(month).push({ ...record, host: record.host ?? entry.id ?? null });
      }
    }
    for (const [month, records] of [...batches].sort(([a], [b]) => a < b ? -1 : 1)) {
      const existing = segments.filter((segment) => segment.month === month);
      let number = Math.max(0, ...existing.map((segment) => segment.number));
      let active = existing.find((segment) => !segment.compact && segment.number === number && month === currentMonth(now) && segment.records.length < 1000 && !existing.some((other) => other.compact && other.number === number));
      let buffer = active?.records ?? [];
      if (!active) number += 1;
      for (const record of records) {
        buffer.push(record);
        count += 1;
        if (buffer.length === 1000) {
          verifiedWrite(path.join(usageDir(agsRoot), `${month}-${String(number).padStart(3, "0")}.jsonl`), jsonl(buffer));
          fault("after-segment");
          buffer = []; number += 1;
        }
      }
      if (buffer.length) { verifiedWrite(path.join(usageDir(agsRoot), `${month}-${String(number).padStart(3, "0")}.jsonl`), jsonl(buffer)); fault("after-segment"); }
    }
    terminal.log(`Collected ${count} usage events. Host spools are unchanged.`);
    return 0;
  });
}

export function compactRecords(records) {
  const groups = new Map();
  for (const record of records) {
    const fields = { host: record.host ?? null, agsVersion: record.agsVersion ?? null, harness: record.harness ?? null, action: record.action ?? record.skill ?? null, eventType: record.eventType ?? "usage", outcome: record.outcome ?? "recorded" };
    const key = canonicalJson(fields);
    let group = groups.get(key);
    if (!group) { group = { ...fields, count: 0, firstTimestamp: record.timestamp, lastTimestamp: record.timestamp, sourceEventIds: [] }; groups.set(key, group); }
    group.count += 1;
    group.firstTimestamp = group.firstTimestamp < record.timestamp ? group.firstTimestamp : record.timestamp;
    group.lastTimestamp = group.lastTimestamp > record.timestamp ? group.lastTimestamp : record.timestamp;
    group.sourceEventIds.push(record.id);
  }
  return [...groups].sort(([a], [b]) => a < b ? -1 : 1).map(([, group]) => ({ ...group, sourceEventIds: group.sourceEventIds.sort() }));
}

export async function compactReports({ agsRoot, terminal, now = new Date(), fault = () => {} }) {
  return withLock(reportingLock(agsRoot), "report compact", () => {
    let count = 0;
    for (const segment of centralSegments(agsRoot)) {
      if (segment.compact || !(segment.month < currentMonth(now) || segment.records.length >= 1000)) continue;
      const file = path.join(usageDir(agsRoot), "compact", segment.name);
      const text = jsonl(compactRecords(segment.records));
      if (fs.existsSync(file) && fs.readFileSync(file, "utf8") !== text) throw new AgsError(`Conflicting compact output: ${file}; raw input retained.`);
      verifiedWrite(file, text);
      fault("after-verify");
      fs.unlinkSync(segment.file);
      count += 1;
    }
    terminal.log(`Compacted ${count} closed usage segments.`);
    return 0;
  });
}

export function reportCleanOperation({ agsRoot, before, rerunArgs, now = new Date() }) {
  if (!MONTH.test(before ?? "")) throw new AgsError("--before must be YYYY-MM.", { exitCode: 2 });
  return {
    name: "report-clean", command: "report clean", rerunArgs,
    inspect() {
      const previous = cutoff(agsRoot);
      if (previous && before < previous) throw new AgsError(`Cleanup cutoff cannot move backwards from ${previous}.`);
      return { previous, segments: centralSegments(agsRoot).filter((segment) => segment.month < before && (segment.compact || segment.month < currentMonth(now) || segment.records.length >= 1000)) };
    },
    plan(state) {
      return { header: { title: `ags report clean: before ${before}`, before }, items: [
        ...(state.previous !== before ? [planItem({ path: "reports/usage/retention.json", kind: "retention", action: `set cutoff ${before}` })] : []),
        ...state.segments.map((segment) => planItem({ path: path.relative(agsRoot, segment.file).replaceAll("\\", "/"), kind: "closed usage", action: "remove", hashes: { H: contentHash(segment.text) } })),
      ] };
    },
    locks: () => [reportingLock(agsRoot)],
    apply(ctx) {
      verifiedWrite(retentionFile(agsRoot), `${JSON.stringify({ schemaVersion: 1, before })}\n`);
      ctx.done("reports/usage/retention.json");
      ctx.fault("after-cutoff");
      ctx.state.segments.forEach((segment, index) => {
        fs.unlinkSync(segment.file);
        ctx.done(path.relative(agsRoot, segment.file).replaceAll("\\", "/"));
        ctx.faultEach("after-remove", index, ctx.state.segments.length);
      });
      return [`Removed ${ctx.state.segments.length} closed segments. Retained cutoff ${before}.`];
    },
  };
}

export async function cleanReports(args) { return runOperation(reportCleanOperation(args), { terminal: args.terminal, ...args.options }); }
