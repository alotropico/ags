#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDecide, parseDecideAll, realTerminal, checkFault } from "./lib/operation.mjs";
import { hostInstall, hostList, hostStatus, hostUnregister, hostUpdate, installedPaths } from "./lib/host.mjs";
import { hostRegister } from "./lib/register.mjs";
import { agsLockPath, appendRunLog, hostLockPath, reportUsage, USAGE_REL, withLock } from "./lib/reports.mjs";
import { doctor, hostDoctorWarnings } from "./lib/doctor.mjs";
import { skillsList, skillAdd } from "./lib/skills.mjs";
import { setup } from "./lib/setup.mjs";
import { inspectAll } from "./lib/observed.mjs";
import { collectReports, compactReports, cleanReports } from "./lib/report-store.mjs";
import { cleanTmp, inspectTmp } from "./lib/tmp.mjs";
import { writeSnapshot, writeSourceSnapshot } from "./lib/snapshot.mjs";
import { readAliasRecord } from "./lib/claude-skills.mjs";
import { writeTreeSnapshot } from "./lib/tree-snapshot.mjs";
import { readConfig } from "./lib/config.mjs";
import { hostPrepare } from "./lib/prepare.mjs";
import { hostBackupOnly } from "./lib/legacy-backup.mjs";
import { versionBump, versionNote, versionShow } from "./lib/version.mjs";
import { AgsError, AGS_ROOT, gitRoot, posix, samePath } from "./lib/util.mjs";
import { DiffError, parseDiffArgs, writeDiff } from "../skills/write-commit-diff/scripts/write-commit-diff.mjs";

const VALUE_FLAGS = new Set(["route", "host", "id", "name", "out", "plan", "decide", "decide-all", "set", "enable", "disable", "file", "to", "label", "only", "except", "skill", "before", "action", "event-type", "outcome", "prompt", "attachment", "harness", "session", "manifest", "preset"]);
const REPEATABLE = new Set(["set", "decide", "enable", "disable", "file", "attachment"]);
const BOOLEAN_FLAGS = new Set(["commit", "dry-run", "help", "include-nested", "allow-empty", "include-standard-excluded", "no-official-skills", "all", "backup-only"]);
const OPERATION_FLAGS = ["dry-run", "plan", "decide", "decide-all"];

export function usageError(message) {
  return new AgsError(message, { exitCode: 2 });
}

export function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const equal = arg.indexOf("=");
    const key = arg.slice(2, equal < 0 ? undefined : equal);
    const inline = equal < 0 ? null : arg.slice(equal + 1);
    if (BOOLEAN_FLAGS.has(key)) {
      if (inline != null) throw usageError(`--${key} does not take a value`);
      flags[key] = true;
      continue;
    }
    if (!VALUE_FLAGS.has(key)) throw usageError(`Unknown flag: ${arg}`);
    const value = inline ?? argv[i + 1];
    if (value == null || value.startsWith("--")) throw usageError(`Missing value for --${key}`);
    if (inline == null) i += 1;
    if (REPEATABLE.has(key)) flags[key] = [...(flags[key] || []), value];
    else if (key in flags) throw usageError(`--${key} was given more than once`);
    else flags[key] = value;
  }
  return { positionals, flags };
}

export function csvList(values = []) {
  return [].concat(values).flatMap((value) => String(value).split(",")).map((value) => value.trim()).filter(Boolean);
}

export function routeOf(flags) {
  return path.resolve(flags.route || process.cwd());
}

export function operationOptions(flags) {
  return {
    dryRun: Boolean(flags["dry-run"]),
    plan: flags.plan ?? null,
    decide: parseDecide(flags.decide || []),
    decideAll: parseDecideAll(flags["decide-all"]),
  };
}

export function rerunArgs(command, flags, route) {
  const args = [...command.split(" "), "--route", route];
  for (const [key, value] of Object.entries(flags)) {
    if (key === "route" || OPERATION_FLAGS.includes(key) || key === "help") continue;
    for (const item of [].concat(value)) {
      if (item === true) args.push(`--${key}`);
      else args.push(`--${key}`, item);
    }
  }
  return args;
}

export const COMMANDS = new Map();

