import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { backupFiles, backupName, createBackupFolder, readManifest, writeManifest } from "../scripts/lib/backup.mjs";
import { AGENT_LINE, bindDecisions, faultPoints, formatPlan, normalizePlan, parseDecide, planDigest, planItem, runOperation, verifyWrites, writeFileAt } from "../scripts/lib/operation.mjs";
import { agsLockPath, hostLockPath, operationLocks } from "../scripts/lib/reports.mjs";
import { contentHash, readFileOrNull } from "../scripts/lib/util.mjs";
import * as catalogLib from "../scripts/lib/catalog.mjs";
import * as discoveryLib from "../scripts/lib/discovery.mjs";
import * as linksLib from "../scripts/lib/links.mjs";
import * as packagesLib from "../scripts/lib/packages.mjs";
import * as reportsLib from "../scripts/lib/reports.mjs";
import * as utilLib from "../scripts/lib/util.mjs";
import { COMMANDS, main, parseArgs, rerunArgs } from "../scripts/ags.mjs";
import * as installer from "../scripts/install-global.mjs";
import { fakeTerminal, makeHostRepo, REAL_ROOT, runAgs, tempDir, treeSnapshot, withCli } from "./helpers/fixtures.mjs";

function recorder() {
  const out = [];
  return {
    interactive: false,
    out,
    async question() {
      throw new Error("no prompts without a terminal");
    },
    log(line = "") {
      out.push(String(line));
    },
    warn(line = "") {
      out.push(String(line));
    },
    text() {
      return out.join("\n");
    },
  };
}

const TARGET = { "a.txt": "A\n", "b.txt": "B\n", "c.txt": "C\n" };

function syntheticOp(host, ags, { target = TARGET, onInspect = () => {} } = {}) {
  let inspections = 0;
  return {
    name: "sync",
    command: "test sync",
    rerunArgs: ["test", "sync", "--route", host],
    inspect() {
      inspections += 1;
      onInspect(inspections);
      const files = {};
      for (const rel of [...Object.keys(target), "x.txt", "y.txt"]) files[rel] = readFileOrNull(path.join(host, rel));
      return { files };
    },
    plan(state) {
      const items = [];
      for (const [rel, body] of Object.entries(target)) {
        const current = state.files[rel];
        if (current != null && contentHash(current) === contentHash(Buffer.from(body))) continue;
        items.push(planItem({ path: rel, kind: "managed", action: current == null ? "add" : "overwrite", hashes: { H: contentHash(current), S: contentHash(Buffer.from(body)) } }));
      }
      for (const rel of ["x.txt", "y.txt"]) {
        if (state.files[rel] != null && state.files[rel].toString() !== "same\n") {
          items.push(planItem({ path: rel, kind: "managed", choices: ["restore", "ignore"], hashes: { H: contentHash(state.files[rel]) } }));
        }
      }
      return { header: { title: "test sync", host: "fixture" }, items };
    },
    locks: () => operationLocks({ hostRoot: host, agsRoot: ags }),
    async apply(ctx) {
      const writes = ctx.plan.items.filter((item) => item.action || ctx.decisions.get(item.path) === "restore");
      const overwritten = writes.filter((item) => ctx.state.files[item.path] != null).map((item) => item.path);
      if (overwritten.length) {
        const folder = createBackupFolder(host, "sync");
        const files = backupFiles(host, folder, overwritten);
        writeManifest(folder, { operation: "sync", digest: ctx.digest, files });
      }
      const expected = [];
      writes.forEach((item, index) => {
        const body = target[item.path] ?? "same\n";
        writeFileAt(host, item.path, body);
        ctx.done(item.path);
        expected.push({ path: item.path, content: body });
        ctx.faultEach("after-write", index, writes.length);
      });
      verifyWrites(host, expected);
      return [`Wrote ${writes.length} files.`];
    },
  };
}

function scratch(files = {}) {
  const host = makeHostRepo({ files, gitignore: ".tmp/\n" });
  const ags = tempDir("ags-op-ags-");
  return { host, ags };
}

function noLocks(host, ags) {
  assert.equal(fs.existsSync(hostLockPath(host)), false, "host lock left");
  assert.equal(fs.existsSync(agsLockPath(ags)), false, "AGS lock left");
}

