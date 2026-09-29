## Unreleased

## 3.0.0 - 2026-09-29
- Disposable V3 rehearsal candidate.

## 2.1.2 - 2026-09-28
- doctor reports an unanchored tmp/ line in .cursorignore or .cursorindexingignore, which Cursor also applies to .tmp/.

## 2.1.1 - 2026-09-28
- Prose pass: remove repetition and contradictions across rules and skills, without changing behavior.
- Review correction: git.ticketPrefix is described as the ticket prefix for branch names and merge request titles, matching commit-granular's subjects without ticket ids.
- Review correction: code-idioms applies its general code rules (touched lines, formatting, file size, boundaries, TODOs, secrets) to any code, not only TypeScript and React.
- Review correction: css-authoring-conventions no longer contradicts itself on redundant declarations; skip a value the cascade already provides unless explicitness has a concrete purpose.

## 2.1.0 - 2026-09-28
- New opt-in skill commit-granular: split work into small, well-scoped commits with the shared subject and body format.
- New opt-in skill start-branch: create a feature branch from git.mainBranch, named with git.ticketPrefix when set.
- ship now judges the branch, creates one when needed, commits through commit-granular, pushes, targets the right branch and prepares the merge request title and review material.
- git-cleanup consolidates the host variants: stale-branch levels with confirmation before each destructive step.
- css-authoring-conventions consolidates the host variants into one shared version.
- css-cleanup consolidates the host variants and the personal css-audit: report first, then remove unused selectors, variables and redundant overrides.
- css-theme-tokens covers any repository's theme tokens, with @platform/ui-library facts as their own part.
- plan-work consolidates the host variants and Meta's plans rule.
- write-commit-diff consolidates the host variants; the PowerShell writers are replaced by the script's modes.
- New opt-in soft rule state-topology: fill a state record before changing shared client state.
- New opt-in soft rule code-idioms: shared TypeScript and React idioms.
- New opt-in skill react-state-transitions: audit React state ownership and transitions.

## 2.0.1 - 2026-09-28
- Promoted from Watcher: `skills/write-commit-diff/SKILL.md`

## 2.0.0 - 2026-09-28
- Hosts hold installed copies of released AGS material; AGS is no longer read at runtime.
- New host lifecycle: ags host prepare, install, update, status, list and unregister, with plans, digests, bound decisions, locks, backups and idempotent reruns.
- Host edits to AGS files are reviewed on each run: promote, restore, ignore or disable.
- Releases are annotated tags with CHANGELOG.md notes: ags version, version note and version bump.
- The AGS block in AGENTS.md inlines the core and indexes soft rules; .agents/AGS.md is gone.
- Settings are declared in the catalog, set with --set and stored in .agents/ags.yaml format 2.
- New material: the tmp-conventions rule, the report-usage skill, the write-commit-diff skill with its script, and the check script.
- Removed V1 machinery: canonical-root access, host sync and repair, skill install and reconcile, change reports, ags reporting, and snapshot canonical.
- A run log records every ags invocation in reports/runs/.
