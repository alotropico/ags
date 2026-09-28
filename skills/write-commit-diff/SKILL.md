---
name: write-commit-diff
description: Write a git diff to a file under .tmp/scratch/ instead of printing it, for the last N commits, a commit range, staged or unstaged changes, untracked files, or the whole working tree. Use when the user asks to generate, create, make or export a diff, and before writing commit messages, reviews or summaries that need the full diff.
---

# Write a commit diff

Use this skill when a task needs a full diff: drafting commit messages, reviewing changes, or summarizing work. Also use it when the user asks to generate, create or make a diff of commits, export a commit range, write the last N commits to a file, or write staged, unstaged, untracked or current changes to a file. The script writes the diff to a file so it does not flood the conversation.

Use the script instead of pasting `git diff` or `git show` output into the conversation or redirecting a hand-written `git diff` into a file. Do not use this skill for ordinary `git diff` or `git status` checks while coding.

## Command

Run from the repository root:

```text
node .agents/skills/write-commit-diff/scripts/write-commit-diff.mjs <mode> <name> [args]
```

Modes:

- `commits <name> <N>`: the last N first-parent commits on HEAD.
- `range <name> <from> [to]`: `from..to`; `to` defaults to `HEAD`.
- `staged <name>`: the index against HEAD.
- `changes <name>`: the working tree against the index.
- `untracked <name>`: untracked files that git does not ignore.
- `current <name> [N]`: the working tree against HEAD, or against `HEAD~N`, plus untracked files.

`<name>` is a plain file name; `.diff` is added when missing.

To diff another checkout, run the same script with that checkout as the working directory; the file is written to that checkout's `.tmp/scratch/`.

## Procedure

1. Pick the mode from the request. If the range or the commit count is ambiguous, ask once.
2. Name the file after the ticket id, the branch slug, or the name the user gave.
3. Run the script.
4. For `commits` and `current` with N, list the commits the diff covers with `git log --oneline --first-parent -n <N>`; for `range`, with `git log --oneline <from>..<to>`.
5. Reply with the path, the size and the commits covered.

## Output

The script writes `.tmp/scratch/<name>.diff` in the repository, replacing a file of the same name, and prints its path, its size in bytes and the diff source. It never changes the index or the working tree.

Report the path to the user, not the diff content; paste the diff only when the user asks to see it in the conversation. Read the file when you need it.
