# V2 to V3 transformation manifest

Status: frozen migration authority for AGS V3. The machine-readable admission declaration is `migrations/2-to-3.json`.

V3 deliberately retains every V2 id. There are no rename, removal, split, or merge transforms, so host selections, ignored/promoted records, and `.agents/local/<id>.md` notes keep their ids and paths. Rewritten selected material is classified against the installed V2 release exactly like a same-major update; host edits still require an explicit decision. New ids use normal collision checks before any write.

All retained rows support source releases `2.0.0`, `2.0.1`, `2.1.0`, `2.1.1`, and `2.1.2` when the id exists in that source release. `Retain` preserves content; `Rewrite` preserves capability and trigger but replaces released wording; `Add` has no source path.

| Source id/path | Result | V3 id/path | Selection transform | Record transform | Host-note transform | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| `core` / generated block | Rewrite | `core` / generated block | Always selected; regenerate block | Not applicable | Not applicable | Add task-local scope while retaining precedence, settings, managed ownership, refinements, and reporting |
| `tmp-conventions` / `.agents/rules/tmp-conventions.md` | Retain | Same | Preserve | Preserve same-path records | Preserve `.agents/local/tmp-conventions.md` if present | Unchanged V2 responsibility |
| None | Add | `workspace-operations` / `.agents/rules/workspace-operations.md` | Always selected in V3 | No prior records | No prior note | Compact portable search and filesystem defaults |
| `code-idioms` / `.agents/rules/code-idioms.md` | Rewrite | Same | Preserve enabled/disabled state | Preserve same-path records | Preserve same-id note | Remove architectural ownership, async, and resource doctrine; make file size diagnostic only |
| `state-topology` / `.agents/rules/state-topology.md` | Rewrite | Same | Preserve enabled/disabled state | Preserve same-path records | Preserve same-id note | Continue authority and representation mapping; use new rules for changed design decisions |
| None | Add | `ownership-boundaries` / `.agents/rules/ownership-boundaries.md` | Opt-in; absent unless enabled | No prior records | No prior note | Ownership, coherent extraction, reuse, and contract comparison |
| None | Add | `async-state` / `.agents/rules/async-state.md` | Opt-in; absent unless enabled | No prior records | No prior note | Async truth, uncertainty, retry, staleness, guards, and cancellation |
| None | Add | `resource-boundaries` / `.agents/rules/resource-boundaries.md` | Opt-in; absent unless enabled | No prior records | No prior note | Service, resource, feature, normalization, and API policy boundaries |
| `plan-work` / `.agents/skills/plan-work/` | Rewrite | Same | Always selected | Preserve same-path records | Preserve `.agents/local/plan-work.md` | Ordinary plan remains an execution procedure; route specialized artifacts explicitly |
| None | Add | `write-spec` / `.agents/skills/write-spec/` | Opt-in | No prior records | No prior note | Normative specification workflow |
| None | Add | `manage-backlog` / `.agents/skills/manage-backlog/` | Opt-in; included by `spec-first-plan` | No prior records | No prior note | Deferred inventory workflow |
| None | Add | `spec-first-plan` / `.agents/skills/spec-first-plan/` | Opt-in; selecting it includes `write-spec` and `manage-backlog` | No prior records | No prior note | Specification first, then separate derived plan |
| `react-state-transitions` / `.agents/skills/react-state-transitions/` | Rewrite | Same | Preserve enabled/disabled state | Preserve same-path records | Preserve same-id note | Keep React-specific Review, Plan, and Implement workflow; portable defaults live in rules |
| None | Add | `architecture-review` / `.agents/skills/architecture-review/` | Opt-in | No prior records | No prior note | Explicit evidence-based cross-boundary review |
| `css-authoring-conventions` / `.agents/skills/css-authoring-conventions/` | Rewrite | Same | Preserve selection and companion inclusion | Preserve same-path records | Preserve same-id note | Add task-touched modern CSS and verified browser policy |
| `write-commit-diff`, `report-usage`, `ui-library-css`, `css-cleanup`, `css-theme-tokens`, `git-cleanup`, `ship`, `check`, `commit-granular`, `start-branch` | Retain | Same ids and paths | Preserve selection and inclusion | Preserve same-path records | Preserve same-id notes | Capabilities are unchanged |

No retained id changes kind, tier, install class, parameter list, or managed path except that its wording may be rewritten as stated. No V3 setting is added, removed, renamed, or retyped. Catalog and host config formats remain 2.

## Host selection freeze

These are rehearsal and rollout targets, not automatic selection changes. Cross-major migration preserves each host's committed selection unless the reviewed command explicitly enables an item.

| Host | Target rules | Target skills | Host facts and notes |
| --- | --- | --- | --- |
| Watcher migration | Preserve `code-idioms` and `state-topology`; enable `ownership-boundaries`, `async-state`, and `resource-boundaries` | Preserve current CSS, Git, check, and ship choices; enable `react-state-transitions`, `architecture-review`, `write-spec`, `manage-backlog`, and `spec-first-plan` | Preserve `.agents/local/plan-work.md` and all other host-owned files. Keep Yarn, React Query 5, verification commands, browser/product policy, and repository paths in host guidance. |
| HXP fresh install rehearsal | Enable `code-idioms`, `state-topology`, `ownership-boundaries`, `async-state`, and `resource-boundaries` | Enable the planning workflows, React and architecture review, check, ship, Git cleanup, and CSS authoring; let package detection decide `ui-library-css` | Use `integration-2025Q1`, Yarn, React 19, React Query 3, federation contracts, and verification commands only in host guidance/settings. Live timing remains deferred. |
| D2 fresh install rehearsal | Enable `code-idioms`, `state-topology`, `ownership-boundaries`, `async-state`, and `resource-boundaries` | Enable the planning workflows, React and architecture review, check, ship, Git cleanup, and CSS authoring; let package detection decide `ui-library-css` | Use `integration-2025Q1`, npm, React 17, legacy/modern boundaries, owner-layer precedence, and verification commands only in host guidance/settings. Live timing remains deferred. |

Every exact-id host note for a retained skill remains at `.agents/local/<id>.md`. New ids have no migrated note. A host may add a new-id note only as host-owned refinement after installation; migration never manufactures one from a differently scoped note.
