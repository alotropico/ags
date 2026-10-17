import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const NATIVE_TESTS = [
  "POSIX discovery ignores non-executable and dangling local bins but follows package-bin links",
  "POSIX signal-terminated optional tools fail with a reason",
  "native macOS sh/zsh execute the executable LF launcher with unchanged argv and status",
  "unavailable native managers fail clearly without a POSIX Windows-shell fallback",
  "denied and signal-terminated POSIX package managers retain intelligible diagnostics",
  "native POSIX working-tree filenames are refused before being conflated",
  "native POSIX executable backup and disposable restoration preserve mode",
  ...["literal\\backslash.md", "line\nbreak.md"].flatMap(name => [
    `prepare refuses unrepresentable native setup name ${JSON.stringify(name)} before writing`,
    `copy-only backup refuses unrepresentable native source name ${JSON.stringify(name)} before writing`,
  ]),
];
export const WINDOWS_SKIPS = [
  "old exact Windows shim formats remain owned during reinstall",
  "Windows PowerShell preserves every parsed argument, Unicode checkout paths, cwd and child status",
  "Windows CMD preserves parsed empty/quoted arguments, native checkout literals and child status",
  "Windows batch optional backends preserve literal argv through CMD and propagate output/status",
  "Windows batch optional backends refuse unrepresentable NUL/newline arguments before execution",
];
const CASE_FILES = ["util", "registry", "v5-paths", "v5-prepare"].map(name => `test/${name}.test.mjs`);
const CASE_TEST = "native path identity, containment, and route resolution";
const CASE_DIAGNOSTIC = "# Native filesystem preserves distinct case-sensitive directories";
const SHARE_RESULTS = "Share this entire evidence folder (or a ZIP of it), including summary.txt, environment.json, full-suite.log, case-sensitive.log and launcher.log, even for FAIL or INCOMPLETE.";
const NODE_SETUP = "Install a current arm64 Node release including npm (if you use Homebrew: brew install node; for an existing outdated installation: brew upgrade node). Reopen Terminal, then verify: node --version and node -p process.arch";

// Match the built-in Node TAP reporter, including its backslash/control escaping.
export function tapName(name) {
  for (const [character, escaped] of [["\b", "\\b"], ["\f", "\\f"], ["\t", "\\t"], ["\n", "\\n"], ["\r", "\\r"], ["\v", "\\v"]]) name = name.replaceAll(character, escaped);
  return name.replaceAll("\\", "\\\\").replaceAll("#", "\\#");
}

