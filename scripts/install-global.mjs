#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retargetHosts } from "./lib/host.mjs";
import { CANONICAL_ROOT } from "./lib/util.mjs";

const entry = path.join(CANONICAL_ROOT, "scripts", "ags.mjs");
const SHIM_NAMES = ["ags.CMD", "ags.ps1", "ags"];

export function assertSupportedPlatform(platform = process.platform) {
  if (platform !== "win32") {
    throw new Error("AGS V1 supports Windows only.");
  }
}

export function assertWindowsDir(dir) {
  const resolved = path.resolve(dir);
  if (!path.win32.isAbsolute(resolved)) throw new Error(`Global bin must be an absolute Windows directory: ${dir}`);
  return resolved;
}

export function resolveInstallBin({ bin, env = process.env, platform = process.platform, pnpmGlobalBin, skipCommand = false } = {}) {
  assertSupportedPlatform(platform);
  if (bin != null && bin !== true && bin !== "") return assertWindowsDir(bin);
  if (env.PNPM_HOME) return assertWindowsDir(env.PNPM_HOME);
  if (pnpmGlobalBin) return assertWindowsDir(pnpmGlobalBin);
  if (!skipCommand) {
    const detected = pnpmGlobalBinFromCommand();
    if (detected) return assertWindowsDir(detected);
  }
  if (env.LOCALAPPDATA) return assertWindowsDir(path.win32.join(env.LOCALAPPDATA, "pnpm"));
  throw new Error("Could not determine a Windows directory for the ags shim.");
}

function pnpmGlobalBinFromCommand() {
  const result = spawnSync("pnpm", ["bin", "-g"], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  const text = (result.stdout || "").trim();
  if (!text || !path.isAbsolute(text)) return null;
  return text;
}

export function shimFiles(scriptPath) {
  const cmdPath = scriptPath.replaceAll("/", "\\");
  const shPath = scriptPath.replaceAll("\\", "/");
  return {
    "ags.CMD": `@ECHO off\r\nnode "${cmdPath}" %*\r\n`,
    "ags.ps1": `& node "${cmdPath}" @args\r\nif ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE }\r\n`,
    ags: `#!/bin/sh\nexec node "${shPath}" "$@"\n`,
  };
}

function shimIsOurs(file, scriptPath) {
  if (!fs.existsSync(file)) return true;
  const text = fs.readFileSync(file, "utf8").replaceAll("/", "\\").toLowerCase();
  const needle = path.resolve(scriptPath).replaceAll("/", "\\").toLowerCase();
  return text.includes(needle);
}

export function pathIncludes(pathValue, dir) {
  if (!pathValue || !dir) return false;
  const target = path.resolve(dir).replace(/[\\/]+$/, "").toLowerCase();
  return pathValue.split(path.delimiter).some((item) => {
    const expanded = item.replace(/%([^%]+)%/g, (_, name) => process.env[name] || "");
    if (!expanded.trim()) return false;
    return path.resolve(expanded).replace(/[\\/]+$/, "").toLowerCase() === target;
  });
}

export function persistedUserPath() {
  if (process.platform !== "win32") return process.env.PATH || "";
  try {
    return execFileSync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "[Environment]::GetEnvironmentVariable('Path','User')",
    ], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function pathWarning(binDir, { processPath = "", persistedPath = "" } = {}) {
  if (pathIncludes(processPath, binDir)) return null;
  if (pathIncludes(persistedPath, binDir)) return "restart";
  return "missing";
}

export function parseInstallArgs(argv) {
  const known = new Set(["bin", "script", "replace", "help"]);
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`Unknown installer argument: ${arg}`);
    const key = arg.slice(2);
    if (!known.has(key)) throw new Error(`Unknown installer flag: --${key}`);
    if (key === "replace" || key === "help") {
      flags[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    flags[key] = next;
    i += 1;
  }
  return flags;
}

export function finishInstall({ binDir, scriptPath = entry, replace = false, platform = process.platform, retarget } = {}) {
  const result = installGlobal({ binDir, scriptPath, replace, platform });
  let hosts = { updated: [], failures: [] };
  try {
    hosts = (retarget || (() => retargetHosts(CANONICAL_ROOT)))();
  } catch (error) {
    hosts = { updated: [], failures: [error.message] };
  }
  return { ...result, hosts };
}

export function installGlobal({ binDir, scriptPath = entry, replace = false, platform = process.platform } = {}) {
  assertSupportedPlatform(platform);
  const target = assertWindowsDir(binDir);
  if (!fs.existsSync(scriptPath)) throw new Error(`Missing ags entry: ${scriptPath}`);
  const unrelated = SHIM_NAMES.filter((name) => {
    const file = path.join(target, name);
    return fs.existsSync(file) && !shimIsOurs(file, scriptPath);
  });
  if (unrelated.length && !replace) {
    throw new Error(`Refusing to overwrite unrelated ags shim: ${unrelated.join(", ")}. Pass --replace or choose another --bin.`);
  }
  fs.mkdirSync(target, { recursive: true });
  const written = [];
  for (const [name, body] of Object.entries(shimFiles(scriptPath))) {
    const file = path.join(target, name);
    fs.writeFileSync(file, body);
    written.push(file);
  }
  const onPath = pathIncludes(process.env.Path || process.env.PATH, target);
  return { binDir: target, written, onPath };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
export function installerHelp() {
  return "node .\\scripts\\install-global.mjs [--bin <absolute-directory>] [--replace]";
}

if (invoked) {
  try {
    const flags = parseInstallArgs(process.argv.slice(2));
    if (flags.help) {
      console.log(installerHelp());
    } else {
    assertSupportedPlatform();
    const binDir = resolveInstallBin({ bin: flags.bin });
    const result = finishInstall({
      binDir,
      scriptPath: flags.script || entry,
      replace: Boolean(flags.replace),
      retarget: () => retargetHosts(CANONICAL_ROOT),
    });
    for (const file of result.written) console.log(file);
    for (const id of result.hosts.updated) console.log(`host ${id} now uses ${CANONICAL_ROOT}`);
    for (const failure of result.hosts.failures) console.error(failure);
    if (result.hosts.failures.length) process.exitCode = 1;
    const warning = pathWarning(result.binDir, {
      processPath: process.env.Path || process.env.PATH || "",
      persistedPath: persistedUserPath(),
    });
    if (warning === "restart") {
      console.error(`Warning: ${result.binDir} is saved in your user PATH, but this terminal was started before that. Restart the terminal app. A new tab still inherits the old PATH.`);
    } else if (warning === "missing") {
      console.error(`Warning: ${result.binDir} is not on PATH. Run pnpm setup, then restart the terminal.`);
    }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
