import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { doctorAgs, ledgerErrors, LEDGER_HEADER } from "../scripts/lib/doctor.mjs";
import { commitAll, git, makeAgsRepo, runAgs, sampleCatalog, sampleMaterial, tag, withCli, writeFiles } from "./helpers/fixtures.mjs";

const LEDGER = `# Ledger\n\n## Run 1\n\n${LEDGER_HEADER}\n| --- | --- | --- | --- | --- | --- |\n| 1 | A concept | \`v1-final:x.md\` | AGS | \`y.md\` | |\n| 2 | Gone | \`v1-final:x.md\`, "a \`|\` b" | Removed | | Superseded by section 5 |\n`;

function agsRoot(extra = {}, options = {}) {
  return makeAgsRepo({ catalog: sampleCatalog(), files: { ...sampleMaterial(), "LEDGER.md": LEDGER, ...extra }, ...options });
}

function findings(out) {
  return [...out.errors, ...out.warnings];
}

function deadPid() {
  return spawnSync(process.execPath, ["-e", ""]).pid;
}

test("doctor: a clean AGS root reports nothing and shows git state as information", () => {
  const ags = agsRoot({}, { tags: ["1.0.0"] });
  writeFiles(ags, { "notes.txt": "x\n" });
  const out = doctorAgs(ags);
  assert.deepEqual(findings(out), []);
  assert.ok(out.info.some((line) => line.startsWith("Node: ")));
  assert.ok(out.info.includes("Uncommitted changes: 1 path"));
  assert.ok(out.info.includes("Commits since v1.0.0: 0"));
  assert.ok(out.info.includes("Version: 1.0.0; latest release: 1.0.0"));
});

test("doctor: catalog errors, a wrong CHANGELOG.md start and a missing LEDGER.md are errors", () => {
  const catalog = sampleCatalog();
  catalog.skills.push({ id: "Bad_Id", install: "always" });
  const ags = agsRoot({}, { catalog, changelog: "# Changelog\n\n## Unreleased\n" });
  fs.rmSync(path.join(ags, "LEDGER.md"));
  const { errors } = doctorAgs(ags);
  assert.ok(errors.some((line) => line.startsWith("catalog.yaml: ") && line.includes("Bad_Id")), errors.join("\n"));
  assert.ok(errors.includes("CHANGELOG.md must start with ## Unreleased."));
  assert.ok(errors.includes("LEDGER.md is missing."));
});

test("doctor: ledger rows need one of the five dispositions and a rationale when Removed or Migrate later", () => {
  const rows = [
    "| 1 | a | s | AGS, Host | d | |",
    "| 2 | b | s | Removed | | |",
    "| 3 | c | s | Migrate later | d | |",
    "| 4 | d | s | Backlog | d |",
    "| 5 | e | s | Host | d | |",
  ];
  const errors = ledgerErrors(`# L\n\n${LEDGER_HEADER}\n| --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\nAfter.\n`);
  assert.equal(errors.length, 4, errors.join("\n"));
  assert.match(errors[0], /line 5: disposition must be one of/);
  assert.match(errors[1], /line 6: a Removed row needs a rationale/);
  assert.match(errors[2], /line 7: a Migrate later row needs a rationale/);
  assert.match(errors[3], /line 8: a row needs 6 cells/);
  assert.deepEqual(ledgerErrors(LEDGER), []);
  assert.deepEqual(ledgerErrors("# L\n"), ["LEDGER.md has no ledger table"]);
});

test("doctor: an untagged release commit is reported with its recovery, and a version off the latest release is an error", () => {
  const ags = agsRoot();
  const file = path.join(ags, "package.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(file, `${JSON.stringify({ ...json, version: "2.0.0" }, null, 2)}\n`);
  git(ags, ["commit", "-q", "-am", "Release: 2.0.0"]);
  const untagged = doctorAgs(ags).errors;
  assert.equal(untagged.length, 1, untagged.join("\n"));
  assert.match(untagged[0], /\(Release: 2\.0\.0\) has no tag v2\.0\.0\. Recover with ags version bump/);

  tag(ags, "2.0.0");
  assert.deepEqual(findings(doctorAgs(ags)), []);
  fs.writeFileSync(file, `${JSON.stringify({ ...json, version: "2.0.1" }, null, 2)}\n`);
  commitAll(ags, "drift");
  assert.deepEqual(doctorAgs(ags).errors, ["package.json version 2.0.1 does not match the latest release 2.0.0."]);
});

test("doctor: a host installation inside AGS, an invalid registry and a stale lock are reported", () => {
  const ags = agsRoot({ ".agents/ags.yaml": "format: 2\n", "hosts.yaml": "format: 1\nhosts: []\n" });
  writeFiles(ags, { "AGENTS.md": "<!-- AGS:BEGIN 2.0.0 abcdefabcdef -->\nx\n<!-- AGS:END -->\n" });
  const lock = path.join(ags, ".tmp", "ags", "locks", "ags");
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ command: "host update", pid: deadPid(), startedAt: new Date().toISOString() }));
  const out = doctorAgs(ags);
  assert.ok(out.errors.includes("AGS is not a host, but .agents/ exists at the AGS root."), out.errors.join("\n"));
  assert.ok(out.errors.includes("AGS is not a host, but AGENTS.md holds AGS block markers."));
  assert.ok(out.errors.some((line) => line.includes("hosts.yaml format 1 is not supported")));
  assert.ok(out.warnings.some((line) => line.startsWith("Stale lock ") && line.endsWith(".tmp/ags/locks/ags; the next command that needs it removes it.")));
});

test("doctor: the CLI exits 0 with no findings and 1 on an error", () => {
  const ags = withCli(agsRoot());
  commitAll(ags, "cli");
  const clean = runAgs(ags, ["doctor"]);
  assert.equal(clean.code, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /No findings\./);
  fs.writeFileSync(path.join(ags, "CHANGELOG.md"), "# Changelog\n");
  const broken = runAgs(ags, ["doctor"]);
  assert.equal(broken.code, 1);
  assert.match(broken.stdout, /Error: CHANGELOG\.md must start with ## Unreleased\./);
  assert.match(broken.stdout, /1 error, 0 warnings\./);
});
