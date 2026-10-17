import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectEvidence, whenMatches, packageScriptInvocation, runPackageScript } from "../scripts/lib/packages.mjs";
import { packageScriptInvocation as helperInvocation, runChecks } from "../skills/check/scripts/run-checks.mjs";
import { REAL_ROOT, tempDir, writeExecutable } from "./helpers/fixtures.mjs";

function withPath(directory, callback) {
  const prior = process.env.PATH;
  process.env.PATH = directory;
  try { return callback(); }
  finally {
    if (prior == null) delete process.env.PATH;
    else process.env.PATH = prior;
  }
}

test("detection predicates: package, lockFile and repoName", () => {
  const when = { any: [{ package: "@platform/ui-library" }, { lockFile: "pnpm-lock.yaml" }, { repoName: "ui-library" }] };
  const host = tempDir("ags-ev-");
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }));
  fs.writeFileSync(path.join(host, "pnpm-lock.yaml"), "lock\n");
  const evidence = detectEvidence(host);
  assert.equal(whenMatches(when, evidence), true);
  assert.equal(whenMatches({ any: [{ package: "missing" }] }, evidence), false);
  assert.equal(whenMatches({ any: [{ repoName: "nope" }] }, { ...evidence, packages: new Set(), locks: new Set() }), false);
  const renamed = path.join(tempDir("ags-repo-"), "ui-library");
  fs.mkdirSync(renamed);
  assert.equal(detectEvidence(renamed).repoName, "ui-library");
  assert.equal(whenMatches({ any: [{ repoName: "UI-Library" }] }, detectEvidence(renamed)), true);
});

test("repository and standalone check invocations select the native package manager and reject unsafe scripts", () => {
  for (const manager of ["npm", "pnpm", "yarn"]) {
    const command = packageScriptInvocation(manager, "lint:check");
    assert.deepEqual(command, helperInvocation(manager, "lint:check"));
    assert.equal(command.executable, `${manager}${process.platform === "win32" ? ".cmd" : ""}`);
    assert.deepEqual(command.args, ["run", "lint:check"]);
    if (process.platform === "win32") assert.deepEqual(command.fallback.slice(-3), [`${manager}.cmd`, "run", "lint:check"]);
    else assert.equal(command.fallback, null);
  }
  for (const unsafe of ["type check", "a&b", "a|b", "a%b", "a!b", "a$b", "a`b", "../lint"]) {
    assert.throws(() => packageScriptInvocation("npm", unsafe), /Unsafe package script/);
    assert.throws(() => helperInvocation("npm", unsafe), /Unsafe package script/);
  }
});

test("native package execution and standalone checks keep argument arrays, output and failing status for every manager", () => {
  const root = tempDir("ags-native-checks-");
  const bin = tempDir("ags-native-managers-");
  for (const manager of ["npm", "pnpm", "yarn"]) writeExecutable(bin, manager, {
    nodeBody: "process.stdout.write(JSON.stringify(process.argv.slice(2))); process.stderr.write('backend diagnostic\\n'); process.exit(7);\n",
  });
  withPath(bin, () => {
    for (const manager of ["npm", "pnpm", "yarn"]) {
      fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ packageManager: `${manager}@1.0.0`, scripts: { "type:check": "placeholder" } }));
      const direct = runPackageScript(root, manager, "type:check");
      assert.equal(direct.status, 7, direct.error?.message || direct.stderr);
      assert.deepEqual(JSON.parse(direct.stdout), ["run", "type:check"]);
      assert.equal(direct.stderr, "backend diagnostic\n");
      assert.equal(direct.failureReason, null);
      const [checked] = runChecks(root, { type: "type:check" }, { which: ["type"] });
      assert.equal(checked.status, "failed");
      assert.equal(checked.exitCode, direct.status);
      assert.equal(checked.stdout, direct.stdout);
      assert.equal(checked.stderr, direct.stderr);
      assert.match(checked.diagnostics, /backend diagnostic/);
    }
  });
});

test("copied check helper runs independently of AGS using native manager bins", () => {
  const root = tempDir("ags-copied-check-");
  const bin = tempDir("ags-copied-managers-");
  const helper = path.join(root, "run-checks.mjs");
  fs.copyFileSync(path.join(REAL_ROOT, "skills/check/scripts/run-checks.mjs"), helper);
  for (const manager of ["npm", "pnpm", "yarn"]) {
    writeExecutable(bin, manager, { stdout: "native-check\n" });
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ packageManager: `${manager}@1.0.0`, scripts: { "type:check": "placeholder" } }));
    const result = spawnSync(process.execPath, [helper, "--type", "type:check"], { cwd: root, env: { ...process.env, PATH: bin }, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /native-check/);
    assert.match(result.stdout, /type: passed/);
    assert.equal(fs.existsSync(path.join(root, ".agents")), false);
  }
});

test("unavailable native managers fail clearly without a POSIX Windows-shell fallback", { skip: process.platform === "win32" ? "POSIX-native absence/fallback coverage requires macOS execution" : false }, () => {
  const root = tempDir("ags-unavailable-manager-");
  const bin = tempDir("ags-empty-manager-path-");
  const trap = writeExecutable(bin, "cmd-trap", { stdout: "unexpected Windows shell" });
  const prior = process.env.ComSpec;
  process.env.ComSpec = trap;
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ packageManager: "npm@1.0.0", scripts: { lint: "placeholder" } }));
  try {
    withPath(bin, () => {
      const direct = runPackageScript(root, "npm", "lint");
      assert.equal(direct.error?.code, "ENOENT");
      assert.match(direct.failureReason, /npm run lint: unavailable; install it and check PATH \(ENOENT\)/);
      assert.equal(direct.stdout ?? "", "");
      const [checked] = runChecks(root, { lint: "lint" }, { which: ["lint"] });
      assert.equal(checked.status, "unavailable");
      assert.match(checked.diagnostics, /check PATH/);
      assert.doesNotMatch(checked.diagnostics, /unexpected Windows shell/);
    });
  } finally {
    if (prior == null) delete process.env.ComSpec;
    else process.env.ComSpec = prior;
  }
});

test("denied and signal-terminated POSIX package managers retain intelligible diagnostics", { skip: process.platform === "win32" ? "POSIX-native permissions and signals require macOS execution" : false }, () => {
  const root = tempDir("ags-manager-failure-");
  const bin = tempDir("ags-failing-managers-");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ packageManager: "npm@1.0.0", scripts: { lint: "placeholder" } }));
  const executable = writeExecutable(bin, "npm");
  try {
    fs.chmodSync(executable, 0o644);
    withPath(bin, () => {
      const direct = runPackageScript(root, "npm", "lint");
      assert.equal(direct.error?.code, "EACCES");
      assert.match(direct.failureReason, /check file permissions/);
      const [checked] = runChecks(root, { lint: "lint" }, { which: ["lint"] });
      assert.equal(checked.status, "unavailable");
      assert.match(checked.diagnostics, /EACCES/);
    });
  } finally { fs.chmodSync(executable, 0o755); }
  writeExecutable(bin, "npm", { nodeBody: "process.kill(process.pid, 'SIGTERM');\n" });
  withPath(bin, () => {
    const direct = runPackageScript(root, "npm", "lint");
    assert.equal(direct.signal, "SIGTERM");
    assert.match(direct.failureReason, /terminated by signal SIGTERM/);
    const [checked] = runChecks(root, { lint: "lint" }, { which: ["lint"] });
    assert.equal(checked.status, "failed");
    assert.equal(checked.exitCode, 1);
    assert.match(checked.diagnostics, /terminated by signal SIGTERM/);
  });
});
