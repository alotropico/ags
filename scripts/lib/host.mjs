import fs from "node:fs";
import path from "node:path";
import {
  applySelection,
  catalogById,
  detectEvidence,
  entryGroup,
  includedSkillIds,
  isEntryPoint,
  loadCatalog,
  normalizeOperational,
  offeredEntries,
  proposeOperationalSettings,
  selectionErrors,
  skillAbs,
  whenMatches,
} from "./catalog.mjs";
import { assertCheckScript, isPackageScriptKey, migrateChecks, readPackageScripts } from "./packages.mjs";
import {
  agentsBlock,
  blockIntact,
  claudeBlock,
  claudeModeOf,
  claudeOverrideText,
  classifyClaude,
  planAgentsBlockRemoval,
  planClaudeRemoval,
  planClaudeWrite,
  renderHostEntry,
  upsertAgentsBlock,
} from "./render.mjs";
import {
  AgsError,
  assertCanonicalAccess,
  assertSlug,
  displayPath,
  ensureHostTmpIgnored,
  gitRoot,
  quarantine,
  readYaml,
  samePath,
  slug,
  slugError,
  validBranchName,
  writeAtomic,
  writeYamlAtomic,
} from "./util.mjs";

const MANAGED_NAMES = new Set(["AGS.md", "ags.yaml", "local"]);
const CHECK_KEYS = ["type", "lint", "prettier"];

export function splitSetting(setting, value) {
  if (typeof setting === "string" && setting.includes("=")) {
    const index = setting.indexOf("=");
    return [setting.slice(0, index), setting.slice(index + 1)];
  }
  return [setting, value];
}

export function resolveClaudeOption(value, fallback = "skip") {
  if (value == null) return fallback;
  const mode = claudeModeOf(value);
  if (!mode) throw new AgsError("Claude mode must be skip, block, or override");
  return mode;
}

function localExceptionErrors(settings) {
  const list = settings?.skills?.localExceptions;
  if (list == null) return [];
  if (!Array.isArray(list)) return ["settings skills.localExceptions must be an array"];
  const errors = [];
  const seen = new Set();
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push("local exception must be an object");
      continue;
    }
    const idError = slugError(item.id, "local exception id");
    if (idError) errors.push(idError);
    const expected = `.agents/skills/${item.id}/SKILL.md`;
    if (item.path !== expected) errors.push(`local exception path must be ${expected}`);
    if (item.reason !== "requires-host-location") errors.push(`${item.id || "local exception"} reason must be requires-host-location`);
    if (typeof item.source !== "string" || !item.source.trim()) errors.push(`${item.id || "local exception"} source is required`);
    if (item.id && seen.has(item.id)) errors.push(`duplicate local exception: ${item.id}`);
    if (item.id) seen.add(item.id);
    if (Array.isArray(settings.skills?.enabled) && settings.skills.enabled.includes(item.id)) {
      errors.push(`${item.id} is both enabled and a host-local exception`);
    }
  }
  return errors;
}

export function missingMaterialWarnings(root, catalog, settings, hostRoot) {
  const warnings = [];
  for (const id of settings.rules?.enabled || []) {
    const entry = catalogById(catalog).get(id);
    if (!entry || entryGroup(catalog, id) !== "rules") continue;
    const abs = path.join(root, ...entry.path.split("/"));
    if (!fs.existsSync(abs)) warnings.push(`missing selected rule: ${entry.path}`);
  }
  let included = [];
  try {
    included = includedSkillIds(catalog, settings.skills?.enabled || []);
  } catch {
    included = [];
  }
  const seen = new Set();
  for (const id of [...(settings.skills?.enabled || []), ...included]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = catalogById(catalog).get(id);
    if (!entry || entryGroup(catalog, id) !== "skills") continue;
    const abs = path.join(root, ...entry.path.split("/"));
    if (!fs.existsSync(abs)) warnings.push(`missing ${settings.skills.enabled.includes(id) ? "selected" : "included"} skill: ${entry.path}`);
  }
  for (const item of settings.skills?.localExceptions || []) {
    if (!item?.path || !hostRoot) continue;
    const abs = path.join(hostRoot, ...item.path.split("/"));
    if (!fs.existsSync(abs)) warnings.push(`missing host-local exception: ${item.path}`);
  }
  return warnings;
}

export function persistSettings(settings) {
  const next = structuredClone(settings);
  if (next.adapters) next.adapters = { ...next.adapters, claude: claudeModeOf(next.adapters.claude) || next.adapters.claude };
  if (Array.isArray(next.skills?.localExceptions) && next.skills.localExceptions.length === 0) {
    delete next.skills.localExceptions;
  }
  return next;
}

export function registryPath(root) {
  return path.join(root, "hosts.yaml");
}

export function loadRegistry(root) {
  const file = registryPath(root);
  if (!fs.existsSync(file)) {
    const empty = { format: 1, hosts: [] };
    writeYamlAtomic(file, empty);
    return empty;
  }
  const registry = readYaml(file);
  const errors = validateRegistry(registry);
  if (errors.length) throw new AgsError(errors.join("\n"));
  return registry;
}

export function validateRegistry(registry) {
  const errors = [];
  if (!registry || registry.format !== 1 || !Array.isArray(registry.hosts)) {
    return ["hosts.yaml format must be 1 with a hosts list"];
  }
  const ids = new Set();
  const paths = new Set();
  for (const host of registry.hosts) {
    if (!host || typeof host !== "object") {
      errors.push("host entry must be an object");
      continue;
    }
    for (const key of Object.keys(host)) {
      if (!["id", "name", "path"].includes(key)) errors.push(`hosts.yaml must not contain ${key}`);
    }
    const idProblem = slugError(host.id, "host id");
    if (idProblem) errors.push(idProblem);
    if (!host.name || typeof host.name !== "string") errors.push(`host ${host.id || "?"} missing name`);
    if (!host.path || !path.isAbsolute(host.path)) errors.push(`host ${host.id || "?"} path must be absolute`);
    if (host.id && ids.has(host.id)) errors.push(`duplicate host id: ${host.id}`);
    const identity = host.path ? identityKey(host.path) : "";
    if (identity && paths.has(identity)) errors.push(`duplicate host path: ${host.path}`);
    if (host.id && !idProblem) ids.add(host.id);
    if (identity) paths.add(identity);
  }
  return errors;
}

