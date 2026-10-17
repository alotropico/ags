import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AgsError } from "./util.mjs";
import { detectCapabilities } from "./capabilities.mjs";

const MANAGERS = ["pnpm", "yarn", "npm"];
const LOCKS = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];
const SCRIPT_KEY = /^[A-Za-z0-9_.:@/-]+$/;
export const LOCK_FILES = new Set(["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml"]);

export function detectEvidence(hostRoot) {
  const packages = new Set();
  const packagePath = path.join(hostRoot, "package.json");
  let packageJson = false;
  if (fs.existsSync(packagePath)) {
    packageJson = true;
    try {
      const json = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        for (const name of Object.keys(json?.[field] || {})) packages.add(name);
      }
    } catch {
      packageJson = false;
    }
  }
  const locks = new Set([...LOCK_FILES].filter((name) => fs.existsSync(path.join(hostRoot, name))));
  return { packages, locks, repoName: path.basename(hostRoot).toLowerCase(), packageJson, capabilities: detectCapabilities(hostRoot) };
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

export function packageScriptInvocation(manager, script) {
  if (!MANAGERS.includes(manager)) throw new AgsError(`Unsupported package manager: ${manager}`);
  if (!isPackageScriptKey(script)) throw new AgsError(`Unsafe package script name: ${script}`);
  const executable = process.platform === "win32" ? `${manager}.cmd` : manager;
  const args = ["run", script];
  return {
    executable,
    args,
    fallback: process.platform === "win32" ? [process.env.ComSpec || "cmd.exe", "/d", "/s", "/c", executable, ...args] : null,
  };
}

export function runPackageScript(hostRoot, manager, script) {
  const command = packageScriptInvocation(manager, script);
  const options = { cwd: hostRoot, encoding: "utf8", shell: false, windowsHide: true };
  let result = spawnSync(command.executable, command.args, options);
  if (command.fallback && result.error && (result.error.code === "EINVAL" || result.error.code === "ENOENT")) {
    const [shell, ...fallbackArgs] = command.fallback;
    result = spawnSync(shell, fallbackArgs, options);
  }
  let failureReason = null;
  if (result.error) {
    const reason = result.error.code === "ENOENT" ? "unavailable; install it and check PATH"
      : ["EACCES", "EPERM"].includes(result.error.code) ? "cannot execute; check file permissions and PATH"
        : result.error.message;
    failureReason = `${command.executable} ${command.args.join(" ")}: ${reason}${result.error.code ? ` (${result.error.code})` : ""}`;
  } else if (result.signal) {
    failureReason = `${command.executable} ${command.args.join(" ")}: terminated by signal ${result.signal}`;
  }
  return { ...result, failureReason };
}
