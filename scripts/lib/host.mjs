import fs from "node:fs";
import path from "node:path";
import {
  applySelectionFlags,
  hostRulePath,
  hostSkillDir,
  latestRelease,
  loadCatalog,
  optInItems,
  parseFrontmatter,
  resolveSelection,
  rulePath,
  skillDir,
  tagSource,
  textOf,
} from "./catalog.mjs";
import { CONFIG_REL, configText, mergeConfig, missingRequired, newConfig, parseSets, readConfig, setAgsVersion, validateConfig, writeSelection } from "./config.mjs";
import { detectEvidence } from "./packages.mjs";
import { planItem, runOperation, verifyWrites, writeFileAt } from "./operation.mjs";
import { applyExclude, applyMoves, backupExcludeInto, cleanupPrompt, hostConfigState, inspectSetup, prepareItems, resolveHost, setupNotes } from "./prepare.mjs";
import { analyzeBlock, BLOCK_KEY, buildIndex, EXCLUDE_KEY, inspectExclude, placeBlock, renderAgsBlock } from "./render.mjs";
import { findHost, loadRegistry, saveRegistry } from "./registry.mjs";
import { operationLocks } from "./reports.mjs";
import { AgsError, AGS_ROOT, contentHash, displayPath, git, posix, readFileOrNull, samePath, slug, slugError, writeAtomic } from "./util.mjs";

export const REGISTRY_KEY = "hosts.yaml";
export const VERSION_KEY = "agsVersion";

function abs(root, rel) {
  return path.join(root, ...posix(rel).split("/"));
}

function listFiles(root, rel) {
  const dir = abs(root, rel);
  let stat;
  try {
    stat = fs.lstatSync(dir);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(root, child));
    else if (entry.isFile()) out.push(child);
  }
  return out.sort();
}

export function requireRelease(agsRoot) {
  const version = latestRelease(agsRoot);
  if (!version) throw new AgsError("AGS has no release tag yet. Release one with ags version bump first.");
  return version;
}

const releaseCache = new Map();

export function releaseInputs(agsRoot, version) {
  const key = `${path.resolve(agsRoot).toLowerCase()}@${version}@${git(["rev-parse", `refs/tags/v${version}`], agsRoot).stdout.trim()}`;
  if (!releaseCache.has(key)) releaseCache.set(key, { version, catalog: loadCatalog(agsRoot, { version }), source: tagSource(agsRoot, version) });
  return releaseCache.get(key);
}

export function itemFiles(source, catalog, id) {
  const files = new Map();
  if (catalog.rules.some((entry) => entry.id === id)) {
    const buffer = source.readFile(rulePath(id));
    if (buffer != null) files.set(hostRulePath(id), buffer);
    return files;
  }
  for (const rel of source.listFiles(skillDir(id))) files.set(`${hostSkillDir(id)}${rel.slice(skillDir(id).length)}`, source.readFile(rel));
  return files;
}

export function targetMaterial(source, catalog, selection) {
  const files = new Map();
  for (const entry of catalog.rules) {
    if (entry.tier !== "soft" || !selection.rules.includes(entry.id)) continue;
    const found = itemFiles(source, catalog, entry.id);
    if (!found.size) throw new AgsError(`Missing ${rulePath(entry.id)} in ${source.label}`);
    for (const [rel, buffer] of found) files.set(rel, buffer);
  }
  for (const id of selection.skills) {
    const found = itemFiles(source, catalog, id);
    if (!found.size) throw new AgsError(`Missing ${skillDir(id)}/ in ${source.label}`);
    for (const [rel, buffer] of found) files.set(rel, buffer);
  }
  return files;
}

export function hostItemFiles(hostRoot, catalog, id, gone = new Set()) {
  if (catalog.rules.some((entry) => entry.id === id)) {
    const rel = hostRulePath(id);
    return readFileOrNull(abs(hostRoot, rel)) != null && !gone.has(rel) ? [rel] : [];
  }
  return listFiles(hostRoot, hostSkillDir(id)).filter((rel) => !gone.has(rel));
}

