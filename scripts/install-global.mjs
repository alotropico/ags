#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGS_ROOT, samePath } from "./lib/util.mjs";

const entry = path.join(AGS_ROOT, "scripts", "ags.mjs");
const OWNER = "AGS checkout launcher target: ";

export function assertSupportedPlatform(platform = process.platform) {
  if (platform !== "win32" && platform !== "darwin") {
    throw new Error("AGS supports Windows and macOS only; this installer does not support Linux or mobile.");
  }
}

export function assertWindowsDir(dir) {
  if (typeof dir !== "string" || !dir || dir.includes("\0") || !path.win32.isAbsolute(dir) || !/^(?:[a-z]:[\\/]|[\\/]{2}[^\\/]+[\\/][^\\/]+)/i.test(dir)) {
    throw new Error(`Global bin must be an absolute Windows directory: ${dir}`);
  }
  return path.win32.normalize(dir);
}

function assertNativeDir(dir, platform) {
  if (platform === "win32") return assertWindowsDir(dir);
  if (typeof dir !== "string" || !dir || dir.includes("\0") || !path.posix.isAbsolute(dir)) {
    throw new Error(`Global bin must be an absolute macOS directory: ${dir}`);
  }
  return path.posix.normalize(dir);
}

export function resolveInstallBin({ bin, env = process.env, platform = process.platform, pnpmGlobalBin, skipCommand = false } = {}) {
  assertSupportedPlatform(platform);
  if (bin != null) return assertNativeDir(bin, platform);
  if (env.PNPM_HOME) return assertNativeDir(env.PNPM_HOME, platform);
  if (pnpmGlobalBin) return assertNativeDir(pnpmGlobalBin, platform);
  if (!skipCommand) {
    const detected = pnpmGlobalBinFromCommand(platform, env);
    if (detected) return assertNativeDir(detected, platform);
  }
  if (platform === "win32" && env.LOCALAPPDATA) return assertWindowsDir(path.win32.join(assertWindowsDir(env.LOCALAPPDATA), "pnpm"));
  if (platform === "darwin") return assertNativeDir(path.posix.join(assertNativeDir(env.HOME || os.homedir(), platform), ".local", "bin"), platform);
  throw new Error("Could not determine a Windows directory for the ags shim. Set PNPM_HOME or pass --bin <absolute-directory>.");
}

function pnpmGlobalBinFromCommand(platform, env) {
  if (platform !== process.platform) throw new Error("A package-manager bin lookup must run on its native platform.");
  let result = spawnSync("pnpm", ["bin", "-g"], { encoding: "utf8", windowsHide: true, env });
  if (platform === "win32" && result.error && ["ENOENT", "EINVAL"].includes(result.error.code)) {
    // This command has no interpolated input. Batch handling stays on Windows.
    result = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "pnpm bin -g"], { encoding: "utf8", windowsHide: true, env });
  }
  if (result.error || result.status !== 0) return null;
  const text = (result.stdout || "").trim();
  try {
    return assertNativeDir(text, platform);
  } catch {
    return null;
  }
}

