import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectEvidence, loadCatalog, selectionErrors, validateCatalog, whenMatches } from "../scripts/lib/catalog.mjs";
import { commitCount, writeDiff } from "../scripts/lib/diff.mjs";
import { doctor } from "../scripts/lib/doctor.mjs";
import { adoptCanonicalRoot, installHost, loadRegistry, readSettings, repairHost, resolveRoute, saveRegistry, syncHosts, unregisterHost, updateHost, validateRegistry, validateSettings } from "../scripts/lib/host.mjs";
import { recordChanges, recordUsage, setReporting } from "../scripts/lib/report-cmd.mjs";
import { parseLevel, parseUsageFiles, withLock } from "../scripts/lib/reports.mjs";
import { installSkill, reconcile } from "../scripts/lib/skills.mjs";
import { readStoredZip, sha256, writeSnapshot } from "../scripts/lib/snapshot.mjs";
import { listCanonicalFiles, selectCanonicalFiles, writeCanonicalSnapshot } from "../scripts/snapshot-canonical.mjs";
import { blockIntact, upsertAgentsBlock } from "../scripts/lib/render.mjs";
import { installGlobal, pathIncludes, shimFiles } from "../scripts/install-global.mjs";
import { CANONICAL_ROOT, assertCanonicalAccess, displayPath, normalizeIdentity, relativeInside, samePath } from "../scripts/lib/util.mjs";

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

function commitFile(repo, name, body, message) {
  fs.writeFileSync(path.join(repo, name), body);
  git(["add", name], repo);
  git(["-c", "user.email=ags@example.test", "-c", "user.name=ags", "commit", "-m", message], repo);
}

test("path identity, containment, and route resolution", () => {
  assert.equal(samePath("C:/Cosmos/projects/ags", "c:/cosmos/projects/ags"), process.platform === "win32");
  assert.equal(normalizeIdentity(REAL), normalizeIdentity(REAL.toUpperCase()));
  assert.equal(relativeInside(REAL, path.join(REAL, "rules", "core.md")), "rules/core.md");
  assert.throws(() => relativeInside(REAL, path.resolve(REAL, "..", "outside.txt")));
  const repo = makeRepo("nested-host");
  const canon = makeCanonical();
  installHost(canon, repo, { yes: true, id: "nested-host", name: "Nested" });
  const child = path.join(repo, "src", "app");
  fs.mkdirSync(child, { recursive: true });
  assert.equal(resolveRoute(child), path.resolve(repo));
});

test("catalog, conditions, and selection precedence", () => {
  const catalog = {
    format: 1,
    rules: [],
    skills: [
      { id: "plan-work", kind: "custom", path: "skills/plan-work/SKILL.md", description: "Plan.", default: true, keywords: ["plan"] },
      {
        id: "css-theme-tokens",
        kind: "custom",
        path: "skills/css-theme-tokens/SKILL.md",
        description: "Tokens.",
        default: false,
        keywords: ["css"],
        when: { any: [{ package: "@platform/ui-library" }, { lockFile: "pnpm-lock.yaml" }, { repoName: "ui-library" }] },
      },
    ],
  };
  assert.equal(validateCatalog(catalog).length, 0);
  assert.ok(validateCatalog({ format: 1, rules: [], skills: [{ ...catalog.skills[0], conflictsWith: ["x"] }] }).length > 0);
  const host = fs.mkdtempSync(path.join(os.tmpdir(), "ags-ev-"));
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }));
  fs.writeFileSync(path.join(host, "pnpm-lock.yaml"), "lock\n");
  const evidence = detectEvidence(host);
  assert.equal(whenMatches(catalog.skills[1].when, evidence), true);
  assert.equal(whenMatches({ any: [{ package: "missing" }] }, evidence), false);
  assert.equal(whenMatches({ any: [{ repoName: "nope" }] }, { ...evidence, packages: new Set(), locks: new Set() }), false);
  const renamed = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ags-repo-")), "ui-library");
  fs.mkdirSync(renamed);
  assert.equal(detectEvidence(renamed).repoName, "ui-library");
  assert.equal(whenMatches({ any: [{ repoName: "UI-Library" }] }, detectEvidence(renamed)), true);
  const bad = { rules: { enabled: ["nope"], disabled: ["nope"] }, skills: { enabled: ["plan-work"], disabled: ["plan-work"] } };
  assert.ok(selectionErrors(catalog, bad).length >= 2);
});

