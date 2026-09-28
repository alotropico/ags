import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectEvidence, whenMatches } from "../scripts/lib/packages.mjs";
import { tempDir } from "./helpers/fixtures.mjs";

test("detection predicates: package, lockFile and repoName", () => {
  const when = { any: [{ package: "@platform/ui-library" }, { lockFile: "pnpm-lock.yaml" }, { repoName: "ui-library" }] };
  const host = tempDir("ags-ev-");
  fs.writeFileSync(path.join(host, "package.json"), JSON.stringify({ dependencies: { "@platform/ui-library": "1.0.0" } }));
  fs.writeFileSync(path.join(host, "pnpm-lock.yaml"), "lock\n");
  const evidence = detectEvidence(host);
  assert.equal(whenMatches(when, evidence), true);
  assert.equal(whenMatches({ any: [{ package: "missing" }] }, evidence), false);
  assert.equal(whenMatches({ any: [{ repoName: "nope" }] }, { ...evidence, packages: new Set(), locks: new Set() }), false);
  const renamed = path.join(tempDir("ags-repo-"), "ui-library");
  fs.mkdirSync(renamed);
  assert.equal(detectEvidence(renamed).repoName, "ui-library");
  assert.equal(whenMatches({ any: [{ repoName: "UI-Library" }] }, detectEvidence(renamed)), true);
});
