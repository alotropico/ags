import fs from "node:fs";
import path from "node:path";
import { BACKUPS_REL, ENTRY_FILES, readManifest } from "./backup.mjs";
import { allIds, compareVersions, latestRelease, readCatalog, releaseVersions, resolveSelection, tagExists, validateCatalog } from "./catalog.mjs";
import { CONFIG_REL, missingRequired, readConfig, validateConfig } from "./config.mjs";
import { harnessTmpEntries } from "./discovery.mjs";
import { classifyUpdate, collisions, hostRules, ignoredPaths, registryState, releaseInputs, renderHostBlock, usageRecordCount } from "./host.mjs";
import { hostLinkTargets } from "./links.mjs";
import { detectEvidence } from "./packages.mjs";
import { loadRegistry } from "./registry.mjs";
import { analyzeBlock, BLOCK_KEY, budgetWarning, inspectExclude, tmpIgnored } from "./render.mjs";
import { agsLockPath, hostLockPath, lockState, runsLockPath } from "./reports.mjs";
import { packageVersion, readChangelog, releaseCommit, UNRELEASED } from "./version.mjs";
import { AGS_ROOT, displayPath, git, gitRoot, posix, readFileOrNull, samePath, slugError, worktreeInfo } from "./util.mjs";

export const DISPOSITIONS = ["AGS", "Host", "Backlog", "Removed", "Migrate later"];
export const LEDGER_HEADER = "| # | Concept | Source | Disposition | Destination | Rationale |";
const NEEDS_RATIONALE = new Set(["Removed", "Migrate later"]);

function report() {
  return { errors: [], warnings: [], info: [] };
}

function attempt(out, fn) {
  try {
    fn();
  } catch (error) {
    out.errors.push(error.message);
  }
}

export function splitRow(line) {
  const cells = [];
  let cell = "";
  let code = false;
  const text = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\\" && text[i + 1] === "|") {
      cell += "|";
      i += 1;
    } else if (char === "`") {
      code = !code;
      cell += char;
    } else if (char === "|" && !code) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

export function ledgerErrors(text) {
  const errors = [];
  const lines = String(text).replaceAll("\r\n", "\n").split("\n");
  let tables = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== LEDGER_HEADER) continue;
    tables += 1;
    let at = i + 2;
    for (; at < lines.length && lines[at].trim().startsWith("|"); at += 1) {
      const cells = splitRow(lines[at]);
      const where = `LEDGER.md line ${at + 1}`;
      if (cells.length !== 6) {
        errors.push(`${where}: a row needs 6 cells, found ${cells.length}`);
        continue;
      }
      const disposition = cells[3];
      if (!DISPOSITIONS.includes(disposition)) errors.push(`${where}: disposition must be one of ${DISPOSITIONS.join(", ")}, found "${disposition}"`);
      else if (NEEDS_RATIONALE.has(disposition) && !cells[5]) errors.push(`${where}: a ${disposition} row needs a rationale`);
    }
    i = at - 1;
  }
  if (!tables) errors.push("LEDGER.md has no ledger table");
  return errors;
}

function staleLocks(out, dirs) {
  for (const dir of dirs) {
    const state = lockState(dir);
    if (state.held && state.stale) out.warnings.push(`Stale lock ${posix(dir)}; the next command that needs it removes it.`);
    else if (state.held) out.info.push(`Lock held: ${posix(dir)} by ${state.owner?.command ?? "an unknown command"}`);
  }
}

function checkVersion(out, agsRoot) {
  const version = packageVersion(agsRoot);
  const latest = latestRelease(agsRoot);
  out.info.push(`Version: ${version}; latest release: ${latest ?? "none"}`);
  if (latest && version === latest) return;
  if (!latest || compareVersions(version, latest) > 0) {
    const commit = releaseCommit(agsRoot, version);
    if (commit) {
      out.errors.push(`Release commit ${commit.slice(0, 12)} (Release: ${version}) has no tag v${version}. Recover with ags version bump and any level; it only creates the missing tag.`);
      return;
    }
    if (!latest) return;
  }
  out.errors.push(`package.json version ${version} does not match the latest release ${latest}.`);
}

