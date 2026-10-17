import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { collectReports, compactReports, compactRecords, cleanReports } from "../scripts/lib/report-store.mjs";
import { reportUsage, USAGE_REL } from "../scripts/lib/reports.mjs";
import { saveRegistry } from "../scripts/lib/registry.mjs";
import { digestOf, makeAgsRepo, makeHostRepo, quietTerminal, treeSnapshot, writeFiles } from "./helpers/fixtures.mjs";

const now = new Date("2026-10-01T12:00:00Z");
const event = (n, month = "2026-10") => ({ id: `event-${n}`, timestamp: `${month}-01T00:00:00Z`, agsVersion: n % 2 ? "3.0.1" : "4.0.0", ...(n % 2 ? { files: [] } : { action: "check", eventType: "task", outcome: "passed", promptPreview: "ignored for grouping" }) });
const body = (records) => records.map(JSON.stringify).join("\n") + "\n";
const central = (ags, name) => path.join(ags, "reports", "usage", name);
const read = (file) => fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);

function fixture(records) {
  const ags = makeAgsRepo();
  const host = makeHostRepo();
  writeFiles(host, { [USAGE_REL]: body(records) });
  saveRegistry(ags, { format: 2, hosts: [{ id: "example", name: "Example", path: host, ignored: [], promoted: [] }, { id: "unavailable", name: "Unavailable", path: path.join(ags, "absent"), ignored: [], promoted: [] }] });
  return { ags, host };
}

test("reporting records known context without scores; disabled reporting performs no writes", async () => {
  const host = makeHostRepo();
  const args = { hostRoot: host, config: { host: "example", agsVersion: "4.0.0" }, action: "check", eventType: "task", outcome: "passed", prompt: `  a\n b ${"x".repeat(200)}`, attachments: ["C:\\private\\image.png", "/private/report.pdf"], harness: "test", sessionId: "session" };
  assert.equal((await reportUsage(args)).recorded, true);
  const [record] = read(path.join(host, USAGE_REL));
  assert.equal(record.promptPreview.length, 160);
  assert.match(record.promptPreview, /^a b /);
  assert.deepEqual(record.attachments, ["image.png", "report.pdf"]);
  assert.equal(record.host, "example");
  assert.deepEqual(record.files, []);
  const before = treeSnapshot(host);
  assert.equal((await reportUsage({ ...args, config: { ...args.config, reporting: false } })).recorded, false);
  assert.deepEqual(treeSnapshot(host), before);
});

test("collection rotates exactly at 999/1000/1001, leaves partial host lines and never changes hosts", async () => {
  for (const size of [999, 1000, 1001]) {
    const { ags, host } = fixture(Array.from({ length: size }, (_, n) => event(n)));
    fs.appendFileSync(path.join(host, USAGE_REL), 'invalid complete\n{"id":"pending"');
    const before = treeSnapshot(host);
    const terminal = quietTerminal();
    assert.equal(await collectReports({ agsRoot: ags, all: true, terminal, now }), 0);
    assert.equal(read(central(ags, "2026-10-001.jsonl")).length, Math.min(size, 1000));
    assert.equal(fs.existsSync(central(ags, "2026-10-002.jsonl")), size > 1000);
    assert.match(terminal.text(), /malformed complete/);
    assert.match(terminal.text(), /unavailable/);
    assert.deepEqual(treeSnapshot(host), before);
    await collectReports({ agsRoot: ags, all: true, terminal, now });
    assert.match(terminal.lines.at(-1), /Collected 0/);
  }
});

test("interrupted collection recovers by event id and closed compact segments deduplicate", async () => {
  const { ags } = fixture(Array.from({ length: 1001 }, (_, n) => event(n)));
  const args = { agsRoot: ags, all: true, terminal: quietTerminal(), now };
  await assert.rejects(collectReports({ ...args, fault: () => { throw new Error("interrupted"); } }), /interrupted/);
  assert.equal(read(central(ags, "2026-10-001.jsonl")).length, 1000);
  await collectReports(args);
  await compactReports(args);
  assert.equal(fs.existsSync(central(ags, "2026-10-001.jsonl")), false);
  assert.equal(read(central(ags, "2026-10-002.jsonl")).length, 1);
  const compact = read(central(ags, "compact/2026-10-001.jsonl"));
  assert.equal(compact.reduce((count, group) => count + group.count, 0), 1000);
  assert.equal(compact.flatMap((group) => group.sourceEventIds).length, 1000);
  assert.ok(compact.every((group) => !("promptPreview" in group)));
  assert.deepEqual(compactRecords([event(2), event(4)]), compactRecords([event(4), event(2)]));
  await collectReports(args);
  assert.match(args.terminal.lines.at(-1), /Collected 0/);
});

test("compaction preserves raw input on conflict and recovers after verified-output interruption", async () => {
  const { ags } = fixture([event(1, "2026-09")]);
  const args = { agsRoot: ags, all: true, terminal: quietTerminal(), now };
  await collectReports(args);
  const raw = central(ags, "2026-09-001.jsonl");
  await assert.rejects(compactReports({ ...args, fault: () => { throw new Error("after verify"); } }), /after verify/);
  assert.ok(fs.existsSync(raw));
  await compactReports(args);
  assert.ok(!fs.existsSync(raw));
  writeFiles(ags, { "reports/usage/2026-09-001.jsonl": body([event(99, "2026-09")]) });
  await assert.rejects(compactReports(args), /Conflicting compact/);
  assert.ok(fs.existsSync(raw));
});

test("reviewed cleanup retains cutoff across interruption and prevents history resurrection", async () => {
  const { ags } = fixture([event(1, "2026-09"), event(2)]);
  await collectReports({ agsRoot: ags, all: true, terminal: quietTerminal(), now });
  const first = quietTerminal();
  const args = { agsRoot: ags, before: "2026-10", rerunArgs: ["report", "clean", "--before", "2026-10"], terminal: first, now, options: {} };
  assert.equal(await cleanReports(args), 3);
  assert.ok(fs.existsSync(central(ags, "2026-09-001.jsonl")));
  assert.equal(await cleanReports({ ...args, options: { plan: digestOf(first.text()), env: { AGS_TEST_FAULT: "report-clean:after-cutoff" } } }), 1);
  const retry = quietTerminal();
  await cleanReports({ ...args, terminal: retry });
  assert.equal(await cleanReports({ ...args, options: { plan: digestOf(retry.text()) } }), 0);
  assert.ok(!fs.existsSync(central(ags, "2026-09-001.jsonl")));
  await collectReports({ agsRoot: ags, all: true, terminal: first, now });
  assert.match(first.lines.at(-1), /Collected 0/);
  assert.ok(fs.existsSync(central(ags, "2026-10-001.jsonl")));
});
