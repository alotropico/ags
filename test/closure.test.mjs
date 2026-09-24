import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { includedSkillIds, loadCatalog, offeredEntries } from "../scripts/lib/catalog.mjs";
import { commitCount, emptyTreeId, writeDiff } from "../scripts/lib/diff.mjs";
import { doctor } from "../scripts/lib/doctor.mjs";
import { installHost, readSettings, repairHost } from "../scripts/lib/host.mjs";
import { detectPackageManager, isPackageScriptKey, packageScriptInvocation } from "../scripts/lib/packages.mjs";
import { installSkill, reconcile } from "../scripts/lib/skills.mjs";
import { readStoredZip } from "../scripts/lib/snapshot.mjs";
import { writeCanonicalSnapshot } from "../scripts/snapshot-canonical.mjs";
import { installerHelp } from "../scripts/install-global.mjs";
import { CANONICAL_ROOT, writeYamlAtomic } from "../scripts/lib/util.mjs";

const REAL = CANONICAL_ROOT;

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function makeCanonical() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ags-canon-"));
  for (const rel of ["catalog.yaml", "AGENTS.md", "README.md", "package.json", "rules/core.md", "templates/host-ags.md", "templates/agents-block.md", "templates/claude-pointer.md"]) {
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

function commit(repo, message) {
  git(["-c", "user.email=ags@example.test", "-c", "user.name=ags", "commit", "-m", message], repo);
}

function skillDir(dir, id, href) {
  fs.mkdirSync(path.join(dir, "references"), { recursive: true });
  const link = href ? `\nSee [theme](${href}).\n` : "\n";
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\nname: ${id}\ndescription: Local skill.\n---\n# ${id}\n${link}`);
  fs.writeFileSync(path.join(dir, "references", "keep.md"), "keep\n");
}

test("force-tracked ignored paths stay out of canonical snapshots", () => {
  const repo = makeRepo("snap-ignore");
  fs.writeFileSync(path.join(repo, ".gitignore"), "secret.txt\n.env.forced\n");
  fs.writeFileSync(path.join(repo, "secret.txt"), "nope\n");
  fs.writeFileSync(path.join(repo, ".env.forced"), "secret\n");
  fs.writeFileSync(path.join(repo, ".env.production"), "also\n");
  fs.writeFileSync(path.join(repo, "pnpm-lock.yaml"), "lock: true\n");
  git(["add", ".gitignore", "pnpm-lock.yaml", ".env.production"], repo);
  git(["add", "-f", "secret.txt", ".env.forced"], repo);
  commit(repo, "track");
  const names = (written) => readStoredZip(fs.readFileSync(written.path)).map((entry) => entry.name);
  const hidden = names(writeCanonicalSnapshot(repo));
  const shown = names(writeCanonicalSnapshot(repo, { includeStandardExcluded: true, out: path.join(repo, ".tmp", "snapshots", "relaxed.zip") }));
  assert.equal(hidden.includes("secret.txt"), false);
  assert.equal(hidden.includes(".env.forced"), false);
  assert.equal(hidden.includes(".env.production"), false);
  assert.equal(hidden.includes("pnpm-lock.yaml"), true);
  assert.equal(shown.includes("secret.txt"), false);
  assert.equal(shown.includes(".env.forced"), false);
  assert.equal(shown.includes(".env.production"), true);
  assert.equal(shown.includes("pnpm-lock.yaml"), true);
});

test("first-parent count bounds merge history", () => {
  const repo = makeRepo("merge-diff");
  git(["checkout", "-b", "side"], repo);
  fs.writeFileSync(path.join(repo, "side.txt"), "side\n");
  git(["add", "side.txt"], repo);
  commit(repo, "side");
  git(["checkout", "-"], repo);
  fs.writeFileSync(path.join(repo, "main.txt"), "main\n");
  git(["add", "main.txt"], repo);
  commit(repo, "main");
  git(["-c", "user.email=ags@example.test", "-c", "user.name=ags", "merge", "--no-ff", "side", "-m", "merge"], repo);
  const first = commitCount(repo);
  const all = Number(git(["rev-list", "--count", "HEAD"], repo));
  assert.ok(all > first);
  const indexBefore = git(["write-tree"], repo);
  fs.writeFileSync(path.join(repo, "fresh.txt"), "new\n");
  const atRoot = writeDiff(repo, "all-first", "current", String(first));
  const text = fs.readFileSync(atRoot.path, "utf8");
  assert.match(text, /README\.md/);
  assert.match(text, /fresh\.txt/);
  const below = writeDiff(repo, "below", "commits", String(first - 1));
  const parent = spawnSync("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD~" + (first - 1), "HEAD"], { cwd: repo, encoding: "utf8" }).stdout;
  assert.equal(fs.readFileSync(below.path, "utf8"), parent);
  assert.throws(() => writeDiff(repo, "past", "commits", String(first + 1)));
  const empty = emptyTreeId(repo);
  const boundary = writeDiff(repo, "boundary", "commits", String(first));
  const expected = spawnSync("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", empty, "HEAD"], { cwd: repo, encoding: "utf8" }).stdout;
  assert.equal(fs.readFileSync(boundary.path, "utf8"), expected);
  assert.equal(git(["write-tree"], repo), indexBefore);
});

