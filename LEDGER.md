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

## Run 1: Phase A rewrites

### v1-final:AGENTS.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | The root is the directory holding this file; files are live | `v1-final:AGENTS.md`, intro, "The canonical root is the directory" | Removed | None | Hosts hold installed copies; nothing reads AGS at runtime (spec 1, 6) |
| 2 | No compile step and no copied runtime | `v1-final:AGENTS.md`, intro, "There is no compile step" | Removed | None | V2 copies released material into hosts (spec 3, 10) |
| 3 | Host install records the AGS path | `v1-final:AGENTS.md`, intro, "Host install records that path" | Removed | None | The `canonicalRoot` setting and retargeting are removed (spec 25) |
| 4 | Rerun the global install after moving the directory | `v1-final:AGENTS.md`, intro, "Run `node scripts/install-global.mjs` again" | AGS | `AGENTS.md`, Commands | |
| 5 | Load order: host adapter and `.agents/AGS.md` first | `v1-final:AGENTS.md`, Load order, item 1 | Removed | None | `.agents/AGS.md` is removed; the AGS block holds the core and the rule index (spec 5, 16.11) |
| 6 | Confirm the root is readable and writable | `v1-final:AGENTS.md`, Load order, item 2 | Removed | None | No runtime access to AGS (spec 6 invariant 2) |
| 7 | Read this file and `rules/core.md` | `v1-final:AGENTS.md`, Load order, item 3 | Removed | None | The core is inlined in the host block (spec 11.2, Appendix A) |
| 8 | Read selected optional rules listed by the host entry | `v1-final:AGENTS.md`, Load order, item 4 | AGS | `templates/agents-block.md` (rule index) | Soft rules are indexed in the block (spec 11.3) |
| 9 | Read relevant host guidance under `.agents/local/` | `v1-final:AGENTS.md`, Load order, item 5 | AGS | `rules/core.md` (host notes line) | Host guidance structure of spec 11.6 |
| 10 | Read a skill only when the request matches its description | `v1-final:AGENTS.md`, Load order, item 6 | AGS | `docs/v2-spec.md` 11.1, 11.4 | Harness-native skill discovery |
| 11 | Do not read every selected skill on every task | `v1-final:AGENTS.md`, Load order, "Do not read every selected skill" | AGS | `docs/v2-spec.md` 3 principle 10, 11.1 | Always-loaded guidance stays thin |
| 12 | Material kinds: core, rules, skills | `v1-final:AGENTS.md`, Material, first three bullets | AGS | `AGENTS.md`, Catalog and Writing material | Tiers of spec 11.1 |
| 13 | Third-party skills live under `skills/` | `v1-final:AGENTS.md`, Material, "Canonical custom and third-party skills" | Backlog | `BACKLOG.md`, Third-party skills, "Import" | |
| 14 | Host-local files under `.agents/local/` belong to the host | `v1-final:AGENTS.md`, Material, "Host-local" | AGS | `docs/v2-spec.md` 6 invariant 7, 11.6 | |
| 15 | `requires-host-location` exceptions | `v1-final:AGENTS.md`, Material, "registered `requires-host-location` exception" | Removed | None | Every skill is host-located (spec 5, 25) |
| 16 | Never copy AGS skills or rules into a host | `v1-final:AGENTS.md`, Material, "Do not copy a canonical skill" | Removed | None | Reversed: V2 installs copies (spec 1) |
| 17 | AGS edits affect every host | `v1-final:AGENTS.md`, Changes, "Canonical edits affect every host" | Removed | None | Hosts change only on `ags host update` from a release tag (spec 15.2, 16.5) |
| 18 | Report AGS edits with `ags report changes` | `v1-final:AGENTS.md`, Changes, command block | Removed | None | Changelog notes and promotion notes replace change reports (spec 15.3) |
| 19 | Use `ags` for deterministic operations | `v1-final:AGENTS.md`, Deterministic commands | AGS | `AGENTS.md`, Commands | The V1 command list is replaced by the commands of spec 22.2 |
| 20 | Never invoke files under `scripts/` by path | `v1-final:AGENTS.md`, Deterministic commands, last sentence | AGS | `AGENTS.md`, Commands | |

