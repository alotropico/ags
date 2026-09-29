---
name: plan-work
description: Create an execution procedure for ambiguous or cross-cutting work in .tmp/plans/, with decisions and a done condition. Use for an ordinary request to plan implementation. Do not create a separate specification unless the user asks for one.
---

# Plan work

**Trigger:** The task touches more than about five files, requirements are ambiguous, or the user asks to plan or record decisions.

An ordinary plan is an execution procedure for an understood objective. It may record assumptions, but it does not create a separate specification or conduct a general backlog sweep. If the requested artifact could materially mean a specification, a deferred inventory, or a spec-first plan, ask one concise question instead of silently choosing.

## When to plan

- Multi-file architectural or cross-cutting work.
- Unclear ownership, acceptance criteria or migration boundaries.
- A library or tradeoff choice that is not obvious and that future readers need to understand.

Skip a tiny one-file fix with a clear done condition.

## Where plans go

- Write the plan in this repository at `.tmp/plans/YYYY-MM-DD-kebab-slug.md`, following the `tmp-conventions` rule. A plan with supporting files, such as to-dos or open questions, becomes a folder of the same name.
- Do not create plan stores under `.agents/` or `.cursor/`.
- When the user or host guidance asks for it, draft the plan where the team reviews it with the change instead, such as a merge request description or a ticket, or in another location they name.

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

Record each non-obvious decision in the plan as you go, one line each: a library pick, a rejected approach, an ownership ruling.

If the work reveals a genuine deferral, use the `manage-backlog` skill when it is installed. Do not turn non-goals or rejected approaches into backlog entries automatically.

## When the work is done

- Move a plan worth keeping to `.tmp/records/`, and a stale one to `.tmp/archive/YYYY-MM/`. Do not edit a record afterwards beyond a short completion note.
- Promote only durable architectural notes into the repository's tracked documentation, where host guidance names a place for them. Ephemeral to-dos stay out of tracked history.
- Do not leave imperative living-document instructions in tracked guidance.

## Done when

- The acceptance criteria in the plan are met.
- Verification follows the repository's own scripts; use the `check` skill when it is installed. Do not invent a package manager or a script name.
- The decision log captures anything non-obvious.
- Work meant to stay local, such as a plan alone, leaves tracked files unchanged.