function checkNotHost(out, agsRoot) {
  for (const rel of [".agents", ".cursor/skills", ".claude/skills"]) {
    if (fs.existsSync(path.join(agsRoot, ...rel.split("/")))) out.errors.push(`AGS is not a host, but ${rel}/ exists at the AGS root.`);
  }
  const agents = path.join(agsRoot, "AGENTS.md");
  if (fs.existsSync(agents) && analyzeBlock(fs.readFileSync(agents, "utf8")).kind !== "missing") out.errors.push("AGS is not a host, but AGENTS.md holds AGS block markers.");
}

function checkGitState(out, agsRoot) {
  const changed = git(["status", "--porcelain"], agsRoot).stdout.split(/\r?\n/).filter(Boolean).length;
  out.info.push(`Uncommitted changes: ${changed ? `${changed} path${changed === 1 ? "" : "s"}` : "none"}`);
  const latest = latestRelease(agsRoot);
  if (latest) {
    const count = git(["rev-list", "--count", `v${latest}..HEAD`], agsRoot).stdout.trim();
    out.info.push(`Commits since v${latest}: ${count}`);
  }
}

export function doctorAgs(agsRoot = AGS_ROOT) {
  const out = report();
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) out.errors.push(`Node ${process.versions.node} is below 20.`);
  else out.info.push(`Node: ${process.versions.node}`);
  attempt(out, () => {
    const { catalog, source } = readCatalog(agsRoot);
    const errors = validateCatalog(catalog, source);
    out.errors.push(...errors.map((line) => `catalog.yaml: ${line}`));
    if (!errors.length) out.info.push(`Catalog: ${catalog.rules.length} rules, ${catalog.skills.length} skills`);
  });
  attempt(out, () => {
    const first = readChangelog(agsRoot).replaceAll("\r\n", "\n").split("\n").find((line) => line.trim());
    if (first?.trim() !== UNRELEASED) out.errors.push(`CHANGELOG.md must start with ${UNRELEASED}.`);
  });
  attempt(out, () => checkVersion(out, agsRoot));
  const ledger = path.join(agsRoot, "LEDGER.md");
  if (!fs.existsSync(ledger)) out.errors.push("LEDGER.md is missing.");
  else out.errors.push(...ledgerErrors(fs.readFileSync(ledger, "utf8")));
  checkNotHost(out, agsRoot);
  attempt(out, () => {
    const { hosts } = loadRegistry(agsRoot);
    out.info.push(`Registered hosts: ${hosts.length}`);
  });
  attempt(out, () => staleLocks(out, [agsLockPath(agsRoot), runsLockPath(agsRoot)]));
  attempt(out, () => checkGitState(out, agsRoot));
  return out;
}

function abs(root, rel) {
  return path.join(root, ...rel.split("/"));
}

