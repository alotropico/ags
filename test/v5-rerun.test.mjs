import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { installGlobal } from "../scripts/install-global.mjs";
import { commandLine, quoteArg } from "../scripts/lib/operation.mjs";
import { tempDir } from "./helpers/fixtures.mjs";

test("POSIX and PowerShell reruns quote literal shell content", () => {
  assert.equal(quoteArg("$x`echo`'", { shell: "posix" }), "'$x`echo`'\\'''" );
  assert.equal(quoteArg("a,b", { shell: "powershell" }), "'a,b'");
  assert.equal(quoteArg("@args", { shell: "powershell" }), "'@args'");
  assert.equal(quoteArg("it's", { shell: "powershell" }), "'it''s'");
  assert.equal(quoteArg("", { shell: "posix" }), "''");
  assert.equal(quoteArg("", { shell: "powershell" }), "''");
  const args = ["--route", "$literal%PATH%", "", "a,b", "a\"b", "é"];
  const encoded = commandLine(args, { shell: "cmd" }).split(" ").at(-1);
  assert.equal(Buffer.from(encoded, "base64").toString("utf16le"), commandLine(args, { shell: "powershell" }));
});

test("printed reruns round-trip argv through the native supported shells", () => {
  if (!["win32", "darwin"].includes(process.platform)) return;
  const root = tempDir("ags-rerun-");
  const script = path.join(root, "argv probe.mjs");
  const bin = path.join(root, "bin");
  fs.writeFileSync(script, "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n");
  installGlobal({ binDir: bin, scriptPath: script });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const args = ["", "two words", "é", "'", '"', "$value", "`literal`", "%PATH%", "a,b", "@args", "a\\", "line\nend", "&|<>"];
  const runs = process.platform === "win32" ? [
    ["powershell.exe", ["-NoProfile", "-EncodedCommand", Buffer.from(commandLine(args, { shell: "powershell" }), "utf16le").toString("base64")]],
    [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine(args, { shell: "cmd" })]],
  ] : [
    ["/bin/sh", ["-c", commandLine(args, { shell: "posix" })]],
    ["/bin/zsh", ["-c", commandLine(args, { shell: "posix" })]],
  ];
  for (const [shell, argv] of runs) {
    const result = spawnSync(shell, argv, { env, cwd: root, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, `${shell}: ${result.error?.message || result.stderr}`);
    assert.deepEqual(JSON.parse(result.stdout), args, shell);
  }
});
