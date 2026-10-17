# Layout reasoning

Inspect the containing block, available inline size, intrinsic minimum, track sizes, flex shrinking, wrapping and overflow. Determine whether the relationship is one-dimensional (often Flex) or two-dimensional (often Grid). Preserve host layout primitives, gaps, CSS Modules/SCSS, selectors and tokens before adding measurements or a resize listener.

For example, a two-column Grid with `1fr 1fr` can overflow when an unbroken filename sets a track's automatic minimum. Inspect computed track sizes and the offending child's minimum. A scoped `minmax(0, 1fr)` track and/or `min-inline-size: 0` on the appropriate item permits shrinking; choose wrapping (`overflow-wrap`) or intentional truncation from product requirements. Hiding overflow globally can conceal controls and is not a diagnosis.

Check long/localized labels, errors, empty/loading content, zoom and narrow containers in the changed surface. Prefer intrinsic constraints, wrapping, gaps, logical dimensions and appropriate min/max sizing before imperative measurement. Preserve meaningful DOM/focus order when visual layout changes. Use container versus viewport responsiveness according to the owner of the constraint, and verify support for the exact chosen mechanism.
