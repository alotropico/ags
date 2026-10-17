import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { mock } from "node:test";
import { inspectTmp, cleanTmp } from "../scripts/lib/tmp.mjs";
import { hostBackupOnly } from "../scripts/lib/legacy-backup.mjs";
import { sha256 } from "../scripts/lib/util.mjs";
import { digestOf, makeHostRepo, nativeDirectoryLink, quietTerminal, tempDir, treeSnapshot, writeFiles } from "./helpers/fixtures.mjs";

const manifest = ".tmp/records/2026-10-01-sweep.json";
const entry = (name, disposition = "archive") => ({ path: `.tmp/plans/${name}.md`, hash: sha256(name), disposition });
function writeManifest(root, entries) { writeFiles(root, { [manifest]: JSON.stringify({ schemaVersion: 1, archiveMonth: "2026-10", entries }) }); }

test("tmp inspect protects operational areas and manifest cleanup recovers interrupted moves", async () => {
  const root = makeHostRepo();
  writeFiles(root, { ".tmp/plans/a.md": "a", ".tmp/plans/b.md": "b", ".tmp/plans/keep.md": "keep", ".tmp/plans/active.md": "active", ".tmp/scratch/unknown.txt": "unknown", ".tmp/ags/secret.txt": "secret", ".tmp/archive/old.txt": "old" });
  writeManifest(root, [entry("a"), entry("b", "completed"), entry("keep", "keep"), entry("active", "active")]);
  assert.ok(inspectTmp(root).every((item) => !item.path.includes("/ags/") && !item.path.includes("/archive/")));
  const terminal = quietTerminal();
  const args = { agsRoot: root, route: root, manifest, rerunArgs: ["tmp", "clean", "--manifest", manifest], terminal, options: {} };
  assert.equal(await cleanTmp(args), 3);
  assert.equal(await cleanTmp({ ...args, options: { plan: digestOf(terminal.text()), env: { AGS_TEST_FAULT: "tmp-clean:after-move-first" } } }), 1);
  const retry = quietTerminal();
  assert.equal(await cleanTmp({ ...args, terminal: retry }), 3);
  assert.equal(await cleanTmp({ ...args, options: { plan: digestOf(retry.text()) } }), 0);
  assert.equal(await cleanTmp(args), 0);
  for (const name of ["a", "b"]) assert.equal(fs.readFileSync(path.join(root, `.tmp/archive/2026-10/plans/${name}.md`), "utf8"), name);
  for (const rel of [".tmp/plans/keep.md", ".tmp/plans/active.md", ".tmp/scratch/unknown.txt", ".tmp/ags/secret.txt", manifest]) assert.ok(fs.existsSync(path.join(root, rel)));
});

test("tmp cleanup rejects stale hashes, traversal, protected paths, links and collisions before writes", async (t) => {
  const root = makeHostRepo();
  writeFiles(root, { ".tmp/plans/a.md": "a" });
  const args = { agsRoot: root, route: root, manifest, rerunArgs: [], terminal: quietTerminal(), options: { dryRun: true } };
  for (const bad of [{ ...entry("a"), hash: sha256("wrong") }, { ...entry("a"), path: ".tmp/plans/../../README.md" }, { ...entry("a"), path: ".tmp/ags/locks/a" }, { ...entry("a"), path: manifest }]) {
    writeManifest(root, [bad]);
    const before = treeSnapshot(root);
    await assert.rejects(cleanTmp(args));
    assert.deepEqual(treeSnapshot(root), before);
  }
  writeManifest(root, [entry("a")]);
  writeFiles(root, { ".tmp/archive/2026-10/plans/a.md": "a" });
  await assert.rejects(cleanTmp(args), /collision/);
  const outside = tempDir();
  if (!nativeDirectoryLink(t, outside, path.join(root, ".tmp/plans/link"))) return;
  writeManifest(root, [{ ...entry("a"), path: ".tmp/plans/link/a.md" }]);
  await assert.rejects(cleanTmp(args), /link/i);
});

