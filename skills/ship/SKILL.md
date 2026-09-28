---
name: ship
description: Ship work for review end to end, from choosing the branch to committing, pushing and preparing the merge request title, description and link. Use only when the user asks to ship, publish, or push work for review.
---

# Ship

**Trigger:** The user asks to ship, publish or push work for review, possibly naming the branch, as in "ship on a new branch X". Ship only on such an explicit request.

Companions: [`start-branch`](../start-branch/SKILL.md) creates the branch, and [`commit-granular`](../commit-granular/SKILL.md) makes the commits and holds the subject and body format.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `git.mainBranch` (required): the trunk branch that feature branches start from and merge into. It is the default merge request target.
- `git.ticketPrefix`: prefix for ticket ids in branch names and commit subjects. With `CORE-`, a branch is `CORE-1234-short-slug`. If the key is empty or missing, leave the ticket part out: `short-slug`.

## 1. Inspect

Run `git status --short` and `git branch --show-current`, and read the remotes, the current branch's upstream and the hosting provider from Git. If more than one remote could be the right one, or the provider is ambiguous, say what is missing. Do not invent one.

## 2. Ask once

Before changing anything, collect every value that cannot be inferred and ask for all of them in one question: the ticket, when the prefix from Host settings is set and neither the branch name nor the conversation gives one; a branch name the work does not suggest; an unclear target branch; and whether uncommitted changes belong to this work.

## 3. Branch

- If the user named a branch, ship on it: switch to it when it exists, or create it with `start-branch`.
- Stay on the current branch when it is a feature branch for this work.
- Otherwise create a branch with `start-branch`: when the current branch is the main branch, another shared branch such as an integration branch, or a feature branch for unrelated work.

## 4. Target

The merge request targets the main branch from Host settings, unless the user names another target, host guidance names an integration branch for this work, or the branch was started from another branch, such as an integration branch or a parent feature branch; then it targets that branch. If the target is unclear, ask in step 2. List what will ship with `git log --oneline <remote>/<target>..HEAD`, or against the local target without a remote.

## 5. Commit

Asking to ship is the request to commit: commit the uncommitted changes that belong to this work through `commit-granular`. Leave changes that belong to other work uncommitted and report them.

## 6. Optional review

Before pushing, run Bugbot on the branch changes, or a comparable review the harness offers. Fix the genuine bugs it finds and commit the fixes through `commit-granular`; list dismissed findings in the final response. Skip the review when the user says "ship without review" or no such review is available, and say that it was skipped.

## 7. Push

With no remote configured, stop after committing and say so.

```bash
git push -u <remote> HEAD
```

Never push to the main branch or to another protected branch, and never force-push. If the push is rejected, stop and report it. If pre-push hooks or CI configuration exist, say what will run after the push.

## 8. Merge request

- **Title:** with a ticket, `<ticket>: <Target>, <change>`, taking the ticket (the prefix from Host settings and its number) from the branch name, and `<Target>, <change>` from the main commit's subject without its kind. Without a ticket, the main commit's `<Target>, <change>`. Example: `CORE-1234: PromptEditor, add language toolbar selector`.
- **Description:** a bullet list of the commits. Mention the ticket in prose when useful.
- **Link:** prefer the create link the remote prints after the push. Otherwise build it from the remote URL: for GitLab, `<project-url>/-/merge_requests/new?merge_request[source_branch]=<branch>&merge_request[target_branch]=<target>`; for GitHub, `<repository-url>/compare/<target>...<branch>?expand=1`. Build a link only when the provider, the remote, the pushed branch and the target are all known; otherwise say which fact is missing. Do not skip a link that those facts fully determine.

## Final response

- Whether the branch was pushed, and its upstream tracking state.
- The review link, as a link and not only the branch name, and its target.
- The merge request title and description.
- The review outcome in one line, or that the review was skipped.
- The working tree status.

## Do not

- Ask to connect Jira, GitLab, GitHub or another integration, or wait on their authentication prompts.
- Depend on a conventions file that is not in this repository.
