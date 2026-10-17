import { loadCatalog, parseFrontmatter } from "./catalog.mjs";
import fs from "node:fs";
import path from "node:path";
import { detectCapabilities, executeTool } from "./capabilities.mjs";
import { AGS_ROOT, AgsError, assertSlug, gitRoot, insidePath, samePath } from "./util.mjs";

export function discoverSkillNames(root) {
  const names = new Set();
  const targets = new Set();
  for (const rel of [".agents/skills", ".cursor/skills", ".claude/skills", ".codex/skills"]) {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      try {
        const folder = path.join(dir, entry.name);
        if (!fs.statSync(folder).isDirectory()) continue;
        const identity = fs.realpathSync(folder);
        if (targets.has(identity)) continue;
        const skill = path.join(folder, "SKILL.md");
        if (!fs.lstatSync(skill).isFile()) continue;
        // Preserve discovery of existing ordinary third-party directories.
        // Linked entries require valid entry metadata before following them.
        let name = entry.name;
        if (entry.isSymbolicLink()) {
          const metadata = parseFrontmatter(fs.readFileSync(skill, "utf8")).data;
          if (!metadata || typeof metadata.name !== "string" || typeof metadata.description !== "string") continue;
          name = metadata.name;
        }
        names.add(name);
        targets.add(identity);
      } catch {}
    }
  }
  return [...names].sort();
}

export async function skillAdd({ route, source, skill, terminal, agsRoot = AGS_ROOT }) {
  const root = gitRoot(route);
  if (samePath(root, agsRoot)) throw new AgsError("AGS is not a host; install project skills in a host repository.");
  const backend = detectCapabilities(root).skills;
  if (!backend) throw new AgsError("The skills CLI is unavailable. Install it, then run ags setup.");
  if (!source || source.startsWith("-")) throw new AgsError("Pass a concrete skill source.", { exitCode: 2 });
  if (!skill) {
    if (!terminal.interactive) throw new AgsError("Non-interactive ags skill add requires --skill <name>.", { exitCode: 2 });
    const code = executeTool(backend, ["add", source, "--list"], { cwd: root, terminal });
    if (code) return code;
    skill = String(await terminal.question("Skill name to install: ")).trim();
  }
  assertSlug(skill, "skill name");
  for (const rel of [".agents/skills", ".cursor/skills", ".claude/skills", ".codex/skills"]) {
    const destination = insidePath(root, `${rel}/${skill}`);
    if (fs.existsSync(destination)) throw new AgsError(`Skill destination already exists: ${destination}`);
  }
  const fresh = detectCapabilities(root).skills;
  if (fresh !== backend) throw new AgsError("The skills executable changed; rerun setup.");
  return executeTool(fresh, ["add", source, "--skill", skill, "--agent", "codex", "--copy", "--yes"], { cwd: root, terminal });
}

export function catalogRows(agsRoot) {
  const catalog = loadCatalog(agsRoot);
  const rows = [];
  for (const entry of catalog.rules) {
    rows.push({ id: entry.id, kind: `${entry.tier} rule`, install: entry.install, description: entry.description ?? "", keywords: [] });
  }
  for (const entry of catalog.skills) {
    rows.push({ id: entry.id, kind: "skill", install: entry.install, description: entry.description ?? "", keywords: entry.keywords ?? [] });
  }
  return rows;
}

export function skillsList({ agsRoot, terminal }) {
  const rows = catalogRows(agsRoot);
  const width = (key) => Math.max(...rows.map((row) => row[key].length));
  const [id, kind, install] = [width("id"), width("kind"), width("install")];
  for (const row of rows) {
    const keywords = row.keywords.length ? ` [${row.keywords.join(", ")}]` : "";
    const description = row.description || (row.kind === "strong rule" ? "(always in the AGS block)" : "");
    terminal.log(`${row.id.padEnd(id)}  ${row.kind.padEnd(kind)}  ${row.install.padEnd(install)}  ${description}${keywords}`);
  }
  return 0;
}
