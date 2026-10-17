import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { backupFile, createBackupFolder } from "../scripts/lib/backup.mjs";
import { tagSource, workingTreeSource } from "../scripts/lib/catalog.mjs";
import { findHost, validateRegistry } from "../scripts/lib/registry.mjs";
import { acquireLocks, hostLockPath } from "../scripts/lib/reports.mjs";
import { assertPortablePaths, assertRelativePath, insidePath, isReparsePoint, normalizeIdentity, pathExists, samePath } from "../scripts/lib/util.mjs";
import { git, initRepo, nativeDirectoryLink, REAL_ROOT, tag, tempDir, writeFiles } from "./helpers/fixtures.mjs";

test("physical aliases share registry identity, including missing child routes", (t) => {
  const root = tempDir("ags-physical-");
  const actual = path.join(root, "actual");
  fs.mkdirSync(actual);
  const alias = path.join(root, "alias");
  if (!nativeDirectoryLink(t, actual, alias)) return;
  assert.ok(samePath(actual, alias));
  assert.equal(normalizeIdentity(path.join(actual, "missing")), normalizeIdentity(path.join(alias, "missing")));
  const entry = { id: "one", name: "One", path: actual };
  const registry = { format: 2, hosts: [entry] };
  assert.equal(findHost(registry, { hostPath: alias }), entry);
  assert.match(validateRegistry({ ...registry, hosts: [entry, { id: "two", name: "Two", path: alias }] }).join("\n"), /duplicate host path/);
  assert.equal(insidePath(alias, "new/file.txt"), path.join(alias, "new", "file.txt"));
});

test("native case behavior distinguishes separate directories where supported", (t) => {
  const root = tempDir("ags-case-");
  const upper = path.join(root, "Case");
  const lower = path.join(root, "case");
  fs.mkdirSync(upper);
  if (fs.existsSync(lower)) {
    t.diagnostic("Native volume folds case; distinct-case volume evidence remains pending");
    assert.ok(samePath(upper, lower));
  } else {
    fs.mkdirSync(lower);
    assert.equal(samePath(upper, lower), false);
    assert.deepEqual(validateRegistry({ format: 2, hosts: [
      { id: "upper", name: "Upper", path: upper }, { id: "lower", name: "Lower", path: lower },
    ] }), []);
  }
});

test("dangling native links remain occupied and block managed writes", (t) => {
  const root = tempDir("ags-dangling-");
  const target = path.join(root, "target");
  const link = path.join(root, "linked");
  fs.mkdirSync(target);
  if (!nativeDirectoryLink(t, target, link)) return;
  fs.rmdirSync(target);
  assert.equal(pathExists(link), true);
  assert.equal(isReparsePoint(link), true);
  assert.throws(() => insidePath(root, "linked/new.md"), /Unresolvable link/);
  assert.doesNotThrow(() => normalizeIdentity(link));
});

test("portable material rejects ambiguity, unsafe names and directory case merges", () => {
  for (const value of ["a\\b.md", "new\nline.md", "tail .md ", " leading.md", "NUL.txt", "../escape", "a//b", "a:b"]) {
    assert.throws(() => assertPortablePaths([value]), /represented|portable/);
  }
  assert.throws(() => assertPortablePaths(["skills/a/Foo.md", "skills/a/foo.md"]), /case collision/);
  assert.throws(() => assertPortablePaths(["skills/a/Refs/a.md", "skills/a/refs/b.md"]), /case collision/);
  assert.deepEqual(assertPortablePaths(["skills/a/SKILL.md", "skills/a/references/é guide.md"]), ["skills/a/SKILL.md", "skills/a/references/é guide.md"]);
  assert.equal(assertRelativePath("notes/a b.md"), "notes/a b.md");
});

function rawGit(root, args, input) {
  const result = spawnSync("git", args, { cwd: root, input, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("tag enumeration uses exact NUL-delimited names and refuses unsafe material", () => {
  for (const name of ["new\nline.md", "literal\\slash.md", " trailing.md", "tail.md "]) {
    const root = initRepo(tempDir("ags-tag-path-"));
    const blob = rawGit(root, ["hash-object", "-w", "--stdin"], "bytes\n");
    const subtree = rawGit(root, ["mktree", "-z"], `100644 blob ${blob}\t${name}\0`);
    const tree = rawGit(root, ["mktree", "-z"], `040000 tree ${subtree}\tskills\0`);
    const commit = rawGit(root, ["commit-tree", tree, "-m", "raw filename fixture"]);
    git(root, ["update-ref", "HEAD", commit]);
    tag(root, "5.0.0");
    assert.throws(() => tagSource(root, "5.0.0").listFiles("skills"), /represented|portable/);
  }
});

test("native POSIX working-tree filenames are refused before being conflated", { skip: process.platform === "win32" ? "POSIX filename coverage requires native macOS" : false }, () => {
  const root = tempDir("ags-material-name-");
  writeFiles(root, { "skills/a/literal\\name.md": "x" });
  assert.throws(() => workingTreeSource(root).listFiles("skills/a"), /represented/);
});

test("backups retain binary bytes and originals", () => {
  const root = tempDir("ags-copy-bytes-");
  const bytes = Buffer.from([0, 255, 10, 13]);
  writeFiles(root, { "script.bin": bytes });
  const folder = createBackupFolder(root, "test");
  const record = backupFile(root, folder, "script.bin");
  assert.deepEqual(fs.readFileSync(path.join(folder.abs, record.backup)), bytes);
  assert.deepEqual(fs.readFileSync(path.join(root, "script.bin")), bytes);
  assert.equal("mode" in record, false);
});

test("native POSIX executable backup and disposable restoration preserve mode", { skip: process.platform === "win32" ? "Executable-mode recovery requires native macOS" : false }, () => {
  const root = tempDir("ags-copy-mode-");
  writeFiles(root, { "legacy.sh": "#!/bin/sh\nexit 0\n" });
  fs.chmodSync(path.join(root, "legacy.sh"), 0o751);
  const folder = createBackupFolder(root, "test");
  const record = backupFile(root, folder, "legacy.sh");
  const copy = path.join(folder.abs, record.backup);
  const restored = path.join(root, "restored.sh");
  fs.copyFileSync(copy, restored);
  assert.equal(fs.statSync(copy).mode & 0o777, 0o751);
  assert.equal(fs.statSync(restored).mode & 0o777, 0o751);
});

test("two processes contend on the existing lock through native root aliases", async (t) => {
  const root = tempDir("ags-lock-alias-");
  const actual = path.join(root, "actual");
  const alias = path.join(root, "alias");
  fs.mkdirSync(actual);
  if (!nativeDirectoryLink(t, actual, alias)) return;
  const held = await acquireLocks([hostLockPath(actual)], "alias-parent");
  try {
    const reportUrl = new URL("../scripts/lib/reports.mjs", import.meta.url).href;
    const code = `import {acquireLocks} from ${JSON.stringify(reportUrl)}; try { const release = await acquireLocks([${JSON.stringify(hostLockPath(alias))}], 'alias-child'); release(); process.exit(0); } catch (error) { process.stderr.write(error.message); process.exit(1); }`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: REAL_ROOT, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 1, child.stderr);
    assert.match(child.stderr, /lock|busy/i);
  } finally { held(); }
});
