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

Sources are files in Watcher's prepare backup, `.tmp/ags/backups/2026-09-28-144501-prepare/` (taken from Watcher commit `d40179a`), named relative to that folder. Destinations prefixed "Watcher" are paths in the Watcher repository. `Migrate later` rows wait for the Run 2 consolidation (step 4) and are resolved in place.

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
| 15 | Touch only needed lines; no drive-by refactors; do not mix formatting and behavior; soft cap of 300 lines | `AGENTS.md.bak`, "Hygiene" 4 to 6 | Migrate later | Watcher `.agents/rules/code-idioms.md`, "Changes"; consolidation, step 4 | Waits for the Run 2 consolidation |
| 16 | Skim code idioms, state topology and `documentation/ui.md` before such work | `AGENTS.md.bak`, "Hygiene" 7 | Removed | None | Host rule descriptions in the AGS block route this |
| 17 | Validate at system boundaries; no defensive checks on internal paths | `AGENTS.md.bak`, "Hygiene" 8 | Migrate later | Watcher `.agents/rules/code-idioms.md`, "Changes"; consolidation, step 4 | Waits for the Run 2 consolidation |
| 18 | TODOs cite a ticket or plan | `AGENTS.md.bak`, "Hygiene" 9 | Migrate later | Watcher `.agents/rules/code-idioms.md`, "Changes"; consolidation, step 4 | Waits for the Run 2 consolidation |
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
| 6 | Trunk `main` | "Trunk" | Host | Watcher `git.mainBranch` in `.agents/ags.yaml` | The interim `git-conventions` rule is deleted at step 5.1 (P26) |
| 7 | Ship pointer with the GitLab merge request URL | "Ship" | AGS | `skills/ship/SKILL.md`, "7. Push", "8. Merge request" | The provider comes from Watcher's remote |
| 8 | Commit range diffs pointer | "Commit range diffs" | AGS | `skills/write-commit-diff/SKILL.md` | Native skill discovery routes it |

### _agents/guidance/code-idioms.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Component structure example and ordering | "Component structure" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 2 | Types | "Types" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 3 | Imports (relative client imports, `@shared`, server `.js` imports) | "Imports" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 4 | Callbacks and hooks | "Callbacks and hooks" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 5 | State ladder, no mirrored server state, no prop drilling, ask before Context | "State ladder" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 6 | Client API boundary and naming | "Client API" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 7 | Components and UI | "Components and UI" | Migrate later | Watcher `.agents/rules/code-idioms.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 8 | Vitest outside baseline; colocated tests | "Testing" | Host | Watcher `AGENTS.md`, "Commands"; `.agents/rules/code-idioms.md`, "Testing" | |

### _agents/guidance/state-topology.md, _agents/guidance/state/README.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Record labels, the fifteen fields, the method | `state-topology.md`, "Record labels", "The fifteen fields", "Method" | Migrate later | Watcher `.agents/rules/state-topology.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 2 | Watcher ownership snapshot and modal route codec | `state-topology.md`, "Watcher ownership snapshot" | Host | Watcher `.agents/rules/state-topology.md` | |
| 3 | Optional topology records | `state-topology.md`, "Records"; `state/README.md` | Host | Watcher `.agents/local/state/README.md` | |

### _agents/guidance/diagnostics.md, _agents/guidance/server.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Diagnostics mode: enable, in-app log, reading `[wdiag]`, probes, retire procedure, implementation map | `diagnostics.md` | Host | Watcher `.agents/rules/diagnostics.md` | |
| 2 | Express layout, endpoints, entities, operation logs, file operations, imports, after-change steps | `server.md` | Host | Watcher `.agents/rules/server.md` | |

### _agents/guidance/candidates.md

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | Forward drift and explicit non-candidates | "Forward drift", "Explicit non-candidates" | Host | Watcher `.agents/local/candidates.md` | |
| 2 | Candidates-list format and how candidates mature | "How candidates mature" | Migrate later | Watcher `.agents/local/candidates.md`; consolidation, step 4 | Waits for the Run 2 consolidation |

