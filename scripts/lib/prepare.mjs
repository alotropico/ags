import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { BACKUPS_REL, backupName, createBackupFolder, readManifest, trackedPaths, writeManifest } from "./backup.mjs";
import { findings, toolConfigs, walkSetup } from "./discovery.mjs";
import { planItem, runOperation } from "./operation.mjs";
import { EXCLUDE_KEY, inspectExclude } from "./render.mjs";
import { hostLockPath } from "./reports.mjs";
import { AgsError, assertMainWorktree, contentHash, displayPath, insidePath, posix, samePath, sha256, worktreeInfo, writeAtomic } from "./util.mjs";

export const CLEANUP_PROMPT = `AGS moved this repository's previous agent setup to <backup path>. manifest.json there lists every file; file and folder names were changed so no agent tool loads them.

Find what the backup missed, and report before changing anything:

1. Search the repository, including gitignored files but skipping .git, node_modules, and .tmp, for leftovers of the old setup: references to the moved paths, agent or tool entries in .gitignore, .gitattributes, .cursorignore, and editor settings, package.json scripts, CI files, and local git config entries.
2. Report each finding with its path (and line, for lines inside shared files), what it belongs to, and what you propose: move the file into the backup, remove the line, or leave it. Also report the tool-configuration files AGS listed and whether each still makes sense, and what in the backup looks worth restoring as host guidance: AGENTS.md outside the AGS block, host rules in .agents/rules/, or host notes in .agents/local/.
3. Wait for the user to confirm. Then move each confirmed file into the same backup folder, keeping its relative path and renaming it the way the backup does: add a leading "_" to any path segment that starts with ".", and add ".bak" to AGENTS.md, AGENTS.override.md, CLAUDE.md, CLAUDE.local.md, and GEMINI.md. Add each move to manifest.json. Record each removed line, with its file and line, in traces.md in the backup folder.
4. Do not touch documentation, source code, or project infrastructure. If you are unsure whether something belongs to the old setup, list it instead of moving it.`;

export function cleanupPrompt(backupRel) {
  return CLEANUP_PROMPT.replace("<backup path>", posix(backupRel));
}

function abs(root, rel) {
  return insidePath(root, rel);
}

function exists(file) {
  try {
    fs.lstatSync(file);
    return true;
  } catch {
    return false;
  }
}

export function hostConfigState(hostRoot) {
  const file = abs(hostRoot, ".agents/ags.yaml");
  if (!fs.existsSync(file)) return null;
  try {
    const data = parse(fs.readFileSync(file, "utf8"));
    if (data && typeof data === "object" && data.format === 2) return { installed: data.agsVersion != null };
  } catch {
    return null;
  }
  return null;
}

export function resolveHost(route, { agsRoot, command }) {
  const info = worktreeInfo(route);
  assertMainWorktree(info, command);
  if (agsRoot && samePath(info.root, agsRoot)) {
    throw new AgsError(`${displayPath(info.root)} is the AGS repository. AGS does not apply to itself; run ${command} in a host repository.`);
  }
  return info.root;
}

export function refuseInstalled(hostRoot) {
  const state = hostConfigState(hostRoot);
  if (state?.installed) throw new AgsError(`${displayPath(hostRoot)} already has an AGS installation (.agents/ags.yaml has agsVersion). Use ags host update.`);
  if (state) throw new AgsError(`${displayPath(hostRoot)} has an interrupted install (.agents/ags.yaml format 2 without agsVersion). Run ags host install, which resumes it.`);
}

export function incompleteManifests(hostRoot) {
  const parent = abs(hostRoot, BACKUPS_REL);
  if (!fs.existsSync(parent)) return [];
  const found = [];
  for (const name of fs.readdirSync(parent).sort()) {
    const folderAbs = path.join(parent, name);
    if (!fs.statSync(folderAbs).isDirectory()) continue;
    let manifest;
    try {
      manifest = readManifest(folderAbs);
    } catch {
      continue;
    }
    if (manifest && manifest.complete === false && Array.isArray(manifest.files)) {
      found.push({ folder: { abs: folderAbs, rel: `${BACKUPS_REL}/${name}` }, manifest });
    }
  }
  return found;
}

export function moveStates(hostRoot, pending) {
  const { folder, manifest } = pending;
  return manifest.files.map((entry) => {
    const atOriginal = exists(abs(hostRoot, entry.original));
    const atBackup = exists(abs(folder.abs, entry.backup));
    if (atOriginal && atBackup) throw new AgsError(`Prepare backup ${folder.rel}: ${entry.original} exists both at its original path and at ${entry.backup} in the backup. Resolve it by hand, then rerun.`);
    if (!atOriginal && !atBackup) throw new AgsError(`Prepare backup ${folder.rel}: ${entry.original} exists neither at its original path nor at ${entry.backup} in the backup. Resolve it by hand, then rerun.`);
    return { ...entry, moved: atBackup };
  });
}

