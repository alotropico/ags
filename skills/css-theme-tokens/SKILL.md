---
name: css-theme-tokens
description: >-
  Review and normalize theme-token usage in CSS and SCSS against the
  repository's token source, removing redundant calc, alias tokens, default
  easing, and hard-coded values. Includes the @platform/ui-library token facts.
---

# Theme tokens

**Trigger:** The user asks to tidy styles against the repository's theme tokens, or the task creates, replaces, or evaluates theme values or tokens.

## Token source

Before editing, find and read the repository's token source: the stylesheets that define its theme custom properties, or the published CSS of the UI library it depends on. The rules below depend on the values defined there. When the repository depends on `@platform/ui-library`, also apply the last section.

## Scope

- Edit one file or an agreed set of paths. When this skill is reached during another task, normalize only the lines that task already changes.
- Do not make format-only drive-by changes, and do not mass-rewrite legacy styles unless the user asks.
- For a trial, copy the file to `.tmp/scratch/` and experiment there, not in the working tree.

## Normalize

1. Replace `calc(var(--TOKEN) * 1)` with `var(--TOKEN)`.
2. Replace `calc(var(--TOKEN))` with `var(--TOKEN)` when `calc` wraps only that variable.
3. Replace an alias token with its canonical token when the token source defines the alias as exactly equal, such as a medium step equal to the base token. Keep scaled tokens.
4. Omit `ease` when it is the default timing function, and omit `all` when it is the only transitioned property: `transition: all 200ms ease` becomes `transition: 200ms`. Keep `ease-out` and `ease-in-out`. Do not collapse a multi-property transition list. Do not widen a single-property transition to `all`.
5. Fold a `calc` over spacing tokens onto a named token only when the token source's math matches exactly. Do not fold mixed `em` and `rem`, an unnamed multiplier, or an intentional sub-pixel nudge.
6. Before introducing a hard-coded length, color, radius, or duration, check the token source. Replace a hard-coded value with a token only when the token's value matches it.

## Verify

Search the edited files for leftovers of each pattern you replaced. Then use the `check` skill when it is installed. Otherwise run an existing host script. Do not invent a package manager or a script name.

## @platform/ui-library tokens

- Published tokens come from the `@platform/ui-library` CSS.
- Foundation defaults include `--space: 16px` and `--speed`, derived from `--speed-ms`.
- Exact aliases: replace `var(--speed-medium)` with `var(--speed)` and `var(--space-medium)` with `var(--space)`. Keep scaled tokens such as `--speed-fast` and `--space-small`.
- Space folds that match the foundation math: `calc(var(--space-small) + var(--space-tiny))` becomes `var(--space-slim)`, and `calc(var(--space) / 2)` becomes `var(--space-small)`.
- Leftover search: `speed-medium`, `space-medium`, and `* 1)`.
