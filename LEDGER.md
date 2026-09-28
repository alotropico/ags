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
| 12 | Archived copy of the first backlog | `.tmp/archive/2026-09/2026-09-27-ags-backlog.md` | Removed | `.tmp/archive/2026-09/2026-09-27-ags-backlog.md` | History only; the live backlog is `BACKLOG.md` (row 2), which its header names |

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
| 17 | Reporting semantics and cross-run analysis | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Reporting: keep per-host toggles", "Possible later work" | Backlog | `BACKLOG.md`, Reporting, "Usage analysis" | |
| 18 | No versioning or release process | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Versioning: a simple private sketch" | Removed | None | Rejected by spec 15: V2 releases semver tags with notes |
| 19 | Engineering items are candidates, not prerequisites | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Engineering backlog from Claude's review" | Removed | None | Framing only; each item has its own row below |
| 20 | Reuse catalog lookups; parse `.ags-exclude` once | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Reuse catalog lookups within a call" | Removed | None | Obsolete: `.ags-exclude` is V1 and the modules are rewritten in Run 1 (spec 20, 25) |
| 21 | Remove redundant loads, probes and reads | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Remove demonstrably redundant catalog loads" | Removed | None | Obsolete: the V1 code paths are rewritten in Run 1 (spec 25) |
| 22 | Consolidate collision checks and repaired-settings parsing | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Consolidate duplicated collision checks" | Removed | None | Obsolete: repair is removed and settings are rewritten (spec 13, 25) |
| 23 | Consistent CLI usage errors and `--key=value` | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Make CLI usage errors consistent" | Backlog | `BACKLOG.md`, CLI and platform, "`--key=value` flags" | Exit codes are fixed by spec 22.4; `scripts/ags.mjs` is the only entry point, and a bare `snapshot --out` exits 2 (`test/snapshot.test.mjs`); the flag form is new backlog |
| 24 | Markdown link detection | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Improve Markdown-link detection" | Backlog | `BACKLOG.md`, CLI and platform, "Markdown link detection" | |
| 25 | ZIP64 | `.tmp/archive/2026-09/ags-future-work-notes.md`, "ZIP64 is unnecessary" | Backlog | `BACKLOG.md`, Snapshots, "ZIP64" | |
| 26 | Install rollback residue | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Revisit install rollback residual directories" | Removed | None | Obsolete: the operation model replaces V1 install rollback (spec 16.1) |
| 27 | Exploratory ideas and AGSO history | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Exploratory, not a roadmap commitment" | Removed | None | No commitment; capabilities are added when usage calls for them (spec 3 principle 8, 4) |
| 28 | Order: meta content, lean guidance, tactical quality | `.tmp/archive/2026-09/ags-future-work-notes.md`, "The ordering can change after using AGS" | AGS | `docs/v2-spec.md` 28 | Run 2 consolidates, then usage-driven additions, then V3 proto-rules |
| 29 | Per-host reporting toggle and JSONL usage records | `.tmp/archive/2026-09/ags-future-work-notes.md`, "Reporting: keep per-host toggles and JSONL usage/change scripts" | AGS | `docs/v2-spec.md` 13.1 (`reporting`), 18 | Change scripts are dropped with change reports (spec 15.3) |

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
| 21 | Custom skills live under `skills/` | `v1-final:AGENTS.md`, Material, "Canonical custom and third-party skills live under `skills/`" | AGS | `AGENTS.md`, Layout (`skills/<id>/`) | |

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

### v1-final:README.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | AGS is the local guidance and deterministic command set for coding agents | `v1-final:README.md`, intro, "AGS is the local canonical guidance" | AGS | `README.md`, intro | Reworded: AGS is the source of released material that hosts install as copies (spec 1, 3) |
| 2 | Windows only | `v1-final:README.md`, intro, "V1 supports Windows only" | AGS | `README.md`, Prerequisites | Portability is `BACKLOG.md`, CLI and platform, "Portable CLI" (spec 22.1) |
| 3 | Hosts keep a small entry and their own settings | `v1-final:README.md`, intro, "Host repositories keep a small entry" | AGS | `README.md`, Hosts | The entry is the AGS block in `AGENTS.md`; settings are `.agents/ags.yaml` (spec 10.1, 13.1) |
| 4 | Custom skills live under `skills/<id>/` | `v1-final:README.md`, intro, "Canonical custom and third-party skills" | AGS | `README.md`, Layout | |
| 5 | Third-party skills live under `skills/<id>/` | `v1-final:README.md`, intro, "Canonical custom and third-party skills" | Backlog | `BACKLOG.md`, Third-party skills, "Import" | |
| 6 | A `requires-host-location` exception lives only at the host path listed in `.agents/AGS.md` | `v1-final:README.md`, intro, "A registered `requires-host-location` exception" | Removed | None | See `v1-final: removed commands and settings` row 21 |
| 7 | An AGS skill is never copied into a host as an exception | `v1-final:README.md`, intro, "A canonical skill is never copied" | Removed | None | Reversed: hosts hold installed copies (spec 1) |
| 8 | Prerequisites: Windows, Node.js 20 or newer, pnpm, Git | `v1-final:README.md`, Prerequisites | AGS | `README.md`, Prerequisites | |
| 9 | Install from the checkout: `pnpm install`, `pnpm setup`, the global install script, then `ags doctor` | `v1-final:README.md`, Install the `ags` command, first command block | AGS | `README.md`, Install the `ags` command | |
| 10 | The installer writes `ags.CMD`, `ags.ps1` and `ags` shims that run this tree's `scripts/ags.mjs` | `v1-final:README.md`, Install the `ags` command, "The installer writes" | AGS | `README.md`, Install the `ags` command; `scripts/install-global.mjs` | Spec 22.1 |
| 11 | `--bin` chooses only the shim directory, not the AGS source root | `v1-final:README.md`, Install the `ags` command, "`--bin` chooses only that shim directory" | AGS | `README.md`, Install the `ags` command | The source-root clause is dropped: no host stores an AGS path (spec 25) |
| 12 | The shim directory must be on PATH | `v1-final:README.md`, Install the `ags` command, "The directory must be on PATH" | AGS | `README.md`, Install the `ags` command | |
| 13 | The installer retargets every registered host and returns nonzero when a retarget fails | `v1-final:README.md`, Install the `ags` command, "the installer retargets every registered host" | Removed | None | See `v1-final: removed commands and settings` row 19 |
| 14 | Example: `--bin` with an explicit directory | `v1-final:README.md`, Install the `ags` command, second command block | AGS | `README.md`, Install the `ags` command | The example uses `$env:USERPROFILE\bin` instead of an absolute path |
| 15 | Shim directory order without `--bin`: `PNPM_HOME` itself, `pnpm bin -g`, `%LOCALAPPDATA%\pnpm` | `v1-final:README.md`, Install the `ags` command, "Shim directory order" | AGS | `README.md`, Install the `ags` command; `scripts/install-global.mjs` (`resolveInstallBin`) | |
| 16 | An existing shim that points elsewhere stops the installer; pass `--replace` or another `--bin` | `v1-final:README.md`, Install the `ags` command, "If an existing `ags` shim does not point at this tree" | AGS | `README.md`, Install the `ags` command | |
| 17 | On a platform other than Windows, the installer exits before writing | `v1-final:README.md`, Install the `ags` command, "On a non-Windows platform" | AGS | `README.md`, Install the `ags` command | |
| 18 | `pnpm setup` adds the global bin to the user PATH; restart the terminal app, since a new tab keeps the old PATH | `v1-final:README.md`, Install the `ags` command, "`pnpm setup` adds the pnpm global bin directory" | AGS | `README.md`, Install the `ags` command | |
| 19 | Try the host lifecycle on a throwaway git repository, never on one you care about | `v1-final:README.md`, Temporary host trial | AGS | `README.md`, Hosts, "Try it on a scratch repository" | `--yes` is gone; the trial answers the terminal prompts (`v1-final: removed commands and settings` row 13) |
| 20 | Selections, usage reporting, Git and check settings live in the host's `.agents/ags.yaml` | `v1-final:README.md`, Host settings, first sentence | AGS | `README.md`, Host settings | Format 2 (spec 13.1) |
| 21 | `hosts.yaml` stores only the host id, name and path | `v1-final:README.md`, Host settings, "`hosts.yaml` stores only" | AGS | `README.md`, Hosts; `scripts/lib/registry.mjs` | Format 2 also holds ignore and promotion records (spec 16.13) |
| 22 | Example `git.mainBranch` and `checks.*` values | `v1-final:README.md`, Host settings, YAML block | AGS | `README.md`, Host settings (format 2 example) | |
| 23 | Check values are `package.json` script names | `v1-final:README.md`, Host settings, "Check values are package script names" | AGS | `README.md`, Host settings; `scripts/lib/config.mjs` | Spec 13.2 |
| 24 | The package manager comes from `packageManager` or exactly one lock file; scripts run as `<manager>.cmd run <script>` | `v1-final:README.md`, Host settings, "AGS detects `pnpm`, `yarn`, or `npm`" | AGS | `README.md`, Host settings; `skills/check/scripts/run-checks.mjs` | Spec 19.2 |
| 25 | A Prettier script that writes files is refused | `v1-final:README.md`, Host settings, "It refuses an obvious Prettier write script" | AGS | `scripts/lib/config.mjs`; `skills/check/scripts/run-checks.mjs` | Spec 19.2 |
| 26 | The installer shows the manager, script name and script body before confirmation | `v1-final:README.md`, Host settings, "The installer shows the manager" | Removed | None | See `v1-final: removed commands and settings` row 16 |
| 27 | An update keeps existing setting values | `v1-final:README.md`, Host settings, "A core update does not replace existing values" | AGS | `README.md`, Host settings; `scripts/lib/config.mjs` (`mergeConfig`) | Spec 13.6 |
| 28 | An old full check command is migrated to a script name | `v1-final:README.md`, Host settings, "An old full command is migrated" | Removed | None | See `v1-final: removed commands and settings` row 17 |
| 29 | `ui-library-css` is installed when `package.json` depends on `@platform/ui-library` | `v1-final:README.md`, Host settings, "`ui-library-css` is the CSS entry point" | AGS | `catalog.yaml` (`install: detected` with `when`) | Spec 12.1, 12.2 |
| 30 | A Markdown link from one skill to another forces the target into `includes` | `v1-final:README.md`, Host settings, "A Markdown link from one canonical skill" | AGS | `AGENTS.md`, Writing material; `scripts/lib/catalog.mjs` (link validation) | Reworded: a skill links only to its `includes` companions (spec 14.2) |
| 31 | `ui-library-css` includes `css-authoring-conventions` and `css-theme-tokens`; `css-authoring-conventions` includes `css-cleanup` | `v1-final:README.md`, Host settings, "`ui-library-css` includes" | AGS | `catalog.yaml` (`includes`) | |
| 32 | Companions stay in the AGS tree | `v1-final:README.md`, Host settings, "Those companions stay canonical" | Removed | None | Companions are installed into the host with their parent (spec 12.4) |
| 33 | A skill that cannot live in AGS is installed with `--route` as a registered host-local exception, with a warning and a record | `v1-final:README.md`, Host settings, "A skill that truly cannot live in canonical AGS" | Removed | None | Such a skill is a host skill in `.agents/skills/<id>/` (spec 11.6); see `v1-final: removed commands and settings` row 21 |
| 34 | `ags doctor` checks the AGS tree and, with a host route, that host | `v1-final:README.md`, Commands, `ags doctor` | AGS | `README.md`, Commands | Spec 23 |
| 35 | `ags host install`, `update`, `list` and `unregister` | `v1-final:README.md`, Commands, `ags host install\|update\|list\|sync\|repair\|unregister` | AGS | `README.md`, Commands and Hosts | Spec 16.4, 16.5, 16.13 |
| 36 | `ags host sync` and `ags host repair` | `v1-final:README.md`, Commands, `ags host install\|update\|list\|sync\|repair\|unregister` | Removed | None | See `v1-final: removed commands and settings` rows 1–2 |
| 37 | `ags skills list` | `v1-final:README.md`, Commands, `ags skills list\|install\|reconcile` | AGS | `README.md`, Commands | Spec 22.2 |
| 38 | `ags skills install` | `v1-final:README.md`, Commands, `ags skills list\|install\|reconcile` | Backlog | `BACKLOG.md`, Third-party skills, "Import" | |
| 39 | `ags skills reconcile` | `v1-final:README.md`, Commands, `ags skills list\|install\|reconcile` | Removed | None | See `v1-final: removed commands and settings` row 4 |
| 40 | `ags reporting on\|off\|status` for per-host usage reporting | `v1-final:README.md`, Commands, `ags reporting on\|off\|status` | Backlog | `BACKLOG.md`, CLI and platform, "`ags reporting on\|off\|status`" | |
| 41 | `ags report usage` appends a usage record | `v1-final:README.md`, Commands, `ags report usage\|changes` | AGS | `README.md`, Commands; `skills/report-usage/SKILL.md` | Records stay in the host (spec 18) |
| 42 | `ags report changes` appends a change record | `v1-final:README.md`, Commands, `ags report usage\|changes` | Removed | None | See `v1-final: removed commands and settings` row 6 |
| 43 | `ags check` runs the configured type, lint and Prettier checks | `v1-final:README.md`, Commands, `ags check` | AGS | `README.md`, Commands; `skills/check/scripts/run-checks.mjs` | The command is an alias of the `check` script (spec 19.2) |
| 44 | `ags snapshot` zips one host's guidance, including its companion skills | `v1-final:README.md`, Commands, `ags snapshot` | AGS | `README.md`, Commands; `scripts/lib/snapshot.mjs` | Spec 20 |
| 45 | `ags snapshot canonical` zips the AGS checkout, with `--only`, `--except` and `--include-standard-excluded` | `v1-final:README.md`, Commands, `ags snapshot canonical` | Backlog | `BACKLOG.md`, Snapshots, "`ags snapshot source`" | |
| 46 | `ags diff` modes write a patch under the host `.tmp/`; counts follow first-parent history; the root commit diffs from the empty tree | `v1-final:README.md`, Commands, `ags diff` | AGS | `README.md`, Commands; `skills/write-commit-diff/scripts/write-commit-diff.mjs` | The command is an alias of the script, which writes `.tmp/scratch/<name>.diff` (spec 19.1) |
| 47 | The AGS `.tmp/` is for AGS maintenance and for files the AGS scripts stage | `v1-final:README.md`, Layout, "Canonical `.tmp` is for AGS maintenance" | AGS | `README.md`, Layout; `AGENTS.md`, .tmp conventions | `.tmp/ags/` is reserved for the command (spec 9.1, 17.2) |
| 48 | A host plan or other host artifact goes under the host's own `.tmp/` | `v1-final:README.md`, Layout, "A host plan or other host artifact" | AGS | `rules/tmp-conventions.md`; `skills/plan-work/SKILL.md` | |
| 49 | AGS layout: root files and folders | `v1-final:README.md`, Layout, first text block | AGS | `README.md`, Layout | Spec 9.1 |
| 50 | Host layout: `AGENTS.md`, `.agents/ags.yaml`, `.agents/local/`, `.tmp/` | `v1-final:README.md`, Layout, "Host:" block | AGS | `README.md`, Hosts | Spec 10.1 |
| 51 | `.agents/AGS.md` in the host layout | `v1-final:README.md`, Layout, "Host:" block | Removed | None | See `v1-final: removed commands and settings` row 22 |

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
| 6 | Read `git.mainBranch` from the verified host; stop when absent | `v1-final:skills/ship/SKILL.md`, Preconditions, third bullet | AGS | `skills/ship/SKILL.md`, "Host settings" | Appendix D wording |
| 7 | Do not depend on conventions outside this host or canonical AGS | `v1-final:skills/ship/SKILL.md`, "Do not", second bullet | AGS | `skills/ship/SKILL.md`, "Do not" | "canonical AGS" dropped; material lives in the host |
| 8 | Read `checks.*` from the verified host and run `ags check --route <host>` | `v1-final:skills/check/SKILL.md`, first paragraph | AGS | `skills/check/SKILL.md`, "Host settings" and "Run" (`run-checks.mjs`; `ags check` as optional alias) | Spec 19.2, Appendix D |
| 9 | Package manager, stale script, status and prettier rules described in prose | `v1-final:skills/check/SKILL.md`, bullets 2-5 | AGS | `skills/check/scripts/run-checks.mjs`; summarized in `skills/check/SKILL.md` | Checkable mechanically; the script enforces them |
| 10 | Never run canonical AGS scripts as a stand-in for the host | `v1-final:skills/check/SKILL.md`, last bullet | Removed | None | No canonical scripts; the skill runs its own installed script (spec 19) |
| 11 | Required `git.mainBranch` from the verified host's `ags.yaml` | `v1-final:skills/git-cleanup/SKILL.md`, "Required host setting" | AGS | `skills/git-cleanup/SKILL.md`, "Host settings" | Appendix D wording |
| 12 | Never delete a branch named by host-local guidance under `.agents/local/` | `v1-final:skills/git-cleanup/SKILL.md`, Exclusions, first sentence | AGS | `skills/git-cleanup/SKILL.md`, Exclusions ("a branch that host guidance names as protected") | Host guidance covers `AGENTS.md`, host rules and notes (spec 11.6) |
| 13 | Verify with the host `check` skill; never run canonical AGS scripts against the host | `v1-final:skills/css-authoring-conventions/SKILL.md`, Verify | AGS | `skills/css-authoring-conventions/SKILL.md`, Verify ("use the `check` skill when it is installed") | The canonical-scripts clause is dropped with the canonical root (spec 25) |
| 14 | Read `.agents/ags.yaml` `checks` before deciding no audit exists | `v1-final:skills/css-cleanup/SKILL.md`, "Established command" | AGS | `skills/css-cleanup/SKILL.md`, "Host settings" and "Established command" | Appendix D wording for its `params` |
| 15 | Verify with the host `check` skill; never fall back to canonical AGS scripts | `v1-final:skills/css-cleanup/SKILL.md`, Verify | AGS | `skills/css-cleanup/SKILL.md`, Verify | The canonical-scripts clause is dropped with the canonical root (spec 25) |
| 16 | Skills act on "the verified host", checked through AGS before use | `v1-final:skills/check/SKILL.md`, description; `v1-final:skills/git-cleanup/SKILL.md`, "Required host setting"; `v1-final:skills/css-cleanup/SKILL.md`, "Established command" | AGS | `skills/check/SKILL.md`, `skills/git-cleanup/SKILL.md`, `skills/css-cleanup/SKILL.md` ("the repository") | Reworded: skills run inside the host that installed them, with no registry check (spec 6 invariant 2, 19) |
| 17 | Canonical `.tmp` is only for work on AGS itself or files AGS scripts stage | `v1-final:skills/plan-work/SKILL.md`, "Canonical `.tmp` is only for work on AGS itself" | AGS | `rules/tmp-conventions.md` (`.tmp/ags/` reserved for the `ags` command); `AGENTS.md`, ".tmp conventions" | Every repository, AGS included, follows the same `.tmp` conventions (spec 17.1) |
| 18 | Do not modify the host's tracked `.gitignore` | `v1-final:skills/plan-work/SKILL.md`, "Do not modify the host's tracked `.gitignore`" | AGS | `scripts/lib/render.mjs` (only the exclude block in `.git/info/exclude`) | AGS never touches `.gitignore` (spec Appendix E.3, 16.12) |

