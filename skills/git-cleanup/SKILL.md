---
name: git-cleanup
description: Inspect and clean stale local Git state, with explicit confirmation before each destructive command. Use only when the user asks for Git or stale branch cleanup.
---

# Git cleanup

**Trigger:** The user explicitly asks for Git cleanup or stale branch cleanup using this skill. Do not run it during an unrelated task.

**Scope:** The current repository clone only.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `git.mainBranch` (required): the trunk branch that feature branches start from and merge into. It is protected and never deleted.

Read the current branch and the remotes from Git. If more than one remote could be the right one, stop and ask. Do not invent a remote.

## Exclusions

Never delete the current branch, the main branch from Host settings, or a branch that host guidance names as protected.

Do not force-delete a branch because it appears merged. Squash and rebase make that signal unreliable. Cleanup is stale-based. Use `git branch -d`. If `-d` refuses, report the refusal. Force-delete only a branch the user names, after the user explicitly confirms the force.

## Preview, then delete

1. Fetch and prune the confirmed remote first.
2. Print a preview and stop before any deletion.
3. Show the exact candidate list: branch, upstream, tip, tip date, and reason.
4. Delete only the candidates the user confirms.

Also list, without deleting, branches that have no upstream or have unpushed commits, stashes, and backup branches that may hold unique work. Remove one of those only when the user names it.

When the user asks for a preview only, print the candidate list and delete nothing.