function identityKey(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function saveRegistry(root, registry) {
  const errors = validateRegistry(registry);
  if (errors.length) throw new AgsError(errors.join("\n"));
  writeYamlAtomic(registryPath(root), registry);
}

export function findHostRoot(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, ".agents", "ags.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function resolveRoute(start) {
  const route = path.resolve(start);
  if (!fs.existsSync(route)) throw new AgsError(`Route does not exist: ${route}`);
  const hostRoot = findHostRoot(route);
  if (!hostRoot) throw new AgsError(`No .agents/ags.yaml at or above ${route}`);
  const repo = gitRoot(hostRoot);
  if (!samePath(repo, hostRoot)) {
    throw new AgsError(`Host settings are not at the Git root: ${hostRoot}`);
  }
  return hostRoot;
}

export function resolveRepairTarget(root, input) {
  const registry = loadRegistry(root);
  const text = String(input);
  const asPath = path.isAbsolute(text) || fs.existsSync(text);
  if (!asPath) {
    const byId = registry.hosts.find((host) => host.id === text);
    if (!byId) throw new AgsError(`Host is not registered: ${text}`);
    return bindRegistered(root, byId);
  }
  if (!fs.existsSync(text)) {
    const entry = registry.hosts.find((host) => samePath(host.path, text));
    throw new AgsError(`Host path is unreachable: ${entry?.path || text}`);
  }
  let repo;
  try {
    repo = gitRoot(text);
  } catch (error) {
    throw new AgsError(`Host path is unreachable: ${error.message}`);
  }
  const matches = registry.hosts.filter((host) => samePath(host.path, repo));
  if (matches.length !== 1) {
    throw new AgsError(matches.length === 0 ? `Host is not registered: ${repo}` : `Ambiguous host identity for ${repo}`);
  }
  if (!samePath(matches[0].path, repo)) throw new AgsError(`Registry path does not match the Git root: ${matches[0].path}`);
  return loadTolerant(root, matches[0], repo);
}

function bindRegistered(root, entry) {
  if (!fs.existsSync(entry.path)) throw new AgsError(`Host path is unreachable: ${entry.path}`);
  let repo;
  try {
    repo = gitRoot(entry.path);
  } catch (error) {
    throw new AgsError(`Host path is unreachable: ${error.message}`);
  }
  if (!samePath(repo, entry.path)) throw new AgsError(`Registry path is not the Git root: ${entry.path}`);
  return loadTolerant(root, entry, repo);
}

function loadTolerant(root, entry, hostRoot) {
  const file = settingsPath(hostRoot);
  let settings = null;
  let settingsError = null;
  if (!fs.existsSync(file)) settingsError = "missing .agents/ags.yaml";
  else {
    try {
      settings = readYaml(file);
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        settings = null;
        settingsError = "malformed settings";
      }
    } catch (error) {
      settings = null;
      settingsError = `malformed settings: ${error.message}`;
    }
  }
  if (settings?.host && settings.host !== entry.id) {
    throw new AgsError(`Host id ${settings.host} does not match registry id ${entry.id}`);
  }
  return { entry, hostRoot, settings, settingsError, registry: loadRegistry(root) };
}

export function settingsPath(hostRoot) {
  return path.join(hostRoot, ".agents", "ags.yaml");
}

export function readSettings(hostRoot) {
  const file = settingsPath(hostRoot);
  if (!fs.existsSync(file)) throw new AgsError(`Missing host settings: ${file}`);
  return readYaml(file);
}

export function validateSettings(settings, root) {
  const errors = [];
  if (!settings || settings.format !== 1) errors.push("settings format must be 1");
  if (!settings?.host || typeof settings.host !== "string") errors.push("settings host is required");
  if (!settings?.canonicalRoot) errors.push("settings canonicalRoot is required");
  else if (!samePath(settings.canonicalRoot, root)) {
    errors.push("settings canonicalRoot does not match this AGS. Re-run node scripts/install-global.mjs or ags host update --yes.");
  }
  if (typeof settings?.reporting !== "boolean") errors.push("settings reporting must be boolean");
  for (const group of ["rules", "skills"]) {
    if (!Array.isArray(settings?.[group]?.enabled) || !Array.isArray(settings?.[group]?.disabled)) {
      errors.push(`settings ${group}.enabled and disabled are required`);
    }
  }
  if (!claudeModeOf(settings?.adapters?.claude)) errors.push("settings adapters.claude must be skip, block, or override");
  errors.push(...localExceptionErrors(settings));
  if (settings?.git != null) {
    if (typeof settings.git !== "object" || Array.isArray(settings.git)) errors.push("settings git must be an object");
    else {
      for (const key of Object.keys(settings.git)) {
        if (key !== "mainBranch") errors.push(`unsupported git setting: ${key}`);
      }
      if (settings.git.mainBranch != null && !validBranchName(settings.git.mainBranch)) {
        errors.push("git.mainBranch must be a branch name");
      }
    }
  }
  if (settings?.checks != null) {
    if (typeof settings.checks !== "object" || Array.isArray(settings.checks)) errors.push("settings checks must be an object");
    else {
      for (const key of Object.keys(settings.checks)) {
        if (!CHECK_KEYS.includes(key)) errors.push(`unsupported check: ${key}`);
        else if (!isPackageScriptKey(settings.checks[key])) {
          errors.push(`checks.${key} must be a package script name`);
        }
      }
    }
  }
  return errors;
}

export function verifyRegistered(root, hostRoot) {
  if (!fs.existsSync(hostRoot)) throw new AgsError(`Host path is unreachable: ${hostRoot}`);
  let repo;
  try {
    repo = gitRoot(hostRoot);
  } catch (error) {
    throw new AgsError(`Host path is unreachable: ${error.message}`);
  }
  if (!samePath(repo, hostRoot)) throw new AgsError(`Host path is not the Git root: ${hostRoot}`);
  const registry = loadRegistry(root);
  const entry = registry.hosts.find((host) => samePath(host.path, repo));
  if (!entry) throw new AgsError(`Host is not registered: ${hostRoot}`);
  if (!samePath(entry.path, repo)) throw new AgsError(`Registry path does not match the Git root: ${entry.path}`);
  let settings;
  try {
    settings = readSettings(hostRoot);
  } catch (error) {
    throw new AgsError(`Host is unreachable: ${error.message}`);
  }
  if (settings.host !== entry.id) {
    throw new AgsError(`Host id ${settings.host} does not match registry id ${entry.id}`);
  }
  const settingErrors = validateSettings(settings, root);
  if (settingErrors.length) throw new AgsError(settingErrors.join("\n"));
  const catalog = loadCatalog(root);
  const selected = selectionErrors(catalog, settings);
  if (selected.length) throw new AgsError(selected.join("\n"));
  includedSkillIds(catalog, settings.skills.enabled);
  return { registry, entry, settings, catalog };
}

