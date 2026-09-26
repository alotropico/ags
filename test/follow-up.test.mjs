import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { includedSkillIds, loadCatalog } from "../scripts/lib/catalog.mjs";
import { runChecks } from "../scripts/lib/checks.mjs";
import { emptyTreeId, writeDiff } from "../scripts/lib/diff.mjs";
import { doctor } from "../scripts/lib/doctor.mjs";
import { hostPlanPath, installHost, readSettings, repairHost, splitSetting, updateHost } from "../scripts/lib/host.mjs";
import { finishInstall, parseInstallArgs } from "../scripts/install-global.mjs";
import { installSkill, reconcile } from "../scripts/lib/skills.mjs";
import { isStandardSensitivePath, readStoredZip, writeSnapshot } from "../scripts/lib/snapshot.mjs";
import { writeCanonicalSnapshot } from "../scripts/snapshot-canonical.mjs";
import { CANONICAL_ROOT, writeYamlAtomic } from "../scripts/lib/util.mjs";

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
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(REAL, "scripts", "ags.mjs"), path.join(root, "scripts", "ags.mjs"));
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

test("install and update leave an existing CLAUDE.md untouched", () => {
  const root = makeCanonical();
  const host = makeRepo("claude-left");
  const notes = "# Notes\n\nKeep me.\n";
  fs.writeFileSync(path.join(host, "CLAUDE.md"), notes);
  installHost(root, host, { yes: true, id: "claude-left", name: "Left" });
  assert.equal(fs.readFileSync(path.join(host, "CLAUDE.md"), "utf8"), notes);
  assert.equal(readSettings(host).adapters, undefined);
  updateHost(root, host, { yes: true });
  assert.equal(fs.readFileSync(path.join(host, "CLAUDE.md"), "utf8"), notes);
  assert.equal(fs.existsSync(path.join(host, "AGENTS.md")), true);
});

test("canonical snapshot excludes sensitive paths unless asked", () => {
  const repo = makeRepo("canon-sensitive");
  fs.writeFileSync(path.join(repo, ".gitignore"), ".env.ignored\n");
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  fs.writeFileSync(path.join(repo, "pnpm-lock.yaml"), "lock\n");
  fs.writeFileSync(path.join(repo, ".env.production"), "SECRET\n");
  fs.writeFileSync(path.join(repo, ".env.ignored"), "HIDDEN\n");
  fs.writeFileSync(path.join(repo, "hosts.yaml"), "hosts\n");
  fs.mkdirSync(path.join(repo, "reports"), { recursive: true });
  fs.writeFileSync(path.join(repo, "reports", "note.txt"), "report\n");
  fs.mkdirSync(path.join(repo, "node_modules", "pkg"), { recursive: true });
  fs.writeFileSync(path.join(repo, "node_modules", "pkg", "index.js"), "x\n");
  git(["add", "-f", ".env.production", "hosts.yaml", "reports/note.txt", "node_modules/pkg/index.js", "package.json", "pnpm-lock.yaml"], repo);
  git(["-c", "user.email=ags@example.test", "-c", "user.name=ags", "commit", "-m", "files"], repo);
  assert.equal(isStandardSensitivePath(".env.production"), true);
  const hidden = writeCanonicalSnapshot(repo);
  assert.equal(path.resolve(hidden.path), path.join(path.resolve(repo), ".tmp", "snapshots", "ags-canonical.zip"));
  const hiddenNames = readStoredZip(fs.readFileSync(hidden.path)).map((entry) => entry.name);
  const hiddenManifest = JSON.parse(readStoredZip(fs.readFileSync(hidden.path)).find((entry) => entry.name === "manifest.json").data.toString("utf8"));
  assert.equal(hiddenManifest.standardExcludesApplied, true);
  assert.equal(hiddenNames.includes(".env.production"), false);
  assert.equal(hiddenNames.includes(".env.ignored"), false);
  assert.equal(hiddenNames.includes("hosts.yaml"), false);
  assert.equal(hiddenNames.some((name) => name.startsWith("reports/")), false);
  assert.equal(hiddenNames.some((name) => name.includes("node_modules")), false);
  assert.ok(hiddenNames.includes("pnpm-lock.yaml"));
  const shown = writeCanonicalSnapshot(repo, { includeStandardExcluded: true, out: path.join(repo, ".tmp", "snapshots", "with-secret.zip") });
  const shownEntries = readStoredZip(fs.readFileSync(shown.path));
  const shownNames = shownEntries.map((entry) => entry.name);
  const shownManifest = JSON.parse(shownEntries.find((entry) => entry.name === "manifest.json").data.toString("utf8"));
  assert.equal(shownManifest.standardExcludesApplied, false);
  assert.ok(shownNames.includes(".env.production"));
  assert.equal(shownNames.includes(".env.ignored"), false);
  assert.equal(shownNames.includes("hosts.yaml"), false);
  assert.equal(shownNames.some((name) => name.startsWith(".tmp/")), false);
  assert.ok(shownNames.includes("pnpm-lock.yaml"));
});