test("reconcile registers a host-local skill without replacing it", async () => {
  const root = makeCanonical();
  const host = makeRepo("local-reconcile");
  installHost(root, host, { yes: true, id: "local-reconcile", name: "Local" });
  fs.mkdirSync(path.join(host, "src"), { recursive: true });
  fs.writeFileSync(path.join(host, "src", "theme.css"), "body{}\n");
  const skillRoot = path.join(host, ".agents", "skills", "vendor-skill");
  skillDir(skillRoot, "vendor-skill", "../../../src/theme.css");
  const before = fs.readFileSync(path.join(skillRoot, "SKILL.md"));
  const companion = fs.readFileSync(path.join(skillRoot, "references", "keep.md"));
  const dry = await reconcile(root, { route: host, dryRun: true });
  const planned = dry.results.find((item) => item.id === "vendor-skill");
  assert.equal(planned.status, "host-local-exception");
  assert.equal(planned.path, ".agents/skills/vendor-skill/SKILL.md");
  assert.equal(planned.reason, "requires-host-location");
  assert.ok(fs.readFileSync(path.join(skillRoot, "references", "keep.md")).equals(companion));
  assert.equal(fs.existsSync(path.join(root, "reports")), false);
  const wet = await reconcile(root, { route: host, dryRun: false });
  assert.equal(wet.results.find((item) => item.id === "vendor-skill").status, "host-local-exception");
  assert.ok(fs.readFileSync(path.join(skillRoot, "SKILL.md")).equals(before));
  assert.ok(fs.readFileSync(path.join(skillRoot, "references", "keep.md")).equals(companion));
  const settings = readSettings(host);
  assert.deepEqual(settings.skills.localExceptions, [{
    id: "vendor-skill",
    path: ".agents/skills/vendor-skill/SKILL.md",
    reason: "requires-host-location",
    source: "unknown",
  }]);
  assert.equal(settings.skills.enabled.includes("vendor-skill"), false);
  const reports = fs.readdirSync(path.join(root, "reports", "exceptions")).filter((name) => name.endsWith(".jsonl"));
  const lines = fs.readFileSync(path.join(root, "reports", "exceptions", reports[0]), "utf8").trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  const again = await reconcile(root, { route: host, dryRun: false });
  assert.equal(again.results.find((item) => item.id === "vendor-skill").status, "skipped");
  const linesAgain = fs.readFileSync(path.join(root, "reports", "exceptions", reports[0]), "utf8").trim().split(/\r?\n/);
  assert.equal(linesAgain.length, 1);
  assert.ok(fs.readFileSync(path.join(skillRoot, "references", "keep.md")).equals(companion));
});

