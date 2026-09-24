import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { loadCatalog, saveCatalog, validateCatalog } from "./catalog.mjs";
import { supportedDiscoveryRoots } from "./discovery.mjs";
import { loadRegistry, resolveRoute, settingsPath, verifyRegistered, writeManaged } from "./host.mjs";
import { crossSkillIds, isExternalHref, markdownHrefs } from "./links.mjs";
import { appendReport, canonicalFile, reportStamp } from "./reports.mjs";
import {
  AgsError,
  assertNoLinkEscape,
  assertSlug,
  copyTree,
  displayPath,
  mapsEqual,
  normalizedFileMap,
  quarantine,
  relativeInside,
  walkFiles,
} from "./util.mjs";

export function listSkills(root) {
  return loadCatalog(root).skills;
}

function frontmatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new AgsError(`Missing frontmatter: ${file}`);
  const data = parse(match[1]);
  return { text, data };
}

function validateSkillTree(root, id, directory) {
  assertSlug(id, "skill id");
  const skillFile = path.join(directory, "SKILL.md");
  if (!fs.existsSync(skillFile)) throw new AgsError(`Missing SKILL.md: ${skillFile}`);
  const dest = path.join(root, "skills", id);
  assertNoLinkEscape(root, path.join(root, "skills"));
  if (fs.existsSync(dest)) assertNoLinkEscape(root, dest);
  const { text, data } = frontmatter(skillFile);
  if (data?.name !== id) throw new AgsError(`${id} frontmatter name must be ${id}`);
  for (const file of walkFiles(directory)) {
    const rel = path.relative(directory, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new AgsError(`Skill path escapes ${id}`);
  }
  return { text, data };
}

function skillMarkdownFiles(directory) {
  return walkFiles(directory).filter((file) => file.toLowerCase().endsWith(".md"));
}

function insideDir(directory, target) {
  const rel = path.relative(directory, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function projectionProblems(root, id, sourceDir, catalog) {
  const problems = [];
  const linked = [];
  for (const file of skillMarkdownFiles(sourceDir)) {
    const rel = path.relative(sourceDir, file);
    const text = fs.readFileSync(file, "utf8");
    const projectedDir = path.join(root, "skills", id, path.dirname(rel));
    for (const href of markdownHrefs(text)) {
      if (isExternalHref(href)) continue;
      if (path.isAbsolute(href)) {
        problems.push({ kind: "unsafe", href });
        continue;
      }
      const sourceTarget = path.resolve(path.dirname(file), href);
      if (insideDir(sourceDir, sourceTarget)) {
        if (!fs.existsSync(sourceTarget) || !fs.statSync(sourceTarget).isFile()) problems.push({ kind: "broken-internal", href });
        continue;
      }
      const projected = path.resolve(projectedDir, href);
      let canonRel = null;
      try {
        canonRel = relativeInside(root, projected);
      } catch {
        canonRel = null;
      }
      const skillMatch = canonRel?.match(/^skills\/([a-z0-9][a-z0-9-]*)\/SKILL\.md$/);
      if (skillMatch) {
        const targetId = skillMatch[1];
        if (!linked.includes(targetId)) linked.push(targetId);
        const known = catalog.skills.some((item) => item.id === targetId) || targetId === id;
        if (!known || !fs.existsSync(path.join(root, "skills", targetId, "SKILL.md"))) {
          problems.push({ kind: "missing-skill", href, id: targetId });
        }
        continue;
      }
      if (canonRel && fs.existsSync(projected) && fs.statSync(projected).isFile()) continue;
      problems.push({ kind: "host-local", href, from: rel });
    }
  }
  return { problems, linked };
}

function assertCanonicalProjection(root, id, sourceDir, catalog) {
  const { problems, linked } = projectionProblems(root, id, sourceDir, catalog);
  const missing = problems.find((item) => item.kind === "missing-skill");
  if (missing) throw new AgsError(`Missing linked skill: ${missing.id}`);
  const unsafe = problems.find((item) => item.kind === "unsafe" || item.kind === "broken-internal");
  if (unsafe) throw new AgsError(`${id} broken link: ${unsafe.href}`);
  const hostLocal = problems.filter((item) => item.kind === "host-local");
  if (hostLocal.length) {
    const error = new AgsError(`${id} requires a host-local location: ${hostLocal.map((item) => item.href).join(", ")}`);
    error.code = "HOST_LOCAL";
    error.links = hostLocal;
    throw error;
  }
  return linked;
}

function hostProjectionHolds(hostRoot, id, sourceDir, links) {
  const skillDir = path.join(hostRoot, ".agents", "skills", id);
  for (const link of links) {
    const from = path.join(skillDir, path.dirname(link.from));
    const target = path.resolve(from, link.href);
    try {
      relativeInside(hostRoot, target);
    } catch {
      return false;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return false;
  }
  return true;
}

function withLinkedIncludes(entry, linked) {
  const includes = [];
  for (const id of [...linked, ...(entry.includes || [])]) {
    if (id !== entry.id && !includes.includes(id)) includes.push(id);
  }
  if (includes.length) entry.includes = includes;
  return entry;
}

export async function installSkill(root, { from, id, kind, description, keywords = [], source, yes, replace = false, route }) {
  if (!from || !id || !kind || !description) {
    throw new AgsError("skills install requires --from, --id, --kind, and --description");
  }
  assertSlug(id, "skill id");
  if (kind !== "custom" && kind !== "third-party") throw new AgsError("kind must be custom or third-party");
  const sourceDir = path.resolve(from);
  validateSkillTree(root, id, sourceDir);
  const catalog = loadCatalog(root);
  const dest = path.join(root, "skills", id);
  if (fs.existsSync(path.join(dest, "SKILL.md"))) {
    const sameContent = mapsEqual(normalizedFileMap(sourceDir), normalizedFileMap(dest));
    if (!sameContent && !replace) {
      throw new AgsError(`Skill ${id} already exists with different content. Pass --replace to overwrite.`);
    }
  }
  let linked = [];
  try {
    linked = assertCanonicalProjection(root, id, sourceDir, catalog);
  } catch (error) {
    if (error.code !== "HOST_LOCAL") throw error;
    if (!route) {
      throw new AgsError("Canonical installation needs a host-local path. Rerun with --route <host> if host-local fallback is intended.");
    }
    return installHostLocal(root, catalog, sourceDir, { id, description, source, yes, route, replace });
  }
  const entry = {
    id,
    kind,
    path: `skills/${id}/SKILL.md`,
    description,
    default: false,
    keywords: keywords.length ? keywords : [id],
  };
  withLinkedIncludes(entry, linked);
  if (kind === "third-party") {
    entry.source = typeof source === "string"
      ? { locator: source, installMethod: "imported" }
      : source || { locator: "unknown", installMethod: "imported" };
  }
  const next = structuredClone(catalog);
  const index = next.skills.findIndex((item) => item.id === id);
  if (index >= 0) next.skills[index] = { ...next.skills[index], ...entry };
  else next.skills.push(entry);
  const catalogErrors = validateCatalog(next);
  if (catalogErrors.length) throw new AgsError(catalogErrors.join("\n"));
  const existed = fs.existsSync(path.join(dest, "SKILL.md"));
  let same = false;
  if (existed) {
    same = mapsEqual(normalizedFileMap(sourceDir), normalizedFileMap(dest));
    if (!same && !replace) {
      throw new AgsError(`Skill ${id} already exists with different content. Pass --replace to overwrite.`);
    }
  }
  if (!yes) return { applied: false, id, dest, collision: existed && !same, idempotent: same };
  if (same) {
    const previous = JSON.stringify(catalog.skills.find((item) => item.id === id));
    const proposed = JSON.stringify(next.skills.find((item) => item.id === id));
    if (previous === proposed) return { applied: true, id, dest, idempotent: true };
    saveCatalog(root, next);
    await appendReport(root, "changes", {
      timestamp: reportStamp(),
      host: "AGS",
      files: [{ path: canonicalFile(root, path.join(root, "catalog.yaml")), level: 9 }],
      note: `Installed skill ${id}`,
    });
    return { applied: true, id, dest, idempotent: true };
  }
  const stage = path.join(root, ".tmp", "runtime", "skill-stage", `${id}-${process.pid}`);
  const backup = path.join(root, ".tmp", "runtime", "skill-backup", `${id}-${process.pid}`);
  fs.rmSync(stage, { recursive: true, force: true });
  copyTree(sourceDir, stage);
  assertCanonicalProjection(root, id, stage, next);
  const hadDest = fs.existsSync(dest);
  if (hadDest) {
    fs.rmSync(backup, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.renameSync(dest, backup);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(stage, dest);
  try {
    saveCatalog(root, next);
  } catch (error) {
    fs.rmSync(dest, { recursive: true, force: true });
    if (hadDest) fs.renameSync(backup, dest);
    throw error;
  }
  const skillPath = `skills/${id}/SKILL.md`;
  const changed = [dest, path.join(root, "catalog.yaml")];
  try {
    await appendReport(root, "changes", {
      timestamp: reportStamp(),
      host: "AGS",
      files: [
        { path: canonicalFile(root, skillPath), level: 9 },
        { path: canonicalFile(root, path.join(root, "catalog.yaml")), level: 9 },
      ],
      note: `Installed skill ${id}`,
    });
  } catch (error) {
    throw new AgsError(`Change report failed after content was saved. Changed files: ${skillPath}, catalog.yaml. ${error.message}`, {
      written: changed,
    });
  }
  if (hadDest) fs.rmSync(backup, { recursive: true, force: true });
  return { applied: true, id, dest };
}

function exceptionRecord(id, relPath, source) {
  return {
    id,
    path: relPath,
    reason: "requires-host-location",
    source: typeof source === "string" && source.trim() ? source : "unknown",
  };
}

function sameException(item, record) {
  return item?.id === record.id && item.path === record.path && item.reason === record.reason && item.source === record.source;
}

async function installHostLocal(root, catalog, sourceDir, { id, description, source, yes, route, replace }) {
  const hostRoot = resolveRoute(route);
  const verified = verifyRegistered(root, hostRoot);
  if (catalog.skills.some((item) => item.id === id)) {
    throw new AgsError(`Skill ${id} already exists in the canonical catalog`);
  }
  const { problems } = projectionProblems(root, id, sourceDir, catalog);
  const hostLinks = problems.filter((item) => item.kind === "host-local");
  if (!hostLinks.length || problems.some((item) => item.kind !== "host-local")) {
    throw new AgsError(`${id} cannot fall back to a host-local exception`);
  }
  if (!hostProjectionHolds(hostRoot, id, sourceDir, hostLinks)) {
    throw new AgsError(`${id} broken link: ${hostLinks.map((item) => item.href).join(", ")}`);
  }
  const relPath = `.agents/skills/${id}/SKILL.md`;
  const dest = path.join(hostRoot, ".agents", "skills", id);
  if (!yes) return { applied: false, id, dest, hostLocal: true, host: verified.entry.id };
  const record = exceptionRecord(id, relPath, source);
  const destExists = fs.existsSync(path.join(dest, "SKILL.md"));
  const sameBytes = destExists && mapsEqual(normalizedFileMap(sourceDir), normalizedFileMap(dest));
  if (destExists && !sameBytes && !replace) {
    throw new AgsError(`Skill ${id} already exists at the host with different content`);
  }
  const already = (verified.settings.skills.localExceptions || []).some((item) => sameException(item, record));
  if (sameBytes && already) {
    return { applied: true, id, dest, hostLocal: true, host: verified.entry.id, idempotent: true };
  }
  const stage = path.join(hostRoot, ".tmp", "ags-skill-stage", `${id}-${process.pid}`);
  fs.rmSync(stage, { recursive: true, force: true });
  if (!sameBytes) copyTree(sourceDir, stage);
  if (!hostProjectionHolds(hostRoot, id, sourceDir, hostLinks)) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw new AgsError(`${id} broken link: ${hostLinks.map((item) => item.href).join(", ")}`);
  }
  const settings = structuredClone(verified.settings);
  settings.skills.localExceptions = [
    ...(settings.skills.localExceptions || []).filter((item) => item.id !== id),
    record,
  ];
  settings.skills.enabled = settings.skills.enabled.filter((item) => item !== id);
  settings.skills.disabled = (settings.skills.disabled || []).filter((item) => item !== id);
  const backups = [];
  const remember = (file) => {
    backups.push({ file, existed: fs.existsSync(file), data: fs.existsSync(file) ? fs.readFileSync(file) : null });
  };
  const restoreSettings = () => {
    for (const item of backups.reverse()) {
      if (!item.existed) {
        if (fs.existsSync(item.file)) fs.rmSync(item.file, { force: true });
      } else fs.writeFileSync(item.file, item.data);
    }
  };
  let placed = false;
  let quarantined = null;
  try {
    for (const rel of [".agents/ags.yaml", ".agents/AGS.md"]) remember(path.join(hostRoot, rel));
    writeManaged(root, catalog, hostRoot, settings);
    verifyRegistered(root, hostRoot);
    if (!sameBytes) {
      if (destExists) quarantined = quarantine(hostRoot, dest);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(stage, dest);
      placed = true;
    } else fs.rmSync(stage, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    if (!placed) restoreSettings();
    if (quarantined && !placed && fs.existsSync(quarantined) && !fs.existsSync(dest)) fs.renameSync(quarantined, dest);
    throw error;
  }
  const warning = `Canonical installation was incompatible. Installed ${id} as a registered host-local exception for ${verified.entry.name} and recorded the exception in AGS.`;
  try {
    await appendReport(root, "exceptions", {
      timestamp: reportStamp(),
      host: verified.entry.name,
      kind: "host-local-skill",
      skill: id,
      reason: "requires-host-location",
      path: relPath,
    });
  } catch (error) {
    throw new AgsError(`${warning} Exception report failed. Installed path: ${displayPath(path.join(dest, "SKILL.md"))}. ${error.message}`, {
      written: [dest, settingsPath(hostRoot)],
    });
  }
  console.error(warning);
  return { applied: true, id, dest, hostLocal: true, host: verified.entry.id, warning };
}

export async function reconcile(root, { route, all, dryRun, noEnable, yes, inject } = {}) {
  const catalog = loadCatalog(root);
  const hosts = targetHosts(root, { route, all });
  const results = [];
  for (const host of hosts) {
    if (host.unreachable) {
      results.push(host);
      continue;
    }
    const found = discover(host.hostRoot);
    let stopped = false;
    const approved = new Set((host.settings?.skills?.localExceptions || []).map((item) => item.id));
    for (const skill of found) {
      if (stopped) break;
      if (approved.has(skill.id)) {
        results.push({ host: host.entry.id, id: skill.id, status: "skipped", reason: "host-local exception" });
        continue;
      }
      const result = await reconcileOne(root, catalog, host, skill, { dryRun, noEnable, yes, inject });
      results.push(result);
      if (result.status === "collision") stopped = true;
    }
    if (!found.length) results.push({ host: host.entry.id, status: "none" });
  }
  const failed = results.some((item) => item.status === "collision" || item.status === "error" || item.unreachable);
  return { results, ok: !failed };
}

function targetHosts(root, { route, all }) {
  if (all) {
    return loadRegistry(root).hosts.map((entry) => {
      if (!fs.existsSync(entry.path)) {
        return { unreachable: true, id: entry.id, path: entry.path, status: "unreachable" };
      }
      try {
        const verified = verifyRegistered(root, entry.path);
        return { entry: verified.entry, settings: verified.settings, hostRoot: entry.path };
      } catch (error) {
        return { unreachable: true, id: entry.id, path: entry.path, status: "unreachable", message: error.message };
      }
    });
  }
  const hostRoot = resolveRoute(route);
  const verified = verifyRegistered(root, hostRoot);
  return [{ entry: verified.entry, settings: verified.settings, hostRoot }];
}

function discover(hostRoot) {
  const found = [];
  for (const rel of supportedDiscoveryRoots()) {
    const dir = path.join(hostRoot, ...rel.split("/"));
    if (!fs.existsSync(dir)) continue;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const skillDir = path.join(dir, item.name);
      if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) continue;
      found.push({ id: item.name, dir: skillDir, root: rel });
    }
  }
  return found;
}

async function adoptDiscoveredException(root, catalog, host, skill, { dryRun }) {
  const relPath = `.agents/skills/${skill.id}/SKILL.md`;
  const record = exceptionRecord(skill.id, relPath, "unknown");
  const plan = {
    host: host.entry.id,
    id: skill.id,
    status: "host-local-exception",
    path: relPath,
    reason: "requires-host-location",
    destination: skill.dir,
  };
  if (dryRun) return plan;
  const before = fs.readFileSync(path.join(skill.dir, "SKILL.md"));
  const settings = structuredClone(host.settings);
  const prior = settings.skills.localExceptions || [];
  const already = prior.some((item) => sameException(item, record));
  settings.skills.localExceptions = [...prior.filter((item) => item.id !== skill.id), record];
  settings.skills.enabled = settings.skills.enabled.filter((item) => item !== skill.id);
  settings.skills.disabled = (settings.skills.disabled || []).filter((item) => item !== skill.id);
  const files = [".agents/ags.yaml", ".agents/AGS.md"].map((rel) => path.join(host.hostRoot, rel));
  const backups = files.map((file) => ({ file, existed: fs.existsSync(file), data: fs.existsSync(file) ? fs.readFileSync(file) : null }));
  try {
    writeManaged(root, catalog, host.hostRoot, settings);
    verifyRegistered(root, host.hostRoot);
    host.settings = settings;
  } catch (error) {
    for (const item of backups.reverse()) {
      if (!item.existed) {
        if (fs.existsSync(item.file)) fs.rmSync(item.file, { force: true });
      } else fs.writeFileSync(item.file, item.data);
    }
    return { ...plan, status: "error", message: error.message };
  }
  if (!fs.readFileSync(path.join(skill.dir, "SKILL.md")).equals(before)) {
    return { ...plan, status: "error", message: `${skill.id} bytes changed during exception registration` };
  }
  if (!already) {
    await appendReport(root, "exceptions", {
      timestamp: reportStamp(),
      host: host.entry.name,
      kind: "host-local-skill",
      skill: skill.id,
      reason: "requires-host-location",
      path: relPath,
    });
  }
  return plan;
}

async function reconcileOne(root, catalog, host, skill, { dryRun, noEnable, inject }) {
  const plan = {
    host: host.entry.id,
    id: skill.id,
    destination: path.join(root, "skills", skill.id),
    enable: !noEnable,
    remove: skill.dir,
  };
  let linked = [];
  try {
    assertSlug(skill.id, "skill id");
    validateSkillTree(root, skill.id, skill.dir);
    linked = assertCanonicalProjection(root, skill.id, skill.dir, catalog);
  } catch (error) {
    const inCatalog = catalog.skills.some((item) => item.id === skill.id);
    if (error.code === "HOST_LOCAL" && !inCatalog) return adoptDiscoveredException(root, catalog, host, skill, { dryRun });
    if (error.code === "HOST_LOCAL" && inCatalog) {
      const canonicalDir = path.join(root, "skills", skill.id);
      const same = fs.existsSync(path.join(canonicalDir, "SKILL.md"))
        && mapsEqual(normalizedFileMap(skill.dir), normalizedFileMap(canonicalDir));
      if (!same) return { ...plan, status: "collision", relation: "collision" };
    } else return { ...plan, status: "error", message: error.message };
  }
  const canonicalDir = plan.destination;
  const localMap = normalizedFileMap(skill.dir);
  const exists = fs.existsSync(path.join(canonicalDir, "SKILL.md"));
  let relation = "new";
  if (exists) relation = mapsEqual(localMap, normalizedFileMap(canonicalDir)) ? "same" : "collision";
  plan.relation = relation;
  if (relation === "collision") return { ...plan, status: "collision" };
  if (dryRun) return { ...plan, status: "planned" };
  const stage = path.join(root, ".tmp", "runtime", "skill-stage", `${skill.id}-${process.pid}`);
  const catalogFile = path.join(root, "catalog.yaml");
  const catalogBackup = fs.readFileSync(catalogFile);
  const hostFiles = [".agents/ags.yaml", ".agents/AGS.md", "AGENTS.md", "CLAUDE.md"].map((rel) => path.join(host.hostRoot, rel));
  const hostBackup = hostFiles.map((file) => ({ file, existed: fs.existsSync(file), data: fs.existsSync(file) ? fs.readFileSync(file) : null }));
  let committed = false;
  let placed = false;
  const changed = [];
  const rollback = () => {
    if (placed && relation === "new") fs.rmSync(canonicalDir, { recursive: true, force: true });
    fs.writeFileSync(catalogFile, catalogBackup);
    for (const item of hostBackup) {
      if (!item.existed) {
        if (fs.existsSync(item.file)) fs.rmSync(item.file, { force: true });
      } else fs.writeFileSync(item.file, item.data);
    }
    fs.rmSync(stage, { recursive: true, force: true });
    const index = catalog.skills.findIndex((item) => item.id === skill.id && item.source?.installMethod === "reconciled");
    if (relation === "new" && index >= 0) catalog.skills.splice(index, 1);
  };
  try {
    if (relation === "new") {
      fs.rmSync(stage, { recursive: true, force: true });
      copyTree(skill.dir, stage);
      if (inject === "staged") throw new AgsError("injected failure at staged");
      fs.mkdirSync(path.dirname(canonicalDir), { recursive: true });
      fs.renameSync(stage, canonicalDir);
      placed = true;
      changed.push(`skills/${skill.id}/SKILL.md`);
      if (inject === "placed") throw new AgsError("injected failure at placed");
      const description = frontmatter(path.join(canonicalDir, "SKILL.md")).data?.description || skill.id;
      const next = structuredClone(catalog);
      const reconciled = {
        id: skill.id,
        kind: "third-party",
        path: `skills/${skill.id}/SKILL.md`,
        description: String(description),
        default: false,
        keywords: [skill.id],
        source: { locator: "unknown", installMethod: "reconciled" },
      };
      withLinkedIncludes(reconciled, linked);
      next.skills.push(reconciled);
      const errors = validateCatalog(next);
      if (errors.length) throw new AgsError(errors.join("\n"));
      saveCatalog(root, next);
      catalog.skills.push(next.skills.at(-1));
      changed.push("catalog.yaml");
      if (inject === "catalog") throw new AgsError("injected failure at catalog");
    }
    const settings = structuredClone(host.settings);
    if (!noEnable && !settings.skills.enabled.includes(skill.id)) settings.skills.enabled.push(skill.id);
    settings.skills.disabled = settings.skills.disabled.filter((id) => id !== skill.id);
    const errors = validateCatalog(loadCatalog(root));
    if (errors.length) throw new AgsError(errors.join("\n"));
    writeManaged(root, loadCatalog(root), host.hostRoot, settings);
    host.settings = settings;
    verifyRegistered(root, host.hostRoot);
    if (inject === "settings") throw new AgsError("injected failure at settings");
    committed = true;
    if (inject === "quarantine") throw new AgsError("injected failure at quarantine");
    quarantine(host.hostRoot, skill.dir);
    if (changed.length) {
      if (inject === "report") {
        throw new AgsError(`Change report failed after content was saved. Changed files: ${changed.join(", ")}`, { written: changed });
      }
      await appendReport(root, "changes", {
        timestamp: reportStamp(),
        host: host.entry.name,
        files: changed.map((file) => ({ path: canonicalFile(root, file), level: 9 })),
        note: `Reconciled ${skill.id} from ${host.entry.id}`,
      });
    }
    return { ...plan, status: "reconciled" };
  } catch (error) {
    if (!committed) rollback();
    if (inject) throw error;
    return { ...plan, status: "error", message: error.message };
  }
}
