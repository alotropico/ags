# Reporting

[Index](README.md) · [Commands](commands.md)

Usage reporting is optional per host. `reporting: false` in `.agents/ags.yaml` disables recording and writes no usage events. The `report-usage` skill records an outcome after meaningful implementation, investigation, planning, or validation, when reporting is enabled and `ags` is available. It skips individual reads, tool calls, and duplicate outcomes.

| Command | Purpose |
| --- | --- |
| `ags report usage` | Record a known action and outcome in the host spool. |
| `ags report collect` | Collect new events. `--route`, `--host`, or `--all`. Leaves spools in place. |
| `ags report compact` | Compact closed central usage segments. |
| `ags report clean --before YYYY-MM` | Review central cleanup and store a cutoff so those months are not collected again. |

## What a record holds

A known action, type, and outcome. The host and its AGS version. Optional harness and session context. A normalized prompt capped at 160 characters. Attachment basenames.

Legacy `path=level` values are still accepted. The skill does not generate scores.

The host spool is `.tmp/ags/reports/usage.jsonl`.

## Collection

Collection copies new events into the AGS checkout and leaves the host spool as it was. Malformed lines produce a warning. An incomplete tail is deferred. Events already present in raw or compact data are deduplicated. Collection takes a central lock.

Central segments are `reports/usage/YYYY-MM-NNN.jsonl`. A segment closes at 1,000 records or at the end of its month. A closed segment stays closed.

Run logs under `reports/runs/` are separate. Cleanup does not touch them.

## Compaction and cleanup

`ags report compact` verifies groups, counts, time bounds, and source ids under `reports/usage/compact/` before it deletes raw inputs. A conflict preserves the input and fails.

`ags report clean --before YYYY-MM` writes `reports/usage/retention.json` first, so a later collection does not bring the cleaned months back.

`reports/` is gitignored and machine-local to the AGS checkout.

── ◈ ──

[Index](README.md)
