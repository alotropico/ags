---
name: ui-library-css
description: >-
  Check @platform/ui-library components, style APIs, and tokens before adding
  local CSS.
---

# UI library CSS

**Trigger:** The host `package.json` depends on `@platform/ui-library`, and the task creates, edits, or reviews styles.

General CSS authoring: [`css-authoring-conventions`](../css-authoring-conventions/SKILL.md).

When the task creates, replaces, or evaluates theme values or tokens: [`css-theme-tokens`](../css-theme-tokens/SKILL.md).

## Before adding local CSS

- Check the existing `@platform/ui-library` components, style APIs, token vocabulary, and established composition patterns.
- Prefer those APIs over new local CSS when they already express the result.
- Package detection is the eligibility signal. Do not assume a repository name.
