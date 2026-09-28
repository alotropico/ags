import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { acquireLocks } from "./reports.mjs";
import { AgsError, contentHash, insidePath, posix, readFileOrNull, sha256, shortHash, writeAtomic } from "./util.mjs";

export const CHOICES = ["promote", "restore", "ignore", "disable"];
export const HASH_KEYS = ["B", "H", "Tc", "S"];
export const AGENT_LINE = "Agents: show this plan to the user and rerun only after the user confirms. Never pass --plan for a plan the user has not seen.";

export function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

export function planItem({ path: itemPath, kind, action = null, choices = null, hashes = {}, detail = undefined }) {
  const item = { path: posix(itemPath), kind };
  const kept = {};
  for (const key of HASH_KEYS) if (hashes[key] !== undefined) kept[key] = hashes[key];
  if (Object.keys(kept).length) item.hashes = kept;
  if (choices?.length) item.choices = [...choices];
  else item.action = action;
  if (detail !== undefined) item.detail = detail;
  return item;
}

export function normalizePlan(plan) {
  const items = [...(plan.items || [])].map((item) => ({ ...item, path: posix(item.path) }));
  items.sort((a, b) => (a.path === b.path ? String(a.kind).localeCompare(String(b.kind)) : a.path < b.path ? -1 : 1));
  return { header: plan.header || {}, items };
}

export function planDigest(plan) {
  return sha256(canonicalJson(normalizePlan(plan))).slice(0, 12);
}

export function planWrites(plan) {
  return plan.items.length > 0;
}

function cell(value) {
  return value == null ? "-" : String(value);
}

export function formatPlan(plan, digest) {
  const lines = [];
  if (plan.header.title) lines.push(plan.header.title);
  for (const note of plan.header.notes || []) lines.push(note);
  if (!plan.items.length) {
    lines.push("Nothing to do.");
    return lines;
  }
  const hashKeys = HASH_KEYS.filter((key) => plan.items.some((item) => item.hashes && key in item.hashes));
  const rows = [["Path", "Kind", "Action", ...hashKeys]];
  for (const item of plan.items) {
    const action = item.choices ? `choose ${item.choices.join("/")}` : cell(item.action);
    rows.push([item.path, cell(item.kind), action, ...hashKeys.map((key) => (item.hashes && key in item.hashes ? shortHash(item.hashes[key]) : ""))]);
  }
  const widths = rows[0].map((_, col) => Math.max(...rows.map((row) => row[col].length)));
  for (const row of rows) lines.push(row.map((value, col) => value.padEnd(widths[col])).join("  ").trimEnd());
  lines.push(`Digest: ${digest}`);
  return lines;
}

export function quoteArg(value) {
  const text = String(value);
  return /^[\w@%+=:,./\\-]+$/.test(text) ? text : `"${text.replaceAll('"', '\\"')}"`;
}

export function commandLine(args) {
  return ["ags", ...args].map(quoteArg).join(" ");
}

export function parseDecide(values = []) {
  const map = new Map();
  for (const value of values) {
    const eq = String(value).lastIndexOf("=");
    const itemPath = eq > 0 ? posix(value.slice(0, eq)) : "";
    const choice = eq > 0 ? value.slice(eq + 1) : "";
    if (!itemPath || !CHOICES.includes(choice)) {
      throw new AgsError(`Invalid --decide value: ${value}. Expected <path>=<${CHOICES.join("|")}>`, { exitCode: 2 });
    }
    if (map.has(itemPath) && map.get(itemPath) !== choice) throw new AgsError(`Conflicting --decide values for ${itemPath}`, { exitCode: 2 });
    map.set(itemPath, choice);
  }
  return map;
}

export function parseDecideAll(value) {
  if (value == null) return null;
  if (!CHOICES.includes(value)) throw new AgsError(`Invalid --decide-all value: ${value}. Expected one of ${CHOICES.join(", ")}`, { exitCode: 2 });
  return value;
}

