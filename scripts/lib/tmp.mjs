import fs from "node:fs";
import path from "node:path";
import { planItem, runOperation } from "./operation.mjs";
import { agsLockPath, hostLockPath } from "./reports.mjs";
import { AgsError, gitRoot, insidePath, isReparsePoint, normalizeIdentity, pathExists, posix, samePath, sha256, writeAtomic } from "./util.mjs";

const AREAS = [".tmp/plans", ".tmp/records", ".tmp/scratch"];
const HASH = /^[a-f0-9]{64}$/;

export function regularTmpPath(root, rel) {
  if (typeof rel !== "string" || rel.includes("\\") || rel.startsWith("/") || rel.includes(":") || rel.split("/").some((part) => !part || part === "." || part === "..")) throw new AgsError(`Invalid temporary path: ${rel}`);
  const file = insidePath(root, rel);
  let cursor = root;
  for (const segment of rel.split("/")) {
    cursor = path.join(cursor, segment);
    if (isReparsePoint(cursor) || fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new AgsError(`Temporary links are protected: ${rel}`);
  }
  return file;
}

export function inspectTmp(root) {
  const files = [];
  const visit = (rel) => {
    const dir = regularTmpPath(root, rel);
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink() || isReparsePoint(path.join(dir, entry.name))) continue;
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) files.push({ path: child, hash: sha256(fs.readFileSync(regularTmpPath(root, child))) });
    }
  };
  for (const area of AREAS) visit(area);
  return files.sort((a, b) => a.path < b.path ? -1 : 1);
}

export function tmpCleanOperation({ agsRoot, route, manifest, rerunArgs }) {
  const root = gitRoot(route);
  const manifestRel = posix(path.relative(root, path.resolve(root, manifest ?? "")));
  if (!manifestRel.startsWith(".tmp/records/") || !manifestRel.endsWith(".json")) throw new AgsError("--manifest must name a JSON file under .tmp/records/.", { exitCode: 2 });
  const manifestFile = regularTmpPath(root, manifestRel);
  const journalFile = path.join(root, ".tmp", "ags", "tmp-clean", `${sha256(manifestRel)}.json`);
  return {
    name: "tmp-clean", command: "tmp clean", rerunArgs,
    inspect() {
      const bytes = fs.readFileSync(manifestFile);
      const data = JSON.parse(bytes.toString("utf8"));
      if (data.schemaVersion !== 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.archiveMonth ?? "") || !Array.isArray(data.entries)) throw new AgsError("Invalid tmp cleanup manifest.");
      const manifestHash = sha256(bytes);
      const prior = fs.existsSync(journalFile) ? JSON.parse(fs.readFileSync(journalFile, "utf8")) : null;
      const journal = prior?.manifestHash === manifestHash ? prior : { manifestHash, entries: {} };
      const seen = new Set();
      const moves = [];
      for (const entry of data.entries) {
        if (!entry || typeof entry.path !== "string" || !["active", "keep", "completed", "archive"].includes(entry.disposition) || !HASH.test(entry.hash ?? "")) throw new AgsError("Invalid tmp manifest entry.");
        const rel = entry.path;
        if (!AREAS.some((area) => rel.startsWith(`${area}/`)) || rel === manifestRel || rel.split("/").slice(2).some((part) => part.startsWith("."))) throw new AgsError(`Protected temporary path: ${rel}`);
        const source = regularTmpPath(root, rel);
        const key = normalizeIdentity(source);
        if (seen.has(key)) throw new AgsError(`Duplicate tmp entry: ${rel}`);
        seen.add(key);
        if (["active", "keep"].includes(entry.disposition)) continue;
        const destination = `.tmp/archive/${data.archiveMonth}/${rel.slice(".tmp/".length)}`;
        const target = regularTmpPath(root, destination);
        if (!fs.existsSync(source)) {
          if (journal.entries[rel] === entry.hash && fs.existsSync(target) && sha256(fs.readFileSync(target)) === entry.hash) continue;
          throw new AgsError(`Temporary source missing: ${rel}`);
        }
        if (!fs.lstatSync(source).isFile() || sha256(fs.readFileSync(source)) !== entry.hash) throw new AgsError(`Stale temporary hash: ${rel}`);
        if (pathExists(target)) throw new AgsError(`Archive destination collision: ${destination}`);
        moves.push({ ...entry, source, target, destination });
      }
      return { moves, journal, manifestHash, archiveMonth: data.archiveMonth };
    },
    plan(state) { return { header: { title: `ags tmp clean: ${root}`, manifest: manifestRel, manifestHash: state.manifestHash, archiveMonth: state.archiveMonth }, items: state.moves.map((entry) => planItem({ path: entry.path, kind: "temporary artifact", action: `move to ${entry.destination}`, hashes: { H: entry.hash } })) }; },
    locks: () => [samePath(root, agsRoot) ? agsLockPath(root) : hostLockPath(root)],
    apply(ctx) {
      ctx.state.moves.forEach((entry, index) => {
        ctx.state.journal.entries[entry.path] = entry.hash;
        writeAtomic(journalFile, `${JSON.stringify(ctx.state.journal)}\n`);
        regularTmpPath(root, entry.destination);
        fs.mkdirSync(path.dirname(entry.target), { recursive: true });
        fs.renameSync(entry.source, entry.target);
        if (sha256(fs.readFileSync(entry.target)) !== entry.hash) throw new AgsError(`Archive verification failed: ${entry.destination}`);
        ctx.done(entry.path);
        ctx.faultEach("after-move", index, ctx.state.moves.length);
      });
      return [`Archived ${ctx.state.moves.length} temporary artifacts.`];
    },
  };
}

export async function cleanTmp(args) { return runOperation(tmpCleanOperation(args), { terminal: args.terminal, ...args.options }); }
