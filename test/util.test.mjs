import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSlug, gitRoot, normalizeIdentity, relativeInside, samePath } from "../scripts/lib/util.mjs";
import { REAL_ROOT, makeHostRepo, tempDir } from "./helpers/fixtures.mjs";

test("path identity, containment, and route resolution", () => {
  assert.equal(samePath("C:/Cosmos/projects/ags", "c:/cosmos/projects/ags"), process.platform === "win32");
  assert.equal(normalizeIdentity(REAL_ROOT), normalizeIdentity(REAL_ROOT.toUpperCase()));
  assert.equal(relativeInside(REAL_ROOT, path.join(REAL_ROOT, "rules", "core.md")), "rules/core.md");
  assert.throws(() => relativeInside(REAL_ROOT, path.resolve(REAL_ROOT, "..", "outside.txt")));
  const repo = makeHostRepo({ name: "nested-host" });
  const child = path.join(repo, "src", "app");
  fs.mkdirSync(child, { recursive: true });
  assert.equal(normalizeIdentity(gitRoot(child)), normalizeIdentity(repo));
});

test("slugs reject traversal", () => {
  for (const value of ["../x", "..\\x", "a/b", "a\\b", "C:\\skills", "\\\\server\\share", "", ".."]) {
    assert.throws(() => assertSlug(value, "skill id"));
  }
});

test("junction escape is rejected when the account allows it", () => {
  const root = tempDir("ags-root-");
  fs.mkdirSync(path.join(root, "skills"));
  const outside = tempDir("ags-out-");
  fs.writeFileSync(path.join(outside, "SKILL.md"), "---\nname: linked\ndescription: Linked.\n---\n");
  const link = path.join(root, "skills", "linked");
  try {
    fs.symlinkSync(outside, link, "junction");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") return;
    throw error;
  }
  assert.throws(() => relativeInside(root, path.join(link, "SKILL.md")));
});