export function collisions(hostRoot, source, catalog, hostId, { ids = null, gone = new Set() } = {}) {
  const found = [];
  const wanted = ids ?? [...catalog.rules, ...catalog.skills].map((entry) => entry.id);
  for (const id of wanted) {
    const present = hostItemFiles(hostRoot, catalog, id, gone);
    if (!present.length) continue;
    const target = itemFiles(source, catalog, id);
    const allEqual = present.every((rel) => target.has(rel) && contentHash(readFileOrNull(abs(hostRoot, rel))) === contentHash(target.get(rel)));
    if (allEqual) continue;
    const isRule = catalog.rules.some((entry) => entry.id === id);
    found.push({ id, kind: isRule ? "rule" : "skill", from: isRule ? hostRulePath(id) : `${hostSkillDir(id)}/`, to: isRule ? hostRulePath(`${hostId}-${id}`) : `${hostSkillDir(`${hostId}-${id}`)}/`, name: `${hostId}-${id}` });
  }
  return found;
}

export function collisionMessage(found) {
  const lines = ["Host items use AGS ids. Nothing was written. Rename each item, then rerun:"];
  for (const item of found) {
    lines.push(item.kind === "rule" ? `- rename ${item.from} to ${item.to}` : `- rename ${item.from} to ${item.to} and change name in its SKILL.md to ${item.name}`);
  }
  lines.push("Or remove the item, or give it another id that is not an AGS id.");
  return lines.join("\n");
}

export function ignoredPaths(hostRoot, rels) {
  const result = git(["check-ignore", "--no-index", "-v", "--stdin"], hostRoot, { allow: [0, 1], input: `${rels.join("\n")}\n` });
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(([source]) => !/^.*:\d+:!/.test(source))
    .map(([source, target]) => ({ source, path: posix(target) }));
}

export function refuseIgnored(hostRoot, rels) {
  const found = ignoredPaths(hostRoot, rels);
  if (!found.length) return;
  throw new AgsError(`Git ignores host guidance paths, so this host is unsupported until the rules change:\n${found.map((item) => `- ${item.path} (${item.source})`).join("\n")}`);
}

export function hostRules(hostRoot, agsIds, gone = new Set()) {
  return listFiles(hostRoot, ".agents/rules")
    .filter((rel) => rel.endsWith(".md") && rel.split("/").length === 3 && !gone.has(rel))
    .map((rel) => ({ id: path.posix.basename(rel, ".md"), rel }))
    .filter((rule) => !agsIds.has(rule.id))
    .map((rule) => ({ id: rule.id, description: parseFrontmatter(textOf(readFileOrNull(abs(hostRoot, rule.rel)))).data?.description ?? null }));
}

export function renderHostBlock({ hostRoot, source, catalog, selection, version, gone = new Set() }) {
  const template = textOf(source.readFile("templates/agents-block.md"));
  if (template == null) throw new AgsError(`Missing templates/agents-block.md in ${source.label}`);
  const strongRules = catalog.rules.filter((entry) => entry.tier === "strong" && selection.rules.includes(entry.id)).map((entry) => textOf(source.readFile(rulePath(entry.id))) ?? "");
  const agsRules = catalog.rules
    .filter((entry) => entry.tier === "soft" && selection.rules.includes(entry.id))
    .map((entry) => ({ id: entry.id, description: parseFrontmatter(textOf(source.readFile(rulePath(entry.id)))).data?.description ?? "" }));
  const agsIds = new Set([...catalog.rules, ...catalog.skills].map((entry) => entry.id));
  const { index, warnings } = buildIndex({ agsRules, hostRules: hostRules(hostRoot, agsIds, gone) });
  const block = renderAgsBlock({ template, version, strongRules, index });
  return { ...block, warnings: block.warning ? [...warnings, block.warning] : warnings };
}

export function planBlock(hostRoot, rendered, { gone = new Set() } = {}) {
  const buffer = gone.has(BLOCK_KEY) ? null : readFileOrNull(abs(hostRoot, BLOCK_KEY));
  const current = buffer == null ? null : buffer.toString("utf8");
  const analysis = analyzeBlock(current);
  if (analysis.kind === "malformed") throw new AgsError("AGENTS.md has unbalanced or repeated AGS markers. Fix them by hand, then rerun.");
  const next = placeBlock(current, rendered.text);
  if (current != null && contentHash(Buffer.from(current)) === contentHash(Buffer.from(next))) return { current, next, analysis, action: null };
  if (analysis.kind === "edited") return { current, next, analysis, choices: ["restore"] };
  const action = current == null ? "create" : analysis.kind === "missing" ? "insert" : "regenerate";
  return { current, next, analysis, action };
}

