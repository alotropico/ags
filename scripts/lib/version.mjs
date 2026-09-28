import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { compareVersions, latestRelease, loadCatalog, VERSION_PATTERN } from "./catalog.mjs";
import { planItem, runOperation } from "./operation.mjs";
import { detectPackageManager, runPackageScript } from "./packages.mjs";
import { loadRegistry } from "./registry.mjs";
import { agsLockPath, withLock } from "./reports.mjs";
import { AgsError, git, normalizeText, posix, sha256, writeAtomic } from "./util.mjs";

export const UNRELEASED = "## Unreleased";
export const LEVELS = ["patch", "minor", "major"];

export function changelogPath(agsRoot) {
  return path.join(agsRoot, "CHANGELOG.md");
}

export function readChangelog(agsRoot) {
  const file = changelogPath(agsRoot);
  if (!fs.existsSync(file)) throw new AgsError("CHANGELOG.md is missing at the AGS root.");
  return normalizeText(fs.readFileSync(file, "utf8"));
}

export function unreleasedRange(lines) {
  const start = lines.findIndex((line) => line.trim() === UNRELEASED);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

export function unreleasedNotes(text) {
  const lines = normalizeText(text).split("\n");
  const range = unreleasedRange(lines);
  if (!range) throw new AgsError("CHANGELOG.md has no ## Unreleased section.");
  return lines.slice(range.start + 1, range.end).filter((line) => /^- /.test(line)).map((line) => line.slice(2));
}

export function withNote(text, note) {
  const lines = normalizeText(text).split("\n");
  const range = unreleasedRange(lines);
  if (!range) throw new AgsError("CHANGELOG.md has no ## Unreleased section.");
  const bullet = `- ${note}`;
  if (lines.slice(range.start + 1, range.end).includes(bullet)) return null;
  let at = range.end;
  while (at > range.start + 1 && lines[at - 1].trim() === "") at -= 1;
  const next = [...lines.slice(0, at), bullet, ...lines.slice(at)];
  if (range.end < lines.length && next[at + 1] !== "") next.splice(at + 1, 0, "");
  return next.join("\n");
}

export function appendUnreleasedNote(agsRoot, note) {
  const next = withNote(readChangelog(agsRoot), note);
  if (next == null) return false;
  writeAtomic(changelogPath(agsRoot), next);
  return true;
}

export function gitOperationInProgress(root) {
  const gitDir = path.resolve(root, git(["rev-parse", "--git-dir"], root).stdout.trim());
  return ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"].find((name) => fs.existsSync(path.join(gitDir, name))) ?? null;
}

export function packageVersion(agsRoot) {
  const version = JSON.parse(fs.readFileSync(path.join(agsRoot, "package.json"), "utf8")).version;
  if (!VERSION_PATTERN.test(String(version ?? ""))) throw new AgsError(`package.json version must be X.Y.Z: ${version}`);
  return version;
}

export function nextVersion(current, level) {
  const [major, minor, patch] = current.split(".").map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function releasedNotes(text, version) {
  const lines = normalizeText(text).split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${version} - `));
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line));
  return lines.slice(start + 1, end < 0 ? lines.length : end).filter((line) => /^- /.test(line)).map((line) => line.slice(2));
}

export function releaseChangelog(text, version, date) {
  const lines = normalizeText(text).split("\n");
  const range = unreleasedRange(lines);
  if (!range) throw new AgsError("CHANGELOG.md has no ## Unreleased section.");
  const body = lines.slice(range.start + 1, range.end);
  while (body.length && body[0].trim() === "") body.shift();
  while (body.length && body.at(-1).trim() === "") body.pop();
  const rest = lines.slice(range.end);
  return [...lines.slice(0, range.start), UNRELEASED, "", `## ${version} - ${date}`, ...body, ...(rest.length ? ["", ...rest] : [""])].join("\n");
}

function localDate(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function installedVersion(hostPath) {
  try {
    return String(parse(fs.readFileSync(path.join(hostPath, ".agents", "ags.yaml"), "utf8"))?.agsVersion ?? "not installed");
  } catch {
    return fs.existsSync(hostPath) ? "unreadable ags.yaml" : "missing";
  }
}

export function hostLines(agsRoot) {
  const { hosts } = loadRegistry(agsRoot);
  if (!hosts.length) return ["No registered hosts."];
  return ["Registered hosts (none updated):", ...hosts.map((host) => `- ${host.id} at ${installedVersion(host.path)}: ags host update --host ${host.id}`)];
}

export function versionShow({ agsRoot, terminal }) {
  const latest = latestRelease(agsRoot);
  terminal.log(`Version: ${packageVersion(agsRoot)}`);
  terminal.log(`Latest release: ${latest ?? "none"}`);
  if (latest) {
    const log = git(["log", "--oneline", `v${latest}..HEAD`], agsRoot).stdout.trim();
    terminal.log(`Commits since v${latest}:`);
    for (const line of log ? log.split("\n") : ["none"]) terminal.log(`  ${line}`);
  }
  const notes = unreleasedNotes(readChangelog(agsRoot));
  terminal.log("Unreleased notes:");
  for (const note of notes.length ? notes : ["none"]) terminal.log(notes.length ? `- ${note}` : `  ${note}`);
  return 0;
}

export async function versionNote({ agsRoot, text, terminal }) {
  const note = String(text ?? "").trim();
  if (!note || note.includes("\n")) throw new AgsError("ags version note takes one line of text.", { exitCode: 2 });
  const added = await withLock(agsLockPath(agsRoot), "version note", () => appendUnreleasedNote(agsRoot, note));
  terminal.log(added ? `Added to ## Unreleased: ${note}` : `Already under ## Unreleased: ${note}`);
  return 0;
}

function releaseCommit(agsRoot, version) {
  const log = git(["log", "--format=%H%x09%s", "HEAD"], agsRoot).stdout.split(/\r?\n/);
  return log.map((line) => line.split("\t")).find(([, subject]) => subject === `Release: ${version}`)?.[0] ?? null;
}

function catalogDrops(agsRoot, latest) {
  const before = loadCatalog(agsRoot, { version: latest });
  const after = loadCatalog(agsRoot);
  const ids = (catalog) => [...catalog.rules, ...catalog.skills].map((entry) => entry.id);
  const problems = ids(before).filter((id) => !ids(after).includes(id)).map((id) => `drops id ${id}`);
  const settings = new Map((after.settings || []).map((setting) => [setting.key, setting]));
  for (const setting of before.settings || []) {
    const now = settings.get(setting.key);
    if (!now) problems.push(`drops setting ${setting.key}`);
    else if (now.type !== setting.type) problems.push(`changes the type of ${setting.key} from ${setting.type} to ${now.type}`);
  }
  return problems;
}

function refusals(agsRoot, level, allowEmpty, latest) {
  const status = git(["status", "--porcelain", "--untracked-files=all"], agsRoot).stdout.split(/\r?\n/).filter(Boolean);
  if (status.length) {
    const changed = status.map((line) => posix(line.slice(3)));
    if (changed.every((rel) => rel === "CHANGELOG.md" || rel === "package.json")) {
      throw new AgsError(`AGS has uncommitted changes to ${changed.join(" and ")}, as an interrupted bump leaves them. Recover with: git restore -- CHANGELOG.md package.json, then run ags version bump ${level} again.`);
    }
    throw new AgsError(`AGS has uncommitted changes. Commit or stash them first:\n${status.join("\n")}`);
  }
  const markers = git(["grep", "-l", "-E", "^(<<<<<<<|>>>>>>>)( |$)"], agsRoot, { allow: [0, 1] }).stdout.trim();
  if (markers) throw new AgsError(`AGS has conflict markers in: ${markers.split(/\r?\n/).join(", ")}`);
  const operation = gitOperationInProgress(agsRoot);
  if (operation) throw new AgsError(`AGS has a ${operation} in progress. Finish or abort it first.`);
  if (latest && git(["merge-base", "--is-ancestor", `v${latest}`, "HEAD"], agsRoot, { allow: [0, 1] }).status !== 0) {
    throw new AgsError(`The latest release v${latest} is not an ancestor of HEAD; a release must not drop an earlier one.`);
  }
  if (latest && level !== "major") {
    const drops = catalogDrops(agsRoot, latest);
    if (drops.length) throw new AgsError(`A ${level} release cannot remove or retype catalog entries of ${latest}; use major:\n${drops.map((line) => `- ${line}`).join("\n")}`);
  }
  if (!allowEmpty && !unreleasedNotes(readChangelog(agsRoot)).length) throw new AgsError("## Unreleased has no notes. Add them with ags version note, or pass --allow-empty.");
}

export function bumpOperation({ agsRoot, level, allowEmpty = false, rerunArgs, now = () => new Date() }) {
  if (!LEVELS.includes(level)) throw new AgsError(`ags version bump takes patch, minor or major: ${level ?? "missing"}`, { exitCode: 2 });
  const op = {
    name: "bump",
    command: "version bump",
    rerunArgs,
    inspect() {
      const current = packageVersion(agsRoot);
      const latest = latestRelease(agsRoot);
      const head = git(["rev-parse", "HEAD"], agsRoot).stdout.trim();
      const changelog = readChangelog(agsRoot);
      const commit = !latest || compareVersions(current, latest) > 0 ? releaseCommit(agsRoot, current) : null;
      if (commit) {
        const notes = releasedNotes(git(["show", `${commit}:CHANGELOG.md`], agsRoot).stdout, current);
        return { complete: true, current, next: current, commit, notes, head };
      }
      refusals(agsRoot, level, allowEmpty, latest);
      const notes = unreleasedNotes(changelog);
      return { complete: false, current, next: nextVersion(current, level), latest, notes, head, date: localDate(now()) };
    },
    plan(state) {
      if (state.complete) {
        return {
          header: { title: `ags version bump: complete the untagged release ${state.current}`, operation: "bump", level, current: state.current, next: state.next, head: state.head, notes: [`Release commit ${state.commit.slice(0, 12)} has no tag v${state.current}. This run only creates that tag and does nothing else.`, ...state.notes.map((note) => `- ${note}`)] },
          items: [planItem({ path: `v${state.current}`, kind: "tag", action: `tag ${state.commit.slice(0, 12)}` })],
        };
      }
      return {
        header: {
          title: `ags version bump ${level}: ${state.current} → ${state.next}`,
          operation: "bump",
          level,
          current: state.current,
          next: state.next,
          head: state.head,
          notesHash: sha256(state.notes.join("\n")),
          notes: [`Notes for ${state.next}:`, ...(state.notes.length ? state.notes.map((note) => `- ${note}`) : ["(none)"])],
        },
        items: [
          planItem({ path: "CHANGELOG.md", kind: "changelog", action: `move notes under ## ${state.next} - ${state.date}` }),
          planItem({ path: "package.json", kind: "version", action: `set ${state.next}` }),
          planItem({ path: "commit", kind: "git", action: `Release: ${state.next}` }),
          planItem({ path: `v${state.next}`, kind: "tag", action: "annotated tag with the notes" }),
        ],
      };
    },
    locks: () => [agsLockPath(agsRoot)],
    async apply(ctx) {
      const state = ctx.state;
      if (state.complete) {
        git(["tag", "-a", `v${state.current}`, "-m", tagMessage(state.current, state.notes), state.commit], agsRoot);
        ctx.done(`v${state.current}`);
        return [`Created the missing tag v${state.current} on ${state.commit.slice(0, 12)}. Nothing else was done.`, ...hostLines(agsRoot)];
      }
      const { manager, conflict } = detectPackageManager(agsRoot);
      if (conflict) throw new AgsError(conflict);
      const result = runPackageScript(agsRoot, manager ?? "npm", "test");
      if (result.status !== 0) throw new AgsError(`The AGS tests failed; nothing was released.\n${`${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split(/\r?\n/).slice(-20).join("\n")}`);
      let committed = false;
      try {
        writeAtomic(changelogPath(agsRoot), releaseChangelog(readChangelog(agsRoot), state.next, state.date));
        ctx.done("CHANGELOG.md");
        ctx.fault("after-changelog");
        const file = path.join(agsRoot, "package.json");
        const json = JSON.parse(fs.readFileSync(file, "utf8"));
        json.version = state.next;
        writeAtomic(file, `${JSON.stringify(json, null, 2)}\n`);
        ctx.done("package.json");
        ctx.fault("after-package-json");
        git(["commit", "-q", "-m", `Release: ${state.next}`, "--", "CHANGELOG.md", "package.json"], agsRoot);
        committed = true;
        ctx.done("commit");
        ctx.fault("after-commit");
        git(["tag", "-a", `v${state.next}`, "-m", tagMessage(state.next, state.notes)], agsRoot);
        ctx.done(`v${state.next}`);
      } catch (error) {
        const recovery = committed
          ? `Recovery: run ags version bump ${level} again; it creates the missing tag.`
          : `Recovery: git restore -- CHANGELOG.md package.json, then run ags version bump ${level} again.`;
        throw new AgsError(`${error.message}\n${recovery}`);
      }
      return [`Released ${state.next}: commit Release: ${state.next}, tag v${state.next}.`, ...hostLines(agsRoot)];
    },
  };
  return op;
}

function tagMessage(version, notes) {
  return [`AGS ${version}`, "", ...notes.map((note) => `- ${note}`)].join("\n");
}

export async function versionBump({ agsRoot, level, allowEmpty = false, rerunArgs, terminal, options }) {
  return runOperation(bumpOperation({ agsRoot, level, allowEmpty, rerunArgs }), { terminal, ...options });
}
