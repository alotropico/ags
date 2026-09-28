import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { stringify } from "yaml";
import { versionBump, versionNote, versionShow, withNote } from "../scripts/lib/version.mjs";
import { commitAll, digestOf, git, makeAgsRepo, quietTerminal, sampleCatalog, sampleMaterial, tag, writeFiles } from "./helpers/fixtures.mjs";

function agsFixture(extra = {}) {
  return makeAgsRepo({ catalog: sampleCatalog(), files: sampleMaterial(), ...extra });
}

async function bump(ags, level, { plan = null, allowEmpty = false, env = {} } = {}) {
  const terminal = quietTerminal();
  try {
    const code = await versionBump({
      agsRoot: ags,
      level,
      allowEmpty,
      rerunArgs: ["version", "bump", level],
      terminal,
      options: { dryRun: false, plan, decide: new Map(), decideAll: null, env: { AGS_TEST_FAULT: "", ...env } },
    });
    return { code, text: terminal.text() };
  } catch (error) {
    if (error.exitCode == null) throw error;
    return { code: error.exitCode, text: `${terminal.text()}\n${error.message}` };
  }
}

async function confirmedBump(ags, level, options = {}) {
  const first = await bump(ags, level, options);
  assert.equal(first.code, 3, first.text);
  const second = await bump(ags, level, { ...options, plan: digestOf(first.text) });
  return { first, second };
}

async function note(ags, text) {
  const terminal = quietTerminal();
  await versionNote({ agsRoot: ags, text, terminal });
  return terminal.text();
}

function read(ags, rel) {
  return fs.readFileSync(path.join(ags, rel), "utf8");
}

function show(ags) {
  const terminal = quietTerminal();
  versionShow({ agsRoot: ags, terminal });
  return terminal.text();
}