### v1-final: removed commands and settings

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | `ags host sync [--route . \| --all]`: check registered hosts against the live tree and print `host repair` hints | `v1-final:scripts/ags.mjs`, `hostCommand`, "sync"; `v1-final:scripts/lib/host.mjs`, `syncHosts` | Removed | None | `host status` and `doctor --route` review a host read-only, and `host update` reviews host changes on every run (spec 16.5, 16.13, 23) |
| 2 | `ags host repair (--route . \| --host <id>) [--yes]`, one mode per run: `--setting <key> [--value <value>]`, `--remove-invalid`, `--restore-required`, `--overwrite-managed`, `--reset-managed` | `v1-final:scripts/ags.mjs`, `hostCommand`, "repair"; `v1-final:scripts/lib/host.mjs`, `repairHost` | Removed | None | Prepare, backups and idempotent reruns replace repair; `host update` restores managed files and takes `--set` (spec 13.5, 16.1, 16.3, 16.5) |
| 3 | `ags skills install --from <path> --id <id> --kind custom\|third-party [--description] [--keywords] [--source] [--replace] [--yes]`: import a skill into AGS | `v1-final:scripts/ags.mjs`, `skillsCommand`, "install"; `v1-final:scripts/lib/skills.mjs`, `installSkill` | Backlog | `BACKLOG.md`, Third-party skills, "Import" | Custom skills are added by hand with a catalog entry (`AGENTS.md`, Catalog) |
| 4 | `ags skills reconcile (--route . \| --all) [--dry-run] [--no-enable] [--yes]`: reconcile host-local skill copies with the AGS tree | `v1-final:scripts/ags.mjs`, `skillsCommand`, "reconcile"; `v1-final:scripts/lib/skills.mjs`, `reconcile` | Removed | None | Hosts hold installed copies; `host update` classifies host edits and offers promote, restore, ignore or disable (spec 16.6–16.8) |
| 5 | `ags reporting on\|off\|status (--route . \| --host <id> \| --all)` and `setReporting` | `v1-final:scripts/ags.mjs`, `reportingCommand`; `v1-final:scripts/lib/report-cmd.mjs`, `setReporting` | Backlog | `BACKLOG.md`, CLI and platform, "`ags reporting on\|off\|status`" | `reporting` is edited by hand in `.agents/ags.yaml` (spec 13.1, 30 item 3) |
| 6 | `ags report changes --file <path> [--note <text>]`, `recordChanges` and level 9 | `v1-final:scripts/ags.mjs`, `reportCommand`, "changes"; `v1-final:scripts/lib/report-cmd.mjs`, `recordChanges` | Removed | None | Changelog notes and promotion notes replace change reports (spec 15.3) |
| 7 | `ags report usage` appends to AGS `reports/usage/YYYY-MM.jsonl`, with AGS paths and the host name | `v1-final:scripts/lib/report-cmd.mjs`, `recordUsage`; `v1-final:scripts/lib/reports.mjs`, `appendReport` | Backlog | `BACKLOG.md`, Reporting, "Usage collection" | V2 records stay in the host, in `.tmp/ags/reports/usage.jsonl`, with host paths (spec 18) |
| 8 | `ags snapshot canonical [--out <zip>] [--only <names>] [--except <names>] [--include-standard-excluded]` and `scripts/snapshot-canonical.mjs` | `v1-final:scripts/ags.mjs`, `snapshotCommand`, "canonical"; `v1-final:scripts/snapshot-canonical.mjs` | Backlog | `BACKLOG.md`, Snapshots, "`ags snapshot source`" | |
| 9 | `--main-branch <branch>` on `host install` and `host update` | `v1-final:scripts/ags.mjs`, `hostCommand`, allowed flags | AGS | `scripts/ags.mjs`: `--set git.mainBranch=<branch>` | Spec 13.5, 25 |
| 10 | `--check-type <script>` on `host install` and `host update` | `v1-final:scripts/ags.mjs`, `hostCommand`, allowed flags | AGS | `scripts/ags.mjs`: `--set checks.type=<script>` | Spec 13.5, 25 |
| 11 | `--check-lint <script>` on `host install` and `host update` | `v1-final:scripts/ags.mjs`, `hostCommand`, allowed flags | AGS | `scripts/ags.mjs`: `--set checks.lint=<script>` | Spec 13.5, 25 |
| 12 | `--check-prettier <script>` on `host install` and `host update` | `v1-final:scripts/ags.mjs`, `hostCommand`, allowed flags | AGS | `scripts/ags.mjs`: `--set checks.prettier=<script>` | Spec 13.5, 25 |
| 13 | `--yes` confirms `host install`, `host update` and `host unregister` | `v1-final:scripts/ags.mjs`, `hostCommand`, allowed flags | AGS | `scripts/lib/operation.mjs`: terminal confirmation, or `--plan <digest>` without a terminal | Spec 16.2 |
| 14 | `--all` runs `host sync`, `skills reconcile` and `ags reporting` over every registered host | `v1-final:scripts/ags.mjs`, `hostCommand`, `skillsCommand`, `reportingCommand` | Backlog | `BACKLOG.md`, CLI and platform, "`--all` mutation flows and batch updates" | |
| 15 | Install proposes `git.mainBranch` from the current branch | `v1-final:scripts/lib/catalog.mjs`, settings proposal, "proposal.git.mainBranch = head" | Removed | None | A missing required value is asked in a terminal or passed with `--set`, never inferred (spec 13.3, 13.4) |
| 16 | Install proposes check scripts found in `package.json` (`typecheck`, `type-check`, `lint`, `prettier:check`, `format:check`, `check:format`) and shows each one's manager and body | `v1-final:scripts/lib/packages.mjs`, `proposeCheckScripts` | Removed | None | `checks.*` default to empty and are set with `--set` or by hand (spec 13.2, 13.5) |
| 17 | An update migrates a full check command to a script name | `v1-final:scripts/lib/packages.mjs`, `migrateChecks` | Removed | None | No V1 hosts exist, and `ags.yaml` format 1 is rejected (spec 13.1) |
| 18 | `canonicalRoot` setting in `.agents/ags.yaml`, checked against this AGS | `v1-final:scripts/lib/host.mjs`, settings validation, "settings canonicalRoot is required" | Removed | None | Hosts hold copies and never read AGS (spec 6 invariant 2, 25) |
| 19 | Retargeting hosts after AGS moves: `adoptCanonicalRoot`, `retargetHosts` and the global install's retarget pass | `v1-final:scripts/lib/host.mjs`, `adoptCanonicalRoot`, `retargetHosts`; `v1-final:scripts/install-global.mjs`, `finishInstall` | Removed | None | No host stores an AGS path (spec 25) |
| 20 | Probe that the AGS root is readable and writable: `assertCanonicalAccess` | `v1-final:scripts/lib/util.mjs`, `assertCanonicalAccess` | Removed | None | Hosts need no access to AGS at runtime (spec 6 invariant 2) |
| 21 | `requires-host-location` exceptions: `skills.localExceptions`, `localExceptions`, `projectionProblems`, `skills install --route` | `v1-final:scripts/lib/host.mjs`, `skills.localExceptions`; `v1-final:scripts/lib/skills.mjs`, `projectionProblems`, `installSkill` | Removed | None | Every skill is installed in the host, and host skills are host-owned (spec 11.6, 25) |
| 22 | `.agents/AGS.md` rendering: `renderHostEntry` and `templates/host-ags.md` | `v1-final:scripts/lib/render.mjs`, `renderHostEntry`; `v1-final:templates/host-ags.md` | Removed | None | The AGS block inlines the core and the rule index (spec 5, 16.11); the template's concepts are `v1-final:templates/host-ags.md` rows 1–9 |
| 23 | Moving host files aside into `.tmp/ags-quarantine/<stamp>/`: `quarantine` | `v1-final:scripts/lib/util.mjs`, `quarantine` | AGS | `scripts/lib/backup.mjs` (backup folders with renaming and a manifest) | Spec 16.1, Appendix E.4 |
| 24 | Adding `/.tmp/` to the git exclude file: `ensureHostTmpIgnored` | `v1-final:scripts/lib/util.mjs`, `ensureHostTmpIgnored` | AGS | `scripts/lib/render.mjs` (the exclude block) | Spec 16.12 |
| 25 | `.agents/ags.yaml` and `hosts.yaml` format 1 | `v1-final:scripts/lib/host.mjs`, `validateRegistry` and the settings writer, `format: 1` | AGS | `scripts/lib/config.mjs` and `scripts/lib/registry.mjs` (format 2) | Format 1 is rejected with a message; no V1 hosts exist (spec 13.1, 16.13) |
| 26 | The host `ags snapshot` collects the selected skills and companions from the AGS tree and adds `resolution.json` | `v1-final:scripts/lib/snapshot.mjs`, `writeSnapshot`, "resolution.json" | Removed | None | The host holds its installed copies; the snapshot zips `AGENTS.md` and `.agents/**` with a manifest (spec 20) |
| 27 | Snapshot exclusions: the standard sensitive-path list and `.agents/local/.ags-exclude` | `v1-final:scripts/lib/snapshot.mjs`, `excludedRelative`, `localExcluded` | Removed | None | The snapshot holds only `AGENTS.md` and `.agents/**`, which hold guidance and settings (spec 20); see `.tmp/archive/2026-09/ags-future-work-notes.md` row 14 |
| 28 | Default host snapshot path `.tmp/ags-snapshot.zip` | `v1-final:scripts/ags.mjs`, `snapshotCommand` | AGS | `scripts/lib/snapshot.mjs`: `.tmp/ags/snapshots/<YYYY-MM-DD-HHmmss>.zip` | `.tmp/ags/` is reserved for the command (spec 17.2, 20) |
| 29 | `ags doctor` finds a host from the working directory or its parents | `v1-final:scripts/ags.mjs`, `main`, "doctor", `findHostUp` | Removed | None | Host checks run when `--route` names the host; without it, `doctor` checks AGS (spec 22.2, 23) |
| 30 | `ags diff` and `ags check` resolve the host through the registry and run code from the AGS tree | `v1-final:scripts/ags.mjs`, `diffCommand` (`verifyRegistered`), `checkCommand` (`resolveRoute`, `runChecks`) | AGS | `scripts/ags.mjs`: aliases that run the host's installed `write-commit-diff` and `check` scripts | Spec 19, 22.1 |
| 31 | Install prints "Recommended: ui-library-css includes …" among the offered skills | `v1-final:scripts/lib/host.mjs`, install plan, `plan.recommended` | Removed | None | A detected skill installs with its companions, and a terminal offers the opt-in items (spec 12.1, 12.4, 16.4) |

### v1-final:catalog.yaml

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | `format: 1` | `v1-final:catalog.yaml`, `format` | AGS | `catalog.yaml` (`format: 2`); `scripts/lib/catalog.mjs` | Spec 14, 14.2 |
| 2 | `rules: []`: no rule in the catalog; the core was loaded outside it | `v1-final:catalog.yaml`, `rules` | AGS | `catalog.yaml`, rules `core` (`tier: strong`) and `tmp-conventions` (`tier: soft`) | Spec 14, 14.1 |
| 3 | The eight skill ids | `v1-final:catalog.yaml`, `skills` | AGS | `catalog.yaml` (same ids) | No id is removed or renamed in `2.0.0` |
| 4 | `kind: custom` or `third-party` | `v1-final:catalog.yaml`, every skill, `kind` | Removed | None | Every catalog skill installs the same way; third-party import is `BACKLOG.md`, Third-party skills, "Import" (spec 14.1, 30 item 6) |
| 5 | `path` of each entry | `v1-final:catalog.yaml`, every skill, `path` | Removed | None | Paths derive from ids (spec 14.1, 30 item 6) |
| 6 | Catalog `description` of each entry | `v1-final:catalog.yaml`, every skill, `description` | AGS | `skills/<id>/SKILL.md` frontmatter `description` | One source per description (spec 11.4, 14.1) |
| 7 | `default: true` or `false` | `v1-final:catalog.yaml`, every skill, `default` | AGS | `catalog.yaml` `install` (`always`, `detected`, `opt-in`) | `plan-work` became `always`, `ui-library-css` `detected` (spec 12.1) |
| 8 | `entryPoint: false` makes a skill companion-only, never selected directly | `v1-final:catalog.yaml`, `css-theme-tokens`, `entryPoint`; `v1-final:scripts/lib/catalog.mjs`, `isEntryPoint` | Removed | None | Every skill has an install class; companions come with their parent through `includes`, and a companion of a selected parent cannot be disabled (spec 12.1, 12.4, 14.1) |
| 9 | `keywords` required on every entry | `v1-final:catalog.yaml`, every skill, `keywords` | AGS | `catalog.yaml` (optional `keywords`, kept for existing ids); `ags skills list` | Spec 14.1, 22.2 |
| 10 | `when` conditions (`any`, `package`) | `v1-final:catalog.yaml`, `ui-library-css`, `when` | AGS | `catalog.yaml` `when`; `scripts/lib/packages.mjs` (detection) | Spec 12.2 |
| 11 | `includes` companions | `v1-final:catalog.yaml`, `ui-library-css` and `css-authoring-conventions`, `includes` | AGS | `catalog.yaml` `includes` | Spec 12.4 |
| 12 | `source` provenance field for third-party skills | `v1-final:scripts/lib/catalog.mjs`, `SKILL_FIELDS` | Backlog | `BACKLOG.md`, Third-party skills, "Import" | |

## Run 2: Watcher backup

Sources are files in Watcher's prepare backup, `.tmp/ags/backups/2026-09-28-144501-prepare/` (taken from Watcher commit `d40179a`), named relative to that folder. Destinations prefixed "Watcher" are paths in the Watcher repository. Rows first written as `Migrate later` were resolved in place during the Run 2 consolidation (step 4) and its audit.

### Before prepare: Graphify and Fallow

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Graphify output folder `graphify-out/` and its `.gitignore` block | Watcher `59dd875`, `graphify-out/`, `.gitignore` graphify block | Removed | None | Graphify left Watcher (Appendix G); the tool returns only through `BACKLOG.md`, Tools |
| 2 | Graphify merge driver: `.gitattributes` line and `merge.graphify.driver`, `merge.graphify.name` in local git config | Watcher `59dd875`, `.gitattributes`; local git config | Removed | None | Graphify left Watcher; the name was removed through cleanup finding 8 (`traces.md`) |
| 3 | Graphify git hooks `post-commit` and `post-checkout` that rebuild `graphify-out/` in the background | Watcher `.git/hooks/post-commit`, `.git/hooks/post-checkout` | Removed | None | Graphify-only content; they recreated `graphify-out/` after every commit. Copies in AGS `.tmp/records/2026-09-28-watcher-graphify-hooks/` |
| 4 | Repository-level Fallow install: `fallow` dependency, `.fallow/`, `.tmp/fallow-*` folders, `.fallowrc.json` `$schema` | Watcher `59dd875`, `package.json`, `.fallowrc.json` | Removed | None | Fallow is used globally, not per repository (Appendix G); `.fallowrc.json` stays as host tool configuration |
| 5 | Fallow dead-code cleanup report | Watcher `59dd875`, `fallow-recursive-dead-code-cleanup-report.md` | Host | Watcher `.tmp/records/fallow-recursive-dead-code-cleanup-report.md` | A local record, not guidance |

