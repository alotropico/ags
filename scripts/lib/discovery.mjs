import fs from "node:fs";
import path from "node:path";
import { git, posix } from "./util.mjs";

export const SETUP_FILES = [
  "AGENTS.md",
  "AGENTS.override.md",
  "CLAUDE.md",
  "CLAUDE.local.md",
  "GEMINI.md",
  ".cursorrules",
  ".windsurfrules",
  ".github/copilot-instructions.md",
  ".clinerules",
];

export const SETUP_FOLDERS = [
  ".agents",
  ".cursor/rules",
  ".cursor/skills",
  ".cursor/commands",
  ".claude/skills",
  ".claude/commands",
  ".claude/agents",
  ".codex/skills",
  ".codex/agents",
  ".github/instructions",
  ".github/prompts",
  ".github/agents",
  ".github/chatmodes",
  ".windsurf/rules",
  ".clinerules",
];

export const TOOL_CONFIGS = [
  ".cursor/mcp.json",
  ".cursor/hooks.json",
  ".cursor/environment.json",
  ".cursor/worktrees.json",
  ".cursorignore",
  ".cursorindexingignore",
  ".mcp.json",
  ".vscode/mcp.json",
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".codex/config.toml",
  ".gemini/settings.json",
];

export const SKIPPED_FOLDERS = [".git", ".tmp", "node_modules"];
export const HARNESS_IGNORE_FILES = [".cursorignore", ".cursorindexingignore"];

function lstat(abs) {
  try {
    return fs.lstatSync(abs);
  } catch {
    return null;
  }
}

function filesBelow(abs, rel) {
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const childAbs = path.join(abs, entry.name);
    const childRel = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesBelow(childAbs, childRel));
    else if (entry.isFile()) out.push(childRel);
  }
  return out;
}

function join(base, name) {
  return base ? `${base}/${name}` : name;
}

function setupAt(root, base) {
  const entries = [];
  const claimed = new Set();
  for (const name of SETUP_FOLDERS) {
    const rel = join(base, name);
    const stat = lstat(path.join(root, ...rel.split("/")));
    if (!stat?.isDirectory()) continue;
    entries.push({ path: rel, type: "folder", files: filesBelow(path.join(root, ...rel.split("/")), rel).sort() });
    claimed.add(rel);
  }
  for (const name of SETUP_FILES) {
    const rel = join(base, name);
    if (claimed.has(rel)) continue;
    const stat = lstat(path.join(root, ...rel.split("/")));
    if (stat?.isFile()) entries.push({ path: rel, type: "file", files: [rel] });
  }
  return entries;
}

function isNestedRepo(abs) {
  return lstat(path.join(abs, ".git")) != null;
}

export function walkSetup(root) {
  const rootEntries = setupAt(root, "");
  const nested = [];
  const claimed = new Set(rootEntries.filter((entry) => entry.type === "folder").map((entry) => entry.path));
  const visit = (abs, rel) => {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIPPED_FOLDERS.includes(entry.name)) continue;
      const childRel = join(rel, entry.name);
      const childAbs = path.join(abs, entry.name);
      if (claimed.has(childRel) || isNestedRepo(childAbs)) continue;
      const found = setupAt(root, childRel);
      for (const item of found) {
        nested.push(item);
        if (item.type === "folder") claimed.add(item.path);
      }
      visit(childAbs, childRel);
    }
  };
  visit(root, "");
  const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { root: rootEntries.sort(byPath), nested: nested.sort(byPath) };
}

export function toolConfigs(root) {
  return TOOL_CONFIGS.filter((rel) => lstat(path.join(root, ...rel.split("/")))?.isFile());
}

const TMP_ENTRY = /^\/?\.tmp(\/(\*\*?)?)?$/;
const UNANCHORED_TMP_ENTRY = /^(\*\*\/)?tmp(\/(\*\*?)?)?$/;

export function harnessTmpEntries(root) {
  const found = [];
  for (const rel of HARNESS_IGNORE_FILES) {
    const abs = path.join(root, rel);
    if (!lstat(abs)?.isFile()) continue;
    fs.readFileSync(abs, "utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        const entry = line.trim();
        if (TMP_ENTRY.test(entry)) {
          found.push(`${rel} line ${index + 1} lists .tmp/, which blocks agent reads of .tmp/. AGS never edits ${rel}; remove the line by hand.`);
        } else if (UNANCHORED_TMP_ENTRY.test(entry)) {
          found.push(`${rel} line ${index + 1} lists ${entry}, which Cursor also applies to .tmp/ and so blocks agent reads of .tmp/. AGS never edits ${rel}; remove the line by hand.`);
        }
      });
  }
  return found;
}

export function findings(root) {
  const found = harnessTmpEntries(root);
  const result = git(["check-ignore", "--no-index", "-v", "--", "AGENTS.md", ".agents/", ".agents/ags.yaml"], root, { allow: [0, 1] });
  for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
    const [source, target] = line.split("\t");
    if (/^.*:\d+:!/.test(source)) continue;
    found.push(`An ignore rule matches ${posix(target)} (${source}). Install refuses while git ignores AGENTS.md or .agents/.`);
  }
  for (const rel of [...SETUP_FOLDERS, ...SETUP_FILES]) {
    if (lstat(path.join(root, ...rel.split("/")))?.isSymbolicLink()) {
      found.push(`${rel} is a link or junction. Prepare never follows or moves links; move or remove it by hand, then rerun.`);
    }
  }
  return found;
}
