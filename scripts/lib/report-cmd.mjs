import path from "node:path";
import { resolveRoute, settingsPath, verifyRegistered } from "./host.mjs";
import { loadRegistry } from "./host.mjs";
import { appendReport, canonicalFile, dedupeReportedFiles, parseUsageFiles, reportStamp } from "./reports.mjs";
import { AgsError, samePath, singleLine, writeYamlAtomic } from "./util.mjs";

export async function recordUsage(root, route, { fileArgs = [], label } = {}) {
  const hostRoot = resolveRoute(route);
  const { entry, settings } = verifyRegistered(root, hostRoot);
  if (!settings.reporting) return { disabled: true, destination: null };
  const files = dedupeReportedFiles(parseUsageFiles(fileArgs).map((file) => ({
    path: canonicalFile(root, file.path),
    level: file.level,
  })));
  const record = { timestamp: reportStamp(), host: entry.name, files };
  const clean = singleLine(label, "label");
  if (clean) record.label = clean;
  return { disabled: false, destination: await appendReport(root, "usage", record), record };
}

export async function recordChanges(root, route, { files = [], note } = {}) {
  if (!files.length) throw new AgsError("At least one --file is required");
  const direct = samePath(path.resolve(route), root);
  let hostName = "AGS";
  if (!direct) {
    const hostRoot = resolveRoute(route);
    if (!samePath(hostRoot, root)) hostName = verifyRegistered(root, hostRoot).entry.name;
  }
  const record = {
    timestamp: reportStamp(),
    host: hostName,
    files: dedupeReportedFiles(files.map((file) => ({ path: canonicalFile(root, file), level: 9 }))),
  };
  const clean = singleLine(note, "note");
  if (clean) record.note = clean;
  return { destination: await appendReport(root, "changes", record), record };
}

export function setReporting(root, { route, host, all, value }) {
  if (typeof value !== "boolean") throw new AgsError("reporting value must be boolean");
  const registry = loadRegistry(root);
  let entries = [];
  if (all) entries = registry.hosts;
  else if (host) {
    const entry = registry.hosts.find((item) => item.id === host);
    if (!entry) throw new AgsError(`Unknown host: ${host}`);
    entries = [entry];
  } else entries = [verifyRegistered(root, resolveRoute(route)).entry];
  const failures = [];
  const changed = [];
  for (const entry of entries) {
    try {
      const verified = verifyRegistered(root, entry.path);
      verified.settings.reporting = value;
      writeYamlAtomic(settingsPath(entry.path), verified.settings);
      changed.push(entry.id);
    } catch (error) {
      failures.push(`${entry.id}: ${error.message}`);
    }
  }
  return { changed, failures };
}
