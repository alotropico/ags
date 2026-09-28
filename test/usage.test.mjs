import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { main } from "../scripts/ags.mjs";
import { hostInstall } from "../scripts/lib/host.mjs";
import { acquireLock, hostLockPath } from "../scripts/lib/reports.mjs";
import { AgsError } from "../scripts/lib/util.mjs";
import { commitAll, digestOf, git, makeAgsRepo, makeHostRepo, quietTerminal, REAL_ROOT, sampleCatalog, sampleMaterial } from "./helpers/fixtures.mjs";

const CONFIG_TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8").replaceAll("\r\n", "\n");
const USAGE = [".tmp", "ags", "reports", "usage.jsonl"];

function options(extra = {}) {
  return { dryRun: false, plan: null, decide: new Map(), decideAll: null, env: { AGS_TEST_FAULT: "" }, ...extra };
}

async function installedHost() {
  const ags = makeAgsRepo({ catalog: sampleCatalog(), files: { ...sampleMaterial(), "templates/ags.yaml": CONFIG_TEMPLATE }, tags: ["2.0.0"] });
  const host = makeHostRepo();
  const args = ["host", "install", "--route", host];
  const first = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: first, options: options() }), 3, first.text());
  const second = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: second, options: options({ plan: digestOf(first.text()) }) }), 0, second.text());
  return { ags, host };
}

async function report(ags, argv) {
  const terminal = quietTerminal();
  try {
    return { code: await main(["report", "usage", ...argv], { terminal, agsRoot: ags }), text: terminal.text() };
  } catch (error) {
    if (!(error instanceof AgsError)) throw error;
    return { code: error.exitCode || 1, text: error.message };
  }
}

function records(root) {
  const file = path.join(root, ...USAGE);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
}

function sha(root, rel) {
  return createHash("sha256").update(fs.readFileSync(path.join(root, ...rel.split("/")))).digest("hex");
}

test("usage: one record per call with the 18.3 shape, and duplicate paths collapse to the highest level", async () => {
  const { ags, host } = await installedHost();
  const skill = ".agents/skills/plan-work/SKILL.md";
  const result = await report(ags, ["--route", host, "--file", `${skill}=3`, "--file", `./${skill}=6`, "--file", "AGENTS.md=4", "--label", "Plan the export"]);
  assert.equal(result.code, 0, result.text);
  const [record] = records(host);
  assert.equal(records(host).length, 1);
  assert.match(record.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(record.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(record.agsVersion, "2.0.0");
  assert.equal(record.label, "Plan the export");
  assert.deepEqual(record.files, [
    { path: skill, level: 6, sha256: sha(host, skill) },
    { path: "AGENTS.md", level: 4, sha256: sha(host, "AGENTS.md") },
  ]);
  assert.equal((await report(ags, ["--route", host, "--file", "AGENTS.md=0"])).code, 0);
  assert.equal(records(host).length, 2);
});

test("usage: paths outside the managed set and bad levels are refused without writing", async () => {
  const { ags, host } = await installedHost();
  for (const file of [".agents/ags.yaml=2", "README.md=2", ".agents/skills/ship/SKILL.md=2", "../x.md=1", "AGENTS.md=9", "AGENTS.md=high", "AGENTS.md"]) {
    const result = await report(ags, ["--route", host, "--file", file]);
    assert.equal(result.code, 1, `${file}: ${result.text}`);
  }
  assert.equal((await report(ags, ["--route", host])).code, 2);
  assert.deepEqual(records(host), []);
});

test("usage: reporting false is a successful no-op", async () => {
  const { ags, host } = await installedHost();
  const config = path.join(host, ".agents", "ags.yaml");
  fs.writeFileSync(config, fs.readFileSync(config, "utf8").replace(/^reporting: true$/m, "reporting: false"));
  assert.match(fs.readFileSync(config, "utf8"), /^reporting: false$/m);
  const result = await report(ags, ["--route", host, "--file", "AGENTS.md=5"]);
  assert.equal(result.code, 0, result.text);
  assert.match(result.text, /nothing recorded/);
  assert.equal(fs.existsSync(path.join(host, ...USAGE)), false);
});

test("usage: recording takes the host lock and is blocked while another command holds it", async () => {
  const { ags, host } = await installedHost();
  const release = await acquireLock(hostLockPath(host), "host update");
  try {
    const blocked = await report(ags, ["--route", host, "--file", "AGENTS.md=2"]);
    assert.equal(blocked.code, 1, blocked.text);
    assert.match(blocked.text, /Lock held by host update/);
    assert.deepEqual(records(host), []);
  } finally {
    release();
  }
  assert.equal((await report(ags, ["--route", host, "--file", "AGENTS.md=2"])).code, 0);
  assert.equal(records(host).length, 1);
  assert.equal(fs.existsSync(hostLockPath(host)), false);
});

test("usage: works in a linked worktree and records in that worktree", async () => {
  const { ags, host } = await installedHost();
  commitAll(host, "install ags");
  const worktree = path.join(path.dirname(host), "linked");
  git(host, ["worktree", "add", "-q", worktree, "-b", "linked"]);
  const result = await report(ags, ["--route", path.join(worktree, ".agents"), "--file", "AGENTS.md=2"]);
  assert.equal(result.code, 0, result.text);
  assert.equal(records(worktree).length, 1);
  assert.deepEqual(records(host), []);
});

test("usage: a host without an installation is refused", async () => {
  const { ags } = await installedHost();
  const bare = makeHostRepo({ name: "bare" });
  const result = await report(ags, ["--route", bare, "--file", "AGENTS.md=1"]);
  assert.equal(result.code, 1);
  assert.match(result.text, /no AGS installation/);
});
