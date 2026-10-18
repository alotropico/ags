# Install a host

[Index](README.md) · [Catalog](catalog.md) · [Configuration](configuration.md) · [Host contract](host-contract.md)

A host is a Git repository in its main worktree. Use that worktree for prepare, install, register, update, status, and unregister. Those commands refuse linked worktrees, submodules, and separate Git directories. They also refuse the AGS source repository.

```powershell
ags skills list
ags host install --route "C:/projects/my-app"
ags host status --route "C:/projects/my-app"
```

`ags host install` installs the latest release, or resumes an interrupted installation. It prepares existing agent setup when that is needed, writes material, settings, the generated block, and excludes, then registers the host. It does not commit.

`ags host prepare` moves existing agent setup into a backup before installation. The backup lands at `.tmp/ags/backups/<stamp>-prepare/`, and the command prints a cleanup prompt.

`ags host prepare --backup-only --file <path>` makes a verified copy-only legacy backup. Repeat `--file` as needed. Copy-only backups use `operation: backup-only`, hash-verify regular tracked, ignored, and untracked files (including config and hooks), and retry without modifying originals. Handle links manually. Retain legacy backups until you explicitly retire them.

On POSIX, copy backups preserve and verify permission bits, including executability. Rename-based prepare retains them. Restore copied permissions. ACLs, ownership, and extended attributes are excluded. The manifest format is unchanged.

## Picker

On a fresh interactive install, **Up/Down** moves, **Space** toggles, and **Enter** continues. **Esc** cancels and writes nothing. **A** selects all explicit choices. **N** clears explicit choices. Required companions stay selected. `[+]` marks a required companion.

The picker scrolls and preserves prior output. Simple terminals offer numbered choices such as `1,3,5` (`stop` cancels).

Explicit flags, resumed installs, dry runs, and non-interactive calls keep their own behavior. The picker is for an interactive fresh install.

Browse ids first with `ags skills list`. Classes, companions, and settings are in the [catalog](catalog.md).

## Plans and confirmation

Prepare, install, register, update, and unregister show a plan with a 12-character digest. Interactive commands collect per-item decisions, can reuse a choice for the remaining items, then confirm. `stop` and `--dry-run` write nothing.

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
