---
name: web-accessibility
description: Implement or assess touched web semantics/names, keyboard/focus, forms/errors/authentication, dialogs/disclosures/navigation, composites, or visual/input/motion accessibility; also use for an explicit accessibility assessment. Scope ordinary work to its changed interaction; do not start a repository-wide audit.
---

# Web accessibility

1. Identify the user task, changed interaction, host components, runtime/input targets and failure/recovery states. Preserve product requirements. A read-only assessment stays read-only; fix only within authorization.
2. Load the relevant reference only:

| Task | Reference |
| --- | --- |
| Roles, labels, names, relationships, images, structure | [Semantics and names](references/semantics-and-names.md) |
| Traversal, visible focus, routes, lost focused content | [Keyboard and focus](references/keyboard-focus-and-routing.md) |
| Validation, error recovery, paste/autofill, sign-in | [Forms and authentication](references/forms-errors-authentication.md) |
| Modal, disclosure or ordinary navigation | [Dialogs and navigation](references/dialogs-disclosures-navigation.md) |
| A justified tabs/listbox/combobox/menu/grid pattern | [Composite widgets](references/composite-widgets.md) |
| Contrast, zoom/reflow, input access or motion | [Visual, input and motion](references/visual-input-and-motion.md) |
| Meaningful available checks and bounded reporting | [Testing and evidence](references/testing-and-evidence.md) |
| Exact standard status, criterion or pattern authority | [Source index](references/source-index.md) |

3. Prefer truthful native semantics within adequate existing dedicated host components. Implement/assess the whole touched interaction, including relevant loading/error/empty states and focus recovery, without redesigning other screens.
4. Run available meaningful rendered keyboard, tree, automated and selected screen-reader checks. Record actual methods/results separately; static inspection is not rendered or assistive-technology testing, and a scan is not a conformance verdict.
5. Use available approved tools. Do not automatically install browsers, screen readers, audit services or frameworks. Report unavailable checks and residual uncertainty; stop at the authorized scope.
