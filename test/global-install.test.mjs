import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { assertSupportedPlatform, assertWindowsDir, installGlobal, pathIncludes, resolveInstallBin, shimFiles } from "../scripts/install-global.mjs";
import { nativeDirectoryLink, tempDir, withDeniedAccess } from "./helpers/fixtures.mjs";

const native = ["win32", "darwin"].includes(process.platform);
const unsupported = native ? false : "No native Windows/macOS installer evidence on this platform";

function fixture(t) {
  const root = tempDir("ags-launcher-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const checkout = path.join(root, "Cópia ' $ ` % ! (checkout)");
  const bin = path.join(root, "bin directory");
  const cwd = path.join(root, "outside checkout");
  fs.mkdirSync(checkout);
  fs.mkdirSync(bin);
  fs.mkdirSync(cwd);
  const script = path.join(checkout, "probe.mjs");
  fs.writeFileSync(script, "process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }));\nprocess.exit(Number(process.env.AGS_LAUNCH_EXIT || 0));\n");
  return { root, checkout, bin, cwd, script };
}

function bytesIn(dir) {
  return Object.fromEntries(fs.readdirSync(dir).map((name) => [name, fs.readFileSync(path.join(dir, name)).toString("base64")]));
}

function powershell(file, args, options = {}) {
  const literal = (value) => `'${value.replaceAll("'", "''")}'`;
  const source = `$agsValues = @(${args.map(literal).join(", ")}); & ${literal(file)} @agsValues; exit $LASTEXITCODE`;
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(source, "utf16le").toString("base64")], { encoding: "utf8", windowsHide: true, ...options });
}

