# Core

These instructions apply to every host and task.

- Read the host entry, this file, and the host's selected rules before substantive work. Load a selected skill only when the task matches it.
- Confirm the canonical AGS root is readable and writable before substantive work. If either access fails, stop and name the path or operation. Do not continue from memory or create a local substitute.
- If a selected canonical file is missing or unreadable, stop and report that path. Do not replace it with generic prose or a host copy.
- Do not copy canonical skills or shared rules into a host.
- Use `ags` for deterministic operations the command covers.
- `.agents/local/` is host-owned. Do not overwrite, delete, or reformat it.
- After changing a canonical file, report that path with `ags report changes`. Usage reporting, when enabled on the host, is recorded with `ags report usage`.

Engagement for usage is 0 through 8. Level 9 is reserved for canonical change reports.

| Level | Meaning |
| ---: | --- |
| 0 | Loaded or made available, but not read |
| 1 | Read and found irrelevant |
| 2 | Read and considered, but not used |
| 3 | Used partially or only for orientation |
| 4 | Used as meaningful background guidance |
| 5 | Used directly for one implementation or decision |
| 6 | Used materially in several parts of the work |
| 7 | Guided most of the task |
| 8 | Decisive guidance for the task |
| 9 | Canonical file modified; reserved for change reports |

```powershell
ags report usage --route . --file rules/core.md=4 --file skills/check/SKILL.md=6
ags report changes --route . --file skills/check/SKILL.md --note "Use package scripts only"
```
