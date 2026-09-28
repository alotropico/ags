---
name: start-branch
description: Create a feature branch from the updated main branch, named from the ticket and a short slug. Use when the user asks to start work on a ticket or to create a feature branch, and when ship needs a branch for the work.
---

# Start branch

**Trigger:** The user asks to start work on a ticket, to create a feature branch, or to check out new work; or `ship` needs a branch because the current one does not fit the work.

## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `git.mainBranch` (required): the trunk branch that feature branches start from and merge into.
- `git.ticketPrefix`: prefix for ticket ids in branch names and merge request titles. With `CORE-`, a branch is `CORE-1234-short-slug`. If the key is empty or missing, leave the ticket part out: `short-slug`.

## Branch name

- If the user named the branch, use that name as given.
- Otherwise, name it as Host settings describe, with the prefix from Host settings, the ticket number and a kebab-case slug of one to three words that describes the work. Prefer this slug form for new work even where branches named with the bare ticket exist.
- Take the ticket from the user's request or the conversation. When the prefix is set and no ticket is known, ask for it; never invent one. If the user says the work has no ticket, use the slug alone.
- Derive the slug from the work. Ask only when the work suggests no clear slug.

## Create the branch

1. Check the working tree. Uncommitted changes travel to the new branch. If they belong to other work, or switching branches would fail, stop and ask.
2. Read the remotes from Git. If more than one remote could be the right one, stop and ask. Do not invent a remote.
3. Update the main branch from Host settings and branch from it. Never branch from an unrelated feature branch unless the user says so.

   ```bash
   git fetch <remote>
   git checkout <main branch>
   git pull --ff-only <remote> <main branch>
   git checkout -b <branch>
   ```

   If the fast-forward fails because the local main branch has diverged, stop and report it. Without a remote, skip the fetch and the pull, branch from the local main branch, and say so.
4. When `ship` asks for a branch for work already committed on the current branch but not on the main branch, run only `git checkout -b <branch>`, so the new branch starts at the current commit and keeps that work. Leave the original branch as it is, and say so.
5. Report the current branch and whether its starting point matches `<remote>/<main branch>`.

## Do not

- Commit, push or open a merge request. `ship` does that when the user asks to ship.
- Invent a branch name the user must choose.
