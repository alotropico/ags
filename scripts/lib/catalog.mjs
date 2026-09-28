import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { hostLinkTargets } from "./links.mjs";
import { LOCK_FILES, whenMatches } from "./packages.mjs";
import { BLOCK_BUDGET, blockLineCount, indexLine, renderBlockBody } from "./render.mjs";
import { AgsError, walkFiles } from "./util.mjs";

export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const RESERVED_KEYS = new Set(["format", "host", "agsVersion", "reporting", "skills", "rules", "local"]);
const KEY_PART = /^[a-z][a-zA-Z0-9]*$/;
const RULE_FIELDS = new Set(["id", "tier", "install", "when"]);
const SKILL_FIELDS = new Set(["id", "install", "when", "includes", "params", "keywords"]);
const SETTING_FIELDS = new Set(["key", "type", "required", "default", "description"]);
const INSTALL = new Set(["always", "detected", "opt-in"]);
const TEMPLATE = "templates/agents-block.md";

export function rulePath(id) {
  return `rules/${id}.md`;
}

export function skillDir(id) {
  return `skills/${id}`;
}

export function hostRulePath(id) {
  return `.agents/rules/${id}.md`;
}

export function hostSkillDir(id) {
  return `.agents/skills/${id}`;
}

export function workingTreeSource(agsRoot) {
  return {
    label: "working tree",
    readFile(rel) {
      const abs = path.join(agsRoot, ...rel.split("/"));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
      return fs.readFileSync(abs);
    },
    listFiles(prefix) {
      const abs = path.join(agsRoot, ...prefix.split("/"));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
      return walkFiles(abs).map((file) => `${prefix}/${path.relative(abs, file).replaceAll("\\", "/")}`).sort();
    },
  };
}