test("copy-only backup preserves ignored/untracked files, retries and restores into a disposable location", async () => {
  const root = makeHostRepo({ files: { "AGENTS.md": "legacy", ".cursor/hooks.json": "hooks" }, gitignore: "ignored.txt\n.tmp/\n" });
  writeFiles(root, { "ignored.txt": "ignored", ".claude/settings.local.json": "local", "untracked.txt": "untracked" });
  const files = ["ignored.txt", "untracked.txt", ".cursor/hooks.json", ".claude/settings.local.json"];
  const terminal = quietTerminal();
  const args = { agsRoot: tempDir(), route: root, files, includeNested: true, rerunArgs: ["host", "prepare", "--backup-only"], terminal, options: {} };
  const before = treeSnapshot(root, { exclude: [".tmp"] });
  assert.equal(await hostBackupOnly(args), 3);
  assert.equal(await hostBackupOnly({ ...args, options: { plan: digestOf(terminal.text()), env: { AGS_TEST_FAULT: "backup-only:after-copy-first" } } }), 1);
  const retry = quietTerminal();
  assert.equal(await hostBackupOnly({ ...args, terminal: retry }), 3);
  assert.equal(await hostBackupOnly({ ...args, options: { plan: digestOf(retry.text()) } }), 0);
  assert.deepEqual(treeSnapshot(root, { exclude: [".tmp"] }), before);
  const backups = path.join(root, ".tmp/ags/backups");
  const folder = path.join(backups, fs.readdirSync(backups)[0]);
  const record = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
  assert.equal(record.operation, "backup-only");
  assert.equal(record.complete, true);
  const restoration = tempDir();
  for (const file of record.files) {
    const bytes = fs.readFileSync(path.join(folder, file.backup));
    assert.equal(sha256(bytes), file.sha256);
    writeFiles(restoration, { [file.original]: bytes });
    assert.equal(sha256(fs.readFileSync(path.join(restoration, file.original))), file.sha256);
  }
  assert.deepEqual(record.files.map((file) => file.original).sort(), ["AGENTS.md", ...files].sort());
});

test("copy-only verification failure retains originals and a retry verifies every file", async () => {
  const root = makeHostRepo({ files: { "AGENTS.md": "legacy" } });
  const terminal = quietTerminal();
  const args = { agsRoot: tempDir(), route: root, rerunArgs: [], terminal, options: {} };
  assert.equal(await hostBackupOnly(args), 3);
  const originalCopy = fs.copyFileSync;
  const mocked = mock.method(fs, "copyFileSync", (source, destination, ...rest) => {
    originalCopy.call(fs, source, destination, ...rest);
    if (String(destination).endsWith("AGENTS.md.bak")) fs.writeFileSync(destination, "corrupt");
  });
  try { assert.equal(await hostBackupOnly({ ...args, options: { plan: digestOf(terminal.text()) } }), 1); } finally { mocked.mock.restore(); }
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), "legacy");
  const retry = quietTerminal();
  assert.equal(await hostBackupOnly({ ...args, terminal: retry }), 3);
  assert.equal(await hostBackupOnly({ ...args, options: { plan: digestOf(retry.text()) } }), 0);
});

test("copy-only retry rejects changed source instead of silently mixing backup revisions", async () => {
  const root = makeHostRepo({ files: { "AGENTS.md": "legacy" } });
  const terminal = quietTerminal();
  const args = { agsRoot: tempDir(), route: root, rerunArgs: [], terminal, options: {} };
  assert.equal(await hostBackupOnly(args), 3);
  assert.equal(await hostBackupOnly({ ...args, options: { plan: digestOf(terminal.text()), env: { AGS_TEST_FAULT: "backup-only:after-copy-first" } } }), 1);
  writeFiles(root, { "AGENTS.md": "changed" });
  const before = treeSnapshot(root);
  await assert.rejects(hostBackupOnly(args), /sources changed/);
  assert.deepEqual(treeSnapshot(root), before);
});
