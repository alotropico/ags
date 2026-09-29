import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { backupFile, createBackupFolder, trackedPaths, writeManifest } from "./backup.mjs";
import {
  allIds,
  applySelectionFlags,
  companionParents,
  compareVersions,
  hostRulePath,
  hostSkillDir,
  latestRelease,
  loadCatalog,
  optInItems,
  parseFrontmatter,
  releaseVersions,
  resolveSelection,
  rulePath,
  skillDir,
  tagSource,
  textOf,
  VERSION_PATTERN,
} from "./catalog.mjs";
import { appendUnreleasedNote, gitOperationInProgress } from "./version.mjs";
import { CONFIG_REL, configText, mergeConfig, missingRequired, newConfig, parseSets, readConfig, setAgsVersion, validateConfig, writeSelection } from "./config.mjs";
import { detectEvidence } from "./packages.mjs";
import { migrationChain } from "./migrations.mjs";
import { normalizePlan, planDigest, planItem, removeFileAt, runOperation, verifyWrites, writeFileAt } from "./operation.mjs";
import { applyExclude, applyMoves, backupExcludeInto, cleanupPrompt, hostConfigState, inspectSetup, prepareItems, resolveHost, setupNotes } from "./prepare.mjs";
import { analyzeBlock, BLOCK_KEY, buildIndex, EXCLUDE_KEY, inspectExclude, placeBlock, renderAgsBlock } from "./render.mjs";
import { findHost, loadRegistry, saveRegistry } from "./registry.mjs";
import { operationLocks } from "./reports.mjs";
import { AgsError, AGS_ROOT, contentHash, displayPath, git, insidePath, posix, readFileOrNull, samePath, slug, slugError, writeAtomic } from "./util.mjs";

export const REGISTRY_KEY = "hosts.yaml";
export const VERSION_KEY = "agsVersion";

