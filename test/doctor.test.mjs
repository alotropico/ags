import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { doctorAgs, doctorHost, ledgerErrors, LEDGER_HEADER } from "../scripts/lib/doctor.mjs";
import { hostInstall } from "../scripts/lib/host.mjs";
import { commitAll, digestOf, git, makeAgsRepo, makeHostRepo, quietTerminal, REAL_ROOT, runAgs, sampleCatalog, sampleMaterial, skillFile, tag, tempDir, withCli, writeFiles } from "./helpers/fixtures.mjs";

const CONFIG_TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8").replaceAll("\r\n", "\n");

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
  assert.match(broken.stderr, /Error: CHANGELOG\.md must start with ## Unreleased\./);
  assert.doesNotMatch(broken.stdout, /Error: /);
  assert.match(broken.stdout, /1 error, 0 warnings\./);
});

function options() {
  return { dryRun: false, plan: null, decide: new Map(), decideAll: null, env: { AGS_TEST_FAULT: "" } };
}

async function installedHost({ cli = false } = {}) {
  const ags = agsRoot({ "templates/ags.yaml": CONFIG_TEMPLATE }, { tags: ["2.0.0"], version: "2.0.0", cli });
  const host = makeHostRepo();
  const args = ["host", "install", "--route", host];
  const first = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: first, options: options() }), 3, first.text());
  const second = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: second, options: { ...options(), plan: digestOf(first.text()) } }), 0, second.text());
  return { ags, host };
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
}

function editConfig(host, change) {
  const data = parse(read(host, ".agents/ags.yaml"));
  change(data);
  writeFiles(host, { ".agents/ags.yaml": stringify(data) });
}

function has(lines, pattern) {
  return lines.some((line) => (typeof pattern === "string" ? line === pattern : pattern.test(line)));
}

test("doctor: a freshly installed host reports nothing, through the library and the CLI, and host status shows doctor warnings", async () => {
  const { ags, host } = await installedHost({ cli: true });
  const out = doctorHost(ags, host);
  assert.deepEqual(findings(out), []);
  assert.ok(out.info.includes("Host: host at 2.0.0"));
  assert.ok(out.info.includes("Usage records: 0"));
  const clean = runAgs(ags, ["doctor", "--route", host]);
  assert.equal(clean.code, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /Host root: .*\nHost: host at 2\.0\.0/);
  assert.match(clean.stdout, /No findings\.\s*$/);

  writeFiles(host, { ".agents/local/stray.md": "# stray\n" });
  const status = runAgs(ags, ["host", "status", "--route", host]);
  assert.equal(status.code, 0, status.stdout + status.stderr);
  assert.match(status.stderr, /Warning: \.agents\/local\/stray\.md: no skill stray is installed/);
  assert.doesNotMatch(status.stdout, /Warning: /);
  const warned = runAgs(ags, ["doctor", "--route", host]);
  assert.equal(warned.code, 0);
  assert.match(warned.stderr, /Warning: \.agents\/local\/stray\.md/);
  assert.match(warned.stdout, /0 errors, 1 warning\./);
});

test("doctor: host notes link by name, other local files need a link, and a note for a skill that is not installed warns", async () => {
  const { ags, host } = await installedHost();
  const agents = read(host, "AGENTS.md");
  writeFiles(host, {
    "AGENTS.md": `${agents}\n## Facts\n\nDeploys: \`.agents/local/facts/linked.md\`. Runbooks: \`.agents/local/runbooks/\`.\n`,
    ".agents/local/plan-work.md": "# plan-work note\n\nSee [the table](x.txt).\n",
    ".agents/local/x.txt": "x\n",
    ".agents/local/ship.md": "# ship note\n",
    ".agents/local/facts/linked.md": "# linked\n",
    ".agents/local/facts/deploy.md": "# unlinked\n",
    ".agents/local/runbooks/a.md": "# a\n",
  });
  const out = doctorHost(ags, host);
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.warnings, [
    ".agents/local/facts/deploy.md: no host guidance links it (11.6).",
    ".agents/local/ship.md: no skill ship is installed, so the core line points nowhere, and no host guidance links it.",
  ]);
});