test("host-local install does not replace a different skill unless asked", async () => {
  const root = makeCanonical();
  const host = makeRepo("local-replace");
  installHost(root, host, { yes: true, id: "local-replace", name: "Replace" });
  fs.mkdirSync(path.join(host, "src"), { recursive: true });
  fs.writeFileSync(path.join(host, "src", "theme.css"), "body{}\n");
  const from = path.join(root, ".tmp", "runtime", "vendor-src");
  skillDir(from, "vendor-skill", "../../../src/theme.css");
  const first = await installSkill(root, { from, id: "vendor-skill", kind: "custom", description: "Vendor.", yes: true, route: host, source: "vendor/skill" });
  assert.equal(first.hostLocal, true);
  const installedSkill = path.join(host, ".agents", "skills", "vendor-skill");
  const installed = fs.readFileSync(path.join(installedSkill, "SKILL.md"));
  const installedCompanion = fs.readFileSync(path.join(installedSkill, "references", "keep.md"));
  assert.ok(installedCompanion.equals(fs.readFileSync(path.join(from, "references", "keep.md"))));
  const same = await installSkill(root, { from, id: "vendor-skill", kind: "custom", description: "Vendor.", yes: true, route: host, source: "vendor/skill" });
  assert.equal(same.idempotent, true);
  assert.ok(fs.readFileSync(path.join(installedSkill, "references", "keep.md")).equals(installedCompanion));
  const reports = fs.readdirSync(path.join(root, "reports", "exceptions"));
  const reportFile = path.join(root, "reports", "exceptions", reports[0]);
  const once = fs.readFileSync(reportFile, "utf8").trim().split(/\r?\n/).length;
  assert.equal(once, 1);
  fs.writeFileSync(path.join(installedSkill, "references", "keep.md"), "changed\n");
  const settingsBefore = fs.readFileSync(path.join(host, ".agents", "ags.yaml"));
  const entryBefore = fs.readFileSync(path.join(host, ".agents", "AGS.md"));
  await assert.rejects(() => installSkill(root, { from, id: "vendor-skill", kind: "custom", description: "Vendor.", yes: true, route: host, source: "vendor/skill" }), /different content/);
  assert.ok(fs.readFileSync(path.join(installedSkill, "SKILL.md")).equals(installed));
  assert.equal(fs.readFileSync(path.join(installedSkill, "references", "keep.md"), "utf8"), "changed\n");
  assert.ok(settingsBefore.equals(fs.readFileSync(path.join(host, ".agents", "ags.yaml"))));
  assert.ok(entryBefore.equals(fs.readFileSync(path.join(host, ".agents", "AGS.md"))));
  const replaced = await installSkill(root, { from, id: "vendor-skill", kind: "custom", description: "Vendor.", yes: true, route: host, source: "vendor/skill", replace: true });
  assert.equal(replaced.hostLocal, true);
  assert.ok(fs.readFileSync(path.join(installedSkill, "SKILL.md")).equals(installed));
  assert.ok(fs.readFileSync(path.join(installedSkill, "references", "keep.md")).equals(installedCompanion));
  const quarantineRoot = path.join(host, ".tmp", "ags-quarantine");
  const quarantine = fs.readdirSync(quarantineRoot, { recursive: true }).map(String);
  const kept = quarantine.find((name) => name.replaceAll("\\", "/").endsWith("references/keep.md"));
  assert.ok(kept);
  assert.equal(fs.readFileSync(path.join(quarantineRoot, kept), "utf8"), "changed\n");
  assert.ok(quarantine.some((name) => name.replaceAll("\\", "/").endsWith("SKILL.md")));
});

test("repair one invalid setting while another selection stays invalid", () => {
  const root = makeCanonical();
  const host = makeRepo("repair-one");
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ scripts: { typecheck: "node -e \"process.exit(0)\"" } }));
  installHost(root, host, { yes: true, id: "repair-one", name: "Repair" });
  const entryBefore = fs.readFileSync(path.join(host, ".agents", "AGS.md"));
  const settings = readSettings(host);
  settings.reporting = "yes";
  settings.skills.enabled = ["missing-skill"];
  writeYamlAtomic(path.join(host, ".agents", "ags.yaml"), settings);
  const repaired = repairHost(root, host, { yes: true, setting: "reporting", value: "false" });
  assert.equal(readSettings(host).reporting, false);
  assert.deepEqual(readSettings(host).skills.enabled, ["missing-skill"]);
  assert.ok(entryBefore.equals(fs.readFileSync(path.join(host, ".agents", "AGS.md"))));
  assert.ok(repaired.remaining.some((line) => line.includes("missing-skill")));
  const cleaned = repairHost(root, host, { yes: true, setting: "skills.enabled", value: "plan-work" });
  assert.deepEqual(readSettings(host).skills.enabled, ["plan-work"]);
  assert.deepEqual(cleaned.remaining, []);
  const yaml = readSettings(host);
  delete yaml.adapters;
  writeYamlAtomic(path.join(host, ".agents", "ags.yaml"), yaml);
  repairHost(root, host, { yes: true, setting: "adapters.claude", value: "skip" });
  assert.equal(readSettings(host).adapters.claude, "skip");
  assert.deepEqual(readSettings(host).skills.enabled, ["plan-work"]);
});

test("installer help exits before install or retarget", () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "ags-install-copy-"));
  fs.cpSync(path.join(REAL, "scripts"), path.join(copy, "scripts"), { recursive: true });
  fs.symlinkSync(path.join(REAL, "node_modules"), path.join(copy, "node_modules"), "junction");
  const hosts = "hosts: []\n";
  fs.writeFileSync(path.join(copy, "hosts.yaml"), hosts);
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "ags-help-bin-"));
  const result = spawnSync(process.execPath, [path.join(copy, "scripts", "install-global.mjs"), "--help"], {
    encoding: "utf8",
    env: { ...process.env, PNPM_HOME: bin },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /install-global\.mjs \[--bin <absolute-directory>\] \[--replace\]/);
  assert.equal(fs.readdirSync(bin).length, 0);
  assert.equal(fs.readFileSync(path.join(copy, "hosts.yaml"), "utf8"), hosts);
  assert.equal(installerHelp().includes("--script"), false);
});

