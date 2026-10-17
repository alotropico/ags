---
name: ags-sweep
description: Classify temporary plans, records and scratch artifacts into a hash manifest for reviewed deterministic archival with ags tmp clean.
---

# Sweep temporary artifacts

Run `ags tmp inspect --route .` to inventory eligible paths and SHA-256 hashes. Read an artifact only when needed to decide whether it remains active, should be kept, is completed or should be archived.

Write only a JSON manifest named `.tmp/records/YYYY-MM-DD-sweep.json`:

```json
{
  "schemaVersion": 1,
  "archiveMonth": "2026-10",
  "entries": [
    { "path": ".tmp/plans/2026-10-01-example.md", "hash": "<SHA-256 from inspection>", "disposition": "completed" }
  ]
}
```

Use the actual archive month and inspection hashes. Dispositions are `active`, `keep`, `completed` and `archive`. Classify uncertain artifacts as `keep`. Unmarked files remain untouched. Do not classify `.tmp/ags/`, archives, links or the manifest itself.

Show `ags tmp clean --manifest <file> --dry-run` for review. Only `completed` and `archive` entries move, preserving paths and filenames beneath `.tmp/archive/YYYY-MM/`. The command rejects stale hashes and collisions. Use the exact reviewed digest when applying; the skill never moves or deletes artifacts itself.