export function readMainBranch(root, hostRoot) {
  const { settings } = verifyRegistered(root, hostRoot);
  if (!settings.git?.mainBranch) {
    throw new AgsError("Missing .agents/ags.yaml key git.mainBranch. Configure the host; do not infer a branch.");
  }
  return settings.git.mainBranch;
}

export function hostPlanPath(root, hostRoot, name) {
  verifyRegistered(root, hostRoot);
  if (!name || path.basename(name) !== name || !name.endsWith(".md") || name === ".md") {
    throw new AgsError(`Plan name must be a markdown filename: ${name}`);
  }
  ensureHostTmpIgnored(hostRoot);
  const plan = path.resolve(hostRoot, ".tmp", name);
  if (!samePath(hostRoot, root)) {
    const canonicalTmp = path.resolve(root, ".tmp");
    const rel = path.relative(canonicalTmp, plan);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      throw new AgsError("Host plans must not be written to canonical .tmp");
    }
  }
  return plan;
}

export function defaultSettings(root, id, selection, claude, operational = {}) {
  const settings = {
    format: 1,
    host: id,
    canonicalRoot: displayPath(root),
    reporting: true,
    rules: selection.rules,
    skills: selection.skills,
    adapters: { claude: claudeModeOf(claude) || "skip" },
  };
  if (operational.git) settings.git = operational.git;
  if (operational.checks) settings.checks = operational.checks;
  return settings;
}

function remember(backups, file) {
  if (backups.some((item) => samePath(item.file, file))) return;
  backups.push({
    file,
    existed: fs.existsSync(file),
    data: fs.existsSync(file) ? fs.readFileSync(file) : null,
  });
}

function restoreAll(backups) {
  for (const item of [...backups].reverse()) {
    if (!item.existed) {
      if (fs.existsSync(item.file)) fs.rmSync(item.file, { force: true, recursive: true });
    } else if (item.restoreFrom) {
      if (fs.existsSync(item.file)) fs.rmSync(item.file, { force: true, recursive: true });
      fs.mkdirSync(path.dirname(item.file), { recursive: true });
      fs.renameSync(item.restoreFrom, item.file);
    } else {
      fs.writeFileSync(item.file, item.data);
    }
  }
}

export function writeManaged(root, catalog, hostRoot, settings, { agentsExisting = null, parts = null, backups = null, warnings = null, install = false } = {}) {
  const written = [];
  const want = (name) => !parts || parts.includes(name);
  const agentsDir = path.join(hostRoot, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  const localDir = path.join(agentsDir, "local");
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir);
  const persisted = persistSettings(settings);
  if (want("settings")) {
    const settingsFile = settingsPath(hostRoot);
    if (backups) remember(backups, settingsFile);
    writeYamlAtomic(settingsFile, persisted);
    written.push(settingsFile);
  }
  if (want("entry")) {
    const entryFile = path.join(agentsDir, "AGS.md");
    if (backups) remember(backups, entryFile);
    writeAtomic(entryFile, renderHostEntry(root, catalog, persisted));
    written.push(entryFile);
  }
  if (want("agents")) {
    const agentsFile = path.join(hostRoot, "AGENTS.md");
    const prior = agentsExisting ?? (fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, "utf8") : null);
    if (backups) remember(backups, agentsFile);
    writeAtomic(agentsFile, upsertAgentsBlock(prior, agentsBlock(root)));
    written.push(agentsFile);
  }
  if (want("claude") && !(install && claudeModeOf(persisted.adapters?.claude) === "skip")) {
    applyClaudePlan(root, hostRoot, persisted, { backups, written, warnings });
  }
  return written;
}

function applyClaudePlan(root, hostRoot, settings, { backups, written, warnings }) {
  const claudeFile = path.join(hostRoot, "CLAUDE.md");
  const existing = fs.existsSync(claudeFile) ? fs.readFileSync(claudeFile, "utf8") : null;
  const plan = planClaudeWrite(existing, claudeModeOf(settings.adapters.claude), {
    block: claudeBlock(root),
    override: claudeOverrideText(root),
  });
  if (plan.warning && warnings) warnings.push(plan.warning);
  if (plan.action === "leave") return;
  if (backups) remember(backups, claudeFile);
  if (plan.action === "delete exact generated file") {
    fs.rmSync(claudeFile, { force: true });
    written.push(claudeFile);
    return;
  }
  if (plan.action === "quarantine") {
    quarantine(hostRoot, claudeFile, "ags-CLAUDE.md");
    writeAtomic(claudeFile, plan.text);
    written.push(claudeFile);
    return;
  }
  if (plan.text != null && plan.text !== existing) {
    writeAtomic(claudeFile, plan.text);
    written.push(claudeFile);
  }
}

export function installHost(root, route, options) {
  assertCanonicalAccess(root);
  const hostRoot = gitRoot(route);
  if (!samePath(gitRoot(hostRoot), hostRoot)) throw new AgsError(`Host path is not the Git root: ${hostRoot}`);
  const registry = loadRegistry(root);
  const wantedId = options.id || slug(path.basename(hostRoot));
  assertSlug(wantedId, "host id");
  const wantedName = options.name || path.basename(hostRoot);
  if (!wantedName || typeof wantedName !== "string") throw new AgsError("Host name is required");
  for (const host of registry.hosts) {
    if (host.id === wantedId && !samePath(host.path, hostRoot)) {
      throw new AgsError(`Host id ${wantedId} is already registered at ${host.path}`);
    }
    if (samePath(host.path, hostRoot) && host.id !== wantedId) {
      throw new AgsError(`Path is already registered as ${host.id}`);
    }
  }
  const hasSettings = fs.existsSync(settingsPath(hostRoot));
  const hasEntry = fs.existsSync(path.join(hostRoot, ".agents", "AGS.md"));
  if (hasSettings || hasEntry) {
    const registered = registry.hosts.some((host) => samePath(host.path, hostRoot));
    throw new AgsError(registered
      ? "Host is already installed. Use ags host update or ags host repair."
      : "Host integration exists but is not registered. Use ags host update, ags host repair, or adopt the canonical root.");
  }
  const catalog = loadCatalog(root);
  const evidence = detectEvidence(hostRoot);
  const selection = applySelection(catalog, evidence, {
    enable: options.enable,
    disable: options.disable,
  });
  const errors = selectionErrors(catalog, selection);
  if (errors.length) throw new AgsError(errors.join("\n"));
  includedSkillIds(catalog, selection.skills.enabled);
  const operational = normalizeOperational(options, hostRoot);
  const claude = resolveClaudeOption(options.claude, "skip");
  const settings = defaultSettings(root, wantedId, selection, claude, operational);
  const settingErrors = validateSettings(settings, root);
  if (settingErrors.length) throw new AgsError(settingErrors.join("\n"));
  const warnings = missingMaterialWarnings(root, catalog, settings, hostRoot);
  const plan = describeSelection(catalog, evidence, selection, claude);
  plan.proposal = proposeOperationalSettings(hostRoot);
  plan.warnings = warnings;
  if (!options.yes) return { applied: false, plan, hostRoot, warnings };
  const backups = [];
  const written = [];
  try {
    ensureHostTmpIgnored(hostRoot);
    written.push(...writeManaged(root, catalog, hostRoot, settings, { backups, warnings, install: true }));
    const next = {
      format: 1,
      hosts: registry.hosts.filter((host) => !samePath(host.path, hostRoot)),
    };
    next.hosts.push({ id: wantedId, name: wantedName, path: displayPath(hostRoot) });
    remember(backups, registryPath(root));
    saveRegistry(root, next);
    written.push(registryPath(root));
    const check = verifyRegistered(root, hostRoot);
    return { applied: true, plan, hostRoot, written, entry: check.entry, warnings };
  } catch (error) {
    restoreAll(backups);
    throw new AgsError(error.message, { written });
  }
}

