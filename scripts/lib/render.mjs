import fs from "node:fs";
import path from "node:path";
import { AgsError, displayPath, git, normalizeText, readText, samePath, sha256, shortHash } from "./util.mjs";

export const BEGIN = "<!-- AGS:BEGIN -->";
export const END = "<!-- AGS:END -->";
export const BLOCK_BUDGET = 40;
const INDEX_LEAD = "Read a rule before work that matches its condition:";

export function agentsBlock(root) {
  return readText(path.join(root, "templates", "agents-block.md")).replace(/\s+$/, "");
}

function literalReplace(template, values) {
  let text = template;
  for (const [token, value] of Object.entries(values)) {
    text = text.replaceAll(token, () => value);
  }
  return text;
}

export function indexLine(id, description) {
  return `- \`.agents/rules/${id}.md\`: ${description}`;
}

export function renderBlockBody(template, { strongRules = [], index = [] } = {}) {
  let lines = String(template).replaceAll("\r\n", "\n").replace(/\s+$/, "").split("\n");
  if (!index.length) {
    const lead = lines.findIndex((line) => line.trim() === INDEX_LEAD);
    const slot = lines.findIndex((line) => line.includes("{{ruleIndex}}"));
    if (lead >= 0 && slot >= lead) lines.splice(lead, slot - lead + 1);
    else if (slot >= 0) lines.splice(slot, 1);
  }
  const body = literalReplace(lines.join("\n"), {
    "{{strongRules}}": strongRules.map((text) => String(text).replaceAll("\r\n", "\n").trim()).filter(Boolean).join("\n"),
    "{{ruleIndex}}": index.join("\n"),
  });
  return body.replace(/\n{3,}/g, "\n\n").replace(/^\n+|\s+$/g, "");
}

export function blockHash(body) {
  return shortHash(sha256(normalizeText(body)));
}

export function renderBlock(version, body) {
  return `<!-- AGS:BEGIN ${version} ${blockHash(body)} -->\n${body}\n${END}`;
}

export function blockLineCount(body) {
  return String(body).split("\n").length + 2;
}

export function analyzeMarkers(content) {
  if (content == null) return { kind: "absent" };
  const begins = indexesOf(content, BEGIN);
  const ends = indexesOf(content, END);
  if (begins.length === 0 && ends.length === 0) return { kind: "unmarked" };
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0]) return { kind: "malformed" };
  const start = begins[0];
  const end = ends[0] + END.length;
  return {
    kind: "block",
    before: content.slice(0, start),
    block: content.slice(start, end),
    after: content.slice(end),
  };
}

function indexesOf(content, token) {
  const found = [];
  let from = 0;
  while (from <= content.length) {
    const index = content.indexOf(token, from);
    if (index < 0) break;
    found.push(index);
    from = index + token.length;
  }
  return found;
}

export function planAgentsBlockRemoval(existing, block) {
  if (existing == null) return { action: "leave" };
  const state = analyzeMarkers(existing);
  if (state.kind === "malformed") {
    return { action: "leave", warning: "AGENTS.md has unmatched AGS markers. Left unchanged." };
  }
  if (state.kind !== "block") return { action: "leave" };
  const normalized = block.replace(/\s+$/, "");
  if (state.block === normalized) return { action: "leave", text: existing };
  const next = `${state.before}${state.after}`;
  if (!next.trim()) return { action: "remove block", text: null };
  return { action: "remove block", text: next };
}

export function upsertAgentsBlock(existing, block) {
  return upsertMarkedBlock(existing, block);
}

export function upsertMarkedBlock(existing, block) {
  const normalized = block.replace(/\s+$/, "");
  if (existing == null) return `${normalized}\n`;
  const pattern = /<!-- AGS:BEGIN -->[\s\S]*?<!-- AGS:END -->/g;
  const matches = [...existing.matchAll(pattern)];
  if (!matches.length) {
    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    return `${existing}${separator}${normalized}\n`;
  }
  const pieces = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    pieces.push(existing.slice(cursor, match.index));
    if (index === 0) pieces.push(normalized);
    cursor = match.index + match[0].length;
  });
  pieces.push(existing.slice(cursor));
  return pieces.reduce((left, right) => seam(left, right));
}

