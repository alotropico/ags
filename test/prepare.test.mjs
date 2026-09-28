import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { walkSetup } from "../scripts/lib/discovery.mjs";
import { AGENT_LINE } from "../scripts/lib/operation.mjs";
import { hostPrepare } from "../scripts/lib/prepare.mjs";
import { fakeTerminal, git, initRepo, makeAgsRepo, makeHostRepo, runAgs, sha256 } from "./helpers/fixtures.mjs";

function quietTerminal() {
  const lines = [];
  return {
    interactive: false,
    lines,
    async question() {
      throw new Error("no prompts without a terminal");
    },
    log(line = "") {
      lines.push(String(line));
    },
    warn(line = "") {
      lines.push(String(line));
    },
    text() {
      return lines.join("\n");
    },
  };
}

const SETUP = {
  "AGENTS.md": "# Old agents\n",
  "CLAUDE.md": "# Old claude\n",
  ".cursorrules": "old rules\n",
  ".agents/guidance/local.md": "local\n",
  ".agents/skills/x/SKILL.md": "---\nname: x\n---\n",
  ".cursor/rules/00-gen.mdc": "gen\n",
  ".cursor/plans/p.md": "plan\n",
  ".cursor/mcp.json": "{}\n",
  ".cursorignore": "# comment\n.tmp/\n",
  "documentation/AGENTS-notes.md": "docs\n",
  "packages/app/AGENTS.md": "nested\n",
  "packages/app/.claude/skills/y/SKILL.md": "nested skill\n",
  "src/index.js": "export {};\n",
};

function setupHost(files = SETUP, { gitignore } = {}) {
  return makeHostRepo({ files, gitignore });
}

function digestOf(text) {
  return text.match(/Digest: ([0-9a-f]{12})/)[1];
}

async function prepare(host, { agsRoot = null, includeNested = false, terminal = quietTerminal(), plan = null, dryRun = false, decide = new Map(), decideAll = null, env = {} } = {}) {
  const code = await hostPrepare({
    agsRoot,
    route: host,
    includeNested,
    rerunArgs: ["host", "prepare", "--route", host],
    terminal,
    options: { dryRun, plan, decide, decideAll, env: { AGS_TEST_FAULT: "", ...env } },
  });
  return { code, terminal };
}

async function confirmed(host, options = {}) {
  const first = await prepare(host, options);
  assert.equal(first.code, 3, first.terminal.text());
  return prepare(host, { ...options, terminal: quietTerminal(), plan: digestOf(first.terminal.text()) });
}

function backupFolders(host) {
  const parent = path.join(host, ".tmp", "ags", "backups");
  return fs.existsSync(parent) ? fs.readdirSync(parent).sort() : [];
}

function manifestOf(host, name) {
  return JSON.parse(fs.readFileSync(path.join(host, ".tmp", "ags", "backups", name, "manifest.json"), "utf8"));
}

test("prepare: nothing found and .tmp/ already ignored exits 0 and writes nothing", async () => {
  const host = makeHostRepo({ files: { "src/a.js": "a\n", ".cursor/plans/p.md": "p\n" }, gitignore: ".tmp/\n" });
  const { code, terminal } = await prepare(host);
  assert.equal(code, 0);
  assert.match(terminal.text(), /Nothing to do\./);
  assert.equal(fs.existsSync(path.join(host, ".tmp")), false);
  assert.equal(fs.existsSync(path.join(host, ".git", "info", "exclude")) && fs.readFileSync(path.join(host, ".git", "info", "exclude"), "utf8").includes("AGS:BEGIN"), false);
});