test("skill links, bundled references, and host-local fallback", async () => {
  const root = makeCanonical();
  const bundled = fs.mkdtempSync(path.join(os.tmpdir(), "ags-skill-"));
  fs.mkdirSync(path.join(bundled, "references"));
  fs.mkdirSync(path.join(bundled, "scripts"));
  fs.writeFileSync(path.join(bundled, "references", "guide.md"), "# Guide\n");
  fs.writeFileSync(path.join(bundled, "scripts", "run.mjs"), "export const ok = true;\n");
  fs.writeFileSync(path.join(bundled, "SKILL.md"), "---\nname: bundled-skill\ndescription: Bundled.\n---\n\nSee [guide](references/guide.md).\n");
  const installed = await installSkill(root, { from: bundled, id: "bundled-skill", kind: "custom", description: "Bundled skill.", yes: true });
  assert.equal(installed.applied, true);
  assert.equal(fs.existsSync(path.join(root, "skills", "bundled-skill", "references", "guide.md")), true);
  assert.equal(fs.existsSync(path.join(root, "skills", "bundled-skill", "scripts", "run.mjs")), true);

  const linked = fs.mkdtempSync(path.join(os.tmpdir(), "ags-link-"));
  fs.writeFileSync(path.join(linked, "SKILL.md"), "---\nname: linker-skill\ndescription: Linker.\n---\n\nUse [cleanup](../css-cleanup/SKILL.md).\n");
  await installSkill(root, { from: linked, id: "linker-skill", kind: "custom", description: "Linker skill.", yes: true });
  const catalog = loadCatalog(root);
  assert.ok(catalog.skills.find((item) => item.id === "linker-skill").includes.includes("css-cleanup"));
  assert.ok(includedSkillIds(catalog, ["linker-skill"]).includes("css-cleanup"));

  const missing = fs.mkdtempSync(path.join(os.tmpdir(), "ags-miss-"));
  fs.writeFileSync(path.join(missing, "SKILL.md"), "---\nname: missing-link\ndescription: Missing.\n---\n\nUse [nope](../missing-skill/SKILL.md).\n");
  const host = makeRepo("link-host");
  installHost(root, host, { yes: true, id: "link-host", name: "Link" });
  await assert.rejects(() => installSkill(root, { from: missing, id: "missing-link", kind: "custom", description: "Missing link.", yes: true, route: host }), /Missing linked skill: missing-skill/);
  assert.equal(fs.existsSync(path.join(host, ".agents", "skills", "missing-link")), false);

  const local = fs.mkdtempSync(path.join(os.tmpdir(), "ags-local-"));
  fs.writeFileSync(path.join(local, "SKILL.md"), "---\nname: host-only\ndescription: Host only.\n---\n\nTheme [file](../../../src/theme.css).\n");
  fs.mkdirSync(path.join(host, "src"));
  fs.writeFileSync(path.join(host, "src", "theme.css"), "body{}\n");
  const fallen = await installSkill(root, { from: local, id: "host-only", kind: "custom", description: "Host only.", yes: true, route: host, source: "vendor/host-only" });
  assert.equal(fallen.hostLocal, true);
  assert.equal(fs.existsSync(path.join(root, "skills", "host-only")), false);
  assert.equal(fs.existsSync(path.join(host, ".agents", "skills", "host-only", "SKILL.md")), true);
  const settings = readSettings(host);
  assert.equal(settings.skills.enabled.includes("host-only"), false);
  assert.equal(settings.skills.localExceptions[0].id, "host-only");
  assert.equal(settings.skills.localExceptions[0].reason, "requires-host-location");
  assert.match(fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8"), /host-local exception/);
  const month = new Date().toISOString().slice(0, 7);
  const lines = fs.readFileSync(path.join(root, "reports", "exceptions", `${month}.jsonl`), "utf8").trim().split(/\n/);
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(record).sort(), ["host", "kind", "path", "reason", "skill", "timestamp"]);
  assert.equal(record.kind, "host-local-skill");
  assert.equal(record.skill, "host-only");
  const skipped = await reconcile(root, { route: host, dryRun: true });
  assert.equal(skipped.results.some((item) => item.id === "host-only" && item.status === "skipped"), true);
  const routed = fs.mkdtempSync(path.join(os.tmpdir(), "ags-route-"));
  fs.writeFileSync(path.join(routed, "SKILL.md"), "---\nname: needs-route\ndescription: Needs route.\n---\n\nTheme [file](../../../src/theme.css).\n");
  await assert.rejects(() => installSkill(root, { from: routed, id: "needs-route", kind: "custom", description: "Needs route.", yes: true }), /--route/);
});

