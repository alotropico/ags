import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { findHost, loadRegistry, registryPath, saveRegistry, validateRegistry } from "../scripts/lib/registry.mjs";
import { nativeDirectoryLink, sha256, tempDir } from "./helpers/fixtures.mjs";

const H1 = sha256("host");
const H2 = sha256("ags");
const DEFAULT_PATH = path.join(tempDir("ags-reg-host-"), "watcher");
fs.mkdirSync(DEFAULT_PATH);

function entry(overrides = {}) {
  return { id: "watcher", name: "Watcher", path: DEFAULT_PATH, ignored: [], promoted: [], ...overrides };
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
  fs.mkdirSync(path.join(root, "host"));
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
  const variant = path.join(root, "HOST");
  assert.equal(findHost(loaded, { hostPath: variant })?.id, fs.existsSync(variant) ? "watcher" : undefined);
});

test("ids are slugs and native case aliases are unique", () => {
  const parent = tempDir("ags-reg-case-");
  const lower = path.join(parent, "watcher");
  const upper = path.join(parent, "WATCHER");
  fs.mkdirSync(lower);
  const aliases = fs.existsSync(upper);
  if (!aliases) fs.mkdirSync(upper);
  const errors = validateRegistry({ format: 2, hosts: [entry({ id: "Bad Id", path: lower }), entry({ id: "b", path: upper })] });
  assert.ok(errors.some((line) => /host id must be a slug/.test(line)));
  assert.equal(errors.some((line) => /duplicate host path/.test(line)), aliases);
  assert.ok(validateRegistry({ format: 2, hosts: [entry(), entry({ path: path.join(parent, "other") })] }).some((line) => /duplicate host id/.test(line)));
});

test("registry lookup and duplicate detection use physical directory aliases", (t) => {
  const root = tempDir("ags-reg-alias-");
  const alias = path.join(root, "alias");
  if (!nativeDirectoryLink(t, DEFAULT_PATH, alias)) return;
  const data = { format: 2, hosts: [entry()] };
  assert.equal(findHost(data, { hostPath: alias })?.id, "watcher");
  assert.ok(validateRegistry({ format: 2, hosts: [entry(), entry({ id: "b", path: alias })] }).some((line) => /duplicate host path/.test(line)));
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
