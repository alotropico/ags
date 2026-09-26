import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { includedSkillIds, parseSelectionReply, validateCatalog } from "../scripts/lib/catalog.mjs";
import { runChecks } from "../scripts/lib/checks.mjs";
import { DISCOVERY_ROOTS } from "../scripts/lib/discovery.mjs";
import { hostPlanPath, installHost, readMainBranch, readSettings, repairHost, resolveRepairTarget, updateHost } from "../scripts/lib/host.mjs";
import { recordChanges, recordUsage } from "../scripts/lib/report-cmd.mjs";
import { withLock } from "../scripts/lib/reports.mjs";
import { installSkill, reconcile } from "../scripts/lib/skills.mjs";
import { readStoredZip, writeSnapshot } from "../scripts/lib/snapshot.mjs";
import { writeCanonicalSnapshot } from "../scripts/snapshot-canonical.mjs";
import { installGlobal, pathWarning, resolveInstallBin } from "../scripts/install-global.mjs";
import { CANONICAL_ROOT, assertSlug, ensureHostTmpIgnored, relativeInside } from "../scripts/lib/util.mjs";
import { loadCatalog } from "../scripts/lib/catalog.mjs";

const REAL = CANONICAL_ROOT;

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function makeCanonical() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ags-canon-"));
  for (const rel of ["catalog.yaml", "AGENTS.md", "README.md", "package.json", "rules/core.md", "templates/host-ags.md", "templates/agents-block.md"]) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(REAL, rel), path.join(root, rel));
  }
  for (const name of fs.readdirSync(path.join(REAL, "skills"))) {
    const from = path.join(REAL, "skills", name);
    const to = path.join(root, "skills", name);
    fs.mkdirSync(to, { recursive: true });
    fs.copyFileSync(path.join(from, "SKILL.md"), path.join(to, "SKILL.md"));
  }
  return root;
}

function makeRepo(name) {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ags-host-")), name);
  fs.mkdirSync(root);
  git(["init"], root);
  fs.writeFileSync(path.join(root, "README.md"), "host\n");
  git(["add", "README.md"], root);
  git(["-c", "user.email=ags@example.test", "-c", "user.name=ags", "commit", "-m", "init"], root);
  return root;
}

test("slug and include validation reject traversal and cycles", () => {
  for (const value of ["../x", "..\\x", "a/b", "a\\b", "C:\\skills", "\\\\server\\share", "", ".."]) {
    assert.throws(() => assertSlug(value, "skill id"));
  }
  const cycle = {
    format: 1,
    rules: "nope",
    skills: [
      { id: "a", kind: "custom", path: "skills/a/SKILL.md", description: "A.", default: false, keywords: ["a"], includes: ["b"] },
      { id: "b", kind: "custom", path: "skills/b/SKILL.md", description: "B.", default: false, keywords: ["b"], includes: ["a", "a"] },
    ],
  };
  const errors = validateCatalog(cycle);
  assert.ok(errors.some((line) => line.includes("rules must be an array")));
  assert.ok(errors.some((line) => line.includes("duplicate include")));
  assert.ok(errors.some((line) => line.includes("include cycle")));
  assert.ok(validateCatalog({
    format: 1,
    rules: [],
    skills: [{ id: "a", kind: "custom", path: "skills/a/SKILL.md", description: "A.", default: false, keywords: ["a"], includes: ["missing"] }],
  }).some((line) => line.includes("unknown id")));
});

test("junction escape is rejected when the account allows it", () => {
  const root = makeCanonical();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ags-out-"));
  fs.writeFileSync(path.join(outside, "SKILL.md"), "---\nname: linked\ndescription: Linked.\n---\n");
  const link = path.join(root, "skills", "linked");
  try {
    fs.symlinkSync(outside, link, "junction");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") return;
    throw error;
  }
  assert.throws(() => relativeInside(root, path.join(link, "SKILL.md")));
});

function writePackage(host, scripts) {
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({
    name: "fixture",
    packageManager: "npm@10.9.2",
    scripts,
  }));
}

