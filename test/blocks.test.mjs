import { test } from "node:test";
import assert from "node:assert/strict";
import { blockIntact, upsertAgentsBlock } from "../scripts/lib/render.mjs";

test("marker upsert keeps the surrounding text and line endings", () => {
  const block = "<!-- AGS:BEGIN -->\nRead the guidance before substantive work in this repository.\n<!-- AGS:END -->";
  const original = "before\r\n\r\nkeep\r\n";
  const next = upsertAgentsBlock(original, block);
  assert.ok(next.startsWith("before\r\n\r\nkeep\r\n"));
  assert.equal(blockIntact(next, block), true);
});

test("marker upsert leaves blank lines outside the block intact", () => {
  const old = "<!-- AGS:BEGIN -->\nold\n<!-- AGS:END -->";
  const block = "<!-- AGS:BEGIN -->\nnew\n<!-- AGS:END -->";
  const prose = "Para one.\n\n\n\nPara two.\n\n```\nexample\n\n\n\nstill fenced\n```\n\nTail.\n";
  const suffix = "After.\n\n\n\nStill after.\n";
  const after = upsertAgentsBlock(`${prose}${old}\n${suffix}`, block);
  assert.ok(after.startsWith(prose));
  assert.ok(after.endsWith(suffix));
  assert.equal(blockIntact(after, block), true);
});
