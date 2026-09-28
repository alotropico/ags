---
name: git-cleanup
description: Inspect and clean stale local Git branches in levels, with explicit confirmation before each destructive command. Use only when the user asks for Git or stale branch cleanup.
---

# Git cleanup

**Trigger:** The user explicitly asks for Git cleanup or stale branch cleanup using this skill. Do not run it during an unrelated task.

**Scope:** The current repository clone only.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `git.mainBranch` (required): the trunk branch that feature branches start from and merge into. It is protected and never deleted.

## Remote and main reference

Read the current branch and the remotes from Git. With one remote, use it. If more than one remote could be the right one, stop and ask. Do not invent a remote.

The main reference is `<remote>/<main branch>`, using the main branch from Host settings, when a remote exists, and the local main branch otherwise.

## Exclusions

Never delete the current branch, the main branch from Host settings, `main`, `master`, `develop`, or a branch that host guidance names as protected.

Backup branches, named with the prefix `backup-`, are protected: they may hold unique work. Remove one only when the user names it.

Do not delete a branch because it appears merged. Squash and rebase make that signal unreliable. Cleanup is stale-based: a branch is stale when its tip commit is more than 30 days old.

Delete with `git branch -d`. If `-d` refuses, report the refusal and move the branch to level 3. Force-delete only a branch the user names, after the user explicitly confirms the force.

## Levels

Inspect first and delete nothing without confirmation. For every level, show the exact candidate list as a table of branch, upstream, tip SHA, tip date and reason, then delete only the candidates the user confirms. Stop after each level and report what was deleted and what was skipped.

1. **Gone upstreams.** Run `git fetch --prune <remote>`, then `git for-each-ref refs/heads/ --format="%(refname:short) %(upstream:track)"`. Candidates are branches whose upstream is `[gone]`. Without a remote, skip the fetch and this level, and say so.
2. **Stale branches without unique work.** Candidates are stale branches whose tip equals their upstream's tip, or is contained in the main reference (`git merge-base --is-ancestor <branch> <main reference>`). When asking about this level, also show the level 3 preview.
3. **Possible unique work, preview only.** List branches with no upstream or with unpushed commits that level 2 did not cover, stashes (`git stash list`), and backup branches, marking a backup whose original branch is gone and whose tip is stale. Delete nothing here by default; remove only the items the user names.

When the user asks for a preview only, run the fetch, print the candidates of all three levels, and delete nothing.
