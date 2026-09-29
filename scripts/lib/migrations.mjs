import fs from "node:fs";
import path from "node:path";
import { compareVersions, tagSource, textOf, VERSION_PATTERN } from "./catalog.mjs";
import { AgsError } from "./util.mjs";

function major(version) {
  return Number(String(version).split(".")[0]);
}

function declarationPath(fromMajor, toMajor) {
  return `migrations/${fromMajor}-to-${toMajor}.json`;
}

export function validateMigrationDeclaration(value, { path: rel = "migration declaration" } = {}) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${rel}: must be an object`];
  const allowed = new Set(["format", "fromMajor", "toMajor", "sourceVersions", "idTransforms"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${rel}: unknown field ${key}`);
  if (value.format !== 1) errors.push(`${rel}: format must be 1`);
  if (!Number.isInteger(value.fromMajor) || value.fromMajor < 0) errors.push(`${rel}: fromMajor must be a non-negative integer`);
  if (!Number.isInteger(value.toMajor) || value.toMajor !== value.fromMajor + 1) errors.push(`${rel}: toMajor must be fromMajor + 1`);
  if (!Array.isArray(value.sourceVersions) || !value.sourceVersions.length) errors.push(`${rel}: sourceVersions must be a non-empty array`);
  else {
    const seen = new Set();
    for (const version of value.sourceVersions) {
      if (typeof version !== "string" || !VERSION_PATTERN.test(version)) errors.push(`${rel}: invalid source version ${String(version)}`);
      else if (major(version) !== value.fromMajor) errors.push(`${rel}: source version ${version} is not major ${value.fromMajor}`);
      if (seen.has(version)) errors.push(`${rel}: duplicate source version ${version}`);
      seen.add(version);
    }
  }
  if (!Array.isArray(value.idTransforms)) errors.push(`${rel}: idTransforms must be an array`);
  else if (value.idTransforms.length) errors.push(`${rel}: this migration engine accepts retained ids only; idTransforms must be empty`);
  return errors;
}

export function migrationChain(agsRoot, installed, target) {
  if (!VERSION_PATTERN.test(installed) || !VERSION_PATTERN.test(target)) throw new AgsError(`Migration versions must be X.Y.Z: ${installed}, ${target}`);
  if (compareVersions(target, installed) < 0) throw new AgsError(`Downgrades are refused: the host is at ${installed}, the target is ${target}.`);
  const fromMajor = major(installed);
  const toMajor = major(target);
  if (toMajor === fromMajor) return [];

  const source = tagSource(agsRoot, target);
  const chain = [];
  for (let current = fromMajor; current < toMajor; current += 1) {
    const rel = declarationPath(current, current + 1);
    const text = textOf(source.readFile(rel));
    if (text == null) throw new AgsError(`Updating from ${installed} to ${target} needs ${rel} in v${target}; no complete migration chain exists.`);
    let declaration;
    try {
      declaration = JSON.parse(text);
    } catch (error) {
      throw new AgsError(`Invalid ${rel} in v${target}: ${error.message}`);
    }
    const errors = validateMigrationDeclaration(declaration, { path: rel });
    if (errors.length) throw new AgsError(`Invalid migration declaration in v${target}:\n${errors.map((line) => `- ${line}`).join("\n")}`);
    if (current === fromMajor && !declaration.sourceVersions.includes(installed)) {
      throw new AgsError(`${rel} in v${target} does not support installed release ${installed}.`);
    }
    chain.push({ path: rel, ...declaration });
  }
  return chain;
}

export function workingMigrationErrors(agsRoot) {
  const dir = path.join(agsRoot, "migrations");
  if (!fs.existsSync(dir)) return [];
  const errors = [];
  for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
    const rel = `migrations/${name}`;
    let declaration;
    try {
      declaration = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    } catch (error) {
      errors.push(`${rel}: invalid JSON: ${error.message}`);
      continue;
    }
    errors.push(...validateMigrationDeclaration(declaration, { path: rel }));
    if (Number.isInteger(declaration?.fromMajor) && Number.isInteger(declaration?.toMajor) && name !== `${declaration.fromMajor}-to-${declaration.toMajor}.json`) {
      errors.push(`${rel}: filename must be ${declaration.fromMajor}-to-${declaration.toMajor}.json`);
    }
  }
  return errors;
}
