import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { acquireLock, runsLockPath } from "../scripts/lib/reports.mjs";
import { makeAgsRepo, makeHostRepo, runAgs, sampleCatalog, sampleMaterial } from "./helpers/fixtures.mjs";

function agsFixture() {
  return makeAgsRepo({ catalog: sampleCatalog(), files: sampleMaterial(), cli: true });
}

function runLines(ags) {
  const dir = path.join(ags, "reports", "runs");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .sort()
    .flatMap((name) => fs.readFileSync(path.join(dir, name), "utf8").trim().split("\n").filter(Boolean).map((line) => ({ name, ...JSON.parse(line) })));
}

test("run log: one line per invocation with command, flags, params, start time and error", () => {
  const ags = agsFixture();
  const start = `${new Date().toISOString().slice(0, 19)}Z`;
  assert.equal(runAgs(ags, ["skills", "list"]).code, 0);
  assert.equal(runAgs(ags, ["version", "note", "A note."]).code, 0);
  const end = `${new Date().toISOString().slice(0, 19)}Z`;
  const lines = runLines(ags);
  assert.equal(lines.length, 2);
  const [list, note] = lines;
  assert.deepEqual(Object.keys(list), ["name", "command", "flags", "params", "at", "error"]);
  assert.deepEqual({ command: list.command, flags: list.flags, params: list.params, error: list.error }, { command: "skills list", flags: {}, params: [], error: false });
  assert.deepEqual({ command: note.command, params: note.params, error: note.error }, { command: "version note", params: ["A note."], error: false });
  assert.match(list.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(list.at >= start && note.at <= end, `${start} <= ${list.at}, ${note.at} <= ${end}`);
  assert.equal(list.name, `${list.at.slice(0, 7)}.jsonl`);
});

test("run log: error is true for exit codes 1 and 2 only, and flags are logged as given", () => {
  const ags = agsFixture();
  const bare = makeHostRepo();
  const setup = makeHostRepo({ files: { "AGENTS.md": "# Old facts\n" } });
  assert.equal(runAgs(ags, ["skills", "list"]).code, 0);
  assert.equal(runAgs(ags, ["snapshot", "--route", bare]).code, 1);
  assert.equal(runAgs(ags, ["skills", "list", "--bogus", "x"]).code, 2);
  assert.equal(runAgs(ags, ["host", "prepare", "--route", setup]).code, 3);
  assert.equal(runAgs(ags, ["host", "prepare", "--route", setup, "--dry-run"]).code, 0);
  const lines = runLines(ags).map(({ command, flags, error }) => ({ command, flags, error }));
  assert.deepEqual(lines, [
    { command: "skills list", flags: {}, error: false },
    { command: "snapshot", flags: { route: bare }, error: true },
    { command: "skills list", flags: {}, error: true },
    { command: "host prepare", flags: { route: setup }, error: false },
    { command: "host prepare", flags: { route: setup, "dry-run": true }, error: false },
  ]);
});

test("run log: appends take the runs lock; a failed append warns and leaves the exit code unchanged", async () => {
  const ags = agsFixture();
  const release = await acquireLock(runsLockPath(ags), "test holder");
  try {
    const held = runAgs(ags, ["skills", "list"]);
    assert.equal(held.code, 0, held.stderr);
    assert.match(held.stderr, /run log was not written: Lock held by test holder/);
  } finally {
    release();
  }
  assert.deepEqual(runLines(ags), []);

  fs.mkdirSync(path.join(ags, "reports"), { recursive: true });
  fs.writeFileSync(path.join(ags, "reports", "runs"), "not a folder\n");
  const broken = runAgs(ags, ["skills", "list", "--bogus", "x"]);
  assert.equal(broken.code, 2, broken.stderr);
  assert.match(broken.stderr, /run log was not written/);
  assert.equal(fs.existsSync(runsLockPath(ags)), false);
});