function blockItem(block) {
  if (block.choices) return planItem({ path: BLOCK_KEY, kind: "block", choices: block.choices, detail: "edited block", hashes: { S: contentHash(Buffer.from(block.next)) } });
  if (!block.action) return null;
  return planItem({ path: BLOCK_KEY, kind: "block", action: block.action, hashes: { S: contentHash(Buffer.from(block.next)) } });
}

function excludeItem(exclude) {
  if (exclude.need === "add") return planItem({ path: EXCLUDE_KEY, kind: "exclude block", action: "add /.tmp/" });
  if (exclude.need === "restore") return planItem({ path: EXCLUDE_KEY, kind: "exclude block", choices: ["restore"], detail: "edited region" });
  return null;
}

function templateConfig(agsRoot, source) {
  const fromTag = textOf(source.readFile("templates/ags.yaml"));
  if (fromTag != null) return fromTag;
  return fs.readFileSync(path.join(agsRoot, "templates", "ags.yaml"), "utf8");
}

function selectionSummary(selection) {
  return `Selection: rules ${selection.rules.join(", ") || "none"}; skills ${selection.skills.join(", ") || "none"}.`;
}

export function settingsError(catalog, missing, rerunArgs) {
  const declared = new Map((catalog.settings || []).map((setting) => [setting.key, setting]));
  const lines = ["Required settings have no value:"];
  for (const key of missing) lines.push(`- ${key}: ${declared.get(key)?.description ?? ""}`);
  lines.push(`Rerun with the values: ags ${[...rerunArgs, ...missing.map((key) => `--set ${key}=<value>`)].join(" ")}`);
  const error = new AgsError(lines.join("\n"), { exitCode: 3 });
  error.missing = missing;
  return error;
}

