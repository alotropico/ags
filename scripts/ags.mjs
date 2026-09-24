#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadCatalog, parseSelectionReply } from "./lib/catalog.mjs";
import { doctor } from "./lib/doctor.mjs";
import { writeDiff } from "./lib/diff.mjs";
import { splitSetting } from "./lib/host.mjs";
import {
  installHost,
  listHosts,
  loadRegistry,
  repairHost,
  resolveRoute,
  syncHosts,
  unregisterHost,
  updateHost,
  verifyRegistered,
} from "./lib/host.mjs";
import { recordChanges, recordUsage, setReporting } from "./lib/report-cmd.mjs";
import { installSkill, listSkills, reconcile } from "./lib/skills.mjs";
import { writeCanonicalSnapshot } from "./snapshot-canonical.mjs";
import { checkFailed, runChecks } from "./lib/checks.mjs";
import { writeSnapshot } from "./lib/snapshot.mjs";
import { AgsError, CANONICAL_ROOT, assertCanonicalAccess, samePath } from "./lib/util.mjs";

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  const multi = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) flags[key] = true;
    else {
      flags[key] = flags[key] == null ? next : [].concat(flags[key], next);
      if (key === "file" || key === "enable" || key === "disable") multi.push([key, next]);
      i += 1;
    }
  }
  const list = (key) => multi.filter(([name]) => name === key).map(([, value]) => value);
  return { positionals, flags, list };
}

function routeOf(flags) {
  return path.resolve(flags.route || process.cwd());
}

function csv(value) {
  if (!value || value === true) return [];
  return [].concat(value).flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean);
}

function printHostResult(result) {
  if (!result.applied) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`host ${result.entry?.id || ""} ${result.hostRoot}`);
}

function expectFlags(flags, allowed) {
  for (const key of Object.keys(flags)) {
    if (!allowed.includes(key)) throw new AgsError(`Unknown flag: --${key}`);
  }
}

function oneOf(flags, names) {
  const present = names.filter((name) => flags[name] != null && flags[name] !== false);
  if (present.length > 1) throw new AgsError(`Use only one of ${present.map((name) => `--${name}`).join(", ")}`);
}

async function reportingCommand(action, flags) {
  expectFlags(flags, ["route", "host", "all", "help"]);
  oneOf(flags, ["all", "host", "route"]);
  const root = CANONICAL_ROOT;
  if (action !== "on" && action !== "off" && action !== "status") {
    throw new AgsError(`Unknown reporting action: ${action}`);
  }
  const value = action === "on" ? true : false;
  if (action === "status") {
    const registry = loadRegistry(root);
    const entries = flags.all
      ? registry.hosts
      : flags.host
        ? registry.hosts.filter((item) => item.id === flags.host)
        : [verifyRegistered(root, resolveRoute(routeOf(flags))).entry];
    if (flags.host && !flags.all && entries.length === 0) throw new AgsError(`Unknown host: ${flags.host}`);
    const failures = [];
    for (const entry of entries) {
      try {
        const verified = verifyRegistered(root, entry.path);
        console.log(`${verified.entry.id} reporting=${verified.settings.reporting}`);
      } catch (error) {
        failures.push(`${entry.id}: ${error.message}`);
        console.error(`${entry.id}: ${error.message}`);
      }
    }
    if (failures.length) throw new AgsError(failures.join("\n"));
    return;
  }
  const result = setReporting(root, {
    route: routeOf(flags),
    host: flags.host,
    all: Boolean(flags.all),
    value,
  });
  for (const id of result.changed) console.log(`${id} reporting=${value}`);
  for (const failure of result.failures) console.error(failure);
  if (result.failures.length) throw new AgsError(result.failures.join("\n"));
}

async function reportCommand(kind, flags) {
  expectFlags(flags, kind === "usage" ? ["route", "file", "label", "help"] : ["route", "file", "note", "help"]);
  const root = CANONICAL_ROOT;
  const route = routeOf(flags);
  const fileArgs = [].concat(flags.file || []);
  if (kind === "usage") {
    const result = await recordUsage(root, route, { fileArgs, label: flags.label });
    console.log(result.disabled ? "Usage reporting is disabled." : result.destination);
    return;
  }
  if (kind === "changes") {
    const result = await recordChanges(root, findIsCanonical(route) ? root : route, { files: fileArgs, note: flags.note });
    console.log(result.destination);
    return;
  }
  throw new AgsError(`Unknown report command: ${kind}`);
}

