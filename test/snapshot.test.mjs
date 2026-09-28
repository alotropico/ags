import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readStoredZip, writeSnapshot } from "../scripts/lib/snapshot.mjs";
import { makeHostRepo, runAgs, tempDir, withCli, writeFiles } from "./helpers/fixtures.mjs";

function v1Setup() {
  const root = tempDir("ags-snap-src-");
  writeFiles(root, { "AGENTS.md": "# AGS\n", "rules/core.md": "core\n", "skills/plan-work/SKILL.md": "---\nname: plan-work\ndescription: Plan.\n---\n" });
  const host = makeHostRepo({ name: "snap-host", files: { "AGENTS.md": "# Host\n", ".agents/ags.yaml": "host: snap-host\ngit:\n  mainBranch: trunk\n" } });
  const catalog = { format: 1, rules: [], skills: [] };
  const settings = { host: "snap-host", git: { mainBranch: "trunk" }, rules: { enabled: [] }, skills: { enabled: [] } };
  return { root, host, catalog, settings };
}

test("snapshots hold one manifest and refuse unsafe outputs", () => {
  const { root, host, catalog, settings } = v1Setup();
  const written = writeSnapshot(root, host, catalog, settings, path.join(host, ".tmp", "ui.zip"));
  const entries = readStoredZip(fs.readFileSync(written.path));
  assert.equal(entries.filter((entry) => entry.name === "manifest.json").length, 1);
  const settingsEntry = entries.find((entry) => entry.name === "host/.agents/ags.yaml");
  assert.match(settingsEntry.data.toString("utf8"), /trunk/);
  assert.throws(() => writeSnapshot(root, host, catalog, settings, path.join(host, ".tmp", "ui.txt")));
  const skillFile = path.join(root, "skills", "plan-work", "SKILL.md");
  const before = fs.readFileSync(skillFile, "utf8");
  assert.throws(() => writeSnapshot(root, host, catalog, settings, skillFile));
  assert.equal(fs.readFileSync(skillFile, "utf8"), before);
});

test("bare snapshot --out is a usage error", () => {
  const scratch = withCli(tempDir("ags-cli-"));
  const result = runAgs(scratch, ["snapshot", "--out"]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Missing value for --out/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /[/\\]true/);
});
