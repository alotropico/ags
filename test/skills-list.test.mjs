import { test } from "node:test";
import assert from "node:assert/strict";
import { main } from "../scripts/ags.mjs";
import * as skills from "../scripts/lib/skills.mjs";
import { makeAgsRepo, quietTerminal, REAL_ROOT, sampleCatalog, sampleMaterial } from "./helpers/fixtures.mjs";

test("skills list: prints id, kind, install class, description and keywords from the working-tree catalog", async () => {
  const ags = makeAgsRepo({ catalog: sampleCatalog(), files: sampleMaterial() });
  const terminal = quietTerminal();
  assert.equal(await main(["skills", "list"], { terminal, agsRoot: ags }), 0);
  const lines = terminal.text().trim().split("\n");
  assert.equal(lines.length, 8);
  assert.match(lines[0], /^core\s+strong rule\s+always\s+\(always in the AGS block\)$/);
  assert.match(lines[1], /^tmp-conventions\s+soft rule\s+always\s+Creating, moving, or archiving files under \.tmp\/\.$/);
  assert.match(lines[2], /^style\s+soft rule\s+opt-in\s+Editing style files\.$/);
  assert.match(lines[3], /^plan-work\s+skill\s+always\s+Plan work\. \[plan\]$/);
  assert.match(lines[4], /^ui-kit\s+skill\s+detected\s+UI kit styling\.$/);
});

test("skills list: the real catalog lists every entry, and the only generic installer is the skills proxy", async () => {
  const terminal = quietTerminal();
  assert.equal(await main(["skills", "list"], { terminal, agsRoot: REAL_ROOT }), 0);
  assert.equal(terminal.text().trim().split("\n").length, 31);
  assert.deepEqual(Object.keys(skills).sort(), ["catalogRows", "discoverSkillNames", "skillAdd", "skillsList"]);
});