test("doctor: host rules without a description warn, and an index that no longer matches the host's rules warns", async () => {
  const { ags, host } = await installedHost();
  writeFiles(host, { ".agents/rules/team.md": "# team\n", ".agents/rules/deploy.md": "---\ndescription: Deploying.\n---\n\n# deploy\n" });
  const { errors, warnings } = doctorHost(ags, host);
  assert.deepEqual(errors, []);
  assert.ok(has(warnings, ".agents/rules/team.md has no description; the AGS block index leaves it out."), warnings.join("\n"));
  assert.ok(has(warnings, "The AGS block does not match the installed core and the host's rules; the next update regenerates it."));
});

test("doctor: host changes, deletions and an unselected AGS item are reported for the next update", async () => {
  const { ags, host } = await installedHost();
  writeFiles(host, {
    ".agents/skills/plan-work/SKILL.md": `${read(host, ".agents/skills/plan-work/SKILL.md")}\nHost edit.\n`,
    ".agents/rules/style.md": read(ags, "rules/style.md"),
  });
  fs.rmSync(path.join(host, ".agents", "skills", "plan-work", "references", "guide.md"));
  const { errors, warnings } = doctorHost(ags, host);
  assert.deepEqual(errors, []);
  assert.ok(has(warnings, ".agents/skills/plan-work/SKILL.md: changed in the host; the next update asks promote, restore, ignore."), warnings.join("\n"));
  assert.ok(has(warnings, ".agents/skills/plan-work/references/guide.md: deleted in the host; the next update asks restore, ignore."));
  assert.ok(has(warnings, "style is an AGS rule that is not selected; the next update removes it."));
});

test("doctor: an edited AGS block, an edited exclude block, harness ignore entries and trigger names under .tmp/ are errors", async () => {
  const { ags, host } = await installedHost();
  writeFiles(host, {
    "AGENTS.md": read(host, "AGENTS.md").replace("## AGS", "## AGS edited"),
    ".cursorignore": ".tmp/\n",
    ".tmp/scratch/.cursor/rules.mdc": "x\n",
    ".tmp/old/AGENTS.md": "x\n",
  });
  const exclude = path.join(host, ".git", "info", "exclude");
  fs.writeFileSync(exclude, fs.readFileSync(exclude, "utf8").replace("/.tmp/", "/.tmpx/"));
  const { errors } = doctorHost(ags, host);
  assert.ok(has(errors, "The AGS block in AGENTS.md was edited (its hash does not match); the next update asks to restore it."), errors.join("\n"));
  assert.ok(has(errors, "The AGS region of .git/info/exclude was edited; the next update asks to restore it."));
  assert.ok(has(errors, "Git does not ignore .tmp/; the next update adds /.tmp/ to the exclude block."));
  assert.ok(has(errors, /^\.cursorignore line 1 lists \.tmp\//));
  assert.ok(has(errors, /^\.tmp\/scratch\/\.cursor\/ is a dot-folder or an instruction entry file/));
  assert.ok(has(errors, /^\.tmp\/old\/AGENTS\.md is a dot-folder or an instruction entry file/));
});

test("doctor: a missing block, ignored guidance and backup folders without a complete manifest are reported", async () => {
  const { ags, host } = await installedHost();
  writeFiles(host, {
    "AGENTS.md": "# Host\n",
    ".gitignore": ".agents/\n",
    ".tmp/ags/backups/2026-01-01-000000-prepare/AGENTS.md.bak": "x\n",
    ".tmp/ags/backups/2026-01-02-000000-install/manifest.json": JSON.stringify({ operation: "install", complete: false, files: [] }),
    ".tmp/ags/backups/2026-01-03-000000-update/manifest.json": JSON.stringify({ operation: "update", files: [] }),
  });
  const { errors, warnings } = doctorHost(ags, host);
  assert.ok(has(errors, "AGENTS.md has no AGS block; the next update asks to restore it."), errors.join("\n"));
  assert.ok(has(errors, /^Git ignores \.agents\/ \(\.gitignore:1:\.agents\/\); the host is unsupported/));
  assert.ok(has(warnings, ".tmp/ags/backups/2026-01-01-000000-prepare has no manifest.json; check its files by hand."), warnings.join("\n"));
  assert.ok(has(warnings, ".tmp/ags/backups/2026-01-02-000000-install has an incomplete manifest; the next prepare or install continues it."));
  assert.ok(!has(warnings, /2026-01-03/));
});

test("doctor: settings, an interrupted install, a missing tag and an unregistered host are reported", async () => {
  const { ags, host } = await installedHost();
  editConfig(host, (data) => {
    data.skills.enabled = ["ship"];
  });
  assert.ok(has(doctorHost(ags, host).errors, "Required setting git.mainBranch has no value; set it with ags host update --set git.mainBranch=<value>."));

  editConfig(host, (data) => {
    data.skills.enabled = [];
    data.agsVersion = "2.9.0";
  });
  assert.ok(has(doctorHost(ags, host).errors, ".agents/ags.yaml names agsVersion 2.9.0, but AGS has no tag v2.9.0."));

  editConfig(host, (data) => {
    delete data.agsVersion;
  });
  assert.ok(has(doctorHost(ags, host).errors, ".agents/ags.yaml has no agsVersion: an interrupted install. Run ags host install, which resumes it."));

  editConfig(host, (data) => {
    data.agsVersion = "2.0.0";
  });
  writeFiles(ags, { "hosts.yaml": "format: 2\nhosts: []\n" });
  const { errors, warnings } = doctorHost(ags, host);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, ["Host host is not registered; the next update registers it."]);
});

test("doctor: a registry entry at another path or under another id, and a missing .tmp/, are reported", async () => {
  const { ags, host } = await installedHost();
  const moved = path.join(path.dirname(host), "old-place");
  writeFiles(ags, { "hosts.yaml": stringify({ format: 2, hosts: [{ id: "host", name: "host", path: moved, ignored: [], promoted: [] }] }) });
  assert.ok(has(doctorHost(ags, host).warnings, /^The registry records host host at .*old-place; the next update moves it to /));

  writeFiles(ags, { "hosts.yaml": stringify({ format: 2, hosts: [{ id: "other", name: "other", path: host, ignored: [], promoted: [] }] }) });
  assert.ok(has(doctorHost(ags, host).errors, /^Registry entry other holds .*, but \.agents\/ags\.yaml says host host\./));

  writeFiles(ags, { "hosts.yaml": stringify({ format: 2, hosts: [{ id: "host", name: "host", path: host, ignored: [], promoted: [] }] }) });
  fs.rmSync(path.join(host, ".tmp"), { recursive: true, force: true });
  const { errors, warnings } = doctorHost(ags, host);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, [".tmp/ does not exist."]);
});