test("the digest is stable for equal inputs and changes with any input", () => {
  const items = [planItem({ path: "b.txt", kind: "managed", action: "add", hashes: { S: "1" } }), planItem({ path: path.join("a", "x.txt"), kind: "managed", choices: ["restore", "ignore"], hashes: { H: "2" } })];
  const plan = { header: { host: "h", from: "1.0.0", to: "1.1.0" }, items };
  const digest = planDigest(plan);
  assert.match(digest, /^[0-9a-f]{12}$/);
  assert.equal(planDigest({ header: { to: "1.1.0", from: "1.0.0", host: "h" }, items: [...items].reverse() }), digest);
  assert.equal(normalizePlan(plan).items[0].path, "a/x.txt");
  assert.notEqual(planDigest({ ...plan, header: { ...plan.header, to: "1.2.0" } }), digest);
  assert.notEqual(planDigest({ ...plan, items: [items[0], { ...items[1], hashes: { H: "3" } }] }), digest);
  assert.notEqual(planDigest({ ...plan, items: [{ ...items[0], action: "overwrite" }, items[1]] }), digest);
  assert.notEqual(planDigest({ ...plan, items: [items[0]] }), digest);
});

test("fault points name the first, middle and last file of a stage", () => {
  assert.deepEqual([0, 1, 2].map((index) => faultPoints(index, 3)), [["first"], ["middle"], ["last"]]);
  assert.deepEqual(faultPoints(0, 1), ["first", "middle", "last"]);
  assert.deepEqual(faultPoints(1, 4), ["middle"]);
});

test("--decide values are validated and bound only to items offering the choice", () => {
  assert.throws(() => parseDecide(["x.txt"]), (error) => error.exitCode === 2);
  assert.throws(() => parseDecide(["x.txt=keep"]), (error) => error.exitCode === 2);
  const plan = normalizePlan({ items: [planItem({ path: "x.txt", kind: "managed", choices: ["restore", "ignore"] }), planItem({ path: "y.txt", kind: "managed", choices: ["promote", "restore"] })] });
  const bound = bindDecisions(plan, { decideAll: "ignore" });
  assert.deepEqual([...bound.decisions], [["x.txt", "ignore"]]);
  assert.deepEqual(bound.pending.map((item) => item.path), ["y.txt"]);
  assert.throws(() => bindDecisions(plan, { decide: parseDecide(["x.txt=promote"]) }), (error) => error.exitCode === 2);
  assert.throws(() => bindDecisions(plan, { decide: parseDecide(["z.txt=restore"]) }), (error) => error.exitCode === 2);
});

test("--dry-run, exit 3 and stop take no lock and write nothing", async () => {
  const { host, ags } = scratch({ "a.txt": "old\n", "x.txt": "edited\n" });
  const before = treeSnapshot(host);
  const op = syntheticOp(host, ags);

  const dry = recorder();
  assert.equal(await runOperation(op, { terminal: dry, dryRun: true }), 0);
  assert.match(dry.text(), /Digest: [0-9a-f]{12}/);

  const agent = recorder();
  assert.equal(await runOperation(op, { terminal: agent }), 3);
  const digest = agent.text().match(/Digest: ([0-9a-f]{12})/)[1];
  assert.ok(agent.text().includes(`--plan ${digest}`));
  assert.ok(agent.text().includes("--decide 'x.txt=<restore|ignore>'"));
  assert.ok(agent.text().includes(`--route ${host}`));
  assert.ok(agent.text().includes(AGENT_LINE));

  const stopped = fakeTerminal(["stop"]);
  assert.equal(await runOperation(op, { terminal: stopped }), 0);
  const unconfirmed = fakeTerminal(["ignore", "stop"]);
  assert.equal(await runOperation(op, { terminal: unconfirmed }), 0);

  assert.deepEqual(treeSnapshot(host), before);
  assert.deepEqual(treeSnapshot(ags), {});
  noLocks(host, ags);
});

