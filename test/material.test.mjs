import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { indexLine, renderBlockBody, blockLineCount, BLOCK_BUDGET } from "../scripts/lib/render.mjs";
import { parseFrontmatter, readCatalog, rulePath, skillDir, validateCatalog } from "../scripts/lib/catalog.mjs";
import { REAL_ROOT } from "./helpers/fixtures.mjs";

function readReal(rel) {
  return fs.readFileSync(path.join(REAL_ROOT, ...rel.split("/")), "utf8").replaceAll("\r\n", "\n");
}

test("material: the working-tree catalog is format 2 and all material passes validation", () => {
  const { catalog, source } = readCatalog(REAL_ROOT);
  assert.equal(catalog.format, 2);
  assert.deepEqual(validateCatalog(catalog, source), []);
  assert.deepEqual(catalog.rules.map((entry) => [entry.id, entry.tier, entry.install]), [
    ["core", "strong", "always"],
    ["tmp-conventions", "soft", "always"],
  ]);
  assert.deepEqual(catalog.skills.map((entry) => entry.id), [
    "plan-work",
    "write-commit-diff",
    "report-usage",
    "ui-library-css",
    "css-authoring-conventions",
    "css-cleanup",
    "css-theme-tokens",
    "git-cleanup",
    "ship",
    "check",
    "commit-granular",
    "start-branch",
  ]);
  assert.deepEqual(catalog.settings.map((setting) => setting.key), ["git.mainBranch", "git.ticketPrefix", "checks.type", "checks.lint", "checks.prettier"]);
});

test("material: skills with params carry Host settings and no material uses template syntax", () => {
  const { catalog } = readCatalog(REAL_ROOT);
  for (const entry of catalog.skills) {
    const text = readReal(`${skillDir(entry.id)}/SKILL.md`);
    if (entry.params?.length) assert.match(text, /^## Host settings$/m, `${entry.id} needs a Host settings section`);
    assert.doesNotMatch(text, /\{\{/, `${entry.id} uses template syntax`);
  }
  for (const entry of catalog.rules) assert.doesNotMatch(readReal(rulePath(entry.id)), /\{\{/);
});

test("material: the block with every AGS rule selected stays within the line budget", () => {
  const { catalog } = readCatalog(REAL_ROOT);
  const strongRules = [];
  const index = [];
  for (const entry of catalog.rules) {
    const text = readReal(rulePath(entry.id));
    if (entry.tier === "strong") strongRules.push(text.trim());
    else index.push(indexLine(entry.id, parseFrontmatter(text).data.description));
  }
  const body = renderBlockBody(readReal("templates/agents-block.md"), { strongRules, index });
  assert.ok(blockLineCount(body) <= BLOCK_BUDGET, `block has ${blockLineCount(body)} lines`);
  assert.match(body, /tmp-conventions/);
});
