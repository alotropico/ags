# Catalog

[Index](README.md) · [Configuration](configuration.md) · [Install a host](install-host.md)

`catalog.yaml` is the only list of AGS ids. Material outside the catalog is never installed. `ags skills list` prints ids, kinds, install classes, descriptions, and keywords from the checkout you are running.

Ids match `[a-z0-9]+(-[a-z0-9]+)*`, at most 64 characters, and are unique across rules and skills.

| Class | Meaning |
| --- | --- |
| `always` | Installed with every host. |
| `detected` | Installed when its `when` condition matches the project. |
| `opt-in` | Installed when you select it. |

Detected entries use `when.any` clauses: `package`, `lockFile`, `repoName`, `signal`, or `capability`. Signals are `git`, `git-remote`, `code`, `javascript`, `typescript`, `react`, `web-ui`, `stylesheets`, and `checks`. Capabilities are `skills`, `graphify`, `fallow`, `ast-grep`, and `intent`. Each entry may have a short `summary`, a single non-empty line of at most 100 characters, for installation rows.

Source detection uses tracked and non-ignored project files and excludes dependency and generated directories such as `node_modules`, `vendor`, `dist`, `build`, `coverage`, and `.tmp`. Framework dependencies also identify TypeScript, React, and web UI projects. Check detection requires an unambiguous recognized script name and excludes writing options. Git and tool detection are local; they perform no fetches or installations. Explicit disabled selections override recommendations. Installing a skill does not activate it outside its own task trigger.

`includes` lists companion skills. Companions attach to skills or to soft rules. Strong rules have no companions. Selecting a parent expands one closure. Companions stay out of the explicit `skills.enabled` list. A required child that is explicitly disabled fails before any write. The message names the parent and the enable or disable choices that would fix it. The picker and the plan show included companions. An independently selected child remains if you later remove its former parent. A deleted required child offers reviewed restore or ignore. Disable is not a valid choice for that child while its parent stays selected.

The groups below are the work the text assumes. Workflow rows apply in a host that never enables the TypeScript, React, CSS, or web rows.

## Always

| Id | Kind | What it covers |
| --- | --- | --- |
| `core` | strong rule | Every task: host facts win, local notes, evidence before "done", search. |
| `tmp-conventions` | soft rule | Creating, moving, or archiving files under `.tmp/`. |
| `workspace-operations` | soft rule | File moves, renames, copies, and optional navigation or indexing tools. |
| `ags-sweep` | skill | Review and archive temporary working files. |
| `plan-work` | skill | An execution procedure in `.tmp/plans/` for ambiguous, architectural, or risky work. |
| `write-commit-diff` | skill | Write a git diff under `.tmp/scratch/` instead of printing it. |
| `report-usage` | skill | Record a skill or action outcome when reporting is enabled. |

## Detected

| Id | When | Companions |
| --- | --- | --- |
| `ui-library-css` | `package.json` depends on `@platform/ui-library` | `css-authoring-conventions`, `css-theme-tokens` |
| `code-idioms` | JavaScript/TypeScript project | `typescript-react` |
| `state-topology` | Web UI project | — |
| `ownership-boundaries`, `async-state`, `resource-boundaries` | Source code present | — |
| `ags-graphify` | Graphify executable available | — |
| `css-authoring-conventions` | Stylesheets present | `css-cleanup` |
| `css-theme-tokens` | Stylesheets present | — |
| `git-cleanup`, `commit-granular`, `start-branch` | Git repository | — |
| `ship` | Git remote configured | `commit-granular`, `start-branch` |
| `check` | Recognized project check scripts | — |
| `react-state-transitions` | React project | — |
| `architecture-review`, `systematic-debugging` | Source code present | — |
| `typescript-react` | TypeScript or React project | — |
| `web-platform-first`, `web-accessibility` | Web UI project | — |

Use it when creating, editing, or reviewing that library's components or styles. Read its real types, props, style APIs, and tokens before adding local CSS.

## TypeScript, React, and client architecture

These are the craft defaults for the stack AGS is written for. `code-idioms` is the usual front door: it requires `typescript-react`. That companion covers backend TypeScript, React implementation, and a concrete client-cost investigation, and it loads only the reference the task needs.