test("a confirmed plan applies with backups; the rerun needs nothing", async () => {
  const { host, ags } = scratch({ "a.txt": "old\n", "x.txt": "edited\n", "y.txt": "edited\n" });
  const op = syntheticOp(host, ags);
  const first = recorder();
  assert.equal(await runOperation(op, { terminal: first }), 3);
  const digest = first.text().match(/Digest: ([0-9a-f]{12})/)[1];

  const missing = recorder();
  assert.equal(await runOperation(op, { terminal: missing, plan: digest, decide: parseDecide(["x.txt=restore"]) }), 3);
  assert.ok(missing.text().includes("--decide x.txt=restore"));
  assert.ok(missing.text().includes("--decide 'y.txt=<restore|ignore>'"));

  const done = recorder();
  assert.equal(await runOperation(op, { terminal: done, plan: digest, decide: parseDecide(["x.txt=restore"]), decideAll: "ignore" }), 0);
  assert.equal(fs.readFileSync(path.join(host, "a.txt"), "utf8"), "A\n");
  assert.equal(fs.readFileSync(path.join(host, "x.txt"), "utf8"), "same\n");
  assert.equal(fs.readFileSync(path.join(host, "y.txt"), "utf8"), "edited\n");
  noLocks(host, ags);

  const backups = fs.readdirSync(path.join(host, ".tmp", "ags", "backups"));
  assert.equal(backups.length, 1);
  const manifest = readManifest(path.join(host, ".tmp", "ags", "backups", backups[0]));
  assert.equal(manifest.digest, digest);
  assert.deepEqual(manifest.files.map((file) => file.original).sort(), ["a.txt", "x.txt"]);

  const again = recorder();
  const withY = syntheticOp(host, ags, { target: TARGET });
  fs.writeFileSync(path.join(host, "y.txt"), "same\n");
  assert.equal(await runOperation(withY, { terminal: again }), 0);
  assert.match(again.text(), /Nothing to do/);
});

test("a stale --plan exits 3 with the new plan and discards decisions", async () => {
  const { host, ags } = scratch({ "x.txt": "edited\n" });
  const op = syntheticOp(host, ags);
  const out = recorder();
  assert.equal(await runOperation(op, { terminal: out, plan: "000000000000", decide: parseDecide(["x.txt=restore"]) }), 3);
  assert.match(out.text(), /earlier decisions are discarded/);
  assert.ok(!out.text().includes("--decide x.txt=restore"));
  assert.ok(out.text().includes("--decide 'x.txt=<restore|ignore>'"));
  assert.equal(fs.readFileSync(path.join(host, "x.txt"), "utf8"), "edited\n");
});

test("revalidation catches a file changed between plan and apply and releases its locks", async () => {
  const { host, ags } = scratch({ "a.txt": "old\n" });
  const probe = syntheticOp(host, ags);
  const first = recorder();
  await runOperation(probe, { terminal: first });
  const digest = first.text().match(/Digest: ([0-9a-f]{12})/)[1];

  const op = syntheticOp(host, ags, {
    onInspect: (n) => {
      if (n === 2) fs.writeFileSync(path.join(host, "b.txt"), "changed\n");
    },
  });
  const out = recorder();
  assert.equal(await runOperation(op, { terminal: out, plan: digest }), 3);
  assert.match(out.text(), /plan changed before it could be applied/);
  assert.equal(fs.readFileSync(path.join(host, "a.txt"), "utf8"), "old\n");
  noLocks(host, ags);

  const term = fakeTerminal(["yes", "yes"]);
  const again = syntheticOp(host, ags, {
    onInspect: (n) => {
      if (n === 2) fs.writeFileSync(path.join(host, "c.txt"), "changed\n");
    },
  });
  assert.equal(await runOperation(again, { terminal: term }), 0);
  assert.equal(term.prompts.length, 2);
  assert.equal(fs.readFileSync(path.join(host, "c.txt"), "utf8"), "C\n");
});

test("a terminal answers each item, with same-for-all-remaining", async () => {
  const { host, ags } = scratch({ "x.txt": "edited\n", "y.txt": "edited\n" });
  const term = fakeTerminal(["maybe", "restore all", "yes"]);
  assert.equal(await runOperation(syntheticOp(host, ags), { terminal: term }), 0);
  assert.equal(term.remaining(), 0);
  assert.equal(term.prompts.length, 3);
  assert.equal(fs.readFileSync(path.join(host, "y.txt"), "utf8"), "same\n");
});

