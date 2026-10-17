# Native interaction

Inspect the host library/shared/feature control and its behavior first. Use that dedicated control when adequate, and explain its concrete limitation before replacing it.

| Need | Evaluate and verify |
| --- | --- |
| Submission/validation | Native form, submit controls and accurate input types; product validation timing, label/error associations, Enter submission, paste/autofill, retained entries and recovery. Native validation and custom validation may coexist; do not add novalidate universally. |
| Disclosure | Existing disclosure or details/summary where its behavior fits; open state, keyboard activation, hidden-content focus, long content and restoration when closing hides focus. |
| Modal | Existing dialog; otherwise dialog/showModal if supported. Verify initial focus, genuinely unavailable background, visible close path, dismissal policy and focus return. Toggling open alone is not the modal API. |
| Popover | Existing mechanism, then the exact supported popover behavior; dismissal, anchor/position requirements, role/name, keyboard access and focus. A popover does not automatically supply menu, combobox or dialog semantics. |
| Built-in control | Accurate select/input/button semantics and supported behavior before custom state. Preserve needed product validation, synchronization and library contracts. |

Use JavaScript when platform behavior cannot meet the actual contract. Document that gap, keep one state owner, and test opening/closing, cancellation, errors and content growth in the touched interaction. Use the installed accessibility specialist for detailed procedures; do not redesign unrelated screens.
