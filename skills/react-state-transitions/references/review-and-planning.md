# Review and planning

Read this after `SKILL.md` when classifying findings or writing a review or a plan. Do not load it for an already authorized, narrowly scoped implementation of a known invariant.

## Evidence rubric

A finding is actionable only after a trace backed by the current source.

### Trace every actionable finding

Record all of the following, or classify the item as a lead or an ambiguity instead:

1. **State authority and invariant:** who may create, select or revoke the value, and what must be true whenever render or consumers observe it.
2. **Initiating action or external event:** a user gesture, route change, subscription, timer, job completion, persistence hydration or other boundary event.
3. **Current transition:** the sequence of state writes, including effect and callback chains. Name the files and symbols. Quote only what the current source supports.
4. **Observability:** whether an intermediate state is actually observable, by whom (render, a child, a store subscriber, the URL, a test, an external system), and whether React batching, `useLayoutEffect` or a loading gate hides it from paint without removing the contradiction.
5. **Consequence:** a concrete correctness, UX, performance, race, testing or maintenance cost. "This looks messy" is not a consequence.
6. **Target model:** the smallest shape that removes the problem. See [refactoring-patterns.md](refactoring-patterns.md).
7. **Preserve:** the behavior and edge cases that must survive.
8. **Tests:** assertions that demonstrate the invariant, not that the current effect still runs.

### Three confidence scores

Keep these separate. Do not average them into one "high confidence bug".

| Score | Question | High only when |
|-------|----------|----------------|
| **Mechanism** | Does the traced sequence actually happen in this source? | The writes, dependencies and order are in the current files. |
| **Semantic** | Does an intermediate state violate intended product behavior? | Product intent is stated in code, tests or an explicit owner decision, not inferred from the mere presence of an effect. |
| **Priority** | Is the change worth doing now? | There is a demonstrated cost (wrong media, lost draft, stuck URL, race, untestable ordering) or a cheap local fix with a clear invariant. |

Unknown product intent is not a high-semantic-confidence correctness finding. Classify it as a decision or an ambiguity and list the evidence needed to resolve it.

### Observability

- A value that is representable but never read is maintenance debt, not a user-facing defect, until a consumer is shown.
- A loading, starting or waiting phase that is named and honored by the UI is often valid.
- `useLayoutEffect` can hide a frame from paint and still leave two authorities and a load-bearing effect order.
- Batching several setters in one event can be a sound transition. Keep those apart from "paint, then an effect repairs".

## Classification

Use one label per item:

| Label | Meaning |
|-------|---------|
| **Finding** | The mechanism is sourced; a semantic violation or a demonstrated maintenance trap is sourced; a smallest target exists. |
| **Product decision** | The mechanism is sourced; the right behavior is a product choice. Block implementation on the choice. |
| **Ambiguity** | The mechanism, observability or intent is not established. State what would resolve it. Do not invent a defect. |
| **Deferred structural** | Guards, tests or derivation already hide the failure; a larger ownership cleanup is optional. |
| **Downgraded or rejected** | The lead does not survive the source, a false-positive check or the consequence bar. |

When applying a prior audit, say whether each earlier item is promoted, blocked (needs a decision), deferred, downgraded or rejected. Do not keep an item's priority out of loyalty to the audit.

Include an adjacent concern only when it materially changes the target model, the sequencing, the regression risk or the tests. Label it **Adjacent consideration**. Do not turn the review into a general cleanup backlog.

## False-positive checks

Reject or downgrade a finding that rests on any of these mistakes:

- Treating every state setter inside an effect as a defect. External synchronization (DOM, media, IPC, subscriptions, timers, persistence, history, network, observers, background work) may update React state.
- Treating a legitimate loading or starting state as inherently invalid.
- Calling persistence normalization an internal atomicity problem without showing that reads depend on the write-back.
- Assuming a draft copied from props is broken without checking whether the form is unmounted or keyed on close, whether the prop can change while editing, and what product behavior is intended.
- Recommending another effect keyed by `open` or an entity id when that still produces one stale render of a previous draft.
- Recommending that every navigation path remember to clear stale state. Prefer state tagged with the identity it describes, or a model in which a mismatch is harmless.
- Deriving a safe public value while internal handlers still consume invalid raw state.
- Using `flushSync` to conceal an internal invariant problem.
- Adding a reducer, a state machine or a dependency only because the state is complicated. The target must make a demonstrated invariant clearer or impossible states unrepresentable.
- Moving state upward by default.
- Claiming that URL state and local state were made atomic because `navigate` and `setState` are called from the same function. Each store remains independently observable; name the authority and the valid local states during synchronization.

## Review report

A review report lets another agent reopen the same files without rediscovering the architecture. Include:

1. The bottom line: localized or systemic, and what is already sound.
2. The method: directories, searches, what was not run, and limitations.
3. A table of the classified items with mechanism, semantic and priority notes.
4. Detailed traces only for the items that survive the rubric.
5. The explicit product decisions and ambiguities.
6. The legitimate effects retained, so the next agent does not argue them again.
7. A recommended sequence, only as review advice and not as authorization to implement.

## Plan

A plan must be executable without rediscovering the architecture. Include:

1. **Decision summary:** change now, needs a product decision, defer, or remove or downgrade from prior evidence.
2. **Target invariants and authorities:** a compact map of the owners and valid states after the work.
3. **Ordered implementation stages:** grouped by shared invariant or owner, with unrelated URL, form, media, job and selection work kept apart and prerequisite product decisions placed before the implementation that depends on them.
4. **Work items**, each with: the current behavior and its evidence; the target invariant and state shape; files and symbols; concrete steps without a full patch; the preserve list; the tests and the assertion each proves; acceptance criteria; dependencies, risk and rollback; and what is explicitly out of scope.
5. **Product decisions:** in plain language, with the recommended option, the alternatives and their behavioral consequences. Do not bury them in implementation prose.
6. **Validation strategy:** targeted tests per stage, then the repository's type check, lint and broader checks (use the `check` skill when it is installed). Manual checks only for the surfaces actually changed.
7. **Deferred structural opportunities:** already guarded or unproven architecture work, kept apart from the committed stages.

## Generalized examples

These illustrate classification. Each stays a lead until it is sourced; do not hunt for them.

**Effect-driven gate (often a finding).** A local `play` flag defaults to true; an effect turns it off when the resource is too expensive. The first commit may mount the player. Target: derive the gate during render, and keep a user override tagged with the resource identity so that navigation invalidates it without a reset effect.

**Async job with a missing phase (a finding or a decision).** An event sets `running` with no job id; an effect starts the job. If the UI treats `running` as "a job exists", that state is invalid. An explicit `starting` phase can be valid. React state, the URL and the job runner still cannot be one transaction: define the authority at each boundary.

**Form draft from props (often a decision).** An effect copies entity props into local fields. Check unmount and key behavior, a refetch of the same id, and whether the form is visible before the data exists. Do not fix this with `useEffect(..., [open, entity.id])` if the first visible render still shows the previous draft. Prefer a keyed session, or initialize the draft in the open action.

**Derived versus stored pointer (often deferred).** Render already derives the authoritative id from the URL, while a store still holds a fallback index. Without an unguarded consumer or a demonstrated wrong result, this is structural debt, not a defect.

**Selection indices (a finding only if handlers use the raw value).** Filtering indices at render time is not enough if keyboard or click handlers still read the unclamped array. The authority is either clamped raw state or stable ids.

**Persistence write-back (usually a downgrade).** Render already uses `normalize(stored)`. An effect writes the normalized value back. That is optional cleanup unless the current run reads the write-back.