COMMANDS.set("tmp inspect", {
  description: "List eligible plans, records and scratch artifacts with SHA-256 hashes.",
  usage: "[--route .]", flags: ["route"], example: "ags tmp inspect --route C:/projects/my-app",
  run: ({ flags, terminal }) => { terminal.log(JSON.stringify(inspectTmp(gitRoot(routeOf(flags))), null, 2)); return 0; },
});
COMMANDS.set("tmp clean", {
  description: "Archive only completed/archive entries from a reviewed hash manifest.",
  usage: "--manifest <file> [--route .] [--dry-run] [--plan <digest>]", flags: ["manifest", "route", ...OPERATION_FLAGS],
  example: "ags tmp clean --manifest .tmp/records/2026-10-01-sweep.json --dry-run",
  run: ({ agsRoot, flags, terminal, command }) => cleanTmp({ agsRoot, route: routeOf(flags), manifest: flags.manifest, rerunArgs: rerunArgs(command, flags, routeOf(flags)), terminal, options: operationOptions(flags) }),
});

COMMANDS.set("setup", {
  description: "Refresh optional capabilities and review compatible official skill integrations.",
  usage: "[--route .] [--no-official-skills] [--dry-run] [--plan <digest>]",
  flags: ["route", "no-official-skills", ...OPERATION_FLAGS],
  example: "ags setup --route C:/projects/my-app --dry-run",
  run: ({ agsRoot, flags, terminal, command }) => setup({ agsRoot, route: routeOf(flags), officialSkills: flags["no-official-skills"] ? false : undefined, rerunArgs: rerunArgs(command, flags, routeOf(flags)), terminal, options: operationOptions(flags) }),
});

COMMANDS.set("skill add", {
  description: "Install a project skill with the skills CLI, preserving existing destinations.",
  usage: "<source> [--skill <name>] [--route .]", flags: ["skill", "route"], positionals: [1, 1],
  parameters: ["<source>  Skills repository or local source; non-interactive use requires --skill."],
  example: "ags skill add vercel-labs/agent-skills --skill web-design-guidelines",
  run: ({ agsRoot, flags, rest, terminal }) => skillAdd({ agsRoot, route: routeOf(flags), source: rest[0], skill: flags.skill, terminal }),
});

COMMANDS.set("host prepare", {
  example: 'ags host prepare --route "C:/projects/my-app" --dry-run',
  description: "Back up an existing agent setup before installation.",
  usage: "[--route .] [--include-nested] [--backup-only [--file <relative-path> ...]] [--dry-run] [--plan <digest>]",
  flags: ["route", "include-nested", "backup-only", "file", ...OPERATION_FLAGS],
  flagHelp: { file: "--file <relative-path>  Additional regular file to copy with --backup-only; repeatable." },
  run: ({ agsRoot, flags, terminal, command }) => {
    const options = operationOptions(flags);
    const route = routeOf(flags);
    if (flags["backup-only"]) return hostBackupOnly({ agsRoot, route, includeNested: Boolean(flags["include-nested"]), files: flags.file, rerunArgs: rerunArgs(command, flags, route), terminal, options });
    if (flags.file?.length) throw usageError("--file requires --backup-only");
    return hostPrepare({ agsRoot, route, includeNested: Boolean(flags["include-nested"]), rerunArgs: rerunArgs(command, flags, route), terminal, options });
  },
});

COMMANDS.set("host install", {
  example: 'ags host install --route "C:/projects/my-app" --id my-app',
  description: "Install the latest release into a host or resume installation.",
  details: "Fresh interactive installs show recommended rules and skills for this host, then optional rules and skills you can enable. Both menus use the Installing AGS heading. Defaults and detected recommendations start checked. Up/Down navigates and Space selects/deselects. Enter or Space on Select All/Select None applies the action and stays in the menu; Enter on an item advances. Esc stops. Simple terminals accept numbered choices. Explicit --enable/--disable flags skip the menus. Confirmation accepts [Y] Yes, [S] Stop (the default), or [D] Details.",
  usage: "[--route .] [--id <id>] [--name <name>] [--enable <ids>] [--disable <ids>] [--set key=value ...] [--no-official-skills] [--include-nested] [--dry-run] [--plan <digest>]",
  flags: ["route", "id", "name", "enable", "disable", "set", "include-nested", "no-official-skills", ...OPERATION_FLAGS],
  run: ({ agsRoot, flags, terminal, command }) => {
    const options = operationOptions(flags);
    const route = routeOf(flags);
    return hostInstall({
      agsRoot,
      route,
      id: flags.id ?? null,
      name: flags.name ?? null,
      enable: csvList(flags.enable),
      disable: csvList(flags.disable),
      sets: flags.set || [],
      officialSkills: flags["no-official-skills"] ? false : undefined,
      includeNested: Boolean(flags["include-nested"]),
      rerunArgs: rerunArgs(command, flags, route),
      terminal,
      options,
    });
  },
});

