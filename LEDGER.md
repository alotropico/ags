# AGS concept ledger

This ledger records where each concept of rewritten or migrated material went (spec section 26).

Row format: `| # | Concept | Source | Disposition | Destination | Rationale |`. The source is a path plus a heading or line at a fixed revision. The destination is the path that now holds the concept, or, for `Backlog`, the entry in `BACKLOG.md`. A rationale is required for `Removed` and `Migrate later`.

Dispositions, exactly one per row:

- `AGS`: the concept lives in AGS material, code or the spec.
- `Host`: the concept lives in a host's own guidance.
- `Backlog`: the concept waits in `BACKLOG.md`.
- `Removed`: the concept is dropped, with a rationale.
- `Migrate later`: temporary, only for host material in Run 2.

## Run 1: plan inputs (Appendix H, group 6)

### Documents

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | The V2 specification | `.tmp/plans/2026-09-27-ags-v2-spec.md` | AGS | `docs/v2-spec.md` | Moved byte-identical; edited only there from now on |
| 2 | The AGS backlog | `.tmp/plans/2026-09-27-ags-backlog.md` | AGS | `BACKLOG.md` | Moved; header bullets updated |
| 3 | The meta guidance inventory | `.tmp/2026-09-26-meta-guidance-not-in-ags.md` | AGS | `docs/v2-meta-inventory.md` | Moved byte-identical; a Run 2 input |
| 4 | The quality proto-rules | `.tmp/references/ags-quality-proto-rules.md` | AGS | `docs/v3-proto-rules.md` | Moved byte-identical; planned for V3 |
| 5 | The V2 direction handoff | `.tmp/ags-v2-direction-handoff.md` | Removed | `.tmp/archive/2026-09/ags-v2-direction-handoff.md` | Superseded by `docs/v2-spec.md`; archived |
| 6 | The V1 specification | `.tmp/references/ags-minimal-v1-spec.md` | Removed | `.tmp/archive/2026-09/ags-minimal-v1-spec.md` | V1 history, superseded by `docs/v2-spec.md` and tag `v1-final`; archived at `.tmp/archive/2026-09/` |
| 7 | V1 migration sources | `.tmp/references/ags-migration-sources.md` | Removed | `.tmp/archive/2026-09/ags-migration-sources.md` | V1 history, superseded by `docs/v2-spec.md` and tag `v1-final`; archived at `.tmp/archive/2026-09/` |
| 8 | V1 softened decisions | `.tmp/decisions/ags-v1-softened-decisions.md` | Removed | `.tmp/archive/2026-09/ags-v1-softened-decisions.md` | V1 history, superseded by `docs/v2-spec.md` and tag `v1-final`; archived at `.tmp/archive/2026-09/` |
| 9 | React skills reference | `.tmp/references/ags-react-skills.md` | Removed | None | Byte-for-byte copy of the V1 spec; deleted |
| 10 | AGS future work notes | `.tmp/references/ags-future-work-notes.md` | Removed | `.tmp/archive/2026-09/ags-future-work-notes.md` | Items reconciled into `BACKLOG.md`, rows below; archived at `.tmp/archive/2026-09/` |
| 11 | AGS raw notes | `.tmp/references/ags-raw-notes.md` | Removed | `.tmp/archive/2026-09/ags-raw-notes.md` | Items reconciled into `BACKLOG.md`, rows below; archived at `.tmp/archive/2026-09/` |