### AGENTS.md.bak

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Entry framing: `documentation/` is shared durable knowledge for humans and agents | `AGENTS.md.bak`, introduction | Host | Watcher `AGENTS.md`, "Watcher" | |
| 2 | `.agents/` as the AGS-owned layer; generated adapters are pointers | `AGENTS.md.bak`, introduction | Removed | None | Superseded by the AGS block and managed files (spec 10) |
| 3 | Precedence list | `AGENTS.md.bak`, "Precedence" | Removed | None | The AGS block's precedence line and `core` state it |
| 4 | Generated fact block and its sync markers | `AGENTS.md.bak`, "Generated facts" | Host | Watcher `AGENTS.md`, "Repository profile" | Facts kept; the `agent:sync` markers are gone with the generator |
| 5 | Landmines 1 to 5 and 7 | `AGENTS.md.bak`, "Landmines" | Host | Watcher `AGENTS.md`, "Known pitfalls" | |
| 6 | Landmine 6: query Graphify before broad exploration | `AGENTS.md.bak`, "Landmines" 6 | Removed | None | Graphify left Watcher |
| 7 | Routing table | `AGENTS.md.bak`, "Routing" | Removed | None | The AGS block indexes host rules; documentation pointers moved to "Documentation" (row 9) |
| 8 | Skills table | `AGENTS.md.bak`, "Skills (on demand)" | Removed | None | Native skill discovery under `.agents/skills/` |
| 9 | Documentation pointers (architecture, styling, UI, dev environment) | `AGENTS.md.bak`, "Routing" | Host | Watcher `AGENTS.md`, "Documentation" | |
| 10 | Done means `yarn type-check && yarn lint` | `AGENTS.md.bak`, "Hygiene" 1 | Host | Watcher `AGENTS.md`, "Commands"; `checks.type`, `checks.lint` in `.agents/ags.yaml` | |
| 11 | Run `yarn agent:verify` when changing agent docs | `AGENTS.md.bak`, "Hygiene" 1 | Removed | None | The verifier is gone (`_agents/scripts/verify-profile.mjs` rows); `ags doctor` checks the AGS layout |
| 12 | Finishing a task is not a commit; commit, push, open merge requests only when asked | `AGENTS.md.bak`, "Hygiene" 1 and 2 | Host | Watcher `AGENTS.md`, "Working here" | Applies to every task: one line |
| 13 | Scratch writes go to `.tmp/` | `AGENTS.md.bak`, "Hygiene" 3 | AGS | `rules/tmp-conventions.md` | |
| 14 | Keep `tmp/` ignored as a safety net, do not use it | `AGENTS.md.bak`, "Hygiene" 3 | Host | Watcher `AGENTS.md`, "Working here" | |
| 15 | Touch only needed lines; no drive-by refactors; do not mix formatting and behavior; soft cap of 300 lines | `AGENTS.md.bak`, "Hygiene" 4 to 6 | AGS | `rules/code-idioms.md`, "Changes" | |
| 16 | Skim code idioms, state topology and `documentation/ui.md` before such work | `AGENTS.md.bak`, "Hygiene" 7 | Removed | None | Host rule descriptions in the AGS block route this |
| 17 | Validate at system boundaries; no defensive checks on internal paths | `AGENTS.md.bak`, "Hygiene" 8 | AGS | `rules/code-idioms.md`, "Changes" | |
| 18 | TODOs cite a ticket or plan | `AGENTS.md.bak`, "Hygiene" 9 | AGS | `rules/code-idioms.md`, "Changes" | |
| 19 | Candidate learnings pointer | `AGENTS.md.bak`, "Hygiene" 10 | Host | Watcher `AGENTS.md`, "Working here"; `.agents/local/candidates.md` | |
| 20 | Machine-local notes in `.agents/guidance/local.md` | `AGENTS.md.bak`, "Hygiene" 11 | Removed | None | Old guidance system; `.agents/local/` holds host notes (spec 11.6) |
| 21 | Suggest recording pilot feedback in `PILOT-OBSERVATIONS.md` | `AGENTS.md.bak`, "Hygiene" 12 | Removed | None | The pilot ended with the AGS install; the log is kept as a record (`_agents/stewardship/PILOT-OBSERVATIONS.md` row) |

### CLAUDE.md.bak

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Pointer from `CLAUDE.md` to `AGENTS.md` | `CLAUDE.md.bak` | Removed | None | Claude Code 2.1.281 (checked in Run 2 step 1.2) reads `AGENTS.md` |

### _agents/README.md, _agents/guidance/README.md, _agents/guidance/local.example.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Tree map of `.agents/` and its roles | `_agents/README.md`, "Tree" | Removed | None | The AGS layout replaces it (spec 10) |
| 2 | `documentation/` is a first-class source, not absorbed into guidance | `_agents/README.md`; `_agents/guidance/README.md`, "Shared repository knowledge" | Host | Watcher `AGENTS.md`, "Watcher" | |
| 3 | Non-AGS scripts stay under `scripts/` | `_agents/README.md` | Removed | None | Describes the old tree; `scripts/` is plain repository code |
| 4 | Setup with `agent:sync`, `agent:verify`, `agent:migrate` | `_agents/README.md`, "Setup"; `_agents/guidance/README.md`, "After clone", "Scripts" | Removed | None | The scripts are gone; `ags host install` and `ags doctor` replace them |
| 5 | Guidance layout table | `_agents/guidance/README.md`, "Layout" | Removed | None | The AGS block indexes host rules |
| 6 | Machine-local notes template | `_agents/guidance/local.example.md` | Removed | None | `.agents/local/` replaces it (spec 11.6) |

### _agents/guidance/repository-profile.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Fact block (trunk, verification, React, TypeScript, TanStack Query, build, API hooks only, testing) | "Fact block" | Host | Watcher `AGENTS.md`, "Repository profile", "Commands" | |
| 2 | "Last verified" SHA and machine-verification markers | Introduction | Removed | None | The verifier is gone; host fact verification is `Backlog` (`_agents/scripts/` row 6) |
| 3 | Verified premises 1 to 3 and 5 (Vite and Express monolith, TanStack v5, Vitest outside baseline, barrels) | "Verified premises" | Host | Watcher `AGENTS.md`, "Repository profile", "Commands" | |
| 4 | Verified premise 4 and "Graphify ownership" | "Verified premises" 4, "Graphify ownership" | Removed | None | Graphify left Watcher |
| 5 | Adapter landmines | "Adapter landmines" | Host | Watcher `AGENTS.md`, "Known pitfalls" | Same list as `AGENTS.md.bak` row 5; landmine 6 removed there |
| 6 | Tooling pins (Yarn, Vite, Express, Prettier, ESLint) | "Tooling pins" | Host | Watcher `AGENTS.md`, "Repository profile", "Commands" | |

### _agents/guidance/git-conventions.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Subject shape `Type: Scope, summary`, type list, examples; not Conventional Commits; no Jira | "Subject line" | AGS | `skills/commit-granular/SKILL.md`, "Subject"; Watcher's empty `git.ticketPrefix` in `.agents/ags.yaml` covers "no Jira" | Watcher's `Endpoint` and `Module` kinds are in the shared thing-kind list |
| 2 | Dividing commits | "Dividing commits" | AGS | `skills/commit-granular/SKILL.md`, "Dividing commits" | |
| 3 | Required body | "Body (required)" | AGS | `skills/commit-granular/SKILL.md`, "Body" | |
| 4 | What never goes in | "What never goes in" | AGS | `skills/commit-granular/SKILL.md`, "Never in a message" | |
| 5 | Scratch diffs under the clone's `tmp/` | "Scratch diffs" | Removed | None | Contradicts `tmp-conventions`; `write-commit-diff` writes under `.tmp/scratch/` (consolidation rule 1) |
| 6 | Trunk `main` | "Trunk" | Host | Watcher `git.mainBranch` in `.agents/ags.yaml` | The interim `git-conventions` rule was deleted at step 5.1 (P26; Watcher `0c08216`) |
| 7 | Ship pointer with the GitLab merge request URL | "Ship" | AGS | `skills/ship/SKILL.md`, "7. Push", "8. Merge request" | The provider comes from Watcher's remote |
| 8 | Commit range diffs pointer | "Commit range diffs" | AGS | `skills/write-commit-diff/SKILL.md` | Native skill discovery routes it |

### _agents/guidance/code-idioms.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Component structure example and ordering | "Component structure" | AGS | `rules/code-idioms.md`, "Component structure" | |
| 2 | Types | "Types" | AGS | `rules/code-idioms.md`, "Types" | |
| 3 | Imports (relative client imports, `@shared`, server `.js` imports) | "Imports" | Host | Watcher `.agents/rules/watcher-code-idioms.md`, "Imports" | |
| 4 | Callbacks and hooks | "Callbacks and hooks" | AGS | `rules/code-idioms.md`, "Callbacks and hooks" | |
| 5 | State ladder, no mirrored server state, no prop drilling, ask before Context | "State ladder" | AGS | `rules/code-idioms.md`, "State" | |
| 6 | Client API boundary and naming | "Client API" | Host | Watcher `.agents/rules/watcher-code-idioms.md`, "Client API" | |
| 7 | Components and UI | "Components and UI" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 8 | Vitest outside baseline; colocated tests | "Testing" | Host | Watcher `AGENTS.md`, "Commands"; `.agents/rules/watcher-code-idioms.md`, "Tests" | |
| 9 | Named exports only; no default exports | "Component structure" | Host | Watcher `.agents/rules/watcher-code-idioms.md`, "Component structure" | Stricter than the shared "prefer named exports" (consolidation rule 4: D2 and HXP say "prefer") |
| 10 | Shared types in `src/shared/types/`; client-only types under the feature | "Types" | Host | Watcher `.agents/rules/watcher-code-idioms.md`, "Types" | |
| 11 | Combine imports from one module; no React import only for JSX | "Imports" | AGS | `rules/code-idioms.md`, "Component structure" | |
| 12 | Orchestrator feature hooks fetch, digest and expose actions | "Client API" | AGS | `rules/code-idioms.md`, "Feature composition hooks" | Watcher's API-hook source stays in the host rule (row 6) |
| 13 | Reuse ladder without an external UI library; tag styles in the global theme SCSS; `documentation/ui.md` defaults for new work, not a mandate to restyle; Zustand and TanStack Query as the state libraries | "Components and UI", "State ladder" | Host | Watcher `.agents/rules/watcher-code-idioms.md`, "State and components" | |

### _agents/guidance/state-topology.md, _agents/guidance/state/README.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Record labels, the fifteen fields, the method | `state-topology.md`, "Record labels", "The fifteen fields", "Method" | AGS | `rules/state-topology.md` | Watcher's "Last verified SHA" is kept as "names the commit it was last verified against" (rule 4, only Watcher states it) |
| 2 | Watcher ownership snapshot and modal route codec | `state-topology.md`, "Watcher ownership snapshot" | Host | Watcher `.agents/rules/watcher-state-topology.md` | |
| 3 | Optional topology records | `state-topology.md`, "Records"; `state/README.md` | Host | Watcher `.agents/local/state/README.md` | Its link points at `watcher-state-topology.md` |

### _agents/guidance/diagnostics.md, _agents/guidance/server.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Diagnostics mode: enable, in-app log, reading `[wdiag]`, probes, retire procedure, implementation map | `diagnostics.md` | Host | Watcher `.agents/rules/diagnostics.md` | |
| 2 | Express layout, endpoints, entities, operation logs, file operations, imports, after-change steps | `server.md` | Host | Watcher `.agents/rules/server.md` | |

### _agents/guidance/candidates.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Forward drift and explicit non-candidates | "Forward drift", "Explicit non-candidates" | Host | Watcher `.agents/local/candidates.md` | |
| 2 | Candidates-list format and how candidates mature | "How candidates mature" | Removed | None | Promotion through AGS and `BACKLOG.md` replace the candidates workflow; step 5.1 keeps Watcher's substantive candidate entries |

### _agents/skills/

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | `css-authoring-conventions`: concepts the installed skill states | `skills/css-authoring-conventions/SKILL.md`, "Declarations", "Selectors and naming", "Markup and components", "Style-related APIs" | AGS | `skills/css-authoring-conventions/SKILL.md` | |
| 2 | `css-authoring-conventions`: Watcher documents, shell primitives, `src/client/components`, density, `ButtonTheme`, `Portal` | same file, "Authority" and Watcher-named bullets | Host | Watcher `.agents/local/css-authoring-conventions.md` | |
| 3 | `css-authoring-conventions`: preserve global marker classes; floating surfaces layer above their owner | same file, "Selectors and naming", "Markup and components" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Selectors and naming" (marker classes), "Markup and composition" (floating surfaces) | |
| 4 | `css-cleanup`: grep audit, confirm, remove, verify | `skills/css-cleanup/SKILL.md` | AGS | `skills/css-cleanup/SKILL.md` | |
| 5 | `css-cleanup`: no audit script in `package.json`; importers under `src/` | same file | Host | Watcher `.agents/local/css-cleanup.md` | |
| 6 | `css-cleanup`: prefer keep over break; check nested selectors, `composes`, marker classes | same file | AGS | `skills/css-cleanup/SKILL.md`, "Confirm and remove" (introduction and step 2) | |
| 7 | `css-theme-tokens` Watcher variant: `* 1` and single-variable `calc`, prefer existing tokens over hard-coded values, shortest default-`ease` transition including dropping `all` | `skills/css-theme-tokens/SKILL.md` | AGS | `skills/css-theme-tokens/SKILL.md`, "Normalize" 1, 2, 4 and 6 | |
| 8 | `git-cleanup`: trigger, scope, fetch and prune, stale-based, confirm before delete, preview of unpushed work | `skills/git-cleanup/SKILL.md` | AGS | `skills/git-cleanup/SKILL.md` | |
| 9 | `git-cleanup`: remote, `origin/main`, 30 days, `master` and `develop`, `backup-` prefix | same file, "Config" | AGS | `skills/git-cleanup/SKILL.md`, "Remote and main reference", "Exclusions" | The 30 days, the protected names and the prefix are shared text; `origin/main` derives from `git.mainBranch` and the remote is read from Git; the Watcher host note was deleted at step 5.1 (Watcher `0c08216`) |
| 10 | `git-cleanup`: three levels (gone upstreams, stale locals, preview only) | same file, "Orchestration", "Level 1" to "Level 3" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" | |
| 11 | `graphify` skill | `skills/graphify/SKILL.md` | Backlog | `BACKLOG.md`, Tools, "Tools catalog and `ags tools`" | Graphify left Watcher |
| 12 | `plan-work`: skeleton, decision log, done when, skip tiny fixes | `skills/plan-work/SKILL.md` | AGS | `skills/plan-work/SKILL.md` | |
| 13 | `plan-work`: naming `YYMMDD-snake_case` and `.cursor/plans/` drafts | same file, "Naming", "Location and lifecycle" | Removed | None | `tmp-conventions` sets `.tmp/plans/YYYY-MM-DD-kebab-slug.md` (consolidation rule 1) |
| 14 | `plan-work`: promote durable notes when done (to `.agents/archive/`, now `documentation/`) | same file, "Location and lifecycle" 3 | Host | Watcher `.agents/local/plan-work.md` | The archive folder left with the old tree |
| 15 | `plan-work`: the five-file threshold, when-to-plan list, review drafts in merge requests or tickets | same file, "Trigger", "When to plan", "Location and lifecycle" 1 | AGS | `skills/plan-work/SKILL.md`, "Trigger", "When to plan", "Where plans go" | Consolidated in 2.1.0 |
| 16 | `ship` Watcher variant | `skills/ship/SKILL.md` | AGS | `skills/ship/SKILL.md` | Every step is in the consolidated skill, with `main` from `git.mainBranch`; its "rebuild Graphify only on request" line is dropped because Graphify left Watcher |
| 17 | `write-commit-diff`: last N and range modes, `.tmp` output, report the path not the content | `skills/write-commit-diff/SKILL.md` | AGS | `skills/write-commit-diff/SKILL.md`; `skills/write-commit-diff/scripts/write-commit-diff.mjs` (`commits`, `range`) | |
| 18 | `write-commit-diff`: trigger phrases (generate, create, make a diff of commits, export a range, last N) | same file, "Trigger" | AGS | `skills/write-commit-diff/SKILL.md` | Promoted from Watcher in the Run 2 round-trip edit (2.0.1) |
| 19 | `write-commit-diff`: script instead of pasted or hand-rolled diffs; ask once on an ambiguous range; file naming; reply with the commits; not for ordinary `git diff` | same file, "Procedure", "Do not" | AGS | `skills/write-commit-diff/SKILL.md`, introduction, "Procedure" | Consolidated in 2.1.0 |
| 20 | `write-commit-diff`: output `.tmp/<name>.diff` | same file | Removed | None | `tmp-conventions` puts scratch output under `.tmp/scratch/` |
| 21 | `write-last-n-diff.ps1`, `write-range-diff.ps1`: PowerShell implementations | `skills/write-commit-diff/*.ps1` | Removed | None | Superseded by the Node script; their `commits` and `range` behavior is row 17 |
| 22 | `write-range-diff.ps1`: `-Repo` other checkout and `-OutInRepo` | `skills/write-commit-diff/write-range-diff.ps1` | AGS | `skills/write-commit-diff/SKILL.md`, "Command" | Represented by running the script with the other checkout as the working directory, which equals `-Repo` with `-OutInRepo`; `-Repo` alone is `Removed` (`## Run 2: consolidation`, `### write-commit-diff` row 10) |
| 23 | `css-theme-tokens` Watcher variant: token source `src/client/style/variables.scss`, global shell SCSS under `src/client/style/`, the token list, the `documentation/styling.md` pointer | `skills/css-theme-tokens/SKILL.md`, "Reference" and introduction | Host | Watcher `.agents/local/css-theme-tokens.md` | Split from row 7; the interim host skill `watcher-css-theme-tokens` was deleted at step 5.1 (Watcher `0c08216`) |

### _agents/archive/, _agents/stewardship/

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | History curation rule (five records, no living documents) | `archive/README.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/archive/README.md` | Kept as a record |
| 2 | Agent Skills discovery migration record | `archive/agent-skills-discovery-migration.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/archive/` | |
| 3 | Front-end architecture pause handoff | `archive/frontend-architecture-pause.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/archive/`; summary in `.agents/rules/watcher-state-topology.md` | |
| 4 | Pilot observations log and its recording rules | `stewardship/PILOT-OBSERVATIONS.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/stewardship/` | Record (P13) |
| 5 | Steward handoff: why the guidance system exists | `stewardship/STEWARD-HANDOFF.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/stewardship/` | Record (P13) |
| 6 | Meta discovery (`isMeta`, `COSMOS_META`) | `stewardship/meta.md` | Removed | None | AGS replaces Meta discovery (P13) |
| 7 | Machine-local notes: no browser-use CDP; Playwright with headless Chromium | `guidance/local.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/guidance/local.md` | Machine-local; the browser concept is `Backlog` with `windows-browser-use` (Phase E) |

