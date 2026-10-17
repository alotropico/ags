import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { hostInstall } from "../scripts/lib/host.mjs";
import { samePath } from "../scripts/lib/util.mjs";
import { digestOf, fakeTerminal, git, makeAgsRepo, makeHostRepo, nativeDirectoryLink, quietTerminal, REAL_ROOT, runAgs, sampleCatalog, sampleMaterial, treeSnapshot } from "./helpers/fixtures.mjs";

const CONFIG_TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8").replaceAll("\r\n", "\n");

function agsFixture({ tags = ["2.0.0"], cli = false } = {}) {
  return makeAgsRepo({ catalog: sampleCatalog(), files: { ...sampleMaterial(), "templates/ags.yaml": CONFIG_TEMPLATE }, tags, cli });
}

async function install(ags, host, { terminal = quietTerminal(), plan = null, decide = new Map(), env = {}, ...rest } = {}) {
  const code = await hostInstall({
    agsRoot: ags,
    route: host,
    rerunArgs: ["host", "install", "--route", host],
    terminal,
    options: { dryRun: false, plan, decide, decideAll: null, env: { AGS_TEST_FAULT: "", ...env } },
    ...rest,
  });
  return { code, terminal };
}

async function confirmed(ags, host, options = {}) {
  const first = await install(ags, host, options);
  assert.equal(first.code, 3, first.terminal.text());
  return install(ags, host, { ...options, terminal: quietTerminal(), plan: digestOf(first.terminal.text()) });
}

function read(host, rel) {
  return fs.readFileSync(path.join(host, ...rel.split("/")), "utf8");
}

function exists(host, rel) {
  return fs.existsSync(path.join(host, ...rel.split("/")));
}

function registry(ags) {
  const file = path.join(ags, "hosts.yaml");
  return fs.existsSync(file) ? parse(fs.readFileSync(file, "utf8")) : null;
}

test("install: fresh host gets ags.yaml, managed files, AGENTS.md with the block, the exclude block and a registry entry; no commit", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ name: "My Host" });
  const head = git(host, ["rev-parse", "HEAD"]);
  const first = await install(ags, host);
  assert.equal(first.code, 3);
  const text = first.terminal.text();
  assert.match(text, /\.agents\/ags\.yaml\s+settings\s+create/);
  assert.match(text, /\.agents\/skills\/plan-work\/SKILL\.md\s+managed\s+add/);
  assert.match(text, /AGENTS\.md\s+block\s+create/);
  assert.match(text, /hosts\.yaml\s+registry\s+add my-host \(My Host\)/);
  assert.match(text, /Selection: rules core, tmp-conventions; skills plan-work\./);
  assert.equal(exists(host, ".agents"), false);

  const second = await install(ags, host, { plan: digestOf(text) });
  assert.equal(second.code, 0, second.terminal.text());
  const config = parse(read(host, ".agents/ags.yaml"));
  assert.equal(config.format, 2);
  assert.equal(config.host, "my-host");
  assert.equal(config.agsVersion, "2.0.0");
  assert.match(read(host, ".agents/ags.yaml"), /^format: 2\nhost: my-host\nagsVersion: 2\.0\.0\n/);
  assert.equal(read(host, ".agents/rules/tmp-conventions.md"), sampleMaterial()["rules/tmp-conventions.md"]);
  assert.equal(read(host, ".agents/skills/plan-work/references/guide.md"), "# Guide\n");
  assert.equal(exists(host, ".agents/rules/core.md"), false);
  assert.equal(exists(host, ".agents/skills/ship"), false);
  const agents = read(host, "AGENTS.md");
  assert.match(agents, /^<!-- AGS:BEGIN 2\.0\.0 [0-9a-f]{12} -->\n## AGS\n\n- Host settings are in `\.agents\/ags\.yaml`\.\n/);
  assert.match(agents, /- `\.agents\/rules\/tmp-conventions\.md`: Creating, moving, or archiving files under \.tmp\/\.\n<!-- AGS:END -->\n$/);
  assert.match(read(host, ".git/info/exclude"), /# AGS:BEGIN\n\/\.tmp\/\n# AGS:END\n$/);
  const entry = registry(ags).hosts[0];
  assert.equal(entry.id, "my-host");
  assert.equal(entry.name, "My Host");
  assert.ok(samePath(entry.path, host));
  assert.deepEqual([entry.ignored, entry.promoted], [[], []]);
  assert.equal(git(host, ["rev-parse", "HEAD"]), head);
  assert.match(second.terminal.text(), /AGS never commits/);
  await assert.rejects(install(ags, host), /Use ags host update/);
});

