import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { collectSourcePreset, writeSourceSnapshot, readStoredZip } from "../scripts/lib/snapshot.mjs";
import { markdownHrefs, hostLinkTargets, relativeLinkErrors } from "../scripts/lib/links.mjs";
import { makeAgsRepo, writeFiles } from "./helpers/fixtures.mjs";

// Independent contract fixture, copied from the reviewed specification.
const LITE = [
  "AGENTS.md", "README.md", "catalog.yaml", "hosts.yaml", "package.json", "scripts/ags.mjs",
  "scripts/lib/catalog.mjs", "scripts/lib/config.mjs", "scripts/lib/doctor.mjs", "scripts/lib/host.mjs",
  "scripts/lib/migrations.mjs", "scripts/lib/operation.mjs", "scripts/lib/registry.mjs", "scripts/lib/reports.mjs",
  "scripts/lib/skills.mjs", "scripts/lib/snapshot.mjs", "scripts/lib/tree-snapshot.mjs", "scripts/lib/util.mjs", "scripts/lib/version.mjs",
  "templates/ags.yaml", "test/install.test.mjs", "test/update.test.mjs", "test/doctor.test.mjs",
  "test/registry.test.mjs", "test/settings.test.mjs", "test/skills-list.test.mjs", "test/snapshot.test.mjs", "test/usage.test.mjs",
  "repository-tree.md", "snapshot-manifest.json",
].sort();

test("review presets have exact independent path sets, stable hashes, fresh trees and omissions", () => {
  const extra = ["CHANGELOG.md", ".gitignore", "scripts/install-global.mjs", "scripts/lib/extra.mjs", "templates/agents-block.md", "rules/core.md", "skills/first/SKILL.md", "test/extra.test.mjs"];
  const omitted = ["BACKLOG.md", "LEDGER.md", "docs/v4-spec.md", "docs/archive/old.md", "migrations/3-to-4.json", "reports/usage/data.jsonl", ".tmp/scratch/old.md", "node_modules/private.md", "pnpm-lock.yaml"];
  const ags = makeAgsRepo({ files: Object.fromEntries([...LITE.filter((rel) => !["repository-tree.md", "snapshot-manifest.json", "package.json"].includes(rel)), ...extra, ...omitted].map((rel) => [rel, `${rel}\n${"content ".repeat(extra.includes(rel) ? 100 : 1)}`])) });
  const lite = collectSourcePreset(ags, "review-lite");
  const full = collectSourcePreset(ags, "review");
  assert.deepEqual(lite.files.map((file) => file.name), LITE);
  assert.deepEqual(full.files.map((file) => file.name), [...new Set([...LITE, ...extra])].sort());
  assert.deepEqual(lite.manifest, collectSourcePreset(ags, "review-lite").manifest);
  assert.ok(lite.files.reduce((n, file) => n + file.data.length, 0) < full.files.reduce((n, file) => n + file.data.length, 0) * 0.8);
  writeFiles(ags, { "fresh-untracked.md": "fresh" });
  assert.match(collectSourcePreset(ags, "review-lite").files.find((file) => file.name === "repository-tree.md").data.toString(), /fresh-untracked.md/);
  fs.unlinkSync(path.join(ags, "hosts.yaml"));
  assert.ok(collectSourcePreset(ags, "review-lite").manifest.omissions.some((item) => item.path === "hosts.yaml"));
  assert.throws(() => writeSourceSnapshot(ags, { preset: "review", only: ["base"] }), /cannot combine/);
  assert.throws(() => writeSourceSnapshot(ags, { preset: "review-lite", except: ["test"] }), /cannot combine/);
  const result = writeSourceSnapshot(ags, { preset: "review-lite" });
  assert.deepEqual(readStoredZip(fs.readFileSync(result.path)).map((file) => file.name), LITE.filter((rel) => rel !== "hosts.yaml"));
});

test("shared Markdown extractor validates angle and reference links including current code-example rules", () => {
  const root = makeAgsRepo({ files: { "space name.md": "target", "target.md": "target" } });
  const text = '[a](<space name.md>)\n[b][ref]\n[c][]\n[ref]: target.md "title"\n[c]: <space name.md>\n`[example](missing.md)`\n';
  assert.deepEqual(markdownHrefs(text), ["space name.md", "missing.md", "target.md", "space name.md"]);
  assert.deepEqual(relativeLinkErrors(root, root, text), ["missing.md"]);
  assert.deepEqual(hostLinkTargets("AGENTS.md", text).map((item) => item.target), ["space name.md", "missing.md", "target.md", "space name.md"]);
});
