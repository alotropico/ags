import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { hostInstall, hostList, hostStatus, hostUnregister, hostUpdate } from "../scripts/lib/host.mjs";
import { commitAll, digestOf, fakeTerminal, git, makeAgsRepo, makeHostRepo, quietTerminal, REAL_ROOT, runAgs, sampleCatalog, sampleMaterial, skillFile, tag, treeSnapshot, withCli, writeFiles } from "./helpers/fixtures.mjs";

const CONFIG_TEMPLATE = fs.readFileSync(path.join(REAL_ROOT, "templates", "ags.yaml"), "utf8").replaceAll("\r\n", "\n");
const REFS = ["a", "b", "c", "d", "e", "f", "g"];

function material(extra = {}) {
  const files = { ...sampleMaterial(), "templates/ags.yaml": CONFIG_TEMPLATE };
  for (const name of REFS) files[`skills/plan-work/references/${name}.md`] = `# ${name}\n`;
  return { ...files, ...extra };
}

function agsFixture({ catalog = sampleCatalog(), files = material() } = {}) {
  return makeAgsRepo({ catalog, files, tags: ["2.0.0"] });
}

function release(ags, version, { files = {}, remove = [], catalog = null } = {}) {
  writeFiles(ags, files);
  for (const rel of remove) fs.rmSync(path.join(ags, ...rel.split("/")), { force: true });
  if (catalog) fs.writeFileSync(path.join(ags, "catalog.yaml"), stringify(catalog));
  commitAll(ags, `release ${version}`);
  tag(ags, version);
}

function options(extra = {}) {
  return { dryRun: false, plan: null, decide: new Map(), decideAll: null, env: { AGS_TEST_FAULT: "" }, ...extra };
}

async function install(ags, host, rest = {}) {
  const args = ["host", "install", "--route", host];
  const first = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: first, options: options(), ...rest }), 3, first.text());
  const second = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: second, options: options({ plan: digestOf(first.text()) }), ...rest }), 0, second.text());
}

async function update(ags, host, { plan = null, decide = {}, decideAll = null, dryRun = false, env = {}, ...rest } = {}) {
  const terminal = quietTerminal();
  const code = await hostUpdate({
    agsRoot: ags,
    route: host,
    rerunArgs: ["host", "update", "--route", host],
    terminal,
    options: options({ plan, dryRun, decide: new Map(Object.entries(decide)), decideAll, env: { AGS_TEST_FAULT: "", ...env } }),
    ...rest,
  });
  return { code, text: terminal.text() };
}

async function decided(ags, host, decide = {}, rest = {}) {
  const first = await update(ags, host, rest);
  assert.equal(first.code, 3, first.text);
  const second = await update(ags, host, { ...rest, plan: digestOf(first.text), decide });
  assert.equal(second.code, 0, second.text);
  return { first, second };
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, ...rel.split("/")));
}

function edit(root, rel, content) {
  writeFiles(root, { [rel]: content });
}

function config(host) {
  return parse(read(host, ".agents/ags.yaml"));
}

function registry(ags) {
  return parse(read(ags, "hosts.yaml"));
}

function row(text, rel) {
  return text.split("\n").find((line) => line.startsWith(`${rel} `)) ?? "";
}

const REF = ".agents/skills/plan-work/references";

