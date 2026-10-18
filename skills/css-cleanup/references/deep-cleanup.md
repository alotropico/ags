# Deep CSS cleanup

Read only for an explicitly requested deep cleanup. Apply the entry skill's scope, authorization, report checkpoint, evidence-revalidation, and verification rules. Use the same scoped report for ordinary and deep findings; do not enumerate used classes.

## Trace both directions

Retain ordinary checks for definitions without consumers. Within the same scope, also trace:

- component and template class references without matching definitions, including static module-property references;
- orphan stylesheet imports and stylesheet files whose deletion is demonstrably safe;
- broken or obsolete class-composition references, including `composes`, and directly related leftovers.

## Missing definitions and obsolete references

A missing CSS definition is not enough to delete the consumer reference. The class may be a global marker, a generated or exported class, a query or test hook, a composed value, or a sign that intended styling is missing.

For a confirmed obsolete reference:

- Remove that reference and preserve the remaining classes, conditions, and other expression behavior. A confirmed-dead entry in a composition such as `cx(styles.oldHeader, styles.active)` leaves the remaining entry in place.
- Remove the whole `className` prop when it becomes unnecessary and removal is behaviorally equivalent. Do not replace it with an empty string.
- Preserve a condition that has side effects, and preserve an expression whose behavior cannot safely be simplified.
- Check composition, nested Sass output, global conventions, dynamically constructed keys, and relevant consumers before declaring the reference dead.
- If the styling appears intentionally missing, report the discrepancy. Do not invent a selector or a visual design to make the reference resolve.

Use current evidence of obsolescence; a dead-reference search hit is the removal target, not a reason to skip it. Keep a candidate when its required proof is missing, and do not repeat unchanged searches solely to satisfy the removal step. Remove confirmed obsolete references only with authorization and in small batches.

When behavior remains uncertain, preserve the code and report the specific uncertainty. A module that uses `styles[variant]`, or another dynamic key, keeps its uncertain selectors. Absence of static hits is not enough. Deep cleanup expands tracing; it does not authorize redesign, fixing suspected styling, or changing visual behavior.

## Stylesheet imports and files

Treat a stylesheet import as potentially side-effectful. Do not delete a stylesheet merely because nothing reads its module properties locally. Preserve an import that registers global styles unless its effects are proven unused within the authorized cleanup.

Delete an orphan stylesheet import or file only with authorization, in small batches, and when its effects are proven unused within the authorized cleanup.
