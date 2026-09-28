import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCatalog, tagSource, validateCatalog, workingTreeSource } from "../scripts/lib/catalog.mjs";
import { commitAll, makeAgsRepo, sampleCatalog, sampleMaterial, skillFile, tag, tempDir, writeFiles } from "./helpers/fixtures.mjs";

function scratch(mutate = () => {}, files = {}) {
  const root = tempDir("ags-cat-");
  const catalog = sampleCatalog();
  mutate(catalog);
  writeFiles(root, { ...sampleMaterial(), ...files });
  return { catalog, source: workingTreeSource(root), root };
}

function errorsFor(mutate, files) {
  const { catalog, source } = scratch(mutate, files);
  return validateCatalog(catalog, source);
}

function hasError(errors, pattern) {
  assert.ok(errors.some((line) => pattern.test(line)), `expected ${pattern} in:\n${errors.join("\n")}`);
}

test("a valid format 2 catalog loads with descriptions from the files", () => {
  const { catalog, source } = scratch();
  assert.deepEqual(validateCatalog(catalog, source), []);
  assert.equal(catalog.rules.find((entry) => entry.id === "tmp-conventions").description, "Creating, moving, or archiving files under .tmp/.");
  assert.equal(catalog.skills.find((entry) => entry.id === "plan-work").description, "Plan work.");
});

test("a catalog is read from a release tag, not from the working tree", () => {
  const root = makeAgsRepo({ catalog: sampleCatalog(), files: sampleMaterial(), tags: ["2.0.0"] });
  fs.writeFileSync(path.join(root, "skills", "plan-work", "SKILL.md"), skillFile("plan-work", "Changed."));
  fs.writeFileSync(path.join(root, "catalog.yaml"), "format: 1\n");
  assert.throws(() => loadCatalog(root), /format must be 2/);
  const tagged = loadCatalog(root, { version: "2.0.0" });
  assert.equal(tagged.skills.find((entry) => entry.id === "plan-work").description, "Plan work.");
  const source = tagSource(root, "2.0.0");
  assert.deepEqual(source.listFiles("skills/plan-work"), ["skills/plan-work/SKILL.md", "skills/plan-work/references/guide.md"]);
  assert.throws(() => tagSource(root, "9.9.9"), /Release tag not found/);
  commitAll(root, "later");
  tag(root, "2.0.1");
  assert.throws(() => loadCatalog(root, { version: "2.0.1" }), /format must be 2/);
});

test("format, ids and fields", () => {
  hasError(errorsFor((c) => { c.format = 1; }), /format must be 2/);
  hasError(errorsFor((c) => { c.skills[0].id = "Bad_Id"; }), /id must match/);
  hasError(errorsFor((c) => { c.skills[0].id = "a".repeat(65); }), /at most 64/);
  hasError(errorsFor((c) => { c.skills.push({ id: "core", install: "opt-in" }); }), /duplicate id: core/);
  hasError(errorsFor((c) => { c.skills[0].path = "skills/plan-work/SKILL.md"; }), /field not allowed: path/);
  hasError(errorsFor((c) => { c.rules[0].tier = "hard"; }), /tier must be strong or soft/);
});

test("install classes and when only with detected", () => {
  hasError(errorsFor((c) => { c.skills[0].install = "default"; }), /install must be always, detected or opt-in/);
  hasError(errorsFor((c) => { c.skills[0].when = { any: [{ package: "x" }] }; }), /when is allowed only with install: detected/);
  hasError(errorsFor((c) => { delete c.skills[1].when; }), /when is required with install: detected/);
  hasError(errorsFor((c) => { c.skills[1].when = { any: [{ lockFile: "bun.lock" }] }; }), /lockFile is not a supported/);
  hasError(errorsFor((c) => { c.skills[1].when = { any: [{ path: "x" }] }; }), /when clause must be/);
});

test("includes closure and cycles", () => {
  hasError(errorsFor((c) => { c.skills[0].includes = ["missing"]; }), /includes missing, which is not a skill/);
  hasError(errorsFor((c) => { c.skills[0].includes = ["core"]; }), /includes core, which is not a skill/);
  hasError(errorsFor((c) => { c.skills[0].includes = ["plan-work"]; }), /includes itself/);
  hasError(errorsFor((c) => { c.skills[3].includes = ["css-rules"]; }, { "skills/css-clean/SKILL.md": skillFile("css-clean", "Clean.") }), /include cycle/);
});