### v1-final:rules/core.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | The core applies to every host and task | `v1-final:rules/core.md`, intro | AGS | `rules/core.md` (strong rule, inlined into every host block) | |
| 2 | Read the host entry, the core and selected rules before work; load a skill only when it matches | `v1-final:rules/core.md`, bullet 1 | AGS | `templates/agents-block.md` (block and rule index); `docs/v2-spec.md` 11.1 | The block carries the core and the index; skills load natively |
| 3 | Confirm the canonical root is readable and writable | `v1-final:rules/core.md`, bullet 2 | Removed | None | No runtime access to AGS (spec 6 invariant 2) |
| 4 | Stop when a selected canonical file is missing | `v1-final:rules/core.md`, bullet 3 | Removed | None | Material is installed in the host; `ags doctor` reports missing managed files (spec 23) |
| 5 | Do not copy canonical skills or rules into a host | `v1-final:rules/core.md`, bullet 4 | Removed | None | Reversed: V2 installs copies (spec 1) |
| 6 | Use `ags` for deterministic operations it covers | `v1-final:rules/core.md`, bullet 5 | AGS | `docs/v2-spec.md` 3 principle 9; skill-local scripts (spec 19) | Hosts may lack `ags`; skills run their own scripts |
| 7 | `.agents/local/` is host-owned; do not overwrite, delete or reformat it | `v1-final:rules/core.md`, bullet 6 | Removed | None | Dropped to fit the precedence line into five lines (spec 30 item 9); ownership is enforced by `ags`, which never writes host-owned paths (spec 10.2) |
| 8 | Report canonical edits with `ags report changes` | `v1-final:rules/core.md`, bullet 7, first sentence | Removed | None | Changelog notes and promotion notes replace change reports (spec 15.3) |
| 9 | Record usage with `ags report usage` when reporting is on | `v1-final:rules/core.md`, bullet 7, second sentence | AGS | `rules/core.md` bullet 5; `skills/report-usage/SKILL.md` | |
| 10 | Engagement levels 0 to 8 and their meanings | `v1-final:rules/core.md`, level table, rows 0-8 | AGS | `skills/report-usage/SKILL.md` | |
| 11 | Level 9 reserved for canonical change reports | `v1-final:rules/core.md`, level table, row 9 and "Level 9 is reserved" | Removed | None | Change reports are removed (spec 15.3) |
| 12 | Example commands for usage and change reports | `v1-final:rules/core.md`, powershell block | Removed | None | The usage command moves to `skills/report-usage/SKILL.md`; `report changes` is removed (spec 15.3) |
| 13 | Host settings are read from `.agents/ags.yaml`; ask when a value is missing | new in V2 | AGS | `rules/core.md` bullet 1 | Spec 13.3, Appendix A |
| 14 | Host guidance wins on facts and formats; safety never yields | new in V2 | AGS | `rules/core.md` bullet 2 | Spec 11.6 |

### v1-final:templates/agents-block.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Unversioned `<!-- AGS:BEGIN -->` and `<!-- AGS:END -->` markers | `v1-final:templates/agents-block.md`, markers | AGS | `scripts/lib/render.mjs` (versioned, hashed begin marker) | Spec 16.11 |
| 2 | Pointer: read `.agents/AGS.md` before substantive work | `v1-final:templates/agents-block.md`, body | Removed | None | `.agents/AGS.md` is gone; the block inlines the core and the rule index (spec 5, Appendix A) |

### v1-final:templates/host-ags.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | The host uses the canonical AGS at `{{canonicalRoot}}` | `v1-final:templates/host-ags.md`, first line | Removed | None | No canonical root; hosts hold copies (spec 1, 25) |
| 2 | Confirm canonical root access; stop when unavailable | `v1-final:templates/host-ags.md`, second paragraph | Removed | None | No runtime access to AGS (spec 6 invariant 2) |
| 3 | Read first: AGS `AGENTS.md`, `rules/core.md`, `.agents/local/` | `v1-final:templates/host-ags.md`, "Read first" | AGS | `templates/agents-block.md`; `rules/core.md` bullets 2-3 | The block carries the core; host notes are read per skill |
| 4 | List of selected rules | `v1-final:templates/host-ags.md`, "Selected rules" | AGS | `templates/agents-block.md` (`{{ruleIndex}}`) | Soft rules are indexed with descriptions (spec 11.3) |
| 5 | List of selected skills, loaded only when relevant | `v1-final:templates/host-ags.md`, "Selected skills" | Removed | None | Harnesses discover installed skills in `.agents/skills/` natively (spec 8, 11.4) |
| 6 | Host-local exceptions | `v1-final:templates/host-ags.md`, "Host-local exceptions" | Removed | None | `requires-host-location` is removed; every skill is host-located (spec 25) |
| 7 | Host operational settings; do not invent a missing value | `v1-final:templates/host-ags.md`, "Host operational settings" | AGS | `rules/core.md` bullet 1; `.agents/ags.yaml` settings (spec 13) | |
| 8 | Use `ags` for deterministic operations; levels 0-8 in the core, level 9 for change reports | `v1-final:templates/host-ags.md`, last paragraph | Removed | None | Levels move to `skills/report-usage/SKILL.md`; level 9 and change reports are removed (spec 15.3) |
| 9 | Example usage and change report commands | `v1-final:templates/host-ags.md`, powershell block | Removed | None | See `v1-final:rules/core.md` row 12 |

### v1-final: V1-specific lines of the rewritten skills

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Plans under the verified host's `.tmp` directory | `v1-final:skills/plan-work/SKILL.md`, description and "Resolve the host first" | AGS | `skills/plan-work/SKILL.md`, "Where plans go" (`.tmp/plans/` with `tmp-conventions` names) | Spec 17.2-17.3 |
| 2 | Never write host plans under the canonical AGS `.tmp` | `v1-final:skills/plan-work/SKILL.md`, "Do not write a host plan under the canonical AGS `.tmp`" | Removed | None | No canonical root; skills run in the host only (spec 6 invariant 2) |
| 3 | Durable plan location only from the user or `.agents/local/` guidance; no plan stores under `.agents` or `.cursor` | `v1-final:skills/plan-work/SKILL.md`, "The durable copy of a plan" | AGS | `skills/plan-work/SKILL.md`, "Where plans go" | Host guidance refines the skill through the core line (spec 11.6) |
| 4 | Add `/.tmp/` to the git exclude file before writing | `v1-final:skills/plan-work/SKILL.md`, "Keep host `.tmp` ignored" | AGS | `scripts/lib/render.mjs` (exclude block written by install and update) | Checkable mechanically; belongs in code (spec 11.5, 16.12) |
| 5 | Verification through the host `check` skill | `v1-final:skills/plan-work/SKILL.md`, "Done when", second bullet | AGS | `skills/plan-work/SKILL.md`, "Done when" | Reworded: "use the `check` skill when it is installed" |