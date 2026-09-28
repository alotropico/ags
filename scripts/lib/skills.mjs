import { loadCatalog } from "./catalog.mjs";

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
