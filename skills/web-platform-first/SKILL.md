---
name: web-platform-first
description: Choose web structure, native interaction, layout or CSS mechanisms when implementing or reviewing a web surface or replacing custom machinery. Inspect existing host components and exact runtime support first. Does not activate for a known color/spacing token, copy-only edits, or backend work alone.
---

# Web platform first

1. Identify the touched surface, product behavior, host UI library, shared/feature components, styling conventions and runtime targets. Reuse an adequate existing component before building a replacement; read its actual types/props. Preserve dedicated components and no-inline-style guidance when applicable.
2. Choose truthful [semantic HTML](references/semantic-html.md) inside that contract.
3. Evaluate [native interaction](references/native-interaction.md), then [layout constraints](references/layout-reasoning.md) and [CSS mechanisms](references/modern-css.md), before adding custom JavaScript state/events. Load only the reference needed for the decision.
4. Verify the exact feature against [actual runtime targets](references/browser-support.md). Implement the smallest maintained solution satisfying those targets and product behavior.
5. Verify the touched behavior and report actual evidence. A read-only review stays read-only. Use `web-accessibility` when installed and its interaction scope applies; token work uses `css-theme-tokens`, requested cleanup uses `css-cleanup`, and state architecture retains its existing skills.
