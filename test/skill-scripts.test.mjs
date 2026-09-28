import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { commitCount, emptyTreeId, writeDiff } from "../scripts/lib/diff.mjs";
import { runChecks } from "../scripts/lib/checks.mjs";
import { detectPackageManager, isPackageScriptKey, packageScriptInvocation } from "../scripts/lib/packages.mjs";
import { git, makeHostRepo, tempDir } from "./helpers/fixtures.mjs";

function commitFile(repo, name, body, message) {
  fs.writeFileSync(path.join(repo, name), body);
  git(repo, ["add", name]);
  git(repo, ["commit", "-q", "-m", message]);
}

function gitOut(repo, args) {
  return spawnSync("git", args, { cwd: repo, encoding: "utf8" }).stdout;
}

// diff

test("diff modes match git and do not change the index", () => {
  const repo = makeHostRepo({ name: "diff-host" });
  commitFile(repo, "tracked.txt", "one\n", "one");
  commitFile(repo, "tracked.txt", "two\n", "two");
  fs.writeFileSync(path.join(repo, "tracked.txt"), "three\n");
  git(repo, ["add", "tracked.txt"]);
  fs.writeFileSync(path.join(repo, "tracked.txt"), "four\n");
  fs.writeFileSync(path.join(repo, "fresh.txt"), "new\n");
  const indexBefore = git(repo, ["diff", "--cached", "--name-only"]);
  const filesBefore = git(repo, ["ls-files"]);
  const commits = writeDiff(repo, "commits.diff", "commits", "1");
  const expectedCommits = gitOut(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD~1..HEAD"]);
  assert.equal(fs.readFileSync(commits.path, "utf8"), expectedCommits);
  const range = writeDiff(repo, "range", "range", { from: "HEAD~1", to: "HEAD" });
  assert.equal(fs.readFileSync(range.path, "utf8"), expectedCommits);
  const staged = writeDiff(repo, "staged", "staged");
  const expectedStaged = gitOut(repo, ["diff", "--cached", "--no-color"]);
  assert.equal(fs.readFileSync(staged.path, "utf8"), expectedStaged);
  const changes = writeDiff(repo, "changes", "changes");
  assert.ok(fs.readFileSync(changes.path, "utf8").includes("four"));
  const untracked = writeDiff(repo, "untracked", "untracked");
  assert.match(fs.readFileSync(untracked.path, "utf8"), /fresh\.txt/);
  assert.equal(git(repo, ["diff", "--cached", "--name-only"]), indexBefore);
  assert.equal(git(repo, ["ls-files"]), filesBefore);
  const current = writeDiff(repo, "current", "current", "1");
  const text = fs.readFileSync(current.path, "utf8");
  const trackedHeaders = text.split("\n").filter((line) => line.startsWith("diff --git a/tracked.txt"));
  assert.equal(trackedHeaders.length, 1);
  assert.match(text, /fresh\.txt/);
  assert.throws(() => writeDiff(repo, "../escape", "staged"));
  assert.throws(() => writeDiff(repo, "too-many", "commits", "9"));
  const count = String(commitCount(repo));
  const all = writeDiff(repo, "all-commits", "commits", count);
  assert.ok(fs.readFileSync(all.path, "utf8").includes("tracked.txt"));
  assert.throws(() => writeDiff(repo, "too-far", "commits", String(Number(count) + 1)));
  assert.throws(() => writeDiff(repo, "bad-ref", "range", { from: "deadbeefdead", to: "HEAD" }));
  assert.equal(fs.existsSync(path.join(repo, ".tmp", "bad-ref.diff")), false);
  const currentAll = writeDiff(repo, "current-all", "current");
  const expectedHead = gitOut(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD"]);
  const body = fs.readFileSync(currentAll.path, "utf8");
  assert.ok(body.startsWith(expectedHead));
  assert.match(body, /fresh\.txt/);
  const nestedDiffDir = path.join(repo, "src", "nested");
  fs.mkdirSync(nestedDiffDir, { recursive: true });
  const nestedDiff = writeDiff(nestedDiffDir, "from-nested", "staged");
  assert.equal(path.resolve(nestedDiff.path), path.join(path.resolve(repo), ".tmp", "from-nested.diff"));
});

test("diff first-parent count bounds merge history", () => {
  const repo = makeHostRepo({ name: "merge-diff" });
  git(repo, ["checkout", "-q", "-b", "side"]);
  commitFile(repo, "side.txt", "side\n", "side");
  git(repo, ["checkout", "-q", "-"]);
  commitFile(repo, "main.txt", "main\n", "main");
  git(repo, ["merge", "-q", "--no-ff", "side", "-m", "merge"]);
  const first = commitCount(repo);
  const all = Number(git(repo, ["rev-list", "--count", "HEAD"]));
  assert.ok(all > first);
  const indexBefore = git(repo, ["write-tree"]);
  fs.writeFileSync(path.join(repo, "fresh.txt"), "new\n");
  const atRoot = writeDiff(repo, "all-first", "current", String(first));
  const text = fs.readFileSync(atRoot.path, "utf8");
  assert.match(text, /README\.md/);
  assert.match(text, /fresh\.txt/);
  const below = writeDiff(repo, "below", "commits", String(first - 1));
  const parent = gitOut(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "HEAD~" + (first - 1), "HEAD"]);
  assert.equal(fs.readFileSync(below.path, "utf8"), parent);
  assert.throws(() => writeDiff(repo, "past", "commits", String(first + 1)));
  const empty = emptyTreeId(repo);
  const boundary = writeDiff(repo, "boundary", "commits", String(first));
  const expected = gitOut(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", empty, "HEAD"]);
  assert.equal(fs.readFileSync(boundary.path, "utf8"), expected);
  assert.equal(git(repo, ["write-tree"]), indexBefore);
});

function denyRead(file) {
  const result = spawnSync("icacls", [file, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:(D)`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function allowRead(file) {
  spawnSync("icacls", [file, "/grant:r", `${process.env.USERNAME}:(F)`], { encoding: "utf8" });
}

test("diff of untracked files keeps unicode names and refuses an unreadable file", () => {
  const repo = makeHostRepo({ name: "unicode-diff" });
  fs.writeFileSync(path.join(repo, "café.txt"), "café\n");
  const untracked = writeDiff(repo, "uni", "untracked");
  assert.match(fs.readFileSync(untracked.path, "utf8"), /café\.txt/);
  const current = writeDiff(repo, "cur", "current");
  assert.match(fs.readFileSync(current.path, "utf8"), /café\.txt/);
  const prior = fs.readFileSync(untracked.path);
  const locked = path.join(repo, "locked.txt");
  fs.writeFileSync(locked, "hidden\n");
  denyRead(locked);
  try {
    assert.throws(() => writeDiff(repo, "uni", "untracked"), /Untracked diff failed for locked\.txt/);
    assert.ok(prior.equals(fs.readFileSync(untracked.path)));
  } finally {
    allowRead(locked);
  }
});

test("diff at the root commit uses the empty tree and leaves the index", () => {
  const repo = makeHostRepo({ name: "root-diff" });
  const indexBefore = git(repo, ["write-tree"]);
  const commits = writeDiff(repo, "root-commits", "commits", "1");
  const empty = emptyTreeId(repo);
  const expected = gitOut(repo, ["diff", "--no-color", "--no-ext-diff", "--no-textconv", empty, "HEAD"]);
  assert.equal(fs.readFileSync(commits.path, "utf8"), expected);
  fs.writeFileSync(path.join(repo, "fresh.txt"), "new\n");
  const current = writeDiff(repo, "root-current", "current", "1");
  const text = fs.readFileSync(current.path, "utf8");
  assert.match(text, /README\.md/);
  assert.match(text, /fresh\.txt/);
  assert.equal(git(repo, ["write-tree"]), indexBefore);
  assert.throws(() => writeDiff(repo, "past-root", "commits", "2"));
});

// check

function writePackage(host, scripts, extra = { packageManager: "npm@10.9.2" }) {
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ name: "fixture", ...extra, scripts }));
}

test("check runs every configured script, keeps failures, and prettier writes nothing", () => {
  const host = makeHostRepo({ name: "check-host" });
  const marker = path.join(host, "marker.txt");
  fs.writeFileSync(marker, "same\n");
  writePackage(host, {
    typecheck: "node -e \"process.exit(0)\"",
    lint: "node -e \"process.exit(2)\"",
    "prettier:check": "node -e \"process.exit(0)\"",
  });
  const results = runChecks(host, { type: "typecheck", lint: "lint", prettier: "prettier:check" });
  assert.deepEqual(results.map((item) => item.status), ["passed", "failed", "passed"]);
  assert.equal(fs.readFileSync(marker, "utf8"), "same\n");
  const partial = makeHostRepo({ name: "partial-check" });
  writePackage(partial, { typecheck: "node -e \"process.exit(0)\"" });
  const partialResults = runChecks(partial, { type: "typecheck" });
  assert.equal(partialResults[0].status, "passed");
  assert.equal(partialResults[1].status, "not-configured");
  assert.equal(partialResults[2].status, "not-configured");
  const bare = makeHostRepo({ name: "bare-check" });
  assert.deepEqual(runChecks(bare, {}).map((item) => item.status), ["not-configured", "not-configured", "not-configured"]);
});

test("check package scripts keep diagnostics and reject prettier writes", () => {
  const locks = { pnpm: "pnpm-lock.yaml", yarn: "yarn.lock", npm: "package-lock.json" };
  const scripts = {
    typecheck: "node -e \"process.exit(0)\"",
    lint: "node -e \"process.stderr.write('lint-fail\\n'); process.exit(2)\"",
    "prettier:check": "node -e \"process.stdout.write('pretty\\n'); process.exit(0)\"",
  };
  for (const manager of ["pnpm", "yarn", "npm"]) {
    const host = makeHostRepo({ name: `${manager}-checks` });
    writePackage(host, scripts, {});
    fs.writeFileSync(path.join(host, locks[manager]), "lock\n");
    const results = runChecks(host, { type: "typecheck", lint: "lint", prettier: "prettier:check" });
    assert.deepEqual(results.map((item) => item.status), ["passed", "failed", "passed"]);
    assert.equal(results[1].manager, manager);
    assert.match(results[1].diagnostics, /lint-fail/);
    assert.match(results[2].diagnostics, /pretty/);
  }
  const conflict = makeHostRepo({ name: "conflict-checks" });
  writePackage(conflict, { typecheck: "node -e \"process.exit(0)\"" }, { packageManager: "pnpm@9.0.0" });
  fs.writeFileSync(path.join(conflict, "yarn.lock"), "lock\n");
  assert.throws(() => runChecks(conflict, { type: "typecheck" }), /conflict/);
  const bare = makeHostRepo({ name: "no-manager" });
  writePackage(bare, { typecheck: "node -e \"process.exit(0)\"" }, {});
  assert.equal(runChecks(bare, { type: "typecheck" })[0].status, "unavailable");
  const stale = makeHostRepo({ name: "stale-checks" });
  writePackage(stale, { typecheck: "node -e \"process.exit(0)\"" });
  const staleResults = runChecks(stale, { type: "typecheck", lint: "missing-script" });
  assert.equal(staleResults.find((item) => item.name === "lint").status, "stale-configuration");
  assert.equal(staleResults.find((item) => item.name === "type").status, "passed");
  assert.equal(staleResults.find((item) => item.name === "type").manager, "npm");
  const writer = makeHostRepo({ name: "prettier-write" });
  writePackage(writer, { "prettier:check": "prettier --write src" });
  fs.writeFileSync(path.join(writer, "src.txt"), "same\n");
  const rejected = runChecks(writer, { prettier: "prettier:check" }, { which: ["prettier"] });
  assert.equal(rejected[0].status, "rejected");
  assert.equal(fs.readFileSync(path.join(writer, "src.txt"), "utf8"), "same\n");
});

test("check requires one lock file when packageManager is absent", () => {
  const root = tempDir("ags-locks-");
  fs.writeFileSync(path.join(root, "package.json"), "{}\n");
  fs.writeFileSync(path.join(root, "package-lock.json"), "{}\n");
  fs.writeFileSync(path.join(root, "npm-shrinkwrap.json"), "{}\n");
  const conflict = detectPackageManager(root);
  assert.equal(conflict.manager, null);
  assert.match(conflict.conflict, /package-lock\.json/);
  assert.match(conflict.conflict, /npm-shrinkwrap\.json/);
  fs.rmSync(path.join(root, "npm-shrinkwrap.json"));
  assert.equal(detectPackageManager(root).manager, "npm");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ packageManager: "npm@10.9.2" }));
  fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "lock: true\n");
  assert.equal(detectPackageManager(root).manager, null);
});

test("check script names reject shell metacharacters before cmd.exe", () => {
  for (const bad of ["a&b", "a|b", "a<b", "a>b", "a^b", "a%b", "a!b", "a b", "a(b)", "a\"b", "a'b"]) {
    assert.equal(isPackageScriptKey(bad), false);
    assert.throws(() => packageScriptInvocation("npm", bad));
  }
  for (const good of ["lint", "lint:fix", "a.b", "a_b", "a-b", "a@b", "a/b"]) {
    const command = packageScriptInvocation("npm", good);
    assert.deepEqual(command.args, ["run", good]);
    assert.deepEqual(command.fallback.slice(-3), ["npm.cmd", "run", good]);
  }
});
