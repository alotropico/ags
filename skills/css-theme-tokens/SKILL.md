---
name: css-theme-tokens
description: Review and normalize @platform/ui-library theme-token usage.
---

# Theme tokens

**Trigger:** The task creates, replaces, or evaluates `@platform/ui-library` theme values or tokens. Reach this skill from ui-library-css. It is not the primary CSS entry point.

## Facts

- Published tokens come from `@platform/ui-library` CSS.
- Foundation defaults include `--space: 16px` and `--speed` derived from `--speed-ms`.

## Normalize

1. Replace `calc(var(--TOKEN) * 1)` with `var(--TOKEN)`.
2. Replace `var(--speed-medium)` with `var(--speed)` and `var(--space-medium)` with `var(--space)`. Keep scaled tokens such as `--speed-fast` and `--space-small`.
3. Replace `calc(var(--TOKEN))` with `var(--TOKEN)` when `calc` wraps only that variable.
4. Omit `ease` when it is the default timing function. Keep `ease-out` and `ease-in-out`. Do not collapse a multi-property transition list. Do not widen a single-property transition to `all`.
5. Fold a space `calc` onto a named token only when the foundation math matches. Do not fold mixed `em` and `rem`, an unnamed multiplier, or an intentional sub-pixel nudge.

## Verify

Use the host `check` skill when those commands are configured. Otherwise use an existing host script. Do not invent a package manager or a script name.