export function bindDecisions(plan, { decide = new Map(), decideAll = null } = {}) {
  const decisions = new Map();
  const byPath = new Map(plan.items.filter((item) => item.choices).map((item) => [item.path, item]));
  for (const [itemPath, choice] of decide) {
    const item = byPath.get(itemPath);
    if (!item) throw new AgsError(`--decide ${itemPath}=${choice}: no item in the plan at ${itemPath} asks for a choice`, { exitCode: 2 });
    if (!item.choices.includes(choice)) throw new AgsError(`--decide ${itemPath}=${choice}: ${itemPath} offers ${item.choices.join(", ")}`, { exitCode: 2 });
    decisions.set(itemPath, choice);
  }
  for (const item of byPath.values()) {
    if (!decisions.has(item.path) && decideAll && item.choices.includes(decideAll)) decisions.set(item.path, decideAll);
  }
  const pending = [...byPath.values()].filter((item) => !decisions.has(item.path));
  return { decisions, pending };
}

export function faultPoints(index, count) {
  const names = [];
  if (index === 0) names.push("first");
  if (index === Math.floor((count - 1) / 2)) names.push("middle");
  if (index === count - 1) names.push("last");
  return names;
}

export function checkFault(name, point, env = process.env) {
  const wanted = env.AGS_TEST_FAULT;
  if (!wanted) return;
  if (wanted === `${name}:${point}:crash`) process.exit(1);
  if (wanted === `${name}:${point}`) throw new AgsError(`Injected fault at ${name}:${point}`);
}

export function realTerminal() {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  return {
    interactive,
    async question(prompt) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        return await rl.question(prompt);
      } finally {
        rl.close();
      }
    },
    log(line = "") {
      process.stdout.write(`${line}\n`);
    },
    warn(line = "") {
      process.stderr.write(`${line}\n`);
    },
  };
}

const STOP = Symbol("stop");

async function askDecisions(terminal, plan, decisions) {
  let sameForAll = null;
  for (const item of plan.items.filter((entry) => entry.choices && !decisions.has(entry.path))) {
    if (sameForAll && item.choices.includes(sameForAll)) {
      decisions.set(item.path, sameForAll);
      continue;
    }
    for (;;) {
      const answer = String(await terminal.question(`${item.path} (${item.kind}${item.detail ? `, ${item.detail}` : ""}): ${item.choices.join(", ")}; add " all" for the same answer on all remaining; or stop: `)).trim().toLowerCase();
      const [choice, all] = answer.split(/\s+/);
      if (choice === "stop") return STOP;
      if (item.choices.includes(choice) && (all === undefined || all === "all")) {
        decisions.set(item.path, choice);
        if (all === "all") sameForAll = choice;
        break;
      }
      terminal.warn(`Answer one of ${item.choices.join(", ")}, optionally followed by "all", or stop.`);
    }
  }
  for (;;) {
    const answer = String(await terminal.question("Apply this plan? yes or stop: ")).trim().toLowerCase();
    if (answer === "yes" || answer === "y") return decisions;
    if (answer === "stop" || answer === "no" || answer === "n") return STOP;
    terminal.warn("Answer yes or stop.");
  }
}

function rerunArgs(op, digest, { decisions = new Map(), decideAll = null, pending = [] } = {}) {
  const args = [...op.rerunArgs, "--plan", digest];
  for (const [itemPath, choice] of decisions) args.push("--decide", `${itemPath}=${choice}`);
  if (decideAll) args.push("--decide-all", decideAll);
  for (const item of pending) args.push("--decide", `${item.path}=<${item.choices.join("|")}>`);
  return args;
}

function printNeedsDecision(terminal, plan, digest, args, pending) {
  for (const line of formatPlan(plan, digest)) terminal.log(line);
  if (pending.length) terminal.log(`Decisions needed: ${pending.map((item) => item.path).join(", ")}`);
  terminal.log(`Rerun: ${commandLine(args)}`);
  terminal.log(AGENT_LINE);
}

