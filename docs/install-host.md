# Install a host

[Index](README.md) · [Catalog](catalog.md) · [Configuration](configuration.md) · [Host contract](host-contract.md)

A host is a Git repository in its main worktree. Use that worktree for prepare, install, register, update, status, and unregister. Those commands refuse linked worktrees, submodules, and separate Git directories. They also refuse the AGS source repository.

```powershell
ags skills list
ags host install --route "C:/projects/my-app"
ags host status --route "C:/projects/my-app"
```

`ags host install` installs the latest release, or resumes an interrupted installation. It prepares existing agent setup when that is needed, writes material, settings, the generated block, and excludes, then registers the host. It does not commit.

From outside the AGS checkout, `ags install` is an alias for `ags host install`. The other `ags host ...` commands also accept the shorter form; see [Commands](commands.md#manage-hosts).

`ags host prepare` moves existing agent setup into a backup before installation. The backup lands at `.tmp/ags/backups/<stamp>-prepare/`, and the command prints a cleanup prompt.

`ags host prepare --backup-only --file <path>` makes a verified copy-only legacy backup. Repeat `--file` as needed. Copy-only backups use `operation: backup-only`, hash-verify regular tracked, ignored, and untracked files (including config and hooks), and retry without modifying originals. Handle links manually. Retain legacy backups until you explicitly retire them.

On POSIX, copy backups preserve and verify permission bits, including executability. Rename-based prepare retains them. Restore copied permissions. ACLs, ownership, and extended attributes are excluded. The manifest format is unchanged.

## Picker

Fresh interactive installs show two menus under an **Installing AGS** heading. **1 of 2 - Recommended rules and skills for this host** contains the release's defaults, detected recommendations, their companions, and available external integrations, already checked. **2 of 2 - Optional rules and skills you can enable** contains the remaining choices, initially unchecked. Each step has a decorated label and a blank line before its controls. Required settings and the installation review use the same heading pattern. Press Enter in both menus to keep that selection.

Controls use one line each: `[↑ / ↓] Up / Down`, `[Space] Select / Deselect`, and `[Esc / Ctrl+C] Stop`. **Select All** and **Select None** are navigable actions above each list; Enter or Space applies them and stays on the same menu. While an action is focused, the last line reads `[Enter / Space] Apply Action`. Return to an item and press `[Enter] Next` to advance. Only `[X]` and `[ ]` are used. Required strong rules stay checked; companions stay checked while their parent is selected. Rows include short descriptions, and the focused row explains its recommendation.

The picker scrolls and preserves prior output. Windows redraws in place to preserve console handles. Simple terminals show the same two stages with numbered choices such as `1,3,5`; Enter keeps the stage's initial selection, `all` and `none` change it, and `s` or `stop` cancels.

Explicit flags, resumed installs, dry runs, and non-interactive calls keep their own behavior. The picker is for an interactive fresh install.

Browse ids first with `ags skills list`. Classes, companions, and settings are in the [catalog](catalog.md).

## Plans and confirmation

Prepare, install, register, update, and unregister show a plan with a 12-character digest. Interactive commands collect per-item decisions, can reuse a choice for the remaining items, then confirm. `stop` and `--dry-run` write nothing.

Interactive plans wrap to the terminal width and omit hash columns. A fresh install groups rules, skills, settings, external integrations, and other changes. `[D] Details` at confirmation shows every file path and action. `[Y] Yes` applies the plan; `[S] Stop`, `no`, or an empty answer stops. Full words and either letter case are accepted. Non-interactive output retains its detailed table and hashes.

Missing settings are suggested only from reliable local evidence: a stored remote default-branch reference or a unique local `main`/`master`, and unambiguous existing check scripts. Existing values and explicit `--set` values take precedence. Ambiguous required values are asked for, with `[S] Stop` available. Detectors do not fetch, execute checks, or install integrations while showing the menus.

Recommendations and short descriptions come from the release being installed. Changes to the source catalog take effect in hosts after they are released.

Preview a selection change from the project root:

```powershell
ags host update --enable "code-idioms,state-topology" --dry-run
```

Review the plan, then rerun without `--dry-run` to confirm it interactively. `--enable` and `--disable` accept comma-separated rule or skill ids.

## Non-interactive reruns

Without a TTY, pending decisions exit **3** and print the plan and the rerun. Use that plan's real `--plan <digest>` and reviewed `--decide <path>=<choice>` values. `--decide-all <choice>` answers items that offer that choice. Show the plan to the person who owns the host before passing its digest.

Reruns identify their shell: PowerShell, CMD delegating through PowerShell, or POSIX zsh / `/bin/sh`. Replace decision placeholders before execution.

## Flags

Flags accept `--flag value` or `--flag=value`. Duplicate singleton flags and unexpected positionals are errors. Repeatable flags retain every value. A bare command group prints help. Questions require a TTY.

Route paths follow OS rules. Serialized relative paths use `/`. Unrepresentable names and portable case collisions fail before any mutation.

`--route "C:/projects/my-app"` selects a repository from another working directory. Update, status, and unregister also accept `--host <id>` from `ags host list`. Mutation operates on one host at a time. `--all` is for inspection and report collection.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success. |
| 1 | Failure or refusal. |
| 2 | Invalid usage. |
| 3 | A decision or confirmation is needed. |

## Disposable trial

Use a throwaway repository and answer the prompts:

```powershell
$trialDir = Join-Path $env:TEMP ("ags-trial-" + [guid]::NewGuid().ToString("n"))
git init $trialDir
ags host install --route $trialDir
ags host status --route $trialDir
ags host unregister --route $trialDir
Remove-Item -Recurse -Force $trialDir
```

Unregister removes registry entries and records. It leaves the host files in place. The last line deletes the trial directory.

── ◈ ──

[Index](README.md)
