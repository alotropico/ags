# AI code quality proto-rules

Status: exploratory source material for `docs/v3-spec.md`, not active guidance. Nothing in this file activates a review, widens a task, or overrides the specification's task-local scope. The V3 specification governs how these concepts are tested, partitioned, deferred, or removed.

These rules describe preferred directions, not automatic violations. Repository evidence and concrete lifecycle requirements may justify exceptions. When an exception is made, the agent should identify the competing concern rather than silently ignoring the rule.

## Ownership and boundaries

1. **Put each state, constant, derived value, and side effect in the narrowest component, hook, service, or module that can own it correctly; pass across boundaries only what the receiver cannot obtain or decide for itself.**

2. **Let a consumer obtain broad shared context directly when that context is already authoritative and safely available there; do not relay it through intermediate components merely to preserve a top-down shape.**

3. **Keep consumer-specific policy, copy, presentation mapping, and interaction state beside the consumer; move only stable domain or resource semantics upward.**

4. **A split is justified when each resulting unit gains a coherent owner and reason to change, and the interface between units is smaller and more meaningful than the details separated.**

5. **Do not split code into sequential fragments merely to satisfy a line count; extract around responsibility, lifecycle, policy, or independently meaningful behavior.**

6. **Do not conceal prop drilling or mixed ownership inside a controller object, options bag, context, or wrapper type that preserves the same oversized contract.**

7. **A hook should expose what its consumer can observe and do, not every value the hook happens to know or derive internally.**

## State and asynchronous truth

8. **Represent mutually dependent UI and async facts as explicit valid states with atomic, guarded transitions, so impossible combinations are not independently expressible.**

9. **Model application state from externally meaningful truths and permitted user actions, not directly from requests, callbacks, or implementation phases.**

10. **Use one state for each distinct combination of known truth and safe actions—not one state for every awaited operation.**

11. **Merge internal phases when the UI cannot meaningfully distinguish them; preserve separate states when merging would lose certainty or enable a different action.**

12. **Do not collapse an indeterminate outcome into success or failure merely to simplify the state model.**

13. **Before designing a non-trivial async workflow, map each observable outcome to what it proves, what remains unknown, and which next actions are safe.**

14. **A retry must repeat the operation that resolves the remaining uncertainty; do not repeat a mutation when verification alone is unresolved.**

15. **Treat stale or superseded async work as having lost authority over current UI state, and make its completion a no-op.**

16. **Use a synchronous guard when a second event can arrive before rendered disabled state catches up; keep the rendered state consistent with that guard.**

## Effects, cancellation, and resource lifecycle

17. **Use effects to synchronize a mounted UI identity with an external system; do not use them to derive local state or manufacture lifecycle callbacks.**

18. **Prefer structured cancellation tied to effect cleanup over mutable generation counters; introduce explicit operation identities only when multiple uncancellable workflows may overlap.**

19. **If every reload corresponds to a named user or domain action, initiate it from that action and model its operation identity explicitly rather than indirectly through an effect.**

20. **Express reload conditions as resource identity and invalidation rules when a resource layer exists; components should observe the current resource rather than independently implement caching, cancellation, freshness, and deduplication.**

21. **Do not build a feature-local imitation of a query framework merely to remove a small effect; accept local lifecycle code until repeated needs justify a shared resource layer.**

22. **A function called only by one effect is not automatically an abstraction; inline it when doing so makes trigger, cleanup, dependencies, and authority easier to inspect.**

## Service, resource, and presentation layers

23. **Services own asynchronous I/O mechanics, endpoint contracts, response validation, cancellation support, and domain-invariant normalization.**

24. **Resource layers own resource identity, cached state, freshness, deduplication, cancellation, invalidation, and observation when the application has such a layer.**

25. **Features own selection, feature policy, interaction state, messages, controls, and presentation-specific derivation.**

26. **Acquire, normalize, and preserve data semantics at the highest stable domain boundary; observe the resource at the lowest consumer that needs it; derive presentation at the lowest owner with the necessary UI context.**

27. **Place each transformation at the highest layer where it remains universally true: transport decoding and domain invariants high, consumer policy at the feature boundary, and visual mapping beside the UI.**

28. **Do not make every feature independently implement query identity, cancellation, caching, invalidation, and stale-result protection when those have become repeated application-wide resource concerns.**

29. **Do not move resource lifecycle into an API service if doing so makes the service stateful, consumer-aware, or implicitly coupled to a UI session.**

## Reuse and extraction

30. **When existing code almost serves another consumer, do not widen it with modes; extract the smallest coherent capability both consumers need in essentially the same form, and leave differing policy, state, and composition on their respective sides.**

31. **Search for reuse below the level of named hooks and components by decomposing candidates according to concern, state ownership, lifecycle, and policy.**

32. **Reuse or extract only where behavior, ownership, and lifecycle genuinely align; otherwise prefer a small feature-local implementation over a generic abstraction built from superficial similarity.**

33. **A shared unit should become clearer as consumers are separated from it; if reuse requires accumulating flags, optional props, branches, or modes, the shared boundary is probably wrong.**

34. **Judge an extraction by whether the shared unit has one coherent reason to change, not by the number of duplicated lines it removes.**