export async function runOperation(op, { terminal = realTerminal(), dryRun = false, plan: givenDigest = null, decide = new Map(), decideAll = null, env = process.env } = {}) {
  let state = await op.inspect();
  let plan = normalizePlan(op.plan(state));
  let digest = planDigest(plan);

  if (!planWrites(plan)) {
    for (const line of formatPlan(plan, digest)) terminal.log(line);
    return 0;
  }
  if (dryRun) {
    for (const line of formatPlan(plan, digest)) terminal.log(line);
    return 0;
  }

  let decisions;
  let bound = null;
  const digestMatches = givenDigest != null && givenDigest === digest;
  if (givenDigest != null && !digestMatches) {
    terminal.warn(`The plan changed since digest ${givenDigest}; earlier decisions are discarded.`);
  }
  if (digestMatches) {
    bound = bindDecisions(plan, { decide, decideAll });
    if (!bound.pending.length) decisions = bound.decisions;
    else if (!terminal.interactive) {
      printNeedsDecision(terminal, plan, digest, rerunArgs(op, digest, { decisions: bound.decisions, pending: bound.pending }), bound.pending);
      return 3;
    }
  }
  if (!decisions) {
    if (!terminal.interactive) {
      const pending = plan.items.filter((item) => item.choices);
      printNeedsDecision(terminal, plan, digest, rerunArgs(op, digest, { pending }), pending);
      return 3;
    }
    for (const line of formatPlan(plan, digest)) terminal.log(line);
    const answered = await askDecisions(terminal, plan, new Map(bound?.decisions));
    if (answered === STOP) {
      terminal.log("Stopped. Nothing was written.");
      return 0;
    }
    decisions = answered;
  }

  let release;
  try {
    release = await acquireLocks(op.locks(plan, state), op.command);
  } catch (error) {
    terminal.warn(error.message);
    return 1;
  }

  const completed = [];
  try {
    for (;;) {
      const nextState = await op.inspect();
      const nextPlan = normalizePlan(op.plan(nextState));
      const nextDigest = planDigest(nextPlan);
      state = nextState;
      if (nextDigest === digest) break;
      plan = nextPlan;
      digest = nextDigest;
      if (!planWrites(plan)) {
        for (const line of formatPlan(plan, digest)) terminal.log(line);
        return 0;
      }
      terminal.warn("The plan changed before it could be applied; earlier decisions are discarded.");
      if (!terminal.interactive) {
        const pending = plan.items.filter((item) => item.choices);
        printNeedsDecision(terminal, plan, digest, rerunArgs(op, digest, { pending }), pending);
        return 3;
      }
      for (const line of formatPlan(plan, digest)) terminal.log(line);
      const answered = await askDecisions(terminal, plan, new Map());
      if (answered === STOP) {
        terminal.log("Stopped. Nothing was written.");
        return 0;
      }
      decisions = answered;
    }

    const ctx = {
      plan,
      state,
      digest,
      decisions,
      terminal,
      completed,
      fault: (point) => checkFault(op.name, point, env),
      faultEach: (stage, index, count) => {
        for (const which of faultPoints(index, count)) checkFault(op.name, `${stage}-${which}`, env);
      },
      done: (label) => completed.push(label),
    };
    const summary = (await op.apply(ctx)) || [];
    for (const line of summary) terminal.log(line);
    return 0;
  } catch (error) {
    const planned = op.writeLabels ? op.writeLabels(plan, decisions) : plan.items.map((item) => item.path);
    const pending = planned.filter((label) => !completed.includes(label));
    terminal.warn(`Failed: ${error.message}`);
    terminal.warn(`Completed: ${completed.length ? completed.join(", ") : "none"}`);
    terminal.warn(`Not completed: ${pending.length ? pending.join(", ") : "none"}`);
    terminal.warn(`Rerun: ${commandLine(op.failureArgs ? op.failureArgs(plan) : op.rerunArgs)}`);
    return 1;
  } finally {
    release();
  }
}

export function writeFileAt(root, rel, content) {
  writeAtomic(insidePath(root, rel), content);
}

export function removeFileAt(root, rel) {
  const abs = insidePath(root, rel);
  fs.rmSync(abs, { force: true });
  let dir = path.dirname(abs);
  while (path.resolve(dir) !== path.resolve(root)) {
    try {
      if (fs.readdirSync(dir).length) break;
      fs.rmdirSync(dir);
    } catch {
      break;
    }
    dir = path.dirname(dir);
  }
}

export function verifyWrites(root, expected) {
  const wrong = [];
  for (const { path: rel, content } of expected) {
    const actual = readFileOrNull(insidePath(root, rel));
    const want = content == null ? null : contentHash(Buffer.isBuffer(content) ? content : Buffer.from(content));
    if (contentHash(actual) !== want) wrong.push(rel);
  }
  if (wrong.length) throw new AgsError(`Verification failed; these paths differ from the plan: ${wrong.join(", ")}`);
}
