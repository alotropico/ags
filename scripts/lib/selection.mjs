import { emitKeypressEvents } from "node:readline";
import { stripVTControlCharacters } from "node:util";
import { AgsError } from "./util.mjs";

// Keep release descriptions on one line and outside the terminal control channel.
function line(value, width) {
  const text = stripVTControlCharacters(String(value)).replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
  let result = "", used = 0;
  for (const character of text) {
    const size = character.codePointAt(0) > 0xff ? 2 : 1; // Conservative width for wide glyphs.
    if (used + size > width - 3) return `${result}...`;
    result += character; used += size;
  }
  return result;
}

export function canPickItems(input = process.stdin, output = process.stdout, term = process.env.TERM) {
  return Boolean(input.isTTY && output.isTTY && typeof input.setRawMode === "function"
    && term !== "dumb" && (output.columns ?? 80) >= 40 && (output.rows ?? 24) >= 10);
}

// Temporary alternate screen preserves the earlier transcript across redraws/resizes.
export function pickItems({ title, choices, included = () => [] }, { input = process.stdin, output = process.stdout } = {}) {
  if (!choices.length) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const selected = new Set();
    const wasRaw = Boolean(input.isRaw), wasFlowing = input.readableFlowing === true;
    let cursor = 0, start = 0, done = false;
    const values = () => choices.filter(choice => selected.has(choice.value)).map(choice => choice.value);
    const draw = () => {
      const width = Math.max(4, (output.columns ?? 80) - 1);
      const size = Math.max(1, (output.rows ?? 24) - 8);
      if (cursor < start) start = cursor;
      if (cursor >= start + size) start = cursor - size + 1;
      start = Math.min(start, Math.max(0, choices.length - size));
      const automatic = new Set(included(values()));
      const focus = choices[cursor];
      const lines = [title, "Arrows: move  Space: toggle  Enter: next", "A: all  N: clear  Esc/Ctrl+C: cancel",
        `${selected.size} explicit [x]; [+] automatic`, "",
        ...choices.slice(start, start + size).map((choice, index) => `${index + start === cursor ? ">" : " "} [${selected.has(choice.value) ? "x" : automatic.has(choice.value) ? "+" : " "}] ${choice.label}`),
        "", `${cursor + 1}/${choices.length}: ${focus.description || "No description available."}`,
        ...(focus.includes?.length ? [`Includes: ${focus.includes.join(", ")}`] : []),
      ];
      output.write(`\x1b[H\x1b[2J${lines.map(value => line(value, width)).join("\n")}`);
    };
    const finish = (error, result = null) => {
      if (done) return;
      done = true;
      input.removeListener("keypress", keypress);
      input.removeListener("end", ended);
      input.removeListener("error", failed);
      output.removeListener("resize", resized);
      output.removeListener("error", failed);
      process.removeListener("SIGINT", interrupted);
      process.removeListener("SIGTERM", terminated);
      try { input.setRawMode(wasRaw); if (!wasFlowing) input.pause(); }
      catch (cause) { error ||= cause; }
      try { output.write("\x1b[?25h\x1b[?1049l"); }
      catch (cause) { error ||= cause; }
      if (error) reject(error); else resolve(result);
    };
    const keypress = (text, key = {}) => {
      if (done) return;
      try {
        if (key.name === "escape") return finish();
        if (key.ctrl && key.name === "c") return interrupted();
        if (key.ctrl && key.name === "d") return finish();
        if (key.name === "return" || key.name === "enter") return finish(null, values());
        if (key.name === "up") cursor = (cursor + choices.length - 1) % choices.length;
        else if (key.name === "down") cursor = (cursor + 1) % choices.length;
        else if (key.name === "home") cursor = 0;
        else if (key.name === "end") cursor = choices.length - 1;
        else if (key.name === "pageup") cursor = Math.max(0, cursor - Math.max(1, (output.rows ?? 24) - 8));
        else if (key.name === "pagedown") cursor = Math.min(choices.length - 1, cursor + Math.max(1, (output.rows ?? 24) - 8));
        else if (!key.ctrl && !key.meta && (text === " " || key.name === "space")) {
          const value = choices[cursor].value;
          if (selected.has(value)) selected.delete(value); else selected.add(value);
        } else if (!key.ctrl && !key.meta && text?.toLowerCase() === "a") {
          for (const choice of choices) selected.add(choice.value);
        } else if (!key.ctrl && !key.meta && text?.toLowerCase() === "n") selected.clear();
        else return;
        draw();
      } catch (error) { finish(error); }
    };
    const ended = () => finish();
    const failed = error => finish(error);
    const resized = () => { try { draw(); } catch (error) { finish(error); } };
    const interrupted = () => finish(new AgsError("Selection cancelled. Nothing was written.", { exitCode: 130 }));
    const terminated = () => finish(new AgsError("Selection terminated. Nothing was written.", { exitCode: 143 }));
    try {
      emitKeypressEvents(input);
      input.on("keypress", keypress);
      input.once("end", ended);
      input.once("error", failed);
      output.on("resize", resized);
      output.once("error", failed);
      process.once("SIGINT", interrupted);
      process.once("SIGTERM", terminated);
      input.setRawMode(true);
      output.write("\x1b[?1049h\x1b[?25l");
      draw();
      input.resume();
    } catch (error) { finish(error); }
  });
}