function abs(root, rel) {
  return insidePath(root, rel);
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
    .filter(([source]) => {
      const pattern = source.match(/^.*:\d+:(.*)$/)?.[1]?.trim();
      return Boolean(pattern) && !pattern.startsWith("!");
    })
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
  if (block.choices) return planItem({ path: BLOCK_KEY, kind: "block", choices: block.choices, detail: `${block.analysis.kind} block`, hashes: { S: contentHash(Buffer.from(block.next)) } });
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
      refuseIgnored(hostRoot, [BLOCK_KEY, ".agents/", CONFIG_REL, ...material.keys(), ...listFiles(hostRoot, ".agents").filter((rel) => !gone.has(rel))]);

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
      const blockWrite = Boolean(state.block.action) || ctx.decisions.get(BLOCK_KEY) === "restore";
      const overwritten = [
        ...(state.configCurrent != null ? [CONFIG_REL] : []),
        ...state.managed.filter((item) => item.current != null).map((item) => item.rel),
        ...(blockWrite && state.block.current != null ? [BLOCK_KEY] : []),
      ];
      let backupFolder = null;
      if (overwritten.length) {
        backupFolder = createBackupFolder(hostRoot, "install");
        const tracked = trackedPaths(hostRoot, overwritten);
        const files = overwritten.map((rel) => backupFile(hostRoot, backupFolder, rel, { tracked: tracked.has(rel) }));
        writeManifest(backupFolder, { operation: "install", from: null, to: state.version, digest: ctx.digest, files });
      }
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
      if (blockWrite) {
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
      if (backupFolder) summary.push(`Backups: ${backupFolder.rel}`);
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

async function promptMissingSettings(terminal, op, catalogOf) {
  try {
    op.inspect();
  } catch (error) {
    if (!error.missing) throw error;
    const declared = new Map((catalogOf().settings || []).map((setting) => [setting.key, setting]));
    for (const key of error.missing) {
      const value = String(await terminal.question(`${key} (${declared.get(key)?.description ?? "required"}): `)).trim();
      op.sets.push(`${key}=${value}`);
    }
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
    await promptMissingSettings(terminal, op, () => releaseInputs(agsRoot, requireRelease(agsRoot)).catalog);
  }
  return runOperation(op, { terminal, ...options });
}

export function sourcePathOf(hostRel) {
  if (hostRel.startsWith(".agents/rules/")) return `rules/${hostRel.slice(".agents/rules/".length)}`;
  if (hostRel.startsWith(".agents/skills/")) return `skills/${hostRel.slice(".agents/skills/".length)}`;
  return null;
}

function itemOf(hostRel) {
  const rule = hostRel.match(/^\.agents\/rules\/([^/]+)\.md$/);
  if (rule) return { id: rule[1], kind: "rule" };
  const skill = hostRel.match(/^\.agents\/skills\/([^/]+)\//);
  return skill ? { id: skill[1], kind: "skill" } : null;
}

export function agsOperationInProgress(agsRoot) {
  return gitOperationInProgress(agsRoot);
}

function hostIdAt(root) {
  try {
    return parse(fs.readFileSync(path.join(root, ".agents", "ags.yaml"), "utf8"))?.host ?? null;
  } catch {
    return null;
  }
}

export function updateRoute({ agsRoot, route, hostId }) {
  if (hostId == null) return route;
  const entry = findHost(loadRegistry(agsRoot), { id: hostId });
  if (!entry) throw new AgsError(`No registered host has id ${hostId}. See ags host list.`);
  if (!fs.existsSync(entry.path)) throw new AgsError(`Host ${hostId} is registered at ${entry.path}, which does not exist. Run the command with --route from the host's new location.`);
  return entry.path;
}

export function registryState(agsRoot, hostRoot, hostId) {
  const registry = loadRegistry(agsRoot);
  const byId = findHost(registry, { id: hostId });
  const byPath = findHost(registry, { hostPath: hostRoot });
  if (byPath && byPath.id !== hostId) throw new AgsError(`Registry entry ${byPath.id} holds ${displayPath(hostRoot)}, but .agents/ags.yaml says host ${hostId}. Correct the host value or unregister ${byPath.id}.`);
  if (!byId) return { entry: null, action: "register" };
  if (samePath(byId.path, hostRoot)) return { entry: byId, action: null };
  if (hostIdAt(byId.path) === hostId) throw new AgsError(`Registry entry ${hostId} holds ${byId.path}, which is still host ${hostId}. Give this host another id in .agents/ags.yaml.`);
  return { entry: byId, action: "path" };
}

export function updateTarget(agsRoot, installed, to) {
  const versions = releaseVersions(agsRoot);
  if (!versions.includes(installed)) throw new AgsError(`The host's agsVersion ${installed} is not a release of this AGS.`);
  if (to != null) {
    if (!VERSION_PATTERN.test(to)) throw new AgsError(`--to must be X.Y.Z: ${to}`, { exitCode: 2 });
    if (!versions.includes(to)) throw new AgsError(`No release ${to}. Releases: ${versions.join(", ") || "none"}.`);
  }
  const major = installed.split(".")[0];
  const target = to ?? versions.filter((version) => version.split(".")[0] === major).at(-1);
  if (!target) throw new AgsError(`No release with major version ${major}.`);
  if (compareVersions(target, installed) < 0) throw new AgsError(`Downgrades are refused: the host is at ${installed}, the target is ${target}.`);
  if (target.split(".")[0] !== major) migrationChain(agsRoot, installed, target);
  return target;
}

function softIds(catalog) {
  return [...catalog.rules.filter((entry) => entry.tier === "soft"), ...catalog.skills].map((entry) => entry.id);
}

function bufferHash(buffer) {
  return buffer == null ? null : contentHash(buffer);
}

function lfBuffer(buffer) {
  const text = textOf(buffer);
  return text == null || buffer.includes(0) ? buffer : Buffer.from(text.replaceAll("\r\n", "\n"));
}

export function classifyUpdate({ hostRoot, agsRoot, from, to, catalogI, sourceI, catalogT, sourceT, selectionI, selectionT, entry }) {
  const inProgress = agsOperationInProgress(agsRoot);
  const idsT = new Set([...catalogT.rules, ...catalogT.skills].map((item) => item.id));
  const selectedT = new Set([...selectionT.rules, ...selectionT.skills]);
  const selectedI = new Set([...selectionI.rules, ...selectionI.skills]);

  const base = new Map();
  const installedIds = new Set();
  for (const id of softIds(catalogI)) {
    if (!selectedI.has(id) && !hostItemFiles(hostRoot, catalogI, id).length) continue;
    installedIds.add(id);
    for (const [rel, buffer] of itemFiles(sourceI, catalogI, id)) base.set(rel, buffer);
  }
  const target = new Map();
  for (const id of softIds(catalogT)) for (const [rel, buffer] of itemFiles(sourceT, catalogT, id)) target.set(rel, buffer);

  const paths = new Set(base.keys());
  for (const rel of target.keys()) if (selectedT.has(itemOf(rel).id)) paths.add(rel);
  for (const id of new Set([...installedIds, ...selectedT])) {
    if (catalogI.skills.some((item) => item.id === id) || catalogT.skills.some((item) => item.id === id)) {
      for (const rel of listFiles(hostRoot, hostSkillDir(id))) paths.add(rel);
    }
  }

  const promoted = entry?.promoted || [];
  const ignored = entry?.ignored || [];
  const keptPromoted = [];
  const keptIgnored = [];
  const pending = [];
  const skipped = [];
  const entries = [];

  for (const rel of [...paths].sort()) {
    const { id, kind } = itemOf(rel);
    const H = readFileOrNull(abs(hostRoot, rel));
    const B = base.get(rel) ?? null;
    const selected = selectedT.has(id);
    const Tc = selected ? target.get(rel) ?? null : null;
    const sourceRel = sourcePathOf(rel);
    const S = readFileOrNull(insidePath(agsRoot, sourceRel));
    const h = { B: bufferHash(B), H: bufferHash(H), Tc: bufferHash(Tc), S: bufferHash(S) };
    const hashes = Object.fromEntries(Object.entries(h).filter(([, value]) => value != null));
    const add = (fields) => entries.push({ rel, id, kind, sourceRel, H, Tc, h, hashes, ...fields });

    if (h.H === h.Tc) continue;

    const promotion = promoted.find((record) => record.path === rel);
    if (promotion && promotion.hostHash === h.H) {
      if (promotion.version === to) {
        keptPromoted.push(promotion);
        pending.push(rel);
        continue;
      }
      if (compareVersions(to, promotion.version) > 0 && promotion.agsHash === h.Tc) {
        add({ action: "replace (promoted)" });
        continue;
      }
    }
    const ignore = ignored.find((record) => record.path === rel);
    if (ignore && (ignore.hostHash ?? null) === h.H && (ignore.targetHash ?? null) === h.Tc) {
      keptIgnored.push(ignore);
      skipped.push(rel);
      continue;
    }

    if (H != null && h.H === h.B) {
      add({ action: Tc != null ? "update" : "delete" });
      continue;
    }
    if (H == null) {
      if (B == null) add({ action: "add" });
      else add({ choices: ["restore", "ignore"], detail: "deleted in the host" });
      continue;
    }
    if (h.Tc === h.B && h.S === h.H) {
      add({ action: "record promotion" });
      continue;
    }
    const eligible = !inProgress && h.S === h.B && h.Tc === h.B;
    if (B != null) {
      if (h.Tc === h.B) add({ choices: [...(eligible ? ["promote"] : []), "restore", "ignore"], detail: "changed in the host" });
      else if (Tc != null) add({ choices: ["restore", "ignore"], detail: "changed in the host and at the target" });
      else if (!idsT.has(id) || selected) add({ choices: ["restore", "ignore"], detail: "changed in the host, removed from AGS" });
      else add({ action: "delete (deselected, backed up)" });
      continue;
    }
    if (Tc != null) add({ choices: ["restore", "ignore"], detail: "added in the host, also added at the target" });
    else add({ choices: [...(eligible ? ["promote"] : []), "restore", "ignore"], detail: "added in the host" });
  }

  const grouped = [];
  const bySkill = new Map();
  for (const item of entries) {
    if (item.kind === "skill" && item.detail === "deleted in the host") bySkill.set(item.id, [...(bySkill.get(item.id) || []), item]);
  }
  const folded = new Set();
  for (const [id, items] of bySkill) {
    const folder = hostSkillDir(id);
    if (fs.existsSync(abs(hostRoot, folder))) continue;
    const targetRels = [...target.keys()].filter((rel) => rel.startsWith(`${folder}/`));
    if (!targetRels.length || targetRels.some((rel) => !items.some((item) => item.rel === rel))) continue;
    const disable = !companionParents(catalogT, selectionT.skills, id).length;
    grouped.push({ rel: `${folder}/`, id, kind: "skill folder", files: items, hashes: {}, choices: ["restore", "ignore", ...(disable ? ["disable"] : [])], detail: "skill folder deleted in the host" });
    for (const item of items) folded.add(item);
  }
  return { entries: [...entries.filter((item) => !folded.has(item)), ...grouped], keptPromoted, keptIgnored, pending, skipped, inProgress };
}

function withoutEnabled(data, ids) {
  // An interrupted run may already have written its --enable ids to ags.yaml; they count as installed at I only through host files.
  const fresh = new Set(ids);
  const next = { ...data };
  for (const group of ["rules", "skills"]) {
    if (Array.isArray(data?.[group]?.enabled)) next[group] = { ...data[group], enabled: data[group].enabled.filter((id) => !fresh.has(id)) };
  }
  return next;
}

function entryItem(item) {
  return planItem({ path: item.rel, kind: item.kind === "skill folder" ? "skill folder" : "managed", action: item.action, choices: item.choices, hashes: item.hashes, detail: item.detail });
}

function blockDiff(before, after) {
  const old = before.split("\n");
  const next = after.split("\n");
  return [...old.filter((line) => !next.includes(line)).map((line) => `- ${line}`), ...next.filter((line) => !old.includes(line)).map((line) => `+ ${line}`)];
}

export function updateOperation({ agsRoot = AGS_ROOT, route, hostId = null, to = null, enable = [], disable = [], sets = [], rerunArgs }) {
  const hostRoot = resolveHost(updateRoute({ agsRoot, route, hostId }), { agsRoot, command: "ags host update" });
  const op = {
    name: "update",
    command: "host update",
    rerunArgs,
    hostRoot,
    sets: [...sets],
    inspect() {
      const configState = hostConfigState(hostRoot);
      if (!configState) throw new AgsError(`${displayPath(hostRoot)} has no AGS installation. Run ags host install.`);
      if (!configState.installed) throw new AgsError(`${displayPath(hostRoot)} has an interrupted install (.agents/ags.yaml format 2 without agsVersion). Run ags host install, which resumes it.`);
      const config = readConfig(hostRoot);
      const doc = config.doc;
      const id = config.data.host;
      if (slugError(id, "host")) throw new AgsError(`.agents/ags.yaml: ${slugError(id, "host")}`);
      if (hostId != null && hostId !== id) throw new AgsError(`Registry host ${hostId} resolves to ${displayPath(hostRoot)}, whose .agents/ags.yaml says host ${id}.`);
      const from = String(config.data.agsVersion);
      const version = updateTarget(agsRoot, from, to);
      const migrations = migrationChain(agsRoot, from, version);
      const { catalog: catalogI, source: sourceI } = releaseInputs(agsRoot, from);
      const { catalog, source } = releaseInputs(agsRoot, version);
      const setMap = parseSets(op.sets, catalog);
      const evidence = detectEvidence(hostRoot);
      const selectionI = resolveSelection(catalogI, withoutEnabled(config.data, enable), evidence);

      const flagged = applySelectionFlags(catalog, doc.toJS() ?? {}, { enable, disable });
      for (const group of flagged.changed) {
        writeSelection(doc, group, "enabled", flagged.selection[group].enabled);
        writeSelection(doc, group, "disabled", flagged.selection[group].disabled);
      }
      const selection = resolveSelection(catalog, doc.toJS() ?? {}, evidence);
      if (selection.errors.length) throw new AgsError(`Invalid selection:\n${selection.errors.map((line) => `- ${line}`).join("\n")}`);
      mergeConfig(doc, catalog, { skillIds: selection.skills, sets: setMap });
      const data = doc.toJS() ?? {};
      const errors = validateConfig(data, catalog, { hostRoot });
      if (errors.length) throw new AgsError(`Invalid .agents/ags.yaml:\n${errors.map((line) => `- ${line}`).join("\n")}`);
      const missing = missingRequired(catalog, data, selection.skills);
      if (missing.length) throw settingsError(catalog, missing, op.rerunArgs);

      const newIds = allIds(catalog).filter((item) => !allIds(catalogI).includes(item));
      const found = collisions(hostRoot, source, catalog, id, { ids: newIds });
      if (found.length) throw new AgsError(collisionMessage(found));

      const reg = registryState(agsRoot, hostRoot, id);
      const classified = classifyUpdate({ hostRoot, agsRoot, from, to: version, catalogI, sourceI, catalogT: catalog, sourceT: source, selectionI, selectionT: selection, entry: reg.entry });
      const material = targetMaterial(source, catalog, selection);
      refuseIgnored(hostRoot, [BLOCK_KEY, ".agents/", CONFIG_REL, ...material.keys(), ...listFiles(hostRoot, ".agents")]);

      const gone = new Set(classified.entries.filter((item) => String(item.action).startsWith("delete")).map((item) => item.rel));
      const rendered = renderHostBlock({ hostRoot, source, catalog, selection, version, gone });
      const block = planBlock(hostRoot, rendered);
      if (block.analysis.kind === "missing" && block.action) {
        delete block.action;
        block.choices = ["restore"];
      }
      const records = { promoted: classified.keptPromoted, ignored: classified.keptIgnored };
      const recordsChanged = Boolean(reg.entry) && (records.promoted.length !== reg.entry.promoted.length || records.ignored.length !== reg.entry.ignored.length);
      return {
        hostRoot,
        hostId: id,
        hostName: reg.entry?.name ?? path.basename(hostRoot),
        from,
        version,
        catalog,
        source,
        selection,
        doc,
        configCurrent: config.text,
        configNext: configText(doc),
        classified,
        block,
        warnings: rendered.warnings,
        exclude: inspectExclude(hostRoot),
        reg,
        records,
        recordsChanged,
        migrations,
      };
    },
    plan(state) {
      const items = [];
      const exclude = excludeItem(state.exclude);
      if (exclude) items.push(exclude);
      const disableOffered = state.classified.entries.some((item) => item.choices?.includes("disable"));
      if (state.configCurrent !== state.configNext || state.from !== state.version) {
        const action = state.configCurrent === state.configNext ? "set agsVersion" : "update";
        items.push(planItem({ path: CONFIG_REL, kind: "settings", action: disableOffered ? `${action}; skills.disabled if disable is chosen` : action, hashes: { S: contentHash(Buffer.from(state.configNext)) } }));
      } else if (disableOffered) {
        items.push(planItem({ path: CONFIG_REL, kind: "settings", action: "skills.disabled if disable is chosen", hashes: { S: contentHash(Buffer.from(state.configNext)) } }));
      }
      for (const item of state.classified.entries) items.push(entryItem(item));
      const block = blockItem(state.block);
      if (block) items.push(block);
      if (state.reg.action === "register") items.push(planItem({ path: REGISTRY_KEY, kind: "registry", action: `add ${state.hostId} (${state.hostName})` }));
      else if (state.reg.action === "path") items.push(planItem({ path: REGISTRY_KEY, kind: "registry", action: `move ${state.hostId} to ${posix(hostRoot)}` }));
      else if (state.recordsChanged) items.push(planItem({ path: REGISTRY_KEY, kind: "registry", action: "drop stale records" }));
      const notes = [selectionSummary(state.selection)];
      if (state.migrations.length) notes.push(`Migration: ${state.migrations.map((item) => `${item.fromMajor}->${item.toMajor}`).join(", ")}.`);
      if (state.classified.inProgress) notes.push(`Promotion is not offered: AGS has a ${state.classified.inProgress} in progress.`);
      for (const rel of state.classified.pending) notes.push(`Promoted, pending release: ${rel}`);
      for (const rel of state.classified.skipped) notes.push(`Ignored: ${rel}`);
      if (state.block.analysis.kind === "edited") notes.push("The AGS block in AGENTS.md was edited. restore regenerates it; to keep an edit, move it outside the block and rerun.");
      if (state.block.analysis.kind === "missing") notes.push("The AGS block is missing from AGENTS.md. restore recreates it at the top; to refuse it permanently, run ags host unregister.");
      notes.push(...state.warnings.map((line) => `Warning: ${line}`));
      return {
        header: { title: `ags host update: ${posix(hostRoot)} from ${state.from} to ${state.version}`, operation: "update", host: state.hostId, from: state.from, to: state.version, selection: { rules: state.selection.rules, skills: state.selection.skills }, notes },
        items,
      };
    },
    locks: () => operationLocks({ hostRoot, agsRoot }),
    writeLabels(plan) {
      return [...plan.items.map((item) => item.path), VERSION_KEY];
    },
    failureArgs(plan) {
      return op.rerunArgs.includes("--to") ? op.rerunArgs : [...op.rerunArgs, "--to", plan.header.to];
    },
    async apply(ctx) {
      const state = ctx.state;
      const decided = (item) => (item.choices ? ctx.decisions.get(item.rel) : item.action);
      const writes = [];
      const deletes = [];
      const promotions = [];
      const recorded = [];
      const newIgnored = [];
      const disables = [];
      const ignoreRecord = (item) => ({ path: item.rel, hostHash: item.h.H, targetHash: item.h.Tc, version: state.version });
      for (const item of state.classified.entries) {
        const choice = decided(item);
        if (item.kind === "skill folder") {
          if (choice === "restore") for (const file of item.files) writes.push(file);
          else if (choice === "ignore") newIgnored.push(...item.files.map(ignoreRecord));
          else if (choice === "disable") disables.push(item.id);
          continue;
        }
        if (["add", "update", "replace (promoted)"].includes(choice)) writes.push(item);
        else if (choice === "delete" || choice === "delete (deselected, backed up)") deletes.push(item);
        else if (choice === "record promotion") recorded.push({ item, agsHash: item.h.S });
        else if (choice === "promote") promotions.push(item);
        else if (choice === "restore") (item.Tc != null ? writes : deletes).push(item);
        else if (choice === "ignore") newIgnored.push(ignoreRecord(item));
      }
      const blockWrite = state.block.action || ctx.decisions.get(BLOCK_KEY) === "restore";

      ctx.fault("after-host-lock");
      if (state.exclude.need === "restore") backupExcludeInto(hostRoot, "update")(state.exclude);
      ctx.fault("after-exclude-backup");
      if (state.exclude.need) {
        fs.mkdirSync(path.dirname(state.exclude.file), { recursive: true });
        writeAtomic(state.exclude.file, state.exclude.next);
        ctx.done(EXCLUDE_KEY);
      }
      ctx.fault("after-exclude-block");

      for (const id of disables) {
        const skills = (state.doc.toJS() ?? {}).skills ?? {};
        const enabled = skills.enabled || [];
        const disabled = skills.disabled || [];
        if (enabled.includes(id)) writeSelection(state.doc, "skills", "enabled", enabled.filter((item) => item !== id));
        if (!disabled.includes(id)) writeSelection(state.doc, "skills", "disabled", [...disabled, id]);
      }
      const configNext = configText(state.doc);
      const overwritten = [
        ...(configNext !== state.configCurrent || state.from !== state.version ? [CONFIG_REL] : []),
        ...writes.filter((item) => item.H != null).map((item) => item.rel),
        ...deletes.map((item) => item.rel),
        ...(blockWrite && state.block.current != null ? [BLOCK_KEY] : []),
      ];
      let backupFolder = null;
      if (overwritten.length) {
        backupFolder = createBackupFolder(hostRoot, "update");
        const tracked = trackedPaths(hostRoot, overwritten);
        const files = overwritten.map((rel, index) => {
          const saved = backupFile(hostRoot, backupFolder, rel, { tracked: tracked.has(rel) });
          ctx.faultEach("after-backup", index, overwritten.length);
          return saved;
        });
        writeManifest(backupFolder, { operation: "update", from: state.from, to: state.version, digest: ctx.digest, files });
      }
      ctx.fault("after-backup-manifest");

      promotions.forEach((item, index) => {
        const content = lfBuffer(item.H);
        writeAtomic(insidePath(agsRoot, item.sourceRel), content);
        ctx.done(`AGS ${item.sourceRel}`);
        recorded.push({ item, agsHash: contentHash(content) });
        ctx.faultEach("after-promotion", index, promotions.length);
      });
      for (const { item } of recorded) appendUnreleasedNote(agsRoot, `Promoted from ${state.hostName}: \`${item.sourceRel}\``);
      if (recorded.length) ctx.done("AGS CHANGELOG.md");
      ctx.fault("after-notes");

      const expected = [];
      if (configNext !== state.configCurrent) {
        writeAtomic(abs(hostRoot, CONFIG_REL), configNext);
        ctx.done(CONFIG_REL);
        expected.push({ path: CONFIG_REL, content: configNext });
      }
      ctx.fault("after-ags-yaml");
      writes.forEach((item, index) => {
        writeFileAt(hostRoot, item.rel, item.Tc);
        ctx.done(item.rel);
        expected.push({ path: item.rel, content: item.Tc });
        ctx.faultEach("after-managed-write", index, writes.length);
      });
      deletes.forEach((item, index) => {
        removeFileAt(hostRoot, item.rel);
        ctx.done(item.rel);
        expected.push({ path: item.rel, content: null });
        ctx.faultEach("after-deletion", index, deletes.length);
      });

      const diffLines = [];
      if (blockWrite) {
        const gone = new Set(deletes.map((item) => item.rel));
        const rendered = renderHostBlock({ hostRoot, source: state.source, catalog: state.catalog, selection: state.selection, version: state.version, gone });
        const current = readFileOrNull(abs(hostRoot, BLOCK_KEY))?.toString("utf8") ?? null;
        const next = placeBlock(current, rendered.text);
        if (state.block.analysis.kind === "edited") diffLines.push("The edited AGS block was replaced; its lines differed as follows:", ...blockDiff(state.block.analysis.body, rendered.body));
        if (current !== next) {
          writeAtomic(abs(hostRoot, BLOCK_KEY), next);
          ctx.done(BLOCK_KEY);
        }
        expected.push({ path: BLOCK_KEY, content: next });
      }
      ctx.fault("after-agents-block");
      verifyWrites(hostRoot, expected);

      const newPromoted = recorded.map(({ item, agsHash }) => ({ path: item.rel, hostHash: item.h.H, agsHash, version: state.version }));
      const registry = loadRegistry(agsRoot);
      let hostEntry = findHost(registry, { id: state.hostId });
      const before = JSON.stringify(hostEntry ?? null);
      if (!hostEntry) {
        hostEntry = { id: state.hostId, name: state.hostName, path: hostRoot, ignored: [], promoted: [] };
        registry.hosts.push(hostEntry);
      }
      hostEntry.path = hostRoot;
      const touched = new Set([...newPromoted, ...newIgnored].map((record) => record.path));
      hostEntry.promoted = [...state.records.promoted.filter((record) => !touched.has(record.path)), ...newPromoted];
      hostEntry.ignored = [...state.records.ignored.filter((record) => !touched.has(record.path)), ...newIgnored];
      if (JSON.stringify(hostEntry) !== before) {
        saveRegistry(agsRoot, registry);
        ctx.done(REGISTRY_KEY);
      }
      ctx.fault("after-registry");
      if (state.from !== state.version) {
        setAgsVersion(state.doc, state.version);
        writeAtomic(abs(hostRoot, CONFIG_REL), configText(state.doc));
      }
      ctx.done(VERSION_KEY);

      const summary = [...diffLines];
      summary.push(`Updated host ${state.hostId} from ${state.from} to ${state.version}: ${writes.length} written, ${deletes.length} deleted, ${promotions.length} promoted, ${newIgnored.length} ignored.`);
      if (backupFolder) summary.push(`Backups: ${backupFolder.rel}`);
      if (promotions.length) summary.push("Promoted files are in the AGS working tree. Review, commit and release them in AGS.");
      summary.push("AGS never commits. Review and commit AGENTS.md and .agents/ in the host.");
      return summary;
    },
  };
  return op;
}

export function usageRecordCount(hostRoot) {
  const buffer = readFileOrNull(abs(hostRoot, ".tmp/ags/reports/usage.jsonl"));
  return buffer == null ? 0 : buffer.toString("utf8").split("\n").filter((line) => line.trim()).length;
}

export function installedPaths(agsRoot, hostRoot, config) {
  const version = String(config.agsVersion);
  const { catalog, source } = releaseInputs(agsRoot, version);
  const selection = resolveSelection(catalog, config, detectEvidence(hostRoot));
  return new Set([BLOCK_KEY, ...targetMaterial(source, catalog, selection).keys()]);
}

export async function hostStatus({ agsRoot = AGS_ROOT, route, hostId = null, terminal, extraWarnings = () => [] }) {
  const op = updateOperation({ agsRoot, route, hostId, rerunArgs: hostId ? ["host", "update", "--host", hostId] : ["host", "update", "--route", route] });
  const hostRoot = op.hostRoot;
  const configState = hostConfigState(hostRoot);
  if (!configState) throw new AgsError(`${displayPath(hostRoot)} has no AGS installation. Run ags host install.`);
  const { data } = readConfig(hostRoot);
  const installed = data.agsVersion == null ? null : String(data.agsVersion);
  terminal.log(`Host: ${data.host} at ${posix(hostRoot)}`);
  terminal.log(`Installed: ${installed ?? "none (interrupted install; run ags host install)"}`);
  terminal.log(`Latest release: ${latestRelease(agsRoot) ?? "none"}`);
  terminal.log(`Reporting: ${data.reporting === false ? "off" : "on"}`);
  terminal.log(`Usage records: ${usageRecordCount(hostRoot)}`);
  if (installed) {
    try {
      const state = op.inspect();
      const plan = normalizePlan(op.plan(state));
      const digest = planDigest(plan);
      const changes = plan.items.filter((item) => item.choices);
      terminal.log(`Update plan to ${state.version}: ${plan.items.length} item${plan.items.length === 1 ? "" : "s"}, digest ${digest}`);
      for (const item of plan.items) terminal.log(`- ${item.path}: ${item.choices ? `choose ${item.choices.join("/")}` : item.action}`);
      terminal.log(`Host changes: ${changes.length ? changes.map((item) => item.path).join(", ") : "none"}`);
      terminal.log(`Promoted, pending release: ${state.classified.pending.join(", ") || "none"}`);
      terminal.log(`Ignored: ${state.classified.skipped.join(", ") || "none"}`);
    } catch (error) {
      if (!(error instanceof AgsError)) throw error;
      if (error.missing) terminal.log(`Missing settings: ${error.missing.join(", ")}`);
      terminal.log(`Update plan unavailable: ${error.message}`);
    }
  }
  for (const line of extraWarnings(hostRoot)) terminal.warn(`Warning: ${line}`);
  return 0;
}

export function hostList({ agsRoot = AGS_ROOT, terminal }) {
  const { hosts } = loadRegistry(agsRoot);
  if (!hosts.length) {
    terminal.log("No registered hosts.");
    return 0;
  }
  for (const host of hosts) {
    let version = "missing";
    if (fs.existsSync(host.path)) {
      try {
        version = String(parse(fs.readFileSync(path.join(host.path, ".agents", "ags.yaml"), "utf8"))?.agsVersion ?? "not installed");
      } catch {
        version = "unreadable ags.yaml";
      }
    }
    terminal.log(`${host.id}  ${host.name}  ${version}  ${posix(host.path)}`);
  }
  return 0;
}

export function unregisterOperation({ agsRoot = AGS_ROOT, route = null, hostId = null, rerunArgs }) {
  let hostRoot = null;
  let id = hostId;
  if (id == null) {
    hostRoot = resolveHost(route, { agsRoot, command: "ags host unregister" });
    id = hostIdAt(hostRoot);
  }
  return {
    name: "unregister",
    command: "host unregister",
    rerunArgs,
    inspect() {
      const registry = loadRegistry(agsRoot);
      const entry = (id != null && findHost(registry, { id })) || (hostRoot && findHost(registry, { hostPath: hostRoot }));
      if (!entry) throw new AgsError(`No registry entry for ${hostId ?? displayPath(hostRoot)}.`);
      return { entry, root: fs.existsSync(entry.path) ? entry.path : null };
    },
    plan(state) {
      const { entry } = state;
      return {
        header: { title: `ags host unregister: ${entry.id}`, operation: "unregister", host: entry.id, notes: [`Removes ${entry.id} (${posix(entry.path)}) with ${entry.promoted.length} promotion and ${entry.ignored.length} ignore records. Host files are not touched.`] },
        items: [planItem({ path: REGISTRY_KEY, kind: "registry", action: `remove ${entry.id}` })],
      };
    },
    locks: (plan, state) => operationLocks({ hostRoot: state.root, agsRoot }),
    async apply(ctx) {
      const registry = loadRegistry(agsRoot);
      registry.hosts = registry.hosts.filter((host) => host.id !== ctx.state.entry.id);
      saveRegistry(agsRoot, registry);
      ctx.done(REGISTRY_KEY);
      return [`Unregistered ${ctx.state.entry.id}. Its files are unchanged; ags host update would register it again.`];
    },
  };
}

export async function hostUnregister({ agsRoot = AGS_ROOT, route, hostId = null, rerunArgs, terminal, options }) {
  return runOperation(unregisterOperation({ agsRoot, route, hostId, rerunArgs }), { terminal, ...options });
}

export async function hostUpdate({ agsRoot = AGS_ROOT, route, hostId = null, to = null, enable = [], disable = [], sets = [], rerunArgs, terminal, options }) {
  const op = updateOperation({ agsRoot, route, hostId, to, enable, disable, sets, rerunArgs });
  if (terminal.interactive && !options.dryRun) await promptMissingSettings(terminal, op, () => releaseInputs(agsRoot, requireRelease(agsRoot)).catalog);
  return runOperation(op, { terminal, ...options });
}