COMMANDS.set("host register", {
  example: 'ags host register --route "C:/projects/my-app" --dry-run',
  description: "Register an existing AGS installation without changing host guidance.",
  usage: "[--route .] [--name <name>] [--dry-run] [--plan <digest>]",
  flags: ["route", "name", "dry-run", "plan"],
  run: ({ agsRoot, flags, terminal, command }) => hostRegister({ agsRoot, route: routeOf(flags), name: flags.name ?? null, rerunArgs: rerunArgs(command, flags, routeOf(flags)), terminal, options: operationOptions(flags) }),
});

COMMANDS.set("host update", {
  example: "ags host update --host my-app --dry-run",
  description: "Update a host and review local guidance changes.",
  usage: "[--route . | --host <id>] [--to X.Y.Z] [--enable <ids>] [--disable <ids>] [--set key=value ...] [--commit] [--dry-run] [--plan <digest>] [--decide <path>=<choice> ...] [--decide-all <choice>]",
  flags: ["route", "host", "to", "enable", "disable", "set", "commit", ...OPERATION_FLAGS],
  run: ({ agsRoot, flags, terminal, command }) => {
    const options = operationOptions(flags);
    const route = routeOf(flags);
    return hostUpdate({
      agsRoot,
      route,
      hostId: flags.host ?? null,
      to: flags.to ?? null,
      enable: csvList(flags.enable),
      disable: csvList(flags.disable),
      sets: flags.set || [],
      commit: Boolean(flags.commit),
      rerunArgs: hostArgs(command, flags, route),
      terminal,
      options,
    });
  },
});

function hostArgs(command, flags, route) {
  if (flags.route && flags.host) throw usageError("Pass --route or --host, not both.");
  const args = rerunArgs(command, flags, route);
  return flags.host ? args.filter((_, index, all) => all[index] !== "--route" && all[index - 1] !== "--route") : args;
}

COMMANDS.set("host status", {
  example: "ags host status --host my-app",
  description: "Show a host's version, changes, settings and warnings.",
  usage: "[--route . | --host <id> | --all]",
  flags: ["route", "host", "all"],
  run: ({ agsRoot, flags, terminal, command }) => {
    hostArgs(command, flags, routeOf(flags));
    if (flags.all) {
      if (flags.route || flags.host) throw usageError("--all cannot combine with --route or --host");
      return inspectAll({ agsRoot, terminal, inspect: (entry) => hostStatus({ agsRoot, route: entry.path, hostId: entry.id, terminal, extraWarnings: (root) => hostDoctorWarnings(agsRoot, root) }) });
    }
    return hostStatus({ agsRoot, route: routeOf(flags), hostId: flags.host ?? null, terminal, extraWarnings: (hostRoot) => hostDoctorWarnings(agsRoot, hostRoot) });
  },
});

COMMANDS.set("host list", {
  example: "ags host list",
  description: "List registered hosts and their installed versions.",
  usage: "",
  flags: [],
  run: ({ agsRoot, terminal }) => hostList({ agsRoot, terminal }),
});

COMMANDS.set("host unregister", {
  example: "ags host unregister --host my-app --dry-run",
  description: "Remove a host's registry entry and records; keep host files.",
  usage: "(--route . | --host <id>) [--dry-run] [--plan <digest>]",
  flags: ["route", "host", "plan", "dry-run"],
  run: ({ agsRoot, flags, terminal, command }) => {
    if (!flags.route && !flags.host) throw usageError("Pass --route or --host.");
    const route = routeOf(flags);
    return hostUnregister({ agsRoot, route, hostId: flags.host ?? null, rerunArgs: hostArgs(command, flags, route), terminal, options: operationOptions(flags) });
  },
});