export function adoptCanonicalRoot(root, hostRoot, catalog = loadCatalog(root)) {
  if (!fs.existsSync(hostRoot)) throw new AgsError(`Host path is unreachable: ${hostRoot}`);
  const repo = gitRoot(hostRoot);
  if (!samePath(repo, hostRoot)) throw new AgsError(`Host path is not the Git root: ${hostRoot}`);
  const registry = loadRegistry(root);
  const entry = registry.hosts.find((host) => samePath(host.path, repo));
  if (!entry) throw new AgsError(`Host is not registered: ${hostRoot}`);
  const settings = readSettings(hostRoot);
  if (settings.host !== entry.id) throw new AgsError(`Host id ${settings.host} does not match registry id ${entry.id}`);
  if (!settings?.canonicalRoot || samePath(settings.canonicalRoot, root)) return { changed: false, settings };
  const next = { ...settings, canonicalRoot: displayPath(root) };
  writeManaged(root, catalog, hostRoot, next);
  return { changed: true, from: settings.canonicalRoot, settings: next };
}

export function retargetHosts(root) {
  const catalog = loadCatalog(root);
  const updated = [];
  const failures = [];
  for (const entry of loadRegistry(root).hosts) {
    if (!fs.existsSync(entry.path)) {
      failures.push(`${entry.id}: unreachable`);
      continue;
    }
    try {
      const repo = gitRoot(entry.path);
      if (!samePath(repo, entry.path)) {
        failures.push(`${entry.id}: unreachable`);
        continue;
      }
      const result = adoptCanonicalRoot(root, entry.path, catalog);
      if (result.changed) updated.push(entry.id);
    } catch (error) {
      failures.push(`${entry.id}: ${error.message}`);
    }
  }
  return { updated, failures };
}

function openHost(root, hostRoot, { write = false } = {}) {
  const peeked = readSettings(hostRoot);
  const retarget = peeked?.canonicalRoot && !samePath(peeked.canonicalRoot, root)
    ? { from: peeked.canonicalRoot, to: displayPath(root) }
    : null;
  if (retarget && write) adoptCanonicalRoot(root, hostRoot);
  if (retarget && !write) {
    const registry = loadRegistry(root);
    const entry = registry.hosts.find((host) => samePath(host.path, hostRoot));
    if (!entry) throw new AgsError(`Host is not registered: ${hostRoot}`);
    if (!fs.existsSync(hostRoot) || !samePath(gitRoot(hostRoot), hostRoot)) {
      throw new AgsError(`Host path is unreachable: ${hostRoot}`);
    }
    if (peeked.host !== entry.id) throw new AgsError(`Host id ${peeked.host} does not match registry id ${entry.id}`);
    const settings = { ...peeked, canonicalRoot: retarget.to };
    const errors = validateSettings(settings, root);
    if (errors.length) throw new AgsError(errors.join("\n"));
    const catalog = loadCatalog(root);
    const selected = selectionErrors(catalog, settings);
    if (selected.length) throw new AgsError(selected.join("\n"));
    return { registry, entry, settings, retarget, catalog };
  }
  return { ...verifyRegistered(root, hostRoot), retarget: null };
}

function fillOperational(settings, options, hostRoot) {
  const next = { ...settings };
  if (options.mainBranch && !settings.git?.mainBranch) {
    if (!validBranchName(options.mainBranch)) throw new AgsError("git.mainBranch must be a branch name");
    next.git = { mainBranch: options.mainBranch };
  }
  if (options.checks) {
    const checks = { ...(settings.checks || {}) };
    for (const key of CHECK_KEYS) {
      if (options.checks[key] && !settings.checks?.[key]) checks[key] = assertCheckScript(hostRoot, key, options.checks[key]);
    }
    if (Object.keys(checks).length) next.checks = checks;
  }
  return next;
}

export function updateHost(root, route, options) {
  assertCanonicalAccess(root);
  const hostRoot = resolveRoute(route);
  const { entry, settings, retarget } = openHost(root, hostRoot, { write: Boolean(options.yes) });
  const catalog = loadCatalog(root);
  const evidence = detectEvidence(hostRoot);
  const selection = applySelection(catalog, evidence, {
    enable: options.enable,
    disable: options.disable,
    current: settings,
  });
  const errors = selectionErrors(catalog, selection);
  if (errors.length) throw new AgsError(errors.join("\n"));
  const migrated = migrateChecks(settings.checks, hostRoot);
  const review = reviewUpdate(catalog, evidence, settings, selection);
  const claude = options.claude == null ? claudeModeOf(settings.adapters.claude) : resolveClaudeOption(options.claude, null);
  review.claude = claude;
  review.proposal = proposeOperationalSettings(hostRoot);
  review.localExceptions = (settings.skills?.localExceptions || []).map((item) => item.id);
  const warnings = [
    ...missingMaterialWarnings(root, catalog, { ...settings, skills: selection.skills, rules: selection.rules }, hostRoot),
    ...migrated.warnings,
  ];
  if (review.localExceptions.length) warnings.push(`host-local exceptions: ${review.localExceptions.join(", ")}`);
  review.warnings = warnings;
  if (retarget) review.retarget = retarget;
  if (!options.yes) return { applied: false, review, hostRoot, warnings };
  const nextSkills = {
    ...selection.skills,
    ...(settings.skills?.localExceptions?.length ? { localExceptions: settings.skills.localExceptions } : {}),
  };
  const next = fillOperational({
    ...settings,
    canonicalRoot: displayPath(root),
    rules: selection.rules,
    skills: nextSkills,
    checks: migrated.checks,
    adapters: { claude },
  }, options, hostRoot);
  const settingErrors = validateSettings(next, root);
  if (settingErrors.length) throw new AgsError(settingErrors.join("\n"));
  const backups = [];
  try {
    const written = writeManaged(root, catalog, hostRoot, next, { backups, warnings });
    verifyRegistered(root, hostRoot);
    return { applied: true, review, hostRoot, written, entry, warnings };
  } catch (error) {
    restoreAll(backups);
    throw error;
  }
}

