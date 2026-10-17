import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { executeTool, findExecutable } from "../scripts/lib/capabilities.mjs";
import { nativeDirectoryLink, quietTerminal, tempDir, writeExecutable } from "./helpers/fixtures.mjs";

test("native tool execution preserves parsed argv, backend output and exit status", () => {
  const terminal = quietTerminal();
  const args = ["", "spaces in value", "café/東京", "literal'quote", 'literal"quote', "$value", "`value`", "a&b|c;d", "(paren)", "back\\slash", "%value%", "!value!"];
  const code = executeTool(process.execPath, ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1))+'\\n'); process.stderr.write('backend-error\\n'); process.exit(7);", "--", ...args], { cwd: tempDir(), terminal });
  assert.equal(code, 7);
  assert.deepEqual(JSON.parse(terminal.lines[0]), args);
  assert.equal(terminal.lines[1], "backend-error");
});

test("execution-time missing-tool races produce actionable failure independently of discovery", () => {
  const root = tempDir();
  const file = writeExecutable(root, "tool");
  assert.equal(findExecutable(root, ["tool"], { PATH: root }), file);
  fs.unlinkSync(file);
  const terminal = quietTerminal();
  assert.equal(executeTool(file, [], { cwd: root, terminal }), 1);
  assert.match(terminal.text(), /unavailable; check the tool installation and PATH \(ENOENT\)/);
});

test("optional discovery follows usable native directory links", (t) => {
  const root = tempDir();
  const bin = tempDir();
  const executable = writeExecutable(bin, "linked-tool");
  fs.mkdirSync(path.join(root, "node_modules"));
  const link = nativeDirectoryLink(t, bin, path.join(root, "node_modules", ".bin"));
  if (!link) return;
  const detected = findExecutable(root, ["linked-tool"], { PATH: "" });
  assert.equal(detected, path.join(link, path.basename(executable)));
  const terminal = quietTerminal();
  assert.equal(executeTool(detected, [], { cwd: root, terminal }), 0, terminal.text());
});

test("POSIX discovery ignores non-executable and dangling local bins but follows package-bin links", { skip: process.platform === "win32" ? "POSIX-native executable-file and package-bin link coverage requires macOS execution" : false }, () => {
  const root = tempDir();
  const machine = tempDir();
  const localDir = path.join(root, "node_modules", ".bin");
  const local = writeExecutable(localDir, "tool");
  const global = writeExecutable(machine, "tool");
  const env = { PATH: machine };
  assert.equal(findExecutable(root, ["tool"], env), local);
  try {
    fs.chmodSync(local, 0o644);
    assert.equal(findExecutable(root, ["tool"], env), global);
    const terminal = quietTerminal();
    assert.equal(executeTool(local, [], { cwd: root, terminal }), 1);
    assert.match(terminal.text(), /check the tool's file permissions \(EACCES\)/);
  } finally { fs.chmodSync(local, 0o755); }
  fs.unlinkSync(local);
  fs.symlinkSync(global, local);
  assert.equal(findExecutable(root, ["tool"], env), local);
  fs.unlinkSync(global);
  assert.equal(findExecutable(root, ["tool"], env), null);
});

test("POSIX signal-terminated optional tools fail with a reason", { skip: process.platform === "win32" ? "POSIX-native signal coverage requires macOS execution" : false }, () => {
  const terminal = quietTerminal();
  assert.equal(executeTool(process.execPath, ["-e", "process.kill(process.pid, 'SIGTERM')"], { cwd: tempDir(), terminal }), 1);
  assert.match(terminal.text(), /terminated by signal SIGTERM/);
});