test("a plan without writes exits 0 without asking", async () => {
  const { host, ags } = scratch(TARGET);
  const term = fakeTerminal([]);
  assert.equal(await runOperation(syntheticOp(host, ags), { terminal: term }), 0);
  assert.equal(term.prompts.length, 0);
});

test("a failed write names completed and pending writes, prints the rerun and releases locks", async () => {
  const { host, ags } = scratch();
  const out = recorder();
  const probe = recorder();
  await runOperation(syntheticOp(host, ags), { terminal: probe });
  const digest = probe.text().match(/Digest: ([0-9a-f]{12})/)[1];
  const code = await runOperation(syntheticOp(host, ags), { terminal: out, plan: digest, env: { AGS_TEST_FAULT: "sync:after-write-middle" } });
  assert.equal(code, 1);
  assert.match(out.text(), /Failed: Injected fault at sync:after-write-middle/);
  assert.match(out.text(), /Completed: a\.txt, b\.txt/);
  assert.match(out.text(), /Not completed: c\.txt/);
  assert.match(out.text(), /Rerun: ags test sync --route/);
  noLocks(host, ags);
  assert.equal(fs.existsSync(path.join(host, "c.txt")), false);
});

test("backup names follow Appendix E.4 and folders never collide", () => {
  assert.equal(backupName(".agents/skills/x/SKILL.md"), "_agents/skills/x/SKILL.md");
  assert.equal(backupName(".cursorrules"), "_cursorrules");
  assert.equal(backupName("AGENTS.md"), "AGENTS.md.bak");
  assert.equal(backupName("pkg/CLAUDE.local.md"), "pkg/CLAUDE.local.md.bak");
  assert.equal(backupName("docs/README.md"), "docs/README.md");
  const host = makeHostRepo({ files: { "AGENTS.md": "a\r\n", ".agents/rules/core.md": "c\n", "loose.txt": "x" } });
  fs.writeFileSync(path.join(host, "loose.txt"), "untracked\n");
  fs.writeFileSync(path.join(host, "new.txt"), "new\n");
  const when = new Date(2026, 8, 28, 9, 5, 7);
  const first = createBackupFolder(host, "update", when);
  const second = createBackupFolder(host, "update", when);
  assert.equal(first.rel, ".tmp/ags/backups/2026-09-28-090507-update");
  assert.equal(second.rel, ".tmp/ags/backups/2026-09-28-090507-update-2");
  const files = backupFiles(host, first, ["AGENTS.md", ".agents/rules/core.md", "new.txt"]);
  writeManifest(first, { operation: "update", from: "1.0.0", to: "1.1.0", digest: "abc", files });
  const manifest = readManifest(first.abs);
  assert.deepEqual(
    manifest.files.map(({ original, backup, tracked, bytes }) => [original, backup, tracked, bytes]),
    [
      ["AGENTS.md", "AGENTS.md.bak", true, 3],
      [".agents/rules/core.md", "_agents/rules/core.md", true, 2],
      ["new.txt", "new.txt", false, 4],
    ],
  );
  assert.equal(manifest.files[0].sha256.length, 64);
  assert.equal(fs.readFileSync(path.join(first.abs, "AGENTS.md.bak"), "utf8"), "a\r\n");
  assert.equal(manifest.operation, "update");
});

test("the V2 parser: repeatable flags, missing values and unknown flags", () => {
  const parsed = parseArgs(["host", "install", "--set", "a.b=1", "--set", "c.d=2", "--dry-run", "--route", "x"]);
  assert.deepEqual(parsed.positionals, ["host", "install"]);
  assert.deepEqual(parsed.flags, { set: ["a.b=1", "c.d=2"], "dry-run": true, route: "x" });
  assert.deepEqual(parseArgs(["--out=x"]).flags, { out: "x" });
  for (const argv of [["--out"], ["--route", "--dry-run"], ["--yes"], ["--route", "a", "--route", "b"]]) {
    assert.throws(() => parseArgs(argv), (error) => error.exitCode === 2, argv.join(" "));
  }
  assert.deepEqual(
    rerunArgs("host update", { set: ["a.b=1"], to: "1.2.0", plan: "abc", decide: ["x=restore"], "dry-run": true, route: "rel" }, "/abs/host"),
    ["host", "update", "--route", "/abs/host", "--set", "a.b=1", "--to", "1.2.0"],
  );
});

