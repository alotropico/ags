import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { AgsError, displayPath, normalizeIdentity, writeYamlAtomic } from "./util.mjs";

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HASH = /^[0-9a-f]{64}$/;
const VERSION = /^\d+\.\d+\.\d+$/;

export function registryPath(agsRoot) {
  return path.join(agsRoot, "hosts.yaml");
}

export function emptyRegistry() {
  return { format: 2, hosts: [] };
}

export function loadRegistry(agsRoot) {
  const file = registryPath(agsRoot);
  if (!fs.existsSync(file)) return emptyRegistry();
  let data;
  try {
    data = parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new AgsError(`Invalid hosts.yaml: ${error.message}`);
  }
  if (data == null) return emptyRegistry();
  if (data?.format === 1) throw new AgsError("hosts.yaml format 1 is not supported; replace it with format 2");
  const errors = validateRegistry(data);
  if (errors.length) throw new AgsError(`Invalid hosts.yaml:\n${errors.map((line) => `- ${line}`).join("\n")}`);
  for (const host of data.hosts) {
    host.ignored ??= [];
    host.promoted ??= [];
  }
  return data;
}

function recordErrors(label, list, fields) {
  const errors = [];
  if (list == null) return errors;
  if (!Array.isArray(list)) return [`${label} must be a list`];
  for (const record of list) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${label} record must be a mapping`);
      continue;
    }
    for (const key of Object.keys(record)) {
      if (!fields.includes(key)) errors.push(`${label} record field not allowed: ${key}`);
    }
    if (typeof record.path !== "string" || !record.path || record.path.includes("\\") || record.path.startsWith("/") || record.path.split("/").includes("..")) {
      errors.push(`${label} record path must be a host-relative path with forward slashes`);
    }
    const other = fields.includes("agsHash") ? "agsHash" : "targetHash";
    if (other === "agsHash" ? !HASH.test(String(record.hostHash)) : record.hostHash != null && !HASH.test(String(record.hostHash))) {
      errors.push(`${label} ${record.path}: hostHash must be a SHA-256 hex${other === "targetHash" ? " or null" : ""}`);
    }
    if (other === "agsHash" ? !HASH.test(String(record.agsHash)) : record.targetHash != null && !HASH.test(String(record.targetHash))) {
      errors.push(`${label} ${record.path}: ${other} must be a SHA-256 hex${other === "targetHash" ? " or null" : ""}`);
    }
    if (!VERSION.test(String(record.version))) errors.push(`${label} ${record.path}: version must be X.Y.Z`);
  }
  return errors;
}

export function validateRegistry(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) return ["hosts.yaml must be a mapping"];
  if (data.format !== 2) errors.push("format must be 2");
  if (!Array.isArray(data.hosts)) return [...errors, "hosts must be a list"];
  const ids = new Set();
  const paths = new Set();
  for (const host of data.hosts) {
    if (!host || typeof host !== "object" || Array.isArray(host)) {
      errors.push("host entry must be a mapping");
      continue;
    }
    for (const key of Object.keys(host)) {
      if (!["id", "name", "path", "ignored", "promoted"].includes(key)) errors.push(`host ${host.id ?? "?"}: field not allowed: ${key}`);
    }
    if (typeof host.id !== "string" || !ID.test(host.id)) errors.push(`host id must be a slug: ${host.id}`);
    else if (ids.has(host.id)) errors.push(`duplicate host id: ${host.id}`);
    else ids.add(host.id);
    if (typeof host.name !== "string" || !host.name.trim()) errors.push(`host ${host.id}: name is required`);
    if (typeof host.path !== "string" || !path.isAbsolute(host.path)) errors.push(`host ${host.id}: path must be absolute`);
    else {
      const key = normalizeIdentity(host.path);
      if (paths.has(key)) errors.push(`duplicate host path: ${host.path}`);
      paths.add(key);
    }
    errors.push(...recordErrors(`host ${host.id} ignored`, host.ignored, ["path", "hostHash", "targetHash", "version"]));
    errors.push(...recordErrors(`host ${host.id} promoted`, host.promoted, ["path", "hostHash", "agsHash", "version"]));
  }
  return errors;
}

export function saveRegistry(agsRoot, data) {
  const errors = validateRegistry(data);
  if (errors.length) throw new AgsError(`Refusing to write an invalid hosts.yaml:\n${errors.join("\n")}`);
  const hosts = data.hosts.map((host) => ({
    id: host.id,
    name: host.name,
    path: displayPath(host.path),
    ignored: host.ignored || [],
    promoted: host.promoted || [],
  }));
  writeYamlAtomic(registryPath(agsRoot), { format: 2, hosts });
}

export function findHost(data, { id, hostPath } = {}) {
  if (id != null) return data.hosts.find((host) => host.id === id) || null;
  if (hostPath != null) {
    const key = normalizeIdentity(hostPath);
    return data.hosts.find((host) => normalizeIdentity(host.path) === key) || null;
  }
  return null;
}
