import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { validateMigrationDeclaration, workingMigrationErrors } from "../scripts/lib/migrations.mjs";
import { releaseVersions } from "../scripts/lib/catalog.mjs";
import { REAL_ROOT, tempDir, writeFiles } from "./helpers/fixtures.mjs";

test("migration declaration: adjacent majors, explicit source releases and retained ids", () => {
  assert.deepEqual(validateMigrationDeclaration({
    format: 1,
    fromMajor: 2,
    toMajor: 3,
    sourceVersions: ["2.0.0", "2.1.2"],
    idTransforms: [],
  }, { path: "migrations/2-to-3.json" }), []);

  const errors = validateMigrationDeclaration({
    format: 2,
    fromMajor: 2,
    toMajor: 4,
    sourceVersions: ["2.0.0", "2.0.0", "3.0.0"],
    idTransforms: [{ from: "old", result: "remove" }],
    extra: true,
  }, { path: "bad.json" });
  assert.ok(errors.some((line) => line.includes("unknown field extra")));
  assert.ok(errors.some((line) => line.includes("format must be 1")));
  assert.ok(errors.some((line) => line.includes("toMajor must be fromMajor + 1")));
  assert.ok(errors.some((line) => line.includes("duplicate source version")));
  assert.ok(errors.some((line) => line.includes("is not major 2")));
  assert.ok(errors.some((line) => line.includes("idTransforms must be empty")));
});

test("working migration declarations are validated by filename and content", () => {
  const root = tempDir("ags-migrations-");
  writeFiles(root, {
    "migrations/2-to-3.json": `${JSON.stringify({ format: 1, fromMajor: 2, toMajor: 3, sourceVersions: ["2.1.2"], idTransforms: [] })}\n`,
  });
  assert.deepEqual(workingMigrationErrors(root), []);
  fs.renameSync(path.join(root, "migrations", "2-to-3.json"), path.join(root, "migrations", "wrong.json"));
  assert.ok(workingMigrationErrors(root).some((line) => line.includes("filename must be 2-to-3.json")));
});

test("the V3 declaration covers every released V2 source", () => {
  const declaration = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, "migrations", "2-to-3.json"), "utf8"));
  const released = releaseVersions(REAL_ROOT).filter((version) => version.startsWith("2."));
  assert.deepEqual(declaration.sourceVersions, released);
});