test("engagement levels, report containment, and jsonl lock", async () => {
  assert.equal(parseLevel("8"), 8);
  assert.throws(() => parseLevel("9", { max: 8 }));
  const files = parseUsageFiles(["rules/core.md=2", "rules/core.md=6", "skills/plan-work/SKILL.md=4"]);
  assert.deepEqual(files, [
    { path: "rules/core.md", level: 6 },
    { path: "skills/plan-work/SKILL.md", level: 4 },
  ]);
  const root = makeCanonical();
  const host = makeRepo("report-host");
  installHost(root, host, { yes: true, id: "report-host", name: "Report Host" });
  const usage = await recordUsage(root, host, { fileArgs: ["rules/core.md=6", "rules/core.md=3"], label: "plan cache repair" });
  const line = fs.readFileSync(usage.destination, "utf8").trim();
  const parsed = JSON.parse(line);
  assert.equal(parsed.host, "Report Host");
  assert.equal(parsed.files[0].level, 6);
  assert.equal(parsed.files[0].path, "rules/core.md");
  assert.ok(!("route" in parsed));
  await assert.rejects(() => recordUsage(root, host, { fileArgs: ["reports/usage/2026-09.jsonl=1"] }));
  const first = path.join(root, "reports", ".locks", "unit.lock");
  await Promise.all([
    withLock(first, async () => new Promise((resolve) => setTimeout(resolve, 30))),
    withLock(first, async () => {}),
  ]);
  await Promise.all([
    recordUsage(root, host, { fileArgs: ["AGENTS.md=1"], label: "a" }),
    recordUsage(root, host, { fileArgs: ["README.md=2"], label: "b" }),
  ]);
  const month = new Date().toISOString().slice(0, 7);
  const body = fs.readFileSync(path.join(root, "reports", "usage", `${month}.jsonl`), "utf8").trim().split(/\n/);
  assert.equal(body.length, 3);
  for (const row of body) JSON.parse(row);
});

test("managed block preservation and local scope", () => {
  const block = "<!-- AGS:BEGIN -->\nRead `.agents/AGS.md` before substantive work in this repository.\n<!-- AGS:END -->";
  const original = "before\r\n\r\nkeep\r\n";
  const next = upsertAgentsBlock(original, block);
  assert.ok(next.startsWith("before\r\n\r\nkeep\r\n"));
  assert.equal(blockIntact(next, block), true);
  const root = makeCanonical();
  const host = makeRepo("local-host");
  fs.writeFileSync(path.join(host, "AGENTS.md"), "# Notes\n\nLeave this line.\n");
  installHost(root, host, { yes: true, id: "local-host", name: "Local" });
  const agents = fs.readFileSync(path.join(host, "AGENTS.md"), "utf8");
  assert.ok(agents.startsWith("# Notes\n\nLeave this line.\n"));
  fs.writeFileSync(path.join(host, ".agents", "local", "keep.md"), "mine\n");
  fs.writeFileSync(path.join(host, ".agents", "AGS.md"), "tampered\n");
  const repaired = repairHost(root, host, { yes: true, resetManaged: true });
  assert.equal(repaired.applied, true);
  assert.equal(fs.readFileSync(path.join(host, ".agents", "local", "keep.md"), "utf8"), "mine\n");
  assert.ok(!fs.readFileSync(path.join(host, ".agents", "AGS.md"), "utf8").includes("tampered"));
});