### .tmp/archive/2026-09/ags-future-work-notes.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Where to keep the note and that it stays private | `.tmp/archive/2026-09/ags-future-work-notes.md`, "This is a private working note" | Removed | None | Obsolete: notes are tracked in `BACKLOG.md` and `LEDGER.md` (spec 28.1, 31); `.tmp` layout is spec 17.2 |
| 2 | V1 model summary and ordering by usefulness | `.tmp/archive/2026-09/ags-future-work-notes.md`, "The current AGS is one canonical tree" | Removed | None | Describes the V1 model that spec sections 1 and 5 replace |
| 3 | Recover the omitted meta AGS content | `.tmp/archive/2026-09/ags-future-work-notes.md`, "First: recover the omitted meta AGS content", first paragraph | AGS | `docs/v2-spec.md` 28.2, Appendix H | Run 2 consolidation takes every variant, including meta's |
| 4 | Adopt on a low-risk real host first; HXP shared, D2 personal | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Use real repo tasks, initially a low-risk host" | AGS | `docs/v2-spec.md` 28.2, 28.3 | Watcher is the first host; HXP and D2 wait for Phase E |
| 5 | Lighten and clean up the combined guidance | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Second: lighten and clean up the combined guidance" | AGS | `docs/v2-spec.md` 11, 28.2 | Tiers keep always-loaded guidance thin; Run 2 consolidates and runs the prose pass |
| 6 | Proto-rules and selected third-party ideas | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Third: develop the proto-rules and selected third-party ideas" | Backlog | `BACKLOG.md`, Guidance, "Proto-rules" | |
| 7 | Optional committed local copy of guidance in hosts | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Deferred capability: optional committed local fallback copy", first paragraph | AGS | `docs/v2-spec.md` 1, 10 | V2 makes installed copies the only model |
| 8 | Update and sync compare only; `ags host snapshot refresh` | `.tmp/archive/2026-09/ags-future-work-notes.md`, "When this option exists, ordinary `ags host update`" | Removed | None | Rejected by spec 16.5 and 25: update plans and applies with decisions; sync is removed |
| 9 | Optional commit of the refreshed copy | `.tmp/archive/2026-09/ags-future-work-notes.md`, "For the optional commit, stage and commit only paths" | Removed | None | Rejected by spec 6 invariant 6: AGS never commits in a host |
| 10 | Canonical skill replacement rollback | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Canonical skill replacement rollback" | Removed | None | Obsolete: the canonical model is removed (spec 25); backups and reruns replace rollback (16.1) |
| 11 | Update retarget timing | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Individual update retarget timing" | Removed | None | Obsolete: retargeting is removed (spec 25) |
| 12 | Missing selected or included files | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Missing selected or included files" | AGS | `docs/v2-spec.md` 14.2, 23 | Catalog validation fails on missing files; `doctor` checks managed files |
| 13 | Host-local exceptions | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Host-local exceptions" | Removed | None | Obsolete: `requires-host-location` is removed; every skill is host-located (spec 5, 25) |
| 14 | Snapshot exclusion override | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Snapshot exclusion override" | Removed | None | Obsolete: the host snapshot holds only `AGENTS.md` and `.agents/**` (spec 20) |
| 15 | Windows-only CLI and tests | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Windows-only CLI and tests" | Backlog | `BACKLOG.md`, CLI and platform, "Portable CLI" | |
| 16 | Skill compatibility and stack inference | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Skill compatibility and stack inference" | AGS | `docs/v2-spec.md` 12.1, 12.2, 12.4 | V2 keeps the V1 condition grammar and adds install classes and companions, with no solver |
| 17 | Reporting semantics and cross-run analysis | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Reporting: keep per-host toggles" | Backlog | `BACKLOG.md`, Reporting, "Usage collection" | |
| 18 | No versioning or release process | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Versioning: a simple private sketch" | Removed | None | Rejected by spec 15: V2 releases semver tags with notes |
| 19 | Engineering items are candidates, not prerequisites | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Engineering backlog from Claude's review" | Removed | None | Framing only; each item has its own row below |
| 20 | Reuse catalog lookups; parse `.ags-exclude` once | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Reuse catalog lookups within a call" | Removed | None | Obsolete: `.ags-exclude` is V1 and the modules are rewritten in Run 1 (spec 20, 25) |
| 21 | Remove redundant loads, probes and reads | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Remove demonstrably redundant catalog loads" | Removed | None | Obsolete: the V1 code paths are rewritten in Run 1 (spec 25) |
| 22 | Consolidate collision checks and repaired-settings parsing | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Consolidate duplicated collision checks" | Removed | None | Obsolete: repair is removed and settings are rewritten (spec 13, 25) |
| 23 | Consistent CLI usage errors and `--key=value` | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Make CLI usage errors consistent" | Backlog | `BACKLOG.md`, CLI and platform, "`--key=value` flags" | Exit codes are fixed by spec 22.4; the flag form is new backlog |
| 24 | Markdown link detection | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Improve Markdown-link detection" | Backlog | `BACKLOG.md`, CLI and platform, "Markdown link detection" | |
| 25 | ZIP64 | `.tmp/archive/2026-09/ags-future-work-notes.md`, "ZIP64 is unnecessary" | Backlog | `BACKLOG.md`, Snapshots, "ZIP64" | |
| 26 | Install rollback residue | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Revisit install rollback residual directories" | Removed | None | Obsolete: the operation model replaces V1 install rollback (spec 16.1) |
| 27 | Exploratory ideas and AGSO history | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Exploratory, not a roadmap commitment" | Removed | None | No commitment; capabilities are added when usage calls for them (spec 3 principle 8, 4) |
| 28 | Order: meta content, lean guidance, tactical quality | `.tmp/archive/2026-09/ags-future-work-notes.md`, "The ordering can change after using AGS" | AGS | `docs/v2-spec.md` 28 | Run 2 consolidates, then usage-driven additions, then V3 proto-rules |

### .tmp/archive/2026-09/ags-raw-notes.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Hosts keep their own skills; host changes can go to AGS | `.tmp/archive/2026-09/ags-raw-notes.md`, "We should after all let host projects have skills" | AGS | `docs/v2-spec.md` 10.2, 11.6, 16.8 | Host skills are host-owned; promotion moves host edits into AGS |
| 2 | Global tools such as Graphify, installed by skills, outputs gitignored | `.tmp/archive/2026-09/ags-raw-notes.md`, "We want to allow global installs" | Backlog | `BACKLOG.md`, Tools, "Tools catalog and `ags tools`" and "Tool management" | |
| 3 | Default Graphify generation command | `.tmp/archive/2026-09/ags-raw-notes.md`, "The default graphiphy generation" | Backlog | `BACKLOG.md`, Tools, "Tools catalog and `ags tools`" | The entry defines the Graphify steps; the default command is settled when it is built |