test("update: every row of the classification table gets its action or its choices, and decisions apply", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host, { enable: ["style"] });
  release(ags, "2.0.1", {
    files: { "skills/plan-work/references/a.md": "# a2\n", "skills/plan-work/references/d.md": "# d2\n", "skills/plan-work/references/new.md": "# new\n", "skills/plan-work/references/both.md": "# both from AGS\n" },
    remove: ["skills/plan-work/references/b.md", "skills/plan-work/references/e.md"],
  });
  edit(host, `${REF}/c.md`, "# c host\n");
  edit(host, `${REF}/d.md`, "# d host\n");
  edit(host, `${REF}/e.md`, "# e host\n");
  edit(host, `${REF}/added.md`, "# added\n");
  edit(host, `${REF}/both.md`, "# both from host\n");
  fs.rmSync(path.join(host, ...`${REF}/f.md`.split("/")));
  edit(host, ".agents/rules/style.md", "---\ndescription: Editing style files.\n---\n\n# style host\n");

  const first = await update(ags, host, { disable: ["style"] });
  assert.equal(first.code, 3, first.text);
  const text = first.text;
  assert.match(row(text, `${REF}/a.md`), /managed\s+update/);
  assert.match(row(text, `${REF}/b.md`), /managed\s+delete/);
  assert.match(row(text, `${REF}/new.md`), /managed\s+add/);
  assert.match(row(text, `${REF}/c.md`), /choose promote\/restore\/ignore/);
  assert.match(row(text, `${REF}/d.md`), /choose restore\/ignore/);
  assert.match(row(text, `${REF}/e.md`), /choose restore\/ignore/);
  assert.match(row(text, `${REF}/added.md`), /choose promote\/restore\/ignore/);
  assert.match(row(text, `${REF}/both.md`), /choose restore\/ignore/);
  assert.match(row(text, `${REF}/f.md`), /choose restore\/ignore/);
  assert.match(row(text, ".agents/rules/style.md"), /delete \(deselected, backed up\)/);
  assert.equal(row(text, `${REF}/g.md`), "");
  assert.match(row(text, ".agents/ags.yaml"), /settings\s+update/);
  assert.match(text, /from 2\.0\.0 to 2\.0\.1/);

  const second = await update(ags, host, {
    disable: ["style"],
    plan: digestOf(text),
    decide: { [`${REF}/c.md`]: "restore", [`${REF}/d.md`]: "restore", [`${REF}/e.md`]: "restore", [`${REF}/added.md`]: "restore", [`${REF}/both.md`]: "ignore", [`${REF}/f.md`]: "restore" },
  });
  assert.equal(second.code, 0, second.text);
  assert.equal(read(host, `${REF}/a.md`), "# a2\n");
  assert.equal(exists(host, `${REF}/b.md`), false);
  assert.equal(read(host, `${REF}/new.md`), "# new\n");
  assert.equal(read(host, `${REF}/c.md`), "# c\n");
  assert.equal(read(host, `${REF}/d.md`), "# d2\n");
  assert.equal(exists(host, `${REF}/e.md`), false);
  assert.equal(exists(host, `${REF}/added.md`), false);
  assert.equal(read(host, `${REF}/both.md`), "# both from host\n");
  assert.equal(read(host, `${REF}/f.md`), "# f\n");
  assert.equal(exists(host, ".agents/rules/style.md"), false);
  assert.equal(config(host).agsVersion, "2.0.1");
  assert.deepEqual(config(host).rules.disabled, ["style"]);
  assert.doesNotMatch(read(host, "AGENTS.md"), /style\.md/);
  const folder = fs.readdirSync(path.join(host, ".tmp", "ags", "backups")).find((name) => name.endsWith("-update"));
  const manifest = JSON.parse(read(host, `.tmp/ags/backups/${folder}/manifest.json`));
  assert.equal(manifest.operation, "update");
  assert.deepEqual([manifest.from, manifest.to], ["2.0.0", "2.0.1"]);
  const backedUp = manifest.files.map((file) => file.original);
  for (const rel of [`${REF}/c.md`, `${REF}/e.md`, `${REF}/added.md`, ".agents/rules/style.md", "AGENTS.md", ".agents/ags.yaml"]) assert.ok(backedUp.includes(rel), rel);
  assert.equal(read(host, `.tmp/ags/backups/${folder}/_agents/skills/plan-work/references/added.md`), "# added\n");
  assert.equal(read(host, `.tmp/ags/backups/${folder}/AGENTS.md.bak`).startsWith("<!-- AGS:BEGIN 2.0.0"), true);
  const ignored = registry(ags).hosts[0].ignored;
  assert.deepEqual(ignored.map((record) => record.path), [`${REF}/both.md`]);
  assert.equal(ignored[0].version, "2.0.1");

  const again = await update(ags, host);
  assert.equal(again.code, 0, again.text);
  assert.match(again.text, /Ignored: \.agents\/skills\/plan-work\/references\/both\.md/);
  assert.match(again.text, /Nothing to do/);
});

test("update: an ignore record is dropped and the item asked again when the host content changes", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\n");
  await decided(ags, host, { [`${REF}/c.md`]: "ignore" });
  assert.equal(registry(ags).hosts[0].ignored.length, 1);
  assert.match((await update(ags, host)).text, /Nothing to do/);
  edit(host, `${REF}/c.md`, "# c host again\n");
  const asked = await update(ags, host);
  assert.equal(asked.code, 3);
  assert.match(row(asked.text, `${REF}/c.md`), /choose promote\/restore\/ignore/);
});