test("install, selections, shared skill path, reporting, and nested commands", async () => {
  const root = makeCanonical();
  fs.writeFileSync(path.join(root, "rules", "example-rule.md"), "# Example\n");
  const catalog = fs.readFileSync(path.join(root, "catalog.yaml"), "utf8");
  fs.writeFileSync(path.join(root, "catalog.yaml"), catalog.replace("rules: []", "rules:\n  - id: example-rule\n    path: rules/example-rule.md\n    description: Example rule.\n    default: false\n    keywords: [example]\n"));
  fs.mkdirSync(path.join(root, "skills", "external-example"));
  fs.writeFileSync(path.join(root, "skills", "external-example", "SKILL.md"), "---\nname: external-example\ndescription: External.\n---\n");
  fs.appendFileSync(path.join(root, "catalog.yaml"), `
  - id: external-example
    kind: third-party
    path: skills/external-example/SKILL.md
    description: Example externally sourced skill.
    default: false
    keywords: [example]
    source:
      locator: unknown
      installMethod: imported
`);
  const alpha = makeRepo("alpha");
  const beta = makeRepo("beta");
  fs.writeFileSync(path.join(beta, "package.json"), JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }));
  installHost(root, alpha, { yes: true, id: "alpha", name: "Alpha", disable: ["plan-work"], enable: ["example-rule", "external-example"] });
  installHost(root, beta, { yes: true, id: "beta", name: "Beta", enable: ["ship"] });
  const alphaEntry = fs.readFileSync(path.join(alpha, ".agents", "AGS.md"), "utf8");
  const betaEntry = fs.readFileSync(path.join(beta, ".agents", "AGS.md"), "utf8");
  assert.match(alphaEntry, /example-rule/);
  assert.match(alphaEntry, /external-example/);
  assert.doesNotMatch(alphaEntry, /plan-work/);
  assert.match(betaEntry, /plan-work/);
  assert.match(betaEntry, /ship/);
  assert.match(betaEntry, /css-theme-tokens/);
  const skillPath = path.join(root, "skills", "plan-work", "SKILL.md");
  assert.ok(betaEntry.includes(skillPath.replaceAll("\\", "/")) || betaEntry.includes(skillPath));
  assert.equal(fs.existsSync(path.join(alpha, ".agents", "skills")), false);
  assert.equal(fs.existsSync(path.join(beta, ".agents", "skills")), false);
  fs.appendFileSync(skillPath, "\ncanonical edit\n");
  assert.equal(fs.readFileSync(skillPath, "utf8").includes("canonical edit"), true);
  assert.match(fs.readFileSync(path.join(beta, ".agents", "AGS.md"), "utf8"), /plan-work/);
  const nested = path.join(beta, "nested", "dir");
  fs.mkdirSync(nested, { recursive: true });
  assert.equal(resolveRoute(nested), path.resolve(beta));
  updateHost(root, nested, { yes: true });
  syncHosts(root, { route: nested });
  const alphaEntryBefore = fs.readFileSync(path.join(alpha, ".agents", "AGS.md"), "utf8");
  const off = setReporting(root, { host: "alpha", value: false });
  assert.equal(fs.readFileSync(path.join(alpha, ".agents", "AGS.md"), "utf8"), alphaEntryBefore);
  assert.deepEqual(off.changed, ["alpha"]);
  const disabled = await recordUsage(root, alpha, { fileArgs: ["rules/core.md=4"] });
  assert.equal(disabled.disabled, true);
  const enabled = await recordUsage(root, beta, { fileArgs: ["rules/core.md=5"] });
  assert.equal(enabled.disabled, false);
  const changed = await recordChanges(root, alpha, { files: ["skills/plan-work/SKILL.md"], note: "Clarified completion criteria" });
  assert.equal(changed.record.host, "Alpha");
  assert.equal(changed.record.files[0].level, 9);
  const registry = loadRegistry(root);
  registry.hosts.push({ id: "gone", name: "Gone", path: path.join(root, "missing-host") });
  saveRegistry(root, registry);
  const bulk = setReporting(root, { all: true, value: true });
  assert.ok(bulk.changed.includes("beta"));
  assert.ok(bulk.failures.some((line) => line.startsWith("gone:")));
  assert.ok(loadRegistry(root).hosts.some((item) => item.id === "alpha"));
  const snapshot = writeSnapshot(root, beta, (await import("../scripts/lib/catalog.mjs")).loadCatalog(root), (await import("../scripts/lib/host.mjs")).readSettings(beta), path.join(beta, ".tmp", "snap.zip"));
  const entries = readStoredZip(fs.readFileSync(snapshot.path));
  const names = entries.map((entry) => entry.name);
  assert.ok(names.includes("canonical/skills/plan-work/SKILL.md"));
  assert.ok(names.includes("manifest.json"));
  assert.equal(names.some((name) => name.includes("hosts.yaml")), false);
  assert.equal(names.some((name) => name.includes("css-cleanup")), true);
  const manifest = JSON.parse(entries.find((entry) => entry.name === "manifest.json").data.toString("utf8"));
  for (const item of manifest.files) {
    const entry = entries.find((candidate) => candidate.name === item.path);
    assert.equal(sha256(entry.data), item.sha256);
    assert.equal(entry.data.length, item.bytes);
  }
});