COMMANDS.set("version", {
  example: "ags version",
  description: "Show the current version, latest release and unreleased work.",
  usage: "",
  flags: [],
  run: ({ agsRoot, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: version ${rest.join(" ")}`);
    return versionShow({ agsRoot, terminal });
  },
});

COMMANDS.set("version note", {
  example: 'ags version note "Add detailed command help."',
  parameters: ['"<text>"  Required release note; quote it as one argument.'],
  description: "Add an unreleased note to CHANGELOG.md.",
  usage: '"<text>"',
  flags: [],
  run: ({ agsRoot, rest, terminal }) => {
    if (rest.length !== 1) throw usageError('ags version note takes one quoted argument: ags version note "<text>"');
    return versionNote({ agsRoot, text: rest[0], terminal });
  },
});

COMMANDS.set("version bump", {
  example: "ags version bump patch --dry-run",
  parameters: ["patch|minor|major  Required version increment."],
  description: "Test, commit and tag a patch, minor or major release.",
  usage: "patch|minor|major [--allow-empty] [--dry-run] [--plan <digest>]",
  flags: ["allow-empty", "dry-run", "plan"],
  run: ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length !== 1) throw usageError("ags version bump takes one level: patch, minor or major");
    const args = ["version", "bump", rest[0], ...(flags["allow-empty"] ? ["--allow-empty"] : [])];
    return versionBump({ agsRoot, level: rest[0], allowEmpty: Boolean(flags["allow-empty"]), rerunArgs: args, terminal, options: operationOptions(flags) });
  },
});

export function runSkillScript({ route, skill, script, args, terminal }) {
  const hostRoot = gitRoot(route);
  const file = path.join(hostRoot, ".agents", "skills", skill, "scripts", script);
  if (!fs.existsSync(file)) throw new AgsError(`The ${skill} skill is not installed in ${hostRoot}; ${posix(path.relative(hostRoot, file))} is missing.`);
  const result = spawnSync(process.execPath, [file, ...args], { cwd: hostRoot, encoding: "utf8", windowsHide: true });
  if (result.error) throw new AgsError(`Could not run ${file}: ${result.error.message}`);
  if (result.signal) terminal.warn(`${file}: terminated by signal ${result.signal}`);
  for (const line of (result.stdout || "").split(/\r?\n/).filter(Boolean)) terminal.log(line);
  for (const line of (result.stderr || "").split(/\r?\n/).filter(Boolean)) terminal.warn(line);
  return result.status ?? 1;
}

COMMANDS.set("git-changes", {
  example: "ags git-changes --staged-only --output-to stdout",
  description: "Export patch diffs or file lists with change types (--format diff|list).",
  details: "Works in any Git repository without an AGS host install. Default destination is clipboard in a terminal and stdout when redirected. Use ags diff for scoped patch files under .tmp/scratch/.",
  usage: "[options]",
  flags: [],
  passthrough: true,
  run: async ({ rest, invocationCwd }) => {
    const { runGitChanges } = await import("./commands/git-changes.mjs");
    return await runGitChanges(rest, { cwd: invocationCwd });
  },
});

COMMANDS.set("diff", {
  example: "ags diff current staged 1",
  parameters: [
    "current  Unstaged changes plus untracked files; unstaged is an alias.",
    "staged  Index changes; combine with current for a single net diff.",
    "N  Last N first-parent commits; combine with staged or current staged.",
    "hash  That particular commit's patch; commit <ref> also accepts refs.",
    "--name <filename>  Plain output name; defaults to .tmp/scratch/changes.diff.",
  ],
  description: "Write a Git diff without requiring an installed skill.",
  details: "No selectors defaults to current + staged. Combos are net changes between snapshots. Merge commits use their first parent; root commits use the empty tree. Existing <mode> <name> [args] forms remain supported. Untracked .tmp/ artifacts are excluded.",
  usage: "[current] [staged] [N | hash] [--name <filename>] [--route .]",
  flags: ["route", "name"], positionals: [0, 4],
  validateArgs: (rest) => {
    try { parseDiffArgs(rest); }
    catch (error) { if (error instanceof DiffError) throw usageError(error.message); throw error; }
  },
  run: ({ flags, rest, terminal }) => {
    try {
      const request = parseDiffArgs(rest, { name: flags.name });
      const result = writeDiff(routeOf(flags), request.name, request.mode, request.extra);
      terminal.log(result.path);
      terminal.log(`bytes: ${result.bytes}`);
      terminal.log(`source: ${result.summary}`);
      return 0;
    } catch (error) {
      if (error instanceof DiffError) throw new AgsError(error.message);
      throw error;
    }
  },
});

COMMANDS.set("check", {
  example: 'ags check --only "type,lint"',
  description: "Run the host's configured type, lint and formatting checks.",
  usage: "[--route .] [--only type,lint,prettier]",
  flags: ["route", "only"],
  run: ({ flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: check ${rest.join(" ")}`);
    const kinds = ["type", "lint", "prettier"];
    const only = flags.only ? csvList(flags.only) : kinds;
    const unknown = only.filter((kind) => !kinds.includes(kind));
    if (unknown.length) throw usageError(`--only takes type, lint and prettier: ${unknown.join(", ")}`);
    const route = routeOf(flags);
    const hostRoot = gitRoot(route);
    const checks = fs.existsSync(path.join(hostRoot, ".agents", "ags.yaml")) ? readConfig(hostRoot).data.checks || {} : {};
    const args = only.flatMap((kind) => (checks[kind] ? [`--${kind}`, String(checks[kind])] : []));
    return runSkillScript({ route, skill: "check", script: "run-checks.mjs", args, terminal });
  },
});

