import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { LEDGER_HEADER } from "../scripts/lib/doctor.mjs";
import { commitAll, digestOf, git, makeAgsRepo, makeHostRepo, REAL_ROOT, runAgs, sampleCatalog, sampleMaterial } from "./helpers/fixtures.mjs";

const CONFIG_TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8").replaceAll("\r\n", "\n");
const LEDGER = `# Ledger\n\n## Run 1\n\n${LEDGER_HEADER}\n| --- | --- | --- | --- | --- | --- |\n| 1 | A concept | \`v1-final:x.md\` | AGS | \`y.md\` | |\n`;
const GUIDE = ".agents/skills/plan-work/references/guide.md";
const SKILL = ".agents/skills/plan-work/SKILL.md";
const RULE = ".agents/rules/tmp-conventions.md";
const SHIP = ".agents/skills/ship/";

function text(result) {
  return `${result.stdout}\n${result.stderr}`;
}

function decideFlags(output, decide) {
  const match = output.match(/^Decisions needed: (.+)$/m);
  if (!match) return [];
  return match[1].split(", ").flatMap((item) => {
    assert.ok(decide[item], `No decision given for ${item}:\n${output}`);
    return ["--decide", `${item}=${decide[item]}`];
  });
}

function confirmed(ags, args, decide = {}) {
  const shown = runAgs(ags, args);
  assert.equal(shown.code, 3, text(shown));
  const done = runAgs(ags, [...args, "--plan", digestOf(shown.stdout), ...decideFlags(shown.stdout, decide)]);
  assert.equal(done.code, 0, text(done));
  return { shown: text(shown), done: text(done) };
}

function row(output, rel) {
  return output.split("\n").find((line) => line.startsWith(`${rel} `)) ?? "";
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, ...rel.split("/")));
}

function write(root, rel, content) {
  fs.writeFileSync(path.join(root, ...rel.split("/")), content);
}

test("cycle: release, prepare, install, edit, update with every choice, promote, release and replace on a scratch host", () => {
  const ags = makeAgsRepo({
    catalog: sampleCatalog(),
    files: { ...sampleMaterial(), "templates/ags.yaml": CONFIG_TEMPLATE, "LEDGER.md": LEDGER },
    cli: true,
    changelog: "## Unreleased\n- First release.\n",
  });

  const first = confirmed(ags, ["version", "bump", "major"]);
  assert.match(first.shown, /ags version bump major: 1\.0\.0 → 2\.0\.0/);
  assert.match(first.done, /No registered hosts\./);
  assert.equal(git(ags, ["cat-file", "-t", "v2.0.0"]), "tag");
  assert.equal(git(ags, ["log", "-1", "--format=%s"]), "Release: 2.0.0");

  const host = makeHostRepo({
    files: {
      "AGENTS.md": "# Old agents\n",
      ".cursor/rules/x.mdc": "x\n",
      ".agents/skills/old/SKILL.md": "---\nname: old\n---\n",
    },
  });

  const prepared = confirmed(ags, ["host", "prepare", "--route", host]);
  assert.match(prepared.done, /\.tmp\/ags\/backups\//);
  for (const rel of ["AGENTS.md", ".cursor/rules/x.mdc", ".agents/skills/old/SKILL.md"]) assert.equal(exists(host, rel), false, rel);

  const installArgs = ["host", "install", "--route", host, "--enable", "ship", "--set", "git.mainBranch=main"];
  confirmed(ags, installArgs);
  const installedConfig = parse(read(host, ".agents/ags.yaml"));
  assert.equal(installedConfig.agsVersion, "2.0.0");
  assert.deepEqual(installedConfig.skills.enabled, ["ship"]);
  assert.equal(installedConfig.git.mainBranch, "main");
  assert.ok(exists(host, `${SHIP}SKILL.md`));
  assert.match(read(host, "AGENTS.md"), /<!-- AGS:BEGIN 2\.0\.0 [0-9a-f]{12} -->/);

  write(host, GUIDE, "# Guide\n\nA host improvement.\n");
  write(host, RULE, `${read(host, RULE)}\nA host edit to restore.\n`);
  write(host, SKILL, `${read(host, SKILL)}\nA host edit to keep.\n`);
  fs.rmSync(path.join(host, ...SHIP.split("/")), { recursive: true });

  const updateArgs = ["host", "update", "--route", host];
  const reviewed = confirmed(ags, updateArgs, { [GUIDE]: "promote", [RULE]: "restore", [SKILL]: "ignore", [SHIP]: "disable" });
  assert.match(row(reviewed.shown, GUIDE), /choose promote\/restore\/ignore/);
  assert.match(row(reviewed.shown, SHIP), /disable/);
  assert.equal(read(ags, "skills/plan-work/references/guide.md"), "# Guide\n\nA host improvement.\n");
  assert.match(read(ags, "CHANGELOG.md"), /## Unreleased\n- Promoted: `skills\/plan-work\/references\/guide\.md`\n/);
  assert.equal(read(host, RULE), read(ags, "rules/tmp-conventions.md"));
  assert.match(read(host, SKILL), /A host edit to keep\./);
  assert.equal(exists(host, SHIP), false);
  const reviewedConfig = parse(read(host, ".agents/ags.yaml"));
  assert.deepEqual(reviewedConfig.skills.enabled, []);
  assert.deepEqual(reviewedConfig.skills.disabled, ["ship"]);
  const afterReview = parse(read(ags, "hosts.yaml")).hosts[0];
  assert.deepEqual(afterReview.promoted.map((record) => record.path), [GUIDE]);
  assert.deepEqual(afterReview.ignored.map((record) => record.path), [SKILL]);

  commitAll(ags, "Feature: plan-work, promote the host guide");
  const patch = confirmed(ags, ["version", "bump", "patch"]);
  assert.match(patch.done, /- host at 2\.0\.0: ags host update --host host/);
  assert.equal(git(ags, ["log", "-1", "--format=%s"]), "Release: 2.0.1");

  const replaced = confirmed(ags, updateArgs);
  assert.doesNotMatch(replaced.shown, /Decisions needed: /);
  assert.equal(row(replaced.shown, GUIDE).includes("choose"), false, replaced.shown);
  assert.equal(row(replaced.shown, SKILL), "", replaced.shown);
  assert.equal(read(host, GUIDE).replaceAll("\r\n", "\n"), "# Guide\n\nA host improvement.\n");
  const final = parse(read(ags, "hosts.yaml")).hosts[0];
  assert.deepEqual(final.promoted, []);
  assert.deepEqual(final.ignored.map((record) => record.path), [SKILL]);
  assert.equal(parse(read(host, ".agents/ags.yaml")).agsVersion, "2.0.1");
  assert.match(read(host, SKILL), /A host edit to keep\./);

  const doctor = runAgs(ags, ["doctor", "--route", host]);
  assert.equal(doctor.code, 0, text(doctor));
  assert.match(doctor.stdout, /No findings\.\s*$/);
});