test("reconcile dry-run, wet copy, and collision", async () => {
  const root = makeCanonical();
  const host = makeRepo("reconcile-host");
  installHost(root, host, { yes: true, id: "reconcile-host", name: "Reconcile" });
  const skill = path.join(host, ".agents", "skills", "vendor-skill");
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, "SKILL.md"), "---\nname: vendor-skill\ndescription: Vendor skill.\n---\n\nbody\n");
  const dry = await reconcile(root, { route: host, dryRun: true });
  assert.equal(dry.results.some((item) => item.status === "planned" && item.id === "vendor-skill"), true);
  assert.equal(fs.existsSync(path.join(root, "skills", "vendor-skill")), false);
  const wet = await reconcile(root, { route: host, dryRun: false });
  assert.equal(wet.results.some((item) => item.status === "reconciled"), true);
  assert.equal(fs.existsSync(skill), false);
  assert.equal(fs.existsSync(path.join(root, "skills", "vendor-skill", "SKILL.md")), true);
  const other = makeRepo("collision-host");
  installHost(root, other, { yes: true, id: "collision-host", name: "Collision" });
  const clash = path.join(other, ".agents", "skills", "vendor-skill");
  fs.mkdirSync(clash, { recursive: true });
  fs.writeFileSync(path.join(clash, "SKILL.md"), "---\nname: vendor-skill\ndescription: Different.\n---\n\nother\n");
  const refused = await reconcile(root, { route: other, dryRun: false });
  assert.equal(refused.ok, false);
  assert.equal(fs.existsSync(path.join(clash, "SKILL.md")), true);
  assert.match(fs.readFileSync(path.join(root, "skills", "vendor-skill", "SKILL.md"), "utf8"), /Vendor skill/);
});

