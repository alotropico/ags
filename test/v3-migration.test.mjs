import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { hostInstall, hostUpdate } from "../scripts/lib/host.mjs";
import { commitAll, digestOf, git, initRepo, makeHostRepo, quietTerminal, REAL_ROOT, tag, tempDir } from "./helpers/fixtures.mjs";

const SOURCES = ["2.0.0", "2.0.1", "2.1.0", "2.1.1", "2.1.2"];

function copyCandidate(from, to) {
  const excluded = new Set([".git", ".tmp", "node_modules", "reports", "hosts.yaml"]);
  fs.cpSync(from, to, {
    recursive: true,
    filter(source) {
      const rel = path.relative(from, source);
      if (!rel) return true;
      return !excluded.has(rel.split(path.sep)[0]);
    },
  });
}

function options(plan = null, env = {}) {
  return { dryRun: false, plan, decide: new Map(), decideAll: null, env: { AGS_TEST_FAULT: "", ...env } };
}

async function installAt(ags, host) {
  const args = ["host", "install", "--route", host];
  const first = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: first, options: options() }), 3, first.text());
  const second = quietTerminal();
  assert.equal(await hostInstall({ agsRoot: ags, route: host, rerunArgs: args, terminal: second, options: options(digestOf(first.text())) }), 0, second.text());
}

async function migrate(ags, host) {
  const args = ["host", "update", "--route", host, "--to", "3.0.0"];
  const first = quietTerminal();
  assert.equal(await hostUpdate({ agsRoot: ags, route: host, to: "3.0.0", rerunArgs: args, terminal: first, options: options() }), 3, first.text());
  assert.match(first.text(), /Migration: 2->3/);
  const second = quietTerminal();
  assert.equal(await hostUpdate({ agsRoot: ags, route: host, to: "3.0.0", rerunArgs: args, terminal: second, options: options(digestOf(first.text())) }), 0, second.text());
  const third = quietTerminal();
  assert.equal(await hostUpdate({ agsRoot: ags, route: host, to: "3.0.0", rerunArgs: args, terminal: third, options: options() }), 0, third.text());
  assert.match(third.text(), /Nothing to do/);
}

async function interruptMigrationOnce(ags, host) {
  const args = ["host", "update", "--route", host, "--to", "3.0.0"];
  const first = quietTerminal();
  assert.equal(await hostUpdate({ agsRoot: ags, route: host, to: "3.0.0", rerunArgs: args, terminal: first, options: options() }), 3, first.text());
  const interrupted = quietTerminal();
  assert.equal(await hostUpdate({
    agsRoot: ags,
    route: host,
    to: "3.0.0",
    rerunArgs: args,
    terminal: interrupted,
    options: options(digestOf(first.text()), { AGS_TEST_FAULT: "update:after-managed-write-first" }),
  }), 1, interrupted.text());
  assert.match(interrupted.text(), /Injected fault/);
  assert.equal(parse(fs.readFileSync(path.join(host, ".agents", "ags.yaml"), "utf8")).agsVersion, "2.1.2");
  assert.ok(fs.readdirSync(path.join(host, ".tmp", "ags", "backups")).some((name) => name.includes("-update")));
}

test("V3 migration: every released V2 version updates directly and idempotently", async () => {
  for (const version of SOURCES) {
    const ags = initRepo(path.join(tempDir(`ags-v3-${version}-`), "ags"));
    copyCandidate(REAL_ROOT, ags);
    commitAll(ags, "V3 candidate");
    git(ags, ["fetch", "--no-tags", REAL_ROOT, `refs/tags/v${version}:refs/tags/v${version}`]);

    const host = makeHostRepo({ name: `host-${version.replaceAll(".", "-")}` });
    await installAt(ags, host);
    assert.equal(parse(fs.readFileSync(path.join(host, ".agents", "ags.yaml"), "utf8")).agsVersion, version);

    tag(ags, "3.0.0");
    if (version === "2.1.2") await interruptMigrationOnce(ags, host);
    await migrate(ags, host);

    const config = parse(fs.readFileSync(path.join(host, ".agents", "ags.yaml"), "utf8"));
    assert.equal(config.agsVersion, "3.0.0");
    assert.ok(fs.existsSync(path.join(host, ".agents", "rules", "workspace-operations.md")));
    assert.ok(fs.existsSync(path.join(host, ".agents", "skills", "plan-work", "SKILL.md")));
  }
});
