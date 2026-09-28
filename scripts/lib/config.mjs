import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { RESERVED_KEYS, settingByKey } from "./catalog.mjs";
import { isPackageScriptKey, prettierBodyWrites, readPackageScripts } from "./packages.mjs";
import { AgsError, validBranchName } from "./util.mjs";

export const CONFIG_REL = ".agents/ags.yaml";
const TO_STRING = { flowCollectionPadding: false, lineWidth: 0 };
const VERSION = /^\d+\.\d+\.\d+$/;

export function configPath(hostRoot) {
  return path.join(hostRoot, ".agents", "ags.yaml");
}

export function parseConfigText(text, label = CONFIG_REL) {
  const doc = parseDocument(String(text), { keepSourceTokens: false });
  if (doc.errors.length) throw new AgsError(`Invalid ${label}: ${doc.errors[0].message}`);
  const data = doc.toJS() ?? {};
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new AgsError(`Invalid ${label}: expected a mapping`);
  if (data.format === 1) throw new AgsError(`${label} format 1 is not supported; this host has no V2 installation. Remove it or replace it with format 2`);
  return { doc, data };
}

export function readConfig(hostRoot) {
  const file = configPath(hostRoot);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  return { ...parseConfigText(text), text, path: file };
}

export function configText(doc) {
  const text = doc.toString(TO_STRING);
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function newConfig(templateText, { host } = {}) {
  const { doc } = parseConfigText(templateText, "templates/ags.yaml");
  if (host != null) doc.set("host", host);
  return doc;
}

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function namespaces(catalog) {
  return new Set((catalog.settings || []).map((setting) => setting.key.split(".")[0]));
}

export function settingValue(data, key) {
  const [ns, name] = key.split(".");
  const group = data?.[ns];
  if (!isObject(group) || !Object.hasOwn(group, name)) return undefined;
  return group[name];
}

export function validateConfig(data, catalog, { hostRoot } = {}) {
  const errors = [];
  if (data.format !== 2) errors.push("format must be 2");
  if (data.host != null && (typeof data.host !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.host))) errors.push("host must be a slug");
  if (data.agsVersion != null && (typeof data.agsVersion !== "string" || !VERSION.test(data.agsVersion))) errors.push("agsVersion must be X.Y.Z");
  if (data.reporting != null && typeof data.reporting !== "boolean") errors.push("reporting must be true or false");
  for (const group of ["skills", "rules"]) {
    const value = data[group];
    if (value == null) continue;
    if (!isObject(value)) {
      errors.push(`${group} must be a mapping with enabled and disabled`);
      continue;
    }
    for (const key of Object.keys(value)) {
      if (key !== "enabled" && key !== "disabled") errors.push(`${group}.${key} is not a valid key`);
    }
    for (const list of ["enabled", "disabled"]) {
      if (value[list] != null && (!Array.isArray(value[list]) || value[list].some((id) => typeof id !== "string"))) {
        errors.push(`${group}.${list} must be a list of ids`);
      }
    }
  }
  if (data.local != null && !isObject(data.local)) errors.push("local must be a mapping");
  const declared = settingByKey(catalog);
  const spaces = namespaces(catalog);
  for (const [key, value] of Object.entries(data)) {
    if (RESERVED_KEYS.has(key)) continue;
    if (!spaces.has(key)) {
      errors.push(`${key} is not a reserved key or a settings namespace declared by the catalog`);
      continue;
    }
    if (!isObject(value)) {
      errors.push(`${key} must be a mapping`);
      continue;
    }
    for (const [name, item] of Object.entries(value)) {
      const setting = declared.get(`${key}.${name}`);
      if (!setting) {
        errors.push(`${key}.${name} is not declared by the catalog`);
        continue;
      }
      errors.push(...valueErrors(setting, item, { hostRoot }));
    }
  }
  errors.push(...selectionErrors(catalog, data));
  return errors;
}

export function valueErrors(setting, value, { hostRoot } = {}) {
  if (value == null) return [];
  if (typeof value !== setting.type) return [`${setting.key} must be a ${setting.type}`];
  if (setting.type !== "string" || value === "") return [];
  if (setting.key === "git.mainBranch" && !validBranchName(value)) return [`${setting.key} must be a branch name: ${value}`];
  if (setting.key.startsWith("checks.")) return checkScriptErrors(setting.key, value, hostRoot);
  return [];
}

export function checkScriptErrors(key, value, hostRoot) {
  if (!isPackageScriptKey(value)) return [`${key} must be a package.json script name, not a command line: ${value}`];
  if (!hostRoot) return [];
  let scripts;
  try {
    scripts = readPackageScripts(hostRoot);
  } catch (error) {
    return [`${key}: ${error.message}`];
  }
  if (!Object.hasOwn(scripts, value)) return [`${key} names a script that package.json does not have: ${value}`];
  if (key === "checks.prettier" && prettierBodyWrites(scripts[value])) return [`${key} must not rewrite files`];
  return [];
}