export function reviewUpdate(catalog, evidence, current, next) {
  const offered = new Set(offeredEntries(catalog, evidence).map((entry) => entry.id));
  const currentIds = new Set([...current.rules.enabled, ...current.skills.enabled, ...current.rules.disabled, ...current.skills.disabled]);
  const newlyEligible = [...offered].filter((id) => !currentIds.has(id));
  const stale = [...current.rules.enabled, ...current.skills.enabled].filter((id) => {
    const entry = catalogById(catalog).get(id);
    return entry?.when && !whenMatches(entry.when, evidence);
  });
  const offeredItems = offeredEntries(catalog, evidence);
  const ids = (pred) => offeredItems.filter(pred).map((entry) => entry.id);
  return {
    enabled: [...next.rules.enabled, ...next.skills.enabled],
    disabled: [...next.rules.disabled, ...next.skills.disabled],
    newlyEligible,
    stale,
    optOuts: [...current.rules.disabled, ...current.skills.disabled],
    offeredRules: ids((entry) => entryGroup(catalog, entry.id) === "rules"),
    offeredCustom: ids((entry) => entry.kind === "custom"),
    offeredThirdParty: ids((entry) => entry.kind === "third-party"),
    enabledRules: next.rules.enabled,
    enabledCustom: next.skills.enabled.filter((id) => catalogById(catalog).get(id)?.kind === "custom"),
    enabledThirdParty: next.skills.enabled.filter((id) => catalogById(catalog).get(id)?.kind === "third-party"),
  };
}

function describeSelection(catalog, evidence, selection, claude) {
  const offered = offeredEntries(catalog, evidence);
  const ids = (pred) => offered.filter(pred).map((entry) => entry.id);
  const plan = {
    rules: selection.rules,
    skills: selection.skills,
    claude: claudeModeOf(claude) || "skip",
    offered: offered.map((entry) => entry.id),
    offeredRules: ids((entry) => entryGroup(catalog, entry.id) === "rules"),
    offeredCustom: ids((entry) => entry.kind === "custom"),
    offeredThirdParty: ids((entry) => entry.kind === "third-party"),
    enabledRules: selection.rules.enabled,
    enabledCustom: selection.skills.enabled.filter((id) => catalogById(catalog).get(id)?.kind === "custom"),
    enabledThirdParty: selection.skills.enabled.filter((id) => catalogById(catalog).get(id)?.kind === "third-party"),
  };
  const ui = offered.find((entry) => entry.id === "ui-library-css");
  if (ui) plan.recommended = `${ui.id} includes ${(ui.includes || []).join(" and ")}`;
  return plan;
}

export function listHosts(root) {
  return loadRegistry(root).hosts;
}

export function unregisterHost(root, { route, host, yes }) {
  const registry = loadRegistry(root);
  let entry;
  if (host) entry = registry.hosts.find((item) => item.id === host);
  else entry = registry.hosts.find((item) => samePath(item.path, resolveRoute(route)));
  if (!entry) throw new AgsError("Host is not registered");
  if (fs.existsSync(entry.path)) {
    try {
      const repo = gitRoot(entry.path);
      if (!samePath(repo, entry.path)) throw new AgsError(`Host path is unreachable: ${entry.path}`);
      const settings = readSettings(entry.path);
      if (settings.host !== entry.id) throw new AgsError(`Refusing to unregister mismatched host id ${settings.host}`);
    } catch (error) {
      if (fs.existsSync(settingsPath(entry.path))) throw error;
    }
  }
  if (!yes) return { applied: false, entry };
  saveRegistry(root, { format: 1, hosts: registry.hosts.filter((item) => item.id !== entry.id) });
  return { applied: true, entry };
}

