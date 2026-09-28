---
name: report-usage
description: Record which AGS guidance files were used after substantive work, and how much each one mattered, with ags report usage. Use at the end of a substantive task when the ags command is available.
---

# Report guidance usage

Use this skill after substantive work, if the `ags` command is available. Skip it when `ags` is not installed.

## Command

Run from the repository root:

```text
ags report usage --route . --file <host path>=<level> [--file <host path>=<level> ...] [--label "<text>"]
```

- `<host path>` is a file AGS installed at the installed version, such as `.agents/skills/plan-work/SKILL.md` or `.agents/rules/tmp-conventions.md`, or `AGENTS.md` for the AGS block.
- `--label` is an optional short description of the task.
- Give each file once. If a file appears twice, the highest level counts.
- When `.agents/ags.yaml` has `reporting: false`, the command records nothing and still succeeds.

Example:

```text
ags report usage --route . --file AGENTS.md=4 --file .agents/skills/plan-work/SKILL.md=6 --label "Plan the export feature"
```

## Levels

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