test("check settings, failed middle check, and prettier writes nothing", () => {
  const root = makeCanonical();
  const host = makeRepo("check-host");
  const marker = path.join(host, "marker.txt");
  fs.writeFileSync(marker, "same\n");
  writePackage(host, {
    typecheck: "node -e \"process.exit(0)\"",
    lint: "node -e \"process.exit(2)\"",
    "prettier:check": "node -e \"process.exit(0)\"",
  });
  installHost(root, host, {
    yes: true,
    id: "check-host",
    name: "Check",
    mainBranch: "trunk",
    checks: { type: "typecheck", lint: "lint", prettier: "prettier:check" },
  });
  const results = runChecks(root, host);
  assert.deepEqual(results.map((item) => item.status), ["passed", "failed", "passed"]);
  assert.equal(fs.readFileSync(marker, "utf8"), "same\n");
  const partial = makeRepo("partial-check");
  writePackage(partial, { typecheck: "node -e \"process.exit(0)\"" });
  installHost(root, partial, { yes: true, id: "partial-check", name: "Partial", checks: { type: "typecheck" } });
  const partialResults = runChecks(root, partial);
  assert.equal(partialResults[0].status, "passed");
  assert.equal(partialResults[1].status, "not-configured");
  assert.equal(partialResults[2].status, "not-configured");
  const bare = makeRepo("bare-check");
  installHost(root, bare, { yes: true, id: "bare-check", name: "Bare" });
  assert.deepEqual(runChecks(root, bare).map((item) => item.status), ["not-configured", "not-configured", "not-configured"]);
  const invalid = makeRepo("bad-branch");
  assert.throws(() => installHost(root, invalid, { yes: true, id: "bad-branch", name: "Bad", mainBranch: "bad branch" }));
  assert.equal(fs.existsSync(path.join(invalid, ".agents")), false);
  assert.equal(readMainBranch(root, host), "trunk");
  assert.throws(() => readMainBranch(root, bare), /git.mainBranch/);
});

