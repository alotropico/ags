import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { findHost, loadRegistry, registryPath, saveRegistry, validateRegistry } from "../scripts/lib/registry.mjs";
import { sha256, tempDir } from "./helpers/fixtures.mjs";

const H1 = sha256("host");
const H2 = sha256("ags");

function entry(overrides = {}) {
  return { id: "watcher", name: "Watcher", path: "C:/Cosmos/projects/watcher", ignored: [], promoted: [], ...overrides };
}

test("a missing hosts.yaml is an empty registry", () => {
  assert.deepEqual(loadRegistry(tempDir("ags-reg-")), { format: 2, hosts: [] });
});

test("format 1 is rejected with the replacement message", () => {
  const root = tempDir("ags-reg-");
  fs.writeFileSync(registryPath(root), "format: 1\nhosts: []\n");
  assert.throws(() => loadRegistry(root), /hosts.yaml format 1 is not supported; replace it with format 2/);
});

test("records round-trip through an atomic save", () => {
  const root = tempDir("ags-reg-");
  const data = {
    format: 2,
    hosts: [entry({
      path: path.join(root, "host"),
      ignored: [{ path: ".agents/skills/ship/SKILL.md", hostHash: H1, targetHash: H2, version: "2.0.0" }],
      promoted: [{ path: ".agents/rules/tmp-conventions.md", hostHash: H1, agsHash: H2, version: "2.0.0" }],
    })],
  };
  saveRegistry(root, data);
  const loaded = loadRegistry(root);
  assert.equal(loaded.hosts[0].path, path.join(root, "host").replaceAll("\\", "/"));
  assert.deepEqual(loaded.hosts[0].ignored, data.hosts[0].ignored);
  assert.deepEqual(loaded.hosts[0].promoted, data.hosts[0].promoted);
  assert.equal(fs.readdirSync(root).filter((name) => name.endsWith(".tmp")).length, 0);
  assert.equal(findHost(loaded, { id: "watcher" }).name, "Watcher");
  assert.equal(findHost(loaded, { hostPath: path.join(root, "HOST") })?.id, process.platform === "win32" ? "watcher" : undefined);
});

test("ids are slugs and paths are unique, case-insensitively on Windows", () => {
  const errors = validateRegistry({ format: 2, hosts: [entry({ id: "Bad Id" }), entry({ id: "b", path: "c:/cosmos/PROJECTS/watcher" })] });
  assert.ok(errors.some((line) => /host id must be a slug/.test(line)));
  assert.equal(errors.some((line) => /duplicate host path/.test(line)), process.platform === "win32");
  assert.ok(validateRegistry({ format: 2, hosts: [entry(), entry({ path: "C:/other" })] }).some((line) => /duplicate host id/.test(line)));
});

test("record shapes are validated", () => {
  const bad = validateRegistry({ format: 2, hosts: [entry({
    ignored: [{ path: "..\\x", hostHash: "short", targetHash: null, version: "2" }],
    promoted: [{ path: ".agents/x.md", hostHash: H1, version: "2.0.0", extra: 1 }],
  })] });
  assert.ok(bad.some((line) => /forward slashes/.test(line)));
  assert.ok(bad.some((line) => /hostHash must be/.test(line)));
  assert.ok(bad.some((line) => /version must be X.Y.Z/.test(line)));
  assert.ok(bad.some((line) => /agsHash must be/.test(line)));
  assert.ok(bad.some((line) => /field not allowed: extra/.test(line)));
  assert.deepEqual(validateRegistry({ format: 2, hosts: [entry({ ignored: [{ path: ".agents/a.md", hostHash: H1, targetHash: null, version: "2.0.0" }] })] }), []);
  const root = tempDir("ags-reg-");
  assert.throws(() => saveRegistry(root, { format: 2, hosts: [entry({ id: "X" })] }), /invalid hosts.yaml/);
  assert.equal(fs.existsSync(registryPath(root)), false);
});
