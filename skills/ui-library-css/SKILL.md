---
name: ui-library-css
description: >-
  For a host depending on @platform/ui-library, inspect real component types,
  props, style APIs and tokens when creating, editing or reviewing its
  components/styles before adding local CSS.
---

# UI library CSS

**Trigger:** The host `package.json` depends on `@platform/ui-library`, and the task creates, edits, or reviews its components or styles. Package detection establishes eligibility; an unrelated task does not activate this skill.

General CSS authoring: [`css-authoring-conventions`](../css-authoring-conventions/SKILL.md).

When the task creates, replaces, or evaluates theme values or tokens: [`css-theme-tokens`](../css-theme-tokens/SKILL.md).

## Before adding local CSS

- Check the existing `@platform/ui-library` components, style APIs, token vocabulary, and established composition patterns.
- Read installed component types/props before inventing props or styles. Use available variants, sizes and spacing when they cover the need.
- Prefer those APIs over new local CSS when they already express the result.
- Package detection is the eligibility signal. Do not assume a repository name.

The installed authoring companion includes `css-cleanup`; load cleanup only for requested cleanup/audit or an applicable task in touched code. Installation does not activate every companion on every style edit.
