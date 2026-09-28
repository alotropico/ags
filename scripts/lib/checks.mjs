import {
  detectPackageManager,
  isPackageScriptKey,
  prettierBodyWrites,
  readPackageScripts,
  runPackageScript,
} from "./packages.mjs";
import { AgsError } from "./util.mjs";

const ORDER = ["type", "lint", "prettier"];

export function runChecks(hostRoot, checks = {}, { which = ORDER } = {}) {
  const requested = ORDER.filter((name) => which.includes(name));
  const unknown = which.filter((name) => !ORDER.includes(name));
  if (unknown.length) throw new AgsError(`Unknown check category: ${unknown.join(", ")}`);
  const detected = detectPackageManager(hostRoot);
  const scripts = readPackageScripts(hostRoot);
  const results = [];
  if (detected.conflict && requested.some((name) => checks[name])) {
    throw new AgsError(detected.conflict);
  }
  for (const name of requested) {
    const script = checks[name];
    if (!script) {
      results.push({ name, status: "not-configured" });
      continue;
    }
    if (!isPackageScriptKey(script)) {
      results.push({
        name,
        script,
        status: "stale-configuration",
        exitCode: 1,
        diagnostics: `checks.${name} is not a package script name`,
      });
      continue;
    }
    if (!Object.hasOwn(scripts, script)) {
      results.push({
        name,
        script,
        manager: detected.manager,
        status: "stale-configuration",
        exitCode: 1,
        diagnostics: `package.json has no script ${script}`,
      });
      continue;
    }
    if (!detected.manager) {
      results.push({
        name,
        script,
        status: "unavailable",
        exitCode: 1,
        diagnostics: "No package manager identified",
      });
      continue;
    }
    if (name === "prettier" && prettierBodyWrites(scripts[script])) {
      results.push({
        name,
        manager: detected.manager,
        script,
        command: `${detected.manager}.cmd run ${script}`,
        status: "rejected",
        exitCode: 1,
        diagnostics: "checks.prettier must not rewrite files",
        stdout: "",
        stderr: "",
      });
      continue;
    }
    const result = runPackageScript(hostRoot, detected.manager, script);
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    const exitCode = result.status == null ? 1 : result.status;
    results.push({
      name,
      manager: detected.manager,
      script,
      command: `${detected.manager}.cmd run ${script}`,
      exitCode,
      status: exitCode === 0 ? "passed" : "failed",
      stdout,
      stderr,
      diagnostics: `${stdout}${stderr}`,
    });
  }
  return results;
}

export function checkFailed(results) {
  return results.some((result) => !["passed", "not-configured"].includes(result.status));
}
