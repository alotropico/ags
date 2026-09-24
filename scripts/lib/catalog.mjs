import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assertCheckScript, proposeCheckScripts } from "./packages.mjs";
import { AgsError, readYaml, slugError, writeYamlAtomic } from "./util.mjs";

const RULE_FIELDS = new Set(["id", "path", "description", "default", "keywords", "when"]);
const SKILL_FIELDS = new Set(["id", "kind", "path", "description", "default", "keywords", "when", "source", "entryPoint", "includes"]);
const LOCK_FILES = new Set(["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml"]);
const CHECK_KEYS = ["type", "lint", "prettier"];

export function loadCatalog(root) {
  const file = path.join(root, "catalog.yaml");
  if (!fs.existsSync(file)) throw new AgsError(`Missing catalog: ${file}`);
  const catalog = readYaml(file);
  const errors = validateCatalog(catalog);
  if (errors.length) throw new AgsError(errors.join("\n"));
  return catalog;
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || catalog.format !== 1) errors.push("catalog format must be 1");
  for (const forbidden of ["conflictsWith", "overlapsWith"]) {
    if (catalog && Object.hasOwn(catalog, forbidden)) errors.push(`catalog must not contain ${forbidden}`);
  }
  if (!Array.isArray(catalog?.rules)) errors.push("rules must be an array");
  if (!Array.isArray(catalog?.skills)) errors.push("skills must be an array");
  const rules = Array.isArray(catalog?.rules) ? catalog.rules : [];
  const skills = Array.isArray(catalog?.skills) ? catalog.skills : [];
  const ids = new Set();
  for (const entry of rules) collectEntryErrors(entry, "rules", errors, ids);
  for (const entry of skills) collectEntryErrors(entry, "skills", errors, ids);
  validateIncludes(skills, errors);
  return errors;
}

