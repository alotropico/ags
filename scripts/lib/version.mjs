import fs from "node:fs";
import path from "node:path";
import { AgsError, normalizeText, writeAtomic } from "./util.mjs";

export const UNRELEASED = "## Unreleased";

export function changelogPath(agsRoot) {
  return path.join(agsRoot, "CHANGELOG.md");
}

export function readChangelog(agsRoot) {
  const file = changelogPath(agsRoot);
  if (!fs.existsSync(file)) throw new AgsError("CHANGELOG.md is missing at the AGS root.");
  return normalizeText(fs.readFileSync(file, "utf8"));
}

export function unreleasedRange(lines) {
  const start = lines.findIndex((line) => line.trim() === UNRELEASED);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

export function unreleasedNotes(text) {
  const lines = normalizeText(text).split("\n");
  const range = unreleasedRange(lines);
  if (!range) throw new AgsError("CHANGELOG.md has no ## Unreleased section.");
  return lines.slice(range.start + 1, range.end).filter((line) => /^- /.test(line)).map((line) => line.slice(2));
}

export function withNote(text, note) {
  const lines = normalizeText(text).split("\n");
  const range = unreleasedRange(lines);
  if (!range) throw new AgsError("CHANGELOG.md has no ## Unreleased section.");
  const bullet = `- ${note}`;
  if (lines.slice(range.start + 1, range.end).includes(bullet)) return null;
  let at = range.end;
  while (at > range.start + 1 && lines[at - 1].trim() === "") at -= 1;
  const next = [...lines.slice(0, at), bullet, ...lines.slice(at)];
  if (range.end < lines.length && next[at + 1] !== "") next.splice(at + 1, 0, "");
  return next.join("\n");
}

export function appendUnreleasedNote(agsRoot, note) {
  const next = withNote(readChangelog(agsRoot), note);
  if (next == null) return false;
  writeAtomic(changelogPath(agsRoot), next);
  return true;
}
