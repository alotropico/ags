---
description: Writing or reviewing TypeScript or React code.
---

# Code idioms

Craft defaults for TypeScript and React. Follow the examples rather than applying each line mechanically. Path aliases, libraries, folder layout and verification commands are repository facts: host guidance and the established style of the surrounding code win on them.

## Changes

- Touch only the lines the task needs. Trivial cleanups are fine on lines already being edited; no drive-by refactors, renames, or reordering of imports and object properties.
- Do not mix formatting-only changes with behavioral changes. Do not run a formatter or `lint --fix` over files the task does not touch unless the user asks.
- Delete dead code instead of commenting it out.
- A `TODO` cites a ticket or a plan; otherwise do the work, plan it, or drop the note.
- Validate at system boundaries: user input, HTTP, the file system, IPC. Trust internal calls and framework guarantees; no defensive null checks on internal paths.
- Soft cap of about 300 lines per file. Past it, extract cohesive pieces. An existing oversized file is exempt until a task substantially edits it.
- Before writing a utility, hook, helper or component, search the repository for an existing one. Add a dependency only after saying why the existing dependencies and the standard library cannot do the job, and let the package manager pick the latest version.
- Never commit `.env` files or other secrets.
- In legacy areas, make the smallest change, match the surrounding style, and import modern components rather than extending legacy patterns. Do not apply these idioms to legacy code the task does not edit.
- A change is done when the repository's verification passes. Use the `check` skill when it is installed.

## Component structure

```typescript
import { useState } from "react";

import { Button, TextField } from "../../components";
import { useProject } from "../hooks";
import style from "./style/ProjectForm.module.scss";

type Props = {
    onSave: (name: string) => void;
    projectId: string;
};

export function ProjectForm({ onSave, projectId }: Props) {
    const { data: project } = useProject(projectId);
    const [name, setName] = useState("");

    const handleSave = () => {
        onSave(name);
    };

    return (
        <div className={style.root}>
            <h2>{project?.name}</h2>
            <TextField label="Name" onChange={setName} value={name} />
            <Button onClick={handleSave}>Save</Button>
        </div>
    );
}
```

- Import groups: packages, then the repository's aliased modules, then relative paths. Use the repository's path aliases where it defines them and relative paths elsewhere.
- Combine imports from the same module. With the automatic JSX runtime, do not import React only for JSX. When no formatter decides line breaks, put an import of three or more names on one line per name.
- Inside a component: hooks, then handlers, then render.
- Prefer named exports for components and utilities.
- Keep rendering in components. Move reusable computation and workflow logic into hooks and utilities at the narrowest scope that uses them; pure helpers go in the repository's utilities folder or the feature's `utils/`.
- Use an options object when named arguments make a call clearer.

## Types

- Prefer `type` over `interface`.
- Prefer `string[]` and `Record<string, T>` where they fit.
- Prefer `Pick` and `Omit` when a type overlaps an existing one.
- Optional parameters and fields use `?`, not `| undefined`.
- Put defaults in destructuring, not in a trailing `??` after a field access.
- Prefer enums for finite discrete sets, such as lifecycle states or resource kinds.
- Existing loose typing is known debt. Do not add new `any`, and do not build workarounds around the old ones unless the task is about them.

## Callbacks and hooks

```typescript
// Destructure when only named fields are read
getText: ({ answer }) => answer ?? ""

// Destructure a hook's return when the object is not used as a whole
const { items, setItems } = useItemsStore();

// Rename at the source instead of adding an alias
const { data: models = [] } = useModels();
```

- Use `useCallback` or `useMemo` only when a measured cost, a dependency array or a memoized child needs a stable value.
- Collection and entity handlers take the full updated value (`onChange`), not a set of `onAdd` and `onDelete` callbacks.

## Feature composition hooks

When a screen needs digested data plus a few actions, prefer a feature-level composition hook. It reads the repository's data hooks, route parameters and owned stores or services, derives what the screen shows, and returns that with method-like actions. Components consume the result.

```typescript
function useOrdersFeature() {
    const { customerId } = useParams();
    const { data: orders = [] } = useOrders(customerId);
    const updateOrder = useUpdateOrder();

    const rows = toOrderRows(orders);

    const handleStatusChange = (id: string, enabled: boolean) => {
        updateOrder.mutate({ enabled, id });
    };

    return { handleStatusChange, rows };
}

function OrdersTable() {
    const { handleStatusChange, rows } = useOrdersFeature();

    return (/* render rows; call handleStatusChange on toggle */);
}
```

- A composition hook coordinates one owned workflow. It must not silently arbitrate between unrelated sources of truth merely to reduce prop count.
- It does not replace props at reusable boundaries: shared and presentational components stay prop-driven.

## State

1. Local `useState`: the default, including transient UI state such as the row being edited or focus.
2. Lift to the parent: only when a sibling needs it.
3. A client store, such as Zustand: cross-feature client state.
4. The query cache, such as React Query: server-sourced data.

- Never mirror server state into a store or local state; read it from the query hook wherever it is needed.
- Components do not call the network directly; they go through the repository's data hooks, stores or services.
- No prop drilling of data a component can read from a store, query, router or other hook. Reusable shared components are the exception: they stay store-agnostic and take data and callbacks through props.
- Ask before introducing a new React Context; prefer the existing store or query cache. Do not add `window` globals.
- Never mutate state in place.

## Derived state and effects

- Derive a value in render when it shares the component's lifecycle and is cheap. Do not store a copy with `useState` and `useEffect`.
- Use `useEffect` to synchronize with external systems: subscriptions, the DOM, timers, the network. Do not use it to transform data for render, to react to an event that belongs in the handler that caused it, or to chain state updates.
- A secondary representation, such as an edit buffer, form state, a debounced draft or a mirror across a boundary, is fine when it has its own lifecycle or interaction purpose. State its authority, synchronization direction, write boundary, reset rule and conflict policy.
- When shared state ownership or synchronization between features is involved, follow the `state-topology` rule when it is installed.

## Components and UI

- Reuse ladder, climbed in order: the repository's UI library if it has one, then its shared components, then the feature's components. Do not add a wrapper when an earlier rung already covers the need.
- Use a dedicated component over a raw `<button>`, `<input>`, `<select>` or `<a>`. When it cannot do the job, say why.
- Before inventing props or styles, read the component's type definitions and use its built-in props, such as variant, size or spacing. No inline styles. For stylesheets, classes and tokens, use the `css-authoring-conventions` skill when it is installed.
- Async views render explicit loading, error and empty states: no blank flashes, no silently swallowed failures, and loading does not freeze the rest of the UI.
- Interactive elements are keyboard-reachable and focusable, inputs have labels, and images have `alt`. Do not put click handlers on non-interactive elements when a button works.
- List keys are stable, never the array index when items can be reordered, inserted or removed. Virtualize or paginate lists that can grow into the hundreds.

## Tests

- When fixing a bug in an area with a test harness, add a regression test.
- Put tests where the repository's existing tests live. With no convention, colocate `*.test.ts` or `*.test.tsx` files beside the code.