test("one lockfile is required when packageManager is absent", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ags-locks-"));
  fs.writeFileSync(path.join(root, "package.json"), "{}\n");
  fs.writeFileSync(path.join(root, "package-lock.json"), "{}\n");
  fs.writeFileSync(path.join(root, "npm-shrinkwrap.json"), "{}\n");
  const conflict = detectPackageManager(root);
  assert.equal(conflict.manager, null);
  assert.match(conflict.conflict, /package-lock\.json/);
  assert.match(conflict.conflict, /npm-shrinkwrap\.json/);
  fs.rmSync(path.join(root, "npm-shrinkwrap.json"));
  assert.equal(detectPackageManager(root).manager, "npm");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ packageManager: "npm@10.9.2" }));
  fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "lock: true\n");
  assert.equal(detectPackageManager(root).manager, null);
});

test("script names reject shell metacharacters before cmd.exe", () => {
  for (const bad of ["a&b", "a|b", "a<b", "a>b", "a^b", "a%b", "a!b", "a b", "a(b)", "a\"b", "a'b"]) {
    assert.equal(isPackageScriptKey(bad), false);
    assert.throws(() => packageScriptInvocation("npm", bad));
  }
  for (const good of ["lint", "lint:fix", "a.b", "a_b", "a-b", "a@b", "a/b"]) {
    const command = packageScriptInvocation("npm", good);
    assert.deepEqual(command.args, ["run", good]);
    assert.deepEqual(command.fallback.slice(-3), ["npm.cmd", "run", good]);
  }
});

test("ui-library offering, doctor links, and private state stay narrow", () => {
  const catalog = loadCatalog(REAL);
  const plain = { packages: new Set(), locks: new Set(), repoName: "plain" };
  const ui = { packages: new Set(["@platform/ui-library"]), locks: new Set(), repoName: "ui" };
  assert.equal(offeredEntries(catalog, plain).some((entry) => entry.id === "ui-library-css"), false);
  const css = offeredEntries(catalog, ui).filter((entry) => entry.id === "ui-library-css" || entry.id.startsWith("css-"));
  assert.equal(css[0].id, "ui-library-css");
  assert.deepEqual(includedSkillIds(catalog, ["ui-library-css"]), ["css-authoring-conventions", "css-cleanup", "css-theme-tokens"]);
  const root = makeCanonical();
  const catalogText = fs.readFileSync(path.join(root, "catalog.yaml"), "utf8").replace(/includes:\r?\n\s+- css-cleanup\r?\n/, "includes: []\n");
  fs.writeFileSync(path.join(root, "catalog.yaml"), catalogText);
  const result = doctor(root);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => /includes|css-cleanup/i.test(line)));
  const hostsFile = path.join(REAL, "hosts.yaml");
  const hostsBefore = fs.existsSync(hostsFile) ? fs.readFileSync(hostsFile) : null;
  const live = ["README.md", "AGENTS.md", "catalog.yaml"];
  const blob = live.map((rel) => fs.readFileSync(path.join(REAL, rel), "utf8")).join("\n");
  assert.equal(blob.includes(".tmp/plans"), false);
  assert.equal(blob.includes(".tmp/decisions"), false);
  assert.equal(blob.includes(".tmp/references"), false);
  const hostsAfter = fs.existsSync(hostsFile) ? fs.readFileSync(hostsFile) : null;
  assert.equal(hostsBefore === null ? hostsAfter === null : hostsBefore.equals(hostsAfter), true);
});

test("malformed link escapes stay on the doctor path", () => {
  const root = makeCanonical();
  fs.mkdirSync(path.join(root, "skills", "bad-link"), { recursive: true });
  fs.writeFileSync(path.join(root, "skills", "bad-link", "SKILL.md"), "---\nname: bad-link\ndescription: Bad link.\n---\n\n[x](%zz)\n");
  fs.appendFileSync(path.join(root, "catalog.yaml"), "  - id: bad-link\n    kind: custom\n    path: skills/bad-link/SKILL.md\n    description: Bad link.\n    default: false\n    entryPoint: true\n    keywords: [bad]\n");
  const result = doctor(root);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("bad-link") && line.includes("%zz")));
});

test("doctor reports a missing guidance template", () => {
  const root = makeCanonical();
  fs.rmSync(path.join(root, "templates", "agents-block.md"));
  const result = doctor(root);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("templates/agents-block.md")));
});