test("diff modes match git and do not change the index", () => {
  const repo = makeRepo("diff-host");
  commitFile(repo, "tracked.txt", "one\n", "one");
  commitFile(repo, "tracked.txt", "two\n", "two");
  fs.writeFileSync(path.join(repo, "tracked.txt"), "three\n");
  git(["add", "tracked.txt"], repo);
  fs.writeFileSync(path.join(repo, "tracked.txt"), "four\n");
  fs.writeFileSync(path.join(repo, "fresh.txt"), "new\n");
  const indexBefore = git(["diff", "--cached", "--name-only"], repo);
  const filesBefore = git(["ls-files"], repo);
  const commits = writeDiff(repo, "commits.diff", "commits", "1");
  const expectedCommits = spawnSync("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD~1..HEAD"], { cwd: repo, encoding: "utf8" }).stdout;
  assert.equal(fs.readFileSync(commits.path, "utf8"), expectedCommits);
  const range = writeDiff(repo, "range", "range", { from: "HEAD~1", to: "HEAD" });
  assert.equal(fs.readFileSync(range.path, "utf8"), expectedCommits);
  const staged = writeDiff(repo, "staged", "staged");
  const expectedStaged = spawnSync("git", ["diff", "--cached", "--no-color"], { cwd: repo, encoding: "utf8" }).stdout;
  assert.equal(fs.readFileSync(staged.path, "utf8"), expectedStaged);
  const changes = writeDiff(repo, "changes", "changes");
  assert.ok(fs.readFileSync(changes.path, "utf8").includes("four"));
  const untracked = writeDiff(repo, "untracked", "untracked");
  assert.match(fs.readFileSync(untracked.path, "utf8"), /fresh\.txt/);
  assert.equal(git(["diff", "--cached", "--name-only"], repo), indexBefore);
  assert.equal(git(["ls-files"], repo), filesBefore);
  const current = writeDiff(repo, "current", "current", "1");
  const text = fs.readFileSync(current.path, "utf8");
  const trackedHeaders = text.split("\n").filter((line) => line.startsWith("diff --git a/tracked.txt"));
  assert.equal(trackedHeaders.length, 1);
  assert.match(text, /fresh\.txt/);
  assert.throws(() => writeDiff(repo, "../escape", "staged"));
  assert.throws(() => writeDiff(repo, "too-many", "commits", "9"));
  const count = String(commitCount(repo));
  const all = writeDiff(repo, "all-commits", "commits", count);
  assert.ok(fs.readFileSync(all.path, "utf8").includes("tracked.txt"));
  assert.throws(() => writeDiff(repo, "too-far", "commits", String(Number(count) + 1)));
  assert.throws(() => writeDiff(repo, "bad-ref", "range", { from: "deadbeefdead", to: "HEAD" }));
  assert.equal(fs.existsSync(path.join(repo, ".tmp", "bad-ref.diff")), false);
  const currentAll = writeDiff(repo, "current-all", "current");
  const expectedHead = spawnSync("git", ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout;
  const body = fs.readFileSync(currentAll.path, "utf8");
  assert.ok(body.startsWith(expectedHead));
  assert.match(body, /fresh\.txt/);
  const nestedDiffDir = path.join(repo, "src", "nested");
  fs.mkdirSync(nestedDiffDir, { recursive: true });
  const nestedDiff = writeDiff(nestedDiffDir, "from-nested", "staged");
  assert.equal(path.resolve(nestedDiff.path), path.join(path.resolve(repo), ".tmp", "from-nested.diff"));
});

test("snapshot excludes secrets and canonical access failure is clean", () => {
  const root = makeCanonical();
  const host = makeRepo("snap-host");
  installHost(root, host, { yes: true, id: "snap-host", name: "Snap" });
  fs.writeFileSync(path.join(host, ".agents", "local", ".env"), "SECRET\n");
  fs.writeFileSync(path.join(host, ".agents", "local", "note.md"), "keep\n");
  fs.writeFileSync(path.join(host, ".agents", "local", ".ags-exclude"), "note.md\n");
  const written = writeSnapshot(root, host, loadCatalog(root), readSettings(host), path.join(host, ".tmp", "one.zip"));
  const names = readStoredZip(fs.readFileSync(written.path)).map((entry) => entry.name);
  assert.equal(names.some((name) => name.includes(".env")), false);
  assert.equal(names.some((name) => name.endsWith("note.md")), false);
  const missing = path.join(root, "missing-canonical");
  assert.throws(() => assertCanonicalAccess(missing));
  const blockedHost = makeRepo("blocked-host");
  assert.throws(() => installHost(missing, blockedHost, { yes: true, id: "blocked-host", name: "Blocked" }));
  assert.equal(fs.existsSync(path.join(blockedHost, ".agents")), false);
  const result = doctor(REAL);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("global install shim points at the live canonical entry", () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "ags-bin-"));
  const script = path.join(REAL, "scripts", "ags.mjs");
  const result = installGlobal({ binDir: bin, scriptPath: script });
  assert.equal(result.written.length, 3);
  const cmd = fs.readFileSync(path.join(bin, "ags.CMD"), "utf8");
  assert.match(cmd, /scripts\\ags\.mjs/);
  assert.equal(cmd.includes("global\\v11"), false);
  assert.match(shimFiles(script).ags, /scripts\/ags\.mjs/);
  const previous = process.env.PNPM_HOME;
  process.env.PNPM_HOME = "C:\\pnpm-home";
  assert.equal(pathIncludes("%PNPM_HOME%\\bin", "C:\\pnpm-home\\bin"), true);
  assert.equal(pathIncludes("C:\\elsewhere", "C:\\pnpm-home\\bin"), false);
  if (previous == null) delete process.env.PNPM_HOME;
  else process.env.PNPM_HOME = previous;
});