### _agents/scripts/, _cursor/

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Adapter generator | `scripts/generate-adapters.mjs` | Removed | None | The AGS block replaces generated adapters |
| 2 | LLM snapshot script | `scripts/snapshot-llm-system.mjs` | Removed | None | `ags snapshot` replaces it |
| 3 | Leftover mover | `scripts/migrate-local.mjs` | Removed | None | The AGS cutover (prepare) replaces it |
| 4 | Scripts README and diff helper usage | `scripts/README.md` | Removed | None | The scripts are gone; diff usage lives in `skills/write-commit-diff/SKILL.md` |
| 5 | Profile verifier: layout checks | `scripts/verify-profile.mjs` | Removed | None | Superseded by `ags doctor` (P12) |
| 6 | Profile verifier: repository facts checked against the repository | `scripts/verify-profile.mjs` | Backlog | `BACKLOG.md`, Guidance, "Host fact verification" | No AGS home yet (P12) |
| 7 | Generated Cursor pointer rule | `_cursor/rules/00-watcher-generated.mdc` | Removed | None | The AGS block supersedes it; its landmines are in Watcher `AGENTS.md` |

## Run 2: consolidation

### commit-granular

Sources: "Personal" is the pre-routing-edit personal skill, AGS `.tmp/records/2026-09-28-run2-layer0-before/commit-granular-SKILL.md`; "D2" is `designer2/.agents/guidance/git-conventions.md`; "HXP" is `hxpoc/.agents/guidance/git-conventions.md`. Destinations are in `skills/commit-granular/SKILL.md` unless named otherwise.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Read the project's `.cursor/rules/git.mdc` first; it overrides the skill | Personal, "Procedure" 1 | AGS | Intro ("Host guidance wins on formats"); `rules/core.md` host-note line | Host guidance (`AGENTS.md`, host rules, `.agents/local/commit-granular.md`) replaces `git.mdc` (spec 11.6) |
| 2 | Read status, staged and unstaged diff, and `git log -8 --oneline` to match repository style | Personal, "Procedure" 2 | AGS | "Procedure" 1 | |
| 3 | Group, present nothing, commit in dependency order, each commit buildable | Personal, "Procedure" 3 | AGS | "Procedure" 2 | |
| 4 | Stage precisely by path; hunk-level only when one file mixes unrelated changes | Personal, "Procedure" 4 | AGS | "Procedure" 3 | |
| 5 | Final `git status`; report intentional leftovers | Personal, "Procedure" 5 | AGS | "Procedure" 4 | |
| 6 | Subject shape `{Scope}: {Target}, {Change}` with an optional brief description | Personal, "Commit message format"; D2, "Commit message format" | AGS | "Subject" | Same shape as HXP and Watcher `Type: Scope, summary`; the optional part is stated only by D2 among hosts, so the personal form wins (rule 4) |
| 7 | Kind list with precedence (`Fix` … `Test`, including `Utility`, `Configuration`) | Personal, "Commit message format"; D2, "Commit message format" | AGS | "Subject", Kind | Merged with the HXP and Watcher lists; `Configuration` becomes `Config` (HXP and Watcher, rule 4); precedence kept (only D2 among hosts states it; personal agrees) |
| 8 | Kind list with `Chore` and open thing-kinds (`Component`, `Hook`, `Modal`) | HXP, "Commit subject" | AGS | "Subject", Kind | `Chore` placed last in the precedence |
| 9 | Imperative, no trailing period, not Conventional Commits | Personal, "Commit message format"; D2 and HXP, "Commit subject" and intro | AGS | "Subject" | |
| 10 | Subject examples | Personal, D2, HXP examples | AGS | "Subject" example block | Rewritten to the settled lower-case form |
| 11 | Change written with a capital (`Add`, `Fix`) | D2, "Commit message format" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | HXP and Watcher write the change in lower case (rule 4); D2 keeps its form as a host note at Phase E (rule 3, P23) |
| 12 | "Prefer this over HXP `Type: Scope`" | D2, intro | Removed | None | One shared format replaces the cross-host preference; the only remaining difference is row 11 |
| 13 | Ticket id in the branch name, not on every commit subject | D2, "Tickets and feature branches" | AGS | "Subject" (no ticket id); `skills/start-branch/SKILL.md`, "Branch name" | |
| 14 | Default is not to commit; task completion, green lint or end of turn is no cue; no "should I commit?" habit | D2 and HXP, "When to commit" | AGS | "When to commit" | |
| 15 | Ship, publish or push does not create commits; stop and ask if the tree is dirty and the user did not ask to commit | D2 and HXP, "When to commit" | AGS | "When to commit"; `skills/ship/SKILL.md`, "5. Commit" | Asking to ship is the explicit request to commit, so `ship` commits uncommitted work through `commit-granular` (spec 28.2); pushing or publishing alone commits nothing |
| 16 | Never update git config | D2, "When to commit" | AGS | "Procedure" | |
| 17 | Never force-push trunk | D2, "When to commit" | AGS | `skills/ship/SKILL.md`, "7. Push" | |
| 18 | One atomic, reviewable idea per commit; rename or move apart from content, including `.ts` to `.tsx`, identical content first | Personal, "Split strategy"; D2, "Dividing commits" | AGS | "Dividing commits" | |
| 19 | Split mechanical refactors; never mix logic, styles, docs and version bumps; a short series that reverts cleanly | HXP, "Dividing commits"; D2, "Dividing commits" (dependency bumps) | AGS | "Dividing commits" | |
| 20 | Cross-cutting app-level changes first unless tied to one feature | Personal, "Split strategy" | AGS | "Dividing commits" | |
| 21 | A fix gets its own commit above 10 lines, 2 hunks, or as the only change to a file set; tiny fixes may fold | Personal, "Split strategy" | AGS | "Dividing commits" | |
| 22 | Never mix formatting-only and behavioral changes | Personal, "Split strategy" | AGS | "Dividing commits" | |
| 23 | Required conceptual body of 2 to 4 short sentences on why, no file narration | HXP, "Commit body" | AGS | "Body" | HXP and Watcher require it; D2 and the personal skill are silent (rule 4) |
| 24 | No "This commit…", no AI attribution, no emoji | HXP, "Commit body" | AGS | "Never in a message" | |

### start-branch

Sources: "start-ticket" is the same skill in three copies, `meta/templates/ags/shared/skills/start-ticket/SKILL.md` (Meta), `designer2/.agents/skills/start-ticket/SKILL.md` (D2) and `hxpoc/.agents/skills/start-ticket/SKILL.md` (HXP), which differ only in naming the section of their conventions file; "D2 conventions" and "HXP conventions" are `designer2/` and `hxpoc/.agents/guidance/git-conventions.md`; "Personal ship" is AGS `.tmp/records/2026-09-28-run2-layer0-before/ship-SKILL.md`. Destinations are in `skills/start-branch/SKILL.md` unless named otherwise.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Trigger: start ticket work, create a feature branch for a Jira id, check out new work from a ticket | start-ticket (Meta, D2, HXP), "Trigger" | AGS | "Trigger" | Widened to work without a ticket and to `ship`'s request |
| 2 | Naming, commit, merge request and ticket formats live only in `git-conventions.md`; do not restate or copy templates | start-ticket (Meta, D2, HXP), intro and "Do not" 3 | Removed | None | P26: branch naming lives in `start-branch`, the commit format in `commit-granular`, the merge request title in `ship` |
| 3 | Precondition: a ticket id or an explicit branch name | start-ticket (Meta, D2, HXP), "Preconditions" 1 | AGS | "Branch name" | A slug without a ticket is allowed when the prefix is empty or the user says there is none (Appendix D) |
| 4 | Working tree clean enough to switch branches, or uncommitted state accepted | start-ticket (Meta, D2, HXP), "Preconditions" 2 | AGS | "Create the branch" 1 | |
| 5 | Confirm the ticket and a kebab slug of 1 to 3 words; a full branch name from the user is used as given | start-ticket (Meta, D2, HXP), "Procedure" 1 | AGS | "Branch name" | |
| 6 | Fetch, update trunk with `--ff-only`, branch from it; never from an unrelated feature branch unless told | start-ticket (Meta, D2, HXP), "Procedure" 2 | AGS | "Create the branch" 3 | Trunk read from `git.mainBranch` |
| 7 | Report the current branch and that HEAD matches the remote trunk | start-ticket (Meta, D2, HXP), "Procedure" 3 | AGS | "Create the branch" 5 | |
| 8 | Do not invent a ticket id; ask | start-ticket (Meta, D2, HXP), "Do not" 1 | AGS | "Branch name"; "Do not" | |
| 9 | Do not commit, push or open a merge request; `ship` does | start-ticket (Meta, D2, HXP), "Do not" 2 | AGS | "Do not" | |
| 10 | Trunk `integration-2025Q1` in the commands | start-ticket (Meta) | Removed | None | Superseded by `git.mainBranch`; the D2 and HXP fact is row 11 |
| 11 | Trunk `integration-2025Q1` as the base of new branches | start-ticket (D2, HXP); D2 and HXP conventions, "Tickets and feature branches", "Feature branches" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host fact, their `git.mainBranch` or host note (P23) |
| 12 | Tickets look like `CORE-<number>` | D2 and HXP conventions, "Tickets and feature branches", "Feature branches" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host value of `git.ticketPrefix` (P23) |
| 13 | Branch is the ticket plus a kebab slug of 1 to 3 words, with examples | D2 and HXP conventions, same sections | AGS | "Host settings" (Appendix D); "Branch name" | |
| 14 | Bare `CORE-<number>` branches exist; prefer the slug form for new work | D2 and HXP conventions, same sections | AGS | "Branch name" | |
| 15 | Use the branch the user names; otherwise derive a kebab-case name, prefixed with the ticket when the work has one | Personal ship, "Procedure" 1 | AGS | "Branch name" | |
| 16 | Stay on a suitable feature branch; otherwise `git checkout -b <branch>` from the current HEAD | Personal ship, "Procedure" 2 | AGS | `skills/ship/SKILL.md`, "3. Branch"; "Create the branch" 4 | Branching from the current commit is kept for work already committed there; new work starts from the updated main branch (start-ticket) |

### ship

Sources: "ship (Meta, D2, HXP)" is the same skill in three copies, `meta/templates/ags/shared/skills/ship/SKILL.md`, `designer2/.agents/skills/ship/SKILL.md` and `hxpoc/.agents/skills/ship/SKILL.md` (HXP lacks the Graphify line); "D2 conventions" and "HXP conventions" are `designer2/` and `hxpoc/.agents/guidance/git-conventions.md`; "Personal" is AGS `.tmp/records/2026-09-28-run2-layer0-before/ship-SKILL.md` ("Procedure" 1 and 2 are rowed under `start-branch`); "AGS 2.0.1" is `skills/ship/SKILL.md` at `v2.0.1` (only changed or dropped concepts). Destinations are in `skills/ship/SKILL.md` unless named otherwise.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Trigger: ship, publish or push a feature branch for review | ship (Meta, D2, HXP), "Trigger" | AGS | "Trigger" | |
| 2 | Working tree clean enough to push, or remaining changes accepted | ship (Meta, D2, HXP), "Preconditions" 1 | AGS | "2. Ask once"; "5. Commit" | |
| 3 | The branch is not the integration trunk | ship (Meta, D2, HXP), "Preconditions" 2 | AGS | "3. Branch"; "7. Push" | Ship now creates a branch instead of stopping |
| 4 | Commit messages already follow the conventions file | ship (Meta, D2, HXP), "Preconditions" 3 | AGS | "5. Commit"; `skills/commit-granular/SKILL.md` | |
| 5 | Confirm branch and commits: status, current branch, `git log` against the remote trunk | ship (Meta, D2, HXP), "Procedure" 1 | AGS | "1. Inspect"; "4. Target" | |
| 6 | Push with upstream; never force-push trunk | ship (Meta, D2, HXP), "Procedure" 2 | AGS | "7. Push" | |
| 7 | Prefer the create-MR URL the remote prints, or construct the GitLab URL with source and target | ship (Meta, D2, HXP), "Procedure" 3 | AGS | "8. Merge request", Link | GitHub form added from AGS 2.0.1 |
| 8 | Merge request title from the conventions file, ticket from the branch name | ship (Meta, D2, HXP), "Procedure" 4 | AGS | "8. Merge request", Title | P26 |
| 9 | Final response: pushed, upstream tracking, working tree status, MR link (not only the branch name) | ship (Meta, D2, HXP), "Procedure" 5 | AGS | "Final response" | |
| 10 | Do not create commits unless the user also asked to commit | ship (Meta, D2, HXP), "Do not" 1 | Removed | None | Asking to ship is the explicit request to commit, so `ship` commits uncommitted work through `commit-granular` (spec 28.2 "commit with the host's subject and body conventions") |
| 11 | Do not prompt to connect Jira or GitLab MCP; do not block on their auth prompts | ship (Meta, D2, HXP), "Do not" 2; HXP conventions, "Merge request title" | AGS | "Do not" | |
| 12 | Do not skip the MR URL | ship (Meta, D2, HXP), "Do not" 3 | AGS | "8. Merge request", Link | |
| 13 | Target `integration-2025Q1`, not `main` or `master` | ship (Meta), "Do not" 4 | Removed | None | Superseded by `git.mainBranch` and the target step; the D2 and HXP fact is row 14 |
| 14 | Target and push trunk `integration-2025Q1` | ship (D2, HXP), "Do not" 4; D2 and HXP conventions, "Merge request title" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host fact (P23) |
| 15 | Self-contained; no personal skills or external ship scripts | ship (Meta, D2, HXP), "Do not" 5 | AGS | "Do not" (conventions file); links only to `includes` companions | |
| 16 | Regenerate `graphify-out/` only when asked | ship (D2), "Do not" 6 | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 tool fact (P23) |
| 17 | Regenerate `graphify-out/` only when asked | ship (Meta), "Do not" 6 | Backlog | `BACKLOG.md`, Tools, "Tools catalog and `ags tools`" | With Meta's `graphify.mdc` |
| 18 | End to end: branch, granular commits, push, merge request | Personal, description and intro | AGS | Description; steps 3 to 8 | |
| 19 | `disable-model-invocation: true` | Personal, frontmatter | Removed | None | P18; the description says to use it only on an explicit request |
| 20 | Commit through `commit-granular` | Personal, "Procedure" 3 | AGS | "5. Commit" | |
| 21 | Bugbot self-review on branch changes; fix genuine bugs with commits; report dismissed false positives; skip on "ship without review" | Personal, "Procedure" 4 | AGS | "6. Optional review" | Widened to a comparable review where Bugbot is absent (spec 28.2) |
| 22 | `git push -u origin <branch>` | Personal, "Procedure" 5 | AGS | "7. Push" | Remote read from Git |
| 23 | No GitLab or Jira MCP; use the printed create-MR URL or build `…/merge_requests/new?merge_request[source_branch]=<branch>` | Personal, "Procedure" 6 | AGS | "8. Merge request", Link; "Do not" | |
| 24 | Target the default integration branch unless told otherwise | Personal, "Procedure" 6 | AGS | "4. Target" | |
| 25 | Title `{JIRA-ID}: {Scope, summary}`, ticket from the branch, main commit's subject without its kind; description a bullet list of commits, ticket in prose if useful | Personal, "Procedure" 7 | AGS | "8. Merge request" | |
| 26 | Report the MR URL and a one-line review outcome | Personal, "Procedure" 8 | AGS | "Final response" | |
| 27 | Never force-push | Personal, "Notes" 1 | AGS | "7. Push" | Plan 4.3: ship never force-pushes; a rejected push stops and is reported |
| 28 | Mention pre-push hooks or CI that run after the push | Personal, "Notes" 2 | AGS | "7. Push" | |
| 29 | Title `{JIRA-ID}: {Scope, summary}` with no `Type:` prefix | HXP conventions, "Merge request title" | AGS | "8. Merge request", Title | |
| 30 | Ticket-prefixed title (`CORE-43738: PromptEditor, Add …`) | D2 conventions, "Merge request title" | AGS | "8. Merge request", Title | The capitalized change is `commit-granular` row 11 |
| 31 | Jira story title `HXP: {short phrase}` and outcome-focused body | HXP conventions, "Jira stories (work repos)" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host format (P23) |
| 32 | Defines no commit, branch-name or ticket format; follow host guidance | AGS 2.0.1, "Preconditions" 2 | Removed | None | P26: the formats now live in `commit-granular`, `start-branch` and `ship`; host guidance still overrides them (`rules/core.md`) |
| 33 | Commit only when the user explicitly asks | AGS 2.0.1, "Preconditions" 2 | AGS | "5. Commit"; `skills/commit-granular/SKILL.md`, "When to commit" | |
| 34 | The current branch is not the main branch | AGS 2.0.1, "Preconditions" 3 | AGS | "3. Branch" | Ship creates a branch through `start-branch` instead |
| 35 | Force-push only when the user explicitly asks and names a branch that is not protected | ship (Meta, D2, HXP), "Procedure" 2; AGS 2.0.1, "Inspect Git" | Removed | None | Plan 4.3: ship never force-pushes; a force push stays a manual user action |

### git-cleanup