export function selectionErrors(catalog, data) {
  const errors = [];
  const ruleIds = new Map(catalog.rules.map((entry) => [entry.id, entry]));
  const skillIds = new Set(catalog.skills.map((entry) => entry.id));
  for (const group of ["skills", "rules"]) {
    const known = group === "skills" ? skillIds : new Set(ruleIds.keys());
    const enabled = Array.isArray(data?.[group]?.enabled) ? data[group].enabled : [];
    const disabled = Array.isArray(data?.[group]?.disabled) ? data[group].disabled : [];
    for (const id of new Set([...enabled, ...disabled])) {
      if (!known.has(id)) errors.push(`unknown ${group === "skills" ? "skill" : "rule"} id: ${id}`);
    }
    for (const id of enabled) {
      if (disabled.includes(id)) errors.push(`${id} is listed in both ${group}.enabled and ${group}.disabled`);
    }
    if (group === "rules") {
      for (const id of disabled) {
        if (ruleIds.get(id)?.tier === "strong") errors.push(`${id} cannot be disabled`);
      }
    }
  }
  return errors;
}

export function requiredSettings(catalog, skillIds) {
  const declared = settingByKey(catalog);
  const keys = [];
  for (const entry of catalog.skills) {
    if (!skillIds.includes(entry.id)) continue;
    for (const key of entry.params || []) {
      if (declared.get(key)?.required && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

export function missingRequired(catalog, data, skillIds) {
  return requiredSettings(catalog, skillIds).filter((key) => {
    const value = settingValue(data, key);
    return value == null || value === "";
  });
}

export function parseSets(values, catalog) {
  const declared = settingByKey(catalog);
  const out = new Map();
  for (const raw of values) {
    const eq = String(raw).indexOf("=");
    if (eq <= 0) throw new AgsError(`--set expects key=value: ${raw}`, { exitCode: 2 });
    const key = raw.slice(0, eq);
    const text = raw.slice(eq + 1);
    const setting = declared.get(key);
    if (!setting) {
      const reserved = RESERVED_KEYS.has(key.split(".")[0]);
      throw new AgsError(reserved ? `--set does not edit reserved keys; edit .agents/ags.yaml by hand: ${key}` : `--set key is not a declared setting: ${key}`, { exitCode: 2 });
    }
    let value = text;
    if (setting.type === "boolean") {
      if (text !== "true" && text !== "false") throw new AgsError(`--set ${key} expects true or false`, { exitCode: 2 });
      value = text === "true";
    }
    out.set(key, value);
  }
  return out;
}

function insertTopLevel(doc, key, node, { before, after } = {}) {
  const items = doc.contents.items;
  const pair = doc.createPair(key, node);
  const afterIndex = after ? items.findIndex((item) => item.key?.value === after || item.key === after) : -1;
  if (afterIndex >= 0) {
    items.splice(afterIndex + 1, 0, pair);
    return;
  }
  const beforeIndex = before ? items.findIndex((item) => item.key?.value === before || item.key === before) : -1;
  if (beforeIndex >= 0) items.splice(beforeIndex, 0, pair);
  else items.push(pair);
}

export function setAgsVersion(doc, version) {
  if (doc.has("agsVersion")) doc.set("agsVersion", version);
  else insertTopLevel(doc, "agsVersion", version, { after: "host" });
}

function ensureSetting(doc, setting, value) {
  const [ns, name] = setting.key.split(".");
  let group = doc.get(ns, true);
  if (!group) {
    group = doc.createNode({});
    group.flow = false;
    insertTopLevel(doc, ns, group, { before: "local" });
  }
  group.flow = false;
  if (group.has(name)) {
    group.set(name, value);
    return;
  }
  const key = doc.createNode(name);
  key.commentBefore = ` ${setting.description}`;
  group.items.push(doc.createPair(key, value));
}

export function writeSelection(doc, group, list, ids) {
  if (!doc.has(group)) insertTopLevel(doc, group, doc.createNode({ enabled: [], disabled: [] }), { before: "local" });
  const node = doc.createNode([...ids]);
  node.flow = true;
  doc.setIn([group, list], node);
}

export function mergeConfig(doc, catalog, { skillIds = [], sets = new Map() } = {}) {
  const declared = settingByKey(catalog);
  const data = doc.toJS() ?? {};
  const added = new Set();
  for (const entry of catalog.skills) {
    if (!skillIds.includes(entry.id)) continue;
    for (const key of entry.params || []) {
      if (settingValue(data, key) !== undefined || sets.has(key) || added.has(key)) continue;
      const setting = declared.get(key);
      ensureSetting(doc, setting, Object.hasOwn(setting, "default") ? setting.default : "");
      added.add(key);
    }
  }
  for (const [key, value] of sets) ensureSetting(doc, declared.get(key), value);
  return doc;
}
