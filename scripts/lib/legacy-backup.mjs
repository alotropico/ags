import fs from "node:fs";
import path from "node:path";
import { BACKUPS_REL, backupFile, backupName, createBackupFolder, readManifest, trackedPaths, writeManifest } from "./backup.mjs";
import { walkSetup, SETUP_FILES, SETUP_FOLDERS } from "./discovery.mjs";
import { resolveHost } from "./prepare.mjs";
import { planItem, runOperation } from "./operation.mjs";
import { hostLockPath } from "./reports.mjs";
import { AgsError, assertRelativePath, insidePath, isReparsePoint, posix, sha256 } from "./util.mjs";

function safeSource(root, rel) {
  assertRelativePath(posix(rel));
  if (!rel || path.isAbsolute(rel) || rel.includes(":") || posix(rel).split("/").some((part) => !part || part === "." || part === "..") || /^\.(git|tmp)(\/|$)/.test(posix(rel))) throw new AgsError(`Unsafe backup file: ${rel}`);
  const target = path.resolve(root, ...posix(rel).split("/"));
  let cursor = root;
  for (const part of posix(rel).split("/")) {
    cursor = path.join(cursor, part);
    if (isReparsePoint(cursor)) return { link: true, target };
  }
  return { link: fs.lstatSync(target).isSymbolicLink(), target };
}

export function backupOnlyOperation({ agsRoot, route, includeNested = false, files = [], rerunArgs }) {
  const root = resolveHost(route, { agsRoot, command: "ags host prepare --backup-only" });
  return {
    name: "backup-only", command: "host prepare --backup-only", rerunArgs,
    inspect() {
      const setup = walkSetup(root);
      const rels = [...new Set([...(includeNested ? [...setup.root, ...setup.nested] : setup.root).flatMap((item) => item.files), ...files.map(posix)])].sort();
      const links = [];
      const checkLinks = (rel) => {
        const file = path.join(root, rel);
        let stat;
        try { stat = fs.lstatSync(file); } catch { return; }
        if (isReparsePoint(file) || stat.isSymbolicLink()) { links.push(posix(rel)); return; }
        if (stat.isDirectory()) for (const entry of fs.readdirSync(file)) checkLinks(`${rel}/${entry}`);
      };
      for (const rel of [...SETUP_FILES, ...SETUP_FOLDERS]) checkLinks(rel);
      const entries = [];
      const targets = new Map();
      for (const rel of rels) {
        const source = safeSource(root, rel);
        if (source.link) { links.push(rel); continue; }
        if (!fs.lstatSync(source.target).isFile()) throw new AgsError(`Backup requires a regular file: ${rel}`);
        const targetName = backupName(rel).toLowerCase();
        if (targets.has(targetName)) throw new AgsError(`Backup destination collision: ${rel}`);
        targets.set(targetName, rel);
        entries.push({ rel, hash: sha256(fs.readFileSync(source.target)) });
      }
      for (const [targetName, rel] of targets) {
        const parts = targetName.split("/");
        for (let length = 1; length < parts.length; length += 1) {
          const parent = targets.get(parts.slice(0, length).join("/"));
          if (parent) throw new AgsError(`Backup destination collision: ${parent} maps to a file where ${rel} needs a directory`);
        }
      }
      let continuing = null;
      const parent = path.join(root, BACKUPS_REL);
      if (fs.existsSync(parent)) for (const name of fs.readdirSync(parent).sort()) {
        const folder = { abs: path.join(parent, name), rel: `${BACKUPS_REL}/${name}` };
        if (!fs.lstatSync(folder.abs).isDirectory()) continue;
        const manifest = readManifest(folder.abs);
        if (manifest?.operation === "backup-only" && manifest.complete === false) {
          if (continuing) throw new AgsError("Multiple incomplete copy-only backups; resolve them before retrying.");
          if (JSON.stringify(manifest.expected) !== JSON.stringify(entries)) throw new AgsError(`Copy-only sources changed since ${folder.rel}; preserve it and review a new backup.`);
          continuing = { folder, manifest };
        }
      }
      return { entries, links, continuing };
    },
    plan(state) {
      return { header: { title: `ags host prepare --backup-only: ${root}`, notes: state.links.map((rel) => `Link requires manual handling: ${rel}`) }, items: state.entries.map((entry) => planItem({ path: entry.rel, kind: "legacy setup", action: "copy and verify (original retained)", hashes: { H: entry.hash } })) };
    },
    locks: () => [hostLockPath(root)],
    apply(ctx) {
      const { entries } = ctx.state;
      const folder = ctx.state.continuing?.folder ?? createBackupFolder(root, "backup-only");
      const tracked = trackedPaths(root, entries.map((entry) => entry.rel));
      const manifest = { operation: "backup-only", digest: ctx.digest, complete: false, expected: entries, files: [] };
      writeManifest(folder, manifest);
      entries.forEach((entry, index) => {
        const source = safeSource(root, entry.rel);
        if (source.link || sha256(fs.readFileSync(source.target)) !== entry.hash) throw new AgsError(`Backup source changed: ${entry.rel}`);
        const record = backupFile(root, folder, entry.rel, { tracked: tracked.has(entry.rel) });
        if (sha256(fs.readFileSync(insidePath(folder.abs, record.backup))) !== entry.hash || sha256(fs.readFileSync(source.target)) !== entry.hash) throw new AgsError(`Copy-only verification failed: ${entry.rel}`);
        manifest.files.push(record);
        writeManifest(folder, manifest);
        ctx.done(entry.rel);
        ctx.faultEach("after-copy", index, entries.length);
      });
      for (const record of manifest.files) if (sha256(fs.readFileSync(insidePath(folder.abs, record.backup))) !== record.sha256 || sha256(fs.readFileSync(safeSource(root, record.original).target)) !== record.sha256) throw new AgsError(`Backup or source changed before completion: ${record.original}`);
      manifest.complete = true;
      writeManifest(folder, manifest);
      return [`Verified copy-only backup: ${folder.rel}. Original files are unchanged.`];
    },
  };
}

export async function hostBackupOnly(args) { return runOperation(backupOnlyOperation(args), { terminal: args.terminal, ...args.options }); }
