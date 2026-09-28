#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseDecide, parseDecideAll, realTerminal } from "./lib/operation.mjs";
import { hostInstall, hostUpdate } from "./lib/host.mjs";
import { hostPrepare } from "./lib/prepare.mjs";
import { AgsError, AGS_ROOT } from "./lib/util.mjs";

const VALUE_FLAGS = new Set(["route", "host", "id", "name", "out", "plan", "decide", "decide-all", "set", "enable", "disable", "file", "to", "label", "only"]);
const REPEATABLE = new Set(["set", "decide", "enable", "disable", "file"]);
const BOOLEAN_FLAGS = new Set(["dry-run", "help", "include-nested"]);
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
    if (flags.route && flags.host) throw usageError("Pass --route or --host, not both.");
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
      rerunArgs: flags.host ? rerunArgs(command, flags, route).filter((_, index, all) => all[index] !== "--route" && all[index - 1] !== "--route") : rerunArgs(command, flags, route),
      terminal,
      options,
    });
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