export function installOperation({ agsRoot = AGS_ROOT, route, id = null, name = null, enable = [], disable = [], sets = [], includeNested = false, rerunArgs }) {
  const hostRoot = resolveHost(route, { agsRoot, command: "ags host install" });
  const op = {
    name: "install",
    command: "host install",
    rerunArgs,
    hostRoot,
    enable: [...enable],
    disable: [...disable],
    sets: [...sets],
    includeNested,
    inspect() {
      const configState = hostConfigState(hostRoot);
      if (configState?.installed) throw new AgsError(`${displayPath(hostRoot)} already has an AGS installation (.agents/ags.yaml has agsVersion). Use ags host update.`);
      const resume = Boolean(configState);
      const version = requireRelease(agsRoot);
      const { catalog, source } = releaseInputs(agsRoot, version);
      const setMap = parseSets(op.sets, catalog);

      let setup = null;
      let doc;
      let hostId;
      let configCurrent = null;
      if (resume) {
        const config = readConfig(hostRoot);
        doc = config.doc;
        configCurrent = config.text;
        hostId = config.data.host;
        if (slugError(hostId, "host")) throw new AgsError(`.agents/ags.yaml: ${slugError(hostId, "host")}`);
        if (id != null && id !== hostId) throw new AgsError(`This install resumes host ${hostId}, recorded in .agents/ags.yaml; --id ${id} does not match.`);
      } else {
        setup = inspectSetup(hostRoot, { includeNested: op.includeNested });
        hostId = id ?? slug(path.basename(hostRoot));
        const problem = slugError(hostId, "host id");
        if (problem) throw new AgsError(`${problem}. Pass --id <slug>.`, { exitCode: id != null ? 2 : 1 });
        doc = newConfig(templateConfig(agsRoot, source), { host: hostId });
      }
      const gone = new Set(setup ? setup.moves.map((move) => move.rel) : []);

      const flagged = applySelectionFlags(catalog, doc.toJS() ?? {}, { enable: op.enable, disable: op.disable });
      for (const group of flagged.changed) {
        writeSelection(doc, group, "enabled", flagged.selection[group].enabled);
        writeSelection(doc, group, "disabled", flagged.selection[group].disabled);
      }
      const selection = resolveSelection(catalog, doc.toJS() ?? {}, detectEvidence(hostRoot));
      if (selection.errors.length) throw new AgsError(`Invalid selection:\n${selection.errors.map((line) => `- ${line}`).join("\n")}`);
      mergeConfig(doc, catalog, { skillIds: selection.skills, sets: setMap });
      const data = doc.toJS() ?? {};
      const errors = validateConfig(data, catalog, { hostRoot });
      if (errors.length) throw new AgsError(`Invalid .agents/ags.yaml:\n${errors.map((line) => `- ${line}`).join("\n")}`);
      const missing = missingRequired(catalog, data, selection.skills);
      if (missing.length) throw settingsError(catalog, missing, op.rerunArgs);

      const found = collisions(hostRoot, source, catalog, hostId, { gone });
      if (found.length) throw new AgsError(collisionMessage(found));
      const material = targetMaterial(source, catalog, selection);
      refuseIgnored(hostRoot, [BLOCK_KEY, ".agents/", CONFIG_REL, ...material.keys()]);

      const managed = [];
      for (const [rel, buffer] of material) {
        const current = gone.has(rel) ? null : readFileOrNull(abs(hostRoot, rel));
        if (current != null && contentHash(current) === contentHash(buffer)) continue;
        managed.push({ rel, buffer, hash: contentHash(buffer), current: contentHash(current) });
      }
      const rendered = renderHostBlock({ hostRoot, source, catalog, selection, version, gone });
      const block = planBlock(hostRoot, rendered, { gone });

      const registry = loadRegistry(agsRoot);
      const byId = findHost(registry, { id: hostId });
      const byPath = findHost(registry, { hostPath: hostRoot });
      if (byId && !samePath(byId.path, hostRoot)) throw new AgsError(`Registry entry ${hostId} already holds ${byId.path}. Pass another --id.`);
      if (byPath && byPath.id !== hostId) throw new AgsError(`Registry entry ${byPath.id} already holds ${displayPath(hostRoot)}.`);
      const hostName = name ?? byId?.name ?? path.basename(hostRoot);

      return {
        hostRoot,
        version,
        catalog,
        resume,
        setup,
        gone,
        hostId,
        hostName,
        doc,
        configCurrent,
        configNext: configText(doc),
        selection,
        managed,
        block,
        warnings: rendered.warnings,
        exclude: setup ? setup.exclude : inspectExclude(hostRoot),
        register: !byId,
      };
    },
    plan(state) {
      const items = [];
      if (state.setup) items.push(...prepareItems(state.setup, { operation: "install" }).filter((item) => item.path !== EXCLUDE_KEY));
      const exclude = excludeItem(state.exclude);
      if (exclude) items.push(exclude);
      const configAction = !state.resume ? "create" : state.configCurrent === state.configNext ? "set agsVersion" : "update";
      items.push(planItem({ path: CONFIG_REL, kind: "settings", action: configAction, hashes: { S: contentHash(Buffer.from(state.configNext)) } }));
      for (const item of state.managed) items.push(planItem({ path: item.rel, kind: "managed", action: "add", hashes: { Tc: item.hash } }));
      const block = blockItem(state.block);
      if (block) items.push(block);
      if (state.register) items.push(planItem({ path: REGISTRY_KEY, kind: "registry", action: `add ${state.hostId} (${state.hostName})` }));
      const notes = [];
      if (state.resume) notes.push(`Resuming the interrupted install of host ${state.hostId}.`);
      notes.push(selectionSummary(state.selection));
      if (state.setup) notes.push(...setupNotes(state.setup));
      notes.push(...state.warnings.map((line) => `Warning: ${line}`));
      return {
        header: { title: `ags host install: ${posix(hostRoot)} at ${state.version}`, operation: "install", host: state.hostId, to: state.version, selection: { rules: state.selection.rules, skills: state.selection.skills }, notes },
        items,
      };
    },
    locks: () => operationLocks({ hostRoot, agsRoot }),
    writeLabels(plan) {
      return [...plan.items.map((item) => item.path), VERSION_KEY];
    },
    async apply(ctx) {
      const state = ctx.state;
      ctx.fault("after-host-lock");
      applyExclude(ctx, state, { backupExclude: backupExcludeInto(hostRoot, "install") });
      ctx.fault("after-exclude-block");
      let folder = null;
      if (state.setup && (state.setup.moves.length || state.setup.continuing)) {
        folder = applyMoves(ctx, state.setup, { operation: "install", digest: ctx.digest, to: state.version });
        ctx.fault("after-manifest-complete");
      }
      const expected = [];
      writeAtomic(abs(hostRoot, CONFIG_REL), state.configNext);
      ctx.done(CONFIG_REL);
      expected.push({ path: CONFIG_REL, content: state.configNext });
      ctx.fault("after-ags-yaml");
      state.managed.forEach((item, index) => {
        writeFileAt(hostRoot, item.rel, item.buffer);
        ctx.done(item.rel);
        expected.push({ path: item.rel, content: item.buffer });
        ctx.faultEach("after-managed-write", index, state.managed.length);
      });
      if (state.block.action || ctx.decisions.get(BLOCK_KEY) === "restore") {
        writeAtomic(abs(hostRoot, BLOCK_KEY), state.block.next);
        ctx.done(BLOCK_KEY);
        expected.push({ path: BLOCK_KEY, content: state.block.next });
      }
      ctx.fault("after-agents-block");
      verifyWrites(hostRoot, expected);
      if (state.register) {
        const registry = loadRegistry(agsRoot);
        registry.hosts.push({ id: state.hostId, name: state.hostName, path: hostRoot, ignored: [], promoted: [] });
        saveRegistry(agsRoot, registry);
        ctx.done(REGISTRY_KEY);
      }
      ctx.fault("after-registry");
      setAgsVersion(state.doc, state.version);
      writeAtomic(abs(hostRoot, CONFIG_REL), configText(state.doc));
      ctx.done(VERSION_KEY);
      const summary = [
        `Installed AGS ${state.version} into ${displayPath(hostRoot)} as host ${state.hostId}: ${state.managed.length} managed file${state.managed.length === 1 ? "" : "s"} written.`,
        "AGS never commits. Review and commit AGENTS.md and .agents/ in the host.",
      ];
      if (folder && state.setup.moves.length) summary.push("", cleanupPrompt(folder.rel));
      return summary;
    },
  };
  return op;
}

