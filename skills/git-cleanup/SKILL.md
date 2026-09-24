---
name: git-cleanup
description: Inspect and clean stale local Git state with explicit destructive confirmation.
---

# Git cleanup

**Trigger:** The user explicitly asks for Git cleanup or stale branch cleanup using this skill. Do not run it during an unrelated task.

**Scope:** The current repository clone only.

## Required host setting

Read `git.mainBranch` from the verified host's `.agents/ags.yaml`. It is the protected base branch. If `git.mainBranch` is absent, stop and ask the user to configure the host. Do not infer a branch and do not write one during this skill.

Read the current branch and the remotes from Git. If more than one remote could be the correct one, stop and ask. Do not invent a remote.

## Exclusions

Never delete the current branch, `git.mainBranch`, or a branch named by explicit host-local guidance under `.agents/local/`.

Do not force-delete a branch because it appears merged. Squash and rebase make that signal unreliable. Cleanup is stale-based. Use `git branch -d`. If `-d` refuses, report that refusal. Use force-delete only when the user names that branch and explicitly confirms the force.

## Preview, then delete

1. Fetch and prune the confirmed remote first.
2. Print a preview and stop before any deletion.
3. Show the exact candidate list: branch, upstream, tip, tip date, and reason.
4. Delete only the candidates the user confirms.

Also list, without deleting, branches that have no upstream or unpushed commits, stashes, and backup branches that may hold unique work. Remove one of those only when the user names it.

When the user asks for preview only, print the candidate list and delete nothing.
