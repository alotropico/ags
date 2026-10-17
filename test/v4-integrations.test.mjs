import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { detectCapabilities, findExecutable } from "../scripts/lib/capabilities.mjs";
import { officialOffers, setup, nativeIntentState, nativeIntentItems, applyNativeIntent } from "../scripts/lib/setup.mjs";
import { skillAdd, discoverSkillNames } from "../scripts/lib/skills.mjs";
import { resolveSelection } from "../scripts/lib/catalog.mjs";
import { digestOf, makeAgsRepo, makeHostRepo, quietTerminal, tempDir, writeExecutable, writeFiles } from "./helpers/fixtures.mjs";

test("capabilities prefer repository binaries, refresh removed tools and condition Intent on package-native material", () => {
  const root = tempDir();
  const machine = tempDir();
  const localSkills = writeExecutable(path.join(root, "node_modules", ".bin"), "skills", { stdout: "local\n" });
  const machineSkills = writeExecutable(machine, "skills", { stdout: "machine\n" });
  const machineIntent = writeExecutable(machine, "intent", { stdout: "intent\n" });
  const env = { PATH: machine };
  assert.equal(findExecutable(root, ["skills"], env), localSkills);
  fs.unlinkSync(localSkills);
  assert.equal(detectCapabilities(root, env).skills, machineSkills);
  assert.equal(detectCapabilities(root, env).intent, null);
  writeFiles(root, { "package.json": JSON.stringify({ dependencies: { "@tanstack/react-query": "5.0.0" } }), "node_modules/@tanstack/react-query/package.json": JSON.stringify({ version: "5.0.0", intent: { skills: ["skills/query"] } }) });
  assert.equal(detectCapabilities(root, env).intent, machineIntent);
  fs.unlinkSync(machineSkills);
  assert.equal(detectCapabilities(root, env).skills, null);
});

test("official offers check installed Mantine compatibility, opt-outs, third-party coexistence and tool availability", () => {
  const root = tempDir();
  const caps = { skills: "skills", fallow: "fallow", "ast-grep": "sg" };
  writeFiles(root, { "node_modules/@mantine/form/package.json": JSON.stringify({ version: "8.2.0" }) });
  assert.ok(!officialOffers(root, {}, caps).some((offer) => offer.skill.startsWith("mantine")));
  writeFiles(root, { "node_modules/@mantine/form/package.json": JSON.stringify({ version: "9.0.0" }) });
  assert.ok(officialOffers(root, {}, caps).some((offer) => offer.skill === "mantine-form"));
  assert.deepEqual(officialOffers(root, { integrations: { officialSkills: false } }, caps), []);
  assert.ok(!officialOffers(root, { integrations: { fallow: false } }, caps).some((offer) => offer.skill === "fallow"));
  writeFiles(root, { ".agents/skills/mantine-form/SKILL.md": "host-owned", ".agents/skills/broken/readme.md": "not a skill" });
  assert.deepEqual(discoverSkillNames(root), ["mantine-form"]);
  assert.ok(!officialOffers(root, {}, caps).some((offer) => offer.skill === "mantine-form"));
  assert.deepEqual(officialOffers(root, {}, {}), []);
  const catalog = { rules: [], skills: [{ id: "ags-graphify", install: "always" }] };
  assert.deepEqual(resolveSelection(catalog, {}, { capabilities: {} }).skills, []);
  assert.deepEqual(resolveSelection(catalog, {}, { capabilities: { graphify: "graphify" } }).skills, ["ags-graphify"]);
});

test("skill proxy refuses incomplete non-TTY requests and collisions, preserving backend output and status", async () => {
  const root = makeHostRepo();
  const terminal = quietTerminal();
  writeExecutable(path.join(root, "node_modules", ".bin"), "skills", { stdout: "backend-output\n", stderr: "backend-error\n", code: 7 });
  await assert.rejects(skillAdd({ route: root, source: "owner/repo", terminal }), /requires --skill/);
  writeFiles(root, { ".agents/skills/existing/SKILL.md": "owned" });
  await assert.rejects(skillAdd({ route: root, source: "owner/repo", skill: "existing", terminal }), /already exists/);
  assert.equal(await skillAdd({ route: root, source: "owner/repo", skill: "fresh", terminal }), 7);
  assert.match(terminal.text(), /backend-output/);
  assert.match(terminal.text(), /backend-error/);
});

test("AGS setup records only machine capabilities and never creates host discovery paths", async () => {
  const root = makeAgsRepo();
  const first = quietTerminal();
  const args = { agsRoot: root, route: root, rerunArgs: ["setup"], terminal: first, options: {} };
  assert.equal(await setup(args), 3);
  assert.equal(await setup({ ...args, options: { plan: digestOf(first.text()) } }), 0);
  assert.equal(await setup(args), 0);
  assert.ok(fs.existsSync(path.join(root, ".tmp/ags/capabilities.json")));
  assert.ok(!fs.existsSync(path.join(root, ".agents")));
});

test("TanStack native mechanism reviews concrete permissions and preserves saved exclusions", () => {
  const root = makeHostRepo();
  writeFiles(root, {
    "package.json": JSON.stringify({ dependencies: { "@tanstack/react-query": "5.0.0" }, intent: { exclude: ["@tanstack/react-query#experimental"] } }),
    "node_modules/@tanstack/react-query/package.json": JSON.stringify({ version: "5.0.0", intent: { skills: ["skills/query"] } }),
    "AGENTS.md": "host-owned facts\n",
  });
  writeExecutable(path.join(root, "node_modules", ".bin"), "intent", { nodeBody: 'import fs from "node:fs";\nfs.appendFileSync("AGENTS.md", "native-intent\\n");\n' });
  const state = nativeIntentState(root);
  assert.deepEqual(JSON.parse(state.packageNext).intent, { exclude: ["@tanstack/react-query#experimental"], skills: ["@tanstack/react-query"] });
  assert.deepEqual(nativeIntentItems(state).map((item) => item.path), ["package.json", "AGENTS.md (Intent)"]);
  const terminal = quietTerminal();
  applyNativeIntent(root, state, { terminal, done: () => {} });
  assert.match(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), /host-owned facts[\s\S]*native-intent/);
  const saved = nativeIntentState(root);
  assert.equal(saved.packageNext, saved.packageCurrent);
  assert.equal(nativeIntentState(root, { integrations: { officialSkills: false } }).intent, false);
});