test("repair restores missing files, removes invalid owned files, and rejects setting typos", () => {
  const root = makeCanonical();
  const host = makeRepo("repair-follow");
  installHost(root, host, { yes: true, id: "repair-follow", name: "Repair", mainBranch: "trunk" });
  fs.writeFileSync(path.join(host, ".agents", "local", "keep.md"), "mine\n");
  fs.mkdirSync(path.join(host, ".agents", "skills", "host-only"), { recursive: true });
  fs.writeFileSync(path.join(host, ".agents", "skills", "host-only", "SKILL.md"), "---\nname: host-only\ndescription: Local.\n---\n");
  const settings = readSettings(host);
  settings.skills.localExceptions = [{ id: "host-only", path: ".agents/skills/host-only/SKILL.md", reason: "requires-host-location", source: "vendor/host-only" }];
  writeYamlAtomic(path.join(host, ".agents", "ags.yaml"), settings);
  fs.writeFileSync(path.join(host, ".agents", "AGS.md"), "drifted entry\n");
  const dry = repairHost(root, host, { yes: false, removeInvalid: true });
  assert.ok(dry.targets.some((item) => item.action === "quarantine" && item.path.endsWith(`${path.sep}.agents${path.sep}AGS.md`)));
  const notes = "# Notes\n";
  fs.writeFileSync(path.join(host, "CLAUDE.md"), notes);
  const marked = repairHost(root, host, { yes: false, removeInvalid: true });
  assert.equal(marked.targets.some((item) => item.path.endsWith("CLAUDE.md")), false);
  repairHost(root, host, { yes: true, removeInvalid: true });
  assert.equal(fs.existsSync(path.join(host, ".agents", "AGS.md")), false);
  assert.equal(fs.readFileSync(path.join(host, "CLAUDE.md"), "utf8"), notes);
  assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
  assert.equal(fs.readFileSync(path.join(host, ".agents", "skills", "host-only", "SKILL.md"), "utf8").includes("Local"), true);

  fs.rmSync(path.join(host, ".agents", "ags.yaml"));
  fs.rmSync(path.join(host, ".agents", "AGS.md"), { force: true });
  fs.rmSync(path.join(host, "AGENTS.md"));
  fs.rmSync(path.join(host, ".agents", "local"), { recursive: true });
  fs.rmSync(path.join(host, "CLAUDE.md"));
  repairHost(root, host, { yes: true, restoreRequired: true });
  assert.equal(readSettings(host).host, "repair-follow");
  assert.match(fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8"), /AGS/);
  assert.match(fs.readFileSync(path.join(host, "AGENTS.md"), "utf8"), /AGS:BEGIN/);
  assert.equal(fs.existsSync(path.join(host, ".agents", "local")), true);
  assert.equal(fs.existsSync(path.join(host, "CLAUDE.md")), false);
  const restored = readSettings(host);
  restored.skills.localExceptions = [{ id: "host-only", path: ".agents/skills/host-only/SKILL.md", reason: "requires-host-location", source: "vendor/host-only" }];
  writeYamlAtomic(path.join(host, ".agents", "ags.yaml"), restored);

  fs.rmSync(path.join(host, ".agents", "ags.yaml"));
  fs.rmSync(path.join(host, ".agents", "AGS.md"));
  fs.rmSync(path.join(host, "AGENTS.md"));
  repairHost(root, "repair-follow", { yes: true, restoreRequired: true });
  assert.equal(fs.existsSync(path.join(host, ".agents", "ags.yaml")), true);
  assert.equal(fs.existsSync(path.join(host, ".agents", "AGS.md")), true);
  assert.throws(() => repairHost(root, host, { yes: true, setting: "reporting", value: "yes" }));
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ scripts: { foo: "node -e \"process.exit(0)\"" } }));
  assert.deepEqual(splitSetting("checks.type=foo=bar", undefined), ["checks.type", "foo=bar"]);
  assert.throws(() => repairHost(root, host, { yes: true, setting: "checks.type", value: "foo=bar" }));
  for (const mode of ["restoreRequired", "overwriteManaged", "removeInvalid", "resetManaged"]) {
    fs.writeFileSync(path.join(host, ".agents", "local", "keep.md"), "mine\n");
    fs.writeFileSync(path.join(host, ".agents", "skills", "host-only", "SKILL.md"), "---\nname: host-only\ndescription: Local.\n---\n");
    repairHost(root, host, { yes: true, [mode]: true });
    assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
    assert.equal(fs.existsSync(path.join(host, ".agents", "skills", "host-only", "SKILL.md")), true);
  }
});