function seam(left, right) {
  const leftNewlines = left.match(/\n*$/)[0];
  const rightNewlines = right.match(/^\n*/)[0];
  const count = leftNewlines.length + rightNewlines.length;
  const newlines = count >= 3 ? "\n\n" : "\n".repeat(count);
  return `${left.slice(0, left.length - leftNewlines.length)}${newlines}${right.slice(rightNewlines.length)}`;
}

export const EXCLUDE_KEY = ".git/info/exclude";
export const EXCLUDE_BEGIN = "# AGS:BEGIN";
export const EXCLUDE_END = "# AGS:END";
export const EXCLUDE_BODY = "/.tmp/";
export const EXCLUDE_BLOCK = `${EXCLUDE_BEGIN}\n${EXCLUDE_BODY}\n${EXCLUDE_END}`;

export function excludeFile(hostRoot) {
  const gitPath = git(["rev-parse", "--git-path", "info/exclude"], hostRoot).stdout.trim();
  const resolved = path.resolve(hostRoot, gitPath);
  const expected = path.join(hostRoot, ".git", "info", "exclude");
  if (!samePath(resolved, expected)) {
    throw new AgsError(`The git exclude file of ${displayPath(hostRoot)} resolves to ${displayPath(resolved)}, not .git/info/exclude at the host root. Hosts are main worktrees.`);
  }
  return expected;
}

export function tmpIgnored(hostRoot) {
  return git(["check-ignore", "-q", "--", ".tmp/"], hostRoot, { allow: [0, 1] }).status === 0;
}

function excludeLines(content) {
  return normalizeText(content).split("\n");
}

export function analyzeExclude(content) {
  if (content == null) return { kind: "absent" };
  const lines = excludeLines(content);
  const begins = lines.flatMap((line, index) => (line.trim() === EXCLUDE_BEGIN ? [index] : []));
  const ends = lines.flatMap((line, index) => (line.trim() === EXCLUDE_END ? [index] : []));
  if (!begins.length && !ends.length) return { kind: "absent" };
  if (begins.length === 1 && ends.length === 1 && begins[0] < ends[0]) {
    const body = lines.slice(begins[0] + 1, ends[0]);
    if (body.length === 1 && body[0].trim() === EXCLUDE_BODY) return { kind: "intact" };
  }
  return { kind: "edited" };
}

export function renderExclude(content) {
  const kept = [];
  const lines = content == null ? [] : excludeLines(content);
  if (lines.length && lines.at(-1) === "") lines.pop();
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === EXCLUDE_BEGIN) {
      const end = lines.findIndex((line, at) => at > index && line.trim() === EXCLUDE_END);
      if (end > index) index = end;
      continue;
    }
    if (trimmed !== EXCLUDE_END) kept.push(lines[index]);
  }
  const eol = content?.includes("\r\n") ? "\r\n" : "\n";
  return `${[...kept, ...EXCLUDE_BLOCK.split("\n")].join(eol)}${eol}`;
}

export function inspectExclude(hostRoot) {
  const file = excludeFile(hostRoot);
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const state = analyzeExclude(content);
  const ignored = tmpIgnored(hostRoot);
  let need = null;
  if (!ignored && state.kind === "absent") need = "add";
  else if (!ignored && state.kind === "edited") need = "restore";
  return { file, content, state: state.kind, ignored, need, next: need ? renderExclude(content) : null };
}

export function blockIntact(content, block) {
  const pattern = /<!-- AGS:BEGIN -->[\s\S]*?<!-- AGS:END -->/g;
  const matches = content?.match(pattern);
  if (!matches || matches.length !== 1) return false;
  return matches[0] === block.replace(/\s+$/, "");
}
