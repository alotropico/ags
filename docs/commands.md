# Commands

[Index](README.md) · [Git exports](git-exports.md) · [Host contract](host-contract.md)

Use `ags help <command>` or `ags <command> --help` for accepted parameters and examples:

```powershell
ags help host install
ags host update --help
```

Run from a project root, or pass `--route` or a registered `--host`. Mutation touches one host. `--all` is for inspection and report collection.

```powershell
ags host status
ags check --only "type,lint"
ags diff
ags git-changes --output-to stdout
ags host update --dry-run
```

- **Inspect.** `host status` shows versions, local changes, settings, pending work, usage, and doctor warnings. `ags doctor` validates a host and does not repair it. On an AGS checkout, doctor creates a missing local ledger and leaves an existing ledger unchanged, including a malformed one.
- **Check.** `ags check` runs the installed check helper with the configured project scripts. It chooses npm, Yarn, or pnpm from the project. See [Configuration](configuration.md).
- **Share changes.** `ags git-changes` and `ags diff` work in any Git repository, with or without an AGS installation. Selectors: [Git exports](git-exports.md).
- **Update.** Inspect the dry run, then apply the reviewed plan. Updates stay within the installed major by default. `--to X.Y.Z` selects an explicit release with a supported migration. A different major is refused before any write. Downgrades are refused.

For optional tool and skill offers, run `ags setup` in the project and review its plan. Setup configures optional integrations. It does not install the `ags` command, and it does not create a host installation. See [Integrations](integrations.md).

| Exit code | Meaning |
| --- | --- |
| 0 | Success. |
| 1 | Failure or refusal. |
| 2 | Invalid usage. |
| 3 | A decision or confirmation is needed. |

Non-interactive decisions, `--plan`, and `--decide`: [Install a host](install-host.md).

## Inspect and configure

| Command | Purpose |
| --- | --- |
| `ags doctor` | Validate AGS and a host. `--route` or `--all`. Does not repair. |
| `ags skills list` | Catalog ids, kinds, install classes, descriptions, and keywords. |
| `ags setup` | Refresh capabilities and review compatible optional integrations. |
| `ags skill add <source> --skill <name>` | Install a project-local third-party skill through the skills CLI. |
| `ags check --only "type,lint,prettier"` | Run selected configured checks. Omit `--only` for every configured check. |

## Manage hosts

| Command | Purpose |
| --- | --- |
| `ags host prepare` | Move existing agent setup into a backup before installation. |
| `ags host prepare --backup-only --file <path>` | Verified copy-only legacy backup. Repeat `--file` as needed. |
| `ags host install` | Install the latest release, or resume an interrupted installation. |
| `ags host register` | Register an existing installation in this checkout. Accepts `--route` and an optional `--name`. Does not change host guidance. |
| `ags host update` | Update guidance and review local changes. `--to` selects a release. |
| `ags host update --commit` | After the update, commit only the host paths that update wrote or deleted, as `AGS: update <host> <from> -> <to>`. Other changes stay unstaged. Refuses during a merge, rebase, cherry-pick, or revert. |
| `ags host status` | Inspect a host. `--route`, `--host`, or `--all`. |
| `ags host list` | Registered hosts and installed versions. |
| `ags host unregister` | Remove registry entries and records. Leave host files in place. |

Without `--commit`, AGS does not commit in a host. Release commits inside the AGS checkout are a separate command: [Releases](releases.md).

## Diffs, snapshots, and temporary files

| Command | Purpose |
| --- | --- |
| `ags git-changes [options]` | Export changed files and statuses. No host install required. |
| `ags diff [current] [staged] [N or hash]` | Write a Git diff patch. No installed skill required. |
| `ags snapshot` | Archive a host's `AGENTS.md` and `.agents/` with a manifest. |
| `ags snapshot source` | Archive tracked AGS working-tree files with a manifest. |
| `ags snapshot tree` | Names-only Markdown directory tree for AGS or a project. |
| `ags tmp inspect` | Inventory eligible temporary files and hashes. |
| `ags tmp clean --manifest <file>` | Review manifest-directed archive moves. |

Selectors and snapshot options: [Git exports](git-exports.md), [Snapshots](snapshots.md).

## Reporting

| Command | Purpose |
| --- | --- |
| `ags report usage` | Record a known action and outcome in the host spool. |
| `ags report collect` | Collect new events. `--route`, `--host`, or `--all`. Leaves spools in place. |
| `ags report compact` | Compact closed central usage segments. |
| `ags report clean --before YYYY-MM` | Review central cleanup and retain a cutoff against recollection. |

Record shape and files: [Reporting](reporting.md).

## Versions and releases

| Command | Purpose |
| --- | --- |
| `ags version` | Package version, latest release, unreleased commits, and notes. |
| `ags version note "<text>"` | Append one unreleased changelog line. |
| `ags version bump patch` | Test, commit, and tag a release. Also `minor` or `major`. |

── ◈ ──

[Index](README.md)
