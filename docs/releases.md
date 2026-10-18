# Releases and source layout

[Index](README.md) · [AGENTS.md](../AGENTS.md) · [CHANGELOG.md](../CHANGELOG.md)

Versions follow semver.

| Level | Use it when |
| --- | --- |
| patch | Wording and CLI fixes. |
| minor | Compatible skills, rules, settings, or CLI additions. |
| major | Removed or renamed ids or settings, or a changed host layout or schema. |

## Cut a release

1. Commit normal work, including reviewed host promotions.
2. Add notes with `ags version note "<text>"`. Review `ags version`. Commit those notes so the tree is clean. Promotions add their own notes.
3. Run `ags version bump patch`, `minor`, or `major`. Review the notes and the next version, then confirm. The command refuses uncommitted changes. It refuses empty unreleased notes unless `--allow-empty` is supplied. It runs the full suite, updates the changelog and the package version, commits `Release: X.Y.Z`, and creates the annotated tag `vX.Y.Z`.
4. Update hosts one at a time with `ags host update`. The bump prints the registered-host update commands and updates none of them.

If the bump stops after the commit, rerun it to create the missing tag. Release notes move under `## X.Y.Z - YYYY-MM-DD`. Quote comma-separated arguments in PowerShell.

Only the bump commits a release inside AGS. Host updates commit only when you pass `--commit`, and then only the paths that update wrote or deleted. See [Commands](commands.md).

The concept ledger is the gitignored `LEDGER.md`. `ags doctor` creates it when the file is missing and never overwrites an existing file. Record a row when guidance is rewritten, removed, or migrated. The columns and dispositions are in [AGENTS.md](../AGENTS.md).

## Source layout

| Path | Purpose |
| --- | --- |
| `README.md` | What AGS is, which projects it is written for, and the short install path. |
| `docs/` | Usage reference. `docs/README.md` is the index. |
| `AGENTS.md` | Instructions for working in this checkout. |
| `CHANGELOG.md` | Unreleased notes and released versions. |
| `LEDGER.md` | Local concept ledger. Gitignored. |
| `catalog.yaml` | Rules, skills, and setting definitions. |
| `rules/<id>.md`, `skills/<id>/` | Guidance. A skill directory may include scripts, references, and assets. |
| `templates/` | Generated-block and host-configuration templates. |
| `scripts/` | CLI, global installer, and implementation modules. |
| `test/` | Node test suites and fixtures. |
| `package.json`, `pnpm-lock.yaml` | Version, command entry, engines, dependencies, and lockfile. |
| `hosts.yaml`, `hosts/<id>.json` | Machine-local registry and observed state. Gitignored. |
| `reports/runs/`, `reports/usage/` | Run logs and collected or compact usage. Gitignored. |
| `.tmp/` | Local development artifacts. `.tmp/ags/` is reserved for the CLI. |
| `.tmp/archive/` | Completed plans, planning guides, and other local history. |

This checkout is not a host. `ags host prepare` and `ags host install` refuse its root. Guidance under `skills/` stays inactive while you edit it, because that path is not a harness discovery path.

── ◈ ──

[Index](README.md)
