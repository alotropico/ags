# Refactoring patterns

Decision tools for a target model. Use the smallest pattern that makes a demonstrated invariant hold or makes illegal states unrepresentable. Do not apply a pattern because the state is complicated.

Read this when proposing a shape in Plan or Implement mode. Skip it when the review has no surviving findings.

## Choose a pattern

Ask, in order:

1. Can render derive a valid view from authoritative state without storing a copy?
2. Can one event or domain action perform the full internal transition?
3. Is the missing piece an explicit async phase rather than a hidden repair?
4. Must coupled fields move together as a discriminated union or a reducer?
5. Is identity missing, so that the value describes the wrong resource after navigation?
6. Is this really external synchronization, with one coherent callback into React?

If none of these applies, the lead is probably not a state-transition problem.

## Patterns

### Pure render-time derivation

Store the source of truth; compute display values, clamped indices, "too expensive", effective scope and similar views during render.

Use it when the illegal combination is only a view of otherwise valid fields. Do not store the derived copy unless an identity or a subscription requires it.

Preserve: the derived value must be the one that handlers use, not only the one passed to children. A safe public prop with invalid raw state still read in event handlers is not a fix.

### One event, full internal transition

In the initiating handler, write every internal field that must change together.

Use it when the current split is "set partial state now, an effect fills in the rest". External I/O may still happen in an effect or an async function; the React representation after the handler, or after a single `dispatch`, should already be a valid phase.

Several setters in one synchronous event are not automatically wrong. One `dispatch` is useful when fields are coupled, not because several `setState` calls exist.

### Reducer or discriminated union

Use it when lifecycle fields permit impossible combinations (`running` with no job id, `success` with no result, a draft with no entity id) and the current ad hoc flags keep reproducing them.

Prefer growing a phase or a tag in the existing reducer or store over adding a new one.

### Explicit valid asynchronous phases

`idle`, then `starting`, then `running`, then `completed` or `failed` (names may differ) are valid states. Atomicity does not mean hiding in-flight work.

Use them when the product needs to show that a request was accepted but the job does not exist yet, to disable Stop, or to ignore stale completions.

Do not use a fake loaded draft as a stand-in for "unloaded". If the editor is not ready, do not paint an editable empty entity.

### Functional state updates

Use `setState(prev => ...)`, or the reducer's current state, when the next value depends on the previous representation and events can overlap.

Use them for toggles, identity-preserving patches and stale-closure risks. They are not a substitute for tagging state with the resource identity.

### Identity-tagged state

Prefer `{ sourceId, progress }`, `{ fileId, frame }` or `forcedPlayFileId` over a boolean plus the hope that every navigation path clears it.

Use it when a value is meaningless for any resource except the one that produced it. After navigation, derivation yields "no override" or "no progress" without a reset effect and without listing every place that must clear it.

A mismatch should be harmless: render and handlers ignore tags that do not match the current id.

### Keyed or newly mounted session

Mount the form, modal body or editor session with a key (the open cycle, the entity id or a session token) so that `useState(initial)` runs for that entity. Alternatively, assign the draft in the owner's open action before the session is visible.

Use it instead of `useEffect(() => setDraft(entity), [open, entity.id])` when that effect still lets one stale render through.

Decide the behavior on a refetch of the same id deliberately: either keep the in-progress draft (usual while editing) or document that a refetch starts a new session.

Do not key an expensive subtree on an unrelated prop in a way that resets local navigation whenever that prop changes.

### Controlled children, owner transition

Children emit semantic intent (`onChange`, `onSelect`, `onSubmit`). The owner applies the invariant.

Use it when a child currently watches parent props and writes back a correction. That is ownership leaking downward.

A child that is fully controlled and holds no competing copy is already in this shape.

### Single authority, derived adapters

One owner (the URL, a store, a query cache or a reducer). Indices, parallel ids, search parameters and projections are adapters or render views.

Use it when two writable representations drift and both are treated as the source of truth.

During synchronization, each locally observable state should stay valid for its own consumers; for example, the URL already names the resource while the local UI shows `starting` until the job id exists.

### External synchronization effect

Keep the effect. Its event callback should dispatch one coherent internal transition, including identity, cancellation and ignoring stale results. Cleanup must drop in-flight work.

Use it for DOM and media APIs, IPC, subscriptions, timers, persistence hydration, history, network, observers and background processes.

A setter in that callback is not a defect. A second effect that exists only to make the first effect's state legal usually is.

## Anti-patterns in a target design

- Reset effects keyed by `open` or an id that still paint the previous draft.
- Checklists of "every path must clear this boolean".
- `flushSync` to hide an illegal commit.
- New libraries or state machines that make no illegal state newly unrepresentable.
- Lifting state to a common parent that cannot enforce the invariant.
- Treating `navigate()` and `setState()` in one function as atomic across stores.
- Replacing a real `starting` or `loading` phase with a claim that the work is already complete.

## Implement mode

When, and only when, the user explicitly asked to implement:

1. Change one stage or invariant at a time.
2. Preserve the listed edge cases.
3. Add or adjust tests that fail if the illegal intermediate state returns.
4. Run the repository's targeted tests for the touched surface, then its type check and lint (use the `check` skill when it is installed).
5. Stop. Do not continue into deferred structural work or a neighboring cleanup.
