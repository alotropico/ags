---
description: Changing ownership, reuse, extraction, or contracts across components, hooks, services, or modules.
---

# Ownership boundaries

Apply this rule when a task changes who owns state, policy, effects, presentation, or a reusable capability. Do not invoke it merely because a file is long or two snippets look alike.

## Place responsibility

- Put a fact, policy, effect, constant, and presentation mapping with the narrowest owner that can decide it correctly.
- Pass only what the receiver cannot obtain or decide from an already-authoritative source. Do not disguise the same oversized contract as an options bag, controller, context, or wrapper.
- Keep consumer policy and interaction state beside the consumer. Move only stable domain or resource semantics upward.
- Shared descendants do not automatically need lifted state: decide whether they consume one fact or independently owned analogues.
- A hook or component exposes what consumers can observe and do, not every value it knows internally.
- Calling a stateful custom hook in several components creates several instances unless it observes an external shared resource; verify that this is intended.

## Extract and reuse

- Extract around one responsibility, lifecycle, policy, or independently meaningful behavior. The resulting owners should have clearer reasons to change and a smaller contract than the details separated.
- Compare the boundary before and after: inputs, outputs, authorities, dependencies, writers, and lifecycle. Reject a split that only relocates lines or preserves the same communication surface.
- Reuse only where behavior, ownership, and lifecycle align. Prefer bounded feature-local duplication over a generic abstraction assembled from superficial similarity.
- When existing code almost fits, extract the smallest stable capability both consumers need. Leave their differing policy, state, and composition on their own sides.
- Accumulating flags, optional props, branches, or modes is evidence that consumers may not share a coherent boundary.

## Stop conditions

Ask for direction before changing established behavior, creating a new application-wide owner, changing several consumers to establish a canonical contract, or introducing a generic abstraction without two verified compatible consumers.