function gitBuffer(cwd, args) {
  const result = spawnSync("git", args, { cwd, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return result;
}

export function tagExists(agsRoot, version) {
  return gitBuffer(agsRoot, ["rev-parse", "-q", "--verify", `refs/tags/v${version}`]).status === 0;
}

export function tagSource(agsRoot, version) {
  const ref = `v${version}`;
  if (!tagExists(agsRoot, version)) throw new AgsError(`Release tag not found: ${ref}`);
  const cache = new Map();
  return {
    label: ref,
    version,
    readFile(rel) {
      if (cache.has(rel)) return cache.get(rel);
      const result = gitBuffer(agsRoot, ["show", `${ref}:${rel}`]);
      const value = result.status === 0 ? result.stdout : null;
      cache.set(rel, value);
      return value;
    },
    listFiles(prefix) {
      const result = gitBuffer(agsRoot, ["-c", "core.quotepath=false", "ls-tree", "-r", "--name-only", ref, "--", `${prefix}/`]);
      if (result.status !== 0) return [];
      return result.stdout.toString("utf8").split("\n").map((line) => line.trim()).filter(Boolean).sort();
    },
  };
}

export function textOf(buffer) {
  return buffer == null ? null : buffer.toString("utf8").replaceAll("\r\n", "\n");
}

export function parseFrontmatter(text) {
  const body = String(text ?? "").replaceAll("\r\n", "\n");
  if (!body.startsWith("---\n")) return { present: false, data: null, body };
  const end = body.indexOf("\n---", 4);
  if (end < 0) return { present: true, data: null, body, error: "unterminated frontmatter" };
  const after = body.slice(end + 4);
  if (after && !after.startsWith("\n")) return { present: true, data: null, body, error: "unterminated frontmatter" };
  try {
    const data = parse(body.slice(4, end));
    if (!data || typeof data !== "object" || Array.isArray(data)) return { present: true, data: null, body, error: "frontmatter is not a mapping" };
    return { present: true, data, body: after.replace(/^\n/, "") };
  } catch (error) {
    return { present: true, data: null, body, error: `invalid frontmatter: ${error.message}` };
  }
}

export function readCatalog(agsRoot, { version } = {}) {
  const source = version ? tagSource(agsRoot, version) : workingTreeSource(agsRoot);
  const raw = textOf(source.readFile("catalog.yaml"));
  if (raw == null) throw new AgsError(`Missing catalog.yaml in ${source.label}`);
  let catalog;
  try {
    catalog = parse(raw);
  } catch (error) {
    throw new AgsError(`Invalid catalog.yaml in ${source.label}: ${error.message}`);
  }
  return { catalog, source };
}

export function loadCatalog(agsRoot, options = {}) {
  const { catalog, source } = readCatalog(agsRoot, options);
  const errors = validateCatalog(catalog, source);
  if (errors.length) throw new AgsError(`Invalid catalog (${source.label}):\n${errors.map((line) => `- ${line}`).join("\n")}`);
  return catalog;
}

export function validateCatalog(catalog, source) {
  const errors = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) return ["catalog must be a mapping"];
  if (catalog.format !== 2) errors.push("catalog format must be 2");
  for (const key of Object.keys(catalog)) {
    if (!["format", "rules", "skills", "settings"].includes(key)) errors.push(`catalog field not allowed: ${key}`);
  }
  if (!Array.isArray(catalog.rules)) errors.push("rules must be a list");
  if (!Array.isArray(catalog.skills)) errors.push("skills must be a list");
  if (catalog.settings != null && !Array.isArray(catalog.settings)) errors.push("settings must be a list");
  if (errors.length) return errors;
  catalog.settings ??= [];
  const ids = new Set();
  for (const entry of catalog.rules) entryErrors(entry, "rule", RULE_FIELDS, ids, errors);
  for (const entry of catalog.skills) entryErrors(entry, "skill", SKILL_FIELDS, ids, errors);
  for (const entry of catalog.rules) {
    if (!isObject(entry)) continue;
    if (entry.tier !== "strong" && entry.tier !== "soft") errors.push(`rule ${entry.id}: tier must be strong or soft`);
  }
  const settingKeys = settingsErrors(catalog.settings, errors);
  const skillIds = new Set(catalog.skills.filter(isObject).map((entry) => entry.id));
  for (const entry of catalog.skills) {
    if (!isObject(entry)) continue;
    listErrors(entry, "includes", errors);
    listErrors(entry, "params", errors);
    listErrors(entry, "keywords", errors);
    for (const id of Array.isArray(entry.includes) ? entry.includes : []) {
      if (id === entry.id) errors.push(`skill ${entry.id}: includes itself`);
      else if (!skillIds.has(id)) errors.push(`skill ${entry.id}: includes ${id}, which is not a skill`);
    }
    if (Array.isArray(entry.includes) && new Set(entry.includes).size !== entry.includes.length) errors.push(`skill ${entry.id}: duplicate includes`);
    for (const key of Array.isArray(entry.params) ? entry.params : []) {
      if (!settingKeys.has(key)) errors.push(`skill ${entry.id}: param ${key} is not declared in settings`);
    }
  }
  cycleErrors(catalog.skills.filter(isObject), errors);
  if (source && !errors.length) materialErrors(catalog, source, errors);
  return errors;
}

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function entryErrors(entry, kind, allowed, ids, errors) {
  if (!isObject(entry)) {
    errors.push(`${kind} entry must be a mapping`);
    return;
  }
  const label = `${kind} ${entry.id ?? "?"}`;
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) errors.push(`${label}: field not allowed: ${key}`);
  }
  if (typeof entry.id !== "string" || !ID_PATTERN.test(entry.id) || entry.id.length > 64) {
    errors.push(`${label}: id must match [a-z0-9]+(-[a-z0-9]+)* with at most 64 characters`);
  } else if (ids.has(entry.id)) {
    errors.push(`duplicate id: ${entry.id}`);
  } else {
    ids.add(entry.id);
  }
  if (!INSTALL.has(entry.install)) errors.push(`${label}: install must be always, detected or opt-in`);
  if (entry.install === "detected" && entry.when == null) errors.push(`${label}: when is required with install: detected`);
  if (entry.install !== "detected" && entry.when != null) errors.push(`${label}: when is allowed only with install: detected`);
  if (entry.when != null) errors.push(...whenErrors(entry.when, label));
}

function whenErrors(when, label) {
  if (!isObject(when) || !Array.isArray(when.any) || when.any.length === 0 || Object.keys(when).length !== 1) {
    return [`${label}: when must be a non-empty any list`];
  }
  const errors = [];
  for (const clause of when.any) {
    const keys = isObject(clause) ? Object.keys(clause) : [];
    if (keys.length !== 1 || !["package", "lockFile", "repoName"].includes(keys[0])) {
      errors.push(`${label}: when clause must be package, lockFile or repoName`);
      continue;
    }
    const value = clause[keys[0]];
    if (typeof value !== "string" || !value) errors.push(`${label}: when ${keys[0]} must be a non-empty string`);
    else if (keys[0] === "lockFile" && !LOCK_FILES.has(value)) errors.push(`${label}: lockFile is not a supported lock file name`);
  }
  return errors;
}

