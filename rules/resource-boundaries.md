---
description: Changing services, API contracts, cached resources, normalization, invalidation, or consumer error policy.
---

# Resource boundaries

Apply this rule when a task moves or changes I/O, data normalization, cache/resource lifecycle, or the policy exposed by a service API. Local UI state and presentation-only mapping are outside it.

## Layer ownership

- Services own I/O mechanics, endpoint contracts, response validation, cancellation support, and domain-invariant normalization.
- A resource layer, when the application has one, owns identity, cache, freshness, deduplication, invalidation, cancellation, stale-result protection, and observation.
- Features own selection, interaction state, messages, controls, and presentation policy.
- Acquire and preserve semantics at the highest layer where they are universally true; observe at the lowest consumer that needs the resource; derive presentation beside the UI context that decides it.
- Do not make a service stateful or UI-session-aware to hide resource lifecycle, and do not build a feature-local query framework merely to remove a small lifecycle effect.

## API policy

- Preserve distinctions the operation exposes. A valid empty result and a failed request remain different facts even when one consumer renders both as empty.
- Use a named option when consumers vary one policy but endpoint, result, transformation, and lifecycle remain one operation. Prefer an options object to positional booleans.
- Create separate methods for genuinely different contracts. Do not disguise unrelated operations behind options or encode one policy dimension in sibling names such as `Safe`, `Raw`, or `OrThrow`.
- Before widening an API, identify whether the current operation has fused transport mechanism with consumer policy.

Repository framework choice, aliases, endpoints, and browser or product policy remain host facts. Ask before establishing a new shared resource mechanism or changing public error semantics across consumers.
