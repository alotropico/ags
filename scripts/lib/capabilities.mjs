import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readPackageJson } from "./packages.mjs";

export function findExecutable(root, names, env = process.env) {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  const directories = [path.join(root, "node_modules", ".bin"), ...(env.PATH || env.Path || "").split(path.delimiter).filter(Boolean)];
  for (const directory of directories) for (const name of names) for (const extension of extensions) {
    const file = path.resolve(directory, `${name}${extension}`);
    try {
      if (!fs.statSync(file).isFile()) continue;
      if (process.platform !== "win32") fs.accessSync(file, fs.constants.X_OK);
      return file;
    } catch {}
  }
  return null;
}

export function installedPackage(root, name) {
  try {
    const directory = path.join(root, "node_modules", ...name.split("/"));
    const json = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
    return { directory, json };
  } catch { return null; }
}

export function nativeTanStackPackages(root) {
  let json;
  try { json = readPackageJson(root) ?? {}; } catch { return []; }
  const names = new Set(Object.keys({ ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies }));
  return [...names].sort().filter((name) => {
    if (!name.startsWith("@tanstack/") || name === "@tanstack/intent") return false;
    const pkg = installedPackage(root, name);
    return pkg && (pkg.json.intent != null || fs.existsSync(path.join(pkg.directory, "skills")));
  });
}

export function detectCapabilities(root, env = process.env) {
  const result = {};
  for (const [name, commands] of Object.entries({ skills: ["skills"], graphify: ["graphify"], fallow: ["fallow"], "ast-grep": ["ast-grep", "sg"] })) result[name] = findExecutable(root, commands, env);
  result.intent = nativeTanStackPackages(root).length ? findExecutable(root, ["intent"], env) : null;
  return result;
}

export function executeTool(file, args, { cwd, terminal, interactive = false } = {}) {
  let executable = file;
  let forwarded = args;
  let windowsVerbatimArguments = false;
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(file)) {
    try { fs.accessSync(file, fs.constants.R_OK); }
    catch (error) {
      const reason = error.code === "ENOENT" ? "unavailable; check the tool installation and PATH" : "cannot execute; check the tool's file permissions";
      terminal?.warn(`${file}: ${reason} (${error.code})`);
      return 1;
    }
    if ([file, ...args].some((value) => /[\0\r\n]/.test(String(value)))) {
      terminal?.warn(`${file}: cannot preserve NUL or newline values through a Windows batch tool; remove NUL values and use a native executable backend for newline arguments`);
      return 1;
    }
    // Batch files undergo CMD parsing before forwarding their arguments.
    // Protect both CMD syntax and the final native program's quoted argv.
    const meta = /([()\][%!^"`<>&|;, *?])/g;
    const literal = (value) => {
      const quoted = `"${String(value).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`;
      return quoted.replace(meta, "^$1").replace(meta, "^$1");
    };
    const source = [String(file).replace(meta, "^$1"), ...args.map(literal)].join(" ");
    executable = process.env.ComSpec || "cmd.exe";
    forwarded = ["/d", "/v:off", "/s", "/c", `"${source}"`];
    windowsVerbatimArguments = true;
  }
  const result = spawnSync(executable, forwarded, { cwd, shell: false, windowsHide: true, windowsVerbatimArguments, encoding: "utf8", stdio: interactive ? "inherit" : "pipe" });
  if (result.stdout) terminal?.log(result.stdout.replace(/\r?\n$/, ""));
  if (result.stderr) terminal?.warn(result.stderr.replace(/\r?\n$/, ""));
  if (result.error) {
    const reason = result.error.code === "ENOENT" ? "unavailable; check the tool installation and PATH"
      : ["EACCES", "EPERM"].includes(result.error.code) ? "cannot execute; check the tool's file permissions"
        : result.error.message;
    terminal?.warn(`${file}: ${reason}${result.error.code ? ` (${result.error.code})` : ""}`);
  } else if (result.signal) terminal?.warn(`${file}: terminated by signal ${result.signal}`);
  return result.status ?? 1;
}
