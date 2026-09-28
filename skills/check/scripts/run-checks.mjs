#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ORDER = ["type", "lint", "prettier"];
const MANAGERS = ["pnpm", "yarn", "npm"];
const LOCKS = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];
const SCRIPT_KEY = /^[A-Za-z0-9_.:@/-]+$/;

export class CheckError extends Error {}

export function isPackageScriptKey(value) {
  return typeof value === "string" && value.length > 0 && SCRIPT_KEY.test(value) && !value.includes("..");
}

function readPackageJson(root) {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return null;
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new CheckError(`Invalid package.json: ${error.message}`);
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new CheckError(`Invalid package.json: ${file}`);
  return json;
}

function readPackageScripts(root) {
  const scripts = readPackageJson(root)?.scripts;
  if (scripts == null) return {};
  if (typeof scripts !== "object" || Array.isArray(scripts)) throw new CheckError("package.json scripts must be an object");
  return scripts;
}

function managerFromPackageManager(value) {
  if (typeof value !== "string") return null;
  return MANAGERS.find((name) => value.startsWith(`${name}@`)) ?? null;
}

export function detectPackageManager(root) {
  const json = readPackageJson(root);
  const declared = managerFromPackageManager(json?.packageManager);
  const locks = LOCKS.filter(([file]) => fs.existsSync(path.join(root, file)));
  const lockManagers = [...new Set(locks.map(([, manager]) => manager))];
  const files = locks.map(([file]) => file).join(", ");
  if (declared && lockManagers.some((manager) => manager !== declared)) {
    return { manager: null, conflict: `package manager conflict: packageManager ${json.packageManager} and lock file ${files}` };
  }
  if (!declared && locks.length > 1) return { manager: null, conflict: `package manager conflict: ${files}` };
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
  if (!MANAGERS.includes(manager)) throw new CheckError(`Unsupported package manager: ${manager}`);
  if (!isPackageScriptKey(script)) throw new CheckError(`Unsafe package script name: ${script}`);
  const executable = process.platform === "win32" ? `${manager}.cmd` : manager;
  const args = ["run", script];
  return { executable, args, fallback: [process.env.ComSpec || "cmd.exe", "/d", "/s", "/c", executable, ...args] };
}

function runPackageScript(root, manager, script) {
  const command = packageScriptInvocation(manager, script);
  const options = { cwd: root, encoding: "utf8", shell: false, windowsHide: true };
  let result = spawnSync(command.executable, command.args, options);
  if (process.platform === "win32" && result.error && (result.error.code === "EINVAL" || result.error.code === "ENOENT")) {
    const [shell, ...fallbackArgs] = command.fallback;
    result = spawnSync(shell, fallbackArgs, options);
  }
  return { ...result, command: `${command.executable} ${command.args.join(" ")}` };
}

export function runChecks(root, checks = {}, { which = ORDER, echo = false } = {}) {
  const unknown = which.filter((name) => !ORDER.includes(name));
  if (unknown.length) throw new CheckError(`Unknown check category: ${unknown.join(", ")}`);
  const requested = ORDER.filter((name) => which.includes(name));
  const detected = detectPackageManager(root);
  const scripts = readPackageScripts(root);
  if (detected.conflict && requested.some((name) => checks[name])) throw new CheckError(detected.conflict);
  const results = [];
  for (const name of requested) {
    const script = checks[name];
    if (!script) {
      results.push({ name, status: "not-configured" });
      continue;
    }
    if (!isPackageScriptKey(script)) {
      results.push({ name, script, status: "stale-configuration", exitCode: 1, diagnostics: `${name} is not a package script name` });
      continue;
    }
    if (!Object.hasOwn(scripts, script)) {
      results.push({ name, script, manager: detected.manager, status: "stale-configuration", exitCode: 1, diagnostics: `package.json has no script ${script}` });
      continue;
    }
    if (!detected.manager) {
      results.push({ name, script, status: "unavailable", exitCode: 1, diagnostics: "No package manager identified" });
      continue;
    }
    if (name === "prettier" && prettierBodyWrites(scripts[script])) {
      results.push({ name, script, manager: detected.manager, status: "rejected", exitCode: 1, diagnostics: "the prettier script must not rewrite files", stdout: "", stderr: "" });
      continue;
    }
    const result = runPackageScript(root, detected.manager, script);
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    if (echo && stdout) process.stdout.write(stdout);
    if (echo && stderr) process.stderr.write(stderr);
    const exitCode = result.status == null ? 1 : result.status;
    results.push({ name, manager: detected.manager, script, command: result.command, exitCode, status: exitCode === 0 ? "passed" : "failed", stdout, stderr, diagnostics: `${stdout}${stderr}` });
  }
  return results;
}

export function checkFailed(results) {
  return results.some((result) => !["passed", "not-configured"].includes(result.status));
}

const USAGE = "Usage: node .agents/skills/check/scripts/run-checks.mjs [--type <script>] [--lint <script>] [--prettier <script>]";

export function parseArgs(argv) {
  const checks = {};
  for (let i = 0; i < argv.length; i += 1) {
    const name = argv[i].startsWith("--") ? argv[i].slice(2) : null;
    if (!ORDER.includes(name)) throw new CheckError(`Unknown argument: ${argv[i]}\n${USAGE}`);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) throw new CheckError(`Missing value for --${name}\n${USAGE}`);
    if (name in checks) throw new CheckError(`--${name} was given more than once`);
    checks[name] = value;
    i += 1;
  }
  return checks;
}

export function main(argv, cwd = process.cwd()) {
  if (argv[0] === "--help") {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  let checks;
  try {
    checks = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  try {
    const results = runChecks(cwd, checks, { echo: true });
    for (const result of results) {
      const detail = result.command ?? (result.script ? `script ${result.script}` : "");
      process.stdout.write(`${result.name}: ${result.status}${detail ? ` (${detail})` : ""}${result.status !== "passed" && result.status !== "failed" && result.diagnostics ? `: ${result.diagnostics}` : ""}\n`);
    }
    return checkFailed(results) ? 1 : 0;
  } catch (error) {
    if (!(error instanceof CheckError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