test("canonical snapshot skips ignored and lock files and filters only or except", () => {
  const repo = makeRepo("canon-snap");
  fs.writeFileSync(path.join(repo, ".gitignore"), "secret/\n");
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  fs.writeFileSync(path.join(repo, "pnpm-lock.yaml"), "lock\n");
  fs.mkdirSync(path.join(repo, "rules"));
  fs.writeFileSync(path.join(repo, "rules", "core.md"), "# Core\n");
  fs.mkdirSync(path.join(repo, "skills"));
  fs.writeFileSync(path.join(repo, "skills", "a.md"), "a\n");
  fs.mkdirSync(path.join(repo, "secret"), { recursive: true });
  fs.writeFileSync(path.join(repo, "secret", "nope.txt"), "no\n");
  const files = listCanonicalFiles(repo);
  assert.ok(files.includes("package.json"));
  assert.equal(files.includes("pnpm-lock.yaml"), true);
  assert.equal(files.some((rel) => rel.startsWith("secret/")), false);
  const only = selectCanonicalFiles(files, { only: ["base", "rules"] });
  assert.ok(only.includes("package.json"));
  assert.ok(only.includes("rules/core.md"));
  assert.equal(only.includes("skills/a.md"), false);
  const except = selectCanonicalFiles(files, { except: ["skills"] });
  assert.equal(except.includes("skills/a.md"), false);
  assert.ok(except.includes("rules/core.md"));
  assert.throws(() => selectCanonicalFiles(files, { only: ["base"], except: ["skills"] }));
  const written = writeCanonicalSnapshot(repo, { only: ["base"], out: path.join(repo, ".tmp", "canon.zip") });
  const names = readStoredZip(fs.readFileSync(written.path)).map((entry) => entry.name);
  assert.ok(names.includes("package.json"));
  assert.equal(names.some((name) => name.startsWith("rules/")), false);
  assert.equal(names.includes("pnpm-lock.yaml"), true);
});