test("update: a whole deleted skill folder offers disable, except for a companion of a selected parent", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host, { enable: ["css-rules"] });
  fs.rmSync(path.join(host, ".agents", "skills", "css-rules"), { recursive: true });
  fs.rmSync(path.join(host, ".agents", "skills", "css-clean"), { recursive: true });
  const first = await update(ags, host);
  assert.equal(first.code, 3, first.text);
  assert.match(row(first.text, ".agents/skills/css-rules/"), /skill folder\s+choose restore\/ignore\/disable/);
  assert.match(row(first.text, ".agents/skills/css-clean/"), /skill folder\s+choose restore\/ignore\s*$/);
  assert.match(row(first.text, ".agents/ags.yaml"), /settings\s+skills\.disabled if disable is chosen/);
  const second = await update(ags, host, { plan: digestOf(first.text), decide: { ".agents/skills/css-rules/": "disable", ".agents/skills/css-clean/": "restore" } });
  assert.equal(second.code, 0, second.text);
  assert.deepEqual(config(host).skills.enabled, []);
  assert.deepEqual(config(host).skills.disabled, ["css-rules"]);
  assert.equal(exists(host, ".agents/skills/css-clean/SKILL.md"), true);
  const next = await update(ags, host);
  assert.equal(next.code, 3, next.text);
  assert.match(row(next.text, ".agents/skills/css-clean/SKILL.md"), /managed\s+delete/);
});

test("update: --enable and --disable are written to ags.yaml; unedited deselected files are deleted", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host, { enable: ["style"] });
  const first = await update(ags, host, { disable: ["style"], enable: ["css-clean"] });
  assert.equal(first.code, 3, first.text);
  assert.match(row(first.text, ".agents/rules/style.md"), /managed\s+delete\s/);
  assert.match(row(first.text, ".agents/skills/css-clean/SKILL.md"), /managed\s+add/);
  const second = await update(ags, host, { disable: ["style"], enable: ["css-clean"], plan: digestOf(first.text) });
  assert.equal(second.code, 0, second.text);
  const data = config(host);
  assert.deepEqual(data.rules, { enabled: [], disabled: ["style"] });
  assert.deepEqual(data.skills.enabled, ["css-clean"]);
  assert.equal(data.checks.lint, "");
  assert.equal(data.agsVersion, "2.0.0");
});

test("update: a collision with an id new at T stops before any write with the rename; equal-to-Tc items are not collisions", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  const catalog = sampleCatalog();
  catalog.skills.push({ id: "extra", install: "always" });
  release(ags, "2.0.1", { catalog, files: { "skills/extra/SKILL.md": skillFile("extra", "Extra.") } });
  edit(host, ".agents/skills/extra/SKILL.md", skillFile("extra", "Mine."));
  await assert.rejects(update(ags, host), (error) => {
    assert.match(error.message, /Nothing was written/);
    assert.ok(error.message.includes("- rename .agents/skills/extra/ to .agents/skills/host-extra/ and change name in its SKILL.md to host-extra"));
    return true;
  });
  assert.equal(config(host).agsVersion, "2.0.0");
  edit(host, ".agents/skills/extra/SKILL.md", skillFile("extra", "Extra."));
  const ok = await update(ags, host);
  assert.equal(ok.code, 3, ok.text);
  assert.doesNotMatch(ok.text, /extra\/SKILL\.md/);
});

test("update: target resolution picks the latest release of the major, refuses downgrades and other majors, and refuses an interrupted install", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  release(ags, "2.1.0", { files: { "skills/plan-work/references/a.md": "# a2\n" } });
  release(ags, "3.0.0", { files: { "skills/plan-work/references/a.md": "# a3\n" } });
  const first = await update(ags, host, { dryRun: true });
  assert.match(first.text, /from 2\.0\.0 to 2\.1\.0/);
  await assert.rejects(update(ags, host, { to: "3.0.0" }), /crosses a major version/);
  await decided(ags, host, {}, { to: "2.1.0" });
  await assert.rejects(update(ags, host, { to: "2.0.0" }), /Downgrades are refused/);
  const fresh = makeHostRepo({ files: { ".agents/ags.yaml": "format: 2\nhost: fresh\n" } });
  await assert.rejects(update(ags, fresh), /interrupted install.*ags host install/);
  await assert.rejects(update(ags, makeHostRepo()), /no AGS installation/);
});