### _agents/skills/

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | `css-authoring-conventions`: concepts the installed skill states | `skills/css-authoring-conventions/SKILL.md`, "Declarations", "Selectors and naming", "Markup and components", "Style-related APIs" | AGS | `skills/css-authoring-conventions/SKILL.md` | |
| 2 | `css-authoring-conventions`: Watcher documents, shell primitives, `src/client/components`, density, `ButtonTheme`, `Portal` | same file, "Authority" and Watcher-named bullets | Host | Watcher `.agents/local/css-authoring-conventions.md` | |
| 3 | `css-authoring-conventions`: preserve global marker classes; floating surfaces layer above their owner | same file, "Selectors and naming", "Markup and components" | AGS | `skills/css-authoring-conventions/SKILL.md`, "Selectors and naming" (marker classes), "Markup and composition" (floating surfaces) | |
| 4 | `css-cleanup`: grep audit, confirm, remove, verify | `skills/css-cleanup/SKILL.md` | AGS | `skills/css-cleanup/SKILL.md` | |
| 5 | `css-cleanup`: no audit script in `package.json`; importers under `src/` | same file | Host | Watcher `.agents/local/css-cleanup.md` | |
| 6 | `css-cleanup`: prefer keep over break; check nested selectors, `composes`, marker classes | same file | Migrate later | Watcher `.agents/local/css-cleanup.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 7 | `css-theme-tokens` Watcher variant | `skills/css-theme-tokens/SKILL.md` | Migrate later | Watcher `.agents/skills/watcher-css-theme-tokens/SKILL.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 8 | `git-cleanup`: trigger, scope, fetch and prune, stale-based, confirm before delete, preview of unpushed work | `skills/git-cleanup/SKILL.md` | AGS | `skills/git-cleanup/SKILL.md` | |
| 9 | `git-cleanup`: remote, `origin/main`, 30 days, `master` and `develop`, `backup-` prefix | same file, "Config" | AGS | `skills/git-cleanup/SKILL.md`, "Remote and main reference", "Exclusions" | The 30 days, the protected names and the prefix are shared text; `origin/main` derives from `git.mainBranch` and the remote is read from Git; the Watcher host note is deleted at step 5.1 |
| 10 | `git-cleanup`: three levels (gone upstreams, stale locals, preview only) | same file, "Orchestration", "Level 1" to "Level 3" | AGS | `skills/git-cleanup/SKILL.md`, "Levels" | |
| 11 | `graphify` skill | `skills/graphify/SKILL.md` | Backlog | `BACKLOG.md`, Tools, "Tools catalog and `ags tools`" | Graphify left Watcher |
| 12 | `plan-work`: skeleton, decision log, done when, skip tiny fixes | `skills/plan-work/SKILL.md` | AGS | `skills/plan-work/SKILL.md` | |
| 13 | `plan-work`: naming `YYMMDD-snake_case` and `.cursor/plans/` drafts | same file, "Naming", "Location and lifecycle" | Removed | None | `tmp-conventions` sets `.tmp/plans/YYYY-MM-DD-kebab-slug.md` (consolidation rule 1) |
| 14 | `plan-work`: promote durable notes when done (to `.agents/archive/`, now `documentation/`) | same file, "Location and lifecycle" 3 | Host | Watcher `.agents/local/plan-work.md` | The archive folder left with the old tree |
| 15 | `plan-work`: the five-file threshold, when-to-plan list, review drafts in merge requests or tickets | same file, "Trigger", "When to plan", "Location and lifecycle" 1 | Migrate later | Watcher `.agents/local/plan-work.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 16 | `ship` Watcher variant | `skills/ship/SKILL.md` | AGS | `skills/ship/SKILL.md` | Every step is in the consolidated skill, with `main` from `git.mainBranch`; its "rebuild Graphify only on request" line is dropped because Graphify left Watcher |
| 17 | `write-commit-diff`: last N and range modes, `.tmp` output, report the path not the content | `skills/write-commit-diff/SKILL.md` | AGS | `skills/write-commit-diff/SKILL.md`; `skills/write-commit-diff/scripts/write-commit-diff.mjs` (`commits`, `range`) | |
| 18 | `write-commit-diff`: trigger phrases (generate, create, make a diff of commits, export a range, last N) | same file, "Trigger" | AGS | `skills/write-commit-diff/SKILL.md` | Promoted from Watcher in the Run 2 round-trip edit (2.0.1) |
| 19 | `write-commit-diff`: script instead of pasted or hand-rolled diffs; ask once on an ambiguous range; file naming; reply with the commits; not for ordinary `git diff` | same file, "Procedure", "Do not" | Migrate later | Watcher `.agents/local/write-commit-diff.md`; consolidation, step 4 | Waits for the Run 2 consolidation |
| 20 | `write-commit-diff`: output `.tmp/<name>.diff` | same file | Removed | None | `tmp-conventions` puts scratch output under `.tmp/scratch/` |
| 21 | `write-last-n-diff.ps1`, `write-range-diff.ps1`: PowerShell implementations | `skills/write-commit-diff/*.ps1` | Removed | None | Superseded by the Node script; their `commits` and `range` behavior is row 17 |
| 22 | `write-range-diff.ps1`: `-Repo` other checkout and `-OutInRepo` | `skills/write-commit-diff/write-range-diff.ps1` | Removed | None | The AGS script runs in the repository it writes to; run it from the other checkout instead |

### _agents/archive/, _agents/stewardship/

| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | History curation rule (five records, no living documents) | `archive/README.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/archive/README.md` | Kept as a record |
| 2 | Agent Skills discovery migration record | `archive/agent-skills-discovery-migration.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/archive/` | |
| 3 | Front-end architecture pause handoff | `archive/frontend-architecture-pause.md` | Host | Watcher `.tmp/records/2026-09-28-watcher-agents-records/archive/`; summary in `.agents/rules/state-topology.md` | |
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