Sources: `<MS>` = `meta/templates/ags/shared/skills/git-cleanup/SKILL.md`; D2 = `designer2/.agents/skills/git-cleanup/SKILL.md` (same text as `<MS>`); HXP = `hxpoc/.agents/skills/git-cleanup/SKILL.md`. All read on 2026-09-28.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Explicit trigger only; scope is the current clone | `<MS>`, D2, HXP, "Trigger", "Scope" | AGS | `skills/git-cleanup/SKILL.md`, "Trigger", "Scope" | |
| 2 | Provenance line "distilled from archived on-demand playbook" | `<MS>`, D2, first paragraph | Removed | None | Provenance only; states no behavior |
| 3 | `MAIN_REF`: a main reference on the remote that staleness and merges are judged against | `<MS>`, D2, HXP, "Config" | AGS | `skills/git-cleanup/SKILL.md`, "Remote and main reference" | Derived from `git.mainBranch`; the local branch when no remote exists |
| 4 | Trunk value `origin/integration-2025Q1` | `<MS>`, D2, HXP, "Config" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 and HXP trunk fact (P23); becomes their `git.mainBranch` |
| 5 | `INTEGRATION_REF` | `<MS>`, D2, HXP, "Config" | Removed | None | Equals `MAIN_REF` in every variant and no step reads it |
| 6 | `STALE_DAYS` of 30 | `<MS>`, D2, HXP, "Config" | AGS | `skills/git-cleanup/SKILL.md`, "Exclusions" | Shared by every variant |
| 7 | `BACKUP_PREFIX` `backup-` | `<MS>`, D2, HXP, "Config" | AGS | `skills/git-cleanup/SKILL.md`, "Exclusions" | Shared by every variant |
| 8 | `REMOTE` `origin` | `<MS>`, D2, HXP, "Config" | AGS | `skills/git-cleanup/SKILL.md`, "Remote and main reference" | Read from Git: one remote is used, several make the skill ask |
| 9 | Always excluded: current branch, `main`, `master`, `develop` | `<MS>`, D2, HXP, "Always excluded" | AGS | `skills/git-cleanup/SKILL.md`, "Exclusions" | |
| 10 | Always excluded: local branches named `integration-*` | `<MS>`, D2, HXP, "Always excluded" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 and HXP fact (P23); a protected-branch line of their host notes |
| 11 | Never delete because a branch looks merged; cleanup is stale-based | `<MS>`, D2, HXP, paragraph after the exclusions | AGS | `skills/git-cleanup/SKILL.md`, "Exclusions" | |
| 12 | Orchestration: fetch and prune first, stop and report after level 1, level 3 preview shown with level 2, level 2 deletes only a confirmed exact list, level 3 deletes only named items | `<MS>`, D2, HXP, "Orchestration" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" | |
| 13 | Level 1: gone upstreams found with `git for-each-ref ... %(upstream:track)` | `<MS>`, D2, HXP, "Level 1" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" 1 | |
| 14 | Level 1 deletes gone-upstream branches without asking | `<MS>`, D2, HXP, "Level 1" | Removed | None | Consolidation rule 1: AGS requires confirmation before each destructive command, so level 1 now deletes only confirmed candidates |
| 15 | Delete with `git branch -d`; if it refuses, never `-D`, escalate to level 3 | HXP, "Level 1" | AGS | `skills/git-cleanup/SKILL.md`, "Exclusions" | |
| 16 | Report deleted and skipped branches | HXP, "Level 1"; `<MS>`, D2, "Level 1" ("report what was deleted") | AGS | `skills/git-cleanup/SKILL.md`, "Levels" | |
| 17 | Level 2 candidates: stale, and tip identical to the upstream, or fully merged | HXP, "Level 2" 2 and 3; `<MS>`, D2, "Level 2" ("typically fully merged or abandoned tracking") | AGS | `skills/git-cleanup/SKILL.md`, "Levels" 2 | "Fully merged" is checked as containment in the main reference, which still requires staleness |
| 18 | Level 2 requires the upstream to be `origin/<same name>` | HXP, "Level 2" 1 | Removed | None | The identical-tip check carries the safety; the upstream's name adds none |
| 19 | Candidate table: branch, upstream, tip SHA, tip date, reason | HXP, "Level 2" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" | Applied to every level |
| 20 | Orphaned `backup-*` branches (original gone, tip stale) listed separately | HXP, "Level 2" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" 3 | Marked in the level 3 preview; removed only when named, because backup branches are protected (step 4.4) |
| 21 | Level 3 preview: unpushed or no-upstream branches, stashes, backups that may hold unique work; remove only named items | `<MS>`, D2, HXP, "Level 3" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" 3 | |
| 22 | Preview-only mode: fetch, print all levels, delete nothing | HXP, "Dry-run / preview mode" | AGS | `skills/git-cleanup/SKILL.md`, last paragraph | |

### css-authoring-conventions

Sources: `<MS>` = `meta/templates/ags/shared/skills/css-authoring-conventions/SKILL.md`; D2 = `designer2/.agents/skills/css-authoring-conventions/SKILL.md` (same text as `<MS>`); HXP = `hxpoc/.agents/skills/css-authoring-conventions/SKILL.md`; `<MR>` = `meta/templates/rules/react-ui.mdc` (CSS concepts only; its component, async, accessibility and list concepts are rowed under `code-idioms`). All read on 2026-09-28.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Trigger includes component style APIs (theme, variant, size) | `<MS>`, D2, HXP, description and "Trigger" | AGS | `skills/css-authoring-conventions/SKILL.md`, description and "Trigger" | |
| 2 | Authority document `documentation/styles.md` (D2) and `documentation/styling.md` (HXP) | `<MS>`, D2, HXP, "Authority" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 and HXP fact (P23) |
| 3 | Link to the token skill (`css-tokens`) | `<MS>`, D2, HXP, "Authority" | AGS | `skills/css-authoring-conventions/SKILL.md`, introduction ("use the `css-theme-tokens` skill when it is installed") | Named conditionally: skills link only to `includes` companions |
| 4 | Pointer to an optional pre-AGS leftover `.tmp/_backup_pre_ags/rules/styling.mdc` | `<MS>`, D2, "Authority" | Removed | None | Points into a pre-AGS backup; D2's own prepare backup replaces it at Phase E |
| 5 | Link to `code-idioms.md` for component reuse and props before modules | HXP, "Authority" | Removed | None | Skills link only to `includes` companions; the `code-idioms` soft rule is indexed by the AGS block, and the props-first order is row 16 |
| 6 | Scope gate paths: modern `src/pages/`, `src/page-components/`, `src/form_components/`; legacy `src/widgets/`, `src/styles/legacy.scss`, canvas styles | `<MS>`, D2, "Scope gate" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 fact (P23) |
| 7 | Apply defaults to touched styles; do not mass-rewrite legacy styles unless the task edits them | `<MS>`, D2, "Scope gate" | AGS | `skills/css-authoring-conventions/SKILL.md`, introduction | The generic part of the scope gate |
| 8 | Leave a property undeclared "especially when no design rule requires another value" | `<MS>`, D2, HXP, "Declarations" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Declarations" | |
| 9 | `@extend` and `@include` before sorted properties; nested rules after declarations | `<MS>`, D2, "Declarations" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Declarations" | Stated only by D2; no variant contradicts it |
| 10 | Global theme layer paths: `src/styles/base.scss`, shared `components/` (D2); `src/style/_elements.scss` (HXP) | `<MS>`, D2, HXP, "Selectors and naming" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 and HXP fact (P23) |
| 11 | Reuse documented global primitives; never invent a global utility for one-off feature UI, prefer co-located modules | `<MS>`, D2, "Selectors and naming" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Selectors and naming" | |
| 12 | D2's global primitives `src/styles/utilities.scss` and form shells `.form-component`, `.form-button`; HXP's global classes in `src/style/` | `<MS>`, D2, HXP, "Selectors and naming" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 and HXP fact (P23) |
| 13 | Preserve required global marker classes in global shell selectors | `<MS>`, D2, "Selectors and naming" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Selectors and naming" | |
| 14 | Prefer theme tokens over hard-coded lengths, colors, radii, shadows, durations | `<MS>`, D2, "Selectors and naming"; `<MR>`, "Theme tokens only"; D2 and HXP `.agents/guidance/code-idioms.md`, "React UI" 2 and 3 | AGS | `skills/css-authoring-conventions/SKILL.md`, "Declarations" | Generic wording; the UI library's token facts live in `css-theme-tokens` |
| 15 | Component order: the UI library, then shared components, then feature components; D2's `src/form_components/`, `src/page-components/`; HXP's `src/components` | `<MS>`, D2, HXP, "Markup and components" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Markup and composition" | The order is shared text; the D2 and HXP folder names are rowed with row 12's Backlog bullet |
| 16 | Escalation: props and variants, then the global override stylesheet, then a component CSS module; never custom styles for what props support | `<MR>`, "Props before custom styling"; D2 and HXP `.agents/guidance/code-idioms.md`, "React UI" 2 | AGS | `skills/css-authoring-conventions/SKILL.md`, "Markup and composition" | CSS modules are the last step; `rules/code-idioms.md` keeps only a props-first pointer to this skill |
| 17 | Bare element styles belong in the global layer; tag selectors in a module are a smell | `<MR>`, "Element styles belong in the global layer" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Selectors and naming" | Same concept as the existing tag-selector bullet |
| 18 | Reuse exported types for style props "including UI-library types" | HXP, "Style-related APIs" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Component boundaries" | |
| 19 | Verify with `npm run check:types && npm run lint` (D2) or `yarn type-check && yarn lint` (HXP) | `<MS>`, D2, HXP, "Verify" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Their `checks.*` values at install (P23); the shared "Verify" uses the `check` skill |

### css-cleanup

Sources: `<MS>` = `meta/templates/ags/shared/skills/css-cleanup/SKILL.md`; D2 = `designer2/.agents/skills/css-cleanup/SKILL.md` (same text as `<MS>`); HXP = `hxpoc/.agents/skills/css-cleanup/SKILL.md`; `<PS>` = `~/.cursor/skills/css-audit/SKILL.md` (personal, merged here per P21). All read on 2026-09-28.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Scope gate paths: modern modules under `src/page-components/`, `src/form_components/`, `src/pages/`; caution with legacy widgets and `src/styles/` | `<MS>`, D2, "Scope gate" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 fact (P23) |
| 2 | Provenance line "distilled from archived on-demand css-cleanup.mdc" | `<MS>`, D2, first paragraph | Removed | None | Provenance only; states no behavior |
| 3 | Audit only first; never bulk auto-fix on the first pass | `<MS>`, D2, "Workflow" 1 | AGS | `skills/css-cleanup/SKILL.md`, "Report" | Merged with `<PS>` row 14 |
| 4 | Remove in small batches | `<MS>`, D2, "Workflow" 4 | AGS | `skills/css-cleanup/SKILL.md`, "Confirm and remove" 4 | |
| 5 | Strip dead TSX references by deleting the prop, never leaving `className=""` | `<MS>`, D2, "Workflow" 4 | AGS | `skills/css-cleanup/SKILL.md`, "Confirm and remove" 5 | Reconciled with "add a missing class": add it when the element needs the styling, else delete the dead prop |
| 6 | Verify with `npm run check:types` and `npm run lint` (D2) or `yarn type-check && yarn lint` (HXP) | `<MS>`, D2, "Workflow" 5; HXP, "Step 4" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Their `checks.*` values at install (P23); the shared "Verify" reads Host settings |
| 7 | Skip auto-removal for shared or global modules, dynamic access, and legacy string class names beside CSS modules | `<MS>`, D2, "Skip auto-removal for" | AGS | `skills/css-cleanup/SKILL.md`, "Scope" | Generic wording; D2's `src/styles/` is row 1 |
| 8 | No dedicated CSS-module audit script in `package.json` | HXP, introduction | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | HXP fact (P23); the shared "Established command" checks `package.json` |
| 9 | Walk `src/**/*.module.scss`; the `rg -l` importer command over `src` and `tests`; binding names such as `tableStyle` | HXP, "Step 1" | AGS | `skills/css-cleanup/SKILL.md`, "Scope", "Grep audit" 1 and 2 | |
| 10 | Prefer module-scoped verification over a full production build unless asked | HXP, "Step 4" | AGS | `skills/css-cleanup/SKILL.md`, "Verify" | |
| 11 | Scope from the prompt, default the whole client styles tree | `<PS>`, "Procedure" 1 | AGS | `skills/css-cleanup/SKILL.md`, "Scope" | |
| 12 | Global classes: grep raw names across templates and TS or JS, including concatenation and `classNames(...)`; SCSS variables and custom properties across all style files | `<PS>`, "Procedure" 2 | AGS | `skills/css-cleanup/SKILL.md`, "Grep audit" | Custom properties are also searched in TS or TSX |
| 13 | Classify unused, suspicious, used | `<PS>`, "Procedure" 3 | AGS | `skills/css-cleanup/SKILL.md`, "Grep audit" | |
| 14 | Report with file and line before any deletion | `<PS>`, description, "Procedure" 4 | AGS | `skills/css-cleanup/SKILL.md`, "Report" | |
| 15 | Report path `.cursor/records/YYMMDD-styles_unused_<scope>.md` | `<PS>`, "Procedure" 4 | Removed | None | `tmp-conventions` sets `.tmp/records/YYYY-MM-DD-kebab-slug.md` (consolidation rule 1); the skill writes `.tmp/records/YYYY-MM-DD-css-audit-<scope>.md` |
| 16 | Delete only after confirmation, or when explicitly asked to audit and fix in one pass; never delete suspicious entries unverified | `<PS>`, "Procedure" 5 | AGS | `skills/css-cleanup/SKILL.md`, "Report", "Confirm and remove" 3 | |
| 17 | Redundant overrides as an audit target | `<PS>`, description | AGS | `skills/css-cleanup/SKILL.md`, "Grep audit" | Defined as a value the cascade already gives, or one always overridden later in the same scope |
| 18 | Read the project's own `css-cleanup.mdc` or token rules first; they take precedence | `<PS>`, introduction | AGS | `rules/core.md` (host guidance and `.agents/local/<skill-name>.md` win) | |
| 19 | `disable-model-invocation: true` | `<PS>`, frontmatter | Removed | None | P18; the description says "Use only when the user asks" |
| 20 | Provenance line "promotes the per-project workflow to an invocable skill" | `<PS>`, introduction | Removed | None | Provenance only; states no behavior |

### css-theme-tokens

Sources: `<MS>` = `meta/templates/ags/shared/skills/css-tokens/SKILL.md`; D2 = `designer2/.agents/skills/css-tokens/SKILL.md` (same text as `<MS>`); HXP = `hxpoc/.agents/skills/css-tokens/SKILL.md`; AGS = `skills/css-theme-tokens/SKILL.md` at `v2.0.1`. All read on 2026-09-28.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Trigger: the user explicitly asks to tidy styles against the tokens | `<MS>`, D2, HXP, "Trigger" | AGS | `skills/css-theme-tokens/SKILL.md`, "Trigger" | Joined with AGS's "creates, replaces, or evaluates" trigger; "Scope" limits edits during other tasks to changed lines |
| 2 | Authority `documentation/styles.md` (D2) and `documentation/styling.md` (HXP) | `<MS>`, D2, HXP, "Also follow" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 and HXP fact (P23) |
| 3 | Also follow `css-authoring-conventions` | `<MS>`, D2, "Also follow" | Removed | None | Skills link only to `includes` companions; `ui-library-css` brings both skills, and `css-authoring-conventions` names this one |
| 4 | Pointer to archived `_backup_pre_ags/rules/on-demand/css-ui-library-tokens.mdc` | `<MS>`, D2, "Also follow" | Removed | None | Points into a pre-AGS backup; D2's own prepare backup replaces it at Phase E |
| 5 | Scope gate: prefer modern CSS modules; do not mass-rewrite legacy widget styles unless asked | `<MS>`, D2, "Scope gate" | AGS | `skills/css-theme-tokens/SKILL.md`, "Scope" | Generic wording; D2's legacy paths are rowed under `css-authoring-conventions` row 6 |
| 6 | Published tokens from the `@platform/ui-library` CSS; foundation defaults `--space: 16px`, `--speed` from `--speed-ms` | HXP, "Reference" | AGS | `skills/css-theme-tokens/SKILL.md`, "@platform/ui-library tokens" | |
| 7 | Steps 1 and 3: `* 1` and single-variable `calc` | `<MS>`, D2, HXP, "Steps" 1, 3 | AGS | `skills/css-theme-tokens/SKILL.md`, "Normalize" 1, 2 | |
| 8 | Step 2: medium aliases to `--speed` and `--space`; keep scaled tokens | `<MS>`, D2, HXP, "Steps" 2 | AGS | `skills/css-theme-tokens/SKILL.md`, "Normalize" 3 (generic), "@platform/ui-library tokens" (the named aliases) | |
| 9 | Step 4: omit default `ease`; keep `ease-out`, `ease-in-out`; do not collapse lists or widen to `all` | `<MS>`, D2, HXP, "Steps" 4 | AGS | `skills/css-theme-tokens/SKILL.md`, "Normalize" 4 | |
| 10 | Step 5: fold space `calc` onto named tokens when the math matches; not mixed `em` and `rem`, unnamed multipliers, sub-pixel nudges | `<MS>`, D2, HXP, "Steps" 5 | AGS | `skills/css-theme-tokens/SKILL.md`, "Normalize" 5 | |
| 11 | Fold examples `small+tiny` to `slim`, `space/2` to `small` | HXP, "Steps" 5 | AGS | `skills/css-theme-tokens/SKILL.md`, "@platform/ui-library tokens" | Written as `calc` expressions |
| 12 | Step 6: grep leftovers (`speed-medium`, `space-medium`, `* 1)`) | `<MS>`, D2, HXP, "Steps" 6 | AGS | `skills/css-theme-tokens/SKILL.md`, "Verify", "@platform/ui-library tokens" | |
| 13 | Step 6: run `npm run check:types` and `npm run lint` (D2) or `yarn type-check` and `yarn lint` (HXP) | `<MS>`, D2, HXP, "Steps" 6 | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Their `checks.*` values at install (P23); the shared "Verify" uses the `check` skill |
| 14 | Safety: edit one file or an agreed path set; no format-only drive-by diffs | `<MS>`, D2, HXP, "Safety" | AGS | `skills/css-theme-tokens/SKILL.md`, "Scope" | |
| 15 | Trials on a scratch copy, never casually in the working tree | HXP, "Safety" | AGS | `skills/css-theme-tokens/SKILL.md`, "Scope" | The scratch location is `.tmp/scratch/` (`tmp-conventions`) |
| 16 | "Reach this skill from ui-library-css. It is not the primary CSS entry point." | AGS, "Trigger" | Removed | None | The skill now covers any repository's theme tokens (spec Appendix G); `ui-library-css` still includes it |

### plan-work

