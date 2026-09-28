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
  const link = path.join(agsRoot, "node_modules");
  if (!fs.existsSync(link)) fs.symlinkSync(path.join(REAL_ROOT, "node_modules"), link, "junction");
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

export function treeSnapshot(root, { exclude = [] } = {}) {
  const map = {};
  const skip = (rel) => rel === ".git" || rel.startsWith(".git/") || exclude.some((item) => rel === item || rel.startsWith(`${item.replace(/\/$/, "")}/`));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).replaceAll("\\", "/");
      if (skip(rel)) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) map[rel] = sha256(fs.readFileSync(abs));
    }
  };
  walk(root);
  return map;
}
