import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { planItem } from "./operation.mjs";
import { EXCLUDE_KEY, inspectAliasExclude, renderAliasExclude } from "./render.mjs";
import { AgsError, assertSlug, contentHash, insidePath, isReparsePoint, readFileOrNull, samePath, writeAtomic } from "./util.mjs";

function lstat(file) {
  try { return fs.lstatSync(file); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function realDirectory(root, rel) {
  const file = insidePath(root, rel);
  const stat = lstat(file);
  if (stat && (!stat.isDirectory() || isReparsePoint(file))) throw new AgsError(`Claude skills require a real directory at ${rel}; resolve the host-owned entry before updating.`);
  return stat ? { dev: String(stat.dev), ino: String(stat.ino) } : null;
}

function recordPath(agsRoot, hostId) { return insidePath(agsRoot, `hosts/${assertSlug(hostId)}.json`); }

export function readAliasRecord(agsRoot, hostRoot, hostId) {
  const file = recordPath(agsRoot, hostId);
  const data = lstat(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  if (data.claudeAliases?.length && (!data.path || !samePath(data.path, hostRoot))) throw new AgsError(`Claude alias ownership for ${hostId} belongs to a different host path; resolve the observed host record.`);
  const records = data.claudeAliases ?? [];
  if (!Array.isArray(records)) throw new AgsError(`Invalid Claude alias ownership in hosts/${hostId}.json`);
  const ids = new Set();
  for (const item of records) {
    assertSlug(item.id, "managed skill id");
    if (ids.has(item.id) || item.path !== `.claude/skills/${item.id}` || item.expectedTarget !== `.agents/skills/${item.id}` || !["symlink", "junction"].includes(item.linkType) || typeof item.target !== "string") throw new AgsError(`Invalid Claude alias descriptor for ${item.id} in hosts/${hostId}.json`);
    ids.add(item.id);
  }
  return records;
}

function saveRecords(agsRoot, hostRoot, hostId, records) {
  const file = recordPath(agsRoot, hostId);
  const data = lstat(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  writeAtomic(file, `${JSON.stringify({ ...data, schemaVersion: 1, hostId, path: hostRoot, claudeAliases: records }, null, 2)}\n`);
}

// Node exposes both Windows link types as symbolic links. Read the native type
// once per inspection, without following or changing any link.
function nativeTypes(files) {
  if (process.platform !== "win32" || !files.length) return new Map(files.map(file => [file, "symlink"]));
  const literals = files.map(file => `'${file.replaceAll("'", "''")}'`).join(",");
  const script = `Get-Item -Force -LiteralPath ${literals} | ForEach-Object { [pscustomobject]@{ path=$_.FullName; type=$_.LinkType } } | ConvertTo-Json -Compress`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], { encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new AgsError("Cannot inspect native Claude skill link types; no alias writes are permitted.");
  const data = JSON.parse(result.stdout || "[]");
  return new Map((Array.isArray(data) ? data : [data]).map(item => [path.resolve(item.path), item.type === "Junction" ? "junction" : item.type === "SymbolicLink" ? "symlink" : "unexpected"]));
}

export function probeAliasType({ symlink = fs.symlinkSync } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ags-claude-link-"));
  const target = path.join(root, "target");
  const alias = path.join(root, "alias");
  try {
    fs.mkdirSync(target);
    try { symlink("target", alias, "dir"); return "symlink"; }
    catch (error) {
      if (process.platform !== "win32" || !["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) throw error;
      // Windows junction discovery verified with Claude 2.1.288; native lifecycle
      // coverage remains separate from provisional macOS/harness support.
      symlink(target, alias, "junction");
      if (!samePath(fs.realpathSync(alias), target)) throw new AgsError("The Claude junction capability probe resolved to the wrong target.");
      return "junction";
    }
  } catch (error) {
    throw new AgsError(`integrations.claudeSkills requires supported directory links (${error.code ?? error.message}); no elevation, configuration change or copy fallback is performed.`);
  } finally {
    if (lstat(alias)?.isSymbolicLink()) fs.unlinkSync(alias);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export function inspectAliases({ agsRoot, hostRoot, hostId, skills, enabled, conditionalDisables = [], probe = true }) {
  const records = readAliasRecord(agsRoot, hostRoot, hostId);
  if (!enabled && !records.length) return { records, next: [], actions: [], observations: [], exclude: null };
  const parents = Object.fromEntries([".claude", ".claude/skills", ".agents", ".agents/skills"].map(rel => [rel, realDirectory(hostRoot, rel)]));
  const ids = [...new Set([...records.map(item => item.id), ...(enabled ? skills : [])])].sort();
  const paths = ids.map(id => path.join(hostRoot, ".claude", "skills", assertSlug(id)));
  const types = nativeTypes(paths.filter(file => lstat(file)?.isSymbolicLink()));
  const observations = [], actions = [], next = [];
  let createType = null;
  for (const id of ids) {
    const aliasPath = `.claude/skills/${id}`;
    const expectedTarget = `.agents/skills/${id}`;
    const file = path.join(hostRoot, ".claude", "skills", id); // parents verified; inspect the link itself
    const target = path.join(hostRoot, ".agents", "skills", id);
    const targetState = realDirectory(hostRoot, expectedTarget);
    const stat = lstat(file);
    const recorded = records.find(item => item.id === id);
    const wanted = enabled && skills.includes(id);
    let current = null;
    if (stat) {
      if (!stat.isSymbolicLink()) throw new AgsError(`Claude skill alias collision at ${aliasPath}: host-owned file or directory; retain it and resolve the conflict before updating.`);
      const raw = fs.readlinkSync(file);
      const linkType = types.get(file);
      const resolvesLexically = samePath(path.resolve(path.dirname(file), raw), target);
      let resolvesPhysically = false;
      try { resolvesPhysically = targetState != null && samePath(fs.realpathSync(file), fs.realpathSync(target)); } catch {}
      current = { id, path: aliasPath, expectedTarget, target: raw, linkType };
      if (!resolvesLexically || !["symlink", "junction"].includes(linkType) || (targetState && !resolvesPhysically)) throw new AgsError(`Claude skill alias ${aliasPath} is retargeted, inaccessible or unexpected; retained. Resolve the conflict before updating.`);
      if (recorded && (recorded.target !== raw || recorded.linkType !== linkType)) throw new AgsError(`Managed Claude skill alias ${aliasPath} changed; retained. Resolve the conflict before updating.`);
      if (!recorded && !resolvesPhysically) throw new AgsError(`Unrecorded Claude skill alias ${aliasPath} is dangling; retained. Resolve it before updating.`);
    }
    observations.push({ id, current, linkState: stat ? { dev: String(stat.dev), ino: String(stat.ino), ctimeMs: stat.ctimeMs } : null, recorded: recorded ?? null, targetState, entryHash: targetState ? contentHash(readFileOrNull(insidePath(hostRoot, `${expectedTarget}/SKILL.md`))) : null });
    if (!wanted) {
      if (current) actions.push({ action: "remove", before: current, descriptor: current });
      else if (recorded) actions.push({ action: "forget missing alias", before: null, descriptor: recorded });
      continue;
    }
    if (current) {
      next.push(current);
      if (!recorded) actions.push({ action: "adopt (reviewed exact target)", before: current, descriptor: current });
      else if (conditionalDisables.includes(id)) actions.push({ action: "remove if skill disabled", before: current, descriptor: current });
    } else {
      createType ??= probe ? probeAliasType() : "symlink";
      const descriptor = { id, path: aliasPath, expectedTarget, target: createType === "symlink" ? `../../.agents/skills/${id}` : target, linkType: createType };
      next.push(descriptor);
      actions.push({ action: "create", before: null, descriptor });
    }
  }
  return { records, next, actions, observations, parents, exclude: inspectAliasExclude(hostRoot, next.map(item => item.id)) };
}

export function aliasItems(state) {
  const items = state.actions.map(item => planItem({ path: item.descriptor.path, kind: "Claude skill alias", action: item.action, detail: `${item.descriptor.linkType} -> ${item.descriptor.expectedTarget}`, hashes: { H: contentHash(JSON.stringify(item.before)), S: contentHash(JSON.stringify(item.descriptor)) } }));
  const exclude = state.exclude;
  if (exclude?.need) items.unshift(planItem({ path: EXCLUDE_KEY, kind: "Claude alias exclude", action: `${exclude.need} Claude alias region`, detail: exclude.need === "restore" ? "edited region, backed up" : undefined, hashes: { H: contentHash(exclude.content), S: contentHash(exclude.lines.join("\n")) } }));
  return items;
}

function writeAliasExclude(ctx, hostRoot, ids, backupExclude) {
  const exclude = inspectAliasExclude(hostRoot, ids);
  if (!exclude.need) return false;
  if (exclude.need === "restore") backupExclude?.(exclude);
  fs.mkdirSync(path.dirname(exclude.file), { recursive: true });
  writeAtomic(exclude.file, renderAliasExclude(exclude.content, ids));
  ctx.done(EXCLUDE_KEY);
  return true;
}

export function applyAliases(ctx, state, { agsRoot, hostRoot, hostId, skills, backupExclude }) {
  if (!state.exclude) return;
  const selected = new Set(skills);
  const next = state.next.filter(item => selected.has(item.id));
  if (state.actions.length) {
    for (const item of state.observations) {
      const stat = lstat(path.join(hostRoot, ".claude", "skills", item.id));
      const identity = stat ? { dev: String(stat.dev), ino: String(stat.ino), ctimeMs: stat.ctimeMs } : null;
      if (JSON.stringify(identity) !== JSON.stringify(item.linkState)) throw new AgsError(`Claude alias .claude/skills/${item.id} changed during apply; retained.`);
    }
    // Validate all final targets before taking ownership or changing links.
    for (const item of next) {
      if (!realDirectory(hostRoot, item.expectedTarget) || !lstat(insidePath(hostRoot, `${item.expectedTarget}/SKILL.md`))?.isFile()) throw new AgsError(`Cannot link missing installed skill ${item.id}; restore its canonical directory in a reviewed update.`);
    }
    for (const rel of [".claude", ".claude/skills", ".agents", ".agents/skills"]) realDirectory(hostRoot, rel);
  }
  // Exclude every link that exists or will exist before any link changes, so an
  // interrupted apply never leaves a managed alias visible to Git.
  const existing = state.observations.filter(item => item.current).map(item => item.id);
  if (writeAliasExclude(ctx, hostRoot, [...new Set([...next.map(item => item.id), ...existing])], backupExclude)) ctx.fault("after-claude-alias-exclude");
  if (!state.actions.length) {
    writeAliasExclude(ctx, hostRoot, next.map(item => item.id), backupExclude);
    return;
  }
  fs.mkdirSync(path.join(hostRoot, ".claude", "skills"), { recursive: true });
  // Ownership before creation makes a fault after any link resumable in the
  // existing observed host record; no linked content is copied.
  saveRecords(agsRoot, hostRoot, hostId, [...state.records.filter(item => !next.some(child => child.id === item.id)), ...next]);
  for (const [index, action] of state.actions.entries()) {
    const item = action.descriptor;
    const file = path.join(hostRoot, ".claude", "skills", item.id);
    if (action.action === "remove" || (action.action === "remove if skill disabled" && !selected.has(item.id))) {
      if (!lstat(file)?.isSymbolicLink() || fs.readlinkSync(file) !== item.target) throw new AgsError(`Claude alias ${item.path} changed during apply; retained.`);
      fs.unlinkSync(file); // remove only the link, never recursively its target
    } else if (action.action === "create" && selected.has(item.id)) {
      if (lstat(file)) throw new AgsError(`Claude alias ${item.path} appeared during apply; retained.`);
      fs.symlinkSync(item.target, file, item.linkType === "junction" ? "junction" : "dir");
      if (!samePath(fs.realpathSync(file), insidePath(hostRoot, item.expectedTarget))) throw new AgsError(`Claude alias ${item.path} failed target verification.`);
    }
    ctx.done(item.path);
    ctx.faultEach("after-claude-alias", index, state.actions.length);
  }
  saveRecords(agsRoot, hostRoot, hostId, next);
  writeAliasExclude(ctx, hostRoot, next.map(item => item.id), backupExclude);
}

const EXCLUDE_FINDINGS = {
  add: "is missing",
  update: "is out of date",
  remove: "lists aliases that are no longer managed",
  restore: "was edited",
};

export function aliasFindings(args) {
  try {
    const state = inspectAliases({ ...args, probe: false });
    const findings = state.actions.map(item => `${item.descriptor.path}: ${item.action} via a reviewed ags host update (${item.descriptor.linkType}).`);
    if (state.exclude?.need) findings.push(`The Claude alias region of .git/info/exclude ${EXCLUDE_FINDINGS[state.exclude.need]}; repair it with a reviewed ags host update.`);
    return findings;
  } catch (error) { return [error.message]; }
}
