import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const DETECTION_SIGNALS = new Set(["git", "git-remote", "code", "javascript", "typescript", "react", "web-ui", "stylesheets", "checks"]);
export const DETECTION_CAPABILITIES = new Set(["skills", "graphify", "fallow", "ast-grep", "intent"]);
const GENERATED = new Set([".git", ".tmp", "node_modules", "vendor", "dist", "build", "out", "coverage", ".next", ".nuxt", ".cache"]);

function git(root, args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
}

function projectFiles(root, isGit) {
  if (isGit) {
    const result = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
    if (result.status === 0) return result.stdout.split("\0").filter(Boolean).filter(rel => !rel.split("/").some(part => GENERATED.has(part)));
  }
  const files = [];
  const walk = (directory, prefix = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (GENERATED.has(entry.name) || entry.isSymbolicLink()) continue;
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(path.join(directory, entry.name), `${rel}/`);
      else if (entry.isFile()) files.push(rel);
    }
  };
  walk(root);
  return files;
}

export function detectCheckScripts(scripts = {}) {
  const candidates = {
    "checks.type": ["typecheck", "type-check", "type:check", "check:types", "check-types", "types:check"],
    "checks.lint": ["lint", "lint:check", "check:lint", "lint-check"],
    "checks.prettier": ["format:check", "prettier:check", "check:format", "check:prettier"],
  };
  const found = new Map();
  for (const [key, names] of Object.entries(candidates)) {
    const matches = names.filter(name => typeof scripts[name] === "string" && scripts[name].trim() && !/(?:--fix|--write)\b/.test(scripts[name])
      && !(key === "checks.prettier" && /(?:^|[\s"'=])-w(?:[\s"'=]|$)/.test(scripts[name])));
    if (matches.length === 1) found.set(key, matches[0]);
  }
  return found;
}

export function projectEvidence(root, packages, scripts) {
  const isGit = git(root, ["rev-parse", "--is-inside-work-tree"]).stdout?.trim() === "true";
  const files = projectFiles(root, isGit);
  const signals = new Set();
  if (isGit) signals.add("git");
  if (isGit && git(root, ["remote"]).stdout?.trim()) signals.add("git-remote");
  if (files.some(rel => /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|swift|[ch](?:pp|xx)?|cs|rb|php|vue|svelte|astro)$/i.test(rel))) signals.add("code");
  if (files.some(rel => /\.[cm]?[jt]sx?$/i.test(rel))) signals.add("javascript");
  if (packages.has("typescript") || files.some(rel => /\.[cm]?tsx?$/i.test(rel))) { signals.add("typescript"); signals.add("javascript"); }
  if (packages.has("react") || packages.has("react-dom")) signals.add("react");
  const webPackages = ["react-dom", "preact", "vue", "svelte", "@angular/core", "next", "nuxt", "@sveltejs/kit", "astro", "solid-js", "@platform/ui-library"];
  if (webPackages.some(name => packages.has(name)) || (packages.has("react") && !packages.has("react-native")) || files.some(rel => /\.(?:html?|jsx|tsx|vue|svelte|astro)$/i.test(rel))) signals.add("web-ui");
  if (files.some(rel => /\.(?:css|scss|sass|less)$/i.test(rel))) signals.add("stylesheets");
  const suggestedChecks = detectCheckScripts(scripts);
  if (suggestedChecks.size) signals.add("checks");
  return { signals, suggestedChecks };
}

export function suggestedHostSettings(root, evidence) {
  const values = new Map(evidence.suggestedChecks || []);
  if (!evidence.signals?.has("git")) return values;
  const remotes = git(root, ["remote"]).stdout?.trim().split(/\r?\n/).filter(Boolean) || [];
  const defaults = new Set();
  for (const remote of remotes) {
    const ref = git(root, ["symbolic-ref", "--quiet", `refs/remotes/${remote}/HEAD`]).stdout?.trim();
    if (ref?.startsWith(`refs/remotes/${remote}/`) && git(root, ["show-ref", "--verify", "--quiet", ref]).status === 0) defaults.add(ref.slice(`refs/remotes/${remote}/`.length));
  }
  if (defaults.size === 1) values.set("git.mainBranch", [...defaults][0]);
  else if (!defaults.size) {
    const local = ["main", "master"].filter(name => git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${name}`]).status === 0);
    if (local.length === 1) values.set("git.mainBranch", local[0]);
  }
  return values;
}