test("package script checks keep diagnostics and reject prettier writes", () => {
  const root = makeCanonical();
  const locks = { pnpm: "pnpm-lock.yaml", yarn: "yarn.lock", npm: "package-lock.json" };
  for (const manager of ["pnpm", "yarn", "npm"]) {
    const host = makeRepo(`${manager}-checks`);
    fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({
      name: "fixture",
      scripts: {
        typecheck: "node -e \"process.exit(0)\"",
        lint: "node -e \"process.stderr.write('lint-fail\\n'); process.exit(2)\"",
        "prettier:check": "node -e \"process.stdout.write('pretty\\n'); process.exit(0)\"",
      },
    }));
    fs.writeFileSync(path.join(host, locks[manager]), "lock\n");
    installHost(root, host, { yes: true, id: `${manager}-checks`, name: manager, checks: { type: "typecheck", lint: "lint", prettier: "prettier:check" } });
    const results = runChecks(root, host);
    assert.deepEqual(results.map((item) => item.status), ["passed", "failed", "passed"]);
    assert.equal(results[1].manager, manager);
    assert.match(results[1].diagnostics, /lint-fail/);
    assert.match(results[2].diagnostics, /pretty/);
  }
  const conflict = makeRepo("conflict-checks");
  fs.writeFileSync(path.join(conflict, "package.json"), JSON.stringify({ packageManager: "pnpm@9.0.0", scripts: { typecheck: "node -e \"process.exit(0)\"" } }));
  fs.writeFileSync(path.join(conflict, "yarn.lock"), "lock\n");
  installHost(root, conflict, { yes: true, id: "conflict-checks", name: "Conflict", checks: { type: "typecheck" } });
  assert.throws(() => runChecks(root, conflict), /conflict/);
  const bare = makeRepo("no-manager");
  fs.writeFileSync(path.join(bare, "package.json"), JSON.stringify({ scripts: { typecheck: "node -e \"process.exit(0)\"" } }));
  installHost(root, bare, { yes: true, id: "no-manager", name: "None", checks: { type: "typecheck" } });
  assert.equal(runChecks(root, bare)[0].status, "unavailable");
  const stale = makeRepo("stale-checks");
  fs.writeFileSync(path.join(stale, "package.json"), JSON.stringify({ packageManager: "npm@10.9.2", scripts: { typecheck: "node -e \"process.exit(0)\"" } }));
  installHost(root, stale, { yes: true, id: "stale-checks", name: "Stale", checks: { type: "typecheck" } });
  const removed = readSettings(stale);
  delete removed.checks;
  removed.checks = { type: "typecheck", lint: "missing-script" };
  writeYamlAtomic(path.join(stale, ".agents", "ags.yaml"), removed);
  const staleResults = runChecks(root, stale);
  assert.equal(staleResults.find((item) => item.name === "lint").status, "stale-configuration");
  assert.equal(staleResults.find((item) => item.name === "type").status, "passed");
  assert.equal(staleResults.find((item) => item.name === "type").manager, "npm");
  const writer = makeRepo("prettier-write");
  fs.writeFileSync(path.join(writer, "package.json"), JSON.stringify({ packageManager: "npm@10.9.2", scripts: { "prettier:check": "prettier --write src" } }));
  fs.writeFileSync(path.join(writer, "src.txt"), "same\n");
  installHost(root, writer, { yes: true, id: "prettier-write", name: "Writer" });
  const writerSettings = readSettings(writer);
  writerSettings.checks = { prettier: "prettier:check" };
  writeYamlAtomic(path.join(writer, ".agents", "ags.yaml"), writerSettings);
  const rejected = runChecks(root, writer, { which: ["prettier"] });
  assert.equal(rejected[0].status, "rejected");
  assert.equal(fs.readFileSync(path.join(writer, "src.txt"), "utf8"), "same\n");
});

