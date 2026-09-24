---
name: ship
description: Push the current feature branch and prepare a review link when the remote and target branch are known.
---

# Ship

**Trigger:** The user asks to ship, publish, or push a feature branch for review.

## Preconditions

- The working tree is clean enough to push, or the user has accepted what remains uncommitted.
- Do not create a commit unless the user also explicitly asked to commit.
- Read `git.mainBranch` from the verified host's `.agents/ags.yaml` when a target branch is needed. If it is absent, stop and name the missing key. Do not infer or persist a branch.
- The current branch must not be `git.mainBranch`.

## Inspect Git

Read the current branch, upstream, remotes, and provider from Git. If the remote or the provider is ambiguous, stop and explain what is missing. Do not invent one.

Never force-push `git.mainBranch` or another protected branch. Do not force-push at all unless the user explicitly requests it and names a branch that is not protected.

## Review URL

Push with upstream only when the remote is known:

```bash
git push -u <remote> HEAD
```

Emit a GitLab or GitHub review URL only when the provider, the remote, the pushed branch, and `git.mainBranch` are all deterministic. Otherwise report the push result and say which fact is missing. Do not skip a URL that those facts fully determine, and do not invent a URL when they do not.

Final response includes whether the branch was pushed, the upstream tracking state, and the working tree status.

## Do not

- Ask to connect Jira, GitLab, GitHub, or another integration.
- Depend on a conventions file that is not in this host or in canonical AGS.