function listErrors(entry, field, errors) {
  if (entry[field] == null) return;
  if (!Array.isArray(entry[field]) || entry[field].some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`skill ${entry.id}: ${field} must be a list of strings`);
  }
}

function cycleErrors(skills, errors) {
  const byId = new Map(skills.map((entry) => [entry.id, entry]));
  const state = new Map();
  const visit = (id, stack) => {
    if (state.get(id) === "visiting") {
      errors.push(`include cycle: ${[...stack, id].join(" -> ")}`);
      return;
    }
    if (state.get(id) === "done") return;
    state.set(id, "visiting");
    for (const child of Array.isArray(byId.get(id)?.includes) ? byId.get(id).includes : []) {
      if (byId.has(child) && child !== id) visit(child, [...stack, id]);
    }
    state.set(id, "done");
  };
  for (const entry of skills) visit(entry.id, []);
}

export function settingsErrors(settings, errors) {
  const keys = new Set();
  for (const setting of settings) {
    if (!isObject(setting)) {
      errors.push("setting entry must be a mapping");
      continue;
    }
    const label = `setting ${setting.key ?? "?"}`;
    for (const key of Object.keys(setting)) {
      if (!SETTING_FIELDS.has(key)) errors.push(`${label}: field not allowed: ${key}`);
    }
    const parts = typeof setting.key === "string" ? setting.key.split(".") : [];
    if (parts.length !== 2 || !parts.every((part) => KEY_PART.test(part))) {
      errors.push(`${label}: key must be <namespace>.<name>, each part matching [a-z][a-zA-Z0-9]*`);
    } else if (RESERVED_KEYS.has(parts[0])) {
      errors.push(`${label}: namespace ${parts[0]} is a reserved key`);
    } else if (keys.has(setting.key)) {
      errors.push(`duplicate setting key: ${setting.key}`);
    } else {
      keys.add(setting.key);
    }
    if (setting.type !== "string" && setting.type !== "boolean") errors.push(`${label}: type must be string or boolean`);
    if (setting.required != null && typeof setting.required !== "boolean") errors.push(`${label}: required must be true or false`);
    const hasDefault = Object.hasOwn(setting, "default");
    if (setting.required === true && hasDefault) errors.push(`${label}: required and default are mutually exclusive`);
    if (hasDefault && typeof setting.default !== setting.type) errors.push(`${label}: default must be a ${setting.type}`);
    if (setting.type === "boolean" && !hasDefault) errors.push(`${label}: a boolean setting must have a default`);
    if (typeof setting.description !== "string" || !setting.description.trim() || /[\r\n]/.test(setting.description)) {
      errors.push(`${label}: description must be a single non-empty line`);
    }
  }
  return keys;
}

