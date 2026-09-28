#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDecide, parseDecideAll, realTerminal } from "./lib/operation.mjs";
import { hostInstall, hostList, hostStatus, hostUnregister, hostUpdate, installedPaths } from "./lib/host.mjs";
import { reportUsage, USAGE_REL } from "./lib/reports.mjs";
import { readConfig } from "./lib/config.mjs";
import { hostPrepare } from "./lib/prepare.mjs";
import { versionBump, versionNote, versionShow } from "./lib/version.mjs";
import { AgsError, AGS_ROOT, gitRoot, posix } from "./lib/util.mjs";

const VALUE_FLAGS = new Set(["route", "host", "id", "name", "out", "plan", "decide", "decide-all", "set", "enable", "disable", "file", "to", "label", "only"]);
const REPEATABLE = new Set(["set", "decide", "enable", "disable", "file"]);
const BOOLEAN_FLAGS = new Set(["dry-run", "help", "include-nested", "allow-empty"]);
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
    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    if (!VALUE_FLAGS.has(key)) throw usageError(`Unknown flag: ${arg}`);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) throw usageError(`Missing value for --${key}`);
    i += 1;
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

COMMANDS.set("host prepare", {
  usage: "[--route .] [--include-nested] [--dry-run] [--plan <digest>]",
  flags: ["route", "include-nested", ...OPERATION_FLAGS],
  run: ({ agsRoot, flags, terminal, command }) => {
    const options = operationOptions(flags);
    const route = routeOf(flags);
    return hostPrepare({ agsRoot, route, includeNested: Boolean(flags["include-nested"]), rerunArgs: rerunArgs(command, flags, route), terminal, options });
  },
});

COMMANDS.set("host install", {
  usage: "[--route .] [--id <id>] [--name <name>] [--enable <ids>] [--disable <ids>] [--set key=value ...] [--include-nested] [--dry-run] [--plan <digest>]",
  flags: ["route", "id", "name", "enable", "disable", "set", "include-nested", ...OPERATION_FLAGS],
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
      includeNested: Boolean(flags["include-nested"]),
      rerunArgs: rerunArgs(command, flags, route),
      terminal,
      options,
    });
  },
});

COMMANDS.set("host update", {
  usage: "[--route . | --host <id>] [--to X.Y.Z] [--enable <ids>] [--disable <ids>] [--set key=value ...] [--dry-run] [--plan <digest>] [--decide <path>=<choice> ...] [--decide-all <choice>]",
  flags: ["route", "host", "to", "enable", "disable", "set", ...OPERATION_FLAGS],
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
  usage: "[--route . | --host <id>]",
  flags: ["route", "host"],
  run: ({ agsRoot, flags, terminal, command }) => {
    hostArgs(command, flags, routeOf(flags));
    return hostStatus({ agsRoot, route: routeOf(flags), hostId: flags.host ?? null, terminal });
  },
});

COMMANDS.set("host list", {
  usage: "",
  flags: [],
  run: ({ agsRoot, terminal }) => hostList({ agsRoot, terminal }),
});

COMMANDS.set("host unregister", {
  usage: "(--route . | --host <id>) [--plan <digest>]",
  flags: ["route", "host", "plan", "dry-run"],
  run: ({ agsRoot, flags, terminal, command }) => {
    if (!flags.route && !flags.host) throw usageError("Pass --route or --host.");
    const route = routeOf(flags);
    return hostUnregister({ agsRoot, route, hostId: flags.host ?? null, rerunArgs: hostArgs(command, flags, route), terminal, options: operationOptions(flags) });
  },
});

