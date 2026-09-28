import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  analyzeBlock,
  analyzeExclude,
  blockHash,
  buildIndex,
  budgetWarning,
  excludeFile,
  inspectExclude,
  insertBlock,
  placeBlock,
  renderAgsBlock,
  renderExclude,
  tmpIgnored,
} from "../scripts/lib/render.mjs";
import { git, makeHostRepo, REAL_ROOT, sha256 } from "./helpers/fixtures.mjs";

const TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "agents-block.md"), "utf8").replaceAll("\r\n", "\n");
const CORE = ["- Host settings are in `.agents/ags.yaml`.", "- Host guidance wins on facts and formats."];

function sampleBlock(index = ["- `.agents/rules/tmp-conventions.md`: creating files under `.tmp/`."]) {
  return renderAgsBlock({ template: TEMPLATE, version: "2.0.0", strongRules: [CORE.join("\n")], index });
}

test("AGS block: template has the Appendix A layout with two placeholders", () => {
  assert.equal(TEMPLATE, "## AGS\n\n{{strongRules}}\n\nRead a rule before work that matches its condition:\n\n{{ruleIndex}}\n");
});

test("AGS block: renders the core then the index under a hashed begin marker", () => {
  const block = sampleBlock();
  const expectedBody = [
    "## AGS",
    "",
    ...CORE,
    "",
    "Read a rule before work that matches its condition:",
    "",
    "- `.agents/rules/tmp-conventions.md`: creating files under `.tmp/`.",
  ].join("\n");
  assert.equal(block.body, expectedBody);
  const hash = sha256(expectedBody).slice(0, 12);
  assert.equal(block.text, `<!-- AGS:BEGIN 2.0.0 ${hash} -->\n${expectedBody}\n<!-- AGS:END -->`);
  assert.equal(blockHash(expectedBody.replaceAll("\n", "\r\n")), hash);
  assert.equal(block.warning, null);
});

test("AGS block: without soft rules the index lead is left out", () => {
  const block = sampleBlock([]);
  assert.equal(block.body, `## AGS\n\n${CORE.join("\n")}`);
});

test("AGS block: index lists AGS rules in catalog order, then host rules by id; a host rule without a description is left out", () => {
  const { index, warnings } = buildIndex({
    agsRules: [
      { id: "tmp-conventions", description: "tmp." },
      { id: "style", description: "style." },
    ],
    hostRules: [
      { id: "server", description: "Server code." },
      { id: "code-idioms", description: "Idioms." },
      { id: "bare", description: null },
    ],
  });
  assert.deepEqual(index, [
    "- `.agents/rules/tmp-conventions.md`: tmp.",
    "- `.agents/rules/style.md`: style.",
    "- `.agents/rules/code-idioms.md`: Idioms.",
    "- `.agents/rules/server.md`: Server code.",
  ]);
  assert.deepEqual(warnings, ["Host rule .agents/rules/bare.md has no description; it is left out of the AGS block index."]);
});

test("AGS block: budget warning above 40 lines", () => {
  const many = Array.from({ length: 40 }, (_, i) => `- \`.agents/rules/r${i}.md\`: rule ${i}.`);
  assert.match(sampleBlock(many).warning, /The AGS block has \d+ lines, over the 40-line budget\./);
  assert.equal(budgetWarning("a\nb"), null);
});

test("AGS block: analysis as intact, edited, missing or malformed", () => {
  const block = sampleBlock();
  assert.equal(analyzeBlock(null).kind, "missing");
  assert.equal(analyzeBlock("# Host\n").kind, "missing");
  const file = insertBlock("# Host facts\n", block.text);
  assert.ok(file.startsWith(block.text));
  assert.ok(file.endsWith("\n\n# Host facts\n"));
  const intact = analyzeBlock(file);
  assert.equal(intact.kind, "intact");
  assert.equal(intact.version, "2.0.0");
  assert.equal(analyzeBlock(file.replaceAll("\n", "\r\n")).kind, "intact");
  assert.equal(analyzeBlock(file.replace("## AGS\n", "## AGS\nmine\n")).kind, "edited");
  assert.equal(analyzeBlock(`${file}\n${block.text}\n`).kind, "malformed");
  assert.equal(analyzeBlock(file.replace("<!-- AGS:END -->", "")).kind, "malformed");
  assert.equal(analyzeBlock("<!-- AGS:BEGIN -->\nold\n<!-- AGS:END -->\n").kind, "malformed");
});

test("AGS block: added lines moved outside the block leave it intact", () => {
  const block = sampleBlock();
  const file = insertBlock("# Host facts\n", block.text);
  const edited = file.replace("<!-- AGS:END -->", "- my extra line\n<!-- AGS:END -->");
  assert.equal(analyzeBlock(edited).kind, "edited");
  const moved = `${file}- my extra line\n`;
  assert.equal(analyzeBlock(moved).kind, "intact");
});

test("AGS block: insertion creates the file and regeneration keeps text outside the block", () => {
  const block = sampleBlock();
  assert.equal(placeBlock(null, block.text), `${block.text}\n`);
  const next = renderAgsBlock({ template: TEMPLATE, version: "2.1.0", strongRules: [CORE.join("\n")], index: [] });
  const prose = "\n\nPara one.\n\n\n\nPara two.\n";
  const regenerated = placeBlock(`${block.text}${prose}`, next.text);
  assert.equal(regenerated, `${next.text}${prose}`);
  const crlf = placeBlock("a\r\n", block.text);
  assert.ok(crlf.startsWith(block.text.replaceAll("\n", "\r\n")));
  assert.throws(() => placeBlock(`${block.text}\n${block.text}\n`, next.text), /unbalanced or repeated AGS markers/);
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