export function inspectSetup(hostRoot, { includeNested = false } = {}) {
  const incomplete = incompleteManifests(hostRoot);
  if (incomplete.length > 1) {
    throw new AgsError(`More than one incomplete prepare backup: ${incomplete.map((item) => item.folder.rel).join(", ")}. Keep one and move the others out of .tmp/ags/backups/.`);
  }
  const continuing = incomplete[0] ? { ...incomplete[0], states: moveStates(hostRoot, incomplete[0]) } : null;
  const inManifest = new Set(continuing ? continuing.manifest.files.map((entry) => entry.original) : []);
  const setup = walkSetup(hostRoot);
  const selected = includeNested ? [...setup.root, ...setup.nested] : setup.root;
  const fresh = selected.flatMap((entry) => entry.files).filter((rel) => !inManifest.has(rel));
  const pending = continuing ? continuing.states.filter((entry) => !entry.moved).map((entry) => entry.original) : [];
  const moves = [...new Set([...pending, ...fresh])].sort().map((rel) => ({ rel, hash: contentHash(fs.readFileSync(abs(hostRoot, rel))) }));
  return {
    hostRoot,
    setup,
    includeNested,
    continuing,
    moves,
    tools: toolConfigs(hostRoot),
    findings: findings(hostRoot),
    exclude: inspectExclude(hostRoot),
  };
}

function entryLabel(entry) {
  return entry.type === "folder" ? `${entry.path}/ (${entry.files.length} file${entry.files.length === 1 ? "" : "s"})` : entry.path;
}

export function setupNotes(state) {
  const notes = [];
  if (state.continuing) notes.push(`Continuing the incomplete prepare backup in ${state.continuing.folder.rel}.`);
  if (!state.includeNested && state.setup.nested.length) {
    notes.push(`Nested setup, listed and not moved (pass --include-nested to move it): ${state.setup.nested.map(entryLabel).join(", ")}.`);
  }
  if (state.tools.length) notes.push(`Tool configuration, reported and never moved: ${state.tools.join(", ")}.`);
  for (const finding of state.findings) notes.push(`Finding: ${finding}`);
  return notes;
}

export function manifestItemPath(state, operation) {
  return `${state.continuing ? state.continuing.folder.rel : `${BACKUPS_REL}/<stamp>-${operation}`}/manifest.json`;
}

export function prepareItems(state, { operation }) {
  const items = [];
  if (state.moves.length || state.continuing) {
    items.push(planItem({ path: manifestItemPath(state, operation), kind: "backup", action: state.continuing ? (state.moves.length ? "continue" : "mark complete") : "create" }));
  }
  for (const move of state.moves) {
    items.push(planItem({ path: move.rel, kind: "setup", action: `move to ${backupName(move.rel)}`, hashes: { H: move.hash } }));
  }
  if (state.exclude.need === "add") items.push(planItem({ path: EXCLUDE_KEY, kind: "exclude block", action: "add /.tmp/" }));
  if (state.exclude.need === "restore") items.push(planItem({ path: EXCLUDE_KEY, kind: "exclude block", choices: ["restore"], detail: "edited region" }));
  return items;
}