test("version: note, show, bump with confirmation, commit, annotated tag, and hosts printed without updating them", async () => {
  const ags = agsFixture();
  git(ags, ["tag", "-a", "v1-final", "-m", "final"]);
  assert.match(await note(ags, "First note."), /Added to ## Unreleased/);
  assert.match(await note(ags, "First note."), /Already under ## Unreleased/);
  commitAll(ags, "notes");
  const before = show(ags);
  assert.match(before, /Version: 1\.0\.0\nLatest release: none\nUnreleased notes:\n- First note\./);

  fs.writeFileSync(path.join(ags, "hosts.yaml"), stringify({ format: 2, hosts: [{ id: "h", name: "H", path: path.join(path.dirname(ags), "missing-host"), ignored: [], promoted: [] }] }));
  const { first, second } = await confirmedBump(ags, "major");
  assert.match(first.text, /ags version bump major: 1\.0\.0 → 2\.0\.0/);
  assert.match(first.text, /Notes for 2\.0\.0:\n- First note\./);
  assert.match(first.text, /Rerun: ags version bump major --plan [0-9a-f]{12}/);
  assert.match(first.text, /Never pass --plan for a plan the user has not seen/);
  assert.equal(second.code, 0, second.text);
  assert.match(second.text, /Registered hosts \(none updated\):\n- h at missing: ags host update --host h/);
  assert.equal(git(ags, ["log", "-1", "--format=%s"]), "Release: 2.0.0");
  assert.deepEqual(git(ags, ["show", "--name-only", "--format=", "HEAD"]).split("\n").sort(), ["CHANGELOG.md", "package.json"]);
  assert.equal(git(ags, ["cat-file", "-t", "v2.0.0"]), "tag");
  assert.match(git(ags, ["tag", "-l", "--format=%(contents)", "v2.0.0"]), /- First note\./);
  assert.equal(JSON.parse(read(ags, "package.json")).version, "2.0.0");
  assert.match(read(ags, "CHANGELOG.md"), /^## Unreleased\n\n## 2\.0\.0 - \d{4}-\d{2}-\d{2}\n- First note\.\n$/);
  assert.match(show(ags), /Version: 2\.0\.0\nLatest release: 2\.0\.0\nCommits since v2\.0\.0:\n {2}none\nUnreleased notes:\n {2}none/);

  await note(ags, "Second.");
  commitAll(ags, "second");
  const patch = await confirmedBump(ags, "patch");
  assert.equal(patch.second.code, 0, patch.second.text);
  assert.match(read(ags, "CHANGELOG.md"), /^## Unreleased\n\n## 2\.0\.1 - [\d-]+\n- Second\.\n\n## 2\.0\.0 - [\d-]+\n- First note\.\n$/);
});

test("version bump: refusals", async () => {
  const ags = agsFixture();
  await note(ags, "A note.");
  commitAll(ags, "notes");

  writeFiles(ags, { "other.txt": "x\n" });
  assert.match((await bump(ags, "major")).text, /uncommitted changes\. Commit or stash/);
  fs.rmSync(path.join(ags, "other.txt"));
  writeFiles(ags, { "CHANGELOG.md": `${read(ags, "CHANGELOG.md")}- extra\n` });
  const interrupted = await bump(ags, "major");
  assert.equal(interrupted.code, 1);
  assert.match(interrupted.text, /git restore -- CHANGELOG\.md package\.json, then run ags version bump major again/);
  git(ags, ["restore", "--", "CHANGELOG.md"]);

  fs.writeFileSync(path.join(ags, ".git", "MERGE_HEAD"), "0000000000000000000000000000000000000000\n");
  assert.match((await bump(ags, "major")).text, /MERGE_HEAD in progress/);
  fs.rmSync(path.join(ags, ".git", "MERGE_HEAD"));

  writeFiles(ags, { "notes.md": "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> other\n" });
  commitAll(ags, "conflict");
  assert.match((await bump(ags, "major")).text, /conflict markers in: notes\.md/);
  git(ags, ["rm", "-q", "notes.md"]);
  git(ags, ["commit", "-q", "-m", "clean"]);

  const pkg = JSON.parse(read(ags, "package.json"));
  writeFiles(ags, { "package.json": `${JSON.stringify({ ...pkg, scripts: { test: 'node -e "process.exit(1)"' } }, null, 2)}\n` });
  commitAll(ags, "failing tests");
  const { second: failing } = await confirmedBump(ags, "major");
  assert.equal(failing.code, 1);
  assert.match(failing.text, /The AGS tests failed; nothing was released/);
  assert.equal(git(ags, ["status", "--porcelain"]), "");
  assert.equal(git(ags, ["tag", "-l", "v2.0.0"]), "");
  writeFiles(ags, { "package.json": `${JSON.stringify(pkg, null, 2)}\n` });
  commitAll(ags, "passing tests");

  writeFiles(ags, { "CHANGELOG.md": "## Unreleased\n" });
  commitAll(ags, "empty notes");
  assert.match((await bump(ags, "major")).text, /## Unreleased has no notes/);
  assert.equal((await bump(ags, "major", { allowEmpty: true })).code, 3);
});

test("version bump: a latest release that is not an ancestor, and patch or minor dropping ids, keys or types, are refused", async () => {
  const ags = agsFixture({ version: "2.0.0" });
  git(ags, ["checkout", "-q", "-b", "side"]);
  writeFiles(ags, { "side.txt": "side\n" });
  commitAll(ags, "side");
  tag(ags, "2.0.0");
  git(ags, ["checkout", "-q", "-"]);
  await note(ags, "Note.");
  commitAll(ags, "note");
  assert.match((await bump(ags, "patch")).text, /v2\.0\.0 is not an ancestor of HEAD/);

  const ok = agsFixture({ version: "2.0.0", tags: ["2.0.0"] });
  const catalog = sampleCatalog();
  catalog.skills = catalog.skills.filter((entry) => entry.id !== "ship");
  catalog.settings = catalog.settings.filter((setting) => setting.key !== "git.ticketPrefix" && setting.key !== "git.mainBranch");
  catalog.settings.find((setting) => setting.key === "checks.lint").type = "boolean";
  catalog.settings.find((setting) => setting.key === "checks.lint").default = false;
  writeFiles(ok, { "catalog.yaml": stringify(catalog), "CHANGELOG.md": "## Unreleased\n- Drop.\n" });
  fs.rmSync(path.join(ok, "skills", "ship"), { recursive: true });
  commitAll(ok, "drop");
  for (const level of ["patch", "minor"]) {
    const refused = await bump(ok, level);
    assert.equal(refused.code, 1);
    assert.match(refused.text, /drops id ship/);
    assert.match(refused.text, /drops setting git\.mainBranch/);
    assert.match(refused.text, /changes the type of checks\.lint from string to boolean/);
  }
  assert.equal((await bump(ok, "major")).code, 3);
});

test("version bump: an interruption before the commit is refused with the restore command; after the commit, the next bump only adds the tag", async () => {
  const ags = agsFixture();
  await note(ags, "Note.");
  commitAll(ags, "note");
  const early = await confirmedBump(ags, "major", { env: { AGS_TEST_FAULT: "bump:after-changelog" } });
  assert.equal(early.second.code, 1);
  assert.match(early.second.text, /Recovery: git restore -- CHANGELOG\.md package\.json/);
  assert.match((await bump(ags, "major")).text, /git restore -- CHANGELOG\.md package\.json, then run ags version bump major again/);
  git(ags, ["restore", "--", "CHANGELOG.md", "package.json"]);

  const late = await confirmedBump(ags, "major", { env: { AGS_TEST_FAULT: "bump:after-commit" } });
  assert.equal(late.second.code, 1);
  assert.match(late.second.text, /Recovery: run ags version bump major again; it creates the missing tag/);
  assert.equal(git(ags, ["tag", "-l", "v2.0.0"]), "");
  const complete = await confirmedBump(ags, "major");
  assert.match(complete.first.text, /complete the untagged release 2\.0\.0/);
  assert.match(complete.first.text, /only creates that tag and does nothing else/);
  assert.equal(complete.second.code, 0, complete.second.text);
  assert.equal(git(ags, ["rev-parse", "v2.0.0^{commit}"]), git(ags, ["rev-parse", "HEAD"]));
  assert.match(git(ags, ["tag", "-l", "--format=%(contents)", "v2.0.0"]), /- Note\./);
});

test("version: notes are not duplicated, and a changelog without ## Unreleased is an error", () => {
  assert.equal(withNote("## Unreleased\n- a\n", "a"), null);
  assert.equal(withNote("## Unreleased\n- a\n\n## 1.0.0 - 2026-01-01\n- old\n", "b"), "## Unreleased\n- a\n- b\n\n## 1.0.0 - 2026-01-01\n- old\n");
  assert.throws(() => withNote("# Title\n", "a"), /no ## Unreleased/);
});
