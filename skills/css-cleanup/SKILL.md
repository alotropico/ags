---
name: css-cleanup
description: >-
  Audit CSS and SCSS for unused selectors, unused variables, and redundant
  overrides. Write one scoped report first, then remove confirmed findings
  only when authorized. Use when the user asks to clean up styles, find unused
  CSS, or audit CSS modules or SCSS files. A lint-only request stays a lint
  task. Deeper tracing starts only when the user explicitly asks for it.
---

# CSS cleanup

**Trigger:** The user explicitly asks to clean up styles, find unused CSS, or audit CSS modules or SCSS files. A request that only lints CSS is a lint task, not permission to remove classes. Deeper both-direction tracing starts only when the user explicitly asks for deeper cleanup, obsolete class references, or the equivalent specific work.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. Each key is optional. An empty or missing value means that check is not configured. Report that condition. Do not ask for an optional key, and do not invent a script or a package manager.

- `checks.type`: the `package.json` script that runs the type check. If the key is empty or missing, the type check is not configured.
- `checks.lint`: the `package.json` script that runs the linter. If the key is empty or missing, the lint check is not configured.
- `checks.prettier`: the `package.json` script that checks formatting without writing files. If the key is empty or missing, the format check is not configured.

## Depths

This skill has two cleanup depths.

### CSS linting

CSS-only lint is a check or tooling task, not an unused-selector audit or permission to remove classes. Use the `check` skill when it is installed. Otherwise inspect existing lint tooling for read-only coverage of the requested styles; report unsupported CSS-only execution without broadening the run or adding scripts, settings, or dependencies. Preserve warnings, errors, and exit codes, and do not enable autofix. Lint success does not establish non-use or completed cleanup.

### Ordinary cleanup

Ordinary cleanup is the default for an explicit cleanup or unused-CSS request that does not ask for deeper tracing.

Within the agreed scope, investigate and, when removal is authorized, conservatively remove:

- confirmed unused selectors;
- confirmed unused SCSS variables and CSS custom properties;
- declarations or overrides proven redundant in the applicable cascade.

Determine what an existing audit script establishes before using it as evidence. Reuse its findings for the categories it actually covers. Use targeted investigation for requested categories it does not cover. Do not treat ordinary lint success as proof that selectors are unused.

Preserve shared and global styles, dynamic references, and classes used as strings or markers. A raw zero-hit search is a candidate. It is not sufficient proof of non-use across generated names, composition, templates, or public consumers.

### Deep cleanup

Use deep cleanup only when the user explicitly asks for deeper cleanup, both-direction tracing, obsolete class references, or the equivalent specific work. File size and the availability of tools do not activate it. A request for one component stays on that component.

Only for that deep-cleanup request, read [deep cleanup](references/deep-cleanup.md) for reverse tracing, obsolete references, composition, and orphan stylesheets. Ordinary cleanup does not load that reference. Deep mode expands tracing; it does not authorize redesign, fixing suspected styling, or changing visual behavior.

## Scope

Use the user-named paths or a clearly identified active feature. Without either, ask one concise scope question. Do not take every CSS file in the repository as the default scope. Repository-wide cleanup requires an explicit repository-wide request.

Reading consumers outside the edit scope may be necessary to establish safety. That reading does not authorize edits to those consumers or an audit of unrelated styles.

## Existing scripts

Read the `package.json` scripts and the settings above before deciding that no audit exists. Inspect an established audit script's scope, coverage, and write behavior before running it. Use read-only findings for the categories it actually checks; an autofix or cleanup script must not bypass the report and removal checkpoint. Use the `check` skill when it is installed for a configured static check. Use targeted investigation below for requested categories no dedicated script covers.

## Grep audit

Use the host's actual source, test, template, and package paths; do not assume `src/`, `tests/`, or TypeScript. For each CSS module in scope:

1. Find direct importers and re-exports with a literal search for the module path or filename, then follow relevant aliases, barrels, templates, and generated or public exports. Reading consumers outside the edit scope may be necessary to establish safety.
2. Note each binding name (`style`, `tableStyle` and so on).
3. Collect static class reads, including dot, optional-chain, and bracket notation. Resolve binding aliases and destructuring where used.
4. Inventory defined class names, including nested selectors, `&` modifiers, Sass interpolation, composition, and exports. Keep candidates suspicious when their emitted names are uncertain.
5. Unused candidates are defined classes minus referenced classes.
6. If an importer uses dynamic access (`style[<variable>]` or `style?.[variable]`), mark potentially addressed selectors suspicious until the possible keys and consumers are established. If the keys cannot be bounded, preserve every potentially addressed selector.

Then extend the ordinary audit beyond modules:

- Global classes: search the raw class name across markup, templates and TS or JS, including string concatenation and composition calls such as `classNames(...)`.
- Variables: trace SCSS reads through relevant Sass imports, uses, forwards, and namespaces. Trace custom-property reads in styles, source, templates, and runtime style APIs. Follow relevant consumers outside the edit scope when needed; a local zero-hit search does not establish non-use.
- Redundant overrides: a declaration that repeats the value the element already gets from the cascade, or one that a later declaration in the same scope always overrides. Verify shorthand/longhand interactions, fallbacks, conditional rules, and cascade order before removal.

Classify each usage candidate as unused (no consumer found yet), suspicious (dynamic construction or unresolved exports are possible), or used. Unused means a candidate, not confirmed non-use. Redundant declarations need cascade evidence; usage hits do not disqualify redundancy.

## Report

Before deleting anything, write the scoped findings to `.tmp/records/YYYY-MM-DD-css-audit-<scope>.md`. Put a compact depth and scope label on that report, together with the actionable findings. Do not write a second report for each phase.

For each finding, keep the file, line, kind, classification, and the evidence that justifies removal or preservation. Group repeated uncertainty instead of repeating the same explanation for each hit.

Summarize the report for the user and stop before deletion unless removal is already authorized through confirmation or an explicit cleanup-and-fix instruction. Do not ask again for removal the user has already authorized.

## Confirm and remove

Prefer keeping a selector over risking a broken view. Revalidate a candidate before removal when relevant code has changed or new uncertainty has appeared. Earlier findings are not sufficient after their assumptions are stale.

1. Use current evidence appropriate to the finding: non-use for unused definitions or cascade equivalence for redundant declarations. A definition's own search hit is not a consumer. Keep a candidate when its required proof is missing, and do not repeat unchanged searches solely to satisfy this step.
2. Before deleting a selector, check nested selectors, `composes`, and global or marker classes that other stylesheets target.
3. Never delete a suspicious finding without verifying how the dynamic usage resolves.
4. Remove in small batches, and only with authorization: delete confirmed unused selector blocks, unused variables and custom properties, and proven redundant overrides. Preserve nesting. For `&.modifier`, remove only that modifier block.

## Verify

Use appropriate configured checks and available targeted behavioral evidence for the touched styles and behavior, preserving host verification requirements. Use the `check` skill when it is installed; otherwise run an explicit existing script. Share applicable current results as that skill describes. Do not add a production build or a browser suite merely because those tools are available. Do not invent a package manager or a script name.