test("install: a host with setup has it moved, AGENTS.md recreated with the block, and the cleanup prompt printed", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ files: { "AGENTS.md": "# Old facts\n", ".agents/guidance/a.md": "a\n", ".agents/ags.yaml": "format: 1\n" } });
  const { code, terminal } = await confirmed(ags, host);
  assert.equal(code, 0, terminal.text());
  const agents = read(host, "AGENTS.md");
  assert.ok(agents.startsWith("<!-- AGS:BEGIN 2.0.0 "));
  assert.doesNotMatch(agents, /Old facts/);
  assert.equal(exists(host, ".agents/guidance"), false);
  const folder = fs.readdirSync(path.join(host, ".tmp", "ags", "backups")).find((name) => name.endsWith("-install"));
  assert.ok(folder);
  const manifest = JSON.parse(read(host, `.tmp/ags/backups/${folder}/manifest.json`));
  assert.equal(manifest.operation, "install");
  assert.equal(manifest.to, "2.0.0");
  assert.equal(manifest.complete, true);
  assert.equal(read(host, `.tmp/ags/backups/${folder}/AGENTS.md.bak`), "# Old facts\n");
  assert.ok(terminal.text().includes(`AGS moved this repository's previous agent setup to .tmp/ags/backups/${folder}.`));
});

test("install: a host item using an AGS id, selected or not, is refused before any write with the exact rename", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({
    files: {
      ".agents/ags.yaml": "format: 2\nhost: h\n",
      ".agents/rules/style.md": "---\ndescription: mine\n---\n",
      ".agents/skills/plan-work/extra.md": "extra\n",
    },
  });
  const before = treeSnapshot(host);
  await assert.rejects(install(ags, host), (error) => {
    assert.match(error.message, /Nothing was written/);
    assert.ok(error.message.includes("- rename .agents/rules/style.md to .agents/rules/h-style.md"));
    assert.ok(error.message.includes("- rename .agents/skills/plan-work/ to .agents/skills/h-plan-work/ and change name in its SKILL.md to h-plan-work"));
    return true;
  });
  assert.deepEqual(treeSnapshot(host), before);
  assert.equal(registry(ags), null);
});

test("install: refused while git ignores AGENTS.md, .agents/ or a file under it", async () => {
  const ags = agsFixture();
  for (const rule of ["AGENTS.md\n", ".agents/\n", ".agents/skills/plan-work/references/\n"]) {
    const host = makeHostRepo({ gitignore: rule });
    await assert.rejects(install(ags, host), /Git ignores host guidance paths/, rule);
    assert.equal(exists(host, ".agents"), false);
  }
  const resumed = makeHostRepo({ files: { ".agents/ags.yaml": "format: 2\nhost: h\n", ".agents/local/notes.md": "mine\n" }, gitignore: "notes.md\n" });
  await assert.rejects(install(ags, resumed), /- \.agents\/local\/notes\.md/);
});

test("install: refused before any write when a managed path runs through a link out of the host", async (t) => {
  const ags = agsFixture();
  const host = makeHostRepo({ files: { ".agents/ags.yaml": "format: 2\nhost: h\n" } });
  const outside = fs.mkdtempSync(path.join(path.dirname(host), "ags-outside-"));
  if (!nativeDirectoryLink(t, outside, path.join(host, ".agents", "rules"))) return;
  await assert.rejects(install(ags, host), /escapes root through a link/);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test("install: the exclude block only when .tmp/ is not ignored", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ gitignore: ".tmp/\n" });
  const first = await install(ags, host);
  assert.doesNotMatch(first.terminal.text(), /exclude block/);
  const done = await install(ags, host, { plan: digestOf(first.terminal.text()) });
  assert.equal(done.code, 0);
  assert.equal(exists(host, ".git/info/exclude") && read(host, ".git/info/exclude").includes("AGS:BEGIN"), false);
});