test("params must be declared, and settings are valid", () => {
  hasError(errorsFor((c) => { c.skills[0].params = ["checks.type"]; }), /param checks.type is not declared/);
  hasError(errorsFor((c) => { c.settings.push({ key: "Git.x", type: "string", default: "", description: "d" }); }), /key must be/);
  hasError(errorsFor((c) => { c.settings.push({ key: "git", type: "string", default: "", description: "d" }); }), /key must be/);
  hasError(errorsFor((c) => { c.settings.push({ key: "skills.extra", type: "string", default: "", description: "d" }); }), /reserved key/);
  hasError(errorsFor((c) => { c.settings.push({ ...c.settings[1] }); }), /duplicate setting key/);
  hasError(errorsFor((c) => { c.settings[0].default = "main"; }), /mutually exclusive/);
  hasError(errorsFor((c) => { c.settings[1].default = 3; }), /default must be a string/);
  hasError(errorsFor((c) => { c.settings.push({ key: "git.flag", type: "boolean", description: "d" }); }), /boolean setting must have a default/);
  hasError(errorsFor((c) => { c.settings.push({ key: "git.flag", type: "number", default: 1, description: "d" }); }), /type must be string or boolean/);
});

test("frontmatter of skills and soft rules, and strong-rule shape", () => {
  hasError(errorsFor(undefined, { "skills/ship/SKILL.md": skillFile("shipping", "Ship.") }), /name must equal the id/);
  hasError(errorsFor(undefined, { "skills/ship/SKILL.md": skillFile("ship", "x".repeat(1025)) }), /exceeds 1024/);
  hasError(errorsFor(undefined, { "skills/ship/SKILL.md": "# ship\n" }), /needs frontmatter/);
  hasError(errorsFor(undefined, { "rules/style.md": "---\ndescription: Styles.\nextra: 1\n---\n" }), /exactly one key/);
  hasError(errorsFor(undefined, { "rules/style.md": `---\ndescription: ${"x".repeat(161)}\n---\n` }), /exceeds 160/);
  hasError(errorsFor(undefined, { "rules/style.md": "---\ndescription: |\n  one\n  two\n---\n" }), /single line/);
  hasError(errorsFor(undefined, { "rules/style.md": "# no frontmatter\n" }), /needs frontmatter/);
  hasError(errorsFor(undefined, { "rules/core.md": "---\ndescription: x\n---\n- one\n" }), /strong rule has no frontmatter/);
  hasError(errorsFor(undefined, { "rules/core.md": "1\n2\n3\n4\n5\n6\n" }), /at most 5 non-empty lines/);
});

test("derived paths must exist", () => {
  const { catalog, source, root } = scratch();
  fs.rmSync(path.join(root, "skills", "css-clean"), { recursive: true });
  fs.rmSync(path.join(root, "rules", "style.md"));
  const errors = validateCatalog(catalog, source);
  hasError(errors, /missing skills\/css-clean\/SKILL.md/);
  hasError(errors, /missing rules\/style.md/);
});

test("links resolve in the host layout", () => {
  hasError(errorsFor(undefined, { "skills/plan-work/SKILL.md": skillFile("plan-work", "Plan.", "[x](references/missing.md)") }), /does not resolve/);
  hasError(errorsFor(undefined, { "skills/plan-work/SKILL.md": skillFile("plan-work", "Plan.", "[x](../ship/SKILL.md)") }), /not an includes companion/);
  hasError(errorsFor(undefined, { "skills/plan-work/SKILL.md": skillFile("plan-work", "Plan.", "[x](../../../README.md)") }), /leaves the host layout|does not resolve in the host layout/);
  hasError(errorsFor(undefined, { "skills/plan-work/SKILL.md": skillFile("plan-work", "Plan.", "[x](C:/Cosmos/projects/ags/rules/core.md)") }), /leaves the host layout/);
  hasError(errorsFor(undefined, { "rules/style.md": "---\ndescription: Styles.\n---\n[x](../skills/ship/SKILL.md)\n" }), /rules may link only to soft rules/);
  assert.deepEqual(errorsFor(undefined, { "skills/plan-work/SKILL.md": skillFile("plan-work", "Plan.", "[web](https://example.com) [anchor](#top)") }), []);
});

test("the block with every AGS rule selected stays within 40 lines", () => {
  const extra = {};
  const mutate = (c) => {
    for (let i = 0; i < 30; i += 1) {
      c.rules.push({ id: `soft-${i}`, tier: "soft", install: "opt-in" });
      extra[`rules/soft-${i}.md`] = `---\ndescription: Rule ${i}.\n---\n`;
    }
  };
  const catalog = sampleCatalog();
  mutate(catalog);
  const root = tempDir("ags-budget-");
  writeFiles(root, { ...sampleMaterial(), ...extra });
  hasError(validateCatalog(catalog, workingTreeSource(root)), /above the 40-line budget/);
  const missing = scratch();
  fs.rmSync(path.join(missing.root, "templates", "agents-block.md"));
  hasError(validateCatalog(missing.catalog, missing.source), /missing templates\/agents-block.md/);
});
