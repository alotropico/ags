# Snapshots and temporary files

[Index](README.md) · [Commands](commands.md) · [Reporting](reporting.md)

## Host snapshot

`ags snapshot` archives a host's `AGENTS.md` and `.agents/` with a manifest. Host snapshots save alias descriptors rather than walking alias trees. See [Harnesses](harnesses.md) for Claude skill aliases.

Default host snapshot directory: `.tmp/ags/snapshots/`.

## Source snapshot

`ags snapshot source` archives tracked working-tree files from the AGS checkout that is running the command. It does not take a host installation or `--route`. Untracked and deleted files are omitted. The default path is `.tmp/ags/snapshots/source-<timestamp>.zip`.

The manifest records version, HEAD, selection, timestamp, sizes, and SHA-256 hashes. HEAD identifies the base commit. It does not mean the tree is clean.

| Option | Meaning |
| --- | --- |
| `--out <file.zip>` | A new path inside AGS, relative to the current directory. Existing files are never overwritten. |
| `--only <paths>` | Comma-separated repository-relative files or folders. `base` means root files. |
| `--except <paths>` | Exclusions with the same syntax. Cannot combine with `--only`. |
| `--preset review` or `--preset review-lite` | A fixed selection plus a generated tree and manifest. Cannot combine with selection flags. |
| `--include-standard-excluded` | Include tracked `.env*`, `credentials.json`, `id_rsa`, and `*.pem`. Git-ignored files stay excluded. |

Non-preset exclusions: `hosts.yaml`, `reports/`, `.tmp/`, `.git/`, `node_modules/`, and the snapshot's own `manifest.json`. Links and Git-ignored files stay excluded even if force-tracked.

Presets use fixed path sets. `review` includes root review files, rules, skills, templates, scripts, and tests, and omits the lockfile. `review-lite` is a smaller fixed list. Presets can include an optional `hosts.yaml`, an in-memory tree, and `snapshot-manifest.json`. Manifests record resolved and missing paths, HEAD, and payload hashes, and they exclude their own hash.

```powershell
ags snapshot source --preset review
ags snapshot source --only "base,rules" --out .tmp/ags/snapshots/rules-review.zip
ags snapshot source --except "test,docs"
```

`ags snapshot source` replaces the old `ags snapshot canonical` subcommand.

A user-doc change lives under `docs/`. A non-preset source snapshot includes tracked files there. The `review` and `review-lite` presets use their fixed path sets and do not add `docs/`.

## Tree snapshot

`ags snapshot tree` writes names and structure only: empty directories and hidden, untracked, and ignored entries. `.git`, `node_modules`, and `.tmp` are excluded at every level. Links and junctions are marked and never followed.

The default, in any Git repository, is `.tmp/records/<date>-tree-snapshot-<time>.md`.

```powershell
ags snapshot tree
ags snapshot tree --route "C:/projects/my-app"
ags snapshot tree --out .tmp/records/2026-10-05-repository-tree.md
```

`--route` accepts a repository or a subdirectory. `--out` requires a new Markdown path inside that repository, relative to the current directory.

## Temporary files

`ags tmp inspect` inventories regular files under `.tmp/plans/`, `.tmp/records/`, and `.tmp/scratch/`, with hashes.

`ags-sweep` manifests live in `.tmp/records/`. They contain `schemaVersion: 1`, `archiveMonth: YYYY-MM`, and `path` / `hash` / `disposition` entries.

`ags tmp clean --manifest <file>` reviews those moves. Only `completed` and `archive` entries move, under `.tmp/archive/YYYY-MM/`, keeping their relative paths and names. Active files, `keep`, unmarked files, links, operational files, archives, and manifests stay. Traversal, a stale hash, and a collision fail. Moves are recorded for recovery.

Layout and naming for `.tmp/` when you are editing it by hand: [AGENTS.md](../AGENTS.md).

## Copy-only backups

Prepare's copy-only mode is documented with installation: [Install a host](install-host.md). Overwritten or deleted host files are backed up before an update writes. See [Host contract](host-contract.md).

── ◈ ──

[Index](README.md)
