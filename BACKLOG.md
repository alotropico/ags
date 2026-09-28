# AGS backlog

- Status: live, tracked in git. It replaces the first backlog file, archived at `.tmp/archive/2026-09/2026-09-27-ags-backlog.md`.
- Scope: work deferred from AGS V2. Nothing here is part of V2 unless it moves into the spec, `docs/v2-spec.md`.
- Use: after Run 2, usage-driven additions pick from this list, each released as its own minor version with tests. Concept-ledger rows with the disposition `Backlog` point at the headings and entries here.
- Location: tracked as `BACKLOG.md` at the AGS root, next to `LEDGER.md`, since Run 1 step 1 (spec 28.1).

## CLI and platform

- **Portable CLI.** Run `ags` through `node`, `npm` or `pnpm` on any OS, while keeping `ags` as the terminal command.
  - `package.json` already declares `bin`, so `pnpm link --global` or `npm link` could replace the shims.
  - `scripts/install-global.mjs` is Windows-only: it writes `ags.CMD` and `ags.ps1` shims into `%LOCALAPPDATA%\pnpm`.
  - The `check` script's `.cmd` handling is Windows-only.
  - Related concerns from the direction handoff (section 13): OS detection, terminal and shell differences, path handling, finding install locations.
- **`ags host uninstall`.** Remove managed files and the AGS block, backing up host changes.
- **`--all` mutation flows and batch updates.**
- **Host rollout from `version bump`.** Offer updates for registered hosts after a release; report each host's result and its rerun command.
- **`ags reporting on|off|status`,** if editing `reporting` by hand proves awkward.
- **Reject stray positional arguments.** `ags host install --enable a,b,c` from PowerShell passes `b` and `c` as separate arguments, and AGS silently ignores them. Fail with a usage error on unexpected positionals instead (seen in Run 2 on Watcher).
- **`--key=value` flags.** Accept `--flag=value` next to `--flag value`, if users actually type that form.
- **Markdown link detection.** Handle reference links, angle-bracket links and link-like text inside code examples in catalog link validation, if selected material uses them. Fix observed false positives and missed links before considering a Markdown parser.

## Host lifecycle

- **Continuation journal.** `.tmp/ags/operation.json` in the host, one active operation per host under the host lock. It records the plan digest and hashes, the decisions, the backup location, and completed side effects on the host and on AGS. Changelog notes carry the operation id. A resume continues only while the recorded hashes still match. If the journal is lost, `doctor` warns and the next run replans. A lighter alternative is an in-progress marker that lets `doctor` name an interrupted run and its rerun command. Build either one if Watcher usage shows interruptions matter.
- **Three-way promotion.** Merge with `git merge-file` using the base, the AGS source and the host content. Conflicts stay in the AGS file, with markers labeled `AGS` and the host name. A conflict stops all host writes and does not advance `agsVersion`. This is likely the first usage-driven addition if Watcher edits often touch files AGS changed. It also covers files the target release changed (Tc ≠ B), where `2.0.0` offers only restore and ignore.
- **Assisted carry-over** for an edited AGS block or exclude block: a base-aware diff against the block as last generated, with tests for insertions, replacements, deletions and reordering. It needs the generated block stored, because the rule index depends on the host rules at generation time. V2 restores the block, prints the diff, and leaves moving edits to the user.
- **Local-only hosts,** for D2. A reserved key `mode: tracked | local-only`. Install proposes a value from git state. `doctor` checks it: tracked but not committed is a warning; tracked but ignored is an error; local-only gets a prominent notice that the host loses guidance in fresh clones, worktrees and cloud agents, and cannot share it.
- **Installed-id record.** Store each host's installed ids in the registry, so a host item that uses an AGS id is never mistaken for AGS material.
- **`--worktree` installs.** Install unreleased AGS content into one host to try it before a release. The host is stamped `X.Y.Z+dev`, and the next release replaces it. Until then, the testing loop is: edit in the host, promote the change on the next AGS run, release.
- **Config migrations** (`migrations/<version>.mjs`). Required before `3.0.0`: V2 refuses updates across a major version, so a major release must bring its own explicit configuration and host migration path. It retires removed ids and setting keys from host selections and `ags.yaml`, and allows the cross-major update. Build them with the first breaking change, at the latest with the V3 proto-rules.
- **Separate git folder per host** (`--git-dir` instance repositories that give real merges and history). Parked; revisit if promotions become frequent.
- **Linked worktrees and submodules as hosts.** V2's lifecycle commands refuse a repository whose git directory is not `.git` at its root. Support needs a registry identity per worktree, records per checkout, and a lock shared across worktrees for the common exclude file, which lies outside a linked worktree's root.
- **Automatic renaming of colliding host items.** In V2, a collision between a new AGS id and a host rule or host skill stops install or update before any write and prints the exact rename to `<host id>-<id>`; the user renames by hand and reruns. A later version could offer the rename as a confirmed plan item that moves the file or folder, updates the skill's `name`, and backs up the original.
- **Rendering setting values into copied files.** Rejected for V2, because AGS generates per-host content only in `AGENTS.md` and `.agents/ags.yaml`. Revisit only if agents misread settings.
- **`string-list` settings,** with a defined CLI syntax, when a setting needs a list.
- **Linked setup entries.** Prepare reports a setup file or folder that is a link or junction and leaves it in place. A later version could move the link itself into the backup, with a manifest entry that records its target.
- **Backup renaming wording.** Spec Appendix E.4 says a segment starting with `.` "gets a leading `_`", while its examples replace the dot (`.agents` becomes `_agents`). The code follows the examples; the Appendix F cleanup prompt, printed verbatim, repeats the text's wording. Align both texts with the examples in the Run 2 prose pass.