Sources: Meta `templates/ags/shared/skills/plan-work/SKILL.md` (D2 `.agents/skills/plan-work/SKILL.md` is byte-identical), HXP `.agents/skills/plan-work/SKILL.md`, Meta `templates/rules/plans.mdc`, Meta `templates/rules/code-hygiene.mdc`.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Trigger: more than about five files, ambiguous requirements, or a request to plan or record decisions | Meta and D2 `plan-work/SKILL.md`, HXP `plan-work/SKILL.md`, "Trigger" | AGS | `skills/plan-work/SKILL.md`, "Trigger" and description | All three hosts state the five-file threshold (consolidation rule 4) |
| 2 | Plan first when a task touches more than about five files or requirements are ambiguous | Meta `templates/rules/code-hygiene.mdc`, "Process" | AGS | `skills/plan-work/SKILL.md`, "Trigger" | Same concept as row 1 |
| 3 | When to plan: cross-cutting work; unclear ownership, acceptance criteria or migration boundaries; non-obvious library or tradeoff choices future readers need | Meta and D2, HXP `plan-work/SKILL.md`, "When to plan" | AGS | `skills/plan-work/SKILL.md`, "When to plan" | |
| 4 | Skip tiny one-file fixes with a clear done condition | Meta and D2, HXP `plan-work/SKILL.md`, "When to plan" | AGS | `skills/plan-work/SKILL.md`, "When to plan" | |
| 5 | Naming `YYMMDD-snake_case[-suffix].md`, dated plan titles | Meta and D2, HXP `plan-work/SKILL.md`, "Naming", "Plan skeleton"; `plans.mdc`, "Naming Convention" | Removed | None | `tmp-conventions` sets `YYYY-MM-DD-kebab-slug.md` (consolidation rule 1) |
| 6 | Supporting files next to a plan (to-dos, questions) with a name suffix | `plans.mdc`, "Naming Convention", "Supporting and Reference Files"; HXP `plan-work/SKILL.md`, "Naming" example | AGS | `skills/plan-work/SKILL.md`, "Where plans go" | Kept as a plan folder, the `tmp-conventions` form of a multi-file plan |
| 7 | Draft under `.cursor/plans/` unless the user designates another place | Meta and D2 `plan-work/SKILL.md`, "Location and lifecycle" 1; `plans.mdc`, "Location", "Lifecycle" 1 | AGS | `skills/plan-work/SKILL.md`, "Where plans go" | Location replaced by `.tmp/plans/` (consolidation rule 1); the user may name another place |
| 8 | Plans live in the repository, version-controlled and shared with the team | `plans.mdc`, "Location" | Removed | None | Contradicts `tmp-conventions`: `.tmp/` is gitignored local material (consolidation rule 1); team review is row 9 |
| 9 | Draft where the team reviews it with the change: merge request description, ticket, or a file the user designates | HXP `plan-work/SKILL.md`, "Location and lifecycle" 1 | AGS | `skills/plan-work/SKILL.md`, "Where plans go" | |
| 10 | Record durable decisions in the plan as you go, one line each (library pick, rejected approach, ownership ruling) | Meta and D2, HXP `plan-work/SKILL.md`, "Location and lifecycle" 2 | AGS | `skills/plan-work/SKILL.md`, "Plan skeleton" | |
| 11 | When done, move the completed plan or its durable outcomes to `.cursor/records/` | Meta and D2 `plan-work/SKILL.md`, "Location and lifecycle" 3; `plans.mdc`, "Lifecycle" 3 | AGS | `skills/plan-work/SKILL.md`, "When the work is done" | Destination replaced by `.tmp/records/` or `.tmp/archive/YYYY-MM/` (consolidation rule 1) |
| 12 | Records are historical; edit them only to add a brief completion note | `plans.mdc`, "Lifecycle" | AGS | `skills/plan-work/SKILL.md`, "When the work is done" | |
| 13 | No imperative living-document instructions left in tracked guidance | Meta and D2, HXP `plan-work/SKILL.md`, "Location and lifecycle" 3 | AGS | `skills/plan-work/SKILL.md`, "When the work is done" | |
| 14 | Promote only durable architectural notes into tracked history; ephemeral to-dos stay out | HXP `plan-work/SKILL.md`, "Location and lifecycle" 3 | AGS | `skills/plan-work/SKILL.md`, "When the work is done" | The place is host guidance |
| 15 | HXP promotes durable notes into `.agents/archive/` under its history curation rules | HXP `plan-work/SKILL.md`, "Location and lifecycle" 3 | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | HXP-specific place (P23); `.agents/` becomes AGS-owned at install, so HXP needs a new place then |
| 16 | Do not recreate `.cursor/plans/` or `.cursor/docs/` as the canonical store | HXP `plan-work/SKILL.md`, "Location and lifecycle" 4 | AGS | `skills/plan-work/SKILL.md`, "Where plans go" | |
| 17 | Fat always-applied rule corpora stay archived under `_backup_pre_ags/` | Meta and D2 `plan-work/SKILL.md`, "Location and lifecycle" 4 | Removed | None | Pre-AGS migration note; the AGS prepare backup replaces `_backup_pre_ags/` for every host (P23) |
| 18 | Non-plan reference docs in `.cursor/reference/`, longer notes in `.cursor/docs/` | `plans.mdc`, "Supporting and Reference Files" | Removed | None | Contradicts the `tmp-conventions` layout and the ban on stores under `.cursor/` (consolidation rule 1); durable notes go to tracked documentation (row 14) |
| 19 | Plan skeleton (goal, non-goals, approach, files, risks, decision log, done when) | Meta and D2, HXP `plan-work/SKILL.md`, "Plan skeleton" | AGS | `skills/plan-work/SKILL.md`, "Plan skeleton" | |
| 20 | Done when: acceptance criteria met; decision log complete | Meta and D2, HXP `plan-work/SKILL.md`, "Done when" | AGS | `skills/plan-work/SKILL.md`, "Done when" | |
| 21 | Done when: `npm run check:types && npm run lint` (D2), `yarn type-check && yarn lint` (HXP) | Meta and D2, HXP `plan-work/SKILL.md`, "Done when" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23); they become `checks.*` values at the D2 and HXP installs; the shared text defers to the `check` skill |
| 22 | Done when: tracked git status unchanged when the work was local-only | Meta and D2 `plan-work/SKILL.md`, "Done when" | AGS | `skills/plan-work/SKILL.md`, "Done when" | Generalized from `.cursor/` to any work meant to stay local |

### write-commit-diff

