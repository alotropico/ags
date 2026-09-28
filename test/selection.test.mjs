import { test } from "node:test";
import assert from "node:assert/strict";
import { applySelectionFlags, optInItems, resolveSelection } from "../scripts/lib/catalog.mjs";
import { selectionErrors } from "../scripts/lib/config.mjs";
import { sampleCatalog } from "./helpers/fixtures.mjs";

const plain = { packages: new Set(), locks: new Set(), repoName: "plain", packageJson: false };
const ui = { packages: new Set(["@platform/ui-library"]), locks: new Set(), repoName: "ui", packageJson: true };

function select(overrides = {}, evidence = plain) {
  const config = {
    skills: { enabled: [], disabled: [], ...(overrides.skills || {}) },
    rules: { enabled: [], disabled: [], ...(overrides.rules || {}) },
  };
  return resolveSelection(sampleCatalog(), config, evidence);
}

test("always, detected and opt-in", () => {
  const base = select();
  assert.deepEqual(base.rules, ["core", "tmp-conventions"]);
  assert.deepEqual(base.skills, ["plan-work"]);
  const detected = select({}, ui);
  assert.deepEqual(detected.skills, ["plan-work", "ui-kit", "css-rules", "css-clean"]);
  assert.deepEqual(detected.direct, ["plan-work", "ui-kit"]);
  assert.deepEqual(detected.companions, ["css-rules", "css-clean"]);
  assert.deepEqual(optInItems(sampleCatalog()), ["style", "css-rules", "css-clean", "ship"]);
});

test("enabled and disabled from ags.yaml", () => {
  const chosen = select({ skills: { enabled: ["ship", "ui-kit"], disabled: ["plan-work"] }, rules: { enabled: ["style"], disabled: ["tmp-conventions"] } });
  assert.deepEqual(chosen.rules, ["core", "style"]);
  assert.deepEqual(chosen.skills, ["ui-kit", "css-rules", "css-clean", "ship"]);
  assert.deepEqual(chosen.errors, []);
});

test("enabled and disabled from flags are routed by the catalog", () => {
  const catalog = sampleCatalog();
  const config = { skills: { enabled: ["ship"], disabled: [] }, rules: { enabled: [], disabled: ["tmp-conventions"] } };
  const { selection, changed } = applySelectionFlags(catalog, config, { enable: ["tmp-conventions", "css-clean"], disable: ["ship", "plan-work"] });
  assert.deepEqual(selection.rules, { enabled: ["tmp-conventions"], disabled: [] });
  assert.deepEqual(selection.skills, { enabled: ["css-clean"], disabled: ["ship", "plan-work"] });
  assert.deepEqual(changed, ["rules", "skills"]);
  assert.throws(() => applySelectionFlags(catalog, config, { enable: ["nope"] }), (error) => error.exitCode === 2 && /unknown id nope/.test(error.message));
  assert.deepEqual(applySelectionFlags(catalog, config, {}).changed, []);
});

test("a companion of a selected parent cannot be opted out", () => {
  const blocked = select({ skills: { enabled: [], disabled: ["css-clean"] } }, ui);
  assert.ok(blocked.errors.some((line) => /css-clean is a companion of css-rules/.test(line)));
  const dropped = select({ skills: { disabled: ["ui-kit"] } }, ui);
  assert.deepEqual(dropped.skills, ["plan-work"]);
  assert.deepEqual(dropped.errors, []);
});

test("unknown ids, ids in both lists, and core cannot be disabled", () => {
  const catalog = sampleCatalog();
  const errors = selectionErrors(catalog, {
    skills: { enabled: ["ship", "ghost"], disabled: ["ship"] },
    rules: { enabled: [], disabled: ["core", "plan-work"] },
  });
  assert.ok(errors.some((line) => /unknown skill id: ghost/.test(line)));
  assert.ok(errors.some((line) => /unknown rule id: plan-work/.test(line)));
  assert.ok(errors.some((line) => /ship is listed in both/.test(line)));
  assert.ok(errors.some((line) => /core cannot be disabled/.test(line)));
  assert.deepEqual(select({ rules: { disabled: ["core"] } }).rules, ["core", "tmp-conventions"]);
});

test("detected items are added and removed when detection changes", () => {
  assert.ok(select({}, ui).skills.includes("ui-kit"));
  assert.equal(select({}, plain).skills.includes("ui-kit"), false);
  assert.ok(select({ skills: { enabled: ["ui-kit"] } }, plain).skills.includes("ui-kit"));
});