## Reporting

- **Usage collection** (`ags report collect`, and during update). Rename the host spool into a batch, append its records to `reports/usage/YYYY-MM.jsonl` in AGS with id deduplication, then delete the batch. Add the host name from the registry, and map host paths to source paths. Test concurrent writes.
- **Usage analysis.** Once records are collected: concise structured events, clearer semantics for the usage levels, compact per-run summaries, and cross-run analysis. No telemetry runtime or reporting-level framework.

## Snapshots

- **`ags snapshot source [--out <zip>]`.** Archive the AGS source material for review; it replaces V1's `snapshot canonical`.
- **ZIP64.** Unnecessary for guidance-sized snapshots. If a snapshot approaches ZIP limits, first fail visibly rather than write an invalid archive; implement ZIP64 only for a real case.

## Tools

- **Tools catalog and `ags tools`.** Catalog entries with `id`, `description`, `homepage`, `detect` (an argument list), `installHint`, `outputs` (host-relative paths to exclude), `allowed` and `forbidden`; a skill field `uses`; a host switch `tools.<id>: false`.
  - Installing a tool on the machine opts in; the host setting opts out.
  - `allowed` and `forbidden` are guidance, not enforcement.
  - Tool outputs join the exclude block (`/graphify-out/`, `/.fallow/`). A tool's own repository configuration, such as `.fallowrc.json`, is host-owned.
  - A skill that uses a tool must work without it: "if the tool is available, meaning its detect command succeeds and `tools.<id>` is not `false`, use it; otherwise skip the step".
  - Graphify: the first generation defaults to `graphify extract . --code-only`; rebuild with `graphify update <path>`, which runs without an LLM, and run read-only queries. Never `label`, `install`, `add` or `watch`, and never an LLM backend or model option.
  - Fallow: read-only analysis (`fallow`, `audit`, `health`, `dupes`, `doctor`, `explain`, `config`). Never `fix`, `init` or `migrate` unless the user explicitly asks.
  - Tools need no dedicated skill; the skills that benefit carry the steps.
  - Inputs for the Graphify steps: Watcher's former `graphify` skill and Meta's `templates/rules/graphify.mdc` (spec Appendix H).
- **Tool management.** Let AGS install, update or enable Graphify and Fallow globally, and report their versions.
- **Graphify agentic runs.** LLM-backed extraction, community labeling, and Graphify's own skill (`graphify install`).

## Third-party skills

- **Import:** `ags skills import --from <path> --id <id> --source <locator> --revision <rev> --license <spdx>`, stored under `third-party/<id>/`, with `source` provenance in the catalog (`locator`, `revision`, `license`, `importedAt`, optional `notes`). They install like custom skills and stay inactive in AGS.
- **Contract, agreed in advance:**
  - a missing license is an error;
  - symlinks, reparse points and path escapes are rejected;
  - installation is opt-in only;
  - an audit note is required when the skill includes scripts;
  - before a company repository selects one, its license must allow redistribution. For example, Anthropic's document skills are source-available, not open source;
  - the full trust model is designed at the first import.

## New repositories

- **Boilerplate generator.** Create a new repository by picking a few options, with AGS already installed.

## `.tmp` housekeeping

- **Archiving command.** Move finished or stale plans and records to `.tmp/archive/YYYY-MM/`.
- **Agent sweep skill.** Tidy `.tmp/`, including harness default locations such as `.cursor/plans/`, where Cursor's "save plan to workspace" writes.

## Harnesses