function pruneEmpty(dir, stopAt) {
  let current = dir;
  while (!samePath(current, stopAt) && current.startsWith(stopAt)) {
    try {
      if (fs.readdirSync(current).length) return;
      fs.rmdirSync(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

function pruneTree(dir) {
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneTree(path.join(dir, entry.name));
  }
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

export function applyExclude(ctx, state, { backupExclude }) {
  if (!state.exclude.need) return;
  if (state.exclude.need === "restore") backupExclude(state.exclude);
  fs.mkdirSync(path.dirname(state.exclude.file), { recursive: true });
  writeAtomic(state.exclude.file, state.exclude.next);
  ctx.done(EXCLUDE_KEY);
}

export function applyMoves(ctx, state, { operation, digest, from = null, to = null }) {
  const { hostRoot } = state;
  let folder;
  let files;
  if (state.continuing) {
    folder = state.continuing.folder;
    const known = new Set(state.continuing.manifest.files.map((entry) => entry.original));
    const added = state.moves.filter((move) => !known.has(move.rel)).map((move) => move.rel);
    const tracked = trackedPaths(hostRoot, added);
    files = [...state.continuing.manifest.files, ...added.map((rel) => manifestEntry(hostRoot, rel, tracked))];
  } else {
    folder = createBackupFolder(hostRoot, operation);
    const rels = state.moves.map((move) => move.rel);
    const tracked = trackedPaths(hostRoot, rels);
    files = rels.map((rel) => manifestEntry(hostRoot, rel, tracked));
  }
  const previous = state.continuing?.manifest;
  const header = previous ? { operation: previous.operation, from: previous.from ?? null, to: previous.to ?? null, digest } : { operation, from, to, digest };
  const manifestLabel = manifestItemPath(state, operation);
  writeManifest(folder, { ...header, complete: false, files });
  ctx.fault("after-manifest-written");

  const moving = new Set(state.moves.map((move) => move.rel));
  const pending = files.filter((entry) => moving.has(entry.original));
  pending.forEach((entry, index) => {
    const dest = abs(folder.abs, entry.backup);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(abs(hostRoot, entry.original), dest);
    ctx.done(entry.original);
    pruneEmpty(path.dirname(abs(hostRoot, entry.original)), hostRoot);
    ctx.faultEach("after-move", index, pending.length);
  });
  const entries = state.includeNested ? [...state.setup.root, ...state.setup.nested] : state.setup.root;
  for (const entry of entries.filter((item) => item.type === "folder")) {
    pruneTree(abs(hostRoot, entry.path));
    pruneEmpty(path.dirname(abs(hostRoot, entry.path)), hostRoot);
  }

  const wrong = pending.filter((entry) => exists(abs(hostRoot, entry.original)) || sha256(fs.readFileSync(abs(folder.abs, entry.backup))) !== entry.sha256);
  if (wrong.length) throw new AgsError(`Verification failed; these moves differ from the plan: ${wrong.map((entry) => entry.original).join(", ")}`);

  ctx.fault("before-manifest-complete");
  writeManifest(folder, { ...header, complete: true, files });
  ctx.done(manifestLabel);
  return folder;
}

function manifestEntry(hostRoot, rel, tracked) {
  const bytes = fs.readFileSync(abs(hostRoot, rel));
  return { original: rel, backup: backupName(rel), tracked: tracked.has(rel), bytes: bytes.length, sha256: sha256(bytes) };
}

export function backupExcludeInto(hostRoot, operation) {
  return (exclude) => {
    if (exclude.content == null) return;
    const folder = createBackupFolder(hostRoot, `${operation}-exclude`);
    const bytes = Buffer.from(exclude.content);
    const backup = backupName(EXCLUDE_KEY);
    const dest = abs(folder.abs, backup);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    writeManifest(folder, { operation, digest: null, files: [{ original: EXCLUDE_KEY, backup, tracked: false, bytes: bytes.length, sha256: sha256(bytes) }] });
  };
}

export function prepareOperation({ agsRoot, route, includeNested = false, rerunArgs }) {
  const command = "ags host prepare";
  const hostRoot = resolveHost(route, { agsRoot, command });
  const op = {
    name: "prepare",
    command: "host prepare",
    rerunArgs,
    hostRoot,
    includeNested,
    inspect() {
      refuseInstalled(hostRoot);
      return inspectSetup(hostRoot, { includeNested: op.includeNested });
    },
    plan(state) {
      return {
        header: { title: `ags host prepare: ${posix(hostRoot)}`, operation: "prepare", host: posix(hostRoot), includeNested: op.includeNested, notes: setupNotes(state) },
        items: prepareItems(state, { operation: "prepare" }),
      };
    },
    locks: () => [hostLockPath(hostRoot)],
    writeLabels(plan) {
      return plan.items.map((item) => item.path);
    },
    async apply(ctx) {
      const state = ctx.state;
      ctx.fault("after-host-lock");
      applyExclude(ctx, state, { backupExclude: backupExcludeInto(hostRoot, "prepare") });
      ctx.fault("after-exclude-block");
      if (!state.moves.length && !state.continuing) return ["Wrote /.tmp/ into the git exclude block. No setup to move."];
      const folder = applyMoves(ctx, state, { operation: "prepare", digest: ctx.digest });
      return [`Moved ${state.moves.length} file${state.moves.length === 1 ? "" : "s"} to ${folder.rel}.`, "", cleanupPrompt(folder.rel)];
    },
  };
  return op;
}

export async function hostPrepare({ agsRoot, route, includeNested = false, rerunArgs, terminal, options }) {
  const op = prepareOperation({ agsRoot, route, includeNested, rerunArgs });
  if (!includeNested && terminal.interactive && !options.dryRun) {
    refuseInstalled(op.hostRoot);
    const { nested } = walkSetup(op.hostRoot);
    if (nested.length) {
      terminal.log(`Nested setup found: ${nested.map(entryLabel).join(", ")}.`);
      const answer = String(await terminal.question("Move nested setup too? yes or no: ")).trim().toLowerCase();
      op.includeNested = answer === "yes" || answer === "y";
    }
  }
  return runOperation(op, { terminal, ...options });
}
