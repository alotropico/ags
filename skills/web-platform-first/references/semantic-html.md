# Semantic HTML

Inspect the existing dedicated component's rendered element before changing structure. A navigation destination needs link behavior; an action needs button behavior, including form submission type. Do not replace an adequate host control with a raw element merely to use a platform API.

Use headings and landmarks to explain real structure. Associate input labels with controls, group related form inputs appropriately, and retain meaningful names and state. Use lists for actual lists and tables for tabular data; repeated cards alone do not require list, article or section semantics. Keep plain containers when stronger semantics would be misleading.

Remove redundant wrappers only in touched code and only after checking selectors, layout, component contracts and framework syntax. Preserve logical source order, host stylesheet/class/token conventions, labels, image alternatives and native keyboard behavior. Inspect the accessibility tree for an interaction change when tools are available; truthful-looking source is only static evidence.
