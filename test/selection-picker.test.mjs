import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { setImmediate } from "node:timers/promises";
import { canPickItems, pickItems } from "../scripts/lib/selection.mjs";

function terminal({ rows = 12, columns = 80, raw = false, paused = true } = {}) {
  const input = new PassThrough(), output = new PassThrough();
  input.isTTY = output.isTTY = true;
  input.isRaw = raw;
  input.rawCalls = [];
  input.setRawMode = value => { input.isRaw = value; input.rawCalls.push(value); };
  if (paused) input.pause();
  output.rows = rows; output.columns = columns;
  let text = "";
  output.on("data", chunk => { text += chunk; });
  return { input, output, text: () => text, async press(value) { input.write(value); await setImmediate(); } };
}

const choices = Array.from({ length: 9 }, (_, index) => ({ value: `skill-${index}`, label: `skill-${index} (skill)`, description: `Description ${index}` }));
const options = { title: "Optional skills", choices };

function restored(tty, raw = false) {
  assert.equal(tty.input.isRaw, raw);
  assert.equal(tty.input.isPaused(), true);
  assert.equal(tty.input.listenerCount("keypress"), 0);
  assert.equal(tty.input.listenerCount("end"), 0);
  assert.equal(tty.output.listenerCount("resize"), 0);
  assert.ok(tty.text().endsWith("\x1b[?25h\x1b[?1049l"));
}

test("picker decodes native key sequences, toggles both ways and returns catalog order", async () => {
  const tty = terminal();
  const pending = pickItems(options, tty);
  await tty.press("\x1b[B \x1b[B \x1b[A \x1b[H ");
  await tty.press("\r");
  assert.deepEqual(await pending, ["skill-0", "skill-2"]);
  restored(tty);
});

test("picker scrolls, wraps navigation, selects all, clears and marks automatic companions", async () => {
  const tty = terminal();
  const pending = pickItems({ ...options, included: selected => selected.includes("skill-0") ? ["skill-1"] : [] }, tty);
  await tty.press(" ");
  assert.match(tty.text(), /\[\+\] skill-1/);
  await tty.press("\x1b[A");
  assert.match(tty.text(), /9\/9: Description 8/);
  await tty.press("\x1b[B");
  assert.match(tty.text(), /1\/9: Description 0/);
  await tty.press("a");
  assert.match(tty.text(), /9 explicit/);
  await tty.press("n\r");
  assert.deepEqual(await pending, []);
  restored(tty);
});

test("picker handles resize and descriptions cannot emit control sequences or wrap the screen", async () => {
  const tty = terminal();
  const pending = pickItems({ ...options, choices: [{ ...choices[0], description: "\x1b[31mDescription\x1b[0m\n\t" + "界".repeat(60), includes: ["skill-1"] }] }, tty);
  tty.output.columns = 40; tty.output.rows = 10;
  tty.output.emit("resize");
  assert.doesNotMatch(tty.text(), /\x1b\[31m|\x1b\[0m/);
  const frame = tty.text().split("\x1b[2J").at(-1);
  assert.ok(frame.split("\n").length <= 10);
  assert.match(frame, /\.\.\./);
  await tty.press("\r");
  await pending;
  restored(tty);
});

test("picker cancellation, EOF and read errors restore raw mode and terminal state", async () => {
  for (const mode of ["escape", "end", "error"]) {
    const tty = terminal({ raw: true });
    const pending = pickItems(options, tty);
    if (mode === "error") {
      const rejected = assert.rejects(pending, /read failed/);
      tty.input.emit("error", new Error("read failed"));
      await rejected;
    } else {
      if (mode === "escape") await tty.press("\x1b"); else tty.input.emit("end");
      assert.equal(await pending, null);
    }
    restored(tty, true);
  }
});

test("picker Ctrl+C and termination return interruption status and remove owned signal handlers", async () => {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const tty = terminal();
    const count = process.listenerCount(signal);
    const pending = pickItems(options, tty);
    const rejected = assert.rejects(pending, error => error.exitCode === (signal === "SIGINT" ? 130 : 143));
    if (signal === "SIGINT") await tty.press("\x03"); else process.emit(signal);
    await rejected;
    assert.equal(process.listenerCount(signal), count);
    restored(tty);
  }
});

test("picker rendering failure restores the terminal before rejecting", async () => {
  const tty = terminal();
  let calls = 0;
  const write = tty.output.write.bind(tty.output);
  tty.output.write = (...args) => { if (++calls === 2) throw new Error("render failed"); return write(...args); };
  await assert.rejects(pickItems(options, tty), /render failed/);
  restored(tty);
});

test("picker releases initially dormant stdin so cancelling before the first line prompt can exit", async () => {
  const tty = terminal({ paused: false });
  assert.equal(tty.input.readableFlowing, null);
  const pending = pickItems(options, tty);
  await tty.press("\x1b");
  assert.equal(await pending, null);
  restored(tty);
  const flowing = terminal({ paused: false });
  flowing.input.resume();
  await setImmediate();
  const next = pickItems(options, flowing);
  await flowing.press("\r");
  await next;
  assert.equal(flowing.input.readableFlowing, true);
  flowing.input.pause();
});

test("picker falls back for unsupported terminals and does not take terminal ownership for an empty list", async () => {
  const tty = terminal();
  assert.equal(canPickItems(tty.input, tty.output, "xterm-256color"), true);
  assert.equal(canPickItems(tty.input, tty.output, "dumb"), false);
  assert.equal(canPickItems(tty.input, { ...tty.output, columns: 30 }), false);
  assert.equal(canPickItems({ ...tty.input, isTTY: false }, tty.output), false);
  assert.equal(canPickItems({ ...tty.input, setRawMode: undefined }, tty.output), false);
  assert.deepEqual(await pickItems({ ...options, choices: [] }, tty), []);
  assert.equal(tty.text(), "");
  assert.deepEqual(tty.input.rawCalls, []);
});
