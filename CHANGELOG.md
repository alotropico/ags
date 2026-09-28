## Unreleased

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