function shLiteral(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function psLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function shimFiles(scriptPath, { platform = process.platform } = {}) {
  assertSupportedPlatform(platform);
  const script = platform === "win32" ? path.win32.normalize(scriptPath) : path.posix.normalize(scriptPath);
  const missing = `Missing AGS checkout entry: ${script}. Rerun node scripts/install-global.mjs --replace from its new location to reinstall.`;
  const encoded = Buffer.from(script, "utf8").toString("base64");
  // Keep the entry's normal argv/invocation contract while catching static
  // import failures before the CLI can provide its own dependency diagnostic.
  const program = `const p=Buffer.from('${encoded}','base64').toString('utf8');if(!require('node:fs').statSync(p,{throwIfNoEntry:false})?.isFile()){console.error('Missing AGS checkout entry: '+p+'. Rerun node scripts/install-global.mjs --replace from its new location to reinstall.');process.exit(1)}process.argv.splice(1,0,p);import(require('node:url').pathToFileURL(p).href).catch(e=>{console.error(e.code==='ERR_MODULE_NOT_FOUND'?'AGS entry or dependency unavailable. Run pnpm install in the current AGS checkout; rerun the installer with --replace after moving it.':e);process.exitCode=1});`;
  const shellPath = platform === "win32" ? script.replaceAll("\\", "/") : script;
  const shell = `#!/bin/sh\n# ${OWNER}${JSON.stringify(script)}\nif [ ! -f ${shLiteral(shellPath)} ]; then\n  printf '%s\\n' ${shLiteral(missing)} >&2\n  exit 1\nfi\nif ! command -v node >/dev/null 2>&1; then\n  printf '%s\\n' 'Node.js is unavailable. Install Node 20 or newer and add it to PATH.' >&2\n  exit 127\nfi\nexec node -e ${shLiteral(program)} -- "$@"\n`;
  if (platform === "darwin") return { ags: shell };
  // CMD reads batch files using the console code page. Encode the target so
  // a Unicode checkout works without changing the user's console code page.
  return {
    "ags.CMD": `@ECHO off\r\nSETLOCAL DisableDelayedExpansion\r\n:: ${OWNER}${JSON.stringify(script)}\r\nWHERE node >NUL 2>NUL\r\nIF ERRORLEVEL 1 GOTO ags_node_missing\r\nnode -e "${program}" -- %*\r\nEXIT /B %ERRORLEVEL%\r\n:ags_node_missing\r\n>&2 ECHO Node.js is unavailable. Install Node 20 or newer and add it to PATH.\r\nEXIT /B 127\r\n`,
    "ags.ps1": `\uFEFF# ${OWNER}${JSON.stringify(script)}\r\n$agsEntry = ${psLiteral(script)}\r\nif (-not (Test-Path -LiteralPath $agsEntry -PathType Leaf)) { [Console]::Error.WriteLine(${psLiteral(missing)}); exit 1 }\r\n$agsNode = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1\r\nif ($null -eq $agsNode) { [Console]::Error.WriteLine('Node.js is unavailable. Install Node 20 or newer and add it to PATH.'); exit 127 }\r\nfunction ConvertTo-AgsNativeArgument([string]$value) {\r\n  if ($value.Length -gt 0 -and $value -notmatch '[\\s"]') { return $value }\r\n  $value = [regex]::Replace($value, '(\\\\*)"', '$1$1\\"')\r\n  $value = [regex]::Replace($value, '(\\\\+)$', '$1$1')\r\n  return '"' + $value + '"'\r\n}\r\n$agsStart = New-Object System.Diagnostics.ProcessStartInfo\r\n$agsStart.FileName = $agsNode.Source\r\n$agsStart.UseShellExecute = $false\r\n$agsStart.WorkingDirectory = (Get-Location).ProviderPath\r\n$agsStart.Arguments = ((@('-e', ${psLiteral(program)}, '--') + @($args) | ForEach-Object { ConvertTo-AgsNativeArgument ([string]$_) }) -join ' ')\r\ntry {\r\n  $agsChild = [System.Diagnostics.Process]::Start($agsStart)\r\n  $agsChild.WaitForExit()\r\n  exit $agsChild.ExitCode\r\n} catch { [Console]::Error.WriteLine('Could not start Node.js: ' + $_.Exception.Message); exit 1 }\r\n`,
    ags: shell,
  };
}

function lstatOrNull(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

function legacyFiles(scriptPath) {
  const cmdPath = scriptPath.replaceAll("/", "\\");
  const shPath = scriptPath.replaceAll("\\", "/");
  return {
    "ags.CMD": `@ECHO off\r\nnode "${cmdPath}" %*\r\n`,
    "ags.ps1": `& node "${cmdPath}" @args\r\nif ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE }\r\n`,
    ags: `#!/bin/sh\nexec node "${shPath}" "$@"\n`,
  };
}

function shimIsOurs(file, scriptPath, platform) {
  const stat = lstatOrNull(file);
  if (!stat) return true;
  if (!stat.isFile()) return false;
  const text = fs.readFileSync(file, "utf8");
  const name = path.basename(file);
  const ownerLine = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((line) => line.startsWith(`# ${OWNER}`) || line.startsWith(`:: ${OWNER}`));
  if (ownerLine) {
    try {
      const ownedTarget = JSON.parse(ownerLine.slice(ownerLine.indexOf(OWNER) + OWNER.length));
      return typeof ownedTarget === "string" && samePath(ownedTarget, scriptPath) && text === shimFiles(ownedTarget, { platform })[name];
    } catch {
      return false;
    }
  }
  if (platform !== "win32") return false;
  const patterns = {
    "ags.CMD": /^@ECHO off\r?\nnode "([^"\r\n]+)" %\*\r?\n$/,
    "ags.ps1": /^& node "([^"\r\n]+)" @args\r?\nif \(\$null -ne \$LASTEXITCODE\) \{ exit \$LASTEXITCODE \}\r?\n$/,
    ags: /^#!\/bin\/sh\nexec node "([^"\n]+)" "\$@"\n$/,
  };
  const target = text.match(patterns[name] || /$^/)?.[1];
  return Boolean(target && samePath(target, scriptPath) && text === legacyFiles(target)[name]);
}