function materialErrors(catalog, source, errors) {
  const softRules = [];
  const strongRules = [];
  const skillFiles = new Map();
  for (const entry of catalog.skills) {
    const files = source.listFiles(skillDir(entry.id));
    skillFiles.set(entry.id, new Set(files.map((file) => file.slice(skillDir(entry.id).length + 1))));
  }
  for (const entry of catalog.rules) {
    const rel = rulePath(entry.id);
    const text = textOf(source.readFile(rel));
    if (text == null) {
      errors.push(`rule ${entry.id}: missing ${rel}`);
      continue;
    }
    const front = parseFrontmatter(text);
    if (entry.tier === "strong") {
      if (front.present) errors.push(`rule ${entry.id}: a strong rule has no frontmatter`);
      const lines = text.split("\n").filter((line) => line.trim()).length;
      if (lines > 5) errors.push(`rule ${entry.id}: a strong rule has at most 5 non-empty lines (${lines})`);
      strongRules.push(text.trim());
      entry.description = null;
      continue;
    }
    const description = softRuleDescriptionError(front);
    if (description.error) errors.push(`rule ${entry.id}: ${description.error}`);
    entry.description = description.value;
    softRules.push(entry);
    linkErrors(`rule ${entry.id}`, hostRulePath(entry.id), front.body ?? text, catalog, skillFiles, null, errors);
  }
  for (const entry of catalog.skills) {
    const files = skillFiles.get(entry.id);
    if (!files.has("SKILL.md")) {
      errors.push(`skill ${entry.id}: missing ${skillDir(entry.id)}/SKILL.md`);
      continue;
    }
    const front = parseFrontmatter(textOf(source.readFile(`${skillDir(entry.id)}/SKILL.md`)));
    if (!front.data) errors.push(`skill ${entry.id}: SKILL.md needs frontmatter${front.error ? ` (${front.error})` : ""}`);
    else {
      if (front.data.name !== entry.id) errors.push(`skill ${entry.id}: frontmatter name must equal the id`);
      const description = front.data.description;
      if (typeof description !== "string" || !description.trim()) errors.push(`skill ${entry.id}: frontmatter description is required`);
      else if (description.length > 1024) errors.push(`skill ${entry.id}: description exceeds 1024 characters`);
      entry.description = typeof description === "string" ? description.trim() : null;
    }
    for (const file of [...files].filter((name) => name.toLowerCase().endsWith(".md"))) {
      const text = textOf(source.readFile(`${skillDir(entry.id)}/${file}`));
      linkErrors(`skill ${entry.id}`, `${hostSkillDir(entry.id)}/${file}`, text, catalog, skillFiles, entry, errors);
    }
  }
  const template = textOf(source.readFile(TEMPLATE));
  if (template == null) {
    errors.push(`missing ${TEMPLATE}`);
    return;
  }
  const body = renderBlockBody(template, {
    strongRules,
    index: softRules.map((entry) => indexLine(entry.id, entry.description ?? "")),
  });
  const lines = blockLineCount(body);
  if (lines > BLOCK_BUDGET) errors.push(`the AGS block with every AGS rule selected has ${lines} lines, above the ${BLOCK_BUDGET}-line budget`);
}

export function softRuleDescriptionError(front) {
  if (!front.present || !front.data) return { error: `a soft rule needs frontmatter with description${front.error ? ` (${front.error})` : ""}`, value: null };
  const keys = Object.keys(front.data);
  const value = front.data.description;
  if (keys.length !== 1 || keys[0] !== "description") return { error: "soft rule frontmatter holds exactly one key, description", value: typeof value === "string" ? value : null };
  if (typeof value !== "string" || !value.trim()) return { error: "description must be a non-empty string", value: null };
  if (/[\r\n]/.test(value.trim())) return { error: "description must be a single line", value };
  if (value.length > 160) return { error: "description exceeds 160 characters", value };
  return { error: null, value: value.trim() };
}

function linkErrors(label, fromHostRel, text, catalog, skillFiles, skill, errors) {
  const companions = new Set(skill?.includes || []);
  const softRuleIds = new Set(catalog.rules.filter((entry) => entry.tier === "soft").map((entry) => entry.id));
  for (const { href, target } of hostLinkTargets(fromHostRel, text ?? "")) {
    if (!target) {
      errors.push(`${label}: link ${href} leaves the host layout`);
      continue;
    }
    const skillMatch = target.match(/^\.agents\/skills\/([^/]+)\/(.+)$/);
    const ruleMatch = target.match(/^\.agents\/rules\/([^/]+)\.md$/);
    if (skillMatch) {
      const [, id, rel] = skillMatch;
      if (skill && id !== skill.id && !companions.has(id)) {
        errors.push(`${label}: link ${href} points to skill ${id}, which is not an includes companion`);
      } else if (!skill) {
        errors.push(`${label}: link ${href} points into a skill; rules may link only to soft rules`);
      } else if (!skillFiles.get(id)?.has(rel)) {
        errors.push(`${label}: link ${href} does not resolve`);
      }
    } else if (ruleMatch && softRuleIds.has(ruleMatch[1])) {
      if (skill) errors.push(`${label}: link ${href} points to a rule; skills link only to their own files and companions`);
    } else {
      errors.push(`${label}: link ${href} does not resolve in the host layout`);
    }
  }
}

export function catalogById(catalog) {
  const map = new Map();
  for (const entry of catalog.rules) map.set(entry.id, { ...entry, kind: "rule" });
  for (const entry of catalog.skills) map.set(entry.id, { ...entry, kind: "skill" });
  return map;
}

export function entryGroup(catalog, id) {
  if (catalog.rules.some((entry) => entry.id === id)) return "rules";
  if (catalog.skills.some((entry) => entry.id === id)) return "skills";
  return null;
}

