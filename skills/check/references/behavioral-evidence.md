# Behavioral evidence

Use the actual change and its completion claim to choose bounded evidence. An explicit static-check-only request does not authorize a broader campaign.

| Change | Check and record |
| --- | --- |
| Bug fix | Re-run the original failing sequence and a meaningful regression test in the existing suitable host harness; preserve host test placement. |
| Interaction/focus | Rendered keyboard sequence, focus placement/return, labels/states, and changed loading/empty/error paths. Separate static inspection, accessibility-tree and assistive-technology results. |
| Async/resource | Relevant stale-result, overlap, cancellation, disposal, retry or invalidation sequence; confirm ownership and recovery. |
| Performance | Same scenario/environment before and after, observed cost measure and limits; do not infer speed from code appearance. |
| Documentation/formatting | Review changed content/diff and appropriate direct lightweight checks. |

Record command/tool, scope/state, observed result and limitation. Report `passed`, `failed`, `not run` or `blocked`; a missing tool or target environment is not a pass. Fix demonstrated failures within the task's authorization and apply the main skill's Shared verification rule to reuse and reruns. Do not substitute type/lint/format evidence for behavioral evidence.