function cmd(file, args, options = {}) {
  const literal = (value) => `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
  const source = `"${literal(file)} ${args.map(literal).join(" ")}"`;
  return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", source], { encoding: "utf8", windowsHide: true, windowsVerbatimArguments: true, ...options });
}

test("installer platform policy and original absolute-bin input are explicit", () => {
  assert.doesNotThrow(() => assertSupportedPlatform("win32"));
  assert.doesNotThrow(() => assertSupportedPlatform("darwin"));
  for (const platform of ["linux", "android", "freebsd"]) assert.throws(() => assertSupportedPlatform(platform), /Windows and macOS only/);
  for (const value of ["relative", "C:relative", "\\relative", "", true, "C:\\bad\0path"]) assert.throws(() => assertWindowsDir(value), /absolute Windows directory/);
  assert.equal(assertWindowsDir("C:\\Users\\person\\bin"), "C:\\Users\\person\\bin");
  assert.equal(assertWindowsDir("\\\\server\\share\\bin"), "\\\\server\\share\\bin");
  for (const value of ["relative", "C:\\bin", true, ""]) assert.throws(() => resolveInstallBin({ platform: "darwin", bin: value, skipCommand: true }), /absolute macOS directory/);
  assert.throws(() => resolveInstallBin({ platform: "win32", bin: "relative", env: { PNPM_HOME: "C:\\valid" }, skipCommand: true }), /absolute Windows directory/);
});

test("macOS bin policy follows explicit, PNPM_HOME, pnpm and home precedence", () => {
  const resolve = (options) => resolveInstallBin({ platform: "darwin", skipCommand: true, env: { HOME: "/Users/person" }, ...options });
  assert.equal(resolve({ bin: "/explicit", env: { PNPM_HOME: "/pnpm-home", HOME: "/Users/person" }, pnpmGlobalBin: "/pnpm-bin" }), "/explicit");
  assert.equal(resolve({ env: { PNPM_HOME: "/pnpm-home", HOME: "/Users/person" }, pnpmGlobalBin: "/pnpm-bin" }), "/pnpm-home");
  assert.equal(resolve({ pnpmGlobalBin: "/pnpm-bin" }), "/pnpm-bin");
  assert.equal(resolve({}), "/Users/person/.local/bin");
  assert.throws(() => resolve({ env: { PNPM_HOME: "relative", HOME: "/Users/person" } }), /absolute macOS directory/);
});

test("generated launchers retain native forms and literal checkout characters", () => {
  const mac = shimFiles("/Users/person/AGS ' $ ` \\ quote/ags.mjs", { platform: "darwin" });
  assert.deepEqual(Object.keys(mac), ["ags"]);
  assert.match(mac.ags, /^#!\/bin\/sh\n/);
  assert.equal(mac.ags.includes("\r"), false);
  assert.match(mac.ags, /exec node -e '.*' -- "\$@"\n$/);
  assert.equal(mac.ags.includes("'\\''"), true);
  assert.equal(mac.ags.includes("\\ quote"), true);
  const windows = shimFiles("C:\\Cópia ' $ ` % !\\ags.mjs", { platform: "win32" });
  assert.deepEqual(Object.keys(windows), ["ags.CMD", "ags.ps1", "ags"]);
  assert.match(windows["ags.CMD"], /DisableDelayedExpansion/);
  assert.match(windows["ags.CMD"], /Buffer\.from\('[A-Za-z0-9+/=]+','base64'\)/);
  assert.equal(windows["ags.ps1"].charCodeAt(0), 0xfeff, "Windows PowerShell 5 requires a UTF-8 BOM for Unicode source paths");
  assert.match(windows["ags.ps1"], /Cópia '' \$ ` % !/);
});

test("PATH parsing uses the selected platform's delimiter without lowercasing POSIX paths", () => {
  assert.equal(pathIncludes("/Users/AGS/bin:/other", "/Users/AGS/bin", { platform: "darwin" }), true);
  assert.equal(pathIncludes("/Users/AGS/bin:/other", "/Users/ags/bin", { platform: "darwin" }), false);
  assert.equal(pathIncludes("C:\\one;C:\\bin", "C:\\bin", { platform: "win32" }), true);
  assert.equal(pathIncludes("%AGS_BIN%;C:\\other", "C:\\bin", { platform: "win32", env: { ags_bin: "C:\\bin" } }), true);
});

test("same-checkout reinstall is allowed, while unrelated bytes and another checkout require replacement", { skip: unsupported }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const before = bytesIn(f.bin);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  assert.deepEqual(bytesIn(f.bin), before);
  const other = path.join(f.root, "other.mjs");
  fs.writeFileSync(other, "process.exit(0);\n");
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: other }), /--replace/);
  assert.deepEqual(bytesIn(f.bin), before);
  fs.appendFileSync(path.join(f.bin, "ags"), `# unrelated launcher mentioning ${f.script}\n`);
  const unrelated = bytesIn(f.bin);
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: f.script }), /--replace/);
  assert.deepEqual(bytesIn(f.bin), unrelated);
  installGlobal({ binDir: f.bin, scriptPath: f.script, replace: true });
  assert.deepEqual(bytesIn(f.bin), before);
});

test("old exact Windows shim formats remain owned during reinstall", { skip: process.platform !== "win32" }, (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.bin, "ags.CMD"), `@ECHO off\r\nnode "${f.script}" %*\r\n`);
  fs.writeFileSync(path.join(f.bin, "ags.ps1"), `& node "${f.script}" @args\r\nif ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE }\r\n`);
  fs.writeFileSync(path.join(f.bin, "ags"), `#!/bin/sh\nexec node "${f.script.replaceAll("\\", "/")}" "$@"\n`);
  assert.doesNotThrow(() => installGlobal({ binDir: f.bin, scriptPath: f.script }));
});

test("bin PATH and owned launcher identity follow real native directory aliases", { skip: unsupported }, (t) => {
  const f = fixture(t);
  const alias = path.join(f.root, "alias");
  if (!nativeDirectoryLink(t, f.checkout, alias)) return;
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  assert.doesNotThrow(() => installGlobal({ binDir: f.bin, scriptPath: path.join(alias, "probe.mjs") }));
  const binAlias = path.join(f.root, "bin-alias");
  if (!nativeDirectoryLink(t, f.bin, binAlias)) return;
  assert.equal(pathIncludes(binAlias, f.bin), true);
});