export function includedSkillIds(catalog, rootIds) {
  const byId = new Map(catalog.skills.map((entry) => [entry.id, entry]));
  const out = [];
  const seen = new Set(rootIds);
  const walk = (id) => {
    for (const child of byId.get(id)?.includes || []) {
      if (seen.has(child)) continue;
      seen.add(child);
      out.push(child);
      walk(child);
    }
  };
  for (const id of rootIds) walk(id);
  return out;
}

function selectionList(config, group, list) {
  const value = config?.[group]?.[list];
  return Array.isArray(value) ? value : [];
}

export function resolveSelection(catalog, config, evidence) {
  const errors = [];
  const result = { rules: [], skills: [], direct: [], companions: [], errors };
  const picked = { rules: new Set(), skills: new Set() };
  for (const group of ["rules", "skills"]) {
    const enabled = new Set(selectionList(config, group, "enabled"));
    const disabled = new Set(selectionList(config, group, "disabled"));
    for (const entry of catalog[group]) {
      const base = entry.install === "always" || (entry.install === "detected" && whenMatches(entry.when, evidence)) || enabled.has(entry.id);
      if (!base) continue;
      if (disabled.has(entry.id) && !(group === "rules" && entry.tier === "strong")) continue;
      picked[group].add(entry.id);
    }
  }
  const direct = catalog.skills.filter((entry) => picked.skills.has(entry.id)).map((entry) => entry.id);
  const disabledSkills = new Set(selectionList(config, "skills", "disabled"));
  const byId = new Map(catalog.skills.map((entry) => [entry.id, entry]));
  const walk = (id) => {
    for (const child of byId.get(id)?.includes || []) {
      if (disabledSkills.has(child)) {
        errors.push(`${child} is a companion of ${id} and cannot be disabled while ${id} is selected; drop ${id} to drop it`);
        continue;
      }
      if (picked.skills.has(child)) continue;
      picked.skills.add(child);
      walk(child);
    }
  };
  for (const id of direct) walk(id);
  result.rules = catalog.rules.filter((entry) => picked.rules.has(entry.id)).map((entry) => entry.id);
  result.skills = catalog.skills.filter((entry) => picked.skills.has(entry.id)).map((entry) => entry.id);
  result.direct = direct;
  result.companions = result.skills.filter((id) => !direct.includes(id));
  return result;
}

export function companionParents(catalog, selectedSkills, id) {
  return catalog.skills.filter((entry) => selectedSkills.includes(entry.id) && (entry.includes || []).includes(id)).map((entry) => entry.id);
}

export function routeIds(catalog, ids, flag) {
  const out = { rules: [], skills: [] };
  for (const id of ids) {
    const group = entryGroup(catalog, id);
    if (!group) throw new AgsError(`${flag}: unknown id ${id}`, { exitCode: 2 });
    if (!out[group].includes(id)) out[group].push(id);
  }
  return out;
}

export function applySelectionFlags(catalog, config, { enable = [], disable = [] } = {}) {
  const on = routeIds(catalog, enable, "--enable");
  const off = routeIds(catalog, disable, "--disable");
  const next = {};
  for (const group of ["rules", "skills"]) {
    const enabled = selectionList(config, group, "enabled").filter((id) => !off[group].includes(id));
    const disabled = selectionList(config, group, "disabled").filter((id) => !on[group].includes(id));
    for (const id of on[group]) if (!enabled.includes(id)) enabled.push(id);
    for (const id of off[group]) if (!disabled.includes(id)) disabled.push(id);
    next[group] = { enabled, disabled };
  }
  const changed = ["rules", "skills"].filter((group) => ["enabled", "disabled"].some((list) => {
    const before = selectionList(config, group, list);
    return before.length !== next[group][list].length || before.some((id, index) => id !== next[group][list][index]);
  }));
  return { selection: next, changed };
}

export function optInItems(catalog) {
  return [...catalog.rules, ...catalog.skills].filter((entry) => entry.install === "opt-in").map((entry) => entry.id);
}

export function settingByKey(catalog) {
  return new Map((catalog.settings || []).map((setting) => [setting.key, setting]));
}

export function allIds(catalog) {
  return [...catalog.rules.map((entry) => entry.id), ...catalog.skills.map((entry) => entry.id)];
}