function findIsCanonical(route) {
  let dir = path.resolve(route);
  while (true) {
    if (samePath(dir, CANONICAL_ROOT) && fs.existsSync(path.join(dir, "catalog.yaml"))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

async function main(argv) {
  const { positionals, flags, list } = parseArgs(argv);
  const [group, action, ...rest] = positionals;
  const root = CANONICAL_ROOT;
  if (!group || group === "help" || flags.help) {
    console.log("ags doctor | host | skills | reporting | report | snapshot | diff | check");
    return;
  }
  if (group === "doctor") {
    expectFlags(flags, ["route", "help"]);
    const started = routeOf(flags);
    const hostish = fs.existsSync(path.join(started, ".agents", "ags.yaml")) || findHostUp(started);
    const result = doctor(root, hostish ? started : null);
    for (const line of result.lines) console.log(line);
    for (const failure of result.failures) console.error(failure);
    if (!result.ok) throw new AgsError("doctor found problems");
    return;
  }
  if (group === "host") return await hostCommand(action, rest, flags, list);
  if (group === "skills") return skillsCommand(action, flags, list);
  if (group === "reporting") return reportingCommand(action, flags);
  if (group === "report") return reportCommand(action, flags);
  if (group === "snapshot") return snapshotCommand(action, flags);
  if (group === "diff") return diffCommand(action, rest, flags);
  if (group === "check") return checkCommand(flags);
  throw new AgsError(`Unknown command: ${group}`);
}

function findHostUp(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, ".agents", "ags.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

async function promptLine(message) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(message)).trim();
  } finally {
    rl.close();
  }
}

function splitIds(line) {
  return String(line || "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function askReplace(label, offered, proposed) {
  console.log(`${label}`);
  console.log(`  offered: ${offered.join(", ") || "(none)"}`);
  console.log(`  default enabled: ${proposed.join(", ") || "(none)"}`);
  for (;;) {
    const line = await promptLine(`Enabled ${label} ids (empty accepts defaults, none selects nothing): `);
    const choice = parseSelectionReply(line, offered, proposed);
    if (choice.error) {
      console.log(`${choice.error}. Offered: ${offered.join(", ") || "(none)"}`);
      continue;
    }
    return { enable: choice.enable, disable: choice.disable };
  }
}

async function chooseSelection(plan, options, mode) {
  if (options.yes || !stdin.isTTY) return { confirmed: false, options: {} };
  const enable = [];
  const disable = [];
  const groups = [
    ["rules", plan.offeredRules || [], plan.enabledRules || []],
    ["custom skills", plan.offeredCustom || [], plan.enabledCustom || []],
    ["third-party skills", plan.offeredThirdParty || [], plan.enabledThirdParty || []],
  ];
  for (const [label, offered, proposed] of groups) {
    if (label === "custom skills" && plan.recommended) console.log(`Recommended: ${plan.recommended}`);
    if (mode === "install") {
      const picked = await askReplace(label, offered, proposed);
      enable.push(...picked.enable);
      disable.push(...picked.disable);
    } else {
      console.log(`${label}`);
      console.log(`  offered: ${offered.join(", ") || "(none)"}`);
      console.log(`  enabled: ${proposed.join(", ") || "(none)"}`);
      enable.push(...splitIds(await promptLine(`Enable additional ${label} ids (empty skips): `)));
      disable.push(...splitIds(await promptLine(`Disable ${label} ids (empty skips): `)));
    }
  }
  let claude = options.claude;
  console.log("skip: do not create or modify CLAUDE.md");
  console.log("block: insert one AGS block and preserve all other content");
  console.log("override: replace CLAUDE.md with the AGS pointer after a quarantine backup");
  if (mode === "install" && options.claude == null) {
    for (;;) {
      const answer = (await promptLine("CLAUDE.md integration: [s]kip, add managed [b]lock, or [o]verride file? [s] ")).toLowerCase();
      if (answer === "" || answer === "s" || answer === "skip") { claude = "skip"; break; }
      if (answer === "b" || answer === "block") { claude = "block"; break; }
      if (answer === "o" || answer === "override") { claude = "override"; break; }
      console.log("Choose s, b, or o.");
    }
  } else if (mode === "update") {
    const answer = (await promptLine(`CLAUDE.md mode is ${plan.claude}. [s]kip, [b]lock, [o]verride, or empty to keep: `)).toLowerCase();
    if (answer === "s" || answer === "skip") claude = "skip";
    else if (answer === "b" || answer === "block") claude = "block";
    else if (answer === "o" || answer === "override") claude = "override";
  }
  if (plan.proposal) {
    console.log("Host operational settings proposal:");
    console.log(JSON.stringify(plan.proposal, null, 2));
    const answer = (await promptLine("Confirm proposed git.mainBranch and checks? [y/N/none] ")).toLowerCase();
    if (answer === "y" || answer === "yes") {
      if (!options.mainBranch && plan.proposal.git?.mainBranch) options.mainBranch = plan.proposal.git.mainBranch;
      options.checks = options.checks || {};
      for (const key of ["type", "lint", "prettier"]) {
        if (!options.checks[key] && plan.proposal.checks?.[key]) options.checks[key] = plan.proposal.checks[key];
      }
    }
  }
  console.log(JSON.stringify({ enable, disable, claude, mainBranch: options.mainBranch, checks: options.checks }, null, 2));
  const confirmed = await confirmWrite(mode === "install" ? "Write this host install?" : "Write this host update?");
  return {
    confirmed,
    options: {
      enable: [...options.enable, ...enable],
      disable: [...options.disable, ...disable],
      claude,
      mainBranch: options.mainBranch,
      checks: options.checks,
    },
  };
}

async function confirmWrite(message) {
  if (!stdin.isTTY) return false;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`${message} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function hostCommand(action, rest, flags, list) {
  const allowed = {
    install: ["route", "yes", "id", "name", "enable", "disable", "claude", "no-claude", "claude-mode", "main-branch", "check-type", "check-lint", "check-prettier", "help"],
    update: ["route", "yes", "id", "name", "enable", "disable", "claude", "no-claude", "claude-mode", "main-branch", "check-type", "check-lint", "check-prettier", "help"],
    list: ["help"],
    sync: ["route", "all", "help"],
    repair: ["route", "host", "yes", "setting", "value", "remove-invalid", "restore-required", "overwrite-managed", "reset-managed", "help"],
    unregister: ["route", "host", "yes", "help"],
  };
  expectFlags(flags, allowed[action] || ["help"]);
  if (action === "sync") oneOf(flags, ["all", "route"]);
  if (action === "repair" || action === "unregister") oneOf(flags, ["host", "route"]);
  if (flags.claude === true) console.error("Warning: --claude is deprecated. Use --claude-mode block.");
  if (flags["no-claude"] === true) console.error("Warning: --no-claude is deprecated. Use --claude-mode skip.");
  const claudeChoices = [];
  if (typeof flags["claude-mode"] === "string") claudeChoices.push(flags["claude-mode"]);
  if (flags.claude === true) claudeChoices.push("block");
  if (flags["no-claude"] === true) claudeChoices.push("skip");
  if (flags["claude-mode"] === true) throw new AgsError("Missing value for --claude-mode");
  if (new Set(claudeChoices).size > 1) throw new AgsError("Use only one Claude mode");
  const claudeMode = claudeChoices[0] ?? null;
  if (claudeMode && !["skip", "block", "override"].includes(claudeMode)) {
    throw new AgsError("Claude mode must be skip, block, or override");
  }
  const root = CANONICAL_ROOT;
  const options = {
    yes: Boolean(flags.yes),
    id: flags.id,
    name: flags.name,
    enable: [...csv(flags.enable), ...list("enable")],
    disable: [...csv(flags.disable), ...list("disable")],
    claude: claudeMode,
    mainBranch: typeof flags["main-branch"] === "string" ? flags["main-branch"] : undefined,
    checks: {
      type: typeof flags["check-type"] === "string" ? flags["check-type"] : undefined,
      lint: typeof flags["check-lint"] === "string" ? flags["check-lint"] : undefined,
      prettier: typeof flags["check-prettier"] === "string" ? flags["check-prettier"] : undefined,
    },
  };
  if (action === "install") {
    const preview = installHost(root, routeOf(flags), { ...options, yes: false, claude: options.claude ?? "skip" });
    for (const warning of preview.warnings || []) console.error(`warning: ${warning}`);
    printHostResult(preview);
    const chosen = await chooseSelection(preview.plan, options, "install");
    if (!options.yes && stdin.isTTY) {
      if (!chosen.confirmed) throw new AgsError("Pass --yes to write the host install", { exitCode: 2 });
      const installed = installHost(root, routeOf(flags), { ...options, ...chosen.options, yes: true });
      for (const warning of installed.warnings || []) console.error(`warning: ${warning}`);
      printHostResult(installed);
      return;
    }
    const yes = options.yes || await confirmWrite("Write this host install?");
    if (!yes) throw new AgsError("Pass --yes to write the host install", { exitCode: 2 });
    const installed = installHost(root, routeOf(flags), { ...options, yes: true, claude: options.claude ?? "skip" });
    for (const warning of installed.warnings || []) console.error(`warning: ${warning}`);
    printHostResult(installed);
    return;
  }
  if (action === "update") {
    const preview = updateHost(root, routeOf(flags), { ...options, yes: false, claude: options.claude });
    for (const warning of preview.warnings || []) console.error(`warning: ${warning}`);
    console.log(JSON.stringify(preview.review, null, 2));
    const chosen = await chooseSelection(preview.review, options, "update");
    if (!options.yes && stdin.isTTY) {
      if (!chosen.confirmed) throw new AgsError("Pass --yes to write the host update", { exitCode: 2 });
      const updated = updateHost(root, routeOf(flags), { ...options, ...chosen.options, yes: true });
      for (const warning of updated.warnings || []) console.error(`warning: ${warning}`);
      console.log(JSON.stringify(updated.review, null, 2));
      return;
    }
    const yes = options.yes || await confirmWrite("Write this host update?");
    if (!yes) throw new AgsError("Pass --yes to write the host update", { exitCode: 2 });
    const updated = updateHost(root, routeOf(flags), { ...options, yes: true, claude: options.claude });
    for (const warning of updated.warnings || []) console.error(`warning: ${warning}`);
    console.log(JSON.stringify(updated.review, null, 2));
    return;
  }
  if (action === "list") {
    for (const host of listHosts(root)) console.log(`${host.id}\t${host.name}\t${host.path}`);
    return;
  }
  if (action === "sync") {
    const results = syncHosts(root, { route: routeOf(flags), all: Boolean(flags.all) });
    for (const result of results) {
      console.log(`${result.id || "unknown"}\t${result.status}\t${result.path}`);
      for (const issue of result.issues || []) console.error(`  ${issue}`);
      for (const warning of result.warnings || []) console.error(`  warning: ${warning}`);
      for (const hint of result.repairs || []) console.error(`  repair: ${hint}`);
    }
    if (results.some((result) => result.status === "repairable" || result.status === "collision" || result.status === "unreachable")) {
      throw new AgsError("sync found drift");
    }
    return;
  }
  if (action === "repair") {
    const setting = splitSetting(flags.setting, flags.value);
    const result = repairHost(root, flags.host || routeOf(flags), {
      yes: Boolean(flags.yes),
      setting: flags.setting ? setting[0] : undefined,
      value: setting[1],
      removeInvalid: Boolean(flags["remove-invalid"]),
      restoreRequired: Boolean(flags["restore-required"]),
      overwriteManaged: Boolean(flags["overwrite-managed"]),
      resetManaged: Boolean(flags["reset-managed"]),
    });
    console.log(JSON.stringify(result.targets, null, 2));
    if (!result.applied) throw new AgsError("Pass --yes to apply the repair", { exitCode: 2 });
    return;
  }
  if (action === "unregister") {
    const result = unregisterHost(root, { route: routeOf(flags), host: flags.host, yes: Boolean(flags.yes) });
    console.log(`${result.entry.id} ${result.applied ? "removed" : "not removed"}`);
    if (!result.applied) throw new AgsError("Pass --yes to unregister", { exitCode: 2 });
    return;
  }
  throw new AgsError(`Unknown host command: ${action || rest.join(" ")}`);
}

async function skillsCommand(action, flags, list) {
  const allowed = {
    list: ["help"],
    install: ["from", "id", "kind", "description", "keywords", "yes", "source", "replace", "route", "help"],
    reconcile: ["route", "all", "dry-run", "no-enable", "yes", "help"],
  };
  expectFlags(flags, allowed[action] || ["help"]);
  if (action === "reconcile") oneOf(flags, ["all", "route"]);
  const root = CANONICAL_ROOT;
  if (action === "list") {
    for (const skill of listSkills(root)) console.log(`${skill.id}\t${skill.kind}\t${skill.path}`);
    return;
  }
  if (action === "install") {
    const result = await installSkill(root, {
      from: flags.from,
      id: flags.id,
      kind: flags.kind,
      description: flags.description,
      keywords: csv(flags.keywords),
      source: flags.source,
      yes: Boolean(flags.yes),
      replace: Boolean(flags.replace),
      route: flags.route ? routeOf(flags) : undefined,
    });
    console.log(`${result.id} ${result.applied ? result.dest : "planned"}`);
    if (!result.applied) throw new AgsError("Pass --yes to install the skill", { exitCode: 2 });
    return;
  }
  if (action === "reconcile") {
    let noEnable = Boolean(flags["no-enable"]);
    if (!flags["dry-run"] && !flags.yes && !noEnable && stdin.isTTY) {
      const enable = await confirmWrite("Enable reconciled skills on the host?");
      if (!enable) noEnable = true;
    }
    return reconcile(root, {
      route: routeOf(flags),
      all: Boolean(flags.all),
      dryRun: Boolean(flags["dry-run"]),
      noEnable,
      yes: true,
    }).then((result) => {
      console.log(JSON.stringify(result.results, null, 2));
      if (!result.ok && !flags["dry-run"]) throw new AgsError("reconcile stopped on a collision or unreachable host");
    });
  }
  void list;
  throw new AgsError(`Unknown skills command: ${action}`);
}

function checkCommand(flags) {
  expectFlags(flags, ["route", "only", "help"]);
  const which = csv(flags.only);
  const results = runChecks(CANONICAL_ROOT, resolveRoute(routeOf(flags)), { which: which.length ? which : undefined });
  for (const result of results) {
    if (result.status === "not-configured") console.log(`${result.name}: not configured`);
    else console.log(`${result.name}: ${result.manager || ""} ${result.script || result.command || ""} exit ${result.exitCode ?? ""} ${result.status}`.replace(/\s+/g, " ").trim());
    if (result.diagnostics && result.status !== "passed" && result.status !== "failed") console.error(result.diagnostics);
  }
  if (checkFailed(results)) throw new AgsError("check failed");
}

function snapshotCommand(action, flags) {
  const root = CANONICAL_ROOT;
  if (action === "canonical") expectFlags(flags, ["out", "only", "except", "include-standard-excluded", "help"]);
  else expectFlags(flags, ["route", "out", "help"]);
  if (action === "canonical") {
    assertCanonicalAccess(root);
    const out = flags.out ? path.resolve(String(flags.out)) : path.join(root, ".tmp", "snapshots", "ags-canonical.zip");
    const result = writeCanonicalSnapshot(root, {
      only: csv(flags.only),
      except: csv(flags.except),
      out,
      includeStandardExcluded: flags["include-standard-excluded"] != null && flags["include-standard-excluded"] !== false,
    });
    console.log(`${result.path} ${result.bytes} bytes ${result.count} files`);
    return;
  }
  if (action) throw new AgsError(`Unknown snapshot command: ${action}`);
  assertCanonicalAccess(root);
  const hostRoot = resolveRoute(routeOf(flags));
  const { settings } = verifyRegistered(root, hostRoot);
  const catalog = loadCatalog(root);
  const out = flags.out ? path.resolve(flags.out) : path.join(hostRoot, ".tmp", "ags-snapshot.zip");
  const result = writeSnapshot(root, hostRoot, catalog, settings, out);
  for (const warning of result.manifest?.warnings || []) console.error(`warning: ${warning}`);
  console.log(`${result.path} ${result.bytes} bytes ${result.count} files`);
}

function diffCommand(action, rest, flags) {
  expectFlags(flags, ["route", "help"]);
  const hostRoot = resolveRoute(routeOf(flags));
  verifyRegistered(CANONICAL_ROOT, hostRoot);
  const [name, a, b] = rest;
  let result;
  if (action === "commits") result = writeDiff(hostRoot, name, "commits", a);
  else if (action === "range") result = writeDiff(hostRoot, name, "range", { from: a, to: b || "HEAD" });
  else if (action === "staged") result = writeDiff(hostRoot, name, "staged");
  else if (action === "changes") result = writeDiff(hostRoot, name, "changes");
  else if (action === "untracked") result = writeDiff(hostRoot, name, "untracked");
  else if (action === "current") result = writeDiff(hostRoot, name, "current", a);
  else throw new AgsError(`Unknown diff mode: ${action}`);
  console.log(`${result.path}`);
  console.log(`bytes: ${result.bytes}`);
  console.log(`source: ${result.summary}`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  if (error.written?.length) console.error(`Incomplete files: ${error.written.join(", ")}`);
  process.exitCode = error.exitCode || 1;
});
