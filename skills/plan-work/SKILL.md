---
name: plan-work
description: Plan ambiguous or cross-cutting work under the verified host's ignored .tmp directory.
---

# Plan work

**Trigger:** The task touches many files, requirements are ambiguous, or the user asks to plan or record decisions.

Skip a tiny one-file fix with a clear done condition.

## Resolve the host first

Resolve the host from the agent-supplied route and verify it before writing. The working plan path is `<verified-host-root>/.tmp/<descriptive-name>.md`.

Do not write a host plan under the canonical AGS `.tmp` directory or any other canonical path. Canonical `.tmp` is only for work on AGS itself, or for files AGS scripts stage for their own operations.

The durable copy of a plan, when one is needed, comes only from the user or from host-local guidance under `.agents/local/`. Do not create an archive store under `.agents`. Do not recreate `.cursor/plans`, `.cursor/docs`, or another canonical plan store.

## Keep host `.tmp` ignored

Before writing, run `git check-ignore` for `/.tmp/` at the verified host root. If it is already ignored, leave ignore rules alone. If it is not ignored, add one marked block to the repository-local exclude file from `git rev-parse --git-path info/exclude`:

```text
# AGS:BEGIN
/.tmp/
# AGS:END
```

Do not modify the host's tracked `.gitignore`.

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
- Verification follows the host repository and the host `check` skill. Do not invent a package manager or a script name.
- The decision log captures anything non-obvious.
