---
description: Changing asynchronous state, retries, cancellation, invalidation, or overlapping operations.
---

# Async state

Apply this rule when a task changes an asynchronous workflow or a transition whose result may be stale, overlapping, cancelled, or uncertain. A routine awaited call with no state or authority question is not enough.

## Model truth and actions

- Name valid states from externally meaningful truth and permitted actions, not one state per callback or awaited implementation step.
- Preserve phases such as `starting`, `running`, and `verifying` when they imply different certainty or safe actions; merge phases the product cannot meaningfully distinguish.
- Keep known success, known failure, and indeterminate outcome distinct. Do not invent certainty to simplify UI state.
- Before changing a non-trivial workflow, map each observable outcome to what it proves, what remains unknown, and which next actions are safe.
- A retry repeats the operation that resolves the remaining uncertainty. Do not repeat a mutation that may already have succeeded when verification is the unresolved step.

## Guard transitions

- Represent mutually dependent facts as one valid state when independent fields permit impossible combinations.
- Treat stale or superseded work as having lost authority; its completion must not overwrite the current identity or state.
- Use a synchronous event guard when another event can arrive before rendered disabled state updates, and keep rendered state consistent with the guard.
- Prefer structured cancellation tied to cleanup. Use explicit operation identities when uncancellable workflows may overlap.
- Effects synchronize a mounted identity with an external system. Do not use an effect to derive render state or manufacture a callback for an event that already has an owner.
- A function called only by one effect is not automatically a useful abstraction; inline it when that makes the trigger, cleanup, dependencies, and authority easier to inspect.
- If a reload is a named user or domain action, initiate it there. When a resource layer exists, express automatic reload through identity and invalidation rather than feature-local cache machinery.

Ask for product direction when safe behavior depends on an unknown outcome or when a proposed change would alter established error, retry, or cancellation semantics.
