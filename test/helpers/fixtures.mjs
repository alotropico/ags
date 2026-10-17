import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

export const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function tempDir(prefix = "ags-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function git(cwd, args, { allow = [0], input } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", input, windowsHide: true });
  if (!allow.includes(result.status)) {
    throw new Error(`git ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function writeFiles(root, files = {}) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
}

// Backends are genuinely runnable on the current OS, including when a test
// deliberately removes Node from PATH to isolate executable discovery.
export function writeExecutable(root, name, { stdout = "", stderr = "", code = 0, nodeBody } = {}) {
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, `${name}${process.platform === "win32" ? ".cmd" : ""}`);
  const bodyFile = path.join(root, `${name}-fixture.mjs`);
  const body = nodeBody ?? `process.stdout.write(${JSON.stringify(stdout)});\nprocess.stderr.write(${JSON.stringify(stderr)});\nprocess.exit(${code});\n`;
  fs.writeFileSync(bodyFile, body);
  if (process.platform === "win32") {
    const batchLiteral = (value) => String(value).replaceAll("%", "%%");
    fs.writeFileSync(file, `@echo off\r\n"${batchLiteral(process.execPath)}" "${batchLiteral(bodyFile)}" %*\r\nexit /b %errorlevel%\r\n`);
  } else {
    const shellLiteral = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
    fs.writeFileSync(file, `#!/bin/sh\nexec ${shellLiteral(process.execPath)} ${shellLiteral(bodyFile)} "$@"\n`, { mode: 0o755 });
    fs.chmodSync(file, 0o755);
  }
  return file;
}

export function linkDirectory(target, link) {
  fs.symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
  return link;
}

export function nativeDirectoryLink(t, target, link) {
  try {
    return linkDirectory(target, link);
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) throw error;
    t.diagnostic(`Required native directory-link coverage unavailable: ${error.code}: ${error.message}`);
    t.skip(`Native directory-link capability unavailable (${error.code}); portability evidence remains pending`);
    return null;
  }
}

// The callback runs only after the current process demonstrably loses access.
// Privileged accounts that bypass permissions report unavailable coverage.
export function withDeniedAccess(target, { access = "read" } = {}, callback) {
  if (!["read", "write"].includes(access)) throw new Error(`Unknown denied access: ${access}`);
  const stat = fs.statSync(target);
  let restore;
  if (process.platform === "win32") {
    const invoke = (args) => {
      const result = spawnSync("icacls", args, { encoding: "utf8", windowsHide: true });
      if (result.status !== 0) throw new Error(`icacls failed: ${result.error?.message || result.stderr || result.stdout}`);
      return result.stdout;
    };
    const who = spawnSync("whoami", [], { encoding: "utf8", windowsHide: true });
    if (who.status !== 0) throw new Error(`whoami failed: ${who.error?.message || who.stderr}`);
    const account = who.stdout.trim();
    const original = invoke([target]);
    if (/\(DENY\)/i.test(original)) throw new Error("Denied-access fixtures require a fresh target without pre-existing deny ACLs");
    restore = () => {
      invoke([target, "/remove:d", account, "/q"]);
      if (invoke([target]) !== original) throw new Error(`Permission fixture did not restore original ACL: ${target}`);
    };
    try { invoke([target, "/deny", `${account}:(${access === "read" ? "R" : "W"})`, "/q"]); }
    catch (error) { restore(); throw error; }
  } else {
    const mode = stat.mode & 0o7777;
    restore = () => fs.chmodSync(target, mode);
    fs.chmodSync(target, mode & ~(access === "read" ? 0o444 : 0o222));
  }
  try {
    let denied = false;
    try {
      if (access === "read") {
        if (stat.isDirectory()) fs.readdirSync(target);
        else fs.readFileSync(target);
      } else if (stat.isDirectory()) {
        const probe = path.join(target, `ags-write-probe-${process.pid}`);
        fs.writeFileSync(probe, "", { flag: "wx" });
        fs.unlinkSync(probe);
      } else {
        const fd = fs.openSync(target, "r+");
        fs.closeSync(fd);
      }
    } catch (error) {
      if (!["EACCES", "EPERM"].includes(error.code)) throw error;
      denied = true;
    }
    if (!denied) return { available: false, reason: `Current account bypasses native ${access} denial` };
    return { available: true, value: callback() };
  } finally {
    restore();
  }
}

