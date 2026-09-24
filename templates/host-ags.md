# AGS

This repository uses the canonical AGS at `{{canonicalRoot}}`.

Confirm that the canonical root is readable and writable before substantive work. If either access is unavailable, stop and tell the user which path or operation failed so access can be fixed. Do not continue from cached guidance or create a local replacement.

Read first:

- `{{canonicalRoot}}/AGENTS.md`
- `{{canonicalRoot}}/rules/core.md`
- `.agents/local/` when it contains relevant host guidance

Selected rules:

{{rules}}

Selected skills—load only when relevant:

{{skills}}

Host-local exceptions:

{{localExceptions}}

Host operational settings. Do not invent a missing value:

{{operations}}

Use `ags` for supported deterministic operations. Engagement levels 0 through 8 are defined in `{{canonicalRoot}}/rules/core.md`. Level 9 is only for canonical change reports.

```powershell
ags report usage --route . --file rules/core.md=4 --file skills/check/SKILL.md=6
ags report changes --route . --file skills/check/SKILL.md --note "Use package scripts only"
```