COMMANDS.set("report usage", {
  example: 'ags report usage --action check --event-type validation --outcome passed',
  description: "Record a known skill/action and deterministic outcome; accept legacy file levels.",
  usage: '[--route .] (--action <name> | --file <host path>=<level> ...) [--outcome <name>] [--label "<text>"] [--prompt <text>] [--attachment <path> ...] [--harness <name>] [--session <id>]',
  flags: ["route", "file", "label", "action", "event-type", "outcome", "prompt", "attachment", "harness", "session"],
  run: async ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: report usage ${rest.join(" ")}`);
    if (!flags.file?.length && !flags.action) throw usageError("ags report usage needs --action or --file <host path>=<level>");
    const hostRoot = gitRoot(routeOf(flags));
    if (!fs.existsSync(path.join(hostRoot, ".agents", "ags.yaml"))) throw new AgsError(`${posix(hostRoot)} has no AGS installation. Run ags host install.`);
    const config = readConfig(hostRoot).data;
    if (config.agsVersion == null) throw new AgsError("The AGS installation is incomplete. Run ags host install.");
    const result = await reportUsage({ hostRoot, config, managed: config.reporting === false ? new Set() : installedPaths(agsRoot, hostRoot, config), values: flags.file, label: flags.label, action: flags.action, eventType: flags["event-type"], outcome: flags.outcome, prompt: flags.prompt, attachments: flags.attachment, harness: flags.harness, sessionId: flags.session });
    terminal.log(result.recorded ? `Recorded usage in ${USAGE_REL}.` : "Reporting is off in .agents/ags.yaml; nothing recorded.");
    return 0;
  },
});

COMMANDS.set("skills list", {
  example: "ags skills list",
  description: "List catalog items with descriptions and install classes.",
  usage: "",
  flags: [],
  run: ({ agsRoot, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: skills list ${rest.join(" ")}`);
    return skillsList({ agsRoot, terminal });
  },
});

COMMANDS.set("doctor", {
  flagHelp: { route: "--route <path>  Also validate this host; omitted, validate AGS alone." },
  example: 'ags doctor --route .',
  description: "Validate AGS and optionally a host with --route.",
  usage: "[--route . | --all]",
  flags: ["route", "all"],
  run: ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: doctor ${rest.join(" ")}`);
    if (flags.all && flags.route) throw usageError("--all cannot combine with --route");
    return doctor({ agsRoot, route: flags.route ? routeOf(flags) : null, all: Boolean(flags.all), terminal });
  },
});

COMMANDS.set("snapshot", {
  example: "ags snapshot --out agent-setup.zip",
  description: "Zip a host's AGENTS.md and .agents/ with a manifest.",
  usage: "[--route .] [--out <file.zip>]",
  flags: ["route", "out"],
  run: async ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: snapshot ${rest.join(" ")}`);
    if (flags.out != null && !String(flags.out).toLowerCase().endsWith(".zip")) throw usageError("--out must end in .zip");
    const hostRoot = gitRoot(routeOf(flags));
    if (!fs.existsSync(path.join(hostRoot, ".agents", "ags.yaml"))) throw new AgsError(`${posix(hostRoot)} has no AGS installation. Run ags host install.`);
    const config = readConfig(hostRoot).data;
    const written = await withLock(hostLockPath(hostRoot), "snapshot", () =>
      writeSnapshot(hostRoot, { host: config.host ?? null, agsVersion: config.agsVersion == null ? null : String(config.agsVersion), claudeAliases: config.host ? readAliasRecord(agsRoot, hostRoot, config.host) : [], out: flags.out ?? null }),
    );
    terminal.log(`Wrote ${posix(written.path)} (${written.count} file${written.count === 1 ? "" : "s"}).`);
    return 0;
  },
});

