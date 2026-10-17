---
description: Changing shared client state, such as stores, selectors, caches, URL or storage state, or data flow between features.
---

# State topology

Before writing code that changes shared client state, answer the questions below for each fact the change touches. Shared client state includes URL state, stores, query caches, local and session storage, cookies, and any fact represented in more than one place, such as a hook, a window global, a message payload or a persisted copy. Trivial local UI state inside a single component is out of scope.

Link to the repository's existing documentation rather than restating it.

## Labels

Each answer carries one label:

- `fact`: verified directly in the repository's code or configuration.
- `policy`: an explicit architectural decision the repository has adopted.
- `inference`: a reasoned conclusion that code or runtime evidence does not establish directly.
- `unresolved`: needs investigation, or a human or runtime checkpoint.

## The fifteen fields

1. **Conceptual fact:** the human or business meaning of the value.
2. **Authoritative owner:** who may mint, select or revoke the truth.
3. **Authoritative representation:** the in-process symbol that is the supported read path.
4. **Secondary representations:** caches, mirrors, edit buffers, storage, cookies, window globals or message payloads.
5. **Writers:** every call site that changes the authoritative or a secondary form.
6. **Important readers:** the gates, views, services, interceptors or frames that branch on it.
7. **Lifecycle:** whether it is scoped to a render, a route, a page load, a session, a device, a document version or a request.
8. **Persistence:** which media survive a reload, and who owns each medium.
9. **Hydration order:** what is read first, and what a reader sees before the first write.
10. **Invalidation:** the event that clears, expires or recomputes it.
11. **Sync direction:** one-way or bidirectional between representations.
12. **Conflict arbiter:** which representation wins when they disagree, and where that is coded.
13. **Recovery:** what happens on a fetch failure, an authorization failure, an empty state or interrupted persistence.
14. **Defects:** known traps, each labelled accurately.
15. **Agent must know:** the one-line rule or policy that prevents the common failure.

End the record with one reusable question that generalizes it to similar facts.

## Method

1. Name the fact in one sentence.
2. Find the writers first, then the readers. Search for setters, store creation, route writes, persistence calls and query-cache writes.
3. List every representation. A second representation is not a defect by itself, but it needs a distinct lifecycle or boundary purpose.
4. For every secondary representation, state its sync direction, write boundary, invalidation or reset rule, and disposal condition.
5. State precedence at boot. If the code does not state it, label it `inference` or `unresolved`.
6. Keep dependencies explicit. Props are valid architecture at reusable and feature boundaries.
7. Cap ownership. A composition hook may coordinate one owned workflow; it must not silently arbitrate unrelated authorities just to reduce props or move code out of JSX.
8. Do not invent runtime outcomes. Behavior that needs a running app, such as module identity or UI behavior, stays `unresolved` until evidence is recorded.

If a change would add another writer or authority for a fact without naming its arbiter, stop and update that fact's record first.

## Counter-examples

- **Two read paths.** New components read a value through a hook while older code reads a window global. Treating the global as the supported API causes drift and invites more globals; name the hook as the authoritative representation and the global as a secondary one.
- **A hook that arbitrates.** One navigation hook derives the selected item from URL, then storage, then a default; writes permissions into a user store; and mirrors the selection into storage and a second store. When the URL owns the selection, the permissions are downstream of it and must not choose it, and each mirror needs its own sync direction and disposal.
- **A mirror store.** A session store copies facts the URL already owns and then disagrees with it after navigation. Read the URL instead of mirroring it.

## Records

Fill a record only when the evidence supports it; leave out fields you would have to guess. A filled record names the commit it was last verified against. Records are repository facts: keep them in the host's `.agents/local/`, for example `.agents/local/state/`, and link them from a host rule that also holds the repository's scope list and examples.