Sources: Meta `templates/ags/shared/skills/write-commit-diff/` (`SKILL.md`, `write-last-n-diff.ps1`, `write-range-diff.ps1`) and Meta `templates/ags/shared/scripts/write-last-n-diff.ps1` (identical to the skill-folder copy); D2 `.agents/skills/write-commit-diff/` (`SKILL.md` and `write-range-diff.ps1` identical to Meta's) and D2 `.agents/scripts/write-last-n-diff.ps1` (identical to D2's skill-folder copy); HXP `.agents/skills/write-commit-diff/` (`SKILL.md` and both writers identical to Watcher's backup); HXP `.agents/guidance/git-conventions.md`, "Commit range diffs". "Meta and D2 `SKILL.md`" below means both identical files.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Trigger phrases: generate, create, make a diff, export a range, last N, and staged, unstaged, untracked or current changes to a file | Meta and D2 `SKILL.md`, HXP `SKILL.md`, "Trigger" and description | AGS | `skills/write-commit-diff/SKILL.md`, introduction and description | The staged-to-current phrases come from Meta and D2 |
| 2 | Use the writer instead of `git diff` or `git show` dumped into chat or a hand-rolled `git diff > file` | Meta and D2, HXP `SKILL.md`, introduction and "Do not" 1 and 2 | AGS | `skills/write-commit-diff/SKILL.md`, introduction | |
| 3 | The writers are deterministic; run them, do not reimplement them | Meta and D2, HXP `SKILL.md`, introduction, "Procedure" 3 | AGS | `skills/write-commit-diff/SKILL.md`, introduction, "Procedure" 3; `skills/write-commit-diff/scripts/write-commit-diff.mjs` | |
| 4 | Usage authority in `.agents/scripts/README.md` ("Diff helpers") | Meta and D2, HXP `SKILL.md`, introduction | Removed | None | The skill's own "Command" section is the only usage text; host script indexes are superseded (P23) |
| 5 | Mode: last N commits on HEAD | Meta and D2 `write-last-n-diff.ps1` `<N>`; HXP `write-last-n-diff.ps1` | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` `commits`; `SKILL.md`, "Command" | |
| 6 | Modes: staged, unstaged tracked (`changes`), untracked non-ignored, current (staged, unstaged and untracked) | Meta and D2 `write-last-n-diff.ps1`, "Modes"; Meta and D2 `SKILL.md`, "Which script" | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` `staged`, `changes`, `untracked`, `current`; `SKILL.md`, "Command" | |
| 7 | Mode: current plus the last N commits, as one net diff against `HEAD~N` rather than concatenated diffs | Meta and D2 `write-last-n-diff.ps1`, `current <N>` | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` `current <name> <N>` | |
| 8 | Mode: explicit `From..To` range, `To` defaulting to `HEAD`, both refs verified as commits | Meta and D2, HXP `write-range-diff.ps1` | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` `range`; `SKILL.md`, "Command" | |
| 9 | `-Repo`: diff another checkout; `-OutInRepo`: write into that checkout's `.tmp/` | Meta and D2, HXP `write-range-diff.ps1` | AGS | `skills/write-commit-diff/SKILL.md`, "Command" | Represented by running the script with the other checkout as the working directory, which equals `-Repo` with `-OutInRepo` |
| 10 | `-Repo` without `-OutInRepo`: write the other checkout's diff into this repository's `.tmp/` | Meta and D2, HXP `write-range-diff.ps1` | Removed | None | The script writes into the repository it diffs; the file can be copied if needed. Script support is `BACKLOG.md`, Guidance, "`write-commit-diff` script output" |
| 11 | Plain file name validation; extension stripped; `.diff` appended | Meta and D2, HXP writers and `SKILL.md` | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` (`diffBaseName`); `SKILL.md`, "Command" | |
| 12 | Commit count checked against the commits on HEAD | Meta and D2, HXP `write-last-n-diff.ps1` | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` (`positiveCount`) | The script also accepts N equal to the count, diffing from the empty tree |
| 13 | Raw bytes, no external diff or textconv, written to a staging file and then replaced atomically | Meta and D2 `write-last-n-diff.ps1`, `Write-GitDiffRaw` | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` (`writeDiff`) | |
| 14 | Output `.tmp/<name>.diff` | Meta and D2, HXP writers and `SKILL.md` | Removed | None | `tmp-conventions` puts disposable output under `.tmp/scratch/` (consolidation rule 1); the script writes `.tmp/scratch/<name>.diff` |
| 15 | Writers print the output path and size | Meta and D2, HXP writers | AGS | `skills/write-commit-diff/scripts/write-commit-diff.mjs` (`main`) | |
| 16 | Writers print the covered commits (`git log --oneline`) and, for a range, the commit count | Meta and D2 `write-last-n-diff.ps1`; Meta and D2, HXP `write-range-diff.ps1`; HXP `write-last-n-diff.ps1` | AGS | `skills/write-commit-diff/SKILL.md`, "Procedure" 4 | The agent lists the commits; printing them from the script is `BACKLOG.md`, Guidance, "`write-commit-diff` script output" |
| 17 | Procedure: pick the mode from the ask; ask once when the range is ambiguous | Meta and D2, HXP `SKILL.md`, "Procedure" 1 | AGS | `skills/write-commit-diff/SKILL.md`, "Procedure" 1 | |
| 18 | Procedure: name the file after the ticket id, branch slug or the user's name | Meta and D2, HXP `SKILL.md`, "Procedure" 2 | AGS | `skills/write-commit-diff/SKILL.md`, "Procedure" 2 | |
| 19 | Reply with path, size and commit list; paste the diff body only when asked; never deliver the patch in chat | Meta and D2, HXP `SKILL.md`, "Procedure" 4 and 5, "Do not" 1; HXP `git-conventions.md`, "Commit range diffs" | AGS | `skills/write-commit-diff/SKILL.md`, "Procedure" 5, "Output" | |
| 20 | Not for ordinary `git diff` or `git status` while coding | Meta and D2, HXP `SKILL.md`, "Do not" 3 | AGS | `skills/write-commit-diff/SKILL.md`, introduction | |
| 21 | Do not commit the `.diff`; `.tmp/` is gitignored | Meta and D2, HXP `SKILL.md`, "Do not" 4 | AGS | `rules/tmp-conventions.md`, "Ignoring and reading" | `.tmp/` is ignored through git in every host; the skill writes only there |
| 22 | Two copies of the last-N writer (`.agents/scripts/` and the skill folder), prefer `.agents/scripts/` | Meta and D2 `SKILL.md`, "Which script" | Removed | None | One AGS script at `.agents/skills/write-commit-diff/scripts/`; duplicate host copies are superseded (P23) |
| 23 | Pointer from git conventions to the skill for commit range diffs | HXP `git-conventions.md`, "Commit range diffs" | AGS | `skills/write-commit-diff/SKILL.md` | Native skill discovery routes it |
| 24 | PowerShell writer implementations, including D2's Windows PowerShell 5.1 `Split-Path` fix and HXP's `Out-File -Encoding utf8` output | Meta `skills/write-commit-diff/*.ps1`, `scripts/write-last-n-diff.ps1`; D2 `skills/write-commit-diff/*.ps1`, `scripts/write-last-n-diff.ps1`; HXP `skills/write-commit-diff/*.ps1` | Removed | None | Superseded implementation artifacts (P23); their modes and behaviors are rows 5 to 16 |

### state-topology

D2 is `C:/Cosmos/projects/work/designer2`, HXP is `C:/Cosmos/projects/work/hxpoc`; both files are `.agents/guidance/state-topology.md` (D2's `.agents/` is untracked, so no revision is given).

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Answer the questions before writing code that changes shared client state; facts represented in more than one medium are in scope | D2 and HXP, opening paragraph | AGS | `rules/state-topology.md`, opening | Scope written generically, with the union of the media the variants name |
| 2 | D2 scope list: serialized design, feature flags, service Subjects, Zustand stores, window globals | D2, opening paragraph | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 fact (P23) |
| 3 | HXP scope list: authentication, permissions, selected application, query cache, remotes, iframes | HXP, opening paragraph | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | HXP fact (P23) |
| 4 | Link to existing documentation rather than restating it | D2 and HXP, "Prefer links to existing `documentation/` pages" | AGS | `rules/state-topology.md`, opening | `documentation/` generalized to the repository's documentation |
| 5 | Trivial local UI state inside a single component needs no record | D2, "Scope gate" | AGS | `rules/state-topology.md`, opening | Generic; stated once as out of scope |
| 6 | Modern work versus legacy-in-place edits, which stay minimal unless ownership is part of the task | D2, "Scope gate" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 scope gate (P23) |
| 7 | The labels `fact`, `policy`, `inference`, `unresolved` | D2 and HXP, "Record labels" | AGS | `rules/state-topology.md`, "Labels" | "adopted for Designer2" and "adopted by HXP" become "the repository has adopted" |
| 8 | The fifteen fields, with their examples | D2 and HXP, "The fifteen fields" | AGS | `rules/state-topology.md`, "The fifteen fields" | Examples merged: cookies, window globals, message payloads, interceptors, frames, document version, authorization failure (HXP's 401) |
| 9 | Records live under the guidance folder's `state/` | D2 and HXP, "The fifteen fields" | AGS | `rules/state-topology.md`, "Records" | Location follows the plan: records are host material in `.agents/local/`, linked from a host rule |
| 10 | Add a reusable question that generalizes the record | D2 and HXP, "The fifteen fields" | AGS | `rules/state-topology.md`, "The fifteen fields" | |
| 11 | Method steps: name the fact, writers before readers, every representation, sync and disposal of secondary forms, boot precedence, explicit dependencies, no invented runtime outcomes | D2 and HXP, "Method" 1 to 6 and 8 | AGS | `rules/state-topology.md`, "Method" | |
| 12 | Where to search for writers; a second representation needs a distinct lifecycle or boundary purpose | HXP, "Method" 2 and 3 | AGS | `rules/state-topology.md`, "Method" 2 and 3 | |
| 13 | Props are valid at feature boundaries too; cap ownership of composition hooks, including moving code out of JSX | HXP, "Method" 6 and 7 | AGS | `rules/state-topology.md`, "Method" 6 and 7 | Watcher states the same; HXP's fuller wording kept |
| 14 | Behavior needing a running app, such as module identity, stays `unresolved` until evidence is recorded | D2 and HXP, "Method" 8 | AGS | `rules/state-topology.md`, "Method" 8 | |
| 15 | Prefer Zustand for new global client state; do not rip out existing services unless asked | D2, "Method" 7 | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 stack policy (P23), not part of the procedure |
| 16 | Stop and update the record before adding a writer or authority without naming its arbiter | D2 and HXP, worked counter-examples, last paragraph | AGS | `rules/state-topology.md`, "Method", last paragraph | |
| 17 | Dual read paths: a hook for new code, a window global for legacy code | D2, "Worked counter-example: dual design readers" | AGS | `rules/state-topology.md`, "Counter-examples", "Two read paths" | Generalized |
| 18 | D2 facts of that example: `useDesign()`, `window.apm.serialized`, the AVS save and AppManager arbiters, the serialized-design record | D2, "Worked counter-example: dual design readers" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 fact (P23) |
| 19 | Ownership ceiling: one hook derives the selection, writes permissions and mirrors the selection | HXP, "Worked counter-example: `useMainNavigation`" | AGS | `rules/state-topology.md`, "Counter-examples", "A hook that arbitrates" | Generalized |
| 20 | HXP facts of that example: `useMainNavigation` lines, `appCode`, `useUserStore`, `useApplicationsStore`, the policy that the URL owns the selected application | HXP, "Worked counter-example: `useMainNavigation`" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | HXP fact and policy (P23) |
| 21 | D2 documentation links: services, Subjects, save process, repository profile | D2, "Existing documentation" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | D2 fact (P23) |
| 22 | HXP documentation links: authentication, roles and permissions, module federation, repository profile | HXP, "Existing documentation" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | HXP fact (P23) |
| 23 | D2 and HXP record indexes (three records each) | D2 and HXP, "Records" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host indexes; the records themselves are rowed in step 4.14 |

### code-idioms

Sources read on 2026-09-28: D2 `.agents/guidance/code-idioms.md` (D2's `.agents/` is untracked, so no revision), HXP `.agents/guidance/code-idioms.md` at `49aeab84`, and Meta `templates/rules/code-hygiene.mdc`, `react-state.mdc`, `react-ui.mdc` (Meta has no history). Where D2 and HXP state the same concept, one row names both.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Craft conventions for TypeScript and React; prefer examples over doctrine | D2 and HXP `code-idioms.md`, introduction | AGS | `rules/code-idioms.md`, introduction | |
| 2 | Verification command pointers (`npm run check:types && npm run lint`; `yarn type-check && yarn lint`) and links to `repository-profile.md` | D2 and HXP `code-idioms.md`, introduction | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23); the shared rule points to the `check` skill (row 49) |
| 3 | Do not enforce the idioms on untouched legacy code | D2 `code-idioms.md`, "Scope gate" | AGS | `rules/code-idioms.md`, "Changes" | |
| 4 | D2 scope gate paths: modern `src/pages/`, `src/page-components/`, `src/form_components/`, `src/hooks/`, `src/stores/`; legacy `src/widgets/`, `src/form_features/`, class forms with `props.context`, canvas internals | D2 `code-idioms.md`, "Scope gate" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host-specific scope gate (P23) |
| 5 | `@app/*` alias for modules under `src/` | D2 `code-idioms.md`, "Imports and alias" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host fact (P23); the shared rule says to use the repository's aliases |
| 6 | Use the repository's path aliases where defined, relative paths elsewhere | D2 `code-idioms.md`, "Imports and alias" | AGS | `rules/code-idioms.md`, "Component structure" | Generalized from the D2 alias rule and Watcher's import rules |
| 7 | Combine imports; three or more named symbols on multiple lines | D2 `code-idioms.md`, "Imports and alias" | AGS | `rules/code-idioms.md`, "Component structure" | The line-break rule applies when no formatter decides |
| 8 | Keep nearby import and object-property order; no drive-by reordering | D2 `code-idioms.md`, "Imports and alias"; HXP `code-idioms.md`, "Component structure" | AGS | `rules/code-idioms.md`, "Changes" | |
| 9 | No Prettier in D2 | D2 `code-idioms.md`, "Imports and alias" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host fact (P23) |
| 10 | Do not reformat for style alone; no format-only diffs or unsolicited project-wide `lint --fix` | D2 `code-idioms.md`, "Imports and alias", "Avoid" | AGS | `rules/code-idioms.md`, "Changes" | |
| 11 | Component structure example; order hooks, handlers, render | D2 and HXP `code-idioms.md`, "Component structure" | AGS | `rules/code-idioms.md`, "Component structure" | One generic example replaces the host examples |
| 12 | Package imports, then local imports | HXP `code-idioms.md`, "Component structure" | AGS | `rules/code-idioms.md`, "Component structure" | Merged with Watcher's three groups (packages, aliases, relative) |
| 13 | Components return `ReactElement` | HXP `code-idioms.md`, "Component structure" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Only HXP states it; Watcher's form (no return annotation) wins (consolidation rule 4) |
| 14 | D2 folder placements: `src/form_components/<kebab>/` with barrel, `src/page-components/`, `src/pages/`, `src/utilities/functions/` with kebab-case names | D2 `code-idioms.md`, "Component structure (modern)" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23) |
| 15 | Pure helpers in a utilities folder or the feature's `utils/` | HXP `code-idioms.md`, "Component structure" | AGS | `rules/code-idioms.md`, "Component structure" | HXP's `src/utils/` path is row 16 |
| 16 | HXP helper path `src/utils/` | HXP `code-idioms.md`, "Component structure" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host fact (P23) |
| 17 | Options object when named arguments improve clarity | HXP `code-idioms.md`, "Component structure" | AGS | `rules/code-idioms.md`, "Component structure" | |
| 18 | Prefer named exports for components and utilities | D2 and HXP `code-idioms.md`, "Types" | AGS | `rules/code-idioms.md`, "Component structure" | |
| 19 | Types: `type` over `interface`, `string[]` and `Record<string, T>`, `Pick` and `Omit`, `?` over `\| undefined`, defaults in destructuring, enums for finite sets | D2 and HXP `code-idioms.md`, "Types" | AGS | `rules/code-idioms.md`, "Types" | |
| 20 | Loose typing is known debt: no new `any`, no workarounds around the old | D2 and HXP `code-idioms.md`, "Types" | AGS | `rules/code-idioms.md`, "Types" | The two phrasings merged |
| 21 | Destructure callback parameters and hook returns; rename at the source | HXP `code-idioms.md`, "Callbacks and hooks" | AGS | `rules/code-idioms.md`, "Callbacks and hooks" | |
| 22 | `useCallback` only for a dependency array, expensive child or memoized child | HXP `code-idioms.md`, "Callbacks and hooks" | AGS | `rules/code-idioms.md`, "Callbacks and hooks" | Merged with Watcher's measured-cost rule and Meta's `useMemo` rule |
| 23 | Feature composition hook: digested data plus trigger methods; components consume; not a replacement for props at reusable boundaries | D2 and HXP `code-idioms.md`, "Feature composition (orchestrator) hooks" | AGS | `rules/code-idioms.md`, "Feature composition hooks" | |
| 24 | A composition hook coordinates one owned workflow and must not silently arbitrate unrelated authorities | HXP `code-idioms.md`, "Feature composition (orchestrator) hooks", "Components" | AGS | `rules/code-idioms.md`, "Feature composition hooks" | |
| 25 | Host data sources and links of the composition hook (`useDesign`, `useServices`, `/src/api` React Query hooks, `state-management.md`, `frontend-api-layer.md`) | D2 and HXP `code-idioms.md`, "Feature composition (orchestrator) hooks" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23) |
| 26 | Derive in render when cheap and same lifecycle; `useEffect` for external synchronization, not render copies or event reactions | D2 and HXP `code-idioms.md`, "Derived state and effects" | AGS | `rules/code-idioms.md`, "Derived state and effects" | |
| 27 | Ownership and sync pointer to state topology or state management | D2 and HXP `code-idioms.md`, "Derived state and effects" | AGS | `rules/code-idioms.md`, "Derived state and effects" | Names the `state-topology` rule conditionally; HXP's documentation link is row 25 |
| 28 | D2 state facts: `useDesign()`, Zustand in `src/hooks/` and `src/stores/` over new services, services with Subject and Observable stay, `useServices()` | D2 `code-idioms.md`, "State (modern)" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23) |
| 29 | No direct network calls in components | D2 `code-idioms.md`, "State (modern)" | AGS | `rules/code-idioms.md`, "State" | |
| 30 | Keep rendering in components; reusable logic in scoped hooks and utilities | HXP `code-idioms.md`, "Components" | AGS | `rules/code-idioms.md`, "Component structure" | |
| 31 | Reuse ladder: UI library, shared components, feature components; no redundant wrapper; no duplicates of library or shared capabilities | D2 `code-idioms.md`, "React UI" 1; HXP `code-idioms.md`, "Components", "Avoid" | AGS | `rules/code-idioms.md`, "Components and UI" | Library and folder names are host facts (row 25, BACKLOG) |
| 32 | Read the UI-library component's type definitions and prefer its built-in props | HXP `code-idioms.md`, "Components" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 33 | Explicit dependencies at boundaries; reusable components take data and callbacks through props | HXP `code-idioms.md`, "Components" | AGS | `rules/code-idioms.md`, "State", "Feature composition hooks" | |
| 34 | Secondary representations allowed with a distinct lifecycle; state authority, sync direction, write boundary, reset rule, conflict policy | HXP `code-idioms.md`, "Components" | AGS | `rules/code-idioms.md`, "Derived state and effects" | |
| 35 | Collection handlers take the full updated value (`onChange`) | HXP `code-idioms.md`, "Components" | AGS | `rules/code-idioms.md`, "Callbacks and hooks" | |
| 36 | Transient UI state stays local | HXP `code-idioms.md`, "Components" | AGS | `rules/code-idioms.md`, "State" | |
| 37 | Dedicated components over raw `<button>`, `<input>`, `<a>` and one-off replacements | D2 and HXP `code-idioms.md`, "React UI" 1 | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 38 | Async views: explicit loading, error and empty states | D2 and HXP `code-idioms.md`, "React UI" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 39 | Keyboard reach, labels, `alt` | HXP `code-idioms.md`, "React UI" 5 | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 40 | Stable list keys; virtualize or paginate large lists | D2 and HXP `code-idioms.md`, "React UI" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 41 | No inline styles | HXP `code-idioms.md`, "Avoid" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 42 | No hardcoded `className` strings; use CSS modules with `classSet` | HXP `code-idioms.md`, "Avoid" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Contradicts Watcher's global shell classes and names an HXP helper; host-specific (consolidation rules 3 and 4) |
| 43 | Never mutate state in place | HXP `code-idioms.md`, "Avoid" | AGS | `rules/code-idioms.md`, "State" | |
| 44 | Never commit `.env*` secrets; no packages without need | HXP `code-idioms.md`, "Avoid" | AGS | `rules/code-idioms.md`, "Changes" | |
| 45 | No new `window` globals | D2 `code-idioms.md`, "Avoid" | AGS | `rules/code-idioms.md`, "State" | |
| 46 | Prop drilling avoidable through existing stores, hooks or services | D2 `code-idioms.md`, "Avoid" | AGS | `rules/code-idioms.md`, "State" | |
| 47 | Do not expand `src/widgets/`; do not change canvas and diagram internals without a task; the afterFileEdit ESLint hook is fine | D2 `code-idioms.md`, "Avoid" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23); the hooks are rowed at step 4.14 |
| 48 | Legacy edits: minimal change, match surrounding style, import modern components instead of growing legacy patterns | D2 `code-idioms.md`, "Legacy edits" | AGS | `rules/code-idioms.md`, "Changes" | jQuery and class forms are D2 examples (row 4) |
| 49 | A task is done when the project's verification passes | Meta `code-hygiene.mdc`, "Verification" | AGS | `rules/code-idioms.md`, "Changes" | Points to the `check` skill (P22) |
| 50 | Scope discipline: only needed lines, cleanups only on edited lines, no drive-by refactors, renames or reformatting; never mix formatting and behavior | Meta `code-hygiene.mdc`, "Scope discipline" | AGS | `rules/code-idioms.md`, "Changes" | |
| 51 | Delete code instead of commenting it out | Meta `code-hygiene.mdc`, "Dead code and TODOs" | AGS | `rules/code-idioms.md`, "Changes" | P22: no proto-rule covers it |
| 52 | `TODO` needs a reference (issue or plan entry) | Meta `code-hygiene.mdc`, "Dead code and TODOs" | AGS | `rules/code-idioms.md`, "Changes" | `.cursor/plans/` becomes "a plan" under `tmp-conventions` |
| 53 | Search for an existing utility, hook or helper before writing one | Meta `code-hygiene.mdc`, "Reuse before writing" | AGS | `rules/code-idioms.md`, "Changes" | |
| 54 | Justify a new dependency; let the package manager pick the latest version | Meta `code-hygiene.mdc`, "Reuse before writing" | AGS | `rules/code-idioms.md`, "Changes" | |
| 55 | Soft cap of about 300 lines; extract cohesive pieces; oversized legacy files exempt until substantially edited | Meta `code-hygiene.mdc`, "File size" | AGS | `rules/code-idioms.md`, "Changes" | Watcher holds the cap, so P22 sends it here, not to Proto-rules |
| 56 | Validate at system boundaries only | Meta `code-hygiene.mdc`, "Validation" | AGS | `rules/code-idioms.md`, "Changes" | |
| 57 | Bug fix gets a regression test where a harness exists | Meta `code-hygiene.mdc`, "Process" | AGS | `rules/code-idioms.md`, "Tests" | |
| 58 | Record non-obvious decisions in the plan or record | Meta `code-hygiene.mdc`, "Process" | AGS | `skills/plan-work/SKILL.md`, "Decision log" | Already stated there |
| 59 | Exploration routing: Task/explore for unknown locations, Grep and Read only for known symbols, route first through AGENTS | Meta `code-hygiene.mdc`, "Exploration" | Removed | None | Duplicates the "Lean sessions" section of the Layer 0 user rules, which applies in every repository; not code craft |
| 60 | Activation by `alwaysApply` and `globs` (`*.ts`, `*.tsx`, `*.scss`) | Meta `code-hygiene.mdc`, `react-state.mdc`, `react-ui.mdc`, frontmatter | Removed | None | An opt-in AGS soft rule, indexed by its description, replaces Cursor rule activation |
| 61 | State ladder: local, lift, store, query cache | Meta `react-state.mdc`, "State ladder" | AGS | `rules/code-idioms.md`, "State" | |
| 62 | Never mirror server state into a store or local state | Meta `react-state.mdc`, "State ladder" | AGS | `rules/code-idioms.md`, "State" | |
| 63 | No prop drilling; generic components stay store-agnostic | Meta `react-state.mdc`, "No prop drilling" | AGS | `rules/code-idioms.md`, "State" | |
| 64 | Pass a value from parent to child only when the parent may modify or override it | Meta `react-state.mdc`, "No prop drilling" | Backlog | `BACKLOG.md`, Guidance, "Proto-rules" | No host variant holds it; proto-rules 1 and 2 cover it (P22) |
| 65 | Derived values in render, never a `useState` plus `useEffect` copy; `useMemo` only for measured cost | Meta `react-state.mdc`, "Derived state" | AGS | `rules/code-idioms.md`, "Derived state and effects", "Callbacks and hooks" | |
| 66 | Effects only for external systems; not for render transforms, event reactions or chained updates | Meta `react-state.mdc`, "Effects" | AGS | `rules/code-idioms.md`, "Derived state and effects" | |
| 67 | Dedicated components over native elements; note why when one cannot do the job | Meta `react-ui.mdc`, "Dedicated components over vanilla elements" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 68 | Async UI: loading, error and empty states; no blank flashes or swallowed failures; loading does not freeze the app | Meta `react-ui.mdc`, "Async UI has three states" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 69 | Accessibility floor, including no click handlers on non-interactive elements | Meta `react-ui.mdc`, "Accessibility floor" | AGS | `rules/code-idioms.md`, "Components and UI" | |
| 70 | Stable keys; virtualize or paginate lists that grow into the hundreds | Meta `react-ui.mdc`, "Lists" | AGS | `rules/code-idioms.md`, "Components and UI" | |

Not rowed here, to keep one row per concept: the CSS concepts of `react-ui.mdc` ("Props before custom styling", "Element styles belong in the global layer", "Theme tokens only"), and the matching "React UI" 2 and 3 concepts of D2 and HXP (CSS modules and the styling escalation; theme tokens instead of raw hex), are rowed under `### css-authoring-conventions` rows 14 and 16; the "Plan first" bullet of `code-hygiene.mdc` belongs to `plan-work` (step 4.8); its commit, ship and rebase routing line is rowed at step 4.14.

### react-state-transitions

Sources below are relative to `.agents/skills/react-state-transitions/` in D2 (`HEAD` `9b975d23e`, untracked) and to `templates/ags/shared/skills/react-state-transitions/` in Meta (read 2026-09-28); the files are identical.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Frontmatter `name` and `description` (explicit review or plan request, or a demonstrated invalid intermediate; not ordinary effect work) | `SKILL.md`, frontmatter | AGS | `skills/react-state-transitions/SKILL.md`, frontmatter | |
| 2 | Purpose: review, plan, implement only when authorized; not a "remove `useEffect`" checklist | `SKILL.md`, introduction | AGS | `skills/react-state-transitions/SKILL.md`, introduction | |
| 3 | Trigger boundary: apply and do-not-apply cases | `SKILL.md`, "Trigger boundary" | AGS | `skills/react-state-transitions/SKILL.md`, "Trigger boundary" | |
| 4 | Core model: invariants, valid transitions, explicit async phases, no cross-system atomicity, legitimate external-sync effects, coherent async updates, controlled children, batching, `useLayoutEffect` | `SKILL.md`, "Core model" | AGS | `skills/react-state-transitions/SKILL.md`, "Core model" | The Electron mention is generalized to "a desktop shell or IPC peer" |
| 5 | Modes table (Review, Plan, Implement); invocation is not authorization; mixed requests do the authorized part | `SKILL.md`, "Modes" | AGS | `skills/react-state-transitions/SKILL.md`, "Modes" | |
| 6 | Invocation syntax `$react-state-transitions` | `SKILL.md`, "Modes" | Removed | None | Harness-specific invocation syntax; the AGS text says "invoking this skill" |
| 7 | Workflow steps 1 to 8 (authorization, leads, reopen source, three confidences, classification, read references, stop per mode) | `SKILL.md`, "Workflow" | AGS | `skills/react-state-transitions/SKILL.md`, "Workflow" | |
| 8 | Scope: no new state-machine library, reuse existing mechanisms, narrowest owner, separate unrelated work | `SKILL.md`, "Scope" | AGS | `skills/react-state-transitions/SKILL.md`, "Scope" | |
| 9 | `agents/openai.yaml` (display name, short description, default prompt, implicit invocation policy) | `agents/openai.yaml` | Removed | None | Harness-specific file (P18); the description carries the trigger |
| 10 | When to load the review reference | `references/review-and-planning.md`, introduction | AGS | `skills/react-state-transitions/references/review-and-planning.md`, introduction | |
| 11 | Leads versus findings; reopen current source; prior audits as candidate inventories | `references/review-and-planning.md`, "Evidence rubric" | AGS | `skills/react-state-transitions/SKILL.md`, "Workflow" 2 and 3; the reference keeps "actionable only after a sourced trace" | Stated once, in the workflow (consolidation rule 5) |
| 12 | Eight-part trace of every actionable finding | `references/review-and-planning.md`, "Trace every actionable finding" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, same heading | |
| 13 | Three confidence scores table; unknown intent is a decision or ambiguity | `references/review-and-planning.md`, "Three confidence scores" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, same heading | |
| 14 | Observability notes | `references/review-and-planning.md`, "Observability" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, same heading | |
| 15 | Classification labels; treatment of prior audit items; adjacent considerations | `references/review-and-planning.md`, "Classification" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, same heading | |
| 16 | False-positive checks | `references/review-and-planning.md`, "False-positive checks" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, same heading | |
| 17 | Review report contents (seven parts) | `references/review-and-planning.md`, "Report expectations (Review mode)" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, "Review report" | |
| 18 | "Do not copy a host-app audit into this skill; keep examples generic" | `references/review-and-planning.md`, "Report expectations (Review mode)" | Removed | None | Maintainer instruction, not agent behavior; installed copies are not edited in hosts, and AGS material rules already keep shared text generic |
| 19 | Plan contents (seven parts), including the validation strategy | `references/review-and-planning.md`, "Plan expectations (Plan mode)" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, "Plan"; validation names the `check` skill conditionally | |
| 20 | Closing plan paragraph: smallest safe changes, no new state-machine library, reuse existing mechanisms | `references/review-and-planning.md`, "Plan expectations (Plan mode)", last paragraph | AGS | `skills/react-state-transitions/SKILL.md`, "Scope" and "Workflow" 7 | Duplicate of the Scope section; stated once (consolidation rule 5) |
| 21 | Generalized examples (effect gate, missing async phase, form draft, derived pointer, selection indices, persistence write-back) | `references/review-and-planning.md`, "Generalized examples (leads until sourced)" | AGS | `skills/react-state-transitions/references/review-and-planning.md`, "Generalized examples" | |
| 22 | When to load the patterns reference; smallest pattern | `references/refactoring-patterns.md`, introduction | AGS | `skills/react-state-transitions/references/refactoring-patterns.md`, introduction | |
| 23 | Six ordered questions to choose a pattern | `references/refactoring-patterns.md`, "Choose a pattern" | AGS | `skills/react-state-transitions/references/refactoring-patterns.md`, same heading | |
| 24 | The ten patterns with use, preserve and limits | `references/refactoring-patterns.md`, "Patterns" | AGS | `skills/react-state-transitions/references/refactoring-patterns.md`, "Patterns" | |
| 25 | Per-pattern repeats of "no new library or XState" and "one function writing two stores is not atomic" | `references/refactoring-patterns.md`, "Reducer or discriminated union", "Single authority, derived adapters" | AGS | `skills/react-state-transitions/references/refactoring-patterns.md`, "Anti-patterns in a target design"; `SKILL.md`, "Scope" | Stated once each (consolidation rule 5) |
| 26 | Anti-patterns in a target design | `references/refactoring-patterns.md`, "Anti-patterns (target design)" | AGS | `skills/react-state-transitions/references/refactoring-patterns.md`, "Anti-patterns in a target design" | |
| 27 | Implementation mode steps, including tests, type check and lint | `references/refactoring-patterns.md`, "Implementation mode" | AGS | `skills/react-state-transitions/references/refactoring-patterns.md`, "Implement mode"; names the `check` skill conditionally | |

## Run 2: D2 and HXP

Sources are paths in `designer2/` (D2, `.agents/` untracked) and `hxpoc/` (HXP), read on 2026-09-28 (spec Appendix H, group 2). Their git conventions, the variants of consolidated skills and rules, the `write-last-n-diff.ps1` and `write-range-diff.ps1` files and `react-state-transitions/agents/openai.yaml` are rowed under `## Run 2: consolidation`; the useful diff-writer behavior is `AGS` there (`### write-commit-diff`).

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | `smoke-save` skill | D2 `.agents/skills/smoke-save/SKILL.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Used only by D2 (P23) |
| 2 | `smoke-branch-merge` skill | D2 `.agents/skills/smoke-branch-merge/SKILL.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Used only by D2 (P23) |
| 3 | `windows-browser-use` skill: launch Chrome with a remote-debugging port | D2 and HXP `.agents/skills/windows-browser-use/SKILL.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Contradicts Layer 0's browser rules; reconciled with them at Phase E (spec Appendix H, "Known dispositions") |
| 4 | Forms guidance | D2 and HXP `.agents/guidance/forms.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Used only by D2 and HXP (P23) |
| 5 | Linting and formatting guidance | D2 `.agents/guidance/linting-and-formatting.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Used only by D2 (P23) |
| 6 | The six state records | D2 `.agents/guidance/state/feature-flags.md`, `serialized-design.md`, `service-vs-zustand.md`; HXP `.agents/guidance/state/auth-token.md`, `permissions.md`, `selected-application.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Filled records are host material under `.agents/local/`, linked from a host rule (`rules/state-topology.md`, "Records") |
| 7 | afterFileEdit hooks: ESLint fix (D2, HXP) and Prettier format (HXP), with their adapter copies | D2 `.agents/hooks/` (`hooks.json`, `lint-fix-eslint-ts.js`, `README.md`), `.cursor/hooks.json`, `.cursor/hooks/lint-fix-eslint-ts.js`; HXP `.agents/hooks/` (`hooks.json`, `lint-fix-eslint.js`, `format-with-prettier.js`, `README.md`), `.cursor/hooks.json`, `.cursor/hooks/` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Used only by D2 and HXP (P23) |
| 8 | Repository profiles: fact block, verified premises, tooling pins; HXP federation import contract and runtime identity checkpoint; D2 owner layer | D2 and HXP `.agents/guidance/repository-profile.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts for their `AGENTS.md` at install, as Watcher's became (P23) |
| 9 | Landmines, and D2's modern-versus-legacy note | D2 and HXP `.agents/guidance/repository-profile.md`, "Adapter landmines"; D2 `.cursor/rules/00-d2-generated.mdc`, "Modern vs legacy", "Landmines"; HXP `.cursor/rules/00-hxp-generated.mdc`, "Landmines" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host facts (P23) |
| 10 | Candidates for shared guidance | D2 and HXP `.agents/guidance/candidates.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Host material; the candidates workflow itself is `Removed` (`## Run 2: Watcher backup`, `### _agents/guidance/candidates.md` row 2) |
| 11 | Pilot observations log and steward handoff | D2 and HXP `.agents/stewardship/PILOT-OBSERVATIONS.md`, `STEWARD-HANDOFF.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Records, as Watcher's became (P13) |
| 12 | Host archives: curated history and session material | D2 `.agents/archive/README.md` and `.cursor/plans/`, `records/`, `reviews/`, `reference/`, `history/`; HXP `.agents/archive/` (`README.md` and five records) | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Records; `.agents/` becomes AGS-owned at install |
| 13 | Guidance indexes and tree maps | D2 and HXP `.agents/README.md`, `.agents/guidance/README.md` | Removed | None | The AGS layout and block replace them (spec 10; P23) |
| 14 | Machine-local notes template | D2 and HXP `.agents/guidance/local.example.md` | Removed | None | `.agents/local/` replaces it (spec 11.6; P23) |
| 15 | Adapter generator | D2 and HXP `.agents/scripts/generate-adapters.mjs` | Removed | None | The AGS block replaces generated adapters (P23) |
| 16 | LLM snapshot script | D2 and HXP `.agents/scripts/snapshot-llm-system.mjs` | Removed | None | `ags snapshot` replaces it (P23) |
| 17 | Leftover mover | D2 and HXP `.agents/scripts/migrate-local.mjs` | Removed | None | The AGS cutover (prepare) replaces it (P23) |
| 18 | Scripts README and diff helper usage | D2 and HXP `.agents/scripts/README.md` | Removed | None | The scripts are gone; diff usage lives in `skills/write-commit-diff/SKILL.md` (P23) |
| 19 | Meta discovery | D2 and HXP `.agents/stewardship/meta.md` | Removed | None | AGS replaces Meta discovery (P13) |
| 20 | Generated pointer rule: canonical entry, AGS-owned layer, verified-facts and verification pointers, precedence | D2 `.cursor/rules/00-d2-generated.mdc`; HXP `.cursor/rules/00-hxp-generated.mdc` | Removed | None | The AGS block supersedes generated pointer rules (P23); their landmines are row 9 |
| 21 | Profile verifier: layout checks | D2 and HXP `.agents/scripts/verify-profile.mjs` | Removed | None | Superseded by `ags doctor` (P12) |
| 22 | Profile verifier: repository facts checked against the repository | D2 and HXP `.agents/scripts/verify-profile.mjs` | Backlog | `BACKLOG.md`, Guidance, "Host fact verification" | No AGS home yet (P12) |

## Run 2: Meta

Sources are paths in `meta/templates/` (Meta has no history), read on 2026-09-28 (spec Appendix H, group 3). Meta's versions of consolidated skills and rules, `plans.mdc`, and `ags/shared/scripts/write-last-n-diff.ps1` are rowed under `## Run 2: consolidation`; the useful diff-writer behavior is `AGS` there (`### write-commit-diff`).

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Shared module index and copy-then-point workflow | `ags/shared/README.md` | Removed | None | AGS V2's catalog and install supersede it |
| 2 | Shared scripts README | `ags/shared/scripts/README.md` | Removed | None | The canonical `write-commit-diff` script and its skill supersede it |
| 3 | Per-host adoption records | `ags/pins/README.md`, `ags/pins/*.yaml` | Removed | None | AGS V2's registry and each host's `.agents/ags.yaml` supersede them; used only as evidence for dispositions |
| 4 | Designer2 consumer snapshot | `ags/consumers/designer2/` | Removed | None | Superseded by AGS V2's install; D2's own `.agents/` is the Phase E source (`## Run 2: D2 and HXP`) |
| 5 | `smoke-save` and `smoke-branch-merge` skills | `ags/shared/skills/smoke-save/`, `ags/shared/skills/smoke-branch-merge/` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Used only by D2 (P23) |
| 6 | `windows-browser-use` skill | `ags/shared/skills/windows-browser-use/` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | With the D2 and HXP copies and Layer 0's browser rules (spec Appendix H, "Known dispositions") |
| 7 | Graphify rule | `rules/graphify.mdc` | Backlog | `BACKLOG.md`, Tools, "Tools catalog and `ags tools`" | Spec Appendix H, "Known dispositions" |
| 8 | Commit, ship and rebase routing line | `rules/code-hygiene.mdc`, "Exploration" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Retired or reworded with the Layer 0 routing line (P21) |

## Run 2: Layer 0

Sources are the Layer 0 files before the Run 2 routing edit, in AGS `.tmp/records/2026-09-28-run2-layer0-before/` (`user-rules.md`, `00-layer0.mdc`), and `~/.cursor/rules/01-no-chrome-protocol.mdc` and `~/.cursor/skills/rebase-onto/SKILL.md` (spec Appendix H, group 4). The personal `commit-granular`, `ship` and `css-audit` skills are rowed under `## Run 2: consolidation`.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Routing line: `commit`, `ship`, `rebase onto` go to the named skills | `user-rules.md` and `00-layer0.mdc`, "Lean sessions" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Retired or reworded once D2 and HXP have the AGS skills (spec Appendix H, "Known dispositions") |
| 2 | Standards line: project standards come from `AGENTS.md`, `.agents/`, then `.cursor/rules/` such as `code-standards.mdc` and `git.mdc` | `user-rules.md` and `00-layer0.mdc`, "Artifacts" | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Same as row 1 |
| 3 | Windows browser rules: no `chrome://` URLs or browser-use CDP probes unless remote debugging is active; prefer Playwright | `00-layer0.mdc`, "Windows browser automation"; `~/.cursor/rules/01-no-chrome-protocol.mdc` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Reconciled with `windows-browser-use` at Phase E (spec Appendix H, "Known dispositions") |
| 4 | `rebase-onto` personal skill | `~/.cursor/skills/rebase-onto/SKILL.md` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | Consolidate against the git skills or keep it personal, decided at Phase E (P21) |
| 5 | Retiring the personal `commit-granular`, `ship`, `rebase-onto` and `css-audit` copies | `~/.cursor/skills/` | Backlog | `BACKLOG.md`, Hosts, "Phase E sources" | P21 |

## Run 2: AGS 2.0.x material

AGS items with no variant in any other Run 2 source (spec Appendix H, group 5). Sources are AGS paths at `v2.0.1`; none changed in Run 2 step 4.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | `core` strong rule | `v2.0.1:rules/core.md` | AGS | `rules/core.md` | Kept; no other variant |
| 2 | `tmp-conventions` soft rule | `v2.0.1:rules/tmp-conventions.md` | AGS | `rules/tmp-conventions.md` | Kept; no other variant. The Run 2 probe (step 3.3) contradicted no sentence |
| 3 | `report-usage` skill | `v2.0.1:skills/report-usage/SKILL.md` | AGS | `skills/report-usage/SKILL.md` | Kept; no other variant |
| 4 | `check` skill and its script | `v2.0.1:skills/check/` | AGS | `skills/check/SKILL.md`, `skills/check/scripts/run-checks.mjs` | Kept; no other variant |
| 5 | `ui-library-css` skill | `v2.0.1:skills/ui-library-css/SKILL.md` | AGS | `skills/ui-library-css/SKILL.md` | Kept; no other variant |

## Run 2: prose pass

Merges and removals of the wording pass (plan step 6.1, P25). Sources are AGS paths at `v2.1.0`. No id, setting key, `params`, `includes` or behavior changed.

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Host guidance wins on repository facts such as path aliases and verification commands | `v2.1.0:rules/code-idioms.md`, intro | Removed | None | Repeated in `rules/core.md`; the sentence keeps that the surrounding code's style also wins |
| 2 | Shared and presentational components stay prop-driven; a composition hook does not replace props at reusable boundaries | `v2.1.0:rules/code-idioms.md`, "Feature composition hooks" 2 and "State" 3 | AGS | `rules/code-idioms.md`, "State"; "Feature composition hooks" points to it | Merged into the "State" exception |
| 3 | The main branch is protected and never deleted | `v2.1.0:skills/git-cleanup/SKILL.md`, "Host settings" | Removed | None | Repeated in `skills/git-cleanup/SKILL.md`, "Exclusions"; the key line now follows spec Appendix D |
| 4 | The main branch is the default merge request target | `v2.1.0:skills/ship/SKILL.md`, "Host settings" | Removed | None | Repeated in `skills/ship/SKILL.md`, "4. Target"; the key line now follows spec Appendix D |
| 5 | Asking to ship is the request to commit | `v2.1.0:skills/ship/SKILL.md`, "5. Commit" | Removed | None | Repeated in `skills/commit-granular/SKILL.md`, "Trigger" and "When to commit" |
| 6 | Host guidance wins on the kind list, subject shape and body rule | `v2.1.0:skills/commit-granular/SKILL.md`, intro | Removed | None | Repeated in `rules/core.md` (host guidance wins on formats) |
| 7 | Do not invent a ticket id | `v2.1.0:skills/start-branch/SKILL.md`, "Do not" 2 | Removed | None | Repeated in `skills/start-branch/SKILL.md`, "Branch name" 3 |
| 8 | `.tmp/` is gitignored; read plan files by direct path because built-in search may skip them | `v2.1.0:skills/plan-work/SKILL.md`, "Where plans go" 2 | Removed | None | Repeated in `rules/tmp-conventions.md`, "Ignoring and reading" |
| 9 | Plan folder name `.tmp/plans/YYYY-MM-DD-kebab-slug/` and records keep their existing name | `v2.1.0:skills/plan-work/SKILL.md`, "Where plans go" 1 and "When the work is done" 1 | Removed | None | Repeated in `rules/tmp-conventions.md`, "Names"; the skill still says a plan with supporting files becomes a folder |
| 10 | Report the diff path, not its content; paste it only on request | `v2.1.0:skills/write-commit-diff/SKILL.md`, "Procedure" 5 and "Output" 2 | AGS | `skills/write-commit-diff/SKILL.md`, "Procedure" 5 | Merged the two statements into the procedure step |
| 11 | The patterns are decision tools, not mandatory recipes | `v2.1.0:skills/react-state-transitions/SKILL.md`, "Workflow" 7 | Removed | None | Repeated in `skills/react-state-transitions/references/refactoring-patterns.md`, intro |
| 12 | Unknown product intent is a decision or an ambiguity, not a high-confidence correctness finding | `v2.1.0:skills/react-state-transitions/references/review-and-planning.md`, "Three confidence scores" | Removed | None | Repeated in `skills/react-state-transitions/SKILL.md`, "Workflow" 5; the reference keeps listing the evidence needed |
| 13 | `useLayoutEffect` hides a frame from paint but can leave ownership and effect order load-bearing | `v2.1.0:skills/react-state-transitions/references/review-and-planning.md`, "Observability" 3 | Removed | None | Repeated in `skills/react-state-transitions/SKILL.md`, "Core model"; trace item 4 still asks about it |
| 14 | Several setters in one synchronous event can be a sound transition | `v2.1.0:skills/react-state-transitions/references/review-and-planning.md`, "Observability" 4; `refactoring-patterns.md`, "One event, full internal transition" | AGS | `skills/react-state-transitions/SKILL.md`, "Core model" | Stated once in the core model; "Observability" keeps the contrast with post-paint repair |
| 15 | The list of external systems whose synchronization may set React state | `v2.1.0:skills/react-state-transitions/references/review-and-planning.md`, "False-positive checks" 1; `refactoring-patterns.md`, "External synchronization effect" | AGS | `skills/react-state-transitions/SKILL.md`, "Core model" | Both references now point to the core model list |
| 16 | Do not move state upward by default | `v2.1.0:skills/react-state-transitions/references/review-and-planning.md`, "False-positive checks" 10 | Removed | None | Repeated in `skills/react-state-transitions/SKILL.md`, "Scope" |
| 17 | Implement only when the user explicitly asked | `v2.1.0:skills/react-state-transitions/references/refactoring-patterns.md`, "Implement mode" | AGS | `skills/react-state-transitions/SKILL.md`, "Modes" | The reference points to "Modes" instead of restating it |
| 18 | Do not redeclare what cascade, inheritance or a default already provides; prefer fewer declarations | `v2.1.0:skills/css-authoring-conventions/SKILL.md`, "Declarations" 2 and 3 | AGS | `skills/css-authoring-conventions/SKILL.md`, "Declarations" 2 | Two bullets merged, keeping both exceptions |