test("update: an unregistered installed host gets a register item; a moved host gets a path update; another entry holding the path stops", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  fs.writeFileSync(path.join(ags, "hosts.yaml"), stringify({ format: 2, hosts: [] }));
  const first = await update(ags, host);
  assert.match(row(first.text, "hosts.yaml"), /registry\s+add host \(host\)/);
  await decided(ags, host);
  assert.equal(registry(ags).hosts[0].id, "host");

  const data = registry(ags);
  data.hosts[0].path = path.join(path.dirname(host), "old-place");
  fs.writeFileSync(path.join(ags, "hosts.yaml"), stringify(data));
  const moved = await update(ags, host);
  assert.match(row(moved.text, "hosts.yaml"), /registry\s+move host to /);
  await decided(ags, host);
  assert.equal(path.resolve(registry(ags).hosts[0].path).toLowerCase(), path.resolve(host).toLowerCase());

  const other = registry(ags);
  other.hosts[0].id = "other";
  fs.writeFileSync(path.join(ags, "hosts.yaml"), stringify(other));
  await assert.rejects(update(ags, host), /Registry entry other holds/);
});

test("update: the AGS block regenerates when intact, asks restore when edited or missing, and malformed exits 1", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, ".agents/rules/local-notes.md", "---\ndescription: Local notes.\n---\n");
  const regen = await update(ags, host);
  assert.match(row(regen.text, "AGENTS.md"), /block\s+regenerate/);
  await decided(ags, host);
  assert.match(read(host, "AGENTS.md"), /- `\.agents\/rules\/local-notes\.md`: Local notes\./);

  edit(host, "AGENTS.md", read(host, "AGENTS.md").replace("## AGS", "## AGS edited"));
  const edited = await update(ags, host);
  assert.equal(edited.code, 3);
  assert.match(row(edited.text, "AGENTS.md"), /choose restore/);
  assert.match(edited.text, /Decisions needed: AGENTS\.md/);
  const restored = await update(ags, host, { plan: digestOf(edited.text), decide: { "AGENTS.md": "restore" } });
  assert.equal(restored.code, 0, restored.text);
  assert.match(restored.text, /- ## AGS edited/);
  assert.doesNotMatch(read(host, "AGENTS.md"), /AGS edited/);

  edit(host, "AGENTS.md", "# Facts only\n");
  const missing = await update(ags, host);
  assert.match(row(missing.text, "AGENTS.md"), /choose restore/);
  assert.match(missing.text, /ags host unregister/);
  await update(ags, host, { plan: digestOf(missing.text), decide: { "AGENTS.md": "restore" } });
  assert.match(read(host, "AGENTS.md"), /^<!-- AGS:BEGIN 2\.0\.0 [0-9a-f]{12} -->\n[\s\S]*<!-- AGS:END -->\n\n# Facts only\n$/);

  edit(host, "AGENTS.md", `${read(host, "AGENTS.md")}\n<!-- AGS:END -->\n`);
  await assert.rejects(update(ags, host), /unbalanced or repeated AGS markers/);
});

test("update: an edited exclude region asks restore; restore backs up the exclude file", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  const file = path.join(host, ".git", "info", "exclude");
  fs.writeFileSync(file, "# keep me\n# AGS:BEGIN\n/.tmpx/\n# AGS:END\n");
  const first = await update(ags, host);
  assert.equal(first.code, 3);
  assert.match(row(first.text, ".git/info/exclude"), /choose restore/);
  const second = await update(ags, host, { plan: digestOf(first.text), decide: { ".git/info/exclude": "restore" } });
  assert.equal(second.code, 0, second.text);
  assert.equal(fs.readFileSync(file, "utf8"), "# keep me\n# AGS:BEGIN\n/.tmp/\n# AGS:END\n");
  const folder = fs.readdirSync(path.join(host, ".tmp", "ags", "backups")).find((name) => name.endsWith("-update-exclude"));
  assert.ok(folder);
  assert.match(read(host, `.tmp/ags/backups/${folder}/_git/info/exclude`), /\/\.tmpx\//);
});

