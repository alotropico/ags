import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { settingsErrors } from "../scripts/lib/catalog.mjs";
import {
  configText,
  mergeConfig,
  missingRequired,
  newConfig,
  parseConfigText,
  parseSets,
  readConfig,
  setAgsVersion,
  settingValue,
  validateConfig,
} from "../scripts/lib/config.mjs";
import { REAL_ROOT, sampleCatalog, tempDir, writeFiles } from "./helpers/fixtures.mjs";

const TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8");

function config(extra = "") {
  return parseConfigText(`format: 2\nhost: demo\nreporting: true\nskills:\n  enabled: []\n  disabled: []\nrules:\n  enabled: []\n  disabled: []\n${extra}local: {}\n`);
}

test("the template is format 2 with empty selections and no agsVersion", () => {
  const { data } = parseConfigText(TEMPLATE);
  assert.equal(data.format, 2);
  assert.equal(data.reporting, true);
  assert.deepEqual(data.skills, { enabled: [], disabled: [] });
  assert.deepEqual(data.rules, { enabled: [], disabled: [] });
  assert.deepEqual(data.local, {});
  assert.equal("agsVersion" in data, false);
  assert.deepEqual(validateConfig(data, sampleCatalog()), []);
});

test("format 1 is rejected with a message", () => {
  assert.throws(() => parseConfigText("format: 1\nhost: old\n"), /format 1 is not supported/);
  const host = tempDir("ags-cfg-");
  assert.equal(readConfig(host), null);
});

test("setting key syntax, namespace collisions, required with default, typed defaults", () => {
  const check = (setting) => {
    const errors = [];
    settingsErrors([setting], errors);
    return errors.join("\n");
  };
  assert.match(check({ key: "git.Main", type: "string", default: "", description: "d" }), /key must be/);
  assert.match(check({ key: "local.x", type: "string", default: "", description: "d" }), /reserved key/);
  assert.match(check({ key: "git.x", type: "string", required: true, default: "a", description: "d" }), /mutually exclusive/);
  assert.match(check({ key: "git.x", type: "boolean", default: "yes", description: "d" }), /default must be a boolean/);
  assert.equal(check({ key: "git.x", type: "boolean", default: false, description: "d" }), "");
});

test("missing required values are reported for selected skills only", () => {
  const catalog = sampleCatalog();
  const { data } = config();
  assert.deepEqual(missingRequired(catalog, data, ["plan-work"]), []);
  assert.deepEqual(missingRequired(catalog, data, ["ship"]), ["git.mainBranch"]);
  const filled = config("git:\n  mainBranch: \"\"\n").data;
  assert.deepEqual(missingRequired(catalog, filled, ["ship"]), ["git.mainBranch"]);
  assert.deepEqual(missingRequired(catalog, config("git:\n  mainBranch: main\n").data, ["ship"]), []);
});

test("--set takes strings verbatim, empty strings and booleans, declared keys only", () => {
  const catalog = sampleCatalog();
  catalog.settings.push({ key: "git.signed", type: "boolean", default: false, description: "Sign commits." });
  const sets = parseSets(["git.mainBranch=release/next", "git.ticketPrefix=", "git.signed=true", "checks.lint=a=b"], catalog);
  assert.equal(sets.get("git.mainBranch"), "release/next");
  assert.equal(sets.get("git.ticketPrefix"), "");
  assert.equal(sets.get("git.signed"), true);
  assert.equal(sets.get("checks.lint"), "a=b");
  for (const bad of ["git.signed=yes", "novalue", "=x", "git.unknown=1", "reporting=false", "skills.enabled=x"]) {
    assert.throws(() => parseSets([bad], catalog), (error) => error.exitCode === 2, bad);
  }
});

test("checks.* must be package.json script names", () => {
  const catalog = sampleCatalog();
  const host = tempDir("ags-checks-");
  writeFiles(host, { "package.json": JSON.stringify({ scripts: { lint: "eslint ." } }) });
  assert.deepEqual(validateConfig(config("checks:\n  lint: lint\n").data, catalog, { hostRoot: host }), []);
  assert.match(validateConfig(config("checks:\n  lint: \"pnpm run lint\"\n").data, catalog, { hostRoot: host }).join("\n"), /script name, not a command line/);
  assert.match(validateConfig(config("checks:\n  lint: missing\n").data, catalog, { hostRoot: host }).join("\n"), /does not have: missing/);
  assert.deepEqual(validateConfig(config("checks:\n  lint: \"\"\n").data, catalog, { hostRoot: host }), []);
});

test("git.mainBranch keeps the branch-name validation, and types are checked", () => {
  const catalog = sampleCatalog();
  assert.match(validateConfig(config("git:\n  mainBranch: bad branch\n").data, catalog).join("\n"), /branch name/);
  assert.match(validateConfig(config("git:\n  mainBranch: 3\n").data, catalog).join("\n"), /must be a string/);
  assert.match(validateConfig({ ...config().data, reporting: "yes" }, catalog).join("\n"), /reporting must be true or false/);
});

test("local is free-form; undeclared keys and namespaces are rejected", () => {
  const catalog = sampleCatalog();
  const local = parseConfigText("format: 2\nhost: demo\nlocal:\n  anything:\n    - goes: [1, 2]\n").data;
  assert.deepEqual(validateConfig(local, catalog), []);
  assert.match(validateConfig(config("git:\n  mainBranch: main\n  extra: x\n").data, catalog).join("\n"), /git.extra is not declared/);
  assert.match(validateConfig(config("tools:\n  graphify: true\n").data, catalog).join("\n"), /tools is not a reserved key or a settings namespace/);
});

test("merge writes defaults with comments and preserves comments and order", () => {
  const catalog = sampleCatalog();
  const { doc } = parseConfigText("format: 2\n# who we are\nhost: demo\nreporting: true\nskills:\n  enabled: [ship]\n  disabled: []\ngit:\n  # keep me\n  mainBranch: trunk\nlocal: {}\n");
  mergeConfig(doc, catalog, { skillIds: ["ship", "css-clean"], sets: parseSets(["checks.lint=lint"], catalog) });
  setAgsVersion(doc, "2.0.0");
  const text = configText(doc);
  assert.match(text, /# who we are\nhost: demo\nagsVersion: 2\.0\.0\n/);
  assert.match(text, /  # keep me\n  mainBranch: trunk\n/);
  assert.match(text, /  # Prefix for ticket ids in branch names and commit subjects\. Empty means no ticket part\.\n  ticketPrefix: ""\n/);
  assert.match(text, /checks:\n  # package\.json script that runs the linter\. Empty means not configured\.\n  lint: lint\n/);
  assert.ok(text.indexOf("checks:") < text.indexOf("local:"));
  const again = parseConfigText(text).doc;
  mergeConfig(again, catalog, { skillIds: ["ship", "css-clean"] });
  assert.equal(configText(again), text);
});

test("a fixture skill reads git.ticketPrefix: CORE-", () => {
  const catalog = sampleCatalog();
  const doc = newConfig(TEMPLATE, { host: "demo" });
  mergeConfig(doc, catalog, { skillIds: ["ship"], sets: parseSets(["git.mainBranch=main", "git.ticketPrefix=CORE-"], catalog) });
  const { data } = parseConfigText(configText(doc));
  assert.deepEqual(validateConfig(data, catalog), []);
  assert.equal(settingValue(data, "git.ticketPrefix"), "CORE-");
  assert.equal(settingValue(data, "git.mainBranch"), "main");
});
