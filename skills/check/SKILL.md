---
name: check
description: Run configured type, lint and Prettier checks through the host package manager, or choose bounded behavioral evidence for the actual change. An explicit lint-only request remains a lint task.
---

# Check

**Trigger:** Verification should run the repository's configured type, lint or Prettier checks, or completion needs meaningful evidence for the actual changed behavior. An explicit request to run lint remains a lint task.

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
- It uses native package-manager executables; Windows batch handling stays on Windows. Missing/denied executables and child signals include a failure reason. The helper needs only Node and the host's package manager, not AGS or its source checkout.
- Statuses: `passed`, `failed`, `not-configured`, `stale-configuration` (the script is not in `package.json`), `unavailable` (no package manager found), `rejected` (a prettier script that writes files, such as `prettier --write`).

Report each check's status, script and relevant output. Do not invent a command, a package manager or a script name.

## Behavioral evidence

Identify the claim the change needs to establish, choose its smallest meaningful check from [behavioral evidence](references/behavioral-evidence.md), run the available check and read its result before claiming completion. Keep configured static checks and their helper/statuses intact; clean lint alone does not verify behavior.

Mark behavioral checks `passed`, `failed`, `not run` or `blocked`, with scope and reason. Unavailable checks never pass. Preserve host test conventions and authorization; do not install an environment, add settings/a generic runner, or require a browser pipeline/full suite for every request. Documentation and bounded formatting use review and appropriate lightweight checks.
