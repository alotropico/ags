import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hostRegister } from "../scripts/lib/register.mjs";
import { loadRegistry, saveRegistry } from "../scripts/lib/registry.mjs";
import { digestOf, makeAgsRepo, makeHostRepo, quietTerminal, runAgs, sampleCatalog, sampleMaterial, treeSnapshot } from "./helpers/fixtures.mjs";

function fixture() {
  const ags = makeAgsRepo({ catalog: sampleCatalog(), files: sampleMaterial(), tags: ["2.0.0"], cli: true });
  const host = makeHostRepo({ files: {
    ".agents/ags.yaml": "format: 2\nhost: external\nagsVersion: 2.0.0\nreporting: true\ngit:\n  mainBranch: main\n",
    "AGENTS.md": "# Host-owned guidance\n",
    ".agents/local/check.md": "Keep this local guidance.\n",
    ".agents/skills/plan-work/SKILL.md": "# Edited installed guidance\n",
  } });
  return { ags, host };
}

async function register(ags, host, options = {}) {
  const terminal = quietTerminal();
  const code = await hostRegister({ agsRoot: ags, route: host, name: options.name,
    rerunArgs: ["host", "register", "--route", host], terminal,
    options: { dryRun: false, ...options } });
  return { code, text: terminal.text() };
}

test("register: external installation is reviewed, preserves host bytes and unrelated records, and is idempotent", async () => {
  const { ags, host } = fixture();
  const other = { id: "other", name: "Other", path: path.join(ags, "unavailable"), ignored: [], promoted: [] };
  saveRegistry(ags, { format: 2, hosts: [other] });
  const before = treeSnapshot(host, { exclude: [".tmp"] });
  const registryBefore = fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8");
  const preview = await register(ags, host, { dryRun: true, name: "External App" });
  assert.equal(preview.code, 0);
  assert.match(preview.text, /hosts.yaml\s+registry\s+add external/);
  assert.equal(fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8"), registryBefore);
  assert.equal((await register(ags, host, { name: "External App" })).code, 3);
  const applied = await register(ags, host, { name: "External App", plan: digestOf(preview.text) });
  assert.equal(applied.code, 0, applied.text);
  assert.deepEqual(treeSnapshot(host, { exclude: [".tmp"] }), before);
  const registry = loadRegistry(ags);
  assert.deepEqual(registry.hosts[0], { ...other, path: other.path.replaceAll("\\", "/") });
  assert.deepEqual(registry.hosts[1], { id: "external", name: "External App", path: host.replaceAll("\\", "/"), ignored: [], promoted: [] });
  const bytes = fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8");
  const repeated = runAgs(ags, ["host", "register", "--route", host]);
  assert.equal(repeated.code, 0, repeated.stderr);
  assert.match(repeated.stdout, /Nothing to do/);
  assert.equal(fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8"), bytes);
});

test("register: changed configuration or unrelated registry content invalidates the reviewed digest", async () => {
  for (const changed of ["config", "registry"]) {
    const { ags, host } = fixture();
    const preview = await register(ags, host, { dryRun: true });
    if (changed === "config") fs.appendFileSync(path.join(host, ".agents", "ags.yaml"), "# changed since review\n");
    else saveRegistry(ags, { format: 2, hosts: [{ id: "other", name: "Other", path: ags, ignored: [], promoted: [] }] });
    const applied = await register(ags, host, { plan: digestOf(preview.text) });
    assert.equal(applied.code, 3, applied.text);
    assert.match(applied.text, /plan changed/);
    assert.ok(!loadRegistry(ags).hosts.some(entry => entry.id === "external"));
  }
});

test("register: conflicting path or live cloned ID refuses without registry writes", async () => {
  for (const conflict of ["path", "id"]) {
    const { ags, host } = fixture();
    const old = makeHostRepo({ files: { ".agents/ags.yaml": "format: 2\nhost: external\nagsVersion: 2.0.0\n" } });
    saveRegistry(ags, { format: 2, hosts: [{ id: conflict === "path" ? "other" : "external", name: "Original", path: conflict === "path" ? host : old, ignored: [], promoted: [] }] });
    const before = fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8");
    await assert.rejects(register(ags, host), conflict === "path" ? /says host external/ : /still host external/);
    assert.equal(fs.readFileSync(path.join(ags, "hosts.yaml"), "utf8"), before);
  }
});

test("register: relocation and explicit rename retain promotion and ignore records", async () => {
  const { ags, host } = fixture();
  const hash = "a".repeat(64);
  const entry = { id: "external", name: "Original", path: path.join(ags, "missing"),
    ignored: [{ path: ".agents/rules/style.md", hostHash: hash, targetHash: hash, version: "2.0.0" }],
    promoted: [{ path: ".agents/rules/style.md", hostHash: hash, agsHash: hash, version: "2.0.0" }] };
  saveRegistry(ags, { format: 2, hosts: [entry] });
  const preview = await register(ags, host, { dryRun: true, name: "Renamed" });
  const applied = await register(ags, host, { plan: digestOf(preview.text), name: "Renamed" });
  assert.equal(applied.code, 0, applied.text);
  assert.deepEqual(loadRegistry(ags).hosts[0], { ...entry, name: "Renamed", path: host.replaceAll("\\", "/") });
});

test("register: incomplete installations, unavailable releases, source root and invalid flags refuse", async () => {
  const { ags, host } = fixture();
  for (const text of ["format: 2\nhost: external\n", "format: 2\nhost: external\nagsVersion: 9.9.9\n", "format: 2\nhost: BAD ID\nagsVersion: 2.0.0\n"]) {
    fs.writeFileSync(path.join(host, ".agents", "ags.yaml"), text);
    await assert.rejects(register(ags, host), /complete AGS installation|release 9.9.9|host must be a slug/);
  }
  await assert.rejects(register(ags, ags), /AGS repository/);
  assert.equal(runAgs(ags, ["host", "register", "--route", host, "--enable", "ship"]).code, 2);
  assert.equal(runAgs(ags, ["host", "register", "extra"]).code, 2);
  assert.equal(fs.existsSync(path.join(ags, "hosts.yaml")), false);
});