test("prepare: nothing to move but .tmp/ not ignored plans only the exclude block", async () => {
  const host = makeHostRepo({ files: { "src/a.js": "a\n" } });
  const first = await prepare(host);
  assert.equal(first.code, 3, first.terminal.text());
  assert.match(first.terminal.text(), /\.git\/info\/exclude\s+exclude block\s+add \/\.tmp\//);
  assert.doesNotMatch(first.terminal.text(), /manifest\.json/);
  const second = await prepare(host, { plan: digestOf(first.terminal.text()) });
  assert.equal(second.code, 0, second.terminal.text());
  assert.match(fs.readFileSync(path.join(host, ".git", "info", "exclude"), "utf8"), /# AGS:BEGIN\n\/\.tmp\/\n# AGS:END\n$/);
  assert.deepEqual(backupFolders(host), []);
  assert.doesNotMatch(second.terminal.text(), /AGS moved this repository/);
  assert.match((await prepare(host)).terminal.text(), /Nothing to do\./);
});

test("prepare: without a terminal exits 3 with the plan, digest, rerun command and agent line", async () => {
  const host = setupHost();
  const { code, terminal } = await prepare(host);
  const text = terminal.text();
  assert.equal(code, 3);
  assert.match(text, /Digest: [0-9a-f]{12}/);
  assert.match(text, /Rerun: ags host prepare --route .* --plan [0-9a-f]{12}/);
  assert.ok(text.includes(AGENT_LINE));
  assert.match(text, /AGENTS\.md\s+setup\s+move to AGENTS\.md\.bak/);
  assert.match(text, /\.agents\/skills\/x\/SKILL\.md\s+setup\s+move to _agents\/skills\/x\/SKILL\.md/);
  assert.match(text, /Nested setup, listed and not moved \(pass --include-nested to move it\): packages\/app\/\.claude\/skills\/ \(1 file\), packages\/app\/AGENTS\.md\./);
  assert.match(text, /Tool configuration, reported and never moved: \.cursor\/mcp\.json, \.cursorignore\./);
  assert.match(text, /Finding: \.cursorignore line 2 lists \.tmp\//);
  assert.match(text, /\.git\/info\/exclude\s+exclude block\s+add \/\.tmp\//);
  assert.ok(fs.existsSync(path.join(host, "AGENTS.md")));
  assert.equal(fs.existsSync(path.join(host, ".tmp")), false);
});

test("prepare: --dry-run shows the plan and writes nothing", async () => {
  const host = setupHost();
  const { code, terminal } = await prepare(host, { dryRun: true });
  assert.equal(code, 0);
  assert.match(terminal.text(), /Digest: /);
  assert.equal(fs.existsSync(path.join(host, ".tmp")), false);
});

test("prepare: root setup moved with renaming and manifest; nested, tool configuration and never-touched paths stay", async () => {
  const host = setupHost();
  const { code, terminal } = await confirmed(host);
  assert.equal(code, 0, terminal.text());
  const [folder] = backupFolders(host);
  assert.match(folder, /^\d{4}-\d{2}-\d{2}-\d{6}-prepare$/);
  const base = path.join(host, ".tmp", "ags", "backups", folder);
  for (const rel of ["AGENTS.md.bak", "CLAUDE.md.bak", "_cursorrules", "_agents/guidance/local.md", "_agents/skills/x/SKILL.md", "_cursor/rules/00-gen.mdc"]) {
    assert.ok(fs.existsSync(path.join(base, ...rel.split("/"))), rel);
  }
  for (const rel of ["AGENTS.md", "CLAUDE.md", ".cursorrules", ".agents", ".cursor/rules"]) assert.equal(fs.existsSync(path.join(host, rel)), false, rel);
  for (const rel of [".cursor/plans/p.md", ".cursor/mcp.json", ".cursorignore", "documentation/AGENTS-notes.md", "packages/app/AGENTS.md", "packages/app/.claude/skills/y/SKILL.md", "src/index.js"]) {
    assert.ok(fs.existsSync(path.join(host, ...rel.split("/"))), rel);
  }
  const manifest = manifestOf(host, folder);
  assert.equal(manifest.operation, "prepare");
  assert.equal(manifest.complete, true);
  assert.match(manifest.digest, /^[0-9a-f]{12}$/);
  const agents = manifest.files.find((entry) => entry.original === "AGENTS.md");
  assert.deepEqual(agents, { original: "AGENTS.md", backup: "AGENTS.md.bak", tracked: true, bytes: 13, sha256: sha256("# Old agents\n") });
  assert.equal(manifest.files.length, 6);
  const exclude = fs.readFileSync(path.join(host, ".git", "info", "exclude"), "utf8");
  assert.match(exclude, /# AGS:BEGIN\n\/\.tmp\/\n# AGS:END\n$/);
  assert.equal(git(host, ["status", "--porcelain", "--", ".tmp"]), "");
  assert.match(terminal.text(), /Moved 6 files to \.tmp\/ags\/backups\/.*-prepare\./);
  assert.ok(terminal.text().includes(`AGS moved this repository's previous agent setup to .tmp/ags/backups/${folder}. manifest.json there lists every file;`));
  assert.ok(terminal.text().includes("4. Do not touch documentation, source code, or project infrastructure."));
  const again = await prepare(host);
  assert.equal(again.code, 0);
  assert.match(again.terminal.text(), /Nothing to do\./);
});

test("prepare: --include-nested moves nested setup", async () => {
  const host = setupHost();
  const { code } = await confirmed(host, { includeNested: true });
  assert.equal(code, 0);
  const [folder] = backupFolders(host);
  const base = path.join(host, ".tmp", "ags", "backups", folder);
  assert.ok(fs.existsSync(path.join(base, "packages", "app", "AGENTS.md.bak")));
  assert.ok(fs.existsSync(path.join(base, "packages", "app", "_claude", "skills", "y", "SKILL.md")));
  assert.equal(fs.existsSync(path.join(host, "packages")), false);
});

test("prepare: a terminal answer moves nested setup", async () => {
  const host = setupHost();
  const terminal = fakeTerminal(["yes", "yes"]);
  const { code } = await prepare(host, { terminal });
  assert.equal(code, 0, terminal.lines.join("\n"));
  assert.equal(fs.existsSync(path.join(host, "packages", "app", "AGENTS.md")), false);
  assert.equal(terminal.remaining(), 0);
});

test("prepare: a terminal stop writes nothing", async () => {
  const host = setupHost();
  const terminal = fakeTerminal(["no", "stop"]);
  const { code } = await prepare(host, { terminal });
  assert.equal(code, 0);
  assert.ok(fs.existsSync(path.join(host, "AGENTS.md")));
  assert.equal(fs.existsSync(path.join(host, ".tmp")), false);
});

test("prepare: gitignored setup is found; .git, .tmp, node_modules and nested repositories are skipped", async () => {
  const host = setupHost(
    {
      ".cursor/rules/ignored.mdc": "ignored\n",
      ".tmp/old/AGENTS.md": "tmp\n",
      "node_modules/pkg/AGENTS.md": "dep\n",
      "vendor/lib/CLAUDE.md": "nested repo\n",
    },
    { gitignore: ".cursor/\n.tmp/\nnode_modules/\nvendor/\n" },
  );
  initRepo(path.join(host, "vendor", "lib"));
  const setup = walkSetup(host);
  assert.deepEqual(setup.root.map((entry) => entry.path), [".cursor/rules"]);
  assert.deepEqual(setup.nested, []);
  const { code } = await confirmed(host);
  assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(host, ".cursor", "rules")), false);
  assert.ok(fs.existsSync(path.join(host, ".tmp", "old", "AGENTS.md")));
  assert.ok(fs.existsSync(path.join(host, "vendor", "lib", "CLAUDE.md")));
  const manifest = manifestOf(host, backupFolders(host)[0]);
  assert.equal(manifest.files[0].tracked, false);
  assert.equal(fs.readFileSync(path.join(host, ".git", "info", "exclude"), "utf8").includes("AGS:BEGIN"), false);
});

test("prepare: the manifest is written before the first move, and an interrupted prepare continues in the same folder", async () => {
  const host = setupHost();
  const first = await prepare(host);
  const digest = digestOf(first.terminal.text());
  const early = await prepare(host, { plan: digest, env: { AGS_TEST_FAULT: "prepare:after-manifest-written" } });
  assert.equal(early.code, 1);
  assert.match(early.terminal.text(), /Not completed: .*AGENTS\.md/);
  const [folder] = backupFolders(host);
  assert.equal(manifestOf(host, folder).complete, false);
  assert.ok(fs.existsSync(path.join(host, "AGENTS.md")));

  const retry = await prepare(host);
  assert.equal(retry.code, 3);
  assert.match(retry.terminal.text(), new RegExp(`Continuing the incomplete prepare backup in \\.tmp/ags/backups/${folder}\\.`));
  const middle = await prepare(host, { plan: digestOf(retry.terminal.text()), env: { AGS_TEST_FAULT: "prepare:after-move-middle" } });
  assert.equal(middle.code, 1);
  assert.equal(fs.existsSync(path.join(host, ".cursor", "rules", "00-gen.mdc")), false);
  assert.ok(fs.existsSync(path.join(host, ".cursorrules")));

  const last = await confirmed(host, { env: { AGS_TEST_FAULT: "prepare:before-manifest-complete" } });
  assert.equal(last.code, 1);
  assert.equal(manifestOf(host, folder).complete, false);
  const finish = await prepare(host);
  assert.equal(finish.code, 3);
  assert.match(finish.terminal.text(), /manifest\.json\s+backup\s+mark complete/);
  const done = await prepare(host, { plan: digestOf(finish.terminal.text()) });
  assert.equal(done.code, 0);
  assert.deepEqual(backupFolders(host), [folder]);
  const manifest = manifestOf(host, folder);
  assert.equal(manifest.complete, true);
  assert.equal(manifest.files.length, 6);
  for (const entry of manifest.files) assert.ok(fs.existsSync(path.join(host, ".tmp", "ags", "backups", folder, ...entry.backup.split("/"))), entry.backup);
});

test("prepare: an entry at both paths, or at neither, stops the run", async () => {
  const host = setupHost();
  await prepare(host).then(({ terminal }) => prepare(host, { plan: digestOf(terminal.text()), env: { AGS_TEST_FAULT: "prepare:after-move-first" } }));
  const [folder] = backupFolders(host);
  const moved = manifestOf(host, folder).files.find((entry) => !fs.existsSync(path.join(host, ...entry.original.split("/"))));
  fs.mkdirSync(path.dirname(path.join(host, ...moved.original.split("/"))), { recursive: true });
  fs.writeFileSync(path.join(host, ...moved.original.split("/")), "again\n");
  await assert.rejects(prepare(host), new RegExp(`${moved.original.replaceAll(".", "\\.")} exists both at its original path`));
  fs.rmSync(path.join(host, ...moved.original.split("/")));
  fs.rmSync(path.join(host, ".tmp", "ags", "backups", folder, ...moved.backup.split("/")));
  await assert.rejects(prepare(host), /exists neither at its original path/);
});

test("prepare: refuses the AGS root, an installed host, an interrupted install and a linked worktree", async () => {
  const ags = makeAgsRepo();
  await assert.rejects(prepare(ags, { agsRoot: ags }), /is the AGS repository/);
  const installed = setupHost({ ...SETUP, ".agents/ags.yaml": "format: 2\nhost: h\nagsVersion: 2.0.0\n" });
  await assert.rejects(prepare(installed), /Use ags host update/);
  const interrupted = setupHost({ ...SETUP, ".agents/ags.yaml": "format: 2\nhost: h\n" });
  await assert.rejects(prepare(interrupted), /Run ags host install, which resumes it/);
  const v1 = setupHost({ ...SETUP, ".agents/ags.yaml": "format: 1\n" });
  assert.equal((await prepare(v1)).code, 3);
  const host = setupHost();
  const linked = path.join(path.dirname(host), "linked");
  git(host, ["worktree", "add", "-q", "-b", "side", linked]);
  await assert.rejects(prepare(linked), (error) => /main worktree/.test(error.message) && error.message.includes(path.basename(host)));
});

test("prepare: an ignore rule matching AGENTS.md or .agents/ is a finding", async () => {
  const host = setupHost({ "AGENTS.md": "x\n", ".agents/a.md": "a\n" }, { gitignore: ".agents/\n!keep\n" });
  const { terminal } = await prepare(host);
  assert.match(terminal.text(), /Finding: An ignore rule matches \.agents\/ \(\.gitignore:1:\.agents\/\)/);
  assert.doesNotMatch(terminal.text(), /matches AGENTS\.md/);
});

test("prepare: a setup entry that is a link is a finding and is not moved", async () => {
  const host = setupHost({ "AGENTS.md": "x\n" });
  const outside = fs.mkdtempSync(path.join(path.dirname(host), "ags-linked-rules-"));
  fs.writeFileSync(path.join(outside, "r.mdc"), "rule\n");
  fs.mkdirSync(path.join(host, ".cursor"), { recursive: true });
  try {
    fs.symlinkSync(outside, path.join(host, ".cursor", "rules"), "junction");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") return;
    throw error;
  }
  const first = await prepare(host);
  assert.match(first.terminal.text(), /Finding: \.cursor\/rules is a link or junction\. Prepare never follows or moves links/);
  assert.doesNotMatch(first.terminal.text(), /r\.mdc/);
  assert.equal((await prepare(host, { plan: digestOf(first.terminal.text()) })).code, 0);
  assert.equal(fs.readFileSync(path.join(outside, "r.mdc"), "utf8"), "rule\n");
});

test("prepare: an edited exclude region asks for restore, exit 3 without a terminal", async () => {
  const host = setupHost({ "AGENTS.md": "x\n" });
  fs.writeFileSync(path.join(host, ".git", "info", "exclude"), "*.log\n# AGS:BEGIN\n/.tmpx/\n# AGS:END\n");
  const first = await prepare(host);
  assert.equal(first.code, 3);
  const digest = digestOf(first.terminal.text());
  assert.match(first.terminal.text(), /Rerun: .*--decide "\.git\/info\/exclude=<restore>"/);
  const second = await prepare(host, { plan: digest, decide: new Map([[".git/info/exclude", "restore"]]) });
  assert.equal(second.code, 0, second.terminal.text());
  assert.equal(fs.readFileSync(path.join(host, ".git", "info", "exclude"), "utf8"), "*.log\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
  const excludeBackup = backupFolders(host).find((name) => name.endsWith("-prepare-exclude"));
  assert.ok(excludeBackup);
  assert.equal(fs.readFileSync(path.join(host, ".tmp", "ags", "backups", excludeBackup, "_git", "info", "exclude"), "utf8"), "*.log\n# AGS:BEGIN\n/.tmpx/\n# AGS:END\n");
});

test("prepare CLI: exit 3 without a terminal, --plan applies, --include-nested accepted", () => {
  const ags = makeAgsRepo({ cli: true });
  const host = setupHost();
  const first = runAgs(ags, ["host", "prepare", "--route", host, "--include-nested"]);
  assert.equal(first.code, 3, first.stderr);
  const digest = digestOf(first.stdout);
  assert.match(first.stdout, new RegExp(`--include-nested --plan ${digest}`));
  const second = runAgs(ags, ["host", "prepare", "--route", host, "--include-nested", "--plan", digest]);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(fs.existsSync(path.join(host, "packages", "app", "AGENTS.md")), false);
  const refused = runAgs(ags, ["host", "prepare", "--route", ags]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /AGS does not apply to itself/);
  assert.equal(runAgs(ags, ["host", "prepare", "--bogus"]).code, 2);
});
