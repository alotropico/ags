import path from "node:path";
import { catalogById, includedSkillIds, skillAbs } from "./catalog.mjs";
import { displayPath, readText } from "./util.mjs";

export const BEGIN = "<!-- AGS:BEGIN -->";
export const END = "<!-- AGS:END -->";

export function agentsBlock(root) {
  return readText(path.join(root, "templates", "agents-block.md")).replace(/\s+$/, "");
}

export function legacyClaudeText(root) {
  return readText(path.join(root, "templates", "claude-pointer.md")).replace(/\s+$/, "");
}

export const CLAUDE_MODES = ["skip", "block", "override"];

export function claudeModeOf(value) {
  if (value === true) return "block";
  if (value === false) return "skip";
  if (CLAUDE_MODES.includes(value)) return value;
  return null;
}

export function claudeBlock(root) {
  return `${BEGIN}\n${legacyClaudeText(root)}\n${END}`;
}

export function claudeOverrideText(root) {
  return `${legacyClaudeText(root)}\n`;
}

export function claudePointer(root) {
  return `${claudeBlock(root)}\n`;
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

export function planClaudeWrite(existing, mode, { block, override }) {
  const resolved = claudeModeOf(mode);
  if (resolved === "skip") return planClaudeSkip(existing, { block, override });
  if (resolved === "block") return planClaudeBlock(existing, block, override);
  if (resolved === "override") return planClaudeOverride(existing, override);
  throw new Error(`Unknown Claude mode: ${mode}`);
}

function planClaudeBlock(existing, block, override) {
  const normalized = block.replace(/\s+$/, "");
  const state = analyzeMarkers(existing);
  if (state.kind === "absent") return { action: "insert block", text: `${normalized}\n` };
  if (state.kind === "malformed") {
    return {
      action: "leave",
      warning: "CLAUDE.md has malformed AGS markers. Repair the file manually or choose override. The file was left unchanged.",
    };
  }
  if (existing === override) return { action: "insert block", text: `${normalized}\n` };
  if (state.kind === "unmarked") {
    if (!existing.trim()) return { action: "insert block", text: `${normalized}\n` };
    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    return { action: "insert block", text: `${existing}${separator}${normalized}\n` };
  }
  if (state.block === normalized) return { action: "leave", text: existing };
  return { action: "insert block", text: `${state.before}${normalized}${state.after}` };
}

function planClaudeSkip(existing, { block, override }) {
  if (existing == null) return { action: "leave" };
  if (existing === override) return { action: "delete exact generated file", text: null };
  const state = analyzeMarkers(existing);
  if (state.kind === "malformed") {
    return { action: "leave", warning: "CLAUDE.md has malformed AGS markers. Left unchanged." };
  }
  if (state.kind !== "block") return { action: "leave" };
  const normalized = block.replace(/\s+$/, "");
  if (state.block !== normalized) {
    return { action: "leave", warning: "CLAUDE.md block is not an exact AGS block. Left unchanged." };
  }
  const next = `${state.before}${state.after}`;
  if (!next.trim()) return { action: "delete exact generated file", text: null };
  return { action: "remove block", text: next };
}

function planClaudeOverride(existing, override) {
  if (existing == null) return { action: "replace file", text: override };
  if (existing === override) return { action: "leave", text: existing };
  return { action: "quarantine", text: override };
}

export function planClaudeRemoval(existing, mode, { block, override }) {
  const resolved = claudeModeOf(mode);
  if (existing == null) return { action: "leave" };
  if (resolved === "override") {
    if (existing === override) return { action: "leave", text: existing };
    return { action: "quarantine" };
  }
  const state = analyzeMarkers(existing);
  if (state.kind === "malformed") {
    return { action: "leave", warning: "CLAUDE.md has unmatched AGS markers. Left unchanged." };
  }
  if (resolved === "skip" && existing === override) return { action: "delete exact generated file", text: null };
  if (state.kind !== "block") return { action: "leave" };
  const normalized = block.replace(/\s+$/, "");
  if (resolved === "block" && state.block === normalized) return { action: "leave", text: existing };
  if (state.block !== normalized && resolved === "skip") {
    return { action: "leave", warning: "CLAUDE.md block is not an exact AGS block. Left unchanged." };
  }
  const next = `${state.before}${state.after}`;
  if (!next.trim()) return { action: "remove block", text: null };
  return { action: "remove block", text: next };
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
  return template
    .replaceAll("{{canonicalRoot}}", shown)
    .replace("{{rules}}", rules)
    .replace("{{skills}}", skills)
    .replace("{{localExceptions}}", localExceptions)
    .replace("{{operations}}", operationsBlock(settings))
    .replace(/\s+$/, "\n");
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
  const matches = existing.match(pattern);
  if (!matches) {
    const separator = existing.endsWith("\n") ? "\n" : "\n\n";
    return `${existing}${separator}${normalized}\n`;
  }
  let seen = false;
  const replaced = existing.replace(pattern, () => {
    if (seen) return "";
    seen = true;
    return normalized;
  });
  return replaced.replace(/\n{3,}/g, "\n\n");
}

export function upsertClaude(existing, block, legacy) {
  const normalized = block.replace(/\s+$/, "");
  if (existing == null || existing.trim() === "") return `${normalized}\n`;
  if (existing.replace(/\s+$/, "").trim() === legacy.replace(/\s+$/, "").trim()) return `${normalized}\n`;
  const begins = existing.split(BEGIN).length - 1;
  const ends = existing.split(END).length - 1;
  if (begins === 0) return upsertMarkedBlock(existing, block);
  if (begins !== ends) {
    const index = existing.indexOf(BEGIN);
    const prefix = existing.slice(0, index).replace(/\s+$/, "");
    return prefix ? `${prefix}\n\n${normalized}\n` : `${normalized}\n`;
  }
  return upsertMarkedBlock(existing, block);
}

export function removeManagedClaude(existing, legacy) {
  if (existing == null) return null;
  const trimmed = existing.replace(/\s+$/, "").trim();
  if (trimmed === legacy.replace(/\s+$/, "").trim()) return null;
  if (!existing.includes(BEGIN)) return existing;
  const pattern = /<!-- AGS:BEGIN -->[\s\S]*?<!-- AGS:END -->/g;
  let next = existing.replace(pattern, "");
  next = next.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
  if (!next.trim()) return null;
  return next.endsWith("\n") ? next : `${next}\n`;
}

export function blockIntact(content, block) {
  const pattern = /<!-- AGS:BEGIN -->[\s\S]*?<!-- AGS:END -->/g;
  const matches = content?.match(pattern);
  if (!matches || matches.length !== 1) return false;
  return matches[0] === block.replace(/\s+$/, "");
}

export function classifyClaude(content, { mode, enabled, block, override, legacy }) {
  const resolved = claudeModeOf(mode ?? enabled);
  const generated = override || (legacy ? `${legacy.replace(/\s+$/, "")}\n` : null);
  const normalized = block?.replace(/\s+$/, "");
  const state = analyzeMarkers(content);
  if (resolved === "skip") {
    if (content == null) return { state: "clean" };
    if (generated && content === generated) {
      return { state: "override-present", issue: "CLAUDE.md generated override file is present while mode is skip" };
    }
    if (state.kind === "malformed") return { state: "malformed", warning: "CLAUDE.md markers are malformed" };
    if (state.kind === "block" && state.block === normalized) {
      return { state: "block-present", issue: "CLAUDE.md managed block is present while mode is skip" };
    }
    if (state.kind === "block") return { state: "inexact", warning: "CLAUDE.md block is not an exact AGS block" };
    return { state: "clean" };
  }
  if (resolved === "override") {
    if (content == null) return { state: "missing", issue: "CLAUDE.md override file is missing" };
    if (generated && content === generated) return { state: "clean" };
    return { state: "differs", issue: "CLAUDE.md override file differs" };
  }
  if (content == null || state.kind === "absent" || state.kind === "unmarked") {
    return { state: "missing", issue: "CLAUDE.md block is missing" };
  }
  if (state.kind === "malformed") return { state: "malformed", warning: "CLAUDE.md markers are malformed" };
  if (state.block === normalized) return { state: "clean" };
  return { state: "differs", issue: "CLAUDE.md block differs" };
}
