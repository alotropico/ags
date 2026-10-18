# Host contract

[Index](README.md) · [Install a host](install-host.md) · [Configuration](configuration.md) · [Harnesses](harnesses.md)

A host is a Git repository in its main worktree. Prepare, install, register, update, status, and unregister refuse linked worktrees, submodules, and separate Git directories. The AGS source checkout cannot be a host: it has no `.agents/`, no harness skill directories, and no AGS block. Its `skills/` directory is not a discovery path.

Managed material comes from the annotated tag `vX.Y.Z`.

## Paths

| Path | Owner or purpose |
| --- | --- |
| `AGENTS.md` | Project-owned. The generated AGS block sits at the top. |
| `.agents/ags.yaml` | Committed configuration and selections. |
| `.agents/rules/<id>.md` | Managed soft rules for AGS ids. Project rules for other ids. |
| `.agents/skills/<id>/` | Managed skills for AGS ids. Project and third-party skills for other ids. |
| `.agents/local/` | Project-owned notes and guidance. |
| `.tmp/ags/backups/<stamp>/` | Prepare, install, and update backups. |
| `.tmp/ags/locks/` | Host lock. |
| `.tmp/ags/reports/usage.jsonl` | Host usage spool. |
| `.tmp/ags/snapshots/` | Host snapshots. |
| Git exclude file | An AGS exclude block when `.tmp/` is not otherwise ignored. |

Strong rules are inlined into the generated block. They are not copied as rule files.

A project rule or skill that reuses a reserved AGS id stops install and update. The message names the rename `<host-id>-<id>`.

## Generated block

The block runs from `<!-- AGS:BEGIN <version> <hash> -->` to `<!-- AGS:END -->`. Strong rules come first, then a soft-rule index. AGS entries come before described project rules. The rendered block stays within 40 lines.

Edits inside the block are reviewed on update. The choices are restore or stop.

Lasting project instructions belong outside the block, because update regenerates it. Where to put them: [Configuration](configuration.md).

## Prepare, install, update

Prepare moves existing setup to `.tmp/ags/backups/<stamp>-prepare/` and prints a cleanup prompt.

Install prepares when needed, writes material, settings, the block, and excludes, registers the host, and resumes an interrupted install. It does not commit.

Update reviews edits to managed files and regenerates the block. Offers are `promote`, `restore`, `ignore`, or `disable`, whichever apply to that edit. Overwritten or deleted host files are backed up first.

A target with a different major version is refused before any write. Downgrades are refused. Inside the same major, the host keeps its format-2 configuration, settings, comments, selections, reporting preference, local notes, ignore and promotion records, and project-owned files.

`--commit` on update commits only the host paths that update wrote or deleted, with the message `AGS: update <host> <from> -> <to>`. Other changes stay untouched. It refuses during a merge, rebase, cherry-pick, or revert. Every other host command leaves commits to you.

Locks cover each host and the AGS checkout. An interrupted command prints the rerun that recovers it.

## Registry

`hosts.yaml` is gitignored and machine-local. It stores ids, names, paths, and ignore and promotion records. `ags host list` prints registered hosts and installed versions.

`ags host unregister` drops those records and leaves every host file in place, including Claude alias links.

Inspection atomically refreshes gitignored `hosts/<id>.json` with path, version, separate sorted AGS and non-AGS skill names, tools, a timestamp, and validated managed Claude alias descriptors. An unavailable host keeps its stale snapshot. Inspection takes no mutation locks and writes no host files.

Discovery deduplicates target identities. For third-party links it reads entry metadata only, and it does not manage those trees.

## Register an existing installation

An installer outside this command has to register the finished installation in the AGS checkout you will use for host management and report collection. A private release cache has its own registry. Registering there does not register the host in another checkout.

```powershell
ags host register --route "C:/projects/my-app" --dry-run
```

Apply the reviewed plan. Registration reads the existing format-2 configuration, requires the installed annotated release to exist locally, and writes only this checkout's registry. Registering the same host again is a no-op. Optional `--name` changes the display name.

Relocation keeps ignore and promotion records when the old location no longer identifies that host. A conflicting path, or a duplicate id that is still live, is refused. Registration does not update guidance, does not commit, and does not run as a side effect of inspection or report collection.

## Doctor

`ags doctor` validates and does not repair. It checks script and trunk resolution, and missing, dangling, or altered Claude aliases, and it names the reviewed repair path.

On an AGS checkout, doctor creates `LEDGER.md` when the file is missing. It never overwrites an existing ledger, including a malformed one. Installing into a host does not create that file. The ledger belongs to the source checkout.

## Moved checkouts and moved hosts

Preview an update from the host after this checkout has moved:

```powershell
ags host update --route "C:/projects/my-app" --dry-run
```

Reinstall the command from the new checkout first: [Install the command](install-command.md).

Update registers a missing host id, or reconciles an old location that is no longer available. A conflicting id is refused. An old location that still contains that host is refused. A missing machine registry starts empty. Use a reviewed plan. Do not import another checkout's registry.

Windows junctions for Claude aliases store absolute targets. After moving a host, delete its `.claude/skills/<id>` junctions (never their targets) and rerun `ags host update`. See [Harnesses](harnesses.md).

── ◈ ──

[Index](README.md)