export function pathIncludes(pathValue, dir, { platform = process.platform, env = process.env } = {}) {
  if (!pathValue || !dir) return false;
  const nativePath = platform === "win32" ? path.win32 : path.posix;
  const identity = (value) => {
    const resolved = nativePath.resolve(value);
    if (platform === process.platform) return resolved;
    return platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  const target = identity(dir);
  return pathValue.split(platform === "win32" ? ";" : ":").some((item) => {
    let candidate = item;
    if (platform === "win32") {
      candidate = item.replace(/^"(.*)"$/, "$1").replace(/%([^%]+)%/g, (_, name) => env[Object.keys(env).find((key) => key.toLowerCase() === name.toLowerCase())] || "");
    }
    if (!candidate.trim()) return false;
    const expanded = identity(candidate);
    return platform === process.platform ? samePath(expanded, target) : expanded === target;
  });
}

export function persistedUserPath() {
  if (process.platform !== "win32") return process.env.PATH || "";
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-Command", "[Environment]::GetEnvironmentVariable('Path','User')"], { encoding: "utf8", windowsHide: true }).trim();
  } catch {
    return "";
  }
}

export function pathWarning(binDir, { processPath = "", persistedPath = "", platform = process.platform, env = process.env } = {}) {
  if (pathIncludes(processPath, binDir, { platform, env })) return null;
  if (pathIncludes(persistedPath, binDir, { platform, env })) return "restart";
  return "missing";
}

export function parseInstallArgs(argv) {
  const known = new Set(["bin", "script", "replace", "help"]);
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`Unknown installer argument: ${arg}`);
    const eq = arg.indexOf("=");
    const key = arg.slice(2, eq < 0 ? undefined : eq);
    const inline = eq < 0 ? null : arg.slice(eq + 1);
    if (!known.has(key)) throw new Error(`Unknown installer flag: --${key}`);
    if (key === "replace" || key === "help") {
      if (inline != null) throw new Error(`--${key} does not take a value`);
      flags[key] = true;
      continue;
    }
    const next = inline ?? argv[i + 1];
    if (next == null || next === "" || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    if (key in flags) throw new Error(`--${key} was given more than once`);
    flags[key] = next;
    if (inline == null) i += 1;
  }
  return flags;
}

