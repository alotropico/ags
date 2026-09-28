import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { loadCatalog, selectionErrors, validateCatalog } from "./catalog.mjs";
import { findHostRoot, loadRegistry, readSettings, syncOne, validateSettings } from "./host.mjs";
import { crossSkillIds, relativeLinkErrors } from "./links.mjs";
import { AGS_ROOT, assertCanonicalAccess, assertNoLinkEscape, gitRoot, samePath } from "./util.mjs";

const LEGACY = ["src", "build", "dist", "architecture", "capabilities", "routes", "runtime", "views", "workflows", "hooks", "archive", "stewardship"];

export function doctor(root = AGS_ROOT, route = null) {
  const lines = [];
  const failures = [];
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 20) failures.push(`Node ${process.versions.node} is below 20`);
  else lines.push(`node: ${process.versions.node}`);
  lines.push(`canonical: ${root}`);
  for (const name of LEGACY) {
    if (fs.existsSync(path.join(root, name))) failures.push(`unexpected legacy path: ${name}`);
  }
  for (const name of ["AGENTS.md", "README.md", "package.json", "catalog.yaml", "rules/core.md", "templates/host-ags.md", "templates/agents-block.md", "scripts/ags.mjs"]) {
    if (!fs.existsSync(path.join(root, name))) failures.push(`missing ${name}`);
  }
  try {
    const catalog = loadCatalog(root);
    const errors = validateCatalog(catalog);
    failures.push(...errors);
    for (const skill of catalog.skills) {
      const file = path.join(root, ...skill.path.split("/"));
      if (!fs.existsSync(file)) {
        failures.push(`missing ${skill.path}`);
        continue;
      }
      try {
        assertNoLinkEscape(root, file);
      } catch (error) {
        failures.push(error.message);
      }
      const text = fs.readFileSync(file, "utf8");
      const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!front) failures.push(`${skill.id} missing frontmatter`);
      else {
        try {
          const data = parse(front[1]);
          if (data?.name !== skill.id) failures.push(`${skill.id} frontmatter name must be ${skill.id}`);
        } catch (error) {
          failures.push(`${skill.id} frontmatter is invalid: ${error.message}`);
        }
      }
      if (path.basename(path.dirname(file)) !== skill.id) failures.push(`${skill.id} directory must match its id`);
      for (const href of relativeLinkErrors(root, path.dirname(file), text)) {
        failures.push(`${skill.id} broken link: ${href}`);
      }
    }
    for (const rule of catalog.rules) {
      const file = path.join(root, ...rule.path.split("/"));
      if (!fs.existsSync(file)) failures.push(`missing ${rule.path}`);
    }
    for (const skill of catalog.skills) {
      const file = path.join(root, ...skill.path.split("/"));
      if (!fs.existsSync(file)) continue;
      const linked = crossSkillIds(root, path.dirname(file), fs.readFileSync(file, "utf8"));
      for (const id of linked) {
        if (!(skill.includes || []).includes(id)) failures.push(`${skill.id} link to ${id} is missing from includes`);
      }
      for (const id of skill.includes || []) {
        if (!catalog.skills.some((item) => item.id === id)) failures.push(`${skill.id} includes unknown id: ${id}`);
      }
    }
    lines.push(`catalog: ${catalog.skills.length} skills, ${catalog.rules.length} rules`);
  } catch (error) {
    failures.push(error.message);
  }
  for (const dir of ["reports/usage", "reports/changes", "reports/.locks", ".tmp"]) {
    const abs = path.join(root, dir);
    try {
      fs.mkdirSync(abs, { recursive: true });
      fs.accessSync(abs, fs.constants.W_OK);
    } catch (error) {
      failures.push(`not writable: ${dir} (${error.message})`);
    }
  }
  try {
    assertCanonicalAccess(root);
    lines.push("access: read-write");
  } catch (error) {
    failures.push(error.message);
  }
  if (route) {
    const hostRoot = findHostRoot(route);
    if (!hostRoot) failures.push(`no host settings at ${route}`);
    else {
      try {
        const repo = gitRoot(hostRoot);
        if (!samePath(repo, hostRoot)) failures.push(`host settings are not at the Git root: ${hostRoot}`);
        else lines.push("git: root");
      } catch (error) {
        failures.push(`git: ${error.message}`);
      }
      try {
        const registry = loadRegistry(root);
        const entry = registry.hosts.find((host) => host.path && samePath(host.path, hostRoot));
        if (!entry) failures.push(`host not registered: ${hostRoot}`);
        const settings = readSettings(hostRoot);
        failures.push(...validateSettings(settings, root));
        const catalog = loadCatalog(root);
        failures.push(...selectionErrors(catalog, settings));
        const report = syncOne(root, hostRoot);
        if (report.status !== "clean" && report.status !== "warning") failures.push(...(report.issues || []));
        else lines.push(`host: ${report.id} ${report.status}`);
        fs.accessSync(path.join(root, "reports"), fs.constants.W_OK);
        lines.push("reporting: append ready");
      } catch (error) {
        failures.push(error.message);
      }
    }
  }
  return { ok: failures.length === 0, lines, failures };
}