COMMANDS.set("snapshot source", {
  description: "Zip tracked AGS source files from this working tree with a manifest.",
  details: "Captures working-tree edits; skips untracked, deleted, Git-ignored and operational files. Sensitive paths are excluded by default. Uses the AGS checkout behind this command, not a host.",
  usage: "[--out <file.zip>] [--preset review|review-lite | --only <paths> | --except <paths>] [--include-standard-excluded]",
  flags: ["out", "only", "except", "include-standard-excluded", "preset"],
  flagHelp: {
    only: "--only <paths>  Include comma-separated repository-relative files or folders; base means root files. Cannot combine with --except.",
    out: "--out <file.zip>  New ZIP inside AGS; relative to the current directory. Defaults to .tmp/ags/snapshots/source-<timestamp>.zip.",
  },
  example: 'ags snapshot source --only "base,rules" --out .tmp/ags/snapshots/source-review.zip',
  run: async ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: snapshot source ${rest.join(" ")}`);
    if (flags.out != null && !flags.out.toLowerCase().endsWith(".zip")) throw usageError("--out must end in .zip");
    const written = await withLock(agsLockPath(agsRoot), "snapshot source", () => writeSourceSnapshot(agsRoot, {
      out: flags.out ?? null,
      only: csvList(flags.only),
      except: csvList(flags.except),
      includeStandardExcluded: Boolean(flags["include-standard-excluded"]),
      preset: flags.preset,
    }));
    terminal.log(`Wrote ${posix(written.path)} (${written.count} files, ${written.bytes} bytes).`);
    return 0;
  },
});

COMMANDS.set("report collect", {
  description: "Collect host usage into central rotating segments without changing host spools.",
  usage: "[--route . | --host <id> | --all]", flags: ["route", "host", "all"],
  example: "ags report collect --all",
  run: ({ agsRoot, flags, terminal }) => collectReports({ agsRoot, route: flags.route ? routeOf(flags) : null, hostId: flags.host, all: Boolean(flags.all), terminal, fault: (point) => checkFault("report-collect", point) }),
});
COMMANDS.set("report compact", {
  description: "Compact closed central usage segments by deterministic event dimensions.",
  usage: "", flags: [], example: "ags report compact",
  run: ({ agsRoot, terminal }) => compactReports({ agsRoot, terminal, fault: (point) => checkFault("report-compact", point) }),
});
COMMANDS.set("report clean", {
  description: "Review removal of closed central usage and persist a collection cutoff.",
  usage: "--before YYYY-MM [--dry-run] [--plan <digest>]", flags: ["before", ...OPERATION_FLAGS],
  example: "ags report clean --before 2026-09 --dry-run",
  run: ({ agsRoot, flags, terminal }) => cleanReports({ agsRoot, before: flags.before, rerunArgs: ["report", "clean", "--before", flags.before], terminal, options: operationOptions(flags) }),
});

COMMANDS.set("snapshot tree", {
  description: "Write a Markdown folder/file tree for AGS or a host.",
  details: "Lists names only, including hidden and Git-ignored entries. Excludes .git, node_modules and .tmp; marks links without following them. No host installation is required.",
  usage: "[--route .] [--out <file.md>]",
  flags: ["route", "out"],
  flagHelp: {
    out: "--out <file.md>  New Markdown file inside the repository; relative to the current directory. Defaults to .tmp/records/<date>-tree-snapshot-<time>.md.",
  },
  example: 'ags snapshot tree --route "C:/projects/my-app"',
  run: async ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: snapshot tree ${rest.join(" ")}`);
    if (flags.out != null && !flags.out.toLowerCase().endsWith(".md")) throw usageError("--out must end in .md");
    const root = gitRoot(routeOf(flags));
    const lock = samePath(root, agsRoot) ? agsLockPath(root) : hostLockPath(root);
    const written = await withLock(lock, "snapshot tree", () => writeTreeSnapshot(root, { out: flags.out ?? null }));
    terminal.log(`Wrote ${posix(written.path)} (${written.directories} directories, ${written.files} files, ${written.links} links).`);
    return 0;
  },
});