async function askOptIns(terminal, catalog) {
  const items = optInItems(catalog);
  if (!items.length) return [];
  for (;;) {
    const answer = String(await terminal.question(`Opt-in items: ${items.join(", ")}. Enable which? Comma-separated ids, or empty for none: `)).trim();
    const ids = answer ? answer.split(",").map((value) => value.trim()).filter(Boolean) : [];
    const unknown = ids.filter((value) => !items.includes(value));
    if (!unknown.length) return ids;
    terminal.warn(`Not opt-in items: ${unknown.join(", ")}.`);
  }
}

export async function hostInstall({ agsRoot = AGS_ROOT, route, id, name, enable = [], disable = [], sets = [], includeNested = false, rerunArgs, terminal, options }) {
  const op = installOperation({ agsRoot, route, id, name, enable, disable, sets, includeNested, rerunArgs });
  if (terminal.interactive && !options.dryRun) {
    const resume = Boolean(hostConfigState(op.hostRoot));
    if (!resume && !enable.length && !disable.length) {
      const version = requireRelease(agsRoot);
      op.enable.push(...(await askOptIns(terminal, releaseInputs(agsRoot, version).catalog)));
    }
    try {
      op.inspect();
    } catch (error) {
      if (!error.missing) throw error;
      const { catalog } = releaseInputs(agsRoot, requireRelease(agsRoot));
      const declared = new Map((catalog.settings || []).map((setting) => [setting.key, setting]));
      for (const key of error.missing) {
        const value = String(await terminal.question(`${key} (${declared.get(key)?.description ?? "required"}): `)).trim();
        op.sets.push(`${key}=${value}`);
      }
    }
  }
  return runOperation(op, { terminal, ...options });
}