- **Claude Code:**
  - discovering skills in `.claude/skills`, through an extra copy destination or a junction;
  - coexisting with `CLAUDE.md`, through the per-user setting `claude-md-and-agents-md`;
  - hosts that track a team `CLAUDE.md`.
- **Harness adapters in general.** Directory junctions work on Windows without admin rights, and Cursor follows them. Symlinks need admin rights. Git sees untracked junctions as directories to stage unless they are excluded.

## Hosts

- **D2,** with all decisions delayed:
  - untracked `.agents/`, so worktrees and cloud agents get no guidance (see local-only hosts);
  - the tracked 256-line team `CLAUDE.md`;
  - which D2 guidance to restore after install, for example the smoke-save procedure;
  - the trunk `integration-2025Q1`.
- **Phase E sources.** Material from the Run 2 sources (spec Appendix H) that waits for the D2 and HXP installs. Ledger rows filed under Phase E point here:
  - D2- and HXP-only meta inventory rows that Watcher does not use: `smoke-save`, `smoke-branch-merge`, their state records and forms, `linting-and-formatting`, and the afterFileEdit hooks;
  - `windows-browser-use` (D2 `.agents/skills/`, Meta `templates/ags/shared/skills/`) and its overlap with Layer 0's browser rules. The skill launches Chrome with a remote-debugging port. The "Windows browser automation" section of `~/.cursor/rules/00-layer0.mdc` and `~/.cursor/rules/01-no-chrome-protocol.mdc` forbid `chrome://` URLs and browser-use CDP probes unless remote debugging is already active, and prefer Playwright. Reconcile them into one rule set;
  - D2 and HXP branch facts: tickets `CORE-<number>` (`git.ticketPrefix: CORE-`) and new branches based on `integration-2025Q1` (their `git.mainBranch`, or a host note if the trunk differs from the merge request target);
  - D2 and HXP `ship` facts for their host notes: merge requests target and pushes go to `integration-2025Q1`; HXP's Jira story format (title `HXP: {short phrase}` of about 4 to 9 words, outcome-focused body); D2's "regenerate `graphify-out/` only when asked";
  - D2 and HXP `git-cleanup` facts for their host notes: the trunk `integration-2025Q1` as the main reference (their `git.mainBranch`) and the protected local branches `integration-*`;
  - D2 and HXP CSS facts for their host notes of `css-authoring-conventions`, `css-cleanup` and `css-theme-tokens`: the style authority (D2 `documentation/styles.md`, HXP `documentation/styling.md`); the global theme layer and primitives (D2 `src/styles/base.scss`, `src/styles/utilities.scss`, the form shells `.form-component` and `.form-button`; HXP `src/style/_elements.scss` and `src/style/`); the component folders (D2 `src/form_components/`, `src/page-components/`; HXP `src/components`); D2's modern-path scope gate (`src/pages/`, `src/page-components/`, `src/form_components/`, with legacy `src/widgets/`, `src/styles/legacy.scss`, canvas styles and shared `src/styles/` modules left alone); HXP's missing CSS audit script; and their verification commands as `checks.*` values (D2 `check:types` and `lint` through npm, HXP `type-check` and `lint` through Yarn);
  - D2's commit subjects capitalize the change (`Fix: SelectorList, Restore focus after filter clear`), where the shared `commit-granular` writes it in lower case; a D2 host note `.agents/local/commit-granular.md` at Phase E, or D2 adopts the shared form;
  - removing the personal `commit-granular` and `ship` skills, and retiring or rewording the Layer 0 routing and standards lines, once D2 and HXP have the AGS versions.
- **Team collaboration.** Separate personal and team material if others start using AGS in shared repositories such as HXP. Not a concern for now: the owner controls AGS and HXP, and HXP teams work in separate areas.

## Guidance

- **Proto-rules.** `docs/v3-proto-rules.md`, with 51 proto-rules and diagnostic signals, is planned for V3, after the Run 2 consolidation. It covers the state-management and code-quality rules. `3.0.0` needs config migrations first.
- **Host fact verification.** Check the repository facts a host states in `AGENTS.md` (trunk, verification scripts, pinned package majors) against the repository, as Watcher's former `verify-profile.mjs` did. Its layout checks are covered by `ags doctor`; the fact checks have no AGS home yet.
- **`git.ticketPrefix` wording.** The setting's description in `catalog.yaml` and the Appendix D bullet say the prefix is for "branch names and commit subjects", but `commit-granular` puts no ticket id in commit subjects (D2 and Watcher; P28). Reword both to "branch names and merge request titles" in a later release; the skills copy Appendix D verbatim until then.
- **Deeper TanStack and Mantine guidance,** building on the consolidated Run 2 content rather than reconciling variants again.
