import path from "node:path";
import { catalogById, includedSkillIds, skillAbs } from "./catalog.mjs";
import { displayPath, readText } from "./util.mjs";

export const BEGIN = "<!-- AGS:BEGIN -->";
export const END = "<!-- AGS:END -->";

export function agentsBlock(root) {
  return readText(path.join(root, "templates", "agents-block.md")).replace(/\s+$/, "");
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

export function renderHostEntry(root, catalog, settings) {
  const template = readText(path.join(root, "templates", "host-ags.md"));
  const shown = displayPath(root);
  const byId = catalogById(catalog);
  const rules = settings.rules.enabled.length
    ? settings.rules.enabled.map((id) => ruleLine(root, byId.get(id))).join("\n")
    : "- none";
  const skills = settings.skills.enabled.length
    ? settings.skills.enabled.map((id) => skillLine(root, catalog, byId.get(id))).join("\n")
    : "- none";
  const localExceptions = localExceptionBlock(settings);
  return literalReplace(template, {
    "{{canonicalRoot}}": shown,
    "{{rules}}": rules,
    "{{skills}}": skills,
    "{{localExceptions}}": localExceptions,
    "{{operations}}": operationsBlock(settings),
  }).replace(/\s+$/, "\n");
}

function literalReplace(template, values) {
  let text = template;
  for (const [token, value] of Object.entries(values)) {
    text = text.replaceAll(token, () => value);
  }
  return text;
}

function localExceptionBlock(settings) {
  const list = settings.skills?.localExceptions || [];
  if (!list.length) return "- none";
  return list.map((item) => `- \`${item.id}\` — host-local exception\n  \`${item.path}\``).join("\n");
}

function operationsBlock(settings) {
  const branch = settings.git?.mainBranch;
  const checks = settings.checks || {};
  const line = (name) => (checks[name] ? `- checks.${name}: \`${checks[name]}\`` : `- checks.${name}: not configured`);
  return [
    branch ? `- git.mainBranch: \`${branch}\`` : "- git.mainBranch: not configured",
    line("type"),
    line("lint"),
    line("prettier"),
  ].join("\n");
}

function ruleLine(root, entry) {
  const file = displayPath(path.join(root, ...entry.path.split("/")));
  return `- \`${entry.id}\` — ${entry.description}\n  \`${file}\``;
}

function skillLine(root, catalog, entry) {
  const file = displayPath(skillAbs(root, entry));
  const lines = [`- \`${entry.id}\` — ${entry.description}`, `  \`${file}\``];
  for (const id of includedSkillIds(catalog, [entry.id])) {
    const child = catalogById(catalog).get(id);
    if (!child) continue;
    lines.push(`  - includes \`${child.id}\` \`${displayPath(skillAbs(root, child))}\``);
  }
  return lines.join("\n");
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

export function blockIntact(content, block) {
  const pattern = /<!-- AGS:BEGIN -->[\s\S]*?<!-- AGS:END -->/g;
  const matches = content?.match(pattern);
  if (!matches || matches.length !== 1) return false;
  return matches[0] === block.replace(/\s+$/, "");
}
