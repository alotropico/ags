import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeLinkErrors } from "../scripts/lib/links.mjs";
import { tempDir } from "./helpers/fixtures.mjs";

test("malformed link escapes are reported, not thrown", () => {
  const root = tempDir("ags-links-");
  const dir = path.join(root, "skills", "bad-link");
  fs.mkdirSync(dir, { recursive: true });
  const text = "---\nname: bad-link\ndescription: Bad link.\n---\n\n[x](%zz)\n";
  fs.writeFileSync(path.join(dir, "SKILL.md"), text);
  const errors = relativeLinkErrors(root, dir, text);
  assert.ok(errors.some((href) => href.includes("%zz")));
});
