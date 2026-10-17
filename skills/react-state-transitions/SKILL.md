---
name: react-state-transitions
description: Audit React state ownership, invariants and effect-driven repair of internal contradictions. Use when the user explicitly asks to review, plan or refactor React state or effect architecture, or when a demonstrated transition paints an invalid intermediate state. Do not use for ordinary component work that merely contains an effect, a loading flag or a form field.
---

# React state transitions

Review, plan and, only when explicitly authorized, implement React state refactors so that every value exposed to render or to consumers satisfies a clear invariant, and every transition moves from one valid state to another.

This is not a generic "remove `useEffect`" checklist.

## Trigger boundary

**Apply** when the user asks to review, plan or refactor React state ownership, effect-driven repair, impossible combinations, stale async results, or unclear authority across components, hooks, stores, URL state and external systems, or when the user demonstrates a transition that repairs an internal contradiction after paint.

**Do not apply** to ordinary React changes that happen to contain an effect, a loading flag, a form field or a derived display value. This review is for requested or demonstrated transition problems, not for every file that touches `useEffect`.

## Core model

- Each state exposed to render and to application consumers should satisfy a clear invariant.
- A transition should move from one valid state to another. It should not depend on post-render effects to repair an internal contradiction.
- Multi-stage asynchronous workflows are valid when stages such as `idle`, `starting`, `running`, `completed` and `failed` are modeled explicitly. Atomicity does not mean pretending asynchronous work has no phases.
- React cannot make React state, the browser URL, a desktop shell or IPC peer, persistence and a background job transactionally atomic. The relevant question is which system is authoritative and whether each locally observable state stays valid while synchronization occurs.
- Effects are appropriate for synchronizing with external systems: DOM and media APIs, IPC, subscriptions, timers, persistence, browser history, network activity, observers and background processes.
- External events and asynchronous completions may legitimately update React state, but each should produce one coherent transition and handle identity, cancellation, staleness, cleanup and ordering.
- A controlled child emitting `onChange`, `onSelect` or another semantic user intent is normal. A child observing inconsistent parent state and correcting it afterward is a likely ownership smell.
- React batching can hide an intermediate representation but does not prove that the state model is sound. Conversely, several setters in one synchronous event are not automatically defective.
- `useLayoutEffect` may hide an invalid frame from paint, but it can still leave ownership and effect ordering load-bearing.

## Modes

Choose the mode from the user's request, not from the fact that this skill was invoked.

| Mode | Allowed work | Forbidden |
|------|--------------|-----------|
| **Review** | Inspect, classify and report | Application code changes |
| **Plan** | Validate findings and produce an executable plan | Implementation |
| **Implement** | Change code, only when the user explicitly asked to implement | Expanding a review or plan request into a refactor |

Invoking this skill does not authorize implementation. "Review this" and "plan this" stay read-only for application code. Implement only when the user explicitly asks to change the code.

If the request mixes modes, do the authorized part and stop. Do not treat a plan as permission to patch.

## Workflow

1. Confirm the mode and the authorization. Preserve existing user changes in every worktree you touch.
2. Identify candidate flows from the request, prior audits and targeted searches. Search hits and prior audits are leads and candidate inventories, not findings.
3. Reopen the relevant source before relying on reported line numbers, symbol names or earlier conclusions. Trace across components, hooks, reducers, stores, URL state and external boundaries.
4. For each candidate, keep three judgments apart: **mechanism confidence** (does the traced sequence happen?), **semantic confidence** (does an intermediate state violate intended product behavior?) and **priority** (the demonstrated consequence and the value of changing it).
5. Classify each candidate as a finding, a product decision, an ambiguity, deferred structural work, or downgraded or rejected. Unknown product intent is a decision or an ambiguity, not a high-confidence correctness defect.
6. Read [references/review-and-planning.md](references/review-and-planning.md) for the evidence rubric, the classification procedure, the report and plan contents, and the false-positive checks.
7. Read [references/refactoring-patterns.md](references/refactoring-patterns.md) when proposing a target model. Prefer the smallest change that makes the invariant hold.
8. In Review, emit the report and stop. In Plan, emit an executable plan and stop. In Implement, change only the authorized surface, preserve behavior, and add tests that prove the invariant.

## Scope

- Do not introduce a new state-machine library unless the user asked for one.
- Reuse existing reducers, stores and routers when they already express the target invariant.
- Place state at the narrowest owner that can enforce the invariant. Do not lift state by default.
- Keep unrelated URL, form, media, job and selection work in separate stages or changes unless they share one invariant.