function collectEntryErrors(entry, group, errors, ids) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push(`${group} entry must be an object`);
    return;
  }
  const allowed = group === "skills" ? SKILL_FIELDS : RULE_FIELDS;
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) errors.push(`${group}.${entry.id || "?"} field not allowed: ${key}`);
  }
  const idError = slugError(entry.id, `${group} id`);
  if (idError) errors.push(idError);
  if (entry.id && ids.has(entry.id)) errors.push(`duplicate catalog id: ${entry.id}`);
  if (entry.id && !idError) ids.add(entry.id);
  if (typeof entry.path !== "string") errors.push(`${entry.id || group} missing path`);
  if (typeof entry.description !== "string" || !entry.description.trim()) {
    errors.push(`${entry.id || group} missing description`);
  }
  if (typeof entry.default !== "boolean") errors.push(`${entry.id || group} missing default`);
  if (!Array.isArray(entry.keywords) || entry.keywords.length === 0 || entry.keywords.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${entry.id || group} missing keywords`);
  }
  if (group === "skills" && entry.kind !== "custom" && entry.kind !== "third-party") {
    errors.push(`${entry.id || "skill"} kind must be custom or third-party`);
  }
  if (group === "rules" && entry.kind) errors.push(`${entry.id} rules must not set kind`);
  if (group === "skills" && entry.entryPoint != null && typeof entry.entryPoint !== "boolean") {
    errors.push(`${entry.id || group} entryPoint must be boolean`);
  }
  if (group === "rules" && (entry.entryPoint != null || entry.includes != null)) {
    errors.push(`${entry.id || group} rules must not set entryPoint or includes`);
  }
  if (entry.id && typeof entry.path === "string") {
    const expected = group === "skills" ? `skills/${entry.id}/SKILL.md` : `rules/${entry.id}.md`;
    if (entry.path !== expected) errors.push(`${entry.id} path must be ${expected}`);
  }
  if (group === "skills" && entry.kind === "third-party") errors.push(...sourceErrors(entry));
  if (group === "skills" && entry.kind === "custom" && entry.source) errors.push(`${entry.id} custom skills must not set source`);
  if (entry.when) errors.push(...validateWhen(entry.when, entry.id));
}

function sourceErrors(entry) {
  const errors = [];
  const source = entry.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    errors.push(`${entry.id} third-party source is required`);
    return errors;
  }
  if (typeof source.locator !== "string" || !source.locator.trim()) errors.push(`${entry.id} source.locator is required`);
  if (typeof source.installMethod !== "string" || !source.installMethod.trim()) errors.push(`${entry.id} source.installMethod is required`);
  for (const key of Object.keys(source)) {
    if (key !== "locator" && key !== "installMethod") errors.push(`${entry.id} source field not allowed: ${key}`);
  }
  return errors;
}

function validateIncludes(skills, errors) {
  const ids = new Set(skills.map((entry) => entry?.id).filter((id) => typeof id === "string"));
  const byId = new Map(skills.filter((entry) => entry?.id).map((entry) => [entry.id, entry]));
  for (const entry of skills) {
    if (entry?.includes == null) continue;
    if (!Array.isArray(entry.includes)) {
      errors.push(`${entry.id || "skill"} includes must be an array`);
      continue;
    }
    const seen = new Set();
    for (const id of entry.includes) {
      const problem = slugError(id, `${entry.id || "skill"} include`);
      if (problem) {
        errors.push(problem);
        continue;
      }
      if (id === entry.id) errors.push(`${entry.id} includes itself`);
      else if (seen.has(id)) errors.push(`${entry.id} duplicate include: ${id}`);
      else if (!ids.has(id)) errors.push(`${entry.id} includes unknown id: ${id}`);
      seen.add(id);
    }
  }
  const state = new Map();
  const visit = (id, stack) => {
    const mark = state.get(id);
    if (mark === "visiting") {
      errors.push(`include cycle: ${[...stack, id].join(" -> ")}`);
      return;
    }
    if (mark === "done") return;
    state.set(id, "visiting");
    const children = Array.isArray(byId.get(id)?.includes) ? byId.get(id).includes : [];
    for (const child of children) {
      if (typeof child === "string" && byId.has(child)) visit(child, [...stack, id]);
    }
    state.set(id, "done");
  };
  for (const entry of skills) {
    if (typeof entry?.id === "string" && byId.has(entry.id)) visit(entry.id, []);
  }
}

function validateWhen(when, id) {
  const errors = [];
  if (!when.any || !Array.isArray(when.any) || when.any.length === 0) {
    errors.push(`${id} when must be a non-empty any list`);
    return errors;
  }
  for (const clause of when.any) {
    if (!clause || typeof clause !== "object" || Array.isArray(clause)) {
      errors.push(`${id} when clause must be package, lockFile, or repoName`);
      continue;
    }
    const keys = Object.keys(clause);
    if (keys.length !== 1 || !["package", "lockFile", "repoName"].includes(keys[0])) {
      errors.push(`${id} when clause must be package, lockFile, or repoName`);
      continue;
    }
    if (typeof clause[keys[0]] !== "string" || !clause[keys[0]]) {
      errors.push(`${id} when ${keys[0]} must be a non-empty string`);
    }
    if (keys[0] === "lockFile" && !LOCK_FILES.has(clause.lockFile)) {
      errors.push(`${id} lockFile is not a supported lock filename`);
    }
    if (String(clause[keys[0]]).includes("<")) errors.push(`${id} when contains an unresolved placeholder`);
  }
  return errors;
}

export function isEntryPoint(entry) {
  return entry?.entryPoint !== false;
}

export function catalogById(catalog) {
  const map = new Map();
  for (const entry of [...catalog.rules, ...catalog.skills]) map.set(entry.id, entry);
  return map;
}

export function entryGroup(catalog, id) {
  if (catalog.rules.some((entry) => entry.id === id)) return "rules";
  if (catalog.skills.some((entry) => entry.id === id)) return "skills";
  return null;
}

export function includedSkillIds(catalog, rootIds) {
  const out = [];
  const seen = new Set();
  const walk = (id, stack) => {
    const entry = catalogById(catalog).get(id);
    for (const child of entry?.includes || []) {
      if (stack.includes(child)) throw new AgsError(`include cycle: ${[...stack, child].join(" -> ")}`);
      if (seen.has(child)) continue;
      seen.add(child);
      out.push(child);
      walk(child, [...stack, child]);
    }
  };
  for (const id of rootIds) walk(id, [id]);
  return out;
}

export function detectEvidence(hostRoot) {
  const packages = new Set();
  const packagePath = path.join(hostRoot, "package.json");
  let packageJson = false;
  if (fs.existsSync(packagePath)) {
    packageJson = true;
    try {
      const json = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        for (const name of Object.keys(json[field] || {})) packages.add(name);
      }
    } catch {
      packageJson = false;
    }
  }
  const locks = new Set([...LOCK_FILES].filter((name) => fs.existsSync(path.join(hostRoot, name))));
  return {
    packages,
    locks,
    repoName: path.basename(hostRoot).toLowerCase(),
    packageJson,
  };
}

export function whenMatches(when, evidence) {
  if (!when) return true;
  return when.any.some((clause) => {
    if (clause.package) return evidence.packages.has(clause.package);
    if (clause.lockFile) return evidence.locks.has(clause.lockFile);
    if (clause.repoName) return evidence.repoName === clause.repoName.toLowerCase();
    return false;
  });
}

export function eligibleEntries(catalog, evidence) {
  return [...catalog.rules, ...catalog.skills].filter((entry) => whenMatches(entry.when, evidence));
}

export function offeredEntries(catalog, evidence) {
  return eligibleEntries(catalog, evidence).filter((entry) => entryGroup(catalog, entry.id) !== "skills" || isEntryPoint(entry));
}

export function selectionErrors(catalog, settings) {
  const errors = [];
  const known = catalogById(catalog);
  for (const group of ["rules", "skills"]) {
    if (!Array.isArray(settings?.[group]?.enabled) || !Array.isArray(settings?.[group]?.disabled)) {
      errors.push(`settings ${group} selections are invalid`);
      continue;
    }
    const enabled = new Set(settings[group].enabled);
    const disabled = new Set(settings[group].disabled);
    for (const id of enabled) {
      if (disabled.has(id)) errors.push(`${id} is both enabled and disabled`);
      const entry = known.get(id);
      if (!entry || entryGroup(catalog, id) !== group) errors.push(`unknown ${group} id: ${id}`);
      else if (group === "skills" && !isEntryPoint(entry)) errors.push(`${id} is not a direct selection`);
    }
    for (const id of disabled) {
      const entry = known.get(id);
      if (!entry || entryGroup(catalog, id) !== group) errors.push(`unknown ${group} id: ${id}`);
      else if (group === "skills" && !isEntryPoint(entry)) errors.push(`${id} is not a direct selection`);
    }
  }
  if (errors.length === 0) {
    try {
      includedSkillIds(catalog, settings.skills.enabled);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return errors;
}

export function parseSelectionReply(line, offered, proposed) {
  const text = String(line ?? "").trim();
  if (!text) return { acceptDefaults: true, enable: [], disable: [] };
  if (text.toLowerCase() === "none") return { acceptDefaults: false, enable: [], disable: [...proposed] };
  const wanted = text.split(",").map((item) => item.trim()).filter(Boolean);
  const unknown = wanted.filter((id) => !offered.includes(id));
  if (unknown.length) {
    return { error: `Unknown ids: ${unknown.join(", ")}`, unknown, offered: [...offered] };
  }
  return {
    acceptDefaults: false,
    enable: wanted,
    disable: proposed.filter((id) => !wanted.includes(id)),
  };
}

export function applySelection(catalog, evidence, { enable = [], disable = [], current = null } = {}) {
  const offered = new Set(offeredEntries(catalog, evidence).map((entry) => entry.id));
  for (const id of enable) {
    if (!offered.has(id)) throw new AgsError(`Not offered in this category: ${id}`);
  }
  const enabled = { rules: new Set(), skills: new Set() };
  const disabled = { rules: new Set(), skills: new Set() };
  if (current) {
    for (const group of ["rules", "skills"]) {
      for (const id of current[group].enabled) enabled[group].add(id);
      for (const id of current[group].disabled) disabled[group].add(id);
    }
  } else {
    for (const entry of [...catalog.rules, ...catalog.skills]) {
      if (entry.default && offered.has(entry.id) && (entryGroup(catalog, entry.id) !== "skills" || isEntryPoint(entry))) {
        const group = entryGroup(catalog, entry.id);
        enabled[group].add(entry.id);
      }
    }
    const explicit = new Set(enable);
    const covered = new Set(includedSkillIds(catalog, [...enabled.skills]));
    for (const id of covered) {
      if (!explicit.has(id)) enabled.skills.delete(id);
    }
  }
  for (const id of enable) move(catalog, enabled, disabled, id, "enabled");
  for (const id of disable) move(catalog, enabled, disabled, id, "disabled");
  return {
    rules: { enabled: [...enabled.rules], disabled: [...disabled.rules] },
    skills: { enabled: [...enabled.skills], disabled: [...disabled.skills] },
  };
}

function move(catalog, enabled, disabled, id, target) {
  const group = entryGroup(catalog, id);
  if (!group) throw new AgsError(`Unknown catalog id: ${id}`);
  const entry = catalogById(catalog).get(id);
  if (group === "skills" && !isEntryPoint(entry)) throw new AgsError(`${id} is not a direct selection`);
  enabled[group].delete(id);
  disabled[group].delete(id);
  (target === "enabled" ? enabled : disabled)[group].add(id);
}

export function saveCatalog(root, catalog) {
  const errors = validateCatalog(catalog);
  if (errors.length) throw new AgsError(errors.join("\n"));
  writeYamlAtomic(path.join(root, "catalog.yaml"), catalog);
}

export function skillAbs(root, entry) {
  return path.join(root, ...entry.path.split("/"));
}

export function normalizeOperational(options, hostRoot) {
  const git = {};
  const checks = {};
  if (options?.mainBranch != null) {
    if (!options.mainBranch) throw new AgsError("git.mainBranch must be a branch name");
    git.mainBranch = options.mainBranch;
  }
  for (const key of CHECK_KEYS) {
    const value = options?.checks?.[key];
    if (value != null) checks[key] = assertCheckScript(hostRoot, key, value);
  }
  void hostRoot;
  return {
    git: Object.keys(git).length ? git : undefined,
    checks: Object.keys(checks).length ? checks : undefined,
  };
}

export function proposeOperationalSettings(hostRoot) {
  const proposal = { git: {}, checks: {}, checkPlan: [] };
  const head = spawnGit(hostRoot);
  if (head) proposal.git.mainBranch = head;
  const proposed = proposeCheckScripts(hostRoot);
  proposal.manager = proposed.manager;
  proposal.managerConflict = proposed.conflict;
  proposal.checks = proposed.checks;
  proposal.checkPlan = proposed.details;
  return proposal;
}

function spawnGit(hostRoot) {
  const result = spawnSync("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], {
    cwd: hostRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const ref = result.stdout.trim();
  const slash = ref.indexOf("/");
  if (slash <= 0) return null;
  return ref.slice(slash + 1);
}
