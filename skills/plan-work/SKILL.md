---
name: plan-work
description: Plan ambiguous or cross-cutting work in a durable plan file under .tmp/plans/. Use when a task touches many files, requirements are unclear, or the user asks to plan or record decisions.
---

# Plan work

**Trigger:** The task touches many files, requirements are ambiguous, or the user asks to plan or record decisions.

Skip a tiny one-file fix with a clear done condition.

## Where plans go

- Write the plan in this repository at `.tmp/plans/YYYY-MM-DD-kebab-slug.md`, following the `tmp-conventions` rule. A plan with several files becomes a folder `.tmp/plans/YYYY-MM-DD-kebab-slug/`.
- `.tmp/` is gitignored. Read plan files by direct path; built-in search may skip them.
- Do not create plan stores under `.agents/` or `.cursor/`.
- Host guidance may name another durable location for plans; follow it when it does.

## Plan skeleton

```markdown
# Title

## Goal
## Non-goals
## Approach
## Files likely touched
## Risks / open questions
## Decision log
## Done when
```

Record a non-obvious decision in the plan as one line. When the work is done, do not leave imperative living-document instructions in tracked guidance.

## Done when

- The acceptance criteria in the plan are met.
- Verification follows the repository's own scripts; use the `check` skill when it is installed. Do not invent a package manager or a script name.
- The decision log captures anything non-obvious.
