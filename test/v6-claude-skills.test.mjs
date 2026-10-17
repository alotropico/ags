import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "yaml";
import { aliasFindings, inspectAliases, probeAliasType, readAliasRecord } from "../scripts/lib/claude-skills.mjs";
import { hostInstall, hostUpdate, updateOperation } from "../scripts/lib/host.mjs";
import { parseSets, validateConfig } from "../scripts/lib/config.mjs";
import { discoverSkillNames } from "../scripts/lib/skills.mjs";
import { collectSnapshot } from "../scripts/lib/snapshot.mjs";
import { observeHost } from "../scripts/lib/observed.mjs";
import { analyzeAliasExclude, analyzeExclude } from "../scripts/lib/render.mjs";
import { digestOf, git, makeAgsRepo, makeHostRepo, quietTerminal, sampleCatalog, sampleMaterial, skillFile, tempDir, treeSnapshot, writeFiles } from "./helpers/fixtures.mjs";

const template = "format: 2\nhost: fixture\nskills:\n  enabled: []\n  disabled: []\nrules:\n  enabled: []\n  disabled: []\nlocal: {}\n";
function fixture() {
  const ags = makeAgsRepo({ version: "6.0.0", tags: ["6.0.0"], catalog: sampleCatalog(), files: { ...sampleMaterial(), "templates/ags.yaml": template } });
  const host = makeHostRepo({ name: "host with spaces" });
  return { ags, host };
}
const options = extra => ({ dryRun: false, plan: null, decide: new Map(), env: { AGS_TEST_FAULT: "" }, ...extra });
async function install(ags, host, extra = {}) {
  const args = { agsRoot: ags, route: host, id: "fixture", officialSkills: false, sets: ["integrations.claudeSkills=true"], rerunArgs: ["host", "install", "--route", host], ...extra };
  const preview = quietTerminal();
  assert.equal(await hostInstall({ ...args, terminal: preview, options: options({ dryRun: true }) }), 0, preview.text());
  const apply = quietTerminal();
  assert.equal(await hostInstall({ ...args, terminal: apply, options: options({ plan: digestOf(preview.text()) }) }), 0, apply.text());
  return preview.text();
}
async function update(ags, host, extra = {}, opt = {}) {
  const terminal = quietTerminal();
  const code = await hostUpdate({ agsRoot: ags, route: host, rerunArgs: ["host", "update", "--route", host], terminal, options: options(opt), ...extra });
  return { code, text: terminal.text() };
}
async function reviewedUpdate(ags, host, extra = {}, opt = {}) {
  const preview = await update(ags, host, extra, { dryRun: true });
  assert.equal(preview.code, 0, preview.text);
  const applied = await update(ags, host, extra, { plan: digestOf(preview.text), ...opt });
  return { ...applied, preview: preview.text };
}
const excludePath = host => path.join(host, ".git/info/exclude");
const readExclude = host => fs.readFileSync(excludePath(host), "utf8");
function ignored(host, rel) {
  try { git(host, ["check-ignore", "-q", "--", rel]); return true; } catch { return false; }
}
function stripAliasRegion(host) {
  const text = readExclude(host).replace(/# AGS:CLAUDE-ALIASES:BEGIN[\s\S]*?# AGS:CLAUDE-ALIASES:END\r?\n/, "");
  fs.writeFileSync(excludePath(host), text);
  return text;
}
function fixtureLink(target, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.symlinkSync(target, file, process.platform === "win32" ? "junction" : "dir");
}

test("Claude preference is one supported boolean and absent means no links", async () => {
  const catalog = sampleCatalog();
  assert.equal(parseSets(["integrations.claudeSkills=true"], catalog).get("integrations.claudeSkills"), true);
  assert.throws(() => parseSets(["integrations.claudeSkills=maybe"], catalog), /expects true or false/);
  assert.throws(() => parseSets(["integrations.other=true"], catalog), /reserved keys/);
  assert.deepEqual(validateConfig({ format: 2, integrations: { claudeSkills: false } }, catalog), []);
  assert.match(validateConfig({ format: 2, integrations: { claudeSkills: "false" } }, catalog).join("\n"), /supported boolean/);
  const { ags, host } = fixture();
  await install(ags, host, { sets: [] });
  assert.equal(fs.existsSync(path.join(host, ".claude")), false);
});

test("Claude lifecycle uses one alias per installed skill, preserves third-party entries, and snapshots only descriptors", async () => {
  const { ags, host } = fixture();
  writeFiles(host, { ".claude/skills/third-party/SKILL.md": skillFile("third-party", "Independent."), ".claude/settings.json": "{}\n" });
  const text = await install(ags, host, { enable: ["style", "css-rules"] });
  assert.match(text, /Claude skill alias\s+create/);
  let records = readAliasRecord(ags, host, "fixture");
  assert.deepEqual(records.map(item => item.id), ["css-clean", "css-rules", "plan-work"]);
  for (const item of records) assert.equal(fs.realpathSync(path.join(host, item.path)), fs.realpathSync(path.join(host, item.expectedTarget)));
  assert.deepEqual(discoverSkillNames(host), ["css-clean", "css-rules", "plan-work", "third-party"]);
  observeHost(ags, host);
  assert.deepEqual(readAliasRecord(ags, host, "fixture"), records);
  const packed = collectSnapshot(host, { host: "fixture", agsVersion: "6.0.0", claudeAliases: records });
  assert.deepEqual(packed.manifest.claudeAliases, records);
  assert.equal(packed.files.some(file => file.name.startsWith(".claude/")), false);
  assert.equal(packed.files.filter(file => file.name.endsWith("plan-work/SKILL.md")).length, 1);
  const repeated = await update(ags, host);
  assert.equal(repeated.code, 0, repeated.text);
  assert.doesNotMatch(repeated.text, /Claude skill alias\s+(create|adopt|remove)/);
  const preview = await update(ags, host, { sets: ["integrations.claudeSkills=false"], disable: ["css-rules"] }, { dryRun: true });
  assert.match(preview.text, /Claude skill alias\s+remove/);
  const before = treeSnapshot(host);
  assert.equal(readAliasRecord(ags, host, "fixture").length, 3);
  assert.deepEqual(treeSnapshot(host), before);
  const applied = await update(ags, host, { sets: ["integrations.claudeSkills=false"], disable: ["css-rules"] }, { plan: digestOf(preview.text) });
  assert.equal(applied.code, 0, applied.text);
  assert.deepEqual(readAliasRecord(ags, host, "fixture"), []);
  assert.equal(fs.existsSync(path.join(host, ".agents/skills/plan-work/SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(host, ".claude/skills/third-party/SKILL.md")), true);
  assert.equal(fs.readFileSync(path.join(host, ".claude/settings.json"), "utf8"), "{}\n");
  const backups = fs.readdirSync(path.join(host, ".tmp/ags/backups")).filter(name => name.endsWith("-update"));
  const manifest = JSON.parse(fs.readFileSync(path.join(host, ".tmp/ags/backups", backups.at(-1), "manifest.json"), "utf8"));
  assert.equal(manifest.claudeAliases.length, 3);
  assert.equal(manifest.files.some(item => item.original.startsWith(".claude/")), false);
});

test("exact unrecorded alias adoption is reviewable and retargeting never deletes host entries", async () => {
  const { ags, host } = fixture();
  await install(ags, host, { sets: [] });
  const link = path.join(host, ".claude/skills/plan-work");
  fixtureLink(path.join(host, ".agents/skills/plan-work"), link);
  const preview = await update(ags, host, { sets: ["integrations.claudeSkills=true"] }, { dryRun: true });
  assert.match(preview.text, /adopt \(reviewed exact target\)/);
  assert.equal(readAliasRecord(ags, host, "fixture").length, 0);
  const applied = await update(ags, host, { sets: ["integrations.claudeSkills=true"] }, { plan: digestOf(preview.text) });
  assert.equal(applied.code, 0, applied.text);
  fs.unlinkSync(link);
  const outside = tempDir("ags-alias-outside-");
  writeFiles(outside, { "preserve.txt": "outside\n" });
  fixtureLink(outside, link);
  const before = treeSnapshot(host);
  await assert.rejects(update(ags, host, { sets: ["integrations.claudeSkills=false"] }), /retargeted|changed/);
  assert.equal(fs.readlinkSync(link), outside);
  assert.deepEqual(treeSnapshot(host), before);
  assert.equal(fs.readFileSync(path.join(outside, "preserve.txt"), "utf8"), "outside\n");
});

test("file, directory, wrong link, dangling link and linked parents refuse before writes", () => {
  for (const kind of ["file", "directory", "wrong", "dangling", "parent", "canonical-parent"]) {
    const { ags, host } = fixture();
    writeFiles(host, { ".agents/skills/plan-work/SKILL.md": skillFile("plan-work", "Plan.") });
    const outside = tempDir("ags-alias-collision-");
    const link = path.join(host, ".claude/skills/plan-work");
    fs.mkdirSync(path.dirname(link), { recursive: true });
    if (kind === "file") fs.writeFileSync(link, "host\n");
    if (kind === "directory") fs.mkdirSync(link);
    if (kind === "wrong") fixtureLink(outside, link);
    if (kind === "dangling") fixtureLink(path.join(outside, "missing"), link);
    if (kind === "parent") { fs.rmSync(path.join(host, ".claude"), { recursive: true }); fixtureLink(outside, path.join(host, ".claude")); }
    if (kind === "canonical-parent") { fs.rmSync(path.join(host, ".agents/skills"), { recursive: true }); fixtureLink(outside, path.join(host, ".agents/skills")); }
    const before = treeSnapshot(host);
    assert.throws(() => inspectAliases({ agsRoot: ags, hostRoot: host, hostId: "fixture", skills: ["plan-work"], enabled: true }), /collision|retargeted|dangling|link|real directory/i, kind);
    assert.deepEqual(treeSnapshot(host), before);
  }
});

test("changed alias observations invalidate digests, missing aliases have a reviewed repair, and interruption resumes", async () => {
  const { ags, host } = fixture();
  await install(ags, host);
  const args = { agsRoot: ags, hostRoot: host, hostId: "fixture", skills: ["plan-work"], enabled: true };
  assert.deepEqual(aliasFindings(args), []);
  const link = path.join(host, ".claude/skills/plan-work");
  fs.unlinkSync(link);
  assert.match(aliasFindings(args).join("\n"), /create via a reviewed/);
  const preview = await update(ags, host, {}, { dryRun: true });
  const interrupted = await update(ags, host, {}, { plan: digestOf(preview.text), env: { AGS_TEST_FAULT: "update:after-claude-alias-first" } });
  assert.equal(interrupted.code, 1, interrupted.text);
  assert.equal(readAliasRecord(ags, host, "fixture").length, 1);
  const resumed = await update(ags, host);
  assert.equal(resumed.code, 0, resumed.text);
  assert.deepEqual(aliasFindings(args), []);
  const op = updateOperation({ agsRoot: ags, route: host, sets: ["integrations.claudeSkills=false"], rerunArgs: [] });
  const before = op.plan(op.inspect()).header.aliases;
  const stalePreview = await update(ags, host, { sets: ["integrations.claudeSkills=false"] }, { dryRun: true });
  fs.unlinkSync(link);
  fixtureLink(path.join(host, ".agents/skills/plan-work"), link);
  const after = op.plan(op.inspect()).header.aliases;
  assert.notDeepEqual(before, after);
  const replacedTree = treeSnapshot(host);
  const stale = await update(ags, host, { sets: ["integrations.claudeSkills=false"] }, { plan: digestOf(stalePreview.text) });
  assert.equal(stale.code, 3, stale.text);
  assert.match(stale.text, /plan changed/i);
  assert.deepEqual(treeSnapshot(host), replacedTree);
  // A metadata replacement at the canonical target is also digest-bound.
  fs.appendFileSync(path.join(host, ".agents/skills/plan-work/SKILL.md"), "\nhost edit\n");
  assert.notDeepEqual(after, op.plan(op.inspect()).header.aliases);
});

test("observed inspection cannot transfer alias ownership to another host path", async () => {
  const { ags, host } = fixture();
  await install(ags, host);
  const other = makeHostRepo();
  writeFiles(other, { ".agents/ags.yaml": fs.readFileSync(path.join(host, ".agents/ags.yaml")) });
  const record = path.join(ags, "hosts/fixture.json");
  const before = fs.readFileSync(record);
  assert.throws(() => observeHost(ags, other), /different host path/);
  assert.deepEqual(fs.readFileSync(record), before);
});

test("directory-link permission failure has no elevation or copying fallback", () => {
  assert.throws(() => probeAliasType({ symlink: () => { throw Object.assign(new Error("denied"), { code: "EPERM" }); } }), /no elevation.*copy fallback/);
});

test("deselection with Claude enabled removes only managed aliases and keeps independent companions", async () => {
  const { ags, host } = fixture();
  await install(ags, host, { enable: ["css-rules", "css-clean"] });
  const preview = await update(ags, host, { disable: ["css-rules"] }, { dryRun: true });
  const applied = await update(ags, host, { disable: ["css-rules"] }, { plan: digestOf(preview.text) });
  assert.equal(applied.code, 0, applied.text);
  assert.deepEqual(readAliasRecord(ags, host, "fixture").map(item => item.id), ["css-clean", "plan-work"]);
  assert.equal(fs.existsSync(path.join(host, ".agents/skills/css-clean/SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(host, ".claude/skills/css-rules")), false);
  fs.rmSync(path.join(host, ".agents/skills/css-clean"), { recursive: true });
  const repair = await update(ags, host, {}, { dryRun: true });
  assert.match(repair.text, /remove if skill disabled/);
  const disabled = await update(ags, host, {}, { plan: digestOf(repair.text), decide: new Map([[".agents/skills/css-clean/", "disable"]]) });
  assert.equal(disabled.code, 0, disabled.text);
  assert.equal(fs.existsSync(path.join(host, ".claude/skills/css-clean")), false);
  assert.deepEqual(readAliasRecord(ags, host, "fixture").map(item => item.id), ["plan-work"]);
  assert.deepEqual(analyzeAliasExclude(readExclude(host)).lines, ["/.claude/skills/plan-work"]);
});

test("managed aliases are excluded from Git per alias, third-party entries stay visible, and disabling removes the region", async () => {
  const { ags, host } = fixture();
  writeFiles(host, { ".claude/skills/third-party/SKILL.md": skillFile("third-party", "Independent.") });
  await install(ags, host, { enable: ["style", "css-rules"] });
  const tmpRegion = analyzeExclude(readExclude(host)).kind;
  assert.deepEqual(analyzeAliasExclude(readExclude(host)).lines, ["/.claude/skills/css-clean", "/.claude/skills/css-rules", "/.claude/skills/plan-work"]);
  for (const id of ["css-clean", "css-rules", "plan-work"]) assert.equal(ignored(host, `.claude/skills/${id}`), true, id);
  assert.equal(ignored(host, ".claude/skills/third-party/SKILL.md"), false);
  const status = git(host, ["status", "--porcelain", "--untracked-files=all"]);
  assert.doesNotMatch(status, /\.claude\/skills\/(css-clean|css-rules|plan-work)/);
  assert.match(status, /\.claude\/skills\/third-party\/SKILL\.md/);
  const disabled = await reviewedUpdate(ags, host, { sets: ["integrations.claudeSkills=false"] });
  assert.equal(disabled.code, 0, disabled.text);
  assert.match(disabled.preview, /Claude alias exclude\s+remove Claude alias region/);
  assert.equal(analyzeAliasExclude(readExclude(host)).kind, "absent");
  assert.equal(analyzeExclude(readExclude(host)).kind, tmpRegion);
  assert.deepEqual(aliasFindings({ agsRoot: ags, hostRoot: host, hostId: "fixture", skills: ["plan-work"], enabled: false }), []);
});

test("a missing alias region is a doctor finding; dry runs and stale digests write nothing", async () => {
  const { ags, host } = fixture();
  await install(ags, host);
  const args = { agsRoot: ags, hostRoot: host, hostId: "fixture", skills: ["plan-work"], enabled: true };
  const stripped = stripAliasRegion(host);
  assert.match(aliasFindings(args).join("\n"), /Claude alias region of \.git\/info\/exclude is missing/);
  const preview = await update(ags, host, {}, { dryRun: true });
  assert.match(preview.text, /Claude alias exclude\s+add Claude alias region/);
  assert.equal(readExclude(host), stripped);
  fs.appendFileSync(excludePath(host), "/host-line\n");
  const edited = readExclude(host);
  const stale = await update(ags, host, {}, { plan: digestOf(preview.text) });
  assert.equal(stale.code, 3, stale.text);
  assert.equal(readExclude(host), edited);
  const applied = await reviewedUpdate(ags, host);
  assert.equal(applied.code, 0, applied.text);
  assert.match(readExclude(host), /^\/host-line$/m);
  assert.deepEqual(analyzeAliasExclude(readExclude(host)).lines, ["/.claude/skills/plan-work"]);
  assert.deepEqual(aliasFindings(args), []);
});

test("an edited alias region is restored with a backup", async () => {
  const { ags, host } = fixture();
  await install(ags, host);
  const edited = readExclude(host).replace("/.claude/skills/plan-work", "/.claude/skills/plan-work\n/elsewhere/");
  fs.writeFileSync(excludePath(host), edited);
  assert.equal(analyzeAliasExclude(edited).kind, "edited");
  assert.match(aliasFindings({ agsRoot: ags, hostRoot: host, hostId: "fixture", skills: ["plan-work"], enabled: true }).join("\n"), /was edited/);
  const applied = await reviewedUpdate(ags, host);
  assert.equal(applied.code, 0, applied.text);
  assert.match(applied.preview, /restore Claude alias region/);
  assert.deepEqual(analyzeAliasExclude(readExclude(host)).lines, ["/.claude/skills/plan-work"]);
  const folders = fs.readdirSync(path.join(host, ".tmp/ags/backups")).filter(name => name.endsWith("-update-exclude"));
  assert.equal(folders.length, 1);
  const manifest = JSON.parse(fs.readFileSync(path.join(host, ".tmp/ags/backups", folders[0], "manifest.json"), "utf8"));
  assert.equal(fs.readFileSync(path.join(host, ".tmp/ags/backups", folders[0], manifest.files[0].backup), "utf8"), edited);
});

test("an interruption after the region write and before link creation resumes", async () => {
  const { ags, host } = fixture();
  await install(ags, host);
  const link = path.join(host, ".claude/skills/plan-work");
  fs.unlinkSync(link);
  stripAliasRegion(host);
  const interrupted = await reviewedUpdate(ags, host, {}, { env: { AGS_TEST_FAULT: "update:after-claude-alias-exclude" } });
  assert.equal(interrupted.code, 1, interrupted.text);
  assert.deepEqual(analyzeAliasExclude(readExclude(host)).lines, ["/.claude/skills/plan-work"]);
  assert.equal(fs.existsSync(link), false);
  const resumed = await reviewedUpdate(ags, host);
  assert.equal(resumed.code, 0, resumed.text);
  assert.doesNotMatch(resumed.preview, /Claude alias exclude/);
  assert.equal(fs.realpathSync(link), fs.realpathSync(path.join(host, ".agents/skills/plan-work")));
  assert.deepEqual(aliasFindings({ agsRoot: ags, hostRoot: host, hostId: "fixture", skills: ["plan-work"], enabled: true }), []);
});