test("the CLI maps usage errors to exit 2 and dispatches only registered commands", async () => {
  const term = fakeTerminal([]);
  await assert.rejects(main(["host", "sync"], { terminal: term }), (error) => error.exitCode === 2 && /Unknown command: host sync/.test(error.message));
  COMMANDS.set("test echo", { flags: ["route"], positionals: [0, 2], run: ({ rest, terminal }) => (terminal.log(rest.join(",")), 0) });
  try {
    assert.equal(await main(["test", "echo", "a", "b"], { terminal: term }), 0);
    assert.equal(term.lines.at(-1), "a,b");
    await assert.rejects(main(["test", "echo", "--to", "1.0.0"], { terminal: term }), (error) => error.exitCode === 2);
  } finally {
    COMMANDS.delete("test echo");
  }

  const scratch = withCli(tempDir("ags-cli-"));
  for (const argv of [["host", "sync"], ["host", "repair"], ["skills", "install"], ["skills", "reconcile"], ["reporting", "on"], ["reporting", "status"], ["report", "changes"], ["snapshot", "canonical"], ["doctor", "--bogus"]]) {
    const result = runAgs(scratch, argv);
    assert.equal(result.code, 2, `${argv.join(" ")}: ${result.stderr}`);
  }
  const help = runAgs(scratch, []);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Usage: ags/);
});

test("V1 machinery is gone: no module keeps a V1 helper, and the V1 modules and template are deleted", () => {
  const gone = [
    [utilLib, ["ensureHostTmpIgnored", "commandText", "mapsEqual", "quarantine", "singleLine"]],
    [reportsLib, ["canonicalFile", "appendReport", "reportStamp"]],
    [linksLib, ["crossSkillIds"]],
    [discoveryLib, ["DISCOVERY_ROOTS", "supportedDiscoveryRoots"]],
    [packagesLib, ["assertCheckScript", "proposeCheckScripts", "reduceCheckCommand", "migrateChecks"]],
    [catalogLib, ["catalogById", "includedSkillIds"]],
  ];
  for (const [lib, names] of gone) for (const name of names) assert.equal(name in lib, false, name);
  assert.deepEqual(Object.keys(utilLib).filter((name) => /canonical/i.test(name)), []);
  for (const rel of ["scripts/lib/report-cmd.mjs", "scripts/lib/checks.mjs", "scripts/lib/diff.mjs"]) {
    assert.equal(fs.existsSync(path.join(REAL_ROOT, ...rel.split("/"))), false, rel);
  }
  assert.deepEqual(fs.readdirSync(path.join(REAL_ROOT, "scripts")).sort(), ["ags.mjs", "commands", "install-global.mjs", "lib"]);
  assert.deepEqual(fs.readdirSync(path.join(REAL_ROOT, "templates")).sort(), ["agents-block.md", "ags.yaml"]);
});

