import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { commitAll, digestOf, git, makeAgsRepo, makeHostRepo, REAL_ROOT, sampleCatalog, sampleMaterial, sha256, tag, treeSnapshot, writeFiles } from "./helpers/fixtures.mjs";

const CONFIG_TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8").replaceAll("\r\n", "\n");
const REF = ".agents/skills/plan-work/references";
const SETUP = {
  "AGENTS.md": "# Old agents\n",
  "CLAUDE.md": "# Old claude\n",
  ".cursorrules": "old rules\n",
  ".cursor/rules/x.mdc": "x\n",
};

const PREPARE_POINTS = [
  "after-host-lock",
  "after-exclude-block",
  "after-manifest-written",
  "after-move-first",
  "after-move-middle",
  "after-move-last",
  "before-manifest-complete",
];
const INSTALL_POINTS = [
  ...PREPARE_POINTS,
  "after-manifest-complete",
  "after-ags-yaml",
  "after-managed-write-first",
  "after-managed-write-middle",
  "after-managed-write-last",
  "after-agents-block",
  "after-registry",
];
const UPDATE_POINTS = [
  "after-host-lock",
  "after-exclude-backup",
  "after-exclude-block",
  "after-backup-first",
  "after-backup-middle",
  "after-backup-last",
  "after-backup-manifest",
  "after-promotion-first",
  "after-promotion-middle",
  "after-promotion-last",
  "after-notes",
  "after-ags-yaml",
  "after-managed-write-first",
  "after-managed-write-middle",
  "after-managed-write-last",
  "after-deletion-first",
  "after-deletion-middle",
  "after-deletion-last",
  "after-agents-block",
  "after-registry",
];
const BUMP_POINTS = ["after-changelog", "after-package-json", "after-commit"];

const LIMIT = 8;
let active = 0;
const waiting = [];

async function limited(fn) {
  while (active >= LIMIT) await new Promise((resolve) => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

const baselines = new Map();

function baseline(key, build) {
  if (!baselines.has(key)) baselines.set(key, build());
  return baselines.get(key);
}

function cli(agsRoot, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(agsRoot, "scripts", "ags.mjs"), ...args], {
      cwd: agsRoot,
      windowsHide: true,
      env: { ...process.env, AGS_TEST_FAULT: "", ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr, text: `${stdout}\n${stderr}` }));
  });
}

function decideFlags(text, decide) {
  const match = text.match(/^Decisions needed: (.+)$/m);
  if (!match) return [];
  return match[1].split(", ").flatMap((item) => {
    assert.ok(decide[item], `No decision given for ${item}:\n${text}`);
    return ["--decide", `${item}=${decide[item]}`];
  });
}

async function confirm(agsRoot, args, { decide = {}, env = {} } = {}) {
  const first = await cli(agsRoot, args);
  assert.equal(first.code, 3, first.text);
  const second = await cli(agsRoot, [...args, "--plan", digestOf(first.text), ...decideFlags(first.text, decide)], env);
  return { first, second };
}

function row(text, rel) {
  return text.split("\n").find((line) => line.startsWith(`${rel} `)) ?? "";
}

function rows(text, pattern) {
  return text.split("\n").filter((line) => pattern.test(line));
}

