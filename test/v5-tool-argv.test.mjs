import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { executeTool } from "../scripts/lib/capabilities.mjs";
import { quietTerminal, tempDir, writeExecutable } from "./helpers/fixtures.mjs";

test("Windows batch optional backends preserve literal argv through CMD and propagate output/status", { skip: process.platform !== "win32" ? "Requires native Windows batch execution" : false }, (t) => {
  const root = tempDir("ags-tool-argv-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const args = ["", "two words", "日本語", "literal 'single'", 'literal "double"', "$cash", "`tick`", "https://example.test/path?q=a&next=b", "%PATH%", "!AGS_TOOL_BANG!", "trailing\\", 'slashes\\\\"quote', 'quote"&next', "^caret", "(paren)", "a|b<c>d;e"];
  const originalPath = process.env.PATH;
  const originalBang = process.env.AGS_TOOL_BANG;
  process.env.PATH = "C:\\ags-literal-path-test";
  process.env.AGS_TOOL_BANG = "unexpected-expansion";
  try {
    for (const relative of ["standalone bin", "node_modules/.bin"]) {
      const bin = path.join(root, ...relative.split("/"));
      const file = writeExecutable(bin, "proxy", { nodeBody: "process.stdout.write(JSON.stringify(process.argv.slice(2))+'\\n'); process.stderr.write('backend-error\\n'); process.exit(7);" });
      const terminal = quietTerminal();
      assert.equal(executeTool(file, args, { cwd: root, terminal }), 7, terminal.text());
      assert.deepEqual(JSON.parse(terminal.lines[0]), args);
      assert.equal(terminal.lines[1], "backend-error");
    }
  } finally {
    if (originalPath == null) delete process.env.PATH; else process.env.PATH = originalPath;
    if (originalBang == null) delete process.env.AGS_TOOL_BANG; else process.env.AGS_TOOL_BANG = originalBang;
  }
});

test("Windows batch optional backends refuse unrepresentable NUL/newline arguments before execution", { skip: process.platform !== "win32" ? "Requires native Windows batch execution" : false }, (t) => {
  const root = tempDir("ags-tool-refusal-");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = writeExecutable(root, "proxy", { stdout: "unexpected backend execution" });
  for (const arg of ["line1\nline2", "line1\rline2", "contains\0nul"]) {
    const terminal = quietTerminal();
    assert.equal(executeTool(file, [arg], { cwd: root, terminal }), 1);
    assert.match(terminal.text(), /cannot preserve NUL or newline.*Windows batch tool/);
    assert.equal(terminal.text().includes("unexpected backend execution"), false);
  }
});