const FLAG_HELP = {
  "backup-only": "--backup-only  Copy and hash-verify discovered legacy setup without moving originals.",
  preset: "--preset review|review-lite  Fixed review package with a fresh tree and hashed manifest.",
  manifest: "--manifest <file>  JSON cleanup manifest under .tmp/records/.",
  before: "--before YYYY-MM  Remove only eligible closed data older than this month.",
  action: "--action <name>  Mechanically known skill or action name.",
  "event-type": "--event-type <name>  Event type; defaults to usage.",
  outcome: "--outcome <name>  Deterministic operation outcome; defaults to recorded.",
  prompt: "--prompt <text>  Already available prompt text; normalize and cap at 160 characters.",
  attachment: "--attachment <path>  Already available attachment; store basename only; repeatable.",
  harness: "--harness <name>  Harness already exposed by the calling environment.",
  session: "--session <id>  Session id already exposed by the calling environment.",
  all: "--all  Inspect or collect from all registered hosts in stable id order.",
  skill: "--skill <name>  Concrete skill name to install with the backend.",
  "no-official-skills": "--no-official-skills  Save a host opt-out from optional official skill installation.",
  route: "--route <path>  Repository path; defaults to the current directory.",
  host: "--host <id>  Registered host id; use instead of --route.",
  id: "--id <id>  Host registry id.",
  name: "--name <name>  Host display name.",
  enable: "--enable <ids>  Enable comma-separated catalog ids; repeatable.",
  disable: "--disable <ids>  Disable comma-separated catalog ids; repeatable.",
  set: "--set <key>=<value>  Set a declared host setting or supported integration boolean; repeatable.",
  "include-nested": "--include-nested  Include nested agent setups in the backup.",
  commit: "--commit  After a successful update, commit only the host paths it wrote or deleted as \"AGS: update <host> <from> -> <to>\".",
  "dry-run": "--dry-run  Preview the operation without applying changes.",
  plan: "--plan <digest>  Confirm the exact plan previously displayed and reviewed.",
  decide: "--decide <path>=<choice>  Choose promote, restore, ignore or disable for a plan item; repeatable. Use only choices offered for that item.",
  "decide-all": "--decide-all <choice>  Apply promote, restore, ignore or disable to all open items that offer that choice.",
  to: "--to <X.Y.Z>  Target release; defaults to the latest release within the installed major version.",
  "allow-empty": "--allow-empty  Allow a release without unreleased notes.",
  only: "--only <kinds>  Comma-separated type, lint or prettier; defaults to all three.",
  file: "--file <host-path>=<level>  Required installed guidance path and engagement level (0-8); repeatable.",
  label: "--label <text>  Optional usage-record label; quote text containing spaces.",
  out: "--out <file.zip>  Output ZIP path; must end in .zip and must not already exist.",
  except: "--except <paths>  Exclude comma-separated repository-relative files or folders; base means root files. Cannot combine with --only.",
  "include-standard-excluded": "--include-standard-excluded  Include tracked sensitive paths (.env*, credentials.json, id_rsa, *.pem); Git-ignored and operational files still stay out.",
};

function commandHelp(name, spec) {
  const parameters = [...(spec.parameters || []), ...spec.flags.map((flag) => spec.flagHelp?.[flag] ?? FLAG_HELP[flag])];
  return [
    `ags ${name}${spec.usage ? ` ${spec.usage}` : ""}`,
    spec.description,
    ...(name.startsWith("host ") && !COMMANDS.has(name.slice(5)) ? [`Outside the AGS checkout, ags ${name.slice(5)} is an alias for this command.`] : []),
    ...(spec.details ? [spec.details] : []),
    "",
    parameters.length ? `Parameters ([] in usage means optional):\n${parameters.map((parameter) => `  ${parameter}`).join("\n")}` : "No command-specific parameters.",
    "  --help  Show this command help.",
    "",
    `Example:\n  ${spec.example}`,
  ].join("\n");
}

function helpText(hostAliases = false) {
  const names = [...COMMANDS.keys()].sort();
  const width = Math.max(0, ...names.map((name) => name.length));
  const aliases = hostAliases ? names.filter(name => name.startsWith("host ") && !COMMANDS.has(name.slice(5))).map(name => `  ${name.slice(5).padEnd(width)}  Alias for ${name}.`) : [];
  return names.length ? `Usage: ags <command>\nCommands:\n${names.map((name) => `  ${name.padEnd(width)}  ${COMMANDS.get(name).description}`).join("\n")}${aliases.length ? `\n\nHost aliases (outside the AGS checkout):\n${aliases.join("\n")}` : ""}\n\nRun ags help <command> for its description, parameters and an example.\nExample: ags help host install (also available as ags host install --help).` : "Usage: ags <command>";
}

function outsideAgsCheckout(invocationCwd, agsRoot) {
  let current = fs.realpathSync.native(invocationCwd);
  for (;;) {
    if (samePath(current, agsRoot)) return false;
    const parent = path.dirname(current);
    if (parent === current) return true;
    current = parent;
  }
}

