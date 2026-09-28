---
name: ship
description: Push the current feature branch and build the review link for the remote host. Use when the user asks to ship, publish, or push a branch for review.
---

# Ship

**Trigger:** The user asks to ship, publish, or push a feature branch for review.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `git.mainBranch` (required): the trunk branch that feature branches start from and merge into. It is the review target and is never pushed by this skill.

## Preconditions

- The working tree is clean enough to push, or the user has accepted what remains uncommitted.
- Commit only when the user explicitly asks for a commit. This skill defines no commit, branch-name or ticket format; follow host guidance for those.
- The current branch is not the main branch from Host settings.

## Inspect Git

Read the current branch, its upstream, the remotes and the hosting provider from Git. If the remote or the provider is ambiguous, stop and say what is missing. Do not invent one.

Never force-push the main branch or another protected branch. Do not force-push at all unless the user explicitly asks and names a branch that is not protected.

## Push and review link

Push with upstream only when the remote is known:

```bash
git push -u <remote> HEAD
```

Build a GitLab merge request or GitHub pull request link only when the provider, the remote, the pushed branch and the main branch are all known. Otherwise report the push result and say which fact is missing. Do not skip a link that those facts fully determine, and do not invent one when they do not.

The final response states whether the branch was pushed, its upstream tracking state, the review link when there is one, and the working tree status.

## Do not

- Ask to connect Jira, GitLab, GitHub or another integration.
- Depend on a conventions file that is not in this repository.
