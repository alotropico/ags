---
name: css-cleanup
description: Audit and remove unused CSS-module selectors conservatively. Use when the user asks to clean unused CSS or audit CSS modules.
---

# CSS module cleanup

**Trigger:** The user explicitly asks to clean unused CSS or audit CSS modules.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `checks.type`: the `package.json` script that runs the type check. If the key is empty or missing, skip the type check.
- `checks.lint`: the `package.json` script that runs the linter. If the key is empty or missing, skip the lint check.
- `checks.prettier`: the `package.json` script that checks formatting without writing files. If the key is empty or missing, skip the format check.

## Established command

Read the `package.json` scripts and the settings above before deciding that no audit exists. If an established audit, lint or cleanup script already covers CSS modules, run it; use the `check` skill when it is installed and the matching setting is configured. Use the grep procedure below only when no dedicated script exists.

## Grep audit

For each `.module.scss` under consideration:

1. Find importers of that module in the repository's source and tests.
2. Note each binding name.
3. Collect referenced class ids: `style.<class>`, `style?.['<class>']`, and `style["<class>"]`.
4. List top-level classes and `&.modifier` blocks defined in the module.
5. Unused candidates are defined classes minus referenced classes.
6. If any importer uses dynamic access (`style[<variable>]` or `style?.[variable]`), stop for that module. Do not treat its selectors as unused.

## Confirm and remove

Re-grep each unused candidate across the source and tests. Skip it when any hit remains.

- Delete only unused selector blocks. Preserve nesting.
- For `&.modifier`, remove only that modifier block.
- An orphan module that nothing imports may be deleted after confirmation.
- If a component references a class that is missing from its module, add the class. Do not delete a class that is used elsewhere.

## Verify

Run the checks from Host settings that are configured, through the `check` skill when it is installed. Otherwise run an explicit existing script. Do not invent a package manager or a script name.