function read(root, rel) {
  const file = path.join(root, ...rel.split("/"));
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function agsVersionOf(host) {
  const text = read(host, ".agents/ags.yaml");
  return text == null ? undefined : parse(text).agsVersion;
}

function hostState(host) {
  return { tree: treeSnapshot(host, { exclude: [".tmp/ags/backups"] }), exclude: read(host, ".git/info/exclude") };
}

function byPath(records = []) {
  return [...records].sort((a, b) => a.path.localeCompare(b.path));
}

function agsState(ags) {
  const registry = parse(read(ags, "hosts.yaml") ?? "hosts: []");
  const hosts = (registry.hosts || []).map(({ path: _path, ...entry }) => ({ ...entry, ignored: byPath(entry.ignored), promoted: byPath(entry.promoted) }));
  return { tree: treeSnapshot(ags, { exclude: ["node_modules", ".tmp", "reports", "hosts.yaml"] }), hosts };
}

function assertLocksReleased(host, ags) {
  if (host) assert.equal(fs.existsSync(path.join(host, ".tmp", "ags", "locks", "host")), false, "host lock left");
  assert.equal(fs.existsSync(path.join(ags, ".tmp", "ags", "locks", "ags")), false, "AGS lock left");
}

function assertSetupInOneBackup(host) {
  const parent = path.join(host, ".tmp", "ags", "backups");
  const folders = fs.existsSync(parent) ? fs.readdirSync(parent) : [];
  const holding = folders.filter((name) => {
    const manifest = path.join(parent, name, "manifest.json");
    if (!fs.existsSync(manifest)) return false;
    return JSON.parse(fs.readFileSync(manifest, "utf8")).files.some((entry) => entry.original in SETUP);
  });
  assert.equal(holding.length, 1, `setup backups: ${holding.join(", ")}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(parent, holding[0], "manifest.json"), "utf8"));
  assert.equal(manifest.complete, true);
  assert.deepEqual(manifest.files.map((entry) => entry.original).sort(), Object.keys(SETUP).sort());
  for (const entry of manifest.files) {
    assert.equal(sha256(fs.readFileSync(path.join(parent, holding[0], ...entry.backup.split("/")))), sha256(SETUP[entry.original]));
  }
}

function hostArgs(command, host, extra = []) {
  return ["host", command, "--route", host, ...extra];
}

function hostFixture() {
  const ags = makeAgsRepo({ catalog: sampleCatalog(), files: { ...sampleMaterial(), "templates/ags.yaml": CONFIG_TEMPLATE }, tags: ["2.0.0"], cli: true });
  const host = makeHostRepo({ files: SETUP });
  return { ags, host };
}

function prepareRerunCheck(point, text) {
  if (point === "after-host-lock") assert.notEqual(row(text, ".git/info/exclude"), "", text);
  if (point === "after-exclude-block") assert.equal(row(text, ".git/info/exclude"), "", text);
  if (point === "after-host-lock" || point === "after-exclude-block") assert.doesNotMatch(text, /Continuing the incomplete prepare backup/);
  else if (PREPARE_POINTS.includes(point)) assert.match(text, /Continuing the incomplete prepare backup/);
}

// prepare

async function prepareFinal() {
  const { ags, host } = hostFixture();
  const { second } = await confirm(ags, hostArgs("prepare", host));
  assert.equal(second.code, 0, second.text);
  return hostState(host);
}

async function prepareCase(point, { crash = false } = {}) {
  const expected = await baseline("prepare", prepareFinal);
  const { ags, host } = hostFixture();
  const args = hostArgs("prepare", host);
  const failed = await confirm(ags, args, { env: { AGS_TEST_FAULT: `prepare:${point}${crash ? ":crash" : ""}` } });
  assert.equal(failed.second.code, 1, failed.second.text);
  assert.equal(agsVersionOf(host), undefined);
  if (crash) assertCrashLeftLock(host);
  else {
    assert.match(failed.second.text, /Rerun: ags host prepare/);
    assertLocksReleased(host, ags);
  }
  const rerun = await confirm(ags, args);
  prepareRerunCheck(point, rerun.first.text);
  if (crash) assert.notEqual(row(rerun.first.text, ".git/info/exclude"), "", rerun.first.text);
  assert.equal(rerun.second.code, 0, rerun.second.text);
  assert.deepEqual(hostState(host), expected);
  assertSetupInOneBackup(host);
  assertLocksReleased(host, ags);
}

function assertCrashLeftLock(host) {
  assert.ok(fs.existsSync(path.join(host, ".tmp", "ags", "locks", "host")), "the crash should leave the host lock");
  git(host, ["check-ignore", "-q", ".tmp/"], { allow: [1] });
}

// install

async function installFinal() {
  const { ags, host } = hostFixture();
  const { second } = await confirm(ags, hostArgs("install", host));
  assert.equal(second.code, 0, second.text);
  return { host: hostState(host), ags: agsState(ags) };
}

async function installCase(point, { crash = false } = {}) {
  const expected = await baseline("install", installFinal);
  const { ags, host } = hostFixture();
  const args = hostArgs("install", host);
  const failed = await confirm(ags, args, { env: { AGS_TEST_FAULT: `install:${point}${crash ? ":crash" : ""}` } });
  assert.equal(failed.second.code, 1, failed.second.text);
  assert.equal(agsVersionOf(host), undefined);
  if (crash) assertCrashLeftLock(host);
  else {
    assert.match(failed.second.text, /Rerun: ags host install/);
    assertLocksReleased(host, ags);
  }
  const rerun = await confirm(ags, args);
  const text = rerun.first.text;
  prepareRerunCheck(point, text);
  if (crash) assert.notEqual(row(text, ".git/info/exclude"), "", text);
  const resumed = INSTALL_POINTS.indexOf(point) >= INSTALL_POINTS.indexOf("after-ags-yaml");
  if (point === "after-manifest-complete") {
    assert.doesNotMatch(text, /Continuing the incomplete prepare backup|Resuming the interrupted install/);
    assert.equal(rows(text, /^\.tmp\/ags\/backups\//).length, 0, text);
  }
  if (resumed) assert.match(text, /Resuming the interrupted install/);
  if (point === "after-registry") {
    assert.equal(row(text, "hosts.yaml"), "", text);
    assert.match(row(text, ".agents/ags.yaml"), /set agsVersion/);
  }
  assert.equal(rerun.second.code, 0, rerun.second.text);
  assert.deepEqual(hostState(host), expected.host);
  assert.deepEqual(agsState(ags), expected.ags);
  assertSetupInOneBackup(host);
  assertLocksReleased(host, ags);
}

// update

const PROMOTED = [`${REF}/g.md`, `${REF}/n1.md`, `${REF}/n2.md`];
const UPDATE_DECISIONS = { ".git/info/exclude": "restore", ...Object.fromEntries(PROMOTED.map((rel) => [rel, "promote"])) };
const EXCLUDE_EDITED = "# keep me\n# AGS:BEGIN\n/.tmpx/\n# AGS:END\n";

async function updateFixture() {
  const files = { ...sampleMaterial(), "templates/ags.yaml": CONFIG_TEMPLATE };
  for (const name of ["a", "b", "c", "d", "e", "f", "g"]) files[`skills/plan-work/references/${name}.md`] = `# ${name}\n`;
  const ags = makeAgsRepo({ catalog: sampleCatalog(), files, tags: ["2.0.0"], cli: true });
  const host = makeHostRepo();
  const installed = await confirm(ags, hostArgs("install", host));
  assert.equal(installed.second.code, 0, installed.second.text);
  writeFiles(ags, { "skills/plan-work/references/a.md": "# a2\n", "skills/plan-work/references/b.md": "# b2\n", "skills/plan-work/references/c.md": "# c2\n" });
  for (const name of ["d", "e", "f"]) fs.rmSync(path.join(ags, "skills", "plan-work", "references", `${name}.md`));
  commitAll(ags, "release 2.0.1");
  tag(ags, "2.0.1");
  writeFiles(host, { [`${REF}/g.md`]: "# g host\n", [`${REF}/n1.md`]: "# n1\n", [`${REF}/n2.md`]: "# n2\n" });
  fs.writeFileSync(path.join(host, ".git", "info", "exclude"), EXCLUDE_EDITED);
  return { ags, host };
}

const updateArgs = (host) => hostArgs("update", host, ["--enable", "style"]);

async function updateFinal() {
  const { ags, host } = await updateFixture();
  const { second } = await confirm(ags, updateArgs(host), { decide: UPDATE_DECISIONS });
  assert.equal(second.code, 0, second.text);
  assert.equal(agsVersionOf(host), "2.0.1");
  return { host: hostState(host), ags: agsState(ags) };
}

async function updateCase(point) {
  const expected = await baseline("update", updateFinal);
  const { ags, host } = await updateFixture();
  const args = updateArgs(host);
  const failed = await confirm(ags, args, { decide: UPDATE_DECISIONS, env: { AGS_TEST_FAULT: `update:${point}` } });
  assert.equal(failed.second.code, 1, failed.second.text);
  assert.match(failed.second.text, /Rerun: ags host update .*--to 2\.0\.1/);
  assert.equal(agsVersionOf(host), "2.0.0");
  assertLocksReleased(host, ags);

  const rerun = await confirm(ags, args, { decide: UPDATE_DECISIONS });
  const text = rerun.first.text;
  const at = UPDATE_POINTS.indexOf(point);
  const excludeRow = row(text, ".git/info/exclude");
  if (at < UPDATE_POINTS.indexOf("after-exclude-block")) assert.match(excludeRow, /restore/, text);
  else assert.equal(excludeRow, "", text);
  const recorded = rows(text, /record promotion/).length;
  const promotedBefore = { "after-promotion-first": 1, "after-promotion-middle": 2 }[point];
  if (promotedBefore) assert.equal(recorded, promotedBefore, text);
  else if (at >= UPDATE_POINTS.indexOf("after-promotion-last") && point !== "after-registry") assert.equal(recorded, PROMOTED.length, text);
  else assert.equal(recorded, 0, text);
  if (point === "after-registry") {
    assert.equal(row(text, "hosts.yaml"), "", text);
    for (const rel of PROMOTED) assert.equal(row(text, rel), "", text);
  }
  assert.equal(rerun.second.code, 0, rerun.second.text);
  assert.equal(agsVersionOf(host), "2.0.1");
  assert.deepEqual(hostState(host), expected.host);
  assert.deepEqual(agsState(ags), expected.ags);
  assert.equal(read(ags, "CHANGELOG.md").match(/Promoted: `/g).length, PROMOTED.length);
  assertLocksReleased(host, ags);
}

// version bump

function bumpFixture() {
  return makeAgsRepo({ catalog: sampleCatalog(), files: sampleMaterial(), version: "2.0.0", tags: ["2.0.0"], cli: true, changelog: "## Unreleased\n- A note.\n" });
}

function releaseState(ags) {
  return {
    tree: treeSnapshot(ags, { exclude: ["node_modules", ".tmp", "reports"] }),
    headTree: git(ags, ["rev-parse", "HEAD^{tree}"]),
    subject: git(ags, ["log", "-1", "--format=%s"]),
    commits: git(ags, ["rev-list", "--count", "HEAD"]),
    tags: git(ags, ["tag", "-l"]),
    tagType: git(ags, ["cat-file", "-t", "v2.0.1"]),
    tagMessage: git(ags, ["tag", "-l", "--format=%(contents)", "v2.0.1"]),
    tagged: git(ags, ["rev-parse", "v2.0.1^{commit}"]) === git(ags, ["rev-parse", "HEAD"]),
  };
}

async function bumpFinal() {
  const ags = bumpFixture();
  const { second } = await confirm(ags, ["version", "bump", "patch"]);
  assert.equal(second.code, 0, second.text);
  return releaseState(ags);
}

async function bumpCase(point) {
  const expected = await baseline("bump", bumpFinal);
  const ags = bumpFixture();
  const args = ["version", "bump", "patch"];
  const failed = await confirm(ags, args, { env: { AGS_TEST_FAULT: `bump:${point}` } });
  assert.equal(failed.second.code, 1, failed.second.text);
  assert.equal(git(ags, ["tag", "-l", "v2.0.1"]), "");
  assertLocksReleased(null, ags);
  if (point === "after-commit") {
    assert.match(failed.second.text, /Recovery: run ags version bump patch again; it creates the missing tag\./);
    const rerun = await confirm(ags, args);
    assert.match(rerun.first.text, /complete the untagged release 2\.0\.1/);
    assert.equal(row(rerun.first.text, "CHANGELOG.md"), "", rerun.first.text);
    assert.equal(rerun.second.code, 0, rerun.second.text);
  } else {
    assert.match(failed.second.text, /git restore -- CHANGELOG\.md package\.json/);
    const refused = await cli(ags, args);
    assert.equal(refused.code, 1, refused.text);
    assert.match(refused.text, /git restore -- CHANGELOG\.md package\.json/);
    git(ags, ["restore", "--", "CHANGELOG.md", "package.json"]);
    const rerun = await confirm(ags, args);
    assert.equal(rerun.second.code, 0, rerun.second.text);
  }
  assert.deepEqual(releaseState(ags), expected);
  assertLocksReleased(null, ags);
}

describe("fault points", { concurrency: true }, () => {
  for (const point of PREPARE_POINTS) it(`prepare:${point}`, () => limited(() => prepareCase(point)));
  it("prepare:after-host-lock:crash", () => limited(() => prepareCase("after-host-lock", { crash: true })));
  for (const point of INSTALL_POINTS) it(`install:${point}`, () => limited(() => installCase(point)));
  it("install:after-host-lock:crash", () => limited(() => installCase("after-host-lock", { crash: true })));
  for (const point of UPDATE_POINTS) it(`update:${point}`, () => limited(() => updateCase(point)));
  for (const point of BUMP_POINTS) it(`bump:${point}`, () => limited(() => bumpCase(point)));
});
