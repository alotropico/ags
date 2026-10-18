---
name: check
description: Run configured type, lint and Prettier checks through the host package manager, or choose bounded behavioral evidence for the actual change. An explicit category or subset stays limited to that request.
---

# Check

**Trigger:** Verification should run the repository's configured type, lint or Prettier checks, or completion needs meaningful evidence for the actual changed behavior. An explicit category or subset, including lint only, stays limited to that request.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. Each key is optional. An empty or missing value means that category is not configured. Report that condition. Do not ask for an optional key, and do not substitute another category.

- `checks.type`: the `package.json` script that runs the type check. If the key is empty or missing, the type check is not configured.
- `checks.lint`: the `package.json` script that runs the linter. If the key is empty or missing, the lint check is not configured.
- `checks.prettier`: the `package.json` script that checks formatting without writing files. If the key is empty or missing, the format check is not configured.

## Run

An explicit category or subset selects only those categories. A lint-only request runs lint only. It does not invoke type checking, formatting, behavioral testing, or a build merely because those tools exist. An ordinary request for the configured static checks may select every configured category. Preserve applicable host verification requirements and the runner's order and error handling; a requested subset alone does not establish implementation completion.

Pass only the selected, configured values to `node .agents/skills/check/scripts/run-checks.mjs` as `--type`, `--lint`, or `--prettier`. Do not invent package scripts. Do not change package-manager detection. Run the helper from the repository root.

When the selected settings are non-empty and the `ags` command and installed check helper are available, the installed equivalents are `ags check --only lint --route .` for lint-only, `ags check --only "type,lint" --route .` for type and lint, and `ags check --route .` for the ordinary configured set. `--only` accepts `type`, `lint`, and `prettier`, including a single category.

A requested category whose setting is empty or missing is not configured. Report that condition. Do not run a different category in its place. Do not launch the helper with no selected script and then treat an all-`not-configured` result as a pass.

The helper still names every category. A category left off the command is reported `not-configured` even when its host setting exists. That line means the category was not selected. Report the selected categories. Do not rerun an omitted category to replace that line.

If an ordinary request finds all three settings empty, say that no checks are configured.

An explicit static-check task is separate from implementation completion. A successful lint-only task establishes lint status. It does not establish correct UI behavior or a verified bug fix.

Report each selected check's status, script, and relevant output. Keep the summary short. When the log is already visible, state the diagnostic or the limitation instead of pasting it again. Do not invent a command, a package manager, or a script name.

### CSS-only lint

For CSS or SCSS lint requests, read [CSS linting](references/css-lint.md) before selecting a command. Category selection alone does not establish file coverage. Other check requests do not need that reference.

## What the script does

- It finds the package manager from the `packageManager` field or from exactly one lock file, and stops when they conflict.
- It runs every given script in the order type, lint, prettier, collects each result even when one fails, and exits 1 if any failed.
- It uses native package-manager executables; Windows batch handling stays on Windows. Missing/denied executables and child signals include a failure reason. The helper needs only Node and the host's package manager, not AGS or its source checkout.
- Statuses: `passed`, `failed`, `not-configured`, `stale-configuration` (the script is not in `package.json`), `unavailable` (no package manager found), `rejected` (a prettier script that writes files, such as `prettier --write`).

## Shared verification

Multiple applicable skills may share one verification result for the same relevant state. Reuse available results when their command, scope, relevant inputs, and environment remain applicable. Repeat checks after relevant changes, demonstrated failures, or unresolved concerns; explicit rerun requests and host verification requirements still apply.

- A companion skill's mention of `check` is not an instruction to repeat an identical successful command.
- Run the necessary checks at a coherent point after the edits they validate. The same command does not have to run after each skill section or CSS file.
- A result from before a relevant edit, a dependency or configuration change, an environment change, or a generated-input change is not current for that claim.
- Type, lint, and formatting results do not replace behavioral evidence when behavior changed.
- A previous session's unverified statement or a stale record is not fresh evidence. Do not reconstruct a missing result or label an unrun check passed.
- Report a shared result once, with the useful command, scope, and result. Do not reproduce a result table per companion.

Use evidence already in the session. Do not add a persistent verification cache, hashes, a session database, or an invalidation framework. Domain-specific verification in the behavioral reference stays in force.

## Behavioral evidence

When completing an implementation, identify the claim the change needs to establish and choose its smallest meaningful check from [behavioral evidence](references/behavioral-evidence.md). Reuse an applicable current result under Shared verification; otherwise run the available check and read its result before claiming completion. An explicit static-check-only task uses Run above and does not require loading the behavioral reference. Keep configured static checks and their helper/statuses intact; clean lint alone does not verify behavior.

Mark behavioral checks `passed`, `failed`, `not run` or `blocked`, with scope and reason. Unavailable checks never pass. Preserve host test conventions and authorization; do not install an environment, add settings/a generic runner, or require a browser pipeline/full suite for every request. Documentation and bounded formatting use review and appropriate lightweight checks.