export function findCommand(positionals, { hostAliases = false } = {}) {
  const two = positionals.slice(0, 2).join(" ");
  if (positionals.length >= 2 && COMMANDS.has(two)) return { name: two, spec: COMMANDS.get(two), rest: positionals.slice(2) };
  const one = positionals[0];
  if (COMMANDS.has(one)) return { name: one, spec: COMMANDS.get(one), rest: positionals.slice(1) };
  const hostCommand = `host ${one}`;
  if (hostAliases && COMMANDS.has(hostCommand)) return { name: hostCommand, spec: COMMANDS.get(hostCommand), rest: positionals.slice(1) };
  return null;
}

export async function main(argv, { terminal = realTerminal(), agsRoot = AGS_ROOT, run = {}, invocationCwd = process.cwd() } = {}) {
  if (argv[0] === "git-changes") {
    run.command = "git-changes";
    run.params = argv.slice(1);
    run.flags = {};
    const spec = COMMANDS.get("git-changes");
    return await spec.run({ rest: argv.slice(1), invocationCwd });
  }
  const { positionals, flags } = parseArgs(argv);
  run.flags = flags;
  const hostAliases = outsideAgsCheckout(invocationCwd, agsRoot);
  const groups = new Set(["host", "skills", "skill", "report", "tmp"]);
  const group = positionals[0] === "help" ? positionals[1] : positionals[0];
  if (groups.has(group) && positionals.length === (positionals[0] === "help" ? 2 : 1)) {
    if (Object.keys(flags).some((key) => key !== "help")) throw usageError(`ags ${group} takes no flags; choose a child command.`);
    terminal.log(`Usage: ags ${group} <command>\n${[...COMMANDS].filter(([name]) => name.startsWith(`${group} `)).map(([name, spec]) => `  ${name}  ${spec.description}`).join("\n")}`);
    return 0;
  }
  if (!positionals.length || positionals[0] === "help") {
    run.params = positionals.slice(1);
    if (run.params.length) {
      const found = findCommand(run.params, { hostAliases });
      if (!found || found.rest.length) throw usageError(`Unknown command: ${run.params.join(" ")}. Run ags help to list commands.`);
      terminal.log(commandHelp(found.name, found.spec));
    } else {
      terminal.log(helpText(hostAliases));
    }
    return 0;
  }
  const found = findCommand(positionals, { hostAliases });
  if (!found) throw usageError(`Unknown command: ${positionals.join(" ")}`);
  run.command = found.name;
  run.params = found.rest;
  const limits = found.spec.positionals ?? ({ "version note": [1, 1], "version bump": [1, 1], diff: [2, 4] }[found.name] ?? [0, 0]);
  if (!flags.help && (found.rest.length < limits[0] || found.rest.length > limits[1])) throw usageError(`ags ${found.name} expects ${limits[0] === limits[1] ? limits[0] : `${limits[0]}-${limits[1]}`} positional arguments; received ${found.rest.length}.`);
  if (!flags.help) found.spec.validateArgs?.(found.rest);
  if (flags.help) {
    terminal.log(commandHelp(found.name, found.spec));
    return 0;
  }
  for (const key of Object.keys(flags)) {
    if (!found.spec.flags.includes(key)) throw usageError(`Unknown flag for ${found.name}: --${key}`);
  }
  if (found.spec.passthrough) throw usageError(`ags ${found.name} must be invoked directly; flags are parsed by the command.`);
  const code = await found.spec.run({ agsRoot, flags, rest: found.rest, terminal, command: found.name, invocationCwd });
  return code ?? 0;
}

function leadingCommand(argv) {
  const end = argv.findIndex((arg) => arg.startsWith("--"));
  const leading = end < 0 ? argv : argv.slice(0, end);
  return findCommand(leading)?.name ?? leading.slice(0, 2).join(" ");
}

export async function invoke(argv, { terminal = realTerminal(), agsRoot = AGS_ROOT } = {}) {
  const at = `${new Date().toISOString().slice(0, 19)}Z`;
  const run = { command: leadingCommand(argv), flags: {}, params: [] };
  let code;
  try {
    code = await main(argv, { terminal, agsRoot, run, invocationCwd: process.cwd() });
  } catch (error) {
    terminal.warn(error instanceof AgsError ? error.message : error.stack || String(error));
    if (error.written?.length) terminal.warn(`Incomplete files: ${error.written.join(", ")}`);
    code = error instanceof AgsError ? error.exitCode || 1 : 1;
  }
  try {
    await appendRunLog(agsRoot, { ...run, at, error: code === 1 || code === 2 });
  } catch (error) {
    terminal.warn(`Warning: the run log was not written: ${error.message}`);
  }
  return code;
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  invoke(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
