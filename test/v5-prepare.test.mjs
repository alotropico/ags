import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { hostPrepare } from "../scripts/lib/prepare.mjs";
import { hostBackupOnly } from "../scripts/lib/legacy-backup.mjs";
import { digestOf, makeHostRepo, nativeDirectoryLink, quietTerminal, sha256, tempDir, treeSnapshot, writeFiles } from "./helpers/fixtures.mjs";

function state(root) {
  return { files: treeSnapshot(root), exclude: fs.readFileSync(path.join(root, ".git", "info", "exclude")) };
}

async function prepare(root, options = {}) {
  const terminal = quietTerminal();
  const code = await hostPrepare({ route: root, rerunArgs: ["host", "prepare", "--route", root], terminal, options });
  return { code, terminal };
}

async function backupOnly(root, files = []) {
  const terminal = quietTerminal();
  return hostBackupOnly({ route: root, files, rerunArgs: ["host", "prepare", "--backup-only", "--route", root], terminal, options: {} });
}

for (const [label, files] of [
  ["renamed dot file", { ".agents/.same": "dot", ".agents/_same": "underscore" }],
  ["file and directory", { ".agents/.same": "file", ".agents/_same/child.md": "child" }],
]) {
  test(`prepare refuses ${label} backup destination collisions before any host write`, async () => {
    const root = makeHostRepo({ files });
    const before = state(root);
    await assert.rejects(prepare(root), /Prepare backup destination collision/);
    assert.deepEqual(state(root), before);
  });
  test(`copy-only backup refuses ${label} destination collisions before any host write`, async () => {
    const root = makeHostRepo({ files });
    const before = state(root);
    await assert.rejects(backupOnly(root), /Backup destination collision/);
    assert.deepEqual(state(root), before);
  });
}

test("prepare checks new destinations against every interrupted manifest entry before writing", async () => {
  const root = makeHostRepo({ files: { ".agents/.same": "already moved" } });
  const first = await prepare(root);
  assert.equal(first.code, 3);
  const stopped = await prepare(root, { plan: digestOf(first.terminal.text()), env: { AGS_TEST_FAULT: "prepare:after-move-first" } });
  assert.equal(stopped.code, 1, stopped.terminal.text());
  writeFiles(root, { ".agents/_same": "new source" });
  const before = state(root);
  await assert.rejects(prepare(root), /Prepare backup destination collision/);
  assert.deepEqual(state(root), before);
});

test("prepare refuses a linked incomplete backup folder before reading or mutating it", async (t) => {
  const root = makeHostRepo({ files: { ".agents/new.md": "new setup" } });
  const outside = tempDir("ags-outside-backup-");
  writeFiles(outside, {
    "AGENTS.md.bak": "outside original",
    "manifest.json": JSON.stringify({ operation: "prepare", complete: false, files: [{ original: "AGENTS.md", backup: "AGENTS.md.bak", sha256: sha256("outside original"), bytes: 16, tracked: false }] }),
  });
  const parent = path.join(root, ".tmp", "ags", "backups");
  fs.mkdirSync(parent, { recursive: true });
  const linked = path.join(parent, "foreign");
  if (!nativeDirectoryLink(t, outside, linked)) return;
  const before = state(root);
  const externalBefore = treeSnapshot(outside);
  await assert.rejects(prepare(root), /Prepare backup folder is a link/);
  assert.deepEqual(state(root), before);
  assert.deepEqual(treeSnapshot(outside), externalBefore);
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
});

for (const name of ["literal\\backslash.md", "line\nbreak.md"]) {
  test(`prepare refuses unrepresentable native setup name ${JSON.stringify(name)} before writing`, {
    skip: process.platform === "win32" && "POSIX filename fixture requires native macOS; Windows is no proof of this coverage",
  }, async () => {
    const root = makeHostRepo();
    fs.mkdirSync(path.join(root, ".agents"));
    fs.writeFileSync(path.join(root, ".agents", name), "source");
    const before = state(root);
    await assert.rejects(prepare(root), /cannot be represented/);
    assert.deepEqual(state(root), before);
  });
  test(`copy-only backup refuses unrepresentable native source name ${JSON.stringify(name)} before writing`, {
    skip: process.platform === "win32" && "POSIX filename fixture requires native macOS; Windows is no proof of this coverage",
  }, async () => {
    const root = makeHostRepo();
    const rel = `loose/${name}`;
    fs.mkdirSync(path.join(root, "loose"));
    fs.writeFileSync(path.join(root, "loose", name), "source");
    const before = state(root);
    await assert.rejects(backupOnly(root, [rel]), /cannot be represented/);
    assert.deepEqual(state(root), before);
  });
}