test("global install keeps only native shim installation", { skip: !["win32", "darwin"].includes(process.platform) && "Installer requires native Windows/macOS; this OS provides no platform support evidence" }, () => {
  assert.deepEqual(Object.keys(installer).sort(), ["assertSupportedPlatform", "assertWindowsDir", "installGlobal", "installerHelp", "parseInstallArgs", "pathIncludes", "pathWarning", "persistedUserPath", "resolveInstallBin", "shimFiles"]);
  assert.throws(() => installer.assertSupportedPlatform("linux"), /AGS supports Windows and macOS only/);
  const script = path.join(REAL_ROOT, "scripts", "ags.mjs");
  const bin = tempDir("ags-bin-");
  const windows = process.platform === "win32";
  const launcherName = windows ? "ags.CMD" : "ags";
  const result = installer.installGlobal({ binDir: bin, scriptPath: script });
  assert.deepEqual(result.written.map((file) => path.basename(file)).sort(), windows ? ["ags", "ags.CMD", "ags.ps1"] : ["ags"]);
  assert.equal(fs.readFileSync(path.join(bin, launcherName), "utf8"), installer.shimFiles(script)[launcherName]);
  if (!windows) {
    assert.equal(fs.readFileSync(path.join(bin, "ags"), "utf8").includes("\r"), false);
    assert.equal(fs.statSync(path.join(bin, "ags")).mode & 0o111, 0o111);
  }
  assert.match(installer.shimFiles(script).ags, /scripts\/ags\.mjs/);
  const home = tempDir("ags-pnpm-");
  const resolve = (options) => path.resolve(installer.resolveInstallBin({ skipCommand: true, ...options }));
  assert.equal(resolve({ env: { PNPM_HOME: home, LOCALAPPDATA: path.join(home, "local") } }), path.resolve(home));
  assert.equal(resolve({ env: {}, pnpmGlobalBin: home }), path.resolve(home));
  if (windows) assert.equal(resolve({ env: { LOCALAPPDATA: home } }), path.resolve(home, "pnpm"));
  else assert.equal(resolve({ env: { HOME: home } }), path.resolve(home, ".local", "bin"));
  assert.equal(resolve({ bin, env: { PNPM_HOME: home } }), path.resolve(bin));
  assert.throws(() => resolve({ env: {} }), /Could not determine/);
  assert.throws(() => resolve({ bin: "relative/bin", env: {} }), /absolute/);
  const other = tempDir("ags-bin-");
  fs.writeFileSync(path.join(other, launcherName), windows ? "@ECHO off\r\nnode \"C:\\elsewhere\\ags.mjs\" %*\r\n" : "#!/bin/sh\nexec node '/elsewhere/ags.mjs' \"$@\"\n");
  assert.throws(() => installer.installGlobal({ binDir: other, scriptPath: script }), /--replace/);
  assert.match(fs.readFileSync(path.join(other, launcherName), "utf8"), /elsewhere/);
  installer.installGlobal({ binDir: other, scriptPath: script, replace: true });
  assert.equal(fs.readFileSync(path.join(other, launcherName), "utf8"), installer.shimFiles(script)[launcherName]);
  const empty = tempDir("ags-empty-");
  assert.throws(() => installer.installGlobal({ binDir: empty, scriptPath: script, platform: "linux" }), /Windows and macOS only/);
  assert.deepEqual(fs.readdirSync(empty), []);
  assert.deepEqual(installer.parseInstallArgs(["--bin", bin, "--script", script, "--replace", "--help"]), { bin, script, replace: true, help: true });
  assert.throws(() => installer.parseInstallArgs(["--bin"]), /Missing value for --bin/);
  assert.throws(() => installer.parseInstallArgs(["--nope"]), /Unknown installer flag: --nope/);
  assert.equal(installer.installerHelp().includes("--script"), false);
  assert.equal(installer.pathIncludes(`${other}${path.delimiter}${bin}`, bin), true);
  assert.equal(installer.pathWarning(bin, { processPath: "", persistedPath: bin }), "restart");
  assert.equal(installer.pathWarning(bin, { processPath: "", persistedPath: "" }), "missing");
});

test("installer help writes nothing", () => {
  const scratch = withCli(tempDir("ags-installer-"));
  const bin = tempDir("ags-help-bin-");
  const result = spawnSync(process.execPath, [path.join(scratch, "scripts", "install-global.mjs"), "--help"], { encoding: "utf8", windowsHide: true, env: { ...process.env, PNPM_HOME: bin } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /install-global\.mjs \[--bin <absolute-directory>\] \[--replace\]/);
  assert.deepEqual(fs.readdirSync(bin), []);
});

test("the plan table is compact and shows short hashes", () => {
  const plan = normalizePlan({ header: { title: "t" }, items: [planItem({ path: "a.txt", kind: "managed", action: "add", hashes: { S: "f".repeat(64) } })] });
  const lines = formatPlan(plan, "d".repeat(12));
  assert.deepEqual(lines, ["t", "Path   Kind     Action  S", `a.txt  managed  add     ${"f".repeat(12)}`, `Digest: ${"d".repeat(12)}`]);
});