function listRel(root, rel) {
  let entries;
  try {
    entries = fs.readdirSync(abs(root, rel), { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listRel(root, child));
    else if (entry.isFile()) out.push(child);
  }
  return out.sort();
}

function childDirs(root, rel) {
  try {
    return fs
      .readdirSync(abs(root, rel), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function triggerNames(root, rel = ".tmp") {
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(abs(root, rel), { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) found.push(`${child}/`);
      else found.push(...triggerNames(root, child));
    } else if (ENTRY_FILES.includes(entry.name)) found.push(child);
  }
  return found;
}

function checkTmp(out, hostRoot) {
  if (!fs.existsSync(abs(hostRoot, ".tmp"))) out.warnings.push(".tmp/ does not exist.");
  if (!tmpIgnored(hostRoot)) out.errors.push("Git does not ignore .tmp/; the next update adds /.tmp/ to the exclude block.");
  out.errors.push(...harnessTmpEntries(hostRoot));
  for (const rel of triggerNames(hostRoot)) out.errors.push(`${rel} is a dot-folder or an instruction entry file under .tmp/; agent tools may load it. Rename or remove it.`);
}

function checkIgnoredGuidance(out, hostRoot) {
  for (const item of ignoredPaths(hostRoot, [BLOCK_KEY, ".agents/", ...listRel(hostRoot, ".agents")])) {
    out.errors.push(`Git ignores ${item.path} (${item.source}); the host is unsupported until the rule changes.`);
  }
}

function checkBackups(out, hostRoot) {
  for (const name of childDirs(hostRoot, BACKUPS_REL)) {
    const rel = `${BACKUPS_REL}/${name}`;
    let manifest;
    try {
      manifest = readManifest(abs(hostRoot, rel));
    } catch (error) {
      out.warnings.push(`${rel}/manifest.json is unreadable: ${error.message}`);
      continue;
    }
    if (!manifest) out.warnings.push(`${rel} has no manifest.json; check its files by hand.`);
    else if (manifest.complete === false) out.warnings.push(`${rel} has an incomplete manifest; the next prepare or install continues it.`);
  }
}

function linkTargets(sourceRel, text) {
  const targets = hostLinkTargets(sourceRel, text).map((item) => item.target).filter(Boolean);
  for (const match of String(text).matchAll(/`([^`\s]+)`/g)) {
    const value = match[1].replaceAll("\\", "/");
    if (value.startsWith("/") || /^[a-zA-Z]:/.test(value)) continue;
    const trailing = value.endsWith("/") ? "/" : "";
    for (const candidate of [path.posix.join(path.posix.dirname(sourceRel), value), value]) {
      const normalized = path.posix.normalize(candidate).replace(/\/$/, "");
      if (normalized !== ".." && !normalized.startsWith("../")) targets.push(`${normalized}${trailing}`);
    }
  }
  return targets;
}

function checkLocalFiles(out, hostRoot, { agsIds, block }) {
  const local = listRel(hostRoot, ".agents/local");
  if (!local.length) return;
  const skills = new Set(childDirs(hostRoot, ".agents/skills"));
  const noteId = (rel) => rel.match(/^\.agents\/local\/([^/]+)\.md$/)?.[1] ?? null;
  const notes = local.filter((rel) => skills.has(noteId(rel)));
  const agents = readFileOrNull(abs(hostRoot, BLOCK_KEY))?.toString("utf8") ?? "";
  const sources = [[BLOCK_KEY, ["intact", "edited"].includes(block.kind) ? `${block.before}\n${block.after}` : agents]];
  for (const rel of listRel(hostRoot, ".agents/rules")) {
    const id = rel.match(/^\.agents\/rules\/([^/]+)\.md$/)?.[1];
    if (id && !agsIds.has(id)) sources.push([rel, readFileOrNull(abs(hostRoot, rel)).toString("utf8")]);
  }
  for (const id of skills) {
    if (agsIds.has(id)) continue;
    for (const rel of listRel(hostRoot, `.agents/skills/${id}`)) if (rel.endsWith(".md")) sources.push([rel, readFileOrNull(abs(hostRoot, rel)).toString("utf8")]);
  }
  for (const rel of notes) sources.push([rel, readFileOrNull(abs(hostRoot, rel)).toString("utf8")]);
  const targets = sources.flatMap(([rel, text]) => linkTargets(rel, text));
  const linked = (rel) => targets.some((target) => target === rel || (target.endsWith("/") && rel.startsWith(target)));
  for (const rel of local) {
    if (notes.includes(rel) || linked(rel)) continue;
    const id = noteId(rel);
    if (id) out.warnings.push(`${rel}: no skill ${id} is installed, so the core line points nowhere, and no host guidance links it.`);
    else out.warnings.push(`${rel}: no host guidance links it (11.6).`);
  }
}

function checkRegistry(out, agsRoot, hostRoot, hostId) {
  if (slugError(hostId, "host")) return null;
  const reg = registryState(agsRoot, hostRoot, hostId);
  if (reg.action === "register") out.warnings.push(`Host ${hostId} is not registered; the next update registers it.`);
  else if (reg.action === "path") out.warnings.push(`The registry records host ${hostId} at ${reg.entry.path}; the next update moves it to ${posix(hostRoot)}.`);
  return reg.entry;
}

function checkManaged(out, { agsRoot, hostRoot, version, catalog, source, selection, entry }) {
  const classified = classifyUpdate({ hostRoot, agsRoot, from: version, to: version, catalogI: catalog, sourceI: source, catalogT: catalog, sourceT: source, selectionI: selection, selectionT: selection, entry });
  const removed = new Map();
  for (const item of classified.entries) {
    if (item.choices) out.warnings.push(`${item.rel}: ${item.detail}; the next update asks ${item.choices.join(", ")}.`);
    else if (String(item.action).startsWith("delete")) removed.set(item.id, item.kind);
    else out.warnings.push(`${item.rel}: the next update will ${item.action}.`);
  }
  for (const [id, kind] of removed) out.warnings.push(`${id} is an AGS ${kind} that is not selected; the next update removes it.`);
  for (const rel of classified.pending) out.info.push(`Promoted, pending release: ${rel}`);
  for (const rel of classified.skipped) out.info.push(`Ignored: ${rel}`);
}

function checkCollisions(out, { agsRoot, hostRoot, version, catalog, hostId }) {
  const major = version.split(".")[0];
  const latest = releaseVersions(agsRoot).filter((item) => item.split(".")[0] === major).at(-1);
  if (!latest || latest === version) return;
  const target = releaseInputs(agsRoot, latest);
  const ids = allIds(target.catalog).filter((id) => !allIds(catalog).includes(id));
  for (const item of collisions(hostRoot, target.source, target.catalog, hostId, { ids })) {
    out.errors.push(`${item.from} uses the id ${item.id}, which AGS ${latest} adds; the next update stops. Rename it to ${item.to}.`);
  }
}

function checkBlock(out, { hostRoot, version, catalog, source, selection, block }) {
  if (block.kind === "missing") return out.errors.push("AGENTS.md has no AGS block; the next update asks to restore it.");
  if (block.kind === "malformed") return out.errors.push("AGENTS.md has unbalanced or repeated AGS markers; fix them by hand.");
  if (block.kind === "edited") return out.errors.push("The AGS block in AGENTS.md was edited (its hash does not match); the next update asks to restore it.");
  if (block.version !== version) out.warnings.push(`The AGS block names ${block.version}, but agsVersion is ${version}.`);
  const rendered = renderHostBlock({ hostRoot, source, catalog, selection, version });
  if (rendered.body !== block.body) out.warnings.push("The AGS block does not match the installed core and the host's rules; the next update regenerates it.");
  const budget = budgetWarning(block.body);
  if (budget) out.warnings.push(budget);
}

function checkInstalled(out, { agsRoot, hostRoot, main, data, version }) {
  const { catalog, source } = releaseInputs(agsRoot, version);
  const selection = resolveSelection(catalog, data, detectEvidence(hostRoot));
  for (const line of new Set([...validateConfig(data, catalog, { hostRoot }), ...selection.errors])) out.errors.push(`${CONFIG_REL}: ${line}`);
  for (const key of missingRequired(catalog, data, selection.skills)) out.errors.push(`Required setting ${key} has no value; set it with ags host update --set ${key}=<value>.`);
  let entry = null;
  if (main) attempt(out, () => (entry = checkRegistry(out, agsRoot, hostRoot, data.host)));
  attempt(out, () => checkManaged(out, { agsRoot, hostRoot, version, catalog, source, selection, entry }));
  attempt(out, () => checkCollisions(out, { agsRoot, hostRoot, version, catalog, hostId: data.host }));
  const block = analyzeBlock(readFileOrNull(abs(hostRoot, BLOCK_KEY))?.toString("utf8") ?? null);
  attempt(out, () => checkBlock(out, { hostRoot, version, catalog, source, selection, block }));
  const agsIds = new Set(allIds(catalog));
  for (const rule of hostRules(hostRoot, agsIds)) {
    if (!rule.description) out.warnings.push(`.agents/rules/${rule.id}.md has no description; the AGS block index leaves it out.`);
  }
  attempt(out, () => checkLocalFiles(out, hostRoot, { agsIds, block }));
}

export function doctorHost(agsRoot, route) {
  const out = report();
  const info = worktreeInfo(route);
  const hostRoot = info.root;
  out.hostRoot = hostRoot;
  if (!info.main) {
    const where = info.mainWorktree ? ` of ${posix(info.mainWorktree)}` : "";
    out.info.push(`Linked worktree${where}: registry checks skipped.`);
  }
  let config = null;
  try {
    config = readConfig(hostRoot);
    if (!config) out.errors.push(`${displayPath(hostRoot)} has no AGS installation (${CONFIG_REL} is missing).`);
  } catch (error) {
    out.errors.push(error.message);
  }
  const data = config?.data;
  if (data && data.format !== 2) out.errors.push(`${CONFIG_REL}: format must be 2.`);
  else if (data && data.agsVersion == null) out.errors.push(`${CONFIG_REL} has no agsVersion: an interrupted install. Run ags host install, which resumes it.`);
  else if (data) {
    const version = String(data.agsVersion);
    out.info.push(`Host: ${data.host ?? "unnamed"} at ${version}`);
    if (!tagExists(agsRoot, version)) out.errors.push(`${CONFIG_REL} names agsVersion ${version}, but AGS has no tag v${version}.`);
    else attempt(out, () => checkInstalled(out, { agsRoot, hostRoot, main: info.main, data, version }));
  }
  attempt(out, () => checkTmp(out, hostRoot));
  if (info.main) {
    attempt(out, () => {
      if (inspectExclude(hostRoot).state === "edited") out.errors.push("The AGS region of .git/info/exclude was edited; the next update asks to restore it.");
    });
  }
  attempt(out, () => checkIgnoredGuidance(out, hostRoot));
  attempt(out, () => checkBackups(out, hostRoot));
  out.info.push(`Usage records: ${usageRecordCount(hostRoot)}`);
  attempt(out, () => staleLocks(out, [hostLockPath(hostRoot)]));
  return out;
}

export function hostDoctorWarnings(agsRoot, hostRoot) {
  const out = doctorHost(agsRoot, hostRoot);
  return [...out.errors, ...out.warnings];
}

function printSection(terminal, out) {
  for (const line of out.info) terminal.log(line);
  for (const line of out.errors) terminal.log(`Error: ${line}`);
  for (const line of out.warnings) terminal.log(`Warning: ${line}`);
}

function summary(terminal, reports) {
  const errors = reports.reduce((sum, out) => sum + out.errors.length, 0);
  const warnings = reports.reduce((sum, out) => sum + out.warnings.length, 0);
  terminal.log(errors + warnings ? `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.` : "No findings.");
  return errors ? 1 : 0;
}

export function doctor({ agsRoot = AGS_ROOT, route = null, terminal }) {
  const hostRoute = route && !samePath(gitRoot(route), agsRoot) ? route : null;
  terminal.log(`AGS: ${posix(agsRoot)}`);
  const agsReport = doctorAgs(agsRoot);
  printSection(terminal, agsReport);
  if (!hostRoute) return summary(terminal, [agsReport]);
  const hostReport = doctorHost(agsRoot, hostRoute);
  terminal.log(`Host root: ${posix(hostReport.hostRoot)}`);
  printSection(terminal, hostReport);
  return summary(terminal, [agsReport, hostReport]);
}