export function syncOne(root, hostRoot) {
  const registry = loadRegistry(root);
  const entry = registry.hosts.find((host) => samePath(host.path, hostRoot));
  if (!entry) return { id: null, path: hostRoot, status: "unreachable", issues: ["not registered"] };
  if (!fs.existsSync(hostRoot)) return { id: entry.id, path: hostRoot, status: "unreachable", issues: ["path missing"] };
  try {
    const repo = gitRoot(hostRoot);
    if (!samePath(repo, hostRoot)) return { id: entry.id, path: hostRoot, status: "unreachable", issues: ["path is not the Git root"] };
  } catch (error) {
    return { id: entry.id, path: hostRoot, status: "unreachable", issues: [error.message] };
  }
  if (!fs.existsSync(settingsPath(hostRoot))) {
    return {
      id: entry.id,
      path: hostRoot,
      status: "repairable",
      issues: ["missing .agents/ags.yaml"],
      warnings: [],
      repairs: ["ags host repair --route <host> --restore-required"],
    };
  }
  let settings;
  try {
    settings = readSettings(hostRoot);
  } catch (error) {
    return {
      id: entry.id,
      path: hostRoot,
      status: "repairable",
      issues: [`malformed settings: ${error.message}`],
      warnings: [],
      repairs: ["ags host repair --route <host> --overwrite-managed"],
    };
  }
  if (settings.host !== entry.id) {
    return { id: entry.id, path: hostRoot, status: "collision", issues: [`settings host ${settings.host} != registry ${entry.id}`] };
  }
  const issues = [];
  const warnings = [];
  issues.push(...validateSettings(settings, root));
  let catalog;
  try {
    catalog = loadCatalog(root);
  } catch (error) {
    issues.push(error.message);
    return { id: entry.id, path: hostRoot, status: "repairable", issues, warnings };
  }
  if (settings.rules && settings.skills) issues.push(...selectionErrors(catalog, settings));
  const evidence = detectEvidence(hostRoot);
  const enabledIds = [
    ...(Array.isArray(settings.rules?.enabled) ? settings.rules.enabled : []),
    ...(Array.isArray(settings.skills?.enabled) ? settings.skills.enabled : []),
  ];
  for (const id of enabledIds) {
    const item = catalogById(catalog).get(id);
    if (!item) continue;
    const abs = path.join(root, ...item.path.split("/"));
    if (!fs.existsSync(abs)) warnings.push(`missing selected material: ${item.path}`);
    if (item.when && !whenMatches(item.when, evidence)) warnings.push(`${id} condition no longer matches`);
  }
  if (Array.isArray(settings.rules?.enabled) && Array.isArray(settings.skills?.enabled)) {
    for (const item of [...catalog.rules, ...catalog.skills]) {
      const group = entryGroup(catalog, item.id);
      const listed = settings[group].enabled.includes(item.id) || settings[group].disabled.includes(item.id);
      if (!listed && isEntryPoint(item) && item.when && whenMatches(item.when, evidence)) warnings.push(`${item.id} is newly eligible`);
    }
    try {
      for (const id of includedSkillIds(catalog, settings.skills.enabled)) {
        const item = catalogById(catalog).get(id);
        if (!item) continue;
        const abs = path.join(root, ...item.path.split("/"));
        if (!fs.existsSync(abs)) warnings.push(`missing included skill: ${item.path}`);
      }
    } catch (error) {
      issues.push(error.message);
    }
  }
  for (const item of settings.skills?.localExceptions || []) {
    warnings.push(`host-local exception: ${item.id}`);
    const abs = path.join(hostRoot, ...String(item.path).split("/"));
    if (!fs.existsSync(abs)) warnings.push(`missing host-local exception: ${item.path}`);
  }
  const entryFile = path.join(hostRoot, ".agents", "AGS.md");
  if (!fs.existsSync(entryFile)) issues.push("missing .agents/AGS.md");
  else if (settings.rules && settings.skills && fs.readFileSync(entryFile, "utf8") !== renderHostEntry(root, catalog, settings)) {
    issues.push("managed entry differs");
  }
  const agentsFile = path.join(hostRoot, "AGENTS.md");
  if (!fs.existsSync(agentsFile)) issues.push("missing AGENTS.md");
  else if (!blockIntact(fs.readFileSync(agentsFile, "utf8"), agentsBlock(root))) issues.push("AGENTS.md block differs");
  const claudeFile = path.join(hostRoot, "CLAUDE.md");
  const claudeText = fs.existsSync(claudeFile) ? fs.readFileSync(claudeFile, "utf8") : null;
  const claudeState = classifyClaude(claudeText, {
    mode: settings.adapters?.claude,
    block: claudeBlock(root),
    override: claudeOverrideText(root),
  });
  if (claudeState.issue) issues.push(claudeState.issue);
  if (claudeState.warning) warnings.push(claudeState.warning);
  if (!fs.existsSync(path.join(hostRoot, ".agents", "local"))) issues.push("missing .agents/local");
  const agentsDir = path.join(hostRoot, ".agents");
  if (fs.existsSync(agentsDir)) {
    const approved = new Set((settings.skills?.localExceptions || []).map((item) => item.id));
    for (const name of fs.readdirSync(agentsDir)) {
      if (MANAGED_NAMES.has(name)) continue;
      if (name === "skills") {
        const skillsDir = path.join(agentsDir, "skills");
        if (!fs.existsSync(skillsDir)) continue;
        for (const child of fs.readdirSync(skillsDir)) {
          if (!approved.has(child)) issues.push(`host-local skill copy under .agents/skills/${child}`);
        }
        continue;
      }
      issues.push(`unexpected managed path: .agents/${name}`);
    }
  }
  let status = "clean";
  if (issues.length) status = "repairable";
  else if (warnings.length) status = "warning";
  return { id: entry.id, path: hostRoot, status, issues: unique(issues), warnings: unique(warnings), repairs: repairHints(issues), claude: claudeState.state };
}

function repairHints(issues) {
  const hints = [];
  if (issues.some((issue) => issue.includes("host-local skill"))) hints.push("ags skills reconcile --route <host>");
  if (issues.some((issue) => issue.startsWith("missing "))) hints.push("ags host repair --route <host> --restore-required");
  if (issues.some((issue) => issue.includes("differs") || issue.includes("pointer") || issue.includes("malformed"))) {
    hints.push("ags host repair --route <host> --overwrite-managed");
  }
  if (issues.some((issue) => issue.startsWith("unexpected managed path"))) hints.push("ags host repair --route <host> --remove-invalid");
  if (issues.some((issue) => issue.startsWith("unknown ") || issue.includes("both enabled") || issue.includes("must be"))) {
    hints.push("ags host repair --route <host> --setting <key>");
  }
  return hints;
}

function unique(values) {
  return [...new Set(values)];
}

export function syncHosts(root, { route, all }) {
  const registry = loadRegistry(root);
  if (all) return registry.hosts.map((host) => syncOne(root, host.path));
  try {
    return [syncOne(root, resolveRoute(route))];
  } catch (error) {
    return [{ id: null, path: route, status: "unreachable", issues: [error.message] }];
  }
}