export function inspectTap(text, { exitCode = 0, required = NATIVE_TESTS, allowedSkips = WINDOWS_SKIPS } = {}) {
  const lines = text.split(/\r?\n/);
  const results = lines.flatMap(line => {
    const match = /^( *)(ok|not ok) (\d+) - (.*?)(?: # (SKIP|TODO|EXPECTED FAILURE)(?: .*)?)?$/.exec(line);
    return match ? [{ top: !match[1], passed: match[2] === "ok", number: Number(match[3]), name: match[4], directive: match[5] }] : [];
  });
  const top = results.filter(result => result.top);
  const plans = lines.filter(line => /^1\.\.\d+$/.test(line));
  const counts = {};
  for (const line of lines) {
    const match = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(line);
    if (match) counts[match[1]] = Number(match[2]);
  }
  const complete = lines.includes("TAP version 13") && plans.length === 1
    && Number(plans[0].slice(3)) === top.length && top.length > 0
    && top.every((result, i) => result.number === i + 1)
    && Object.keys(counts).length === 6 && lines.some(line => /^# duration_ms \d/.test(line));
  const native = required.map(name => {
    const matches = top.filter(result => result.name === tapName(name));
    const state = matches.length !== 1 ? (matches.length ? "DUPLICATE" : "MISSING")
      : matches[0].directive ? matches[0].directive : matches[0].passed ? "PASS" : "FAIL";
    return { name, state };
  });
  const unexpected = results.filter(result => result.directive
    && !(result.directive === "SKIP" && allowedSkips.some(name => tapName(name) === result.name)));
  const failed = exitCode !== 0 || results.some(result => !result.passed && !result.directive) || counts.fail > 0;
  const reasons = [
    ...(!complete ? ["Missing or unrecognized complete TAP output"] : []),
    ...native.filter(result => result.state !== "PASS").map(result => `${result.state}: ${result.name}`),
    ...unexpected.map(result => `Unexpected ${result.directive}: ${result.name}`),
  ];
  return { status: failed ? "FAIL" : reasons.length ? "INCOMPLETE" : "PASS", native, unexpected, counts, reasons };
}

export function overallStatus(phases, interrupted = false) {
  const states = Object.values(phases).map(phase => phase.status);
  return states.includes("FAIL") ? "FAIL" : !interrupted && states.length === 4 && states.every(state => state === "PASS") ? "PASS" : "INCOMPLETE";
}

export function assertNativeMac({ platform, arch, uid, nodeVersion }) {
  if (platform !== "darwin") throw new Error("Run this trial on native macOS with an arm64 Node process (not Rosetta). On the Apple Silicon Mac, run from the candidate checkout: pnpm trial:macos");
  if (arch !== "arm64") throw new Error(`Run this trial on native macOS with an arm64 Node process (not Rosetta). Open Terminal without Rosetta and verify: node -p process.arch\n${NODE_SETUP}\nThen rerun: pnpm trial:macos`);
  if (uid === 0) throw new Error("Run without sudo: required permission-denial tests need an ordinary account. From your ordinary account run: pnpm trial:macos");
  if (Number(nodeVersion.split(".")[0]) < 20) throw new Error(`AGS requires Node >=20; no additional version pin is required.\n${NODE_SETUP}\nThen rerun: pnpm trial:macos`);
}

export function parseTrialArgs(args) {
  if (!args.length) return {};
  if (args.length === 2 && args[0] === "--out" && args[1] && !args[1].startsWith("--")) return { out: args[1] };
  throw new Error("Usage: pnpm trial:macos [--out <new-evidence-directory>]");
}

// Query only this run's image, including a partially completed attach. No saved recovery state.
export async function cleanupScratch(scratch, image, command) {
  const resolved = fs.realpathSync(scratch);
  const relative = path.relative(fs.realpathSync(os.tmpdir()), resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    || !path.basename(scratch).startsWith("ags-v5-macos-")) throw new Error("Refusing cleanup outside the owned OS-temporary trial directory");
  if (image && path.dirname(path.resolve(image)) !== path.resolve(scratch)) throw new Error("Trial image is outside the owned scratch directory");
  if (image && fs.existsSync(image)) {
    const info = await command("/usr/bin/hdiutil", ["info", "-plist"], { privateOutput: true });
    if (info.status !== 0) throw new Error("Cannot establish whether the owned image is attached; retain scratch state.");
    // The whole plist can contain alias data/dates; extract only the fields we need.
    const extract = async (key, format, type) => {
      const result = await command("/usr/bin/plutil", ["-extract", key, format, ...(type ? ["-expect", type] : []), "-o", "-", "-"], { input: info.stdout, privateOutput: true });
      if (result.status !== 0) throw new Error(`Cannot read owned-image inventory (${key}); retain scratch state.`);
      return result.stdout.trim();
    };
    const count = await extract("images", "raw", "array");
    if (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count))) throw new Error("Unrecognized hdiutil image count; retain scratch state.");
    for (let index = 0; index < Number(count); index++) {
      const imagePath = await extract(`images.${index}.image-path`, "raw", "string");
      let owned = false;
      try { owned = fs.realpathSync(imagePath) === fs.realpathSync(image); } catch {}
      if (!owned) continue;
      const entities = JSON.parse(await extract(`images.${index}.system-entities`, "json"));
      const device = Array.isArray(entities) && entities.find(entity => /^\/dev\/disk\d+$/.test(entity["dev-entry"]))?.["dev-entry"];
      if (!device) throw new Error(`Cannot identify the owned image device. Inspect hdiutil info and detach ${image} manually.`);
      const detached = await command("/usr/bin/hdiutil", ["detach", device]);
      if (detached.status !== 0) throw new Error(`Cleanup failed. Detach ${device} manually, then remove ${scratch}.`);
    }
  }
  const mount = path.join(scratch, "mount");
  if (fs.existsSync(mount) && fs.statSync(mount).dev !== fs.statSync(scratch).dev) {
    throw new Error(`The owned mount is still active. Run hdiutil detach '${mount}', then remove ${scratch}.`);
  }
  fs.rmSync(scratch, { recursive: true, force: true });
}