test("update: promotion is offered only when neither the AGS source nor the target changed the file", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\n");
  edit(ags, "skills/plan-work/references/c.md", "# c source edit\n");
  const sourceChanged = await update(ags, host);
  assert.match(row(sourceChanged.text, `${REF}/c.md`), /choose restore\/ignore/);
  git(ags, ["checkout", "--", "."]);
  release(ags, "2.0.1", { files: { "skills/plan-work/references/c.md": "# c2\n" } });
  const targetChanged = await update(ags, host);
  assert.match(row(targetChanged.text, `${REF}/c.md`), /choose restore\/ignore/);
});

test("update: promote writes AGS and a note; later runs list it pending; a release containing it replaces the host file without asking", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ name: "watcher" });
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\r\n");
  edit(host, `${REF}/added.md`, "# added\n");
  await decided(ags, host, { [`${REF}/c.md`]: "promote", [`${REF}/added.md`]: "promote" });
  assert.equal(read(ags, "skills/plan-work/references/c.md"), "# c host\n");
  assert.equal(read(ags, "skills/plan-work/references/added.md"), "# added\n");
  const changelog = read(ags, "CHANGELOG.md");
  assert.match(changelog, /## Unreleased\n- Promoted from watcher: `skills\/plan-work\/references\/added\.md`\n- Promoted from watcher: `skills\/plan-work\/references\/c\.md`\n/);
  assert.equal(registry(ags).hosts[0].promoted.length, 2);
  assert.equal(git(ags, ["log", "--oneline"]).split("\n").length, 1);

  const pending = await update(ags, host);
  assert.equal(pending.code, 0, pending.text);
  assert.match(pending.text, /Promoted, pending release: \.agents\/skills\/plan-work\/references\/c\.md/);

  commitAll(ags, "promote");
  tag(ags, "2.0.1");
  const replaced = await update(ags, host);
  assert.equal(replaced.code, 3, replaced.text);
  assert.equal(row(replaced.text, `${REF}/c.md`), "");
  assert.match(row(replaced.text, "hosts.yaml"), /drop stale records/);
  assert.doesNotMatch(replaced.text, /Decisions needed: /);
  await decided(ags, host);
  assert.equal(read(host, `${REF}/c.md`).replaceAll("\r\n", "\n"), "# c host\n");
  assert.deepEqual(registry(ags).hosts[0].promoted, []);
  assert.equal(config(host).agsVersion, "2.0.1");
});

test("update: a release without the promotion drops the record and asks again", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\n");
  await decided(ags, host, { [`${REF}/c.md`]: "promote" });
  git(ags, ["checkout", "--", "."]);
  release(ags, "2.0.1", { files: { "skills/plan-work/references/a.md": "# a2\n" } });
  const asked = await update(ags, host);
  assert.equal(asked.code, 3);
  assert.match(row(asked.text, `${REF}/c.md`), /choose promote\/restore\/ignore/);
  assert.match(row(asked.text, "hosts.yaml"), /drop stale records/);
});

test("update: an interruption after a promotion records it on rerun without asking and without a second note", async () => {
  const ags = agsFixture();
  const host = makeHostRepo({ name: "watcher" });
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\n");
  const first = await update(ags, host);
  const failed = await update(ags, host, { plan: digestOf(first.text), decide: { [`${REF}/c.md`]: "promote" }, env: { AGS_TEST_FAULT: "update:after-notes" } });
  assert.equal(failed.code, 1);
  assert.match(failed.text, /Rerun: ags host update .*--to 2\.0\.0/);
  assert.equal(read(ags, "skills/plan-work/references/c.md"), "# c host\n");
  const rerun = await update(ags, host);
  assert.equal(rerun.code, 3);
  assert.match(row(rerun.text, `${REF}/c.md`), /record promotion/);
  await decided(ags, host);
  assert.equal(read(ags, "CHANGELOG.md").match(/Promoted from watcher/g).length, 1);
  assert.equal(registry(ags).hosts[0].promoted.length, 1);
});

