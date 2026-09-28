import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import * as util from "../scripts/lib/util.mjs";
import { assertSlug, contentHash, gitRoot, isBinary, normalizeIdentity, relativeInside, sameContent, samePath, sha256, shortHash } from "../scripts/lib/util.mjs";
import { REAL_ROOT, makeHostRepo, tempDir } from "./helpers/fixtures.mjs";

test("the AGS root is exported as AGS_ROOT", () => {
  assert.equal(normalizeIdentity(util.AGS_ROOT), normalizeIdentity(REAL_ROOT));
  assert.equal("CANONICAL_ROOT" in util, false);
});

test("text hashes normalize CRLF to LF; binaries compare byte for byte", () => {
  const lf = Buffer.from("one\ntwo\n");
  const crlf = Buffer.from("one\r\ntwo\r\n");
  assert.equal(contentHash(lf), contentHash(crlf));
  assert.equal(contentHash(lf), sha256("one\ntwo\n"));
  assert.ok(sameContent(lf, crlf));
  const binary = Buffer.from([0x61, 0x00, 0x0d, 0x0a]);
  const binaryLf = Buffer.from([0x61, 0x00, 0x0a]);
  assert.equal(isBinary(binary), true);
  assert.notEqual(contentHash(binary), contentHash(binaryLf));
  assert.equal(contentHash(binary), sha256(binary));
  const invalid = Buffer.from([0xff, 0xfe, 0x0d, 0x0a]);
  assert.equal(isBinary(invalid), true);
  assert.equal(isBinary(Buffer.from("café\r\n")), false);
  assert.equal(shortHash(contentHash(lf)).length, 12);
  assert.equal(contentHash(null), null);
  assert.equal(sameContent(null, null), true);
  assert.equal(sameContent(lf, null), false);
});


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