export function installGlobal({ binDir, scriptPath = entry, replace = false, platform = process.platform } = {}) {
  assertSupportedPlatform(platform);
  if (platform !== process.platform) throw new Error("Launcher installation must run on its native Windows or macOS platform.");
  const target = assertNativeDir(binDir, platform);
  const script = path.resolve(scriptPath);
  if (!fs.existsSync(script) || !fs.statSync(script).isFile()) throw new Error(`Missing ags entry: ${script}. Run the installer from the current AGS checkout.`);
  const files = Object.entries(shimFiles(script, { platform }));
  const unrelated = [];
  for (const [name] of files) {
    const file = path.join(target, name);
    const stat = lstatOrNull(file);
    if (stat?.isDirectory()) throw new Error(`Refusing to replace a directory at the launcher path: ${file}. Choose another --bin.`);
    if (stat && !shimIsOurs(file, script, platform)) unrelated.push(name);
  }
  if (unrelated.length && !replace) {
    throw new Error(`Refusing to overwrite unrelated ags shim: ${unrelated.join(", ")}. Pass --replace or choose another --bin.`);
  }
  try {
    fs.mkdirSync(target, { recursive: true });
  } catch (error) {
    throw new Error(`Could not create AGS launcher directory ${target}: ${error.message}. Choose a writable --bin <absolute-directory>; no launchers were written.`);
  }
  const prefix = `.ags-install-${process.pid}-${randomUUID()}`;
  const staged = files.map(([name, body]) => ({ name, body, file: path.join(target, name), stage: path.join(target, `${prefix}-${name}.stage`), backup: path.join(target, `${prefix}-${name}.previous`), saved: false, installed: false }));
  try {
    for (const item of staged) {
      fs.writeFileSync(item.stage, item.body, { flag: "wx", mode: platform === "darwin" ? 0o755 : 0o666 });
      if (platform === "darwin") fs.chmodSync(item.stage, 0o755);
    }
    for (const item of staged) {
      if (lstatOrNull(item.file)) {
        fs.renameSync(item.file, item.backup);
        item.saved = true;
      }
      fs.renameSync(item.stage, item.file);
      item.installed = true;
    }
  } catch (error) {
    const recovery = [];
    for (const item of [...staged].reverse()) {
      try {
        if (item.installed) fs.unlinkSync(item.file);
        if (item.saved) fs.renameSync(item.backup, item.file);
      } catch (restoreError) {
        recovery.push(`${item.file}: ${restoreError.message}${item.saved ? `; prior launcher saved at ${item.backup}` : ""}`);
      }
    }
    for (const item of staged) {
      try { if (lstatOrNull(item.stage)) fs.unlinkSync(item.stage); } catch (cleanupError) { recovery.push(`${item.stage}: ${cleanupError.message}`); }
    }
    throw new Error(`Could not install AGS launchers in ${target}: ${error.message}. ${recovery.length ? `Recovery required: ${recovery.join("; ")}` : "Prior launchers were preserved."} Choose a writable --bin <absolute-directory> or restore write permission before retrying.`);
  }
  const cleanup = [];
  for (const item of staged) {
    try { if (item.saved) fs.unlinkSync(item.backup); } catch (error) { cleanup.push(`${item.backup}: ${error.message}`); }
  }
  if (cleanup.length) throw new Error(`AGS launchers are installed in ${target}, but prior-launcher cleanup failed: ${cleanup.join("; ")}`);
  return { binDir: target, scriptPath: script, written: staged.map((item) => item.file), onPath: pathIncludes(process.env.Path || process.env.PATH, target, { platform }) };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
export function installerHelp() {
  return process.platform === "win32" ? "node .\\scripts\\install-global.mjs [--bin <absolute-directory>] [--replace]" : "node ./scripts/install-global.mjs [--bin <absolute-directory>] [--replace]";
}

if (invoked) {
  try {
    const flags = parseInstallArgs(process.argv.slice(2));
    if (flags.help) {
      console.log(installerHelp());
    } else {
      assertSupportedPlatform();
      const binDir = resolveInstallBin({ bin: flags.bin });
      const result = installGlobal({ binDir, scriptPath: flags.script || entry, replace: Boolean(flags.replace) });
      console.log(`AGS checkout entry: ${result.scriptPath}`);
      for (const file of result.written) console.log(file);
      const warning = pathWarning(result.binDir, { processPath: process.env.Path || process.env.PATH || "", persistedPath: persistedUserPath() });
      if (warning === "restart") {
        console.error(`Warning: ${result.binDir} is saved in your user PATH, but this terminal was started before that. Restart the terminal app. A new tab still inherits the old PATH.`);
      } else if (warning === "missing") {
        console.error(process.platform === "win32" ? `Warning: ${result.binDir} is not on PATH. Add it to your user PATH (pnpm setup when using PNPM_HOME), then restart the terminal.` : `Warning: ${result.binDir} is not on PATH. Add that directory to PATH in your shell environment, then start a new shell.`);
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