export function repairHost(root, route, options) {
  const modes = ["setting", "removeInvalid", "restoreRequired", "overwriteManaged", "resetManaged"].filter((key) => options[key]);
  if (modes.length !== 1) throw new AgsError("Choose exactly one repair mode");
  const target = resolveRepairTarget(root, route);
  const catalog = loadCatalog(root);
  const targets = planRepair(root, catalog, target, options);
  const warnings = targets.filter((item) => item.warning).map((item) => item.warning);
  if (!options.yes) return { applied: false, targets, hostRoot: target.hostRoot, issues: target.settingsError ? [target.settingsError] : [], warnings };
  let settingNext = null;
  if (options.setting) {
    if (!target.settings) throw new AgsError(target.settingsError || "Settings are missing");
    settingNext = applySetting(catalog, target.settings, options.setting, options.value, target.hostRoot);
  }
  let overwriteNext = null;
  if (options.overwriteManaged || options.resetManaged) {
    overwriteNext = repairedSettings(root, catalog, target.hostRoot, target.entry, target.settings);
    const errors = [...validateSettings(overwriteNext, root), ...selectionErrors(catalog, overwriteNext)];
    if (errors.length) throw new AgsError(errors.join("\n"));
  }
  const backups = [];
  const quarantined = [];
  const written = [];
  try {
    if (options.removeInvalid || options.resetManaged) {
      for (const item of targets.filter((entry) => entry.action === "quarantine")) {
        if (!fs.existsSync(item.path)) continue;
        const dest = quarantine(target.hostRoot, item.path, item.backupName);
        backups.push({ file: item.path, existed: true, restoreFrom: dest });
        quarantined.push(dest);
      }
    }
    if (options.removeInvalid) {
      for (const item of targets) {
        if (item.action !== "remove block" && item.action !== "delete exact generated file") continue;
        remember(backups, item.path);
        if (item.text == null) {
          if (fs.existsSync(item.path)) fs.rmSync(item.path, { force: true });
        } else writeAtomic(item.path, item.text);
        written.push(item.path);
      }
    }
    let remaining = [];
    if (options.setting) {
      const parts = dependentParts(options.setting).filter((part) => part !== "entry" || selectionErrors(catalog, settingNext).length === 0);
      written.push(...writeManaged(root, catalog, target.hostRoot, settingNext, { parts, backups, warnings }));
      if (options.inject === "midway") throw new AgsError("injected failure");
      const saved = readSettings(target.hostRoot);
      remaining = [...new Set([...validateSettings(saved, root), ...selectionErrors(catalog, saved)])];
    }
    if (options.restoreRequired) {
      written.push(...restoreRequired(root, catalog, target, backups));
      if (options.inject === "midway") throw new AgsError("injected failure");
    }
    if (options.overwriteManaged || options.resetManaged) {
      if (options.inject === "midway") {
        written.push(...writeManaged(root, catalog, target.hostRoot, overwriteNext, { parts: ["settings"], backups, warnings }));
        throw new AgsError("injected failure");
      }
      written.push(...writeManaged(root, catalog, target.hostRoot, overwriteNext, { backups, warnings }));
    }
    return { applied: true, targets, quarantined, written, hostRoot: target.hostRoot, warnings, remaining };
  } catch (error) {
    try {
      restoreAll(backups);
    } catch (restoreError) {
      throw new AgsError(`${error.message}; restore failed: ${restoreError.message}`);
    }
    if (error instanceof AgsError) throw error;
    throw new AgsError(error.message);
  }
}

function dependentParts(key) {
  if (key === "reporting") return ["settings"];
  if (key === "adapters.claude") return ["settings", "claude"];
  return ["settings", "entry"];
}

function usableSettings(root, catalog, target) {
  const file = settingsPath(target.hostRoot);
  if (!fs.existsSync(file)) return repairedSettings(root, catalog, target.hostRoot, target.entry, null);
  if (target.settings && validateSettings(target.settings, root).length === 0 && selectionErrors(catalog, target.settings).length === 0) {
    return persistSettings(target.settings);
  }
  return null;
}

function restoreRequired(root, catalog, target, backups = null) {
  const written = [];
  const { hostRoot, entry } = target;
  const missingSettings = !fs.existsSync(settingsPath(hostRoot));
  const usable = usableSettings(root, catalog, target);
  if (missingSettings && usable) {
    written.push(...writeManaged(root, catalog, hostRoot, usable, { parts: ["settings"], backups }));
  }
  if (!fs.existsSync(path.join(hostRoot, ".agents", "AGS.md")) && usable) {
    written.push(...writeManaged(root, catalog, hostRoot, usable, { parts: ["entry"], backups }));
  }
  if (!fs.existsSync(path.join(hostRoot, "AGENTS.md"))) {
    const agentsSettings = usable || repairedSettings(root, catalog, hostRoot, entry, target.settings);
    written.push(...writeManaged(root, catalog, hostRoot, agentsSettings, { parts: ["agents"], backups }));
  }
  if (!fs.existsSync(path.join(hostRoot, ".agents", "local"))) fs.mkdirSync(path.join(hostRoot, ".agents", "local"), { recursive: true });
  const mode = claudeModeOf(usable?.adapters?.claude);
  if (usable && (mode === "block" || mode === "override") && !fs.existsSync(path.join(hostRoot, "CLAUDE.md"))) {
    written.push(...writeManaged(root, catalog, hostRoot, usable, { parts: ["claude"], backups }));
  }
  return written;
}

function repairedSettings(root, catalog, hostRoot, entry, settings) {
  const evidence = detectEvidence(hostRoot);
  const base = settings && typeof settings === "object" ? structuredClone(settings) : defaultSettings(root, entry.id, applySelection(catalog, evidence), "skip");
  const keptExceptions = Array.isArray(base.skills?.localExceptions) ? base.skills.localExceptions : [];
  base.format = 1;
  base.host = entry.id;
  base.canonicalRoot = displayPath(root);
  if (typeof base.reporting !== "boolean") base.reporting = true;
  base.adapters = { claude: claudeModeOf(base.adapters?.claude) || "skip" };
  for (const group of ["rules", "skills"]) {
    const enabled = Array.isArray(base[group]?.enabled) ? base[group].enabled : [];
    const disabled = Array.isArray(base[group]?.disabled) ? base[group].disabled : [];
    const keep = (id) => {
      const item = catalogById(catalog).get(id);
      return item && entryGroup(catalog, id) === group && (group !== "skills" || isEntryPoint(item));
    };
    base[group] = {
      enabled: enabled.filter(keep),
      disabled: disabled.filter((id) => keep(id) && !enabled.filter(keep).includes(id)),
    };
  }
  if (keptExceptions.length) base.skills.localExceptions = keptExceptions;
  if (base.git != null) {
    if (!base.git.mainBranch || !validBranchName(base.git.mainBranch)) delete base.git;
    else base.git = { mainBranch: base.git.mainBranch };
  }
  if (base.checks != null) {
    const checks = {};
    for (const key of CHECK_KEYS) {
      const value = base.checks[key];
      if (isPackageScriptKey(value)) checks[key] = value;
    }
    if (Object.keys(checks).length) base.checks = checks;
    else delete base.checks;
  }
  return base;
}

function selectionFieldErrors(catalog, group, ids, other) {
  const errors = [];
  for (const id of ids) {
    const entry = catalogById(catalog).get(id);
    if (!entry || entryGroup(catalog, id) !== group) errors.push(`unknown ${group} id: ${id}`);
    else if (group === "skills" && !isEntryPoint(entry)) errors.push(`${id} is not a direct selection`);
    if (Array.isArray(other) && other.includes(id)) errors.push(`${id} is both enabled and disabled`);
  }
  return errors;
}