test("install: the exclude block comes before any other write under .tmp/, and prepare's moves before ags.yaml", async () => {
  const ags = agsFixture();
  const setup = { "AGENTS.md": "# Old facts\n", ".agents/guidance/a.md": "a\n", ".agents/ags.yaml": "format: 1\n" };
  const filesUnder = (host, rel) => (exists(host, rel) ? Object.keys(treeSnapshot(path.join(host, ...rel.split("/")))) : []);
  const stopAt = async (point) => {
    const host = makeHostRepo({ files: setup });
    const first = await install(ags, host);
    const broken = await install(ags, host, { plan: digestOf(first.terminal.text()), env: { AGS_TEST_FAULT: `install:${point}` } });
    assert.equal(broken.code, 1, broken.terminal.text());
    return host;
  };

  const locked = await stopAt("after-host-lock");
  assert.deepEqual(filesUnder(locked, ".tmp"), []);
  assert.equal(exists(locked, ".git/info/exclude") && read(locked, ".git/info/exclude").includes("AGS:BEGIN"), false);

  const excluded = await stopAt("after-exclude-block");
  assert.match(read(excluded, ".git/info/exclude"), /AGS:BEGIN/);
  assert.deepEqual(filesUnder(excluded, ".tmp"), []);

  const moved = await stopAt("after-move-last");
  assert.equal(exists(moved, ".agents/ags.yaml"), false);
  assert.equal(exists(moved, "AGENTS.md"), false);
});

test("install: agsVersion is written last; interrupted before it, the install resumes", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  const first = await install(ags, host);
  const broken = await install(ags, host, { plan: digestOf(first.terminal.text()), env: { AGS_TEST_FAULT: "install:after-registry" } });
  assert.equal(broken.code, 1);
  assert.match(broken.terminal.text(), /Not completed: agsVersion/);
  assert.equal(parse(read(host, ".agents/ags.yaml")).agsVersion, undefined);
  assert.equal(registry(ags).hosts.length, 1);
  await assert.rejects(
    import("../scripts/lib/prepare.mjs").then(({ hostPrepare }) => hostPrepare({ agsRoot: ags, route: host, rerunArgs: [], terminal: quietTerminal(), options: {} })),
    /interrupted install/,
  );

  const resumed = await install(ags, host);
  assert.equal(resumed.code, 3);
  const text = resumed.terminal.text();
  assert.match(text, /Resuming the interrupted install of host host\./);
  assert.match(text, /\.agents\/ags\.yaml\s+settings\s+set agsVersion/);
  assert.doesNotMatch(text, /managed|registry|AGENTS\.md/);
  const done = await install(ags, host, { plan: digestOf(text) });
  assert.equal(done.code, 0, done.terminal.text());
  assert.equal(parse(read(host, ".agents/ags.yaml")).agsVersion, "2.0.0");
  assert.equal(registry(ags).hosts.length, 1);
});

test("install: interrupted in the managed writes, the resume adds only what is missing", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  const first = await install(ags, host);
  const broken = await install(ags, host, { plan: digestOf(first.terminal.text()), env: { AGS_TEST_FAULT: "install:after-managed-write-first" } });
  assert.equal(broken.code, 1);
  const resumed = await install(ags, host);
  const text = resumed.terminal.text();
  assert.match(text, /Resuming/);
  assert.doesNotMatch(text, /\.agents\/rules\/tmp-conventions\.md/);
  assert.match(text, /\.agents\/skills\/plan-work\/SKILL\.md\s+managed\s+add/);
  assert.match(text, /AGENTS\.md\s+block\s+create/);
  assert.equal((await install(ags, host, { plan: digestOf(text) })).code, 0);
  assert.equal(parse(read(host, ".agents/ags.yaml")).agsVersion, "2.0.0");
});