| Id | Companions | What it covers |
| --- | --- | --- |
| `code-idioms` | `typescript-react` | Writing or reviewing code, including TypeScript and React idioms. |
| `typescript-react` | — | TypeScript types and utilities, React components and hooks, client cost when there is a demonstrated issue or an explicit request. |
| `state-topology` | — | Shared client state: stores, selectors, caches, URL, storage, data flow between features. |
| `ownership-boundaries` | — | Ownership, reuse, extraction, and contracts across components, hooks, services, or modules. |
| `async-state` | — | Async lifecycle, retries, cancellation, invalidation, overlapping work. |
| `resource-boundaries` | — | Services, API contracts, cached resources, normalization, invalidation, consumer error policy. |
| `react-state-transitions` | — | React state ownership, invariants, and effect-driven repair. Explicit review, plan, or refactor, or a demonstrated invalid intermediate paint. |
| `architecture-review` | — | Evidence-based review of ownership, async truth, resource lifecycle, reuse, and contracts. Report only, unless implementation is separately authorized. |

## CSS and web UI

| Id | Companions | What it covers |
| --- | --- | --- |
| `css-authoring-conventions` | `css-cleanup` | CSS and SCSS authoring, styling markup, and component style APIs (`theme`, `variant`, `size`). |
| `css-cleanup` | — | Unused selectors, variables, and redundant overrides. Reads `checks.type`, `checks.lint`, `checks.prettier`. Runs only when cleanup or an audit is requested. |
| `css-theme-tokens` | — | Theme tokens, including `@platform/ui-library` token facts, and replacing raw values. |
| `web-platform-first` | — | Semantic HTML, native interaction, layout, and CSS mechanisms for a web surface. |
| `web-accessibility` | — | Semantics, names, keyboard, focus, forms, dialogs, composites, and visual or motion accessibility on the interaction you change. |

## Git, checks, and planning

Specification and backlog workflows (`write-spec`, `manage-backlog`, and `spec-first-plan`) remain opt-in. Companions may also be selected independently, even when their detection condition does not match.

| Id | Companions | Settings | What it covers |
| --- | --- | --- | --- |
| `check` | — | `checks.type`, `checks.lint`, `checks.prettier` | Configured checks through the host package manager, or bounded behavioral evidence for the change. |
| `commit-granular` | — | — | A series of small commits when you ask to commit. |
| `start-branch` | — | `git.mainBranch`, `git.ticketPrefix` | A feature branch from the updated trunk, named from the ticket and a slug. |
| `ship` | `commit-granular`, `start-branch` | `git.mainBranch`, `git.ticketPrefix` | Branch, commits, push, and merge-request text when you ask to ship. |
| `git-cleanup` | — | `git.mainBranch` | Stale local branches, with confirmation before each destructive command. |
| `write-spec` | — | — | A normative specification. It stays a contract, not an implementation procedure. |
| `manage-backlog` | — | — | An inactive inventory of deferred work. |
| `spec-first-plan` | `write-spec`, `manage-backlog` | — | A specification, then a separate repository-grounded plan. Explicit requests only. |
| `systematic-debugging` | — | — | A falsifiable hypothesis for a reproducible bug or failing check, before a fix. |
| `ags-graphify` | — | — | Local Graphify tracing when a dependency graph helps. The Graphify executable has to be available. |

## Settings

Declared on the catalog. Install and update add the keys selected skills read, with defaults and comments.

| Key | Required | Default | Meaning |
| --- | --- | --- | --- |
| `git.mainBranch` | yes | — | Trunk branch feature branches start from and merge into. |
| `git.ticketPrefix` | no | empty | Prefix for ticket ids in branch names and merge-request titles. Empty means no ticket part. |
| `checks.type` | no | empty | `package.json` script that typechecks. Empty means not configured. |
| `checks.lint` | no | empty | `package.json` script that lints. Empty means not configured. |
| `checks.prettier` | no | empty | `package.json` script that checks formatting and does not write files. Empty means not configured. |

`checks.*` values are script names, not shell commands.

── ◈ ──

[Index](README.md)
