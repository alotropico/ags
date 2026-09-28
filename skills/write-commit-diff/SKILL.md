---
name: write-commit-diff
description: Write a git diff to a file under .tmp/scratch/ instead of printing it, for reviewing commits, staged or unstaged changes, untracked files, or the whole working tree. Use before writing commit messages, reviews or summaries that need the full diff.
---

# Write a commit diff

Use this skill when a task needs a full diff: drafting commit messages, reviewing changes, or summarizing work. Also use it when the user asks to generate, create or make a diff of commits, export a commit range, or write the last N commits to a file. The script writes the diff to a file so it does not flood the conversation.

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

## Output

The script writes `.tmp/scratch/<name>.diff` in the repository and prints its path, its size in bytes and the diff source. It never changes the index or the working tree.

Report the path to the user, not the diff content. Read the file when you need it.