test("missing included skill warns on install and fails doctor", () => {
  const root = makeCanonical();
  fs.rmSync(path.join(root, "skills", "css-theme-tokens", "SKILL.md"));
  const host = makeRepo("missing-theme");
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }));
  const installed = installHost(root, host, { yes: true, id: "missing-theme", name: "Missing" });
  assert.equal(installed.applied, true);
  assert.ok(installed.warnings.some((line) => line.includes("skills/css-theme-tokens/SKILL.md")));
  const shot = writeSnapshot(root, host, loadCatalog(root), readSettings(host), path.join(host, ".tmp", "missing.zip"));
  assert.ok(shot.manifest.warnings.some((line) => line.includes("css-theme-tokens")));
  const result = doctor(root);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("css-theme-tokens")));
});

test("explicit bin still retargets and root diffs do not change the index", () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "ags-bin-"));
  let called = 0;
  const result = finishInstall({
    binDir: bin,
    scriptPath: path.join(REAL, "scripts", "ags.mjs"),
    retarget: () => {
      called += 1;
      return { updated: ["temp-host"], failures: ["other: boom"] };
    },
  });
  assert.equal(called, 1);
  assert.equal(result.hosts.failures[0], "other: boom");
  assert.equal(result.written.length, 3);
  assert.throws(() => parseInstallArgs(["--bin"]));
  assert.throws(() => parseInstallArgs(["--nope"]));
  const repo = makeRepo("root-diff");
  const indexBefore = git(["write-tree"], repo);
  const commits = writeDiff(repo, "root-commits", "commits", "1");
  const empty = emptyTreeId(repo);
  const expected = spawnSync("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", empty, "HEAD"], { cwd: repo, encoding: "utf8" }).stdout;
  assert.equal(fs.readFileSync(commits.path, "utf8"), expected);
  fs.writeFileSync(path.join(repo, "fresh.txt"), "new\n");
  const current = writeDiff(repo, "root-current", "current", "1");
  const text = fs.readFileSync(current.path, "utf8");
  assert.match(text, /README\.md/);
  assert.match(text, /fresh\.txt/);
  assert.equal(git(["write-tree"], repo), indexBefore);
  assert.throws(() => writeDiff(repo, "past-root", "commits", "2"));
  const host = makeRepo("plan-only");
  const canon = makeCanonical();
  installHost(canon, host, { yes: true, id: "plan-only", name: "Plan", mainBranch: "trunk" });
  const plan = hostPlanPath(canon, host, "work-plan.md");
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.writeFileSync(plan, "# Plan\n");
  assert.equal(path.resolve(plan), path.join(path.resolve(host), ".tmp", "work-plan.md"));
  assert.equal(fs.existsSync(path.join(canon, ".tmp", "work-plan.md")), false);
  assert.match(fs.readFileSync(path.join(REAL, "skills", "ship", "SKILL.md"), "utf8"), /git\.mainBranch/);
  assert.doesNotMatch(fs.readFileSync(path.join(REAL, "skills", "ship", "SKILL.md"), "utf8"), /integration-2025Q1/);
  assert.doesNotMatch(fs.readFileSync(path.join(REAL, "skills", "git-cleanup", "SKILL.md"), "utf8"), /integration-2025Q1/);
});
