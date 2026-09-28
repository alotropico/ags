import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzeExclude, blockIntact, excludeFile, inspectExclude, renderExclude, tmpIgnored, upsertAgentsBlock } from "../scripts/lib/render.mjs";
import { git, makeHostRepo } from "./helpers/fixtures.mjs";

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

test("exclude block: analysis of absent, intact and edited regions", () => {
  assert.equal(analyzeExclude(null).kind, "absent");
  assert.equal(analyzeExclude("# git ls-files --others\n*.log\n").kind, "absent");
  assert.equal(analyzeExclude("*.log\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n").kind, "intact");
  assert.equal(analyzeExclude("# AGS:BEGIN\r\n/.tmp/\r\n# AGS:END\r\n").kind, "intact");
  assert.equal(analyzeExclude("# AGS:BEGIN\n/.tmp/\nextra\n# AGS:END\n").kind, "edited");
  assert.equal(analyzeExclude("# AGS:BEGIN\n# AGS:END\n").kind, "edited");
  assert.equal(analyzeExclude("# AGS:BEGIN\n/.tmp/\n").kind, "edited");
});

test("exclude block: lines outside the markers are preserved", () => {
  assert.equal(renderExclude(null), "# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
  assert.equal(renderExclude("*.log"), "*.log\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
  assert.equal(renderExclude("a\n# AGS:BEGIN\nedited\n# AGS:END\nb\n"), "a\nb\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
  assert.equal(renderExclude("a\r\n# AGS:BEGIN\r\nb\r\n"), "a\r\nb\r\n# AGS:BEGIN\r\n/.tmp/\r\n# AGS:END\r\n");
  assert.equal(renderExclude("# AGS:END\nkeep\n"), "keep\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
});

test("exclude block: written only when .tmp/ is not ignored", () => {
  const plain = makeHostRepo();
  const first = inspectExclude(plain);
  assert.equal(first.ignored, false);
  assert.equal(first.need, "add");
  fs.mkdirSync(path.dirname(first.file), { recursive: true });
  fs.writeFileSync(first.file, first.next);
  assert.equal(tmpIgnored(plain), true);
  const again = inspectExclude(plain);
  assert.equal(again.state, "intact");
  assert.equal(again.need, null);

  const ignoredByGitignore = makeHostRepo({ gitignore: ".tmp/\n" });
  assert.equal(inspectExclude(ignoredByGitignore).need, null);
  assert.equal(inspectExclude(makeHostRepo({ gitignore: "/.tmp\n" })).need, null);
});

test("exclude block: an edited region that no longer ignores .tmp/ asks for restore", () => {
  const host = makeHostRepo();
  const file = excludeFile(host);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "*.log\n# AGS:BEGIN\n/.tmpx/\n# AGS:END\n");
  const state = inspectExclude(host);
  assert.equal(state.state, "edited");
  assert.equal(state.need, "restore");
  assert.equal(state.next, "*.log\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
  fs.writeFileSync(file, "# AGS:BEGIN\n/.tmp/\n# mine\n# AGS:END\n");
  assert.equal(inspectExclude(host).need, null);
});

test("exclude block: a linked worktree is refused", () => {
  const host = makeHostRepo();
  const linked = path.join(path.dirname(host), "linked");
  git(host, ["worktree", "add", "-q", "-b", "side", linked]);
  assert.throws(() => excludeFile(linked), /not \.git\/info\/exclude at the host root/);
});
