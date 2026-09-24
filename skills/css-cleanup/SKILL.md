---
name: css-cleanup
description: Audit and remove unused CSS-module selectors conservatively.
---

# CSS module cleanup

**Trigger:** The user explicitly asks to clean unused CSS or audit CSS modules.

## Established command

Read the host `package.json` scripts and `.agents/ags.yaml` `checks` before deciding that no audit exists. If an established audit, lint, or cleanup command already covers CSS modules, run that command through the host `check` skill when the matching check is configured. Use the grep procedure below only when no dedicated command exists.

## Grep audit

For each `.module.scss` under consideration:

1. Find importers of that module in the host's source and tests.
2. Note each binding name.
3. Collect referenced class ids: `style.<class>`, `style?.['<class>']`, and `style["<class>"]`.
4. List top-level classes and `&.modifier` blocks defined in the module.
5. Unused candidates are defined classes minus referenced classes.
6. If any importer uses dynamic access (`style[<variable>]` or `style?.[variable]`), stop for that module. Do not treat its selectors as unused.

## Confirm and remove

Re-grep each unused candidate across the host source and tests. Skip it when any hit remains.

- Delete only unused selector blocks. Preserve nesting.
- For `&.modifier`, remove only that modifier block.
- An orphan module that nothing imports may be deleted after confirmation.
- If a component references a class that is missing from its module, add the class. Do not delete a class that is used elsewhere.

## Verify

Use the host `check` skill when it is configured. Otherwise run an explicit existing host script. Do not invent a package manager or a script name. Do not fall back to canonical AGS scripts.
