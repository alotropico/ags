import fs from "node:fs";
import path from "node:path";
import { compareVersions, latestRelease, readCatalog, validateCatalog } from "./catalog.mjs";
import { loadRegistry } from "./registry.mjs";
import { analyzeBlock } from "./render.mjs";
import { agsLockPath, lockState, runsLockPath } from "./reports.mjs";
import { packageVersion, readChangelog, releaseCommit, UNRELEASED } from "./version.mjs";
import { AGS_ROOT, git, posix } from "./util.mjs";

export const DISPOSITIONS = ["AGS", "Host", "Backlog", "Removed", "Migrate later"];
export const LEDGER_HEADER = "| # | Concept | Source | Disposition | Destination | Rationale |";
const NEEDS_RATIONALE = new Set(["Removed", "Migrate later"]);

function report() {
  return { errors: [], warnings: [], info: [] };
}

function attempt(out, fn) {
  try {
    fn();
  } catch (error) {
    out.errors.push(error.message);
  }
}

export function splitRow(line) {
  const cells = [];
  let cell = "";
  let code = false;
  const text = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\\" && text[i + 1] === "|") {
      cell += "|";
      i += 1;
    } else if (char === "`") {
      code = !code;
      cell += char;
    } else if (char === "|" && !code) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

export function ledgerErrors(text) {
  const errors = [];
  const lines = String(text).replaceAll("\r\n", "\n").split("\n");
  let tables = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== LEDGER_HEADER) continue;
    tables += 1;
    let at = i + 2;
    for (; at < lines.length && lines[at].trim().startsWith("|"); at += 1) {
      const cells = splitRow(lines[at]);
      const where = `LEDGER.md line ${at + 1}`;
      if (cells.length !== 6) {
        errors.push(`${where}: a row needs 6 cells, found ${cells.length}`);
        continue;
      }
      const disposition = cells[3];
      if (!DISPOSITIONS.includes(disposition)) errors.push(`${where}: disposition must be one of ${DISPOSITIONS.join(", ")}, found "${disposition}"`);
      else if (NEEDS_RATIONALE.has(disposition) && !cells[5]) errors.push(`${where}: a ${disposition} row needs a rationale`);
    }
    i = at - 1;
  }
  if (!tables) errors.push("LEDGER.md has no ledger table");
  return errors;
}

function staleLocks(out, dirs) {
  for (const dir of dirs) {
    const state = lockState(dir);
    if (state.held && state.stale) out.warnings.push(`Stale lock ${posix(dir)}; the next command that needs it removes it.`);
    else if (state.held) out.info.push(`Lock held: ${posix(dir)} by ${state.owner?.command ?? "an unknown command"}`);
  }
}

function checkVersion(out, agsRoot) {
  const version = packageVersion(agsRoot);
  const latest = latestRelease(agsRoot);
  out.info.push(`Version: ${version}; latest release: ${latest ?? "none"}`);
  if (latest && version === latest) return;
  if (!latest || compareVersions(version, latest) > 0) {
    const commit = releaseCommit(agsRoot, version);
    if (commit) {
      out.errors.push(`Release commit ${commit.slice(0, 12)} (Release: ${version}) has no tag v${version}. Recover with ags version bump and any level; it only creates the missing tag.`);
      return;
    }
    if (!latest) return;
  }
  out.errors.push(`package.json version ${version} does not match the latest release ${latest}.`);
}

function checkNotHost(out, agsRoot) {
  for (const rel of [".agents", ".cursor/skills", ".claude/skills"]) {
    if (fs.existsSync(path.join(agsRoot, ...rel.split("/")))) out.errors.push(`AGS is not a host, but ${rel}/ exists at the AGS root.`);
  }
  const agents = path.join(agsRoot, "AGENTS.md");
  if (fs.existsSync(agents) && analyzeBlock(fs.readFileSync(agents, "utf8")).kind !== "missing") out.errors.push("AGS is not a host, but AGENTS.md holds AGS block markers.");
}

function checkGitState(out, agsRoot) {
  const changed = git(["status", "--porcelain"], agsRoot).stdout.split(/\r?\n/).filter(Boolean).length;
  out.info.push(`Uncommitted changes: ${changed ? `${changed} path${changed === 1 ? "" : "s"}` : "none"}`);
  const latest = latestRelease(agsRoot);
  if (latest) {
    const count = git(["rev-list", "--count", `v${latest}..HEAD`], agsRoot).stdout.trim();
    out.info.push(`Commits since v${latest}: ${count}`);
  }
}

export function doctorAgs(agsRoot = AGS_ROOT) {
  const out = report();
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) out.errors.push(`Node ${process.versions.node} is below 20.`);
  else out.info.push(`Node: ${process.versions.node}`);
  attempt(out, () => {
    const { catalog, source } = readCatalog(agsRoot);
    const errors = validateCatalog(catalog, source);
    out.errors.push(...errors.map((line) => `catalog.yaml: ${line}`));
    if (!errors.length) out.info.push(`Catalog: ${catalog.rules.length} rules, ${catalog.skills.length} skills`);
  });
  attempt(out, () => {
    const first = readChangelog(agsRoot).replaceAll("\r\n", "\n").split("\n").find((line) => line.trim());
    if (first?.trim() !== UNRELEASED) out.errors.push(`CHANGELOG.md must start with ${UNRELEASED}.`);
  });
  attempt(out, () => checkVersion(out, agsRoot));
  const ledger = path.join(agsRoot, "LEDGER.md");
  if (!fs.existsSync(ledger)) out.errors.push("LEDGER.md is missing.");
  else out.errors.push(...ledgerErrors(fs.readFileSync(ledger, "utf8")));
  checkNotHost(out, agsRoot);
  attempt(out, () => {
    const { hosts } = loadRegistry(agsRoot);
    out.info.push(`Registered hosts: ${hosts.length}`);
  });
  attempt(out, () => staleLocks(out, [agsLockPath(agsRoot), runsLockPath(agsRoot)]));
  attempt(out, () => checkGitState(out, agsRoot));
  return out;
}

export function printReport(terminal, out) {
  for (const line of out.info) terminal.log(line);
  for (const line of out.errors) terminal.log(`Error: ${line}`);
  for (const line of out.warnings) terminal.log(`Warning: ${line}`);
  const count = out.errors.length + out.warnings.length;
  terminal.log(count ? `${out.errors.length} error${out.errors.length === 1 ? "" : "s"}, ${out.warnings.length} warning${out.warnings.length === 1 ? "" : "s"}.` : "No findings.");
  return out.errors.length ? 1 : 0;
}

export function doctor({ agsRoot = AGS_ROOT, terminal }) {
  terminal.log(`AGS: ${posix(agsRoot)}`);
  return printReport(terminal, doctorAgs(agsRoot));
}