COMMANDS.set("version", {
  usage: "",
  flags: [],
  run: ({ agsRoot, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: version ${rest.join(" ")}`);
    return versionShow({ agsRoot, terminal });
  },
});

COMMANDS.set("version note", {
  usage: '"<text>"',
  flags: [],
  run: ({ agsRoot, rest, terminal }) => {
    if (rest.length !== 1) throw usageError('ags version note takes one quoted argument: ags version note "<text>"');
    return versionNote({ agsRoot, text: rest[0], terminal });
  },
});

COMMANDS.set("version bump", {
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
  for (const line of (result.stdout || "").split(/\r?\n/).filter(Boolean)) terminal.log(line);
  for (const line of (result.stderr || "").split(/\r?\n/).filter(Boolean)) terminal.warn(line);
  return result.status ?? 1;
}

COMMANDS.set("diff", {
  usage: "<mode> <name> [args] [--route .]",
  flags: ["route"],
  run: ({ flags, rest, terminal }) => runSkillScript({ route: routeOf(flags), skill: "write-commit-diff", script: "write-commit-diff.mjs", args: rest, terminal }),
});

COMMANDS.set("check", {
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
  usage: '[--route .] --file <host path>=<level> ... [--label "<text>"]',
  flags: ["route", "file", "label"],
  run: async ({ agsRoot, flags, rest, terminal }) => {
    if (rest.length) throw usageError(`Unknown command: report usage ${rest.join(" ")}`);
    if (!flags.file?.length) throw usageError("ags report usage needs at least one --file <host path>=<level>");
    const hostRoot = gitRoot(routeOf(flags));
    if (!fs.existsSync(path.join(hostRoot, ".agents", "ags.yaml"))) throw new AgsError(`${posix(hostRoot)} has no AGS installation. Run ags host install.`);
    const config = readConfig(hostRoot).data;
    if (config.agsVersion == null) throw new AgsError("The AGS installation is incomplete. Run ags host install.");
    const result = await reportUsage({ hostRoot, config, managed: config.reporting === false ? new Set() : installedPaths(agsRoot, hostRoot, config), values: flags.file, label: flags.label });
    terminal.log(result.recorded ? `Recorded usage in ${USAGE_REL}.` : "Reporting is off in .agents/ags.yaml; nothing recorded.");
    return 0;
  },
});

function helpText() {
  const names = [...COMMANDS.keys()].sort();
  return names.length ? `Usage: ags <command>\nCommands:\n${names.map((name) => `  ${name}`).join("\n")}` : "Usage: ags <command>";
}

export function findCommand(positionals) {
  const two = positionals.slice(0, 2).join(" ");
  if (positionals.length >= 2 && COMMANDS.has(two)) return { name: two, spec: COMMANDS.get(two), rest: positionals.slice(2) };
  const one = positionals[0];
  if (COMMANDS.has(one)) return { name: one, spec: COMMANDS.get(one), rest: positionals.slice(1) };
  return null;
}

export async function main(argv, { terminal = realTerminal(), agsRoot = AGS_ROOT } = {}) {
  const { positionals, flags } = parseArgs(argv);
  if (!positionals.length || positionals[0] === "help") {
    terminal.log(helpText());
    return 0;
  }
  const found = findCommand(positionals);
  if (!found) throw usageError(`Unknown command: ${positionals.join(" ")}`);
  if (flags.help) {
    terminal.log(`ags ${found.name}${found.spec.usage ? ` ${found.spec.usage}` : ""}`);
    return 0;
  }
  for (const key of Object.keys(flags)) {
    if (!found.spec.flags.includes(key)) throw usageError(`Unknown flag for ${found.name}: --${key}`);
  }
  const code = await found.spec.run({ agsRoot, flags, rest: found.rest, terminal, command: found.name });
  return code ?? 0;
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  const terminal = realTerminal();
  main(process.argv.slice(2), { terminal }).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      terminal.warn(error instanceof AgsError ? error.message : error.stack || String(error));
      if (error.written?.length) terminal.warn(`Incomplete files: ${error.written.join(", ")}`);
      process.exitCode = error instanceof AgsError ? error.exitCode || 1 : 1;
    },
  );
}