test("dangling launcher links collide and explicit replacement never follows their target", { skip: unsupported }, (t) => {
  const f = fixture(t);
  const missing = path.join(f.root, "missing-destination");
  const launcher = path.join(f.bin, "ags");
  if (!nativeDirectoryLink(t, missing, launcher)) return;
  assert.equal(fs.existsSync(launcher), false);
  assert.equal(fs.lstatSync(launcher).isSymbolicLink(), true);
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: f.script }), /--replace/);
  assert.equal(fs.lstatSync(launcher).isSymbolicLink(), true);
  installGlobal({ binDir: f.bin, scriptPath: f.script, replace: true });
  assert.equal(fs.lstatSync(launcher).isFile(), true);
  assert.equal(fs.existsSync(missing), false);
});

test("launcher directories and invalid inputs are refused before any launcher write", { skip: unsupported }, (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.bin, "ags"));
  fs.writeFileSync(path.join(f.bin, "ags", "keep.txt"), "keep\n");
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: f.script, replace: true }), /replace a directory/);
  assert.deepEqual(fs.readdirSync(f.bin), ["ags"]);
  assert.equal(fs.readFileSync(path.join(f.bin, "ags", "keep.txt"), "utf8"), "keep\n");
  assert.throws(() => installGlobal({ binDir: "relative", scriptPath: f.script }), /absolute/);
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: path.join(f.root, "missing.mjs") }), /Missing ags entry/);
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: f.script, platform: process.platform === "win32" ? "darwin" : "win32" }), /native Windows or macOS/);
});

test("replacement failure restores all prior launcher bytes and removes stages", { skip: unsupported }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const before = bytesIn(f.bin);
  const rename = fs.renameSync;
  let failed = false;
  fs.renameSync = (from, to) => {
    if (!failed && from.endsWith(".stage") && path.basename(to) === (process.platform === "win32" ? "ags.ps1" : "ags")) {
      failed = true;
      const error = new Error("Injected launcher replacement denial");
      error.code = "EACCES";
      throw error;
    }
    return rename(from, to);
  };
  try {
    assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: f.script }), (error) => {
      assert.match(error.message, /Prior launchers were preserved/);
      assert.match(error.message, /Choose a writable --bin <absolute-directory>/);
      return true;
    });
  } finally {
    fs.renameSync = rename;
  }
  assert.equal(failed, true);
  assert.deepEqual(bytesIn(f.bin), before);
});

test("native denied bin writes preserve prior launchers with restored permissions", { skip: unsupported }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const before = bytesIn(f.bin);
  const nested = path.join(f.bin, "not-created");
  const outcome = withDeniedAccess(f.bin, { access: "write" }, () => {
    assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: f.script }), (error) => {
      assert.match(error.message, /Could not install AGS launchers.*Prior launchers were preserved/);
      assert.match(error.message, /Choose a writable --bin <absolute-directory>/);
      return true;
    });
    assert.throws(() => installGlobal({ binDir: nested, scriptPath: f.script }), (error) => {
      assert.match(error.message, /Could not create AGS launcher directory/);
      assert.match(error.message, /Choose a writable --bin <absolute-directory>; no launchers were written/);
      return true;
    });
  });
  if (!outcome.available) {
    t.diagnostic(outcome.reason);
    t.skip("Required native permission-denial evidence unavailable; portability gate remains pending");
  }
  assert.deepEqual(bytesIn(f.bin), before);
  assert.equal(fs.existsSync(nested), false);
});

test("Windows PowerShell preserves every parsed argument, Unicode checkout paths, cwd and child status", { skip: process.platform !== "win32" }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const argv = ["", "Unicode: 日本語", "two words", "literal 'single'", 'literal "double"', "$cash", "`tick`", "& | < > ^ ( ) ! %", "back\\slash", "trailing\\", 'slashes\\\\"quote'];
  const result = powershell(path.join(f.bin, "ags.ps1"), argv, { cwd: f.cwd, env: { ...process.env, AGS_LAUNCH_EXIT: "7" } });
  assert.equal(result.status, 7, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { argv, cwd: f.cwd });
});

