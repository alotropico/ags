import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AgsError } from "./util.mjs";

const MANAGERS = ["pnpm", "yarn", "npm"];
const LOCKS = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];
const SCRIPT_KEY = /^[A-Za-z0-9_.:@/-]+$/;

export function isPackageScriptKey(value) {
  return typeof value === "string" && value.length > 0 && SCRIPT_KEY.test(value) && !value.includes("..");
}

export function readPackageJson(hostRoot) {
  const file = path.join(hostRoot, "package.json");
  if (!fs.existsSync(file)) return null;
  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new AgsError(`Invalid package.json: ${file}`);
    }
    return json;
  } catch (error) {
    if (error instanceof AgsError) throw error;
    throw new AgsError(`Invalid package.json: ${error.message}`);
  }
}

export function readPackageScripts(hostRoot) {
  const json = readPackageJson(hostRoot);
  const scripts = json?.scripts;
  if (scripts == null) return {};
  if (typeof scripts !== "object" || Array.isArray(scripts)) throw new AgsError("package.json scripts must be an object");
  return scripts;
}

export function managerFromPackageManager(value) {
  if (typeof value !== "string") return null;
  for (const name of MANAGERS) {
    if (value.startsWith(`${name}@`)) return name;
  }
  return null;
}

export function detectPackageManager(hostRoot) {
  const json = readPackageJson(hostRoot);
  const declared = managerFromPackageManager(json?.packageManager);
  const locks = LOCKS.filter(([file]) => fs.existsSync(path.join(hostRoot, file)));
  const lockManagers = [...new Set(locks.map(([, manager]) => manager))];
  if (declared && lockManagers.length && lockManagers.some((manager) => manager !== declared)) {
    return {
      manager: null,
      conflict: `package manager conflict: packageManager ${json.packageManager} and lock file ${locks.map(([file]) => file).join(", ")}`,
    };
  }
  if (!declared && locks.length > 1) {
    return {
      manager: null,
      conflict: `package manager conflict: ${locks.map(([file]) => file).join(", ")}`,
    };
  }
  if (lockManagers.length > 1) {
    return {
      manager: null,
      conflict: `package manager conflict: ${locks.map(([file]) => file).join(", ")}`,
    };
  }
  if (declared) return { manager: declared, conflict: null };
  if (lockManagers.length === 1) return { manager: lockManagers[0], conflict: null };
  return { manager: null, conflict: null };
}

export function prettierBodyWrites(body) {
  const text = String(body ?? "");
  if (!/\bprettier\b/.test(text)) return false;
  if (/--write\b/.test(text)) return true;
  return /(^|[\s"'=])-w([\s"'=]|$)/.test(text);
}

export function assertCheckScript(hostRoot, category, script) {
  if (!isPackageScriptKey(script)) {
    throw new AgsError(`checks.${category} must be a package script name`);
  }
  const scripts = readPackageScripts(hostRoot);
  if (!Object.hasOwn(scripts, script)) {
    throw new AgsError(`checks.${category} script is not in package.json: ${script}`);
  }
  if (category === "prettier" && prettierBodyWrites(scripts[script])) {
    throw new AgsError("checks.prettier must not rewrite files");
  }
  return script;
}

const CHECK_CANDIDATES = {
  type: ["typecheck", "type-check"],
  lint: ["lint"],
  prettier: ["prettier:check", "format:check", "check:format"],
};

export function proposeCheckScripts(hostRoot) {
  const detected = detectPackageManager(hostRoot);
  const scripts = readPackageScripts(hostRoot);
  const checks = {};
  const details = [];
  if (detected.conflict || !detected.manager) {
    return { manager: detected.manager, conflict: detected.conflict, checks, details };
  }
  for (const [category, names] of Object.entries(CHECK_CANDIDATES)) {
    const script = names.find((name) => typeof scripts[name] === "string" && !(category === "prettier" && prettierBodyWrites(scripts[name])));
    if (!script) continue;
    checks[category] = script;
    details.push({ category, manager: detected.manager, script, body: String(scripts[script]) });
  }
  return { manager: detected.manager, conflict: null, checks, details };
}

export function reduceCheckCommand(value, manager, scripts) {
  if (!manager || typeof value !== "string") return null;
  const trimmed = value.trim();
  const patterns = [
    new RegExp(`^(?:${manager}|${manager}\\.cmd) run (\\S+)$`),
    new RegExp(`^(?:${manager}|${manager}\\.cmd) (\\S+)$`),
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const script = match[1];
    if (isPackageScriptKey(script) && Object.hasOwn(scripts, script)) return script;
  }
  return null;
}

export function migrateChecks(checks, hostRoot) {
  const detected = detectPackageManager(hostRoot);
  const scripts = readPackageScripts(hostRoot);
  const next = {};
  const warnings = [];
  if (!checks || typeof checks !== "object" || Array.isArray(checks)) return { checks: undefined, warnings };
  if (detected.conflict) warnings.push(detected.conflict);
  for (const key of ["type", "lint", "prettier"]) {
    const value = checks[key];
    if (value == null) continue;
    if (isPackageScriptKey(value)) {
      next[key] = value;
      continue;
    }
    const reduced = detected.conflict ? null : reduceCheckCommand(value, detected.manager, scripts);
    if (reduced) {
      next[key] = reduced;
      warnings.push(`Migrated checks.${key} to package script ${reduced}`);
    } else {
      warnings.push(`Removed checks.${key} because it is not a package script. Select it again.`);
    }
  }
  return { checks: Object.keys(next).length ? next : undefined, warnings };
}

export function packageScriptInvocation(manager, script) {
  if (!MANAGERS.includes(manager)) throw new AgsError(`Unsupported package manager: ${manager}`);
  if (!isPackageScriptKey(script)) throw new AgsError(`Unsafe package script name: ${script}`);
  const executable = `${manager}.cmd`;
  const args = ["run", script];
  return {
    executable,
    args,
    fallback: [process.env.ComSpec || "cmd.exe", "/d", "/s", "/c", executable, ...args],
  };
}

export function runPackageScript(hostRoot, manager, script) {
  const command = packageScriptInvocation(manager, script);
  const options = { cwd: hostRoot, encoding: "utf8", shell: false, windowsHide: true };
  let result = spawnSync(command.executable, command.args, options);
  if (result.error && (result.error.code === "EINVAL" || result.error.code === "ENOENT")) {
    const [shell, ...fallbackArgs] = command.fallback;
    result = spawnSync(shell, fallbackArgs, options);
  }
  return result;
}
