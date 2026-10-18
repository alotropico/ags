# Git exports

[Index](README.md) · [Commands](commands.md)

`ags git-changes` and `ags diff` work in any Git repository. They do not require host registration or an installed skill.

## `ags git-changes`

Exports either a patch diff or a file list with change types (`--format diff|list`). The non-interactive default is `list`. The wizard defaults to `diff`. The default destination is the clipboard in a terminal, and stdout when redirected. `ags help git-changes` lists the flags and the wizard.

| Example | Effect |
| --- | --- |
| `ags git-changes` | Wizard when stdin, stdout, and stderr are terminals. Otherwise every working-tree scope. |
| `ags git-changes --staged-only --output-to stdout` | Staged files only, printed to stdout. |
| `ags git-changes --latest-commits 3 --file-path ./review.txt` | Working tree plus the last three commits, saved to a file. |
| `ags git-changes --commit HEAD --no-working-tree` | One commit's file list only. |

A relative `--file-path` resolves from the invocation directory, including when `--cwd` points at another worktree.

## `ags diff`

Writes a patch, prints the output path, size, and source, and leaves the source index unchanged. The default file is `.tmp/scratch/changes.diff`, replaced on each run. Untracked `.tmp/` artifacts are excluded from the patch.

| Example | Includes |
| --- | --- |
| `ags diff` | Current and staged changes. |
| `ags diff current` | Unstaged and untracked changes. |
| `ags diff staged` | Staged changes. |
| `ags diff 1` | The last commit. |
| `ags diff current staged 1` | Current, staged, and last-commit changes as one net diff. |
| `ags diff a1b2c3d` | That commit's patch. |
| `ags diff commit HEAD~2` | A commit by reference. |
| `ags diff --name review` | The default selection, written to `.tmp/scratch/review.diff`. |

`unstaged` is an alias of `current`. Selectors may be reordered. Combinations are net diffs: a change that cancels out disappears. Counts and merges use first-parent history. The root commit uses the empty tree. Disambiguate a numeric hash with `commit <hash>`.

`--route` selects a repository. `--name` accepts a plain filename and adds `.diff` when the name has no extension.

### Legacy forms

These still parse:

- `ags diff commits review 3`
- `ags diff range review <from> [to]`
- `ags diff <staged|changes|untracked|current> review [N]` (`N` only for `current`)

Named `current` in those legacy forms includes staged changes. Shorthand `current` excludes them.

The `write-commit-diff` skill tells an agent to use this command when a task needs the full diff on disk. Installing the skill is optional. The command itself is part of `ags`.

── ◈ ──

[Index](README.md)