test("doctor: a host item using an id new at the latest release is an error", async () => {
  const { ags, host } = await installedHost();
  const catalog = sampleCatalog();
  catalog.skills.push({ id: "deploy", install: "opt-in" });
  writeFiles(ags, { "catalog.yaml": stringify(catalog), "skills/deploy/SKILL.md": skillFile("deploy", "Deploy.") });
  commitAll(ags, "add deploy");
  tag(ags, "2.1.0");
  writeFiles(host, { ".agents/skills/deploy/SKILL.md": skillFile("deploy", "Host deploy.") });
  const { errors } = doctorHost(ags, host);
  assert.ok(has(errors, ".agents/skills/deploy/ uses the id deploy, which AGS 2.1.0 adds; the next update stops. Rename it to .agents/skills/host-deploy/."), errors.join("\n"));
});

test("doctor: a linked worktree is named and skips the registry checks; usage records and a stale host lock are reported", async () => {
  const { ags, host } = await installedHost();
  commitAll(host, "install ags");
  const worktree = path.join(tempDir("ags-wt-"), "wt");
  git(host, ["worktree", "add", "-q", "-b", "wt", worktree]);
  writeFiles(ags, { "hosts.yaml": "format: 2\nhosts: []\n" });
  const linked = doctorHost(ags, worktree);
  assert.ok(has(linked.info, /^Linked worktree of .*: registry checks skipped\.$/), linked.info.join("\n"));
  assert.ok(!has(linked.warnings, /registered/), linked.warnings.join("\n"));
  assert.deepEqual(linked.errors, []);

  writeFiles(host, { ".tmp/ags/reports/usage.jsonl": "{}\n{}\n" });
  const lock = path.join(host, ".tmp", "ags", "locks", "host");
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ command: "host update", pid: deadPid(), startedAt: new Date().toISOString() }));
  const out = doctorHost(ags, host);
  assert.ok(out.info.includes("Usage records: 2"));
  assert.ok(has(out.warnings, /^Stale lock .*\.tmp\/ags\/locks\/host; the next command that needs it removes it\.$/), out.warnings.join("\n"));
});
