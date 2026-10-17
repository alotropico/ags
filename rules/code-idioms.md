---
description: Writing or reviewing code, including TypeScript and React idioms.
---

# Code idioms

Craft defaults for code. "Changes" applies to any code; domain-specific defaults are in the required TypeScript/React companion. Follow the examples rather than applying each line mechanically. Path aliases, libraries, folder layout and verification commands are repository facts, and the established style of the surrounding code wins on them as well.

Apply Changes, Tests, and Architecture routing to the code the task touches. Read the [TypeScript and React companion](../skills/typescript-react/SKILL.md) only for work in those domains, including backend TypeScript; it routes only the applicable reference and does not authorize changes to other code.

## Changes

- Touch only the lines the task needs. Trivial cleanups are fine on lines already being edited; no drive-by refactors, renames, or reordering of imports and object properties.
- Do not mix formatting-only changes with behavioral changes. Do not run a formatter or `lint --fix` over files the task does not touch unless the user asks.
- Delete dead code instead of commenting it out.
- A `TODO` cites a ticket or a plan; otherwise do the work, plan it, or drop the note.
- Validate at system boundaries: user input, HTTP, the file system, IPC. Trust internal calls and framework guarantees; no defensive null checks on internal paths.
- A source file around 300 lines may deserve inspection when the task already changes it substantially. Size is not a violation: extract only when the work exposes coherent owners or lifecycles and the new contract is meaningfully smaller.
- Before writing a utility, hook, helper or component, search the repository for an existing one. Add a dependency only after saying why the existing dependencies and the standard library cannot do the job, and let the package manager pick the latest version.
- Never commit `.env` files or other secrets.
- In legacy areas, make the smallest change, match the surrounding style, and import modern components rather than extending legacy patterns. Do not apply these idioms to legacy code the task does not edit.
- Prefer the smallest implementation that satisfies the requirement while preserving correctness and maintainability. Add abstraction or machinery only for a concrete need.

## Tests

- When fixing a bug in an area with a test harness, add a regression test.
- Put tests where the repository's existing tests live. With no convention, colocate `*.test.ts` or `*.test.tsx` files beside the code.

## Architecture routing

- For shared client state, establish authority, readers, writers, lifecycle, and synchronization with `state-topology` when installed.
- For changed component, hook, or module ownership and contracts, follow `ownership-boundaries` when installed.
- For non-trivial asynchronous transitions, retries, cancellation, or stale work, follow `async-state` when installed.
- For service APIs, cached resources, normalization, and invalidation, follow `resource-boundaries` when installed.
- Never mutate state in place. Do not add a new React Context, application-wide store, query mechanism, or `window` global without architectural direction.
- For React state-transition or invariant problems, use `react-state-transitions` when installed; do not treat it as general React guidance.

## Accessibility baseline

- Interactive elements are keyboard-reachable and focusable, inputs have labels, and images have `alt`. Do not put click handlers on non-interactive elements when a button works.