test("install: a resumed host indexes its host rules after the AGS rules", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ files: { ".agents/ags.yaml": "format: 2\nhost: h\n", ".agents/rules/server.md": "---\ndescription: Editing server code.\n---\n", ".agents/rules/bare.md": "no frontmatter\n" } });
  const first = await install(ags, host);
  assert.match(first.terminal.text(), /Warning: Host rule \.agents\/rules\/bare\.md has no description/);
  assert.equal((await install(ags, host, { plan: digestOf(first.terminal.text()) })).code, 0);
  assert.match(read(host, "AGENTS.md"), /tmp-conventions\.md`: Creating, moving, or archiving files under \.tmp\/\.\n- `\.agents\/rules\/server\.md`: Editing server code\.\n<!-- AGS:END -->/);
});

test("install: a resume backs up every host file it overwrites, ags.yaml and AGENTS.md included", async () => {
  const ags = agsFixture();
  const config = "format: 2\nhost: h\n";
  const host = makeHostRepo({ files: { ".agents/ags.yaml": config, "AGENTS.md": "# Host facts\n" } });
  const first = await install(ags, host);
  assert.equal(first.code, 3, first.terminal.text());
  const done = await install(ags, host, { plan: digestOf(first.terminal.text()) });
  assert.equal(done.code, 0, done.terminal.text());
  const folder = fs.readdirSync(path.join(host, ".tmp", "ags", "backups")).find((name) => name.endsWith("-install"));
  assert.ok(folder, done.terminal.text());
  const manifest = JSON.parse(read(host, `.tmp/ags/backups/${folder}/manifest.json`));
  assert.equal(manifest.operation, "install");
  assert.deepEqual(manifest.files.map((file) => file.original).sort(), [".agents/ags.yaml", "AGENTS.md"]);
  assert.equal(read(host, `.tmp/ags/backups/${folder}/_agents/ags.yaml`), config);
  assert.equal(read(host, `.tmp/ags/backups/${folder}/AGENTS.md.bak`), "# Host facts\n");
  assert.match(done.terminal.text(), new RegExp(`Backups: \\.tmp/ags/backups/${folder}`));
});

test("install: a required setting is asked for or exits 3; --set supplies it with its description comment", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await assert.rejects(install(ags, host, { enable: ["ship"] }), (error) => error.exitCode === 3 && /git\.mainBranch/.test(error.message) && /--set 'git\.mainBranch=<value>'/.test(error.message));
  const done = await confirmed(ags, host, { enable: ["ship"], sets: ["git.mainBranch=main"] });
  assert.equal(done.code, 0, done.terminal.text());
  const text = read(host, ".agents/ags.yaml");
  assert.match(text, /skills:\n {2}enabled: \[ship\]/);
  assert.match(text, /git:\n {2}# Trunk branch that feature branches start from and merge into\.\n {2}mainBranch: main\n/);
  assert.match(text, /# Prefix for ticket ids.*\n {2}ticketPrefix: ""/);
  assert.ok(exists(host, ".agents/skills/ship/SKILL.md"));
});

test("install: in a terminal the opt-in items and missing values are asked", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  const terminal = fakeTerminal(["ship, nope", "ship", "trunk", "yes"]);
  const { code } = await install(ags, host, { terminal });
  assert.equal(code, 0, terminal.lines.join("\n"));
  assert.match(terminal.prompts[0], /Opt-in items: style, css-rules, css-clean, ship\./);
  assert.equal(parse(read(host, ".agents/ags.yaml")).git.mainBranch, "trunk");
});

test("install: checkbox choices use release descriptions, resolve companions and keep settings/plan confirmation", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  fs.writeFileSync(path.join(ags, "rules", "style.md"), "---\ndescription: Unreleased description.\n---\n");
  const terminal = fakeTerminal(["trunk", "yes"]);
  terminal.selectMany = async ({ choices, included }) => {
    assert.deepEqual(choices.map(choice => choice.value), ["style", "css-rules", "css-clean", "ship"]);
    assert.equal(choices[0].description, "Editing style files.");
    assert.ok(included(["css-rules"]).includes("css-clean"));
    assert.ok(!included(["css-rules"]).includes("css-rules"));
    return ["style", "css-rules", "ship"];
  };
  const { code } = await install(ags, host, { terminal });
  assert.equal(code, 0, terminal.lines.join("\n"));
  const config = parse(read(host, ".agents/ags.yaml"));
  assert.deepEqual(config.rules.enabled, ["style"]);
  assert.deepEqual(config.skills.enabled, ["css-rules", "ship"]);
  assert.equal(config.git.mainBranch, "trunk");
  assert.ok(exists(host, ".agents/skills/css-clean/SKILL.md"));
  assert.match(terminal.prompts.at(-1), /Apply this plan/);
});

test("install: automatic detected companions are shown and picker cancellation writes nothing", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ files: { "package.json": JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }) } });
  const beforeHost = treeSnapshot(host), beforeAgs = treeSnapshot(ags);
  const terminal = fakeTerminal();
  terminal.selectMany = async ({ included }) => {
    assert.ok(included([]).includes("css-rules"));
    assert.ok(included([]).includes("css-clean"));
    return null;
  };
  assert.equal((await install(ags, host, { terminal })).code, 0);
  assert.deepEqual(treeSnapshot(host), beforeHost);
  assert.deepEqual(treeSnapshot(ags), beforeAgs);
  assert.match(terminal.lines.join("\n"), /Stopped\. Nothing was written/);
});

test("install: simple terminals accept numbers and explicit flags bypass the picker", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  const terminal = fakeTerminal(["0,99", "1,2,2", "yes"]);
  assert.equal((await install(ags, host, { terminal })).code, 0);
  assert.ok(terminal.lines.some(line => /1\. style \(rule\): Editing style files/.test(line)));
  assert.deepEqual(parse(read(host, ".agents/ags.yaml")).skills.enabled, ["css-rules"]);
  const flagged = fakeTerminal(["trunk", "yes"]);
  flagged.selectMany = () => { throw new Error("Flags must bypass the picker"); };
  assert.equal((await install(ags, makeHostRepo({ name: "flagged" }), { terminal: flagged, enable: ["ship"] })).code, 0);
  const stoppedHost = makeHostRepo();
  const before = treeSnapshot(stoppedHost);
  assert.equal((await install(ags, stoppedHost, { terminal: fakeTerminal(["stop"]) })).code, 0);
  assert.deepEqual(treeSnapshot(stoppedHost), before);
});

test("install: refuses the AGS root and an AGS without release tags", async () => {
  const ags = agsFixture();
  await assert.rejects(install(ags, ags), /AGS does not apply to itself/);
  const untagged = agsFixture({ tags: [] });
  await assert.rejects(install(untagged, makeHostRepo()), /no release tag/);
});

test("install CLI: --id and --name, exit 3 then --plan, unknown ids exit 2", () => {
  const ags = agsFixture({ cli: true });
  const host = makeHostRepo();
  const first = runAgs(ags, ["host", "install", "--route", host, "--id", "probe", "--name", "Probe Host"]);
  assert.equal(first.code, 3, first.stderr);
  assert.match(first.stdout, /add probe \(Probe Host\)/);
  const digest = digestOf(first.stdout);
  const second = runAgs(ags, ["host", "install", "--route", host, "--id", "probe", "--name", "Probe Host", "--plan", digest]);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(parse(read(host, ".agents/ags.yaml")).host, "probe");
  assert.equal(registry(ags).hosts[0].name, "Probe Host");
  const other = makeHostRepo();
  assert.equal(runAgs(ags, ["host", "install", "--route", other, "--enable", "nope"]).code, 2);
  assert.equal(runAgs(ags, ["host", "install", "--route", other, "--set", "bad"]).code, 2);
});