function probeCase(directory) {
  const probe = fs.mkdtempSync(path.join(directory, "case-probe-"));
  try {
    const upper = path.join(probe, "Case"), lower = path.join(probe, "case");
    fs.writeFileSync(upper, "upper", { flag: "wx" });
    if (fs.existsSync(lower)) return false;
    fs.writeFileSync(lower, "lower", { flag: "wx" });
    return fs.readFileSync(upper, "utf8") === "upper" && fs.readFileSync(lower, "utf8") === "lower"
      && fs.statSync(upper, { bigint: true }).ino !== fs.statSync(lower, { bigint: true }).ino;
  } finally { fs.rmSync(probe, { recursive: true, force: true }); }
}

export async function runTrial({ out, root = ROOT } = {}) {
  const parent = path.join(root, ".tmp", "records");
  const destination = out ? path.resolve(out) : path.join(parent, `${new Date().toISOString().slice(0, 10)}-v5-macos-trial-${Date.now()}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.mkdirSync(destination); // Never overwrite or merge an earlier result.
  const phases = {};
  const notes = [];
  const environment = { platform: process.platform, arch: process.arch, node: process.version, sourceCommit: null, dirty: null };
  let scratch, image, active, interrupted = false;
  const normalize = value => {
    let result = String(value);
    for (const [actual, label] of [[scratch, "<SCRATCH>"], [destination, "<EVIDENCE>"], [root, "<CHECKOUT>"], [os.homedir(), "<HOME>"]]) {
      if (actual) result = result.replaceAll(actual, label);
    }
    return result;
  };
  const log = (file, value) => fs.appendFileSync(path.join(destination, file), normalize(value));
  const summary = () => {
    const native = phases.full?.native;
    const lines = ["AGS V5 macOS trial", "", overallStatus(phases, interrupted), "",
      `Full suite: ${phases.full?.status || "INCOMPLETE"}`,
      `Native Mac tests: ${native ? `${native.filter(item => item.state === "PASS").length}/${NATIVE_TESTS.length} PASS` : "not verified"}`,
      ...(native ? [`Native results: found ${native.filter(item => item.state !== "MISSING").length}; skipped ${native.filter(item => item.state === "SKIP").length}; failed ${native.filter(item => item.state === "FAIL").length}`] : []),
      `Unexpected skips/TODOs: ${phases.full?.unexpected?.length ?? "not verified"}`,
      `Case-sensitive filesystem checks: ${phases.case?.status || "INCOMPLETE"}`,
      `Real launcher smoke: ${phases.launcher?.status || "INCOMPLETE"}`,
      `Cleanup: ${phases.cleanup?.status || "INCOMPLETE"}`, "",
      `macOS: ${environment.macos || "not verified"}`, `Arch: ${environment.arch}`, `Node: ${environment.node}`,
      `pnpm: ${environment.pnpm || "not verified"}`, `Source: ${environment.sourceCommit || "not verified"}; dirty: ${environment.dirty ?? "unknown"}`,
      ...Object.entries(phases).flatMap(([name, phase]) => (phase.reasons || []).map(reason => `${name}: ${reason}`)), ...notes,
      "", SHARE_RESULTS,
    ];
    fs.writeFileSync(path.join(destination, "summary.txt"), normalize(lines.join("\n") + "\n"));
    fs.writeFileSync(path.join(destination, "environment.json"), normalize(JSON.stringify(environment, null, 2) + "\n"));
  };
  summary();
  for (const file of ["full-suite.log", "case-sensitive.log", "launcher.log"]) fs.writeFileSync(path.join(destination, file), "");
  const stop = () => {
    interrupted = true;
    active?.terminate();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  const command = (executable, args, { cwd = root, env = process.env, input, file = "full-suite.log", timeout = 120_000, cleanup = false, privateOutput = false } = {}) => new Promise(resolve => {
    if (interrupted && !cleanup) return resolve({ status: null, stdout: "", stderr: "Interrupted" });
    log(file, `\nCommand: ${JSON.stringify([executable, ...args])}\nCwd: ${cwd}\n`);
    const child = spawn(executable, args, { cwd, env, detached: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "", error, timedOut = false, killTimer;
    const terminate = () => {
      try { process.kill(-child.pid, "SIGTERM"); } catch {}
      killTimer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 5_000);
    };
    active = { terminate };
    const timer = setTimeout(() => { timedOut = true; terminate(); }, timeout);
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", cause => { error = cause.message; });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.on("close", (status, signal) => {
      clearTimeout(timer); clearTimeout(killTimer); active = null;
      if (timedOut || interrupted) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
      log(file, (privateOutput ? "Disk inventory output omitted; only relevant fields are retained.\n" : stdout + (stderr ? `\nStderr:\n${stderr}` : "")) + `\nExit: ${status}; signal: ${signal || "none"}${timedOut ? "; timed out" : ""}${error ? `; ${error}` : ""}\n`);
      resolve({ status, signal, stdout, stderr, error, timedOut });
    });
  });
  const checked = async (executable, args, options) => {
    const result = await command(executable, args, options);
    if (interrupted || result.status !== 0) throw new Error(interrupted ? "Trial interrupted" : `${executable}: ${result.error || result.stderr || `exit ${result.status}`}`);
    return result.stdout.trim();
  };
  const diskInfo = async (directory, file) => {
    const df = await checked("/bin/df", ["-P", directory], { file, privateOutput: true });
    const device = df.split(/\r?\n/).at(-1).trim().split(/\s+/)[0];
    const plist = await checked("/usr/sbin/diskutil", ["info", "-plist", device], { file, privateOutput: true });
    return checked("/usr/bin/plutil", ["-extract", "FilesystemType", "raw", "-expect", "string", "-o", "-", "-"], { file, input: plist });
  };
  const suite = async (executable, args, tmpdir, required, allowedSkips, file) => {
    const env = { ...process.env, TMPDIR: tmpdir, ZDOTDIR: path.join(scratch, "zsh"), NO_COLOR: "1", FORCE_COLOR: "0", COREPACK_ENABLE_NETWORK: "0", COREPACK_ENABLE_AUTO_PIN: "0" };
    delete env.AGS_TEST_FAULT;
    const result = await command(executable, args, { env, file, timeout: 1_800_000 });
    if (interrupted || result.signal || result.timedOut || result.error) return { status: "INCOMPLETE", reasons: ["Suite interrupted, timed out or could not start"] };
    return inspectTap(result.stdout, { exitCode: result.status, required, allowedSkips });
  };
  const phase = async (name, action) => {
    console.log(`macOS trial: ${name}`);
    try { phases[name] = await action(); }
    catch (error) { phases[name] = { status: "INCOMPLETE", reasons: [error.message] }; }
    summary();
  };
  try {
    assertNativeMac({ platform: process.platform, arch: process.arch, uid: process.getuid?.(), nodeVersion: process.versions.node });
    if (/--test(?:-name-pattern|-skip-pattern|-only|-watch)?\b/.test(process.env.NODE_OPTIONS || "")) throw new Error("Remove test selection/options from NODE_OPTIONS before running the complete trial. Run: env -u NODE_OPTIONS pnpm trial:macos");
    try { createRequire(path.join(root, "package.json")).resolve("yaml"); }
    catch (error) { throw new Error(`Checkout dependencies are unavailable (${error.code || error.message}). From this checkout run:\n  pnpm install --frozen-lockfile\n  pnpm trial:macos`); }
    for (const executable of ["/bin/sh", "/bin/zsh", "/bin/df", "/usr/bin/hdiutil", "/usr/sbin/diskutil", "/usr/bin/plutil", "/usr/sbin/sysctl", "/usr/bin/sw_vers"]) {
      try { fs.accessSync(executable, fs.constants.X_OK); }
      catch (error) { throw new Error(`Required macOS tool is unavailable: ${executable} (${error.code}). These tools ship with macOS; run from a normal native macOS Terminal with access to them. There is no separate package-install command for this built-in tool. Then rerun: pnpm trial:macos`); }
    }
    if (await checked("/usr/sbin/sysctl", ["-n", "hw.optional.arm64"]) !== "1") throw new Error("Apple Silicon hardware could not be verified");
    environment.macos = `${await checked("/usr/bin/sw_vers", ["-productVersion"])} (${await checked("/usr/bin/sw_vers", ["-buildVersion"])})`;
    try { environment.git = await checked("git", ["--version"]); }
    catch (error) { throw new Error(`Git is not ready: ${error.message}\nIf Apple's Command Line Tools are missing, run: xcode-select --install\nIf already installed, resolve the Git error above. Verify: git --version\nThen rerun: pnpm trial:macos`); }
    try { environment.sourceCommit = await checked("git", ["rev-parse", "HEAD"]); }
    catch (error) { throw new Error(`Candidate is not a usable Git checkout: ${error.message}\nClone or copy the actual candidate repository including its .git directory, history, release tags and any uncommitted/untracked candidate files. A source ZIP/snapshot without .git is insufficient; do not replace the original history with git init.\nFrom that Git checkout rerun: pnpm trial:macos`); }
    environment.dirty = Boolean(await checked("git", ["status", "--porcelain=v1", "--untracked-files=normal"]));
    for (const manager of ["npm", "pnpm", "yarn"]) {
      const result = await command(manager, ["--version"], { env: { ...process.env, COREPACK_ENABLE_NETWORK: "0", COREPACK_ENABLE_AUTO_PIN: "0" } });
      environment[manager] = result.status === 0 ? result.stdout.trim() : "unavailable";
      if (manager === "pnpm" && result.status !== 0) throw new Error(`pnpm is not ready: ${result.error || result.stderr.trim() || `exit ${result.status}`}\nInstall a current pnpm compatible with your Node; see https://pnpm.io/installation.\nWith Node >=22.13 and npm, run: npx get-pnpm\nFor an older AGS-compatible Node, a Node-20-compatible fallback is: npm install --global pnpm@latest-10\nVerify: pnpm --version\nFrom this checkout run:\n  pnpm install --frozen-lockfile\n  pnpm trial:macos`);
    }
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ags-v5-macos-"));
    const ordinary = path.join(scratch, "ordinary");
    fs.mkdirSync(ordinary); fs.mkdirSync(path.join(scratch, "zsh"));
    const normalInfo = await diskInfo(ordinary, "full-suite.log");
    environment.defaultFilesystem = { type: normalInfo, caseSensitive: probeCase(ordinary) };
    await phase("full", () => suite("pnpm", ["test", "--test-reporter=tap"], ordinary, NATIVE_TESTS, WINDOWS_SKIPS, "full-suite.log"));
    await phase("case", async () => {
      const mount = path.join(scratch, "mount"); fs.mkdirSync(mount);
      image = path.join(scratch, "case-sensitive.sparseimage");
      const file = "case-sensitive.log";
      await checked("/usr/bin/hdiutil", ["create", "-size", "8g", "-type", "SPARSE", "-fs", "APFSX", "-volname", "AGS-V5-Trial", image], { file });
      await checked("/usr/bin/hdiutil", ["attach", "-nobrowse", "-owners", "on", "-mountpoint", mount, image], { file });
      const type = await diskInfo(mount, file);
      if (!String(type).toLowerCase().includes("apfs") || !probeCase(mount)) throw new Error("Mounted volume did not prove distinct Case/case files on APFS");
      environment.caseSensitiveFilesystem = { type, caseSensitive: true };
      const fixtures = path.join(mount, "fixtures"); fs.mkdirSync(fixtures);
      const reported = await checked(process.execPath, ["--input-type=module", "-e", "import os from 'node:os'; process.stdout.write(os.tmpdir())"], { file, env: { ...process.env, TMPDIR: fixtures } });
      if (fs.realpathSync(reported) !== fs.realpathSync(fixtures)) throw new Error("Case-sensitive test TMPDIR was not selected");
      const result = await suite(process.execPath, ["--test", "--test-reporter=tap", ...CASE_FILES], fixtures, [CASE_TEST], [], file);
      const evidence = fs.readFileSync(path.join(destination, file), "utf8");
      if (result.status === "PASS" && !evidence.split(/\r?\n/).includes(CASE_DIAGNOSTIC)) {
        result.status = "INCOMPLETE"; result.reasons.push("Distinct-case identity branch diagnostic missing");
      }
      return result;
    });
    await phase("launcher", async () => {
      const bin = path.join(scratch, "bin"), cwd = path.join(scratch, "outside"); fs.mkdirSync(cwd);
      const file = "launcher.log";
      const installed = await command(process.execPath, [path.join(root, "scripts", "install-global.mjs"), "--bin", bin], { cwd: root, file });
      if (installed.error || installed.signal || interrupted || installed.timedOut) throw new Error("Real installer could not complete");
      if (installed.status !== 0) return { status: "FAIL", reasons: ["Real installer failed; see launcher.log"] };
      const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
      for (const shell of ["/bin/sh", "/bin/zsh"]) {
        for (const [args, expected, marker] of [[ ["help", "diff"], 0, "Usage: ags diff" ], [ ["macos-trial-invalid-command"], 2, "Unknown command:" ]]) {
          const text = `exec ${[path.join(bin, "ags"), ...args].map(quote).join(" ")}`;
          const result = await command(shell, [...(shell.endsWith("zsh") ? ["-f"] : []), "-c", text], { cwd, file, env: { ...process.env, ZDOTDIR: path.join(scratch, "zsh") } });
          if (result.error || result.signal || interrupted || result.timedOut) throw new Error(`${shell} smoke could not complete`);
          if (result.status !== expected || !(result.stdout + result.stderr).includes(marker)) return { status: "FAIL", reasons: [`${shell} smoke output/status incorrect; see launcher.log`] };
        }
      }
      return { status: "PASS" };
    });
  } catch (error) { notes.push(error.message); console.error(error.message); }
  finally {
    if (scratch) {
      try {
        await cleanupScratch(scratch, image, (executable, args, options = {}) => command(executable, args, { ...options, file: "case-sensitive.log", cleanup: true }));
        phases.cleanup = { status: "PASS" };
      } catch (error) { phases.cleanup = { status: "INCOMPLETE", reasons: [error.message] }; console.error(error.message); }
    }
    process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
    if (interrupted) notes.push("Trial interrupted");
    summary();
  }
  const status = overallStatus(phases, interrupted);
  console.log(`${status}: ${path.join(destination, "summary.txt")}`);
  console.log(`${SHARE_RESULTS}\nEvidence folder: ${destination}`);
  return { status, exitCode: { PASS: 0, FAIL: 1, INCOMPLETE: 2 }[status], destination };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = (await runTrial(parseTrialArgs(process.argv.slice(2)))).exitCode; }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
