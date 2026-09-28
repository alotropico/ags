---
name: css-authoring-conventions
description: >-
  Apply concise CSS and SCSS authoring conventions when creating, editing,
  refactoring, or reviewing styles and styling-related markup.
---

# CSS authoring conventions

**Trigger:** Creating, editing, refactoring, or reviewing CSS or SCSS, or the markup that exists to carry those styles.

These are strong defaults, not mechanical transforms. Correctness, accessibility, semantic HTML, cascade behavior, and established host conventions win. Prefer an existing shared component or an established host pattern when one already fits. Discover the host's style files before assuming a directory layout.

Unused-class audit: [`css-cleanup`](../css-cleanup/SKILL.md).

## Declarations

- Prefer CSS shorthand when it is fully equivalent and will not reset an intentional longhand or hide a later override.
- Do not redeclare a value that cascade, inheritance, a component default, or the same scope already gets right, unless explicitness has a concrete purpose.
- Prefer fewer declarations. Leave a property undeclared when inheritance or the existing default already matches.
- Order declarations alphabetically by default. Preserve intentional order for shorthand and longhand interactions, fallbacks, vendor-prefixed pairs, repeated-property overrides, and other dependencies. Do not mechanically reorder nested rules or Sass directives.

## Selectors and naming

- Do not introduce tag selectors inside a CSS module. Tags belong in the host's established global theme layer when that layer exists.
- Inside CSS modules, use module-owned semantic or hierarchical class names that describe the element's role.
- Do not introduce ad hoc utility-like class names. Prefer an existing shared component, its public style API, or an established global class when one already fits.
- Do not add a meaningless class to a `div` only to satisfy a naming pattern. Prefer a semantic element where practical, or name the `div` for its actual structural role.
- In Sass, use `&` for modifiers, states, pseudo-classes, and pseudo-elements when it clearly expresses the relationship to the parent selector.

## Markup and composition

- Prefer an existing shared component and its props or variants over a new local class when that API already represents the result.
- Consolidate genuinely repeated markup-and-style structures into a reusable component. Do not abstract coincidental or trivial duplication.
- Avoid an unnecessary wrapper when a fragment or an existing element already provides the layout, semantics, accessibility, styling, and event behavior.

## Component boundaries

- When adding style-related props such as `theme`, `variant`, or `size`, reuse or derive them from existing exported types for the same concept. Do not duplicate an equivalent enum or string union.
- Keep local CSS at the boundary the component already owns. Do not invent a parallel style API when the component already exposes the needed variant.

## Verify

Use the `check` skill when it is installed. Otherwise run the repository's existing type, lint, or format scripts. Do not invent a package manager or a script name.
