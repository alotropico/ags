import fs from "node:fs";
import path from "node:path";
import { AgsError, displayPath, git, normalizeText, samePath, sha256, shortHash } from "./util.mjs";

export const BLOCK_END = "<!-- AGS:END -->";
export const BLOCK_BUDGET = 40;
export const BLOCK_KEY = "AGENTS.md";
const BEGIN_PREFIX = "<!-- AGS:BEGIN";
const BEGIN_LINE = /^<!-- AGS:BEGIN (\S+) ([0-9a-f]{12}) -->$/;
const INDEX_LEAD = "Read a rule before work that matches its condition:";

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

export function buildIndex({ agsRules = [], hostRules = [] } = {}) {
  const index = [];
  const warnings = [];
  for (const rule of agsRules) index.push(indexLine(rule.id, rule.description ?? ""));
  for (const rule of [...hostRules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (typeof rule.description === "string" && rule.description.trim()) index.push(indexLine(rule.id, rule.description.trim()));
    else warnings.push(`Host rule .agents/rules/${rule.id}.md has no description; it is left out of the AGS block index.`);
  }
  return { index, warnings };
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
  return `<!-- AGS:BEGIN ${version} ${blockHash(body)} -->\n${body}\n${BLOCK_END}`;
}

export function blockLineCount(body) {
  return String(body).split("\n").length + 2;
}

export function budgetWarning(body) {
  const lines = blockLineCount(body);
  return lines > BLOCK_BUDGET ? `The AGS block has ${lines} lines, over the ${BLOCK_BUDGET}-line budget.` : null;
}

export function renderAgsBlock({ template, version, strongRules = [], index = [] }) {
  const body = renderBlockBody(template, { strongRules, index });
  return { body, text: renderBlock(version, body), warning: budgetWarning(body) };
}

function indexesOf(content, token) {
  const found = [];
  let from = 0;
  for (;;) {
    const index = content.indexOf(token, from);
    if (index < 0) return found;
    found.push(index);
    from = index + token.length;
  }
}

export function analyzeBlock(content) {
  if (content == null) return { kind: "missing", reason: "no AGENTS.md" };
  const begins = indexesOf(content, BEGIN_PREFIX);
  const ends = indexesOf(content, BLOCK_END);
  if (!begins.length && !ends.length) return { kind: "missing", reason: "no AGS markers in AGENTS.md" };
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0]) return { kind: "malformed" };
  const start = begins[0];
  const lineEnd = content.indexOf("\n", start);
  if (lineEnd < 0 || lineEnd > ends[0]) return { kind: "malformed" };
  const marker = BEGIN_LINE.exec(content.slice(start, lineEnd).replace(/\r$/, ""));
  if (!marker) return { kind: "malformed" };
  const inner = normalizeText(content.slice(lineEnd + 1, ends[0])).replace(/\n$/, "");
  const end = ends[0] + BLOCK_END.length;
  return {
    kind: blockHash(inner) === marker[2] ? "intact" : "edited",
    version: marker[1],
    hash: marker[2],
    body: inner,
    before: content.slice(0, start),
    after: content.slice(end),
  };
}

function withEol(text, eol) {
  return eol === "\n" ? text : text.replaceAll("\n", eol);
}

function eolOf(content) {
  return content?.includes("\r\n") ? "\r\n" : "\n";
}

export function insertBlock(existing, blockText) {
  if (existing == null || !existing.trim()) return `${blockText}\n`;
  const eol = eolOf(existing);
  return `${withEol(blockText, eol)}${eol}${eol}${existing.replace(/^(\r?\n)+/, "")}`;
}

export function replaceBlock(existing, analysis, blockText) {
  return `${analysis.before}${withEol(blockText, eolOf(existing))}${analysis.after}`;
}

export function placeBlock(existing, blockText) {
  const analysis = analyzeBlock(existing);
  if (analysis.kind === "malformed") throw new AgsError("AGENTS.md has unbalanced or repeated AGS markers. Fix them by hand, then rerun.");
  return analysis.kind === "missing" ? insertBlock(existing, blockText) : replaceBlock(existing, analysis, blockText);
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
  const eol = eolOf(content);
  return `${[...kept, ...EXCLUDE_BLOCK.split("\n")].join(eol)}${eol}`;
}

export function inspectExclude(hostRoot) {
  const file = excludeFile(hostRoot);
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const state = analyzeExclude(content);
  const ignored = tmpIgnored(hostRoot);
  let need = null;
  if (!ignored && state.kind === "absent") need = "add";
  else if (state.kind === "edited") need = "restore";
  return { file, content, state: state.kind, ignored, need, next: need ? renderExclude(content) : null };
}
