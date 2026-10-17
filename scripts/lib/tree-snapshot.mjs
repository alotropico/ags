import fs from "node:fs";
import path from "node:path";
import { backupStamp } from "./backup.mjs";
import { AgsError, insidePath, pathExists, posix } from "./util.mjs";

const EXCLUDED = new Set([".git", "node_modules", ".tmp"]);
const label = (name) => JSON.stringify(name).slice(1, -1).replaceAll("`", "\\u0060");

export function collectTreeSnapshot(root) {
  const lines = [`${label(path.basename(root))}/`];
  const counts = { directories: 0, files: 0, links: 0 };
  const walk = (directory, prefix) => {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .filter((entry) => !EXCLUDED.has(entry.name))
      .map((entry) => {
        const abs = path.join(directory, entry.name);
        return { name: entry.name, abs, stat: fs.lstatSync(abs) };
      })
      .sort((a, b) => Number(b.stat.isDirectory()) - Number(a.stat.isDirectory()) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    entries.forEach((entry, index) => {
      const last = index === entries.length - 1;
      const isLink = entry.stat.isSymbolicLink();
      const isDirectory = !isLink && entry.stat.isDirectory();
      lines.push(`${prefix}${last ? "└── " : "├── "}${label(entry.name)}${isLink ? " [link]" : isDirectory ? "/" : ""}`);
      if (isLink) counts.links += 1;
      else if (isDirectory) {
        counts.directories += 1;
        walk(entry.abs, `${prefix}${last ? "    " : "│   "}`);
      } else counts.files += 1;
    });
  };
  walk(root, "");
  return { lines, ...counts };
}

export function writeTreeSnapshot(root, { out = null, now = new Date() } = {}) {
  root = path.resolve(root);
  const stamp = backupStamp(now);
  const target = out ? path.resolve(out) : path.join(root, ".tmp", "records", `${stamp.slice(0, 10)}-tree-snapshot-${stamp.slice(11)}.md`);
  if (!target.toLowerCase().endsWith(".md")) throw new AgsError("Tree snapshot output must end in .md", { exitCode: 2 });
  const relative = posix(path.relative(root, target));
  insidePath(root, relative);
  if (/^\.git(\/|$)/i.test(relative)) throw new AgsError("Refusing to write a tree snapshot inside .git.");
  if (pathExists(target)) throw new AgsError(`Tree snapshot output already exists: ${target}`);
  const tree = collectTreeSnapshot(root);
  const markdown = [
    "# Repository tree snapshot",
    "",
    `Root: ${label(posix(root))}`,
    `Created: ${now.toISOString()}`,
    "",
    "Lists names only, including hidden, untracked and Git-ignored entries. Excludes .git, node_modules and .tmp at every level. Links are marked and not followed. Empty directories are included.",
    "",
    `${tree.directories} directories, ${tree.files} files, ${tree.links} links (root excluded from counts).`,
    "",
    "```text",
    ...tree.lines,
    "```",
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, markdown, { encoding: "utf8", flag: "wx" });
  return { path: target, directories: tree.directories, files: tree.files, links: tree.links };
}
