import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { main } from "../scripts/ags.mjs";
import { readStoredZip, writeSnapshot } from "../scripts/lib/snapshot.mjs";
import { AgsError } from "../scripts/lib/util.mjs";
import { git, makeHostRepo, quietTerminal, runAgs, tempDir, treeSnapshot, withCli } from "./helpers/fixtures.mjs";

function hostWithAgents() {
  return makeHostRepo({
    name: "snap-host",
    files: {
      "AGENTS.md": "# Host\n",
      ".agents/ags.yaml": "format: 2\nhost: snap-host\nagsVersion: 2.0.0\ngit:\n  mainBranch: trunk\n",
      ".agents/skills/plan-work/SKILL.md": "---\nname: plan-work\ndescription: Plan.\n---\n",
      ".agents/notes/local.md": "note\n",
      ".agents/rules/.env": "SECRET=1\n",
      "src/app.js": "x\n",
    },
  });
}

async function snapshot(argv) {
  const terminal = quietTerminal();
  try {
    return { code: await main(["snapshot", ...argv], { terminal }), text: terminal.text() };
  } catch (error) {
    if (!(error instanceof AgsError)) throw error;
    return { code: error.exitCode || 1, text: error.message };
  }
}

test("snapshot: zips AGENTS.md, all of .agents and one manifest with host, version and hashes", async () => {
  const host = hostWithAgents();
  const before = treeSnapshot(host, { exclude: [".git", ".tmp"] });
  const result = await snapshot(["--route", host]);
  assert.equal(result.code, 0, result.text);
  const dir = path.join(host, ".tmp", "ags", "snapshots");
  const [zip] = fs.readdirSync(dir);
  assert.match(zip, /^\d{4}-\d{2}-\d{2}-\d{6}\.zip$/);
  const entries = readStoredZip(fs.readFileSync(path.join(dir, zip)));
  const names = entries.map((entry) => entry.name);
  assert.deepEqual(names, [".agents/ags.yaml", ".agents/notes/local.md", ".agents/rules/.env", ".agents/skills/plan-work/SKILL.md", "AGENTS.md", "manifest.json"]);
  const manifest = JSON.parse(entries.at(-1).data.toString("utf8"));
  assert.equal(manifest.host, "snap-host");
  assert.equal(manifest.agsVersion, "2.0.0");
  assert.match(manifest.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  for (const file of manifest.files) {
    const data = fs.readFileSync(path.join(host, ...file.path.split("/")));
    assert.equal(file.bytes, data.length);
    assert.equal(file.sha256, createHash("sha256").update(data).digest("hex"));
  }
  assert.deepEqual(treeSnapshot(host, { exclude: [".git", ".tmp"] }), before);
  assert.deepEqual(fs.readdirSync(path.join(host, ".tmp", "ags")).sort(), ["locks", "snapshots"]);
});

test("snapshot: --out writes there, and unsafe or existing outputs are refused", async () => {
  const host = hostWithAgents();
  const out = path.join(host, ".tmp", "copies", "copy.zip");
  assert.equal((await snapshot(["--route", host, "--out", out])).code, 0);
  assert.ok(fs.existsSync(out));
  assert.equal((await snapshot(["--route", host, "--out", out])).code, 1);
  const outside = path.join(tempDir("ags-snap-out-"), "copy.zip");
  const escaped = await snapshot(["--route", host, "--out", outside]);
  assert.equal(escaped.code, 1);
  assert.match(escaped.text, /must be inside the host/);
  assert.equal(fs.existsSync(outside), false);
  assert.equal((await snapshot(["--route", host, "--out", path.join(host, "copy.txt")])).code, 2);
  const inside = await snapshot(["--route", host, "--out", path.join(host, ".agents", "copy.zip")]);
  assert.equal(inside.code, 1);
  assert.match(inside.text, /inside the files it captures/);
  assert.equal(fs.existsSync(path.join(host, ".agents", "copy.zip")), false);
  assert.throws(() => writeSnapshot(host, { host: "snap-host", agsVersion: "2.0.0", out: path.join(host, ".agents", "skills", "x.zip") }), /inside the files it captures/);
});

test("snapshot: works from a linked worktree and refuses a host without an installation", async () => {
  const host = hostWithAgents();
  const worktree = path.join(path.dirname(host), "linked");
  git(host, ["worktree", "add", "-q", worktree, "-b", "linked"]);
  assert.equal((await snapshot(["--route", worktree])).code, 0);
  assert.equal(fs.readdirSync(path.join(worktree, ".tmp", "ags", "snapshots")).length, 1);
  const bare = makeHostRepo({ name: "bare" });
  const refused = await snapshot(["--route", bare]);
  assert.equal(refused.code, 1);
  assert.match(refused.text, /no AGS installation/);
});

test("bare snapshot --out is a usage error", () => {
  const scratch = withCli(tempDir("ags-cli-"));
  const result = runAgs(scratch, ["snapshot", "--out"]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Missing value for --out/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /[/\\]true/);
});
