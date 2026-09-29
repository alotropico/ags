---
description: Writing or reviewing code, including TypeScript and React idioms.
---

# Code idioms

Craft defaults for code. "Changes" applies to any code; the later sections are TypeScript and React idioms. Follow the examples rather than applying each line mechanically. Path aliases, libraries, folder layout and verification commands are repository facts, and the established style of the surrounding code wins on them as well.

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
- Keep rendering in components. Put reusable computation at the narrowest scope that uses it; follow `ownership-boundaries` when the task changes contracts or ownership.
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

## Architecture routing

- For shared client state, establish authority, readers, writers, lifecycle, and synchronization with `state-topology` when installed.
- For changed component, hook, or module ownership and contracts, follow `ownership-boundaries` when installed.
- For non-trivial asynchronous transitions, retries, cancellation, or stale work, follow `async-state` when installed.
- For service APIs, cached resources, normalization, and invalidation, follow `resource-boundaries` when installed.
- Never mutate state in place. Do not add a new React Context, application-wide store, query mechanism, or `window` global without architectural direction.

## Components and UI

- Reuse ladder, climbed in order: the repository's UI library if it has one, then its shared components, then the feature's components. Do not add a wrapper when an earlier rung already covers the need.
- Use a dedicated component over a raw `<button>`, `<input>`, `<select>` or `<a>`. When it cannot do the job, say why.
- Before inventing props or styles, read the component's type definitions and use its built-in props, such as variant, size or spacing. No inline styles. For stylesheets, classes and tokens, use the `css-authoring-conventions` skill when it is installed.
- Async views expose the states the product can meaningfully distinguish; use `async-state` for uncertain or overlapping workflows.
- Interactive elements are keyboard-reachable and focusable, inputs have labels, and images have `alt`. Do not put click handlers on non-interactive elements when a button works.
- List keys are stable, never the array index when items can be reordered, inserted or removed. Virtualize or paginate lists that can grow into the hundreds.

## Tests

- When fixing a bug in an area with a test harness, add a regression test.
- Put tests where the repository's existing tests live. With no convention, colocate `*.test.ts` or `*.test.tsx` files beside the code.