35. **Before repurposing an existing hook or component, identify which responsibilities are invariant and extract those; do not make the original unit impersonate multiple consumers.**

36. **Prefer a small stable center with explicit, independently coherent consumers over maximal reuse.**

37. **Compatibility may justify temporary duplication, but it does not turn duplication into architecture; name the compromise, identify the intended contract, and bound its lifetime.**

## API shape and behavioral variation

38. **When consumers need different policies for the same operation, use a named option when endpoint, result, transformation, and lifecycle remain the same; create separate methods only for genuinely different contracts.**

39. **Do not encode one behavioral dimension in sibling method names such as `OrThrow`, `Safe`, `Raw`, or `Advanced` when an explicit option preserves one coherent implementation.**

40. **When a sibling API is proposed, inspect whether the original operation fused mechanism with consumer policy before expanding the public surface.**

41. **Service and data-access APIs should preserve distinctions present in the underlying operation unless fail-soft behavior is an intentional and explicit part of the selected policy.**

42. **A valid empty result and a failed request are different facts even when a particular consumer deliberately renders both as empty.**

43. **Prefer an options object over positional booleans when an operation has optional behavioral policy.**

44. **Do not introduce an options object merely to disguise unrelated operations behind one method.**

## React components and hooks

45. **Keep lifecycle boundaries explicit: conditional mounting is appropriate when each opening or identity should create a fresh session.**

46. **Let field components own field-specific mapping, labels, empty presentation, and event guards; keep cross-field coordination in their nearest common owner.**

47. **Do not import shared feature policy from a child presentation component; move genuinely shared policy to a neutral feature-local owner.**

48. **When several nullable values are meaningful only together, derive one coherent value representing the valid combination and use it as the source for downstream decisions.**

49. **Do not move state upward merely because two descendants need related information; first determine whether they need one shared fact or two independently owned analogues.**

50. **Do not call the same custom hook in multiple components unless multiple independent instances are intended or the hook observes an external shared resource.**

51. **Keep synchronous event protection close to the event boundary, but keep the underlying invariant guarded again at the operation boundary when correctness requires defense in depth.**

## Diagnostic signals, not hard limits

These optional signals apply only when a requested review or refactor covers the unit, or when a signal is relevant to the current defect. They do not activate architecture review during an ordinary task. Crossing a signal within that authorized scope invites inspection, not automatic extraction.

| Measure | Review signal | Strong signal | Primary question |
| --- | ---: | ---: | --- |
| Source file | 250–350 lines | 500+ lines | Are several responsibilities or lifecycles present? |
| Function or hook | 40–60 lines | 100+ lines | Are multiple phases or abstraction levels mixed? |
| React component | 100–150 lines | 250+ lines | Is orchestration mixed with independently meaningful UI regions? |
| Component props | 7–9 | 12+ | Are values derived, relayed, or owned at the wrong level? |
| Function parameters | 4 | 6+ | Is there a coherent input concept or more than one operation? |
| Hook return members | 6–8 | 10+ | Is the hook exposing internals or acting as a feature container? |
| Related local state values | 4 | 6+ | Do independent values encode coupled valid states? |
| Interacting booleans | 2–3 | 4+ | Are hidden modes or impossible combinations emerging? |
| Effects in one owner | 3 | 5+ | Are several external synchronization lifecycles mixed? |
| Direct exports | 5–7 | 10+ | Is the module becoming a grab bag? |
| Imports | 12–15 | 20+ | How many conceptual layers and collaborators are involved? |
| Meaningful branches | 6–8 | 12+ | Are several policies, modes, or state machines hidden together? |

Exclude generated code, declarations, fixtures, static data, and deliberate re-export barrels from mechanical counting. Count conceptual dependencies more heavily than syntax-only imports.

## Required response to a signal

When a signal is relevant within an authorized review, refactor, or defect investigation:

1. Inventory state, effects, dependencies, derived values, UI regions, policies, and reasons to change.
2. Identify the smallest coherent owners already present in the behavior.
3. Propose boundaries before moving code.
4. Compare the contract before and after the proposed split.
5. Reject the split if it only relocates lines or preserves the same oversized communication surface.

## Review questions

- Did any contract shrink?
- Did ownership become clearer?
- Did either side lose dependencies it no longer needs?
- Did impossible state become harder to express?
- Can either side evolve without adding a mode to the other?
- Does the shared part have one coherent reason to change?
- Are state names describing meaningful truths rather than implementation steps?
- Does every error, success, and unknown outcome correspond to available evidence?
- Does Retry resolve uncertainty without repeating an operation that may already have succeeded?
- Would recombining the proposed units simplify their data flow? If so, was the split merely cosmetic?

## Stop conditions for autonomous refactoring

Stop and request architectural direction when a proposed improvement would require:

- Changing established behavior or error semantics.
- Adding a new application-wide state, resource, or query mechanism.
- Expanding an existing shared component or hook with consumer-selecting modes.
- Changing several consumers to establish a new canonical service contract.
- Introducing a generic abstraction without at least two verified compatible consumers.
- Resolving an indeterminate external outcome through an invented assumption.
- Trading a known local imperfection for a substantially larger migration.