test("update: CRLF host copies show no change; AGS renames a file and changes a binary; an edited binary is asked", async () => {
  const BIN = "skills/plan-work/assets/logo.bin";
  const HOST_BIN = `.agents/${BIN}`;
  const ags = agsFixture({ files: material({ [BIN]: Buffer.from([0, 1, 2, 3]) }) });
  const host = makeHostRepo();
  await install(ags, host);
  assert.deepEqual(fs.readFileSync(path.join(host, ...HOST_BIN.split("/"))), Buffer.from([0, 1, 2, 3]));
  for (const name of REFS) edit(host, `${REF}/${name}.md`, `# ${name}\r\n`);
  const clean = await update(ags, host);
  assert.equal(clean.code, 0, clean.text);
  assert.match(clean.text, /Nothing to do/);

  release(ags, "2.0.1", { files: { "skills/plan-work/references/b-renamed.md": "# b\n", [BIN]: Buffer.from([0, 9, 9]) }, remove: ["skills/plan-work/references/b.md"] });
  const first = await update(ags, host);
  assert.equal(first.code, 3, first.text);
  assert.match(row(first.text, `${REF}/b.md`), /managed\s+delete/);
  assert.match(row(first.text, `${REF}/b-renamed.md`), /managed\s+add/);
  assert.match(row(first.text, HOST_BIN), /managed\s+update/);
  assert.doesNotMatch(first.text, /choose/);
  await update(ags, host, { plan: digestOf(first.text) });
  assert.equal(exists(host, `${REF}/b.md`), false);
  assert.equal(read(host, `${REF}/b-renamed.md`), "# b\n");
  assert.deepEqual(fs.readFileSync(path.join(host, ...HOST_BIN.split("/"))), Buffer.from([0, 9, 9]));

  edit(host, HOST_BIN, Buffer.from([0, 7]));
  const asked = await update(ags, host);
  assert.equal(asked.code, 3, asked.text);
  assert.match(row(asked.text, HOST_BIN), /choose promote\/restore\/ignore/);
});

test("update: --decide-all answers every open item, and a terminal answers same for all remaining", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\n");
  edit(host, `${REF}/d.md`, "# d host\n");
  const first = await update(ags, host);
  assert.equal(first.code, 3, first.text);
  const second = await update(ags, host, { plan: digestOf(first.text), decideAll: "restore" });
  assert.equal(second.code, 0, second.text);
  assert.equal(read(host, `${REF}/c.md`), "# c\n");
  assert.equal(read(host, `${REF}/d.md`), "# d\n");

  edit(host, `${REF}/c.md`, "# c host\n");
  edit(host, `${REF}/d.md`, "# d host\n");
  const terminal = fakeTerminal(["restore all", "yes"]);
  const code = await hostUpdate({ agsRoot: ags, route: host, rerunArgs: ["host", "update", "--route", host], terminal, options: options() });
  assert.equal(code, 0, terminal.lines.join("\n"));
  assert.equal(terminal.remaining(), 0);
  assert.equal(read(host, `${REF}/c.md`), "# c\n");
  assert.equal(read(host, `${REF}/d.md`), "# d\n");
});

test("update: a collision with an id new at T stops in a terminal too; the rerun after the rename proceeds", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  const catalog = sampleCatalog();
  catalog.skills.push({ id: "extra", install: "always" });
  release(ags, "2.0.1", { catalog, files: { "skills/extra/SKILL.md": skillFile("extra", "Extra.") } });
  edit(host, ".agents/skills/extra/SKILL.md", skillFile("extra", "Mine."));
  const terminal = fakeTerminal([]);
  await assert.rejects(hostUpdate({ agsRoot: ags, route: host, rerunArgs: ["host", "update", "--route", host], terminal, options: options() }), (error) => {
    assert.match(error.message, /Nothing was written/);
    assert.ok(error.message.includes("- rename .agents/skills/extra/ to .agents/skills/host-extra/"));
    return true;
  });
  assert.equal(terminal.prompts.length, 0);
  fs.renameSync(path.join(host, ".agents", "skills", "extra"), path.join(host, ".agents", "skills", "host-extra"));
  edit(host, ".agents/skills/host-extra/SKILL.md", skillFile("host-extra", "Mine."));
  await decided(ags, host);
  assert.equal(read(host, ".agents/skills/extra/SKILL.md"), skillFile("extra", "Extra."));
  assert.equal(read(host, ".agents/skills/host-extra/SKILL.md"), skillFile("host-extra", "Mine."));
  assert.equal(config(host).agsVersion, "2.0.1");
});

test("update: stopping at an edited or missing AGS block writes nothing and does not advance the version", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  release(ags, "2.0.1", { files: { "skills/plan-work/references/a.md": "# a2\n" } });
  for (const agents of [read(host, "AGENTS.md").replace("## AGS", "## AGS edited"), "# Facts only\n"]) {
    edit(host, "AGENTS.md", agents);
    const before = treeSnapshot(host);
    const terminal = fakeTerminal(["stop"]);
    const code = await hostUpdate({ agsRoot: ags, route: host, rerunArgs: ["host", "update", "--route", host], terminal, options: options() });
    assert.equal(code, 0, terminal.lines.join("\n"));
    assert.equal(terminal.remaining(), 0);
    assert.deepEqual(treeSnapshot(host), before);
    assert.equal(config(host).agsVersion, "2.0.0");
    assert.equal(read(host, `${REF}/a.md`), "# a\n");
  }
});