export function initRepo(root) {
  fs.mkdirSync(root, { recursive: true });
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "ags@example.test"]);
  git(root, ["config", "user.name", "ags"]);
  git(root, ["config", "core.autocrlf", "false"]);
  return root;
}

export function commitAll(root, message = "commit") {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "--allow-empty", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

export function tag(root, version, message = `v${version}`) {
  git(root, ["tag", "-a", `v${version}`, "-m", message]);
}

export function withCli(agsRoot) {
  copyDir(path.join(REAL_ROOT, "scripts"), path.join(agsRoot, "scripts"));
  // The CLI shares this standalone engine without using a host-installed skill.
  const diffRel = path.join("skills", "write-commit-diff", "scripts", "write-commit-diff.mjs");
  fs.mkdirSync(path.dirname(path.join(agsRoot, diffRel)), { recursive: true });
  fs.copyFileSync(path.join(REAL_ROOT, diffRel), path.join(agsRoot, diffRel));
  const commandsDir = path.join(agsRoot, "scripts", "commands");
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.copyFileSync(path.join(REAL_ROOT, "scripts", "commands", "git-changes.mjs"), path.join(commandsDir, "git-changes.mjs"));
  const link = path.join(agsRoot, "node_modules");
  if (!fs.existsSync(link)) linkDirectory(path.join(REAL_ROOT, "node_modules"), link);
  return agsRoot;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else if (entry.isFile()) fs.copyFileSync(source, target);
  }
}

export const BLOCK_TEMPLATE = "## AGS\n\n{{strongRules}}\n\nRead a rule before work that matches its condition:\n\n{{ruleIndex}}\n";

export function sampleCatalog() {
  return {
    format: 2,
    rules: [
      { id: "core", tier: "strong", install: "always" },
      { id: "tmp-conventions", tier: "soft", install: "always" },
      { id: "style", tier: "soft", install: "opt-in" },
    ],
    skills: [
      { id: "plan-work", install: "always", keywords: ["plan"] },
      { id: "ui-kit", install: "detected", when: { any: [{ package: "@platform/ui-library" }] }, includes: ["css-rules"] },
      { id: "css-rules", install: "opt-in", includes: ["css-clean"] },
      { id: "css-clean", install: "opt-in", params: ["checks.lint"] },
      { id: "ship", install: "opt-in", params: ["git.mainBranch", "git.ticketPrefix"] },
    ],
    settings: [
      { key: "git.mainBranch", type: "string", required: true, description: "Trunk branch that feature branches start from and merge into." },
      { key: "git.ticketPrefix", type: "string", default: "", description: "Prefix for ticket ids in branch names and commit subjects. Empty means no ticket part." },
      { key: "checks.lint", type: "string", default: "", description: "package.json script that runs the linter. Empty means not configured." },
    ],
  };
}

export function skillFile(id, description, body = "") {
  return `---\nname: ${id}\ndescription: ${description}\n---\n\n# ${id}\n${body}`;
}

