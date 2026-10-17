import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { main } from "../scripts/ags.mjs";
import { parseDiffArgs, writeDiff } from "../skills/write-commit-diff/scripts/write-commit-diff.mjs";
import { git, makeHostRepo, quietTerminal, tempDir } from "./helpers/fixtures.mjs";

test("diff shorthand selectors and legacy named modes resolve without Git or a skill", () => {
  for (const [words, mode, extra] of [
    [[], "current", undefined], [["1"], "commits", 1], [["current"], "working", undefined],
    [["unstaged"], "working", undefined], [["staged"], "staged", undefined],
    [["current", "staged"], "current", undefined], [["staged", "1", "current"], "current", 1],
    [["staged", "1"], "staged", 1], [["deadbeef"], "commit", "deadbeef"],
    [["commit", "HEAD~1"], "commit", "HEAD~1"],
  ]) assert.deepEqual(parseDiffArgs(words), { name: "changes", mode, extra });
  assert.deepEqual(parseDiffArgs(["commits", "review.diff", "2"]), { name: "review", mode: "commits", extra: "2" });
  assert.deepEqual(parseDiffArgs(["current", "review", "2"]), { name: "review", mode: "current", extra: "2" });
  assert.equal(parseDiffArgs([], { name: "ticket.diff" }).name, "ticket");
  for (const words of [["0"], ["current", "current"], ["staged", "1", "2"], ["current", "1"], ["nonsense"], ["constructor", "foo"], ["commits", "review"]]) {
    assert.throws(() => parseDiffArgs(words));
  }
});

test("ags diff selects commit, unstaged, staged and combined net changes in an ordinary repository", async () => {
  const repo = makeHostRepo({ name: "no skill needed café", files: {
    "committed.txt": "base\n", "index.txt": "base\n", "working.txt": "base\n",
  } });
  fs.writeFileSync(path.join(repo, "committed.txt"), "selected commit\n");
  git(repo, ["add", "committed.txt"]);
  git(repo, ["commit", "-qm", "selected"]);
  const selected = git(repo, ["rev-parse", "HEAD"]);
  fs.writeFileSync(path.join(repo, "committed.txt"), "later commit\n");
  git(repo, ["add", "committed.txt"]);
  git(repo, ["commit", "-qm", "later"]);
  fs.writeFileSync(path.join(repo, "index.txt"), "staged only\n");
  git(repo, ["add", "index.txt"]);
  fs.writeFileSync(path.join(repo, "working.txt"), "unstaged only\n");
  fs.writeFileSync(path.join(repo, "fresh.txt"), "untracked only\n");
  const indexBefore = fs.readFileSync(path.join(repo, ".git", "index"));
  const before = ["committed.txt", "index.txt", "working.txt", "fresh.txt"].map((name) => fs.readFileSync(path.join(repo, name)));
  const read = async (words, name) => {
    const terminal = quietTerminal();
    assert.equal(await main(["diff", ...words, "--route", repo, ...(name ? ["--name", name] : [])], { terminal }), 0, terminal.text());
    const file = path.join(repo, ".tmp", "scratch", `${name || "changes"}.diff`);
    assert.ok(terminal.text().includes(file));
    return fs.readFileSync(file, "utf8");
  };
  assert.equal((await read(["1"])).trim(), git(repo, ["diff", "--no-color", "HEAD~1", "HEAD"]));
  const current = await read(["current"]);
  assert.match(current, /\+unstaged only/);
  assert.match(current, /\+untracked only/);
  assert.doesNotMatch(current, /\+staged only|committed\.txt/);
  const staged = await read(["staged"]);
  assert.equal(staged.trim(), git(repo, ["diff", "--no-color", "--cached"]));
  assert.match(staged, /\+staged only/);
  const combined = await read(["current", "staged"]);
  assert.ok(combined.startsWith(git(repo, ["diff", "--no-color", "HEAD"])));
  assert.match(combined, /\+untracked only/);
  assert.equal(await read([]), combined);
  const all = await read(["current", "staged", "1"], "review");
  assert.ok(all.startsWith(git(repo, ["diff", "--no-color", "HEAD~1"])));
  assert.match(all, /\+later commit/);
  assert.match(all, /\+untracked only/);
  const commit = await read([selected.slice(0, 10)]);
  assert.equal(commit.trim(), git(repo, ["diff", "--no-color", `${selected}^`, selected]));
  assert.match(commit, /\+selected commit/);
  assert.doesNotMatch(commit, /later commit|staged only|unstaged only|untracked only/);
  assert.deepEqual(fs.readFileSync(path.join(repo, ".git", "index")), indexBefore);
  for (const [i, name] of ["committed.txt", "index.txt", "working.txt", "fresh.txt"].entries()) {
    assert.deepEqual(fs.readFileSync(path.join(repo, name)), before[i]);
  }
  assert.equal(fs.existsSync(path.join(repo, ".agents")), false);
});

test("combined diff uses net snapshots even when unstaged changes undo staged content", () => {
  const repo = makeHostRepo({ files: { "a.txt": "base\n" } });
  fs.writeFileSync(path.join(repo, "a.txt"), "staged\n");
  git(repo, ["add", "a.txt"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "base\n");
  assert.equal(writeDiff(repo).bytes, 0);
  assert.match(fs.readFileSync(writeDiff(repo, "working", "working").path, "utf8"), /-staged/);
  assert.match(fs.readFileSync(writeDiff(repo, "index", "staged").path, "utf8"), /\+staged/);
});

test("root commit and unborn repositories diff against the empty tree; output does not feed back", async () => {
  const repo = makeHostRepo();
  const root = git(repo, ["rev-parse", "HEAD"]);
  const commit = writeDiff(repo, "root", "commit", root);
  assert.match(fs.readFileSync(commit.path, "utf8"), /\+host/);
  const empty = tempDir("ags-diff-unborn-");
  git(empty, ["init", "-q"]);
  fs.writeFileSync(path.join(empty, "staged.txt"), "initial staged\n");
  git(empty, ["add", "staged.txt"]);
  fs.writeFileSync(path.join(empty, "fresh.txt"), "initial untracked\n");
  const first = writeDiff(empty);
  const bytes = fs.readFileSync(first.path);
  assert.match(bytes.toString(), /initial staged/);
  assert.match(bytes.toString(), /initial untracked/);
  assert.deepEqual(fs.readFileSync(writeDiff(empty).path), bytes);
  assert.equal(await main(["diff", "staged", "--route", empty], { terminal: quietTerminal() }), 0);
});

test("invalid diff selections and unknown commits preserve an existing output file", async () => {
  const repo = makeHostRepo();
  const file = writeDiff(repo).path;
  fs.writeFileSync(file, "prior result\n");
  await assert.rejects(main(["diff", "current", "current", "--route", repo], { terminal: quietTerminal() }), (error) => error.exitCode === 2);
  await assert.rejects(main(["diff", "ffffffffffffffffffffffffffffffffffffffff", "--route", repo], { terminal: quietTerminal() }), /git rev-parse.*failed/);
  await assert.rejects(main(["diff", "--name", "../escape", "--route", repo], { terminal: quietTerminal() }), /plain filename/);
  assert.equal(fs.readFileSync(file, "utf8"), "prior result\n");
});