test("doctor resolves the canonical root from another directory", () => {
  const result = spawnSync(process.execPath, [path.join(REAL, "scripts", "ags.mjs"), "doctor"], {
    cwd: os.tmpdir(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /canonical:/);
  assert.match(result.stdout.replaceAll("\\", "/").toLowerCase(), new RegExp(REAL.replaceAll("\\", "/").toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("schema, offered evidence, unlisted defaults, and skill install report", async () => {
  assert.ok(validateRegistry({ format: 2, hosts: [] }).length > 0);
  assert.ok(validateRegistry({ format: 1, hosts: [{ id: "Bad", name: "Bad", path: "relative" }] }).length > 0);
  const root = makeCanonical();
  assert.ok(validateSettings({ format: 1, host: "x", canonicalRoot: root, reporting: "yes" }, root).length > 0);
  const ui = makeRepo("ui-host");
  fs.writeFileSync(path.join(ui, "package.json"), JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }));
  const preview = installHost(root, ui, { yes: false, id: "ui-host", name: "UI" });
  assert.ok(preview.plan.offered.includes("ui-library-css"));
  assert.equal(preview.plan.offered.includes("css-theme-tokens"), false);
  assert.equal(preview.plan.skills.enabled.includes("ui-library-css"), true);
  assert.equal(preview.plan.skills.enabled.includes("css-authoring-conventions"), false);
  installHost(root, ui, { yes: true, id: "ui-host", name: "UI" });
  const catalog = fs.readFileSync(path.join(root, "catalog.yaml"), "utf8");
  fs.writeFileSync(path.join(root, "catalog.yaml"), catalog.replace("rules: []", "rules:\n  - id: later-rule\n    path: rules/later-rule.md\n    description: Later.\n    default: true\n    keywords: [later]\n"));
  fs.writeFileSync(path.join(root, "rules", "later-rule.md"), "# Later\n");
  updateHost(root, ui, { yes: true });
  const settings = readSettings(ui);
  assert.equal(settings.rules.enabled.includes("later-rule"), false);
  assert.equal(settings.rules.disabled.includes("later-rule"), false);
  const relocated = displayPath(path.join(root, "relocated-marker"));
  const yaml = fs.readFileSync(path.join(ui, ".agents", "ags.yaml"), "utf8").replace(displayPath(root), relocated);
  fs.writeFileSync(path.join(ui, ".agents", "ags.yaml"), yaml);
  const adopted = adoptCanonicalRoot(root, ui);
  assert.equal(adopted.changed, true);
  assert.equal(readSettings(ui).canonicalRoot, displayPath(root));
  assert.match(fs.readFileSync(path.join(ui, ".agents", "AGS.md"), "utf8"), new RegExp(displayPath(root).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const from = fs.mkdtempSync(path.join(os.tmpdir(), "ags-skill-"));
  fs.writeFileSync(path.join(from, "SKILL.md"), "---\nname: extra-skill\ndescription: Extra.\n---\n");
  const installed = await installSkill(root, { from, id: "extra-skill", kind: "custom", description: "Extra skill.", yes: true });
  assert.equal(installed.applied, true);
  assert.match(fs.readFileSync(path.join(root, "catalog.yaml"), "utf8"), /extra-skill/);
  const month = new Date().toISOString().slice(0, 7);
  const changes = fs.readFileSync(path.join(root, "reports", "changes", `${month}.jsonl`), "utf8");
  assert.match(changes, /"host":"AGS"/);
  assert.match(changes, /skills\/extra-skill\/SKILL.md/);
  fs.mkdirSync(path.join(ui, ".agents", "skills", "local-only", "SKILL.md").replace(/SKILL.md$/, ""), { recursive: true });
  fs.writeFileSync(path.join(ui, ".agents", "skills", "local-only", "SKILL.md"), "---\nname: local-only\ndescription: Local.\n---\n");
  const synced = syncHosts(root, { route: ui });
  assert.ok(synced[0].repairs.includes("ags skills reconcile --route <host>"));
  assert.equal(synced[0].repairs.includes("ags host repair --route <host> --overwrite-managed"), false);
});

test("nested route reaches host commands and doctor checks git root", async () => {
  const root = makeCanonical();
  const host = makeRepo("nested-cmd");
  installHost(root, host, { yes: true, id: "nested-cmd", name: "Nested Cmd" });
  const nested = path.join(host, "src", "app");
  fs.mkdirSync(nested, { recursive: true });
  updateHost(root, nested, { yes: true });
  syncHosts(root, { route: nested });
  repairHost(root, nested, { yes: false, overwriteManaged: true });
  setReporting(root, { route: nested, value: false });
  const usage = await recordUsage(root, nested, { fileArgs: ["rules/core.md=1"] });
  assert.equal(usage.disabled, true);
  await recordChanges(root, nested, { files: ["AGENTS.md"], note: "nested" });
  const dry = await reconcile(root, { route: nested, dryRun: true });
  assert.equal(dry.ok, true);
  const pending = unregisterHost(root, { route: nested, yes: false });
  assert.equal(pending.applied, false);
  const shot = writeSnapshot(root, resolveRoute(nested), loadCatalog(root), readSettings(host), path.join(host, ".tmp", "nested.zip"));
  assert.ok(shot.bytes > 0);
  writeDiff(nested, "nested-staged", "staged");
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(REAL, "scripts", "ags.mjs"), path.join(root, "scripts", "ags.mjs"));
  const checked = doctor(root, nested);
  assert.equal(checked.ok, true, checked.failures.join("\n"));
  const sub = path.join(host, "not-root");
  fs.mkdirSync(path.join(sub, ".agents"), { recursive: true });
  fs.writeFileSync(path.join(sub, ".agents", "ags.yaml"), "format: 1\n");
  const drifted = doctor(root, sub);
  assert.equal(drifted.ok, false);
  assert.ok(drifted.failures.some((line) => line.includes("Git root")));
});
