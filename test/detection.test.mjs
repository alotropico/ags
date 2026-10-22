import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog, resolveSelection } from "../scripts/lib/catalog.mjs";
import { detectEvidence, whenMatches } from "../scripts/lib/packages.mjs";
import { detectCheckScripts, suggestedHostSettings } from "../scripts/lib/detection.mjs";
import { git, makeHostRepo, REAL_ROOT, writeFiles } from "./helpers/fixtures.mjs";

test("host signals ignore generated and ignored source, and distinguish CLI, web and React Native", () => {
  const host = makeHostRepo({ gitignore: "ignored/\n", files: { "dist/app.tsx": "", "ignored/app.css": "", "node_modules/x/app.tsx": "" } });
  let evidence = detectEvidence(host);
  assert.deepEqual([...evidence.signals], ["git"]);
  writeFiles(host, { "src/main.ts": "export {};", "package.json": JSON.stringify({ devDependencies: { typescript: "1" }, scripts: { typecheck: "tsc --noEmit" } }) });
  evidence = detectEvidence(host);
  for (const signal of ["git", "code", "javascript", "typescript", "checks"]) assert.ok(evidence.signals.has(signal), signal);
  assert.equal(evidence.signals.has("web-ui"), false);
  writeFiles(host, { "package.json": JSON.stringify({ dependencies: { react: "1", "react-native": "1" } }) });
  evidence = detectEvidence(host);
  assert.ok(evidence.signals.has("react"));
  assert.equal(evidence.signals.has("web-ui"), false);
  writeFiles(host, { "src/page.html": "", "src/theme.scss": "" });
  evidence = detectEvidence(host);
  assert.ok(evidence.signals.has("web-ui"));
  assert.ok(evidence.signals.has("stylesheets"));
  assert.ok(whenMatches({ any: [{ signal: "web-ui" }] }, evidence));
  assert.ok(whenMatches({ any: [{ capability: "graphify" }] }, { capabilities: { graphify: "tool" } }));
});

test("check settings use existing unambiguous non-writing scripts only", () => {
  assert.deepEqual([...detectCheckScripts({ typecheck: "tsc --noEmit", lint: "eslint .", "format:check": "prettier . --check" })], [["checks.type", "typecheck"], ["checks.lint", "lint"], ["checks.prettier", "format:check"]]);
  assert.equal(detectCheckScripts({ lint: "eslint . --fix", "format:check": "prettier . -w" }).size, 0);
  assert.equal(detectCheckScripts({ typecheck: "a", "type:check": "b" }).size, 0);
});

test("trunk suggestions use remote HEAD or a unique local main/master and never the current feature branch", () => {
  const host = makeHostRepo();
  git(host, ["checkout", "-qb", "feature"]);
  assert.equal(suggestedHostSettings(host, detectEvidence(host)).get("git.mainBranch"), "main");
  git(host, ["branch", "master"]);
  assert.equal(suggestedHostSettings(host, detectEvidence(host)).has("git.mainBranch"), false);
  git(host, ["remote", "add", "origin", "https://example.invalid/repo.git"]);
  git(host, ["update-ref", "refs/remotes/origin/trunk", "HEAD"]);
  git(host, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk"]);
  assert.equal(suggestedHostSettings(host, detectEvidence(host)).get("git.mainBranch"), "trunk");
  git(host, ["remote", "add", "other", "https://example.invalid/other.git"]);
  git(host, ["update-ref", "refs/remotes/other/main", "HEAD"]);
  git(host, ["symbolic-ref", "refs/remotes/other/HEAD", "refs/remotes/other/main"]);
  assert.equal(suggestedHostSettings(host, detectEvidence(host)).has("git.mainBranch"), false);
});

test("released-catalog predicates recommend the approved host groups and retain explicit opt-outs", () => {
  const catalog = loadCatalog(REAL_ROOT);
  const plain = { packages: new Set(), locks: new Set(), signals: new Set(["git", "code", "javascript", "typescript", "checks"]), capabilities: {} };
  const selected = resolveSelection(catalog, {}, plain);
  for (const id of ["ags-sweep", "git-cleanup", "commit-granular", "start-branch", "check", "architecture-review", "typescript-react", "systematic-debugging"]) assert.ok(selected.skills.includes(id), id);
  assert.ok(selected.rules.includes("code-idioms"));
  for (const id of ["ship", "web-accessibility", "react-state-transitions", "write-spec"]) assert.equal(selected.skills.includes(id), false, id);
  const web = { ...plain, signals: new Set([...plain.signals, "git-remote", "react", "web-ui", "stylesheets"]) };
  const detected = resolveSelection(catalog, {}, web);
  for (const id of ["ship", "web-accessibility", "web-platform-first", "css-authoring-conventions", "css-cleanup", "css-theme-tokens", "react-state-transitions"]) assert.ok(detected.skills.includes(id), id);
  assert.equal(resolveSelection(catalog, { skills: { disabled: ["git-cleanup"] } }, web).skills.includes("git-cleanup"), false);
  assert.equal(fs.existsSync(path.join(REAL_ROOT, ".agents")), false);
});