// status, list and unregister

test("status: read-only, takes no lock, and shows versions, the plan digest, host changes, records and usage count", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, `${REF}/c.md`, "# c host\n");
  edit(host, ".tmp/ags/reports/usage.jsonl", "{}\n{}\n");
  const lock = path.join(host, ".tmp", "ags", "locks", "host");
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ command: "other", pid: process.pid, startedAt: new Date().toISOString() }));
  const before = fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8");
  const terminal = quietTerminal();
  assert.equal(await hostStatus({ agsRoot: ags, route: host, terminal }), 0);
  const text = terminal.text();
  assert.match(text, /Installed: 2\.0\.0/);
  assert.match(text, /Latest release: 2\.0\.0/);
  assert.match(text, /Reporting: on/);
  assert.match(text, /Usage records: 2/);
  assert.match(text, /Update plan to 2\.0\.0: 1 item, digest [0-9a-f]{12}/);
  assert.match(text, /Host changes: \.agents\/skills\/plan-work\/references\/c\.md/);
  assert.equal(fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8"), before);
  assert.equal(read(host, `${REF}/c.md`), "# c host\n");
});

test("list and unregister: list shows installed versions; unregister removes the entry and leaves host files untouched", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  const listed = quietTerminal();
  hostList({ agsRoot: ags, terminal: listed });
  assert.match(listed.text(), /^host {2}host {2}2\.0\.0 {2}/);
  const args = ["host", "unregister", "--host", "host"];
  const first = quietTerminal();
  assert.equal(await hostUnregister({ agsRoot: ags, hostId: "host", rerunArgs: args, terminal: first, options: options() }), 3);
  assert.match(first.text(), /hosts\.yaml\s+registry\s+remove host/);
  const second = quietTerminal();
  assert.equal(await hostUnregister({ agsRoot: ags, hostId: "host", rerunArgs: args, terminal: second, options: options({ plan: digestOf(first.text()) }) }), 0, second.text());
  assert.deepEqual(registry(ags).hosts, []);
  assert.equal(config(host).agsVersion, "2.0.0");
  const empty = quietTerminal();
  hostList({ agsRoot: ags, terminal: empty });
  assert.equal(empty.text(), "No registered hosts.");
});

test("CLI: host status, list, update --host and unregister are dispatched", async () => {
  const ags = withCli(agsFixture());
  const host = makeHostRepo();
  await install(ags, host);
  release(ags, "2.0.1", { files: { "skills/plan-work/references/a.md": "# a2\n" } });
  assert.match(runAgs(ags, ["host", "list"]).stdout, /^host {2}host {2}2\.0\.0/);
  assert.match(runAgs(ags, ["host", "status", "--host", "host"]).stdout, /Latest release: 2\.0\.1/);
  const first = runAgs(ags, ["host", "update", "--host", "host"]);
  assert.equal(first.code, 3, first.stderr);
  assert.match(first.stdout, /Rerun: ags host update --host host --plan [0-9a-f]{12}/);
  const second = runAgs(ags, ["host", "update", "--host", "host", "--plan", digestOf(first.stdout)]);
  assert.equal(second.code, 0, second.stdout + second.stderr);
  assert.equal(config(host).agsVersion, "2.0.1");
  assert.equal(runAgs(ags, ["host", "update", "--host", "host", "--route", host]).code, 2);
  assert.equal(runAgs(ags, ["host", "unregister"]).code, 2);
});

test("update: refused while git ignores any file under .agents/", async () => {
  const ags = agsFixture();
  const host = makeHostRepo();
  await install(ags, host);
  edit(host, ".agents/local/notes.md", "mine\n");
  fs.writeFileSync(path.join(host, ".gitignore"), "notes.md\n");
  const before = read(host, ".agents/ags.yaml");
  await assert.rejects(update(ags, host), /Git ignores host guidance paths[\s\S]*- \.agents\/local\/notes\.md/);
  assert.equal(read(host, ".agents/ags.yaml"), before);
});