export function sampleMaterial() {
  return {
    "templates/agents-block.md": BLOCK_TEMPLATE,
    "rules/core.md": "- Host settings are in `.agents/ags.yaml`.\n- Host guidance wins on facts and formats.\n",
    "rules/tmp-conventions.md": "---\ndescription: Creating, moving, or archiving files under .tmp/.\n---\n\n# tmp\n",
    "rules/style.md": "---\ndescription: Editing style files.\n---\n\n# style\n\nSee [tmp](tmp-conventions.md).\n",
    "skills/plan-work/SKILL.md": skillFile("plan-work", "Plan work.", "\nSee [guide](references/guide.md).\n"),
    "skills/plan-work/references/guide.md": "# Guide\n",
    "skills/ui-kit/SKILL.md": skillFile("ui-kit", "UI kit styling.", "\nUse [rules](../css-rules/SKILL.md).\n"),
    "skills/css-rules/SKILL.md": skillFile("css-rules", "CSS rules.", "\nThen [clean](../css-clean/SKILL.md).\n"),
    "skills/css-clean/SKILL.md": skillFile("css-clean", "Clean CSS."),
    "skills/ship/SKILL.md": skillFile("ship", "Ship a branch.", "\n## Host settings\n\n- `git.ticketPrefix`: with `CORE-`, a branch is `CORE-1234-short-slug`.\n"),
  };
}

export function makeAgsRepo({ files = {}, catalog, version = "1.0.0", tags = [], cli = false, changelog = "## Unreleased\n" } = {}) {
  const root = initRepo(path.join(tempDir("ags-src-"), "ags"));
  const base = {
    ".gitignore": "hosts.yaml\nreports/\n.tmp/\nnode_modules/\n",
    "package.json": `${JSON.stringify({ name: "ags-fixture", private: true, type: "module", version, scripts: { test: "node -e \"process.exit(0)\"" } }, null, 2)}\n`,
    "CHANGELOG.md": changelog,
  };
  if (catalog) base["catalog.yaml"] = typeof catalog === "string" ? catalog : stringify(catalog);
  writeFiles(root, { ...base, ...files });
  if (cli) withCli(root);
  commitAll(root, "init");
  for (const item of tags) tag(root, item);
  return root;
}

export function makeHostRepo({ name = "host", files = {}, gitignore } = {}) {
  const root = initRepo(path.join(tempDir("ags-host-"), name));
  const all = { "README.md": "host\n", ...files };
  if (gitignore != null) all[".gitignore"] = gitignore;
  writeFiles(root, all);
  commitAll(root, "init");
  return root;
}

export function runAgs(agsRoot, args, { cwd = agsRoot, env = {}, input } = {}) {
  const result = spawnSync(process.execPath, [path.join(agsRoot, "scripts", "ags.mjs"), ...args], {
    cwd,
    encoding: "utf8",
    input,
    windowsHide: true,
    env: { ...process.env, AGS_TEST_FAULT: "", ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

export function fakeTerminal(answers = []) {
  const queue = [...answers];
  const lines = [];
  return {
    interactive: true,
    lines,
    prompts: [],
    async question(prompt) {
      this.prompts.push(prompt);
      if (!queue.length) throw new Error(`Unexpected prompt: ${prompt}`);
      return queue.shift();
    },
    log(line = "") {
      lines.push(String(line));
    },
    warn(line = "") {
      lines.push(String(line));
    },
    remaining() {
      return queue.length;
    },
  };
}

export function quietTerminal() {
  const lines = [];
  return {
    interactive: false,
    lines,
    async question(prompt) {
      throw new Error(`Unexpected prompt without a terminal: ${prompt}`);
    },
    log(line = "") {
      lines.push(String(line));
    },
    warn(line = "") {
      lines.push(String(line));
    },
    text() {
      return lines.join("\n");
    },
  };
}

export function digestOf(text) {
  const match = String(text).match(/Digest: ([0-9a-f]{12})/);
  if (!match) throw new Error(`No digest in output:\n${text}`);
  return match[1];
}

export function treeSnapshot(root, { exclude = [] } = {}) {
  const map = {};
  const skip = (rel) => rel === ".git" || rel.startsWith(".git/") || exclude.some((item) => rel === item || rel.startsWith(`${item.replace(/\/$/, "")}/`));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (skip(rel)) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) map[rel] = sha256(fs.readFileSync(abs));
    }
  };
  walk(root);
  return map;
}
