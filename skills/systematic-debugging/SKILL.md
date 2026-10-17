---
name: systematic-debugging
description: Investigate a reproducible bug, failing check, unexpected behavior or a specific debugging request by testing a falsifiable hypothesis before fixing the demonstrated cause. Excludes normal successful implementation and cosmetic changes.
---

# Systematic debugging

1. Capture observed failure, expected behavior, inputs, environment and the smallest reliable reproduction. For intermittent failures, record conditions/evidence instead of claiming reproduction.
2. Trace the failing path to its relevant state/resource boundary. Inspect callers, data, lifecycle, cancellation and recent changes as needed.
3. State one falsifiable hypothesis and the observation that distinguishes it from the main alternative.
4. Run the smallest discriminating test or temporary instrumentation. If evidence rejects the hypothesis, revise the model before adding a fix. Remove temporary instrumentation unless durable observability is requested.
5. Fix the demonstrated cause with the smallest maintained change within authorization. Avoid stacking speculative patches.
6. Verify the original reproduction, relevant neighboring behavior and a meaningful regression test when the host has a suitable harness. Follow existing test placement and report what ran and remaining uncertainty.

For applicable async failures, use installed `async-state`, resource or state-transition guidance. A read-only investigation stays read-only. Do not require worktrees, TDD scaffolding, fixed attempt counts, subagents, new services, broad discovery scans or the full suite after every small investigation.