function applySetting(catalog, settings, key, value, hostRoot) {
  const next = structuredClone(settings);
  if (key === "reporting") {
    if (value !== "true" && value !== "false" && value !== true && value !== false) {
      throw new AgsError("settings reporting must be boolean");
    }
    next.reporting = value === "true" || value === true;
  } else if (key === "adapters.claude") {
    const mode = claudeModeOf(value);
    if (!mode || value === true || value === false) throw new AgsError("settings adapters.claude must be skip, block, or override");
    if (!next.adapters || typeof next.adapters !== "object" || Array.isArray(next.adapters)) next.adapters = {};
    next.adapters.claude = mode;
  }
  else if (/^(rules|skills)\.(enabled|disabled)$/.test(key)) {
    const [group, list] = key.split(".");
    const ids = String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    if (next[group] == null) next[group] = { enabled: [], disabled: [] };
    else if (typeof next[group] !== "object" || Array.isArray(next[group])) {
      throw new AgsError(`settings ${group} selections are invalid`);
    }
    const otherName = list === "enabled" ? "disabled" : "enabled";
    const fieldErrors = selectionFieldErrors(catalog, group, ids, next[group][otherName]);
    if (fieldErrors.length) throw new AgsError(fieldErrors.join("\n"));
    next[group][list] = ids;
  } else if (key === "git.mainBranch") {
    if (!validBranchName(value)) throw new AgsError("git.mainBranch must be a branch name");
    next.git = { ...(next.git || {}), mainBranch: value };
  } else if (CHECK_KEYS.some((name) => key === `checks.${name}`)) {
    const name = key.slice("checks.".length);
    if (!isPackageScriptKey(value)) throw new AgsError(`checks.${name} must be a package script name`);
    const scripts = readPackageScripts(hostRoot);
    if (!Object.hasOwn(scripts, value)) throw new AgsError(`checks.${name} script is not in package.json: ${value}`);
    if (!next.checks || typeof next.checks !== "object" || Array.isArray(next.checks)) next.checks = {};
    next.checks[name] = value;
  } else throw new AgsError(`Unsupported setting: ${key}`);
  return next;
}

function planRepair(root, catalog, target, options) {
  const { hostRoot, settings } = target;
  const targets = [];
  const claudeFile = path.join(hostRoot, "CLAUDE.md");
  const agentsFile = path.join(hostRoot, "AGENTS.md");
  const entryFile = path.join(hostRoot, ".agents", "AGS.md");
  const usable = usableSettings(root, catalog, target);
  const mode = claudeModeOf(usable?.adapters?.claude || settings?.adapters?.claude);
  if (target.settingsError) targets.push({ action: "note", path: settingsPath(hostRoot), detail: target.settingsError });
  if (options.setting) targets.push({ action: "set", path: settingsPath(hostRoot), detail: `${options.setting}=${options.value}` });
  if (options.overwriteManaged || options.resetManaged) {
    targets.push({ action: "write", path: entryFile });
    targets.push({ action: "write", path: agentsFile });
    targets.push({ action: "write", path: settingsPath(hostRoot) });
    if (mode === "block") targets.push({ action: "insert block", path: claudeFile });
    if (mode === "override") targets.push({ action: "replace file", path: claudeFile });
  }
  if (options.restoreRequired) {
    if (!fs.existsSync(settingsPath(hostRoot))) targets.push({ action: "write", path: settingsPath(hostRoot) });
    if (!fs.existsSync(entryFile) && usable) targets.push({ action: "write", path: entryFile });
    if (!fs.existsSync(agentsFile)) targets.push({ action: "write", path: agentsFile });
    if (!fs.existsSync(path.join(hostRoot, ".agents", "local"))) {
      targets.push({ action: "mkdir", path: path.join(hostRoot, ".agents", "local") });
    }
    if (usable && (mode === "block" || mode === "override") && !fs.existsSync(claudeFile)) {
      targets.push({ action: mode === "override" ? "replace file" : "insert block", path: claudeFile });
    }
  }
  if (options.removeInvalid || options.resetManaged) {
    if (options.removeInvalid && target.settingsError && String(target.settingsError).includes("malformed") && fs.existsSync(settingsPath(hostRoot))) {
      targets.push({ action: "quarantine", path: settingsPath(hostRoot) });
    }
    if (options.removeInvalid && usable && fs.existsSync(entryFile)) {
      const expected = renderHostEntry(root, catalog, usable);
      if (fs.readFileSync(entryFile, "utf8") !== expected) {
        targets.push({ action: "quarantine", path: entryFile });
      }
    }
    const agentsDir = path.join(hostRoot, ".agents");
    if (fs.existsSync(agentsDir)) {
      for (const name of fs.readdirSync(agentsDir)) {
        if (!MANAGED_NAMES.has(name) && name !== "skills") {
          targets.push({ action: "quarantine", path: path.join(agentsDir, name) });
        }
      }
    }
    if (options.removeInvalid) {
      if (fs.existsSync(agentsFile)) {
        const removal = planAgentsBlockRemoval(fs.readFileSync(agentsFile, "utf8"), agentsBlock(root));
        if (removal.action !== "leave" || removal.warning) {
          targets.push({ action: removal.action, path: agentsFile, text: removal.text, warning: removal.warning });
        }
      }
      if (fs.existsSync(claudeFile) && mode) {
        const removal = planClaudeRemoval(fs.readFileSync(claudeFile, "utf8"), mode, {
          block: claudeBlock(root),
          override: claudeOverrideText(root),
        });
        if (removal.action === "quarantine") {
          targets.push({ action: "quarantine", path: claudeFile, backupName: "ags-CLAUDE.md", warning: removal.warning });
        } else if (removal.action !== "leave" || removal.warning) {
          targets.push({ action: removal.action, path: claudeFile, text: removal.text, warning: removal.warning });
        }
      }
    }
  }
  if (options.resetManaged || options.restoreRequired || options.removeInvalid || options.overwriteManaged) {
    targets.push({ action: "preserve", path: path.join(hostRoot, ".agents", "local") });
  }
  return targets;
}

export function selectedSkillDirs(root, catalog, settings) {
  const ids = [];
  const seen = new Set();
  for (const id of [...settings.skills.enabled, ...includedSkillIds(catalog, settings.skills.enabled)]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.map((id) => {
    const entry = catalogById(catalog).get(id);
    return { id, dir: path.dirname(skillAbs(root, entry)), entry };
  });
}
