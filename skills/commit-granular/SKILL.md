---
name: commit-granular
description: Commit working-tree changes as a series of small, well-scoped commits with the shared subject and body format. Use when the user asks to commit, to commit granularly, or to split changes into commits, and when ship commits the work it ships.
---

# Commit granular

**Trigger:** The user asks to commit, to commit granularly, or to split changes into commits; or `ship` commits the work it ships.

Host guidance wins on formats. When `AGENTS.md`, a host rule or a host note states a different kind list, subject shape or body rule, follow it.

## When to commit

Commit only when the user asks for it, directly or by asking to ship, which includes committing. Finishing a task, a passing check or the end of a turn is not a request, and do not offer a commit as a closing habit. A request to push or publish what is already committed is not a request to commit.

## Procedure

1. Read `git status`, the staged and unstaged diff, and `git log -8 --oneline` to see what changed and how recent subjects read.
2. Group the changes into commits by the rules in "Dividing commits". Do not present the grouping; commit in dependency order, each commit buildable on its own.
3. Stage precisely, by explicit path (`git add <path>`). Stage single hunks only when one file mixes unrelated changes. Leave changes that belong to other work unstaged.
4. After the last commit, run `git status` and confirm the tree is clean, or report what was left uncommitted on purpose.

Never change the Git configuration.

## Dividing commits

- One logical, independently reviewable change per commit. Prefer a short series of small, legible commits that reverts cleanly over one large commit.
- A rename or move and a content change are two commits: first the rename, move or extension change (such as `.ts` to `.tsx`) with identical content, then the content change.
- Split a mechanical refactor into its individual steps.
- Separate concerns never share a commit: logic, styles, docs, and dependency or version bumps. A formatting-only change never shares a commit with a behavior change.
- Cross-cutting changes, such as configuration, shared stores or infrastructure, come first, unless they clearly belong to one feature; then they go with it.
- A fix gets its own commit when it exceeds 10 lines, spans more than two hunks, or is the only change to a set of files. A tiny fix made along the way may join the related commit.

## Subject

Shape: `<Kind>: <Target>, <change>`, optionally followed by `, <brief detail>`. This is not Conventional Commits: no `type(scope):` form.

- **Kind:** a capitalized category, or the kind of thing touched. When several fit, take the first in this order: `Fix`, `Global`, `Feature`, a thing-kind (`Component`, `Hook`, `Utility`, `Endpoint`, `Module`, `Modal` and similar), `Package`, `Config`, `Styles`, `Refactor`, `Docs`, `Test`, `Chore`.
- **Target:** the component, feature, file, area or pipeline touched.
- **change:** imperative, in lower case, with no trailing period.

No ticket id in the subject: the ticket lives in the branch name and the merge request title.

```text
Fix: SelectorList, restore focus after filter clear
Hook: useListQuery, sync filters with URL search params
Styles: settings panel, remove redundant overrides
Docs: agent guidance, add the verified repository profile
```

## Body

Required. After a blank line, write two to four short sentences on why the change matters. Do not list files.

```text
Fix: getSources, skip the stale scan on every window focus

Sources are expensive to rescan from disk. The cache stays warm for five minutes
unless the user explicitly forces a refresh.
```

## Never in a message

- "This commit…", "I" or "we", "now" or "currently".
- File or function names that the target already implies.
- AI attribution, "as requested", or emoji.