test("repair modes preserve local files and drifted content until overwrite", () => {
  const root = makeCanonical();
  const host = makeRepo("repair-host");
  installHost(root, host, { yes: true, id: "repair-host", name: "Repair", mainBranch: "trunk" });
  fs.writeFileSync(path.join(host, ".agents", "local", "keep.md"), "mine\n");
  fs.writeFileSync(path.join(host, ".agents", "extra.txt"), "extra\n");
  const drifted = "drifted entry\n";
  fs.writeFileSync(path.join(host, ".agents", "AGS.md"), drifted);
  const restored = repairHost(root, host, { yes: true, restoreRequired: true });
  assert.equal(restored.applied, true);
  assert.equal(fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8"), drifted);
  assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
  fs.rmSync(path.join(host, ".agents", "ags.yaml"));
  const missing = resolveRepairTarget(root, "repair-host");
  assert.equal(missing.settings, null);
  repairHost(root, "repair-host", { yes: true, restoreRequired: true });
  assert.equal(readSettings(host).host, "repair-host");
  assert.equal(fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8"), drifted);
  fs.writeFileSync(path.join(host, ".agents", "ags.yaml"), "[\n");
  repairHost(root, host, { yes: true, restoreRequired: true });
  assert.equal(fs.readFileSync(path.join(host, ".agents", "ags.yaml"), "utf8"), "[\n");
  repairHost(root, host, { yes: true, overwriteManaged: true });
  assert.equal(readSettings(host).host, "repair-host");
  assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
  assert.notEqual(fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8"), drifted);
  const settings = readSettings(host);
  settings.reporting = "yes";
  settings.git = { mainBranch: "bad branch" };
  settings.checks = { type: "has\nnewline" };
  settings.skills.enabled = ["missing-skill"];
  const canonicalRoot = readSettings(host).canonicalRoot;
  fs.writeFileSync(path.join(host, ".agents", "ags.yaml"), `format: 1\nhost: repair-host\ncanonicalRoot: ${canonicalRoot}\nreporting: true\nrules:\n  enabled: []\n  disabled: []\nskills:\n  enabled: [missing-skill]\n  disabled: []\n`);
  repairHost(root, host, { yes: true, setting: "skills.enabled", value: "plan-work" });
  assert.deepEqual(readSettings(host).skills.enabled, ["plan-work"]);
  fs.writeFileSync(path.join(host, ".agents", "ags.yaml"), `format: 1\nhost: repair-host\ncanonicalRoot: ${canonicalRoot}\nreporting: "yes"\nrules:\n  enabled: []\n  disabled: []\nskills:\n  enabled: [plan-work]\n  disabled: []\ngit:\n  mainBranch: "bad branch"\nchecks:\n  type: "bad\\ncommand"\n`);
  repairHost(root, host, { yes: true, setting: "reporting", value: "false" });
  assert.equal(readSettings(host).reporting, false);
  repairHost(root, host, { yes: true, setting: "git.mainBranch", value: "trunk" });
  assert.equal(readSettings(host).git.mainBranch, "trunk");
  writePackage(host, { typecheck: "node -e \"process.exit(0)\"" });
  repairHost(root, host, { yes: true, setting: "checks.type", value: "typecheck" });
  assert.equal(readSettings(host).checks.type, "typecheck");
  fs.rmSync(path.join(host, ".agents", "AGS.md"));
  repairHost(root, host, { yes: true, restoreRequired: true });
  assert.match(fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8"), /plan-work/);
  const agents = fs.readFileSync(path.join(host, "AGENTS.md"), "utf8");
  fs.writeFileSync(path.join(host, "AGENTS.md"), agents.replace("Read `.agents/AGS.md`", "Read something else"));
  repairHost(root, host, { yes: true, overwriteManaged: true });
  assert.match(fs.readFileSync(path.join(host, "AGENTS.md"), "utf8"), /Read `\.agents\/AGS\.md`/);
  for (const mode of ["restoreRequired", "overwriteManaged", "removeInvalid", "resetManaged"]) {
    fs.writeFileSync(path.join(host, ".agents", "local", "keep.md"), "mine\n");
    repairHost(root, host, { yes: true, [mode]: true, setting: mode === "setting" ? "reporting" : undefined });
    assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
  }
  repairHost(root, host, { yes: true, removeInvalid: true });
  assert.equal(fs.existsSync(path.join(host, ".agents", "extra.txt")), false);
  assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
});

test("reconcile failure injection keeps a skill copy", async () => {
  const root = makeCanonical();
  const host = makeRepo("inject-host");
  installHost(root, host, { yes: true, id: "inject-host", name: "Inject" });
  const skill = path.join(host, ".agents", "skills", "vendor-skill");
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, "SKILL.md"), "---\nname: vendor-skill\ndescription: Vendor skill.\n---\n\nbody\n");
  const before = fs.readdirSync(path.join(root, ".tmp"), { withFileTypes: true }).map((item) => item.name);
  const dry = await reconcile(root, { route: host, dryRun: true });
  assert.equal(dry.results.some((item) => item.status === "planned"), true);
  const after = fs.existsSync(path.join(root, ".tmp")) ? fs.readdirSync(path.join(root, ".tmp")).map((name) => name) : [];
  assert.deepEqual(after.filter((name) => name.startsWith("skill-stage")), before.filter((name) => name.startsWith("skill-stage")));
  for (const phase of ["staged", "placed", "catalog", "settings"]) {
    await assert.rejects(() => reconcile(root, { route: host, dryRun: false, inject: phase }));
    assert.equal(fs.existsSync(path.join(skill, "SKILL.md")), true);
    assert.equal(fs.existsSync(path.join(root, "skills", "vendor-skill", "SKILL.md")), false);
  }
  await assert.rejects(() => reconcile(root, { route: host, dryRun: false, inject: "quarantine" }));
  assert.equal(fs.existsSync(path.join(skill, "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(root, "skills", "vendor-skill", "SKILL.md")), true);
  fs.rmSync(path.join(root, "skills", "vendor-skill"), { recursive: true, force: true });
  const catalog = fs.readFileSync(path.join(root, "catalog.yaml"), "utf8").replace(/\n {2}- id: vendor-skill[\s\S]*?(?=\n {2}- id: |\n*$)/, "\n");
  fs.writeFileSync(path.join(root, "catalog.yaml"), catalog.includes("vendor-skill") ? catalog : fs.readFileSync(path.join(root, "catalog.yaml"), "utf8"));
  const fresh = makeCanonical();
  const host2 = makeRepo("inject-report");
  installHost(fresh, host2, { yes: true, id: "inject-report", name: "Inject Report" });
  const skill2 = path.join(host2, ".agents", "skills", "vendor-skill");
  fs.mkdirSync(skill2, { recursive: true });
  fs.writeFileSync(path.join(skill2, "SKILL.md"), "---\nname: vendor-skill\ndescription: Vendor skill.\n---\n\nbody\n");
  await assert.rejects(() => reconcile(fresh, { route: host2, dryRun: false, inject: "report" }), /Changed files/);
  assert.equal(fs.existsSync(path.join(fresh, "skills", "vendor-skill", "SKILL.md")), true);
  assert.equal(fs.existsSync(skill2), false);
  assert.doesNotMatch(String((await reconcile(fresh, { route: host2, dryRun: true }).catch((error) => error)).message || ""), /rollback/i);
});

test("reports reject unknown actions, normalize paths, and clear a stale lock", async () => {
  const root = makeCanonical();
  const host = makeRepo("report-hard");
  installHost(root, host, { yes: true, id: "report-hard", name: "Report" });
  const cli = spawnSync(process.execPath, [path.join(REAL, "scripts", "ags.mjs"), "reporting", "nope"], { encoding: "utf8" });
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /Unknown reporting action/);
  const usage = await recordUsage(root, host, { fileArgs: ["rules/core.md=2", "rules\\core.md=7"] });
  assert.equal(usage.record.files.length, 1);
  assert.equal(usage.record.files[0].level, 7);
  const changes = await recordChanges(root, host, { files: ["rules/core.md", "rules\\core.md"], note: "once" });
  assert.equal(changes.record.files.length, 1);
  await assert.rejects(() => recordChanges(root, host, { files: ["rules"], note: "dir" }));
  const lock = path.join(root, "reports", ".locks", "stale.lock");
  fs.mkdirSync(lock, { recursive: true });
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(lock, old, old);
  await withLock(lock, async () => "ok");
  assert.equal(fs.existsSync(lock), false);
});

test("snapshots include companions once and refuse unsafe outputs", () => {
  const root = makeCanonical();
  const host = makeRepo("snap-ui");
  fs.writeFileSync(path.join(host, "pnpm-lock.yaml"), "lock\n");
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({
    name: "fixture",
    packageManager: "npm@10.9.2",
    dependencies: { "@platform/ui-library": "1.0.0" },
    scripts: { lint: "node -e \"process.exit(0)\"" },
  }));
  installHost(root, host, { yes: true, id: "snap-ui", name: "Snap UI", mainBranch: "trunk", checks: { lint: "lint" } });
  const written = writeSnapshot(root, host, loadCatalog(root), readSettings(host), path.join(host, ".tmp", "ui.zip"));
  const names = readStoredZip(fs.readFileSync(written.path)).map((entry) => entry.name);
  assert.equal(names.filter((name) => name.endsWith("css-authoring-conventions/SKILL.md")).length, 1);
  assert.equal(names.filter((name) => name.endsWith("css-theme-tokens/SKILL.md")).length, 1);
  assert.equal(names.filter((name) => name === "manifest.json").length, 1);
  assert.equal(names.some((name) => name.endsWith("pnpm-lock.yaml")), false);
  const settingsEntry = readStoredZip(fs.readFileSync(written.path)).find((entry) => entry.name === "host/.agents/ags.yaml");
  assert.match(settingsEntry.data.toString("utf8"), /trunk/);
  assert.throws(() => writeSnapshot(root, host, loadCatalog(root), readSettings(host), path.join(host, ".tmp", "ui.txt")));
  const skillFile = path.join(root, "skills", "plan-work", "SKILL.md");
  const before = fs.readFileSync(skillFile, "utf8");
  assert.throws(() => writeSnapshot(root, host, loadCatalog(root), readSettings(host), skillFile));
  assert.equal(fs.readFileSync(skillFile, "utf8"), before);
  const repo = makeRepo("canon-manifest");
  fs.writeFileSync(path.join(repo, "manifest.json"), "source\n");
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  const canon = writeCanonicalSnapshot(repo, { out: path.join(repo, ".tmp", "canon.zip") });
  const canonNames = readStoredZip(fs.readFileSync(canon.path)).filter((entry) => entry.name === "manifest.json");
  assert.equal(canonNames.length, 1);
  assert.doesNotMatch(canonNames[0].data.toString("utf8"), /^source/);
});

test("global install resolution stays in temporary directories", () => {
  assert.throws(() => resolveInstallBin({ platform: "linux" }), /Windows only/);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ags-pnpm-"));
  const resolved = resolveInstallBin({ bin: undefined, env: { PNPM_HOME: home, LOCALAPPDATA: path.join(home, "local") }, platform: "win32", skipCommand: true });
  assert.equal(path.resolve(resolved), path.resolve(home));
  const explicit = fs.mkdtempSync(path.join(os.tmpdir(), "ags-bin-"));
  assert.equal(path.resolve(resolveInstallBin({ bin: explicit, platform: "win32" })), path.resolve(explicit));
  const fallback = resolveInstallBin({ env: { LOCALAPPDATA: home }, platform: "win32", skipCommand: true });
  assert.equal(path.resolve(fallback), path.resolve(path.join(home, "pnpm")));
  const script = path.join(REAL, "scripts", "ags.mjs");
  fs.writeFileSync(path.join(explicit, "ags.CMD"), "@ECHO off\r\nnode \"C:\\elsewhere\\ags.mjs\" %*\r\n");
  assert.throws(() => installGlobal({ binDir: explicit, scriptPath: script }));
  assert.match(fs.readFileSync(path.join(explicit, "ags.CMD"), "utf8"), /elsewhere/);
  installGlobal({ binDir: explicit, scriptPath: script, replace: true });
  assert.match(fs.readFileSync(path.join(explicit, "ags.CMD"), "utf8"), /scripts\\ags\.mjs/);
  assert.equal(pathWarning(explicit, { processPath: "", persistedPath: explicit }), "restart");
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "ags-empty-"));
  assert.throws(() => installGlobal({ binDir: empty, scriptPath: script, platform: "linux" }));
  assert.equal(fs.readdirSync(empty).length, 0);
});

test("plan path stays in the host .tmp and skills read trunk", () => {
  const root = makeCanonical();
  const host = makeRepo("plan-host");
  installHost(root, host, { yes: true, id: "plan-host", name: "Plan", mainBranch: "trunk" });
  const gitignore = path.join(host, ".gitignore");
  const before = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf8") : null;
  const plan = hostPlanPath(root, host, "feature-plan.md");
  assert.equal(path.resolve(plan), path.join(path.resolve(host), ".tmp", "feature-plan.md"));
  assert.ok(!path.resolve(plan).toLowerCase().startsWith(path.resolve(root, ".tmp").toLowerCase()));
  const exclude = git(["rev-parse", "--git-path", "info/exclude"], host);
  const excludeFile = path.isAbsolute(exclude) ? exclude : path.resolve(host, exclude);
  assert.match(fs.readFileSync(excludeFile, "utf8"), /AGS:BEGIN\r?\n\/\.tmp\/\r?\n# AGS:END/);
  assert.equal(fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf8") : null, before);
  ensureHostTmpIgnored(host);
  assert.equal(fs.readFileSync(excludeFile, "utf8").split("AGS:BEGIN").length - 1, 1);
  assert.match(fs.readFileSync(path.join(REAL, "skills", "ship", "SKILL.md"), "utf8"), /git\.mainBranch/);
  assert.match(fs.readFileSync(path.join(REAL, "skills", "git-cleanup", "SKILL.md"), "utf8"), /git\.mainBranch/);
  assert.equal(readMainBranch(root, host), "trunk");
  const plain = makeRepo("plain-css");
  const preview = installHost(root, plain, { yes: false, id: "plain-css", name: "Plain" });
  assert.equal(preview.plan.offered.includes("ui-library-css"), false);
  assert.ok(preview.plan.offered.includes("css-authoring-conventions"));
  const none = parseSelectionReply("none", preview.plan.offeredCustom, ["plan-work"]);
  assert.deepEqual(none.disable, ["plan-work"]);
  assert.equal(parseSelectionReply("nope", ["plan-work"], ["plan-work"]).error.includes("nope"), true);
  const ids = includedSkillIds(loadCatalog(root), ["ui-library-css"]);
  assert.deepEqual(ids, ["css-authoring-conventions", "css-cleanup", "css-theme-tokens"]);
  const updated = makeRepo("keep-settings");
  writePackage(updated, {
    typecheck: "node -e \"process.exit(0)\"",
    lint: "node -e \"process.exit(0)\"",
  });
  installHost(root, updated, { yes: true, id: "keep-settings", name: "Keep", mainBranch: "trunk", checks: { type: "typecheck" } });
  updateHost(root, updated, { yes: true, mainBranch: "other", checks: { lint: "lint" } });
  const settings = readSettings(updated);
  assert.equal(settings.git.mainBranch, "trunk");
  assert.equal(settings.checks.type, "typecheck");
  assert.equal(settings.checks.lint, "lint");
  assert.ok(DISCOVERY_ROOTS.some((item) => item.path === ".agents/skills" && item.state === "supported"));
  assert.ok(DISCOVERY_ROOTS.some((item) => item.state === "unresolved"));
});
