import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { NATIVE_TESTS, WINDOWS_SKIPS, tapName, inspectTap, overallStatus, assertNativeMac, parseTrialArgs, cleanupScratch } from "../scripts/lib/macos-trial.mjs";

// Obtain real built-in TAP from the executing Node, rather than inventing its syntax.
function tap(body) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // This probe is a standalone Node runner, not a worker of this suite.
  const result = spawnSync(process.execPath, ["--test-reporter=tap", "--input-type=module"], {
    input: `import test from 'node:test'; import assert from 'node:assert/strict';\n${body}`,
    env, encoding: "utf8", windowsHide: true,
  });
  assert.equal(result.error, undefined);
  return result;
}

const passingBody = `${JSON.stringify(NATIVE_TESTS)}.forEach(name => test(name, () => {}));
${JSON.stringify(WINDOWS_SKIPS)}.forEach(name => test(name, {skip: 'Windows only'}, () => {}));`;

test("Mac trial parses current Node TAP, escaped names and named Windows skips", () => {
  const unusual = "actual\nnewline # and \\ name";
  const result = tap(passingBody + `\ntest(${JSON.stringify(unusual)}, () => {});`);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`ok ${NATIVE_TESTS.length + WINDOWS_SKIPS.length + 1} - ${tapName(unusual)}`), result.stdout);
  const evidence = inspectTap(result.stdout);
  assert.equal(evidence.status, "PASS", JSON.stringify(evidence));
  assert.equal(evidence.native.length, NATIVE_TESTS.length);
  assert.ok(evidence.native.every(item => item.state === "PASS"));
  assert.equal(evidence.unexpected.length, 0);
  assert.equal(evidence.counts.skipped, WINDOWS_SKIPS.length);
});

test("Mac trial rejects missing, duplicate and announcement-only native results", () => {
  const names = NATIVE_TESTS.slice(1);
  const missing = tap(`${JSON.stringify(names)}.forEach(name => test(name, () => {}));
test('ordinary', t => t.diagnostic(${JSON.stringify(`ok 99 - ${NATIVE_TESTS[0]}`)}));`);
  assert.equal(inspectTap(missing.stdout).native[0].state, "MISSING");
  assert.equal(inspectTap(missing.stdout).status, "INCOMPLETE");
  const duplicate = tap(passingBody + `test(${JSON.stringify(NATIVE_TESTS[0])}, () => {});`);
  assert.equal(inspectTap(duplicate.stdout).native[0].state, "DUPLICATE");
  assert.equal(inspectTap(duplicate.stdout).status, "INCOMPLETE");
});

test("Mac trial detects static and dynamic skips, TODOs and real assertion failures", () => {
  for (const callback of ["t => t.skip('permission unavailable')", "() => {}", "t => t.todo('pending')", "() => assert.fail('AGS behavior wrong')"]) {
    const options = callback === "() => {}" ? ", {skip: true}" : "";
    const result = tap(`test(${JSON.stringify(NATIVE_TESTS[0])}${options}, ${callback});`);
    const evidence = inspectTap(result.stdout, { exitCode: result.status, required: [NATIVE_TESTS[0]] });
    assert.equal(evidence.status, callback.includes("assert.fail") ? "FAIL" : "INCOMPLETE");
    assert.notEqual(evidence.native[0].state, "PASS");
  }
  const unexpected = tap(passingBody + "test('unexpected native fixture', t => t.skip('link unavailable'));");
  assert.equal(inspectTap(unexpected.stdout).status, "INCOMPLETE");
  assert.equal(inspectTap(unexpected.stdout).unexpected[0].name, "unexpected native fixture");
});

test("Mac trial requires complete TAP and gives process failure precedence", () => {
  const result = tap(passingBody);
  assert.equal(inspectTap(result.stdout.replace(/^1\.\.\d+\r?\n/m, "")).status, "INCOMPLETE");
  assert.equal(inspectTap(result.stdout.replace(/^# duration_ms .*$/m, "")).status, "INCOMPLETE");
  assert.equal(inspectTap("not TAP").status, "INCOMPLETE");
  assert.equal(inspectTap(result.stdout, { exitCode: 1 }).status, "FAIL");
  assert.equal(inspectTap(result.stdout, { allowedSkips: [] }).status, "INCOMPLETE");
});

test("Mac trial result precedence, CLI defaults and native preflight are explicit", () => {
  const phases = Object.fromEntries(["full", "case", "launcher", "cleanup"].map(name => [name, { status: "PASS" }]));
  assert.equal(overallStatus(phases), "PASS");
  assert.equal(overallStatus(phases, true), "INCOMPLETE");
  phases.case.status = "INCOMPLETE";
  assert.equal(overallStatus(phases), "INCOMPLETE");
  phases.full.status = "FAIL";
  assert.equal(overallStatus(phases), "FAIL");
  assert.equal(overallStatus({}), "INCOMPLETE");
  assert.deepEqual(parseTrialArgs([]), {});
  assert.deepEqual(parseTrialArgs(["--out", "some folder"]), { out: "some folder" });
  assert.throws(() => parseTrialArgs(["--profile", "node20"]), /Usage/);
  const native = { platform: "darwin", arch: "arm64", uid: 501, nodeVersion: "24.18.0" };
  assert.doesNotThrow(() => assertNativeMac(native));
  assert.doesNotThrow(() => assertNativeMac({ ...native, nodeVersion: "20.20.2" }));
  assert.throws(() => assertNativeMac({ ...native, platform: "win32" }), /native macOS/);
  assert.throws(() => assertNativeMac({ ...native, arch: "x64" }), /Rosetta/);
  assert.throws(() => assertNativeMac({ ...native, uid: 0 }), /without sudo/);
  assert.throws(() => assertNativeMac({ ...native, nodeVersion: "18.0.0" }), />=20/);
});

test("Mac trial detaches only its image before deletion and preserves failed cleanup", async t => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ags-v5-macos-test-"));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const image = path.join(scratch, "case-sensitive.sparseimage");
  fs.writeFileSync(image, "image");
  const calls = [];
  let failDetach = true;
  const command = async (executable, args, options) => {
    calls.push([executable, ...args]);
    if (args[0] === "info") {
      assert.equal(options.privateOutput, true);
      return { status: 0, stdout: "plist with unrelated paths and non-JSON alias data" };
    }
    if (executable.endsWith("plutil")) {
      assert.equal(args[0], "-extract", "do not convert the complete image inventory to JSON");
      assert.equal(options.privateOutput, true, "unrelated image paths must not enter evidence");
      const values = { images: "2", "images.0.image-path": "/unrelated/image", "images.1.image-path": image,
        "images.1.system-entities": JSON.stringify([{ "dev-entry": "/dev/disk9" }]) };
      assert.ok(args[1] in values);
      return { status: 0, stdout: values[args[1]] };
    }
    assert.deepEqual(args, ["detach", "/dev/disk9"]);
    assert.ok(fs.existsSync(image), "detach must precede image removal");
    return { status: failDetach ? 1 : 0, stdout: "" };
  };
  await assert.rejects(cleanupScratch(scratch, image, command), /Detach \/dev\/disk9 manually/);
  assert.ok(fs.existsSync(image));
  failDetach = false;
  await cleanupScratch(scratch, image, command);
  assert.equal(fs.existsSync(scratch), false);
  assert.equal(calls.filter(call => call.includes("/dev/disk77")).length, 0);
  await assert.rejects(cleanupScratch(os.tmpdir(), undefined, command), /Refusing cleanup/);
});
