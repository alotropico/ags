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

export function selectionHeading({ heading, title }, columns = 80) {
  if (!heading) return [title];
  const width = Math.max(8, columns - 4);
  const labels = [];
  let label = "";
  for (const word of title.split(/\s+/)) {
    if (label && label.length + word.length + 1 > width) { labels.push(label); label = ""; }
    label += `${label ? " " : ""}${word}`;
  }
  if (label) labels.push(label);
  return [heading, "=".repeat(Math.min(width, heading.length)), ...labels, "-".repeat(Math.min(width, Math.max(...labels.map(value => value.length)))), ""];
}

// Windows console handles can become invalid when leaving the alternate screen.
// Redraw in place there; other terminals use a temporary alternate screen.
export function pickItems({ heading, title, choices, initial = [], included = () => [] }, { input = process.stdin, output = process.stdout } = {}) {
  if (!choices.length) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const selected = new Set(choices.filter(choice => initial.includes(choice.value) || choice.locked).map(choice => choice.value));
    const wasRaw = Boolean(input.isRaw), wasFlowing = input.readableFlowing === true;
    const alternateScreen = process.platform !== "win32";
    let cursor = 0, start = 0, done = false, renderedRows = 0, notice = "";
    const clearFrame = () => {
      const up = Math.min(renderedRows, Math.max(0, (output.rows ?? 24) - 1));
      return `\r${up ? `\x1b[${up}A` : ""}\x1b[J`;
    };
    const values = () => choices.filter(choice => selected.has(choice.value)).map(choice => choice.value);
    const draw = () => {
      const width = Math.max(4, (output.columns ?? 80) - 1);
      const rows = output.rows ?? 24;
      const compact = Boolean(heading) && rows < 14;
      const header = compact ? [heading, title, ""] : selectionHeading({ heading, title }, output.columns ?? 80);
      const spacer = !heading && rows >= 14 ? [""] : [];
      const tailSize = compact ? (rows >= 12 ? 2 : 1) : 3;
      const size = Math.max(1, rows - header.length - 3 - spacer.length - 2 - tailSize - 1);
      if (cursor >= 0 && cursor < start) start = cursor;
      if (cursor >= start + size) start = cursor - size + 1;
      start = Math.min(start, Math.max(0, choices.length - size));
      const automatic = new Set(included(values()));
      const focus = choices[cursor];
      const checked = choice => selected.has(choice.value) || automatic.has(choice.value) || choice.locked;
      const detail = notice || (focus ? focus.reason || (focus.includes?.length ? `Includes: ${focus.includes.join(", ")}` : focus.description) : "Return to an item to continue to the next step.");
      const lines = [...header, "[↑ / ↓] Up / Down", "[Space] Select / Deselect", "[Esc / Ctrl+C] Stop",
        ...spacer,
        `${cursor === -2 ? ">" : " "} Select All`, `${cursor === -1 ? ">" : " "} Select None`,
        ...choices.slice(start, start + size).map((choice, index) => `${index + start === cursor ? ">" : " "} [${checked(choice) ? "X" : " "}] ${choice.label} - ${choice.summary || choice.description || "No description available."}${choice.locked ? " (required)" : ""}`),
        ...(!compact || rows >= 12 ? [`${start + 1}-${Math.min(start + size, choices.length)} of ${choices.length}; ${choices.filter(checked).length} selected`] : []),
        ...(!compact ? [detail || ""] : []), cursor < 0 ? "[Enter / Space] Apply Action" : "[Enter] Next",
      ];
      output.write(`${alternateScreen ? "\x1b[H\x1b[2J" : clearFrame()}${lines.map(value => line(value, width)).join("\n")}`);
      renderedRows = lines.length - 1;
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
      try { output.write(alternateScreen ? "\x1b[?25h\x1b[?1049l" : `${clearFrame()}\x1b[?25h`); }
      catch (cause) { error ||= cause; }
      if (error) reject(error); else resolve(result);
    };
    const keypress = (text, key = {}) => {
      if (done) return;
      try {
        if (key.name === "escape") return finish();
        if (key.ctrl && key.name === "c") return interrupted();
        if (key.ctrl && key.name === "d") return finish();
        const enter = key.name === "return" || key.name === "enter";
        if (enter && cursor >= 0) return finish(null, values());
        notice = "";
        if (key.name === "up") cursor = (cursor + choices.length + 3) % (choices.length + 2) - 2;
        else if (key.name === "down") cursor = (cursor + 3) % (choices.length + 2) - 2;
        else if (key.name === "home") cursor = -2;
        else if (key.name === "end") cursor = choices.length - 1;
        else if (key.name === "pageup") cursor = Math.max(-2, cursor - Math.max(1, (output.rows ?? 24) - 11));
        else if (key.name === "pagedown") cursor = Math.min(choices.length - 1, cursor + Math.max(1, (output.rows ?? 24) - 11));
        else if (!key.ctrl && !key.meta && (text === " " || key.name === "space" || enter)) {
          if (cursor === -2) for (const choice of choices) selected.add(choice.value);
          else if (cursor === -1) { selected.clear(); for (const choice of choices) if (choice.locked) selected.add(choice.value); }
          else {
            const choice = choices[cursor];
            if (choice.locked) notice = "Required: this item cannot be deselected.";
            else if (new Set(included(values())).has(choice.value)) notice = "Required by a selected parent. Deselect the parent first.";
            else if (selected.has(choice.value)) selected.delete(choice.value);
            else selected.add(choice.value);
          }
        }
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
      output.write(`${alternateScreen ? "\x1b[?1049h" : ""}\x1b[?25l`);
      draw();
      input.resume();
    } catch (error) { finish(error); }
  });
}