test("Windows CMD preserves parsed empty/quoted arguments, native checkout literals and child status", { skip: process.platform !== "win32" }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const argv = ["", "two words", "日本語", "'single'", 'say "double"', "$cash", "`tick`", "literal & | < > ^ ( ) !", "trailing\\"];
  const result = cmd(path.join(f.bin, "ags.CMD"), argv, { cwd: f.cwd, env: { ...process.env, AGS_LAUNCH_EXIT: "8" } });
  assert.equal(result.status, 8, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { argv, cwd: f.cwd });
});

test("native macOS sh/zsh execute the executable LF launcher with unchanged argv and status", { skip: process.platform !== "darwin" }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const launcher = path.join(f.bin, "ags");
  assert.equal(fs.statSync(launcher).mode & 0o111, 0o111);
  const argv = ["", "日本語", "two words", "literal 'single'", 'literal "double"', "$cash", "`tick`", "& | < > ; ( ) ! %", "back\\slash", "trailing\\"];
  const literal = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  for (const shell of ["/bin/sh", "/bin/zsh"]) {
    const result = spawnSync(shell, ["-c", `exec ${[launcher, ...argv].map(literal).join(" ")}`], { encoding: "utf8", cwd: f.cwd, env: { ...process.env, AGS_LAUNCH_EXIT: "9" } });
    assert.equal(result.status, 9, `${shell}: ${result.error?.message || result.stderr}`);
    assert.deepEqual(JSON.parse(result.stdout), { argv, cwd: f.cwd });
  }
});

test("moved checkout launchers fail actionably and reinstall the new path", { skip: unsupported }, (t) => {
  const f = fixture(t);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const moved = path.join(f.root, "moved checkout");
  fs.renameSync(f.checkout, moved);
  const invoke = () => process.platform === "win32" ? powershell(path.join(f.bin, "ags.ps1"), [], { cwd: f.cwd }) : spawnSync(path.join(f.bin, "ags"), [], { cwd: f.cwd, encoding: "utf8" });
  const stale = invoke();
  assert.equal(stale.status, 1, stale.stderr);
  assert.match(stale.stderr, /Missing AGS checkout entry.*reinstall/);
  const next = path.join(moved, "probe.mjs");
  assert.throws(() => installGlobal({ binDir: f.bin, scriptPath: next }), /--replace/);
  installGlobal({ binDir: f.bin, scriptPath: next, replace: true });
  const fresh = invoke();
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.deepEqual(JSON.parse(fresh.stdout), { argv: [], cwd: f.cwd });
});

test("native launchers diagnose missing static dependencies with a pnpm remedy and no entry writes", { skip: unsupported }, (t) => {
  const f = fixture(t);
  const body = 'import fs from "node:fs";\nimport "ags-fixture-dependency-that-does-not-exist-v5";\nfs.writeFileSync("unexpected-output.txt", "written");\n';
  fs.writeFileSync(f.script, body);
  installGlobal({ binDir: f.bin, scriptPath: f.script });
  const before = bytesIn(f.bin);
  const commands = process.platform === "win32"
    ? [() => cmd(path.join(f.bin, "ags.CMD"), [], { cwd: f.cwd }), () => powershell(path.join(f.bin, "ags.ps1"), [], { cwd: f.cwd })]
    : ["/bin/sh", "/bin/zsh"].map((shell) => () => spawnSync(shell, [path.join(f.bin, "ags")], { cwd: f.cwd, encoding: "utf8" }));
  for (const invoke of commands) {
    const result = invoke();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /AGS entry or dependency unavailable.*Run pnpm install/);
    assert.equal(fs.existsSync(path.join(f.cwd, "unexpected-output.txt")), false);
  }
  assert.deepEqual(bytesIn(f.bin), before);
  assert.equal(fs.readFileSync(f.script, "utf8"), body);
});
