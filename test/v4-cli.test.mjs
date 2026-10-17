import assert from "node:assert/strict";
import test from "node:test";
import { main, parseArgs, routeOf } from "../scripts/ags.mjs";
import { quietTerminal } from "./helpers/fixtures.mjs";

test("CLI accepts inline values, embedded equals and repeated values", () => {
  assert.deepEqual(parseArgs(["host", "update", "--set=checks.lint=a=b", "--set", "git.ticketPrefix=T-", "--route=C:\\projects\\my app"]), {
    positionals: ["host", "update"], flags: { set: ["checks.lint=a=b", "git.ticketPrefix=T-"], route: "C:\\projects\\my app" },
  });
  assert.throws(() => parseArgs(["--route=a", "--route", "b"]), /more than once/);
  assert.throws(() => parseArgs(["--dry-run=true"]), /does not take a value/);
  assert.equal(routeOf({ route: "." }), process.cwd());
});

test("command groups show help without prompting and unexpected positionals fail first", async () => {
  for (const group of ["host", "skills", "skill", "report", "tmp"]) {
    const terminal = quietTerminal();
    assert.equal(await main([group], { terminal }), 0);
    assert.match(terminal.text(), new RegExp(`ags ${group} <command>`));
  }
  for (const command of [["host", "install"], ["host", "status"], ["doctor"], ["snapshot", "source"]]) {
    await assert.rejects(main([...command, "extra"], { terminal: quietTerminal() }), (error) => error.exitCode === 2);
  }
});
