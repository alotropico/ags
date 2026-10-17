import fs from "node:fs";
import path from "node:path";
import { resolveSelection, tagSource } from "./catalog.mjs";
import { parse } from "yaml";
import { readConfig } from "./config.mjs";
import { detectCapabilities } from "./capabilities.mjs";
import { detectEvidence } from "./packages.mjs";
import { discoverSkillNames } from "./skills.mjs";
import { readAliasRecord } from "./claude-skills.mjs";
import { loadRegistry } from "./registry.mjs";
import { assertSlug, writeAtomic } from "./util.mjs";

export function observedPath(agsRoot, hostId) { return path.join(agsRoot, "hosts", `${assertSlug(hostId, "host id")}.json`); }

export function observeHost(agsRoot, root) {
  const config = readConfig(root)?.data;
  if (!config?.agsVersion || !config.host) return null;
  const catalog = parse(tagSource(agsRoot, config.agsVersion).readFile("catalog.yaml").toString("utf8"));
  const selected = resolveSelection(catalog, config, detectEvidence(root)).skills.sort();
  const managed = new Set(catalog.skills.map((item) => item.id));
  const capabilities = detectCapabilities(root);
  const snapshot = {
    schemaVersion: 1, hostId: config.host, agsVersion: config.agsVersion,
    path: root,
    agsSkills: selected, nonAgsSkills: discoverSkillNames(root).filter((name) => !managed.has(name)),
    optionalTools: Object.fromEntries(Object.entries(capabilities).map(([key, value]) => [key, Boolean(value)])),
    inspectedAt: new Date().toISOString(),
  };
  const aliases = readAliasRecord(agsRoot, root, config.host);
  if (aliases.length) snapshot.claudeAliases = aliases;
  writeAtomic(observedPath(agsRoot, config.host), `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

export async function inspectAll({ agsRoot, terminal, inspect }) {
  let code = 0;
  for (const entry of [...loadRegistry(agsRoot).hosts].sort((a, b) => a.id < b.id ? -1 : 1)) {
    terminal.log(`Host ${entry.id}: ${entry.path}`);
    try {
      if (!fs.existsSync(entry.path)) throw new Error("Host unavailable");
      code = Math.max(code, await inspect(entry));
    } catch (error) {
      code = 1;
      terminal.warn(`Host ${entry.id}: ${error.message}. Observed state is stale${fs.existsSync(observedPath(agsRoot, entry.id)) ? " (last snapshot retained)" : " (no snapshot)"}.`);
    }
  }
  return code;
}
