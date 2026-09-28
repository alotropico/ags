---
name: check
description: Run the repository's configured type, lint, and Prettier checks through its package manager. Use when verification should run those checks.
---

# Check

**Trigger:** Verification should run the repository's configured type, lint or Prettier checks.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `checks.type`: the `package.json` script that runs the type check. If the key is empty or missing, the type check is not configured.
- `checks.lint`: the `package.json` script that runs the linter. If the key is empty or missing, the lint check is not configured.
- `checks.prettier`: the `package.json` script that checks formatting without writing files. If the key is empty or missing, the format check is not configured.

## Run

Run `node .agents/skills/check/scripts/run-checks.mjs`, passing `--type`, `--lint` and `--prettier` with the non-empty values of `checks.type`, `checks.lint` and `checks.prettier`. If all three are empty, say that no checks are configured.

Run it from the repository root. When the `ags` command is available, `ags check --route .` does the same.

## What the script does

- It finds the package manager from the `packageManager` field or from exactly one lock file, and stops when they conflict.
- It runs every given script in the order type, lint, prettier, collects each result even when one fails, and exits 1 if any failed.
- Statuses: `passed`, `failed`, `not-configured`, `stale-configuration` (the script is not in `package.json`), `unavailable` (no package manager found), `rejected` (a prettier script that writes files, such as `prettier --write`).

Report each check's status, script and relevant output. Do not invent a command, a package manager or a script name.
