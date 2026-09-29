# AGS

AGS is the source repository for reusable agent guidance: rules, skills, settings definitions and small deterministic helpers. A release is an annotated git tag `vX.Y.Z`. `ags host install` and `ags host update` copy the selected material of a release into a host repository. Hosts hold copies; nothing reads this repository at runtime.

Hosts may edit what they received. The next update reviews each edit, and an edit can be promoted back into AGS. See `AGENTS.md` for working on AGS, `CHANGELOG.md` for releases, `LEDGER.md` for where rewritten guidance went, `BACKLOG.md` for deferred work, `docs/v2-spec.md` for the V2 design record, `docs/v3-spec.md` for the V3 specification, and `docs/v3-implementation-plan.md` for its execution plan.

## Prerequisites

- Windows. The `ags` command runs on Windows only.
- Node.js 20 or newer
- pnpm
- Git

## Install the `ags` command

From this checkout:

```powershell
pnpm install
pnpm setup
node .\scripts\install-global.mjs
ags doctor
```

The installer writes the `ags.CMD`, `ags.ps1` and `ags` shims. They run this working tree's `scripts/ags.mjs`, so a change in the tree takes effect at once. After moving the directory, run the installer again.

`--bin <directory>` chooses the shim directory, which must be on PATH:

```powershell
node .\scripts\install-global.mjs --bin "$env:USERPROFILE\bin"
```

Without `--bin`, the shim directory is the first of:

1. `PNPM_HOME` itself. `bin` is not appended.
2. The directory printed by `pnpm bin -g`.
3. `%LOCALAPPDATA%\pnpm`.

If an existing `ags` shim points elsewhere, the installer stops. Pass `--replace` to overwrite it, or `--bin` for another directory. On a platform other than Windows, the installer exits before it writes anything.

`pnpm setup` adds the pnpm global bin directory to the user PATH. Restart the terminal app afterward: a new tab keeps the PATH from when the app started.

## Hosts

A host is a git repository, in its main worktree, where AGS is installed. A host needs neither this repository nor `ags` at runtime; `ags` installs, updates and reviews. `host prepare`, `install`, `update`, `status` and `unregister` refuse linked worktrees, submodules and separate git directories.

A host's layout:

```text
AGENTS.md                    host-owned; the AGS block sits at the top
.agents/
  ags.yaml                   host settings and selection
  rules/<id>.md              AGS soft rules (AGS ids) and host rules (other ids)
  skills/<id>/               AGS skills (AGS ids) and host skills (other ids)
  local/                     host notes and other host-owned guidance
.tmp/                        local only
  ags/backups/<stamp>/       backups taken by prepare, install and update
  ags/locks/                 the host lock
  ags/reports/usage.jsonl    usage records
  ags/snapshots/             host snapshots
git exclude file             the exclude block, only when .tmp/ is not otherwise ignored
```

- **Managed files** are `.agents/rules/<id>.md` and `.agents/skills/<id>/` whose id is an AGS id, written from the release tag. AGS ids are reserved: a host rule or host skill that uses one stops install or update, which prints the rename to `<host id>-<id>`. Strong rules are not files in the host; they are inlined in the block.
- **The AGS block** sits at the top of `AGENTS.md`, between `<!-- AGS:BEGIN <version> <hash> -->` and `<!-- AGS:END -->`. It holds the strong rules and an index of the soft rules: AGS rules, then host rules that have a `description`. Update regenerates it. An edit inside the block is found by its hash and answered with `restore` or stop, so lasting text belongs outside the block.
- **Host guidance** has fixed places. Host facts go in `AGENTS.md`, outside the block. Host rules go in `.agents/rules/<id>.md`, with a non-AGS id and a `description`. Host skills go in `.agents/skills/<id>/`. Host notes go in `.agents/local/<skill-id>.md` and are read before that skill. Other files in `.agents/local/` are linked from one of those places. Host facts and formats override AGS defaults; AGS safety constraints do not yield.

The lifecycle:

- `ags host prepare` moves an existing agent setup into `.tmp/ags/backups/<stamp>-prepare/`, never deletes anything, and prints a cleanup prompt for an agent.
- `ags host install` installs the latest release: the selection (`--enable`, `--disable`, and the opt-in items offered in a terminal), the settings, the managed files, the block, the exclude block and the registry entry. It moves an existing setup first, as prepare does, and resumes an interrupted install. It never commits.
- `ags host update` moves to the newest release with the same major version, or to the release given with `--to`. It reviews each host edit, with the choices `promote`, `restore`, `ignore` and `disable`, and regenerates the block.
- `ags host status` is read-only. `ags host list` shows the registry. `ags host unregister` removes the registry entry and leaves host files alone.

The registry, `hosts.yaml` in this repository, is machine-local and gitignored. It holds each host's id, name and path, and its ignore and promotion records.

**Plans.** `host prepare`, `install`, `update` and `unregister` show a plan table with a 12-character digest. In a terminal, they ask one question per item that needs a choice, with a "same for all remaining" answer, and then confirm the whole plan; "stop" ends the command without writing. Without a terminal, they exit 3 and print the plan, the digest and the rerun command. The rerun command carries `--plan <digest>` and, for each pending choice, a `--decide <path>=<choice>` placeholder; `--decide-all <choice>` answers every item that offers that choice. `--dry-run` shows the plan and writes nothing. An agent shows the plan to the user, and never passes `--plan` for a plan the user has not seen.

**Safety.** Every host file that AGS overwrites or deletes is backed up first. There is one lock per host and one for AGS. An interrupted command prints its rerun command, and the rerun finishes the job.

### Try it on a scratch repository

Use a throwaway repository, never one you care about. Run these commands in a terminal and answer the prompts:

```powershell
$dir = Join-Path $env:TEMP ("ags-trial-" + [guid]::NewGuid().ToString("n"))
git init $dir
ags host install --route $dir
ags host status --route $dir
ags host unregister --route $dir
Remove-Item -Recurse -Force $dir
```

## Commands

| Command | Purpose |
| --- | --- |
| `ags doctor [--route .]` | Validate this repository, and with `--route` a host as well; never repairs |
| `ags host prepare` | Back up an existing agent setup before the first install |
| `ags host install` | Install the latest release into a host, or resume an interrupted install |
| `ags host update` | Update a host within its major version, and review host changes |
| `ags host status` | Read-only review: versions, pending plan, host changes, settings, usage records, `doctor` warnings |
| `ags host list` | Registered hosts with their installed versions |
| `ags host unregister` | Remove a host's registry entry and records; host files stay |
| `ags skills list` | Catalog view: ids, kinds, install classes, descriptions, keywords |
| `ags version` | Current version, latest release, unreleased commits and notes |
| `ags version note "<text>"` | Append a note under `## Unreleased` in `CHANGELOG.md` |
| `ags version bump <level>` | Release: commit `Release: X.Y.Z` and tag `vX.Y.Z` |
| `ags report usage` | Record in the host which installed files guided a task |
| `ags snapshot` | Zip a host's `AGENTS.md` and `.agents/` with a manifest |
| `ags diff <mode> ...` | Run the host's `write-commit-diff` script |
| `ags check` | Run the host's `check` script with its `checks.*` settings |

Run `ags <command> --help` for its flags.

| Exit code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Failure or refusal |
| 2 | Invalid usage |
| 3 | A decision or confirmation is needed |

## Host settings

`.agents/ags.yaml` holds a host's selection and settings, for example:

```yaml
format: 2
host: my-app
agsVersion: 2.1.0
reporting: true
skills:
  enabled: []
  disabled: []
rules:
  enabled: []
  disabled: []
git:
  mainBranch: main
checks:
  type: typecheck
local: {}
```

- The reserved keys are `format`, `host`, `agsVersion`, `reporting`, `skills`, `rules` and `local`. `reporting` switches usage recording and is edited by hand. `local` is free-form, for host rules and host skills. Every other top-level key is a settings namespace that the catalog's `settings` declares; an unknown key is an error. `ags.yaml` is committed with the host and never holds secrets.
- Install and update add the keys that the selected skills need, each with its default and its description as a comment. An update never changes an existing value, except `agsVersion` and values passed with `--set`, and keeps comments and order.
- `--set key=value`, on install and update, is repeatable and accepts declared keys only. Strings are taken verbatim, `--set key=` sets an empty string, and booleans take `true` or `false`. A missing required value is asked for in a terminal; without a terminal, the command exits 3.
- `checks.*` values are `package.json` script names, never command lines, and a Prettier script must not write files. The `check` script picks the package manager from `packageManager` or the single lock file, and runs each script as `<manager>.cmd run <script>`.

## Releases

Versions follow semver. Patch is for wording fixes and CLI bug fixes. Minor is for new skills, rules and settings, and for compatible CLI additions. Major is for removed or renamed ids or setting keys, and for changed host layouts or schemas. Hosts never update across a major version.

1. Commit normal work, including promotions from hosts.
2. Add notes with `ags version note "<text>"`; a promotion adds its own. Review them with `ags version`.
3. Run `ags version bump patch|minor|major`. It shows the notes and the next version and asks for confirmation. It refuses uncommitted changes, and an empty `## Unreleased` unless `--allow-empty` is passed. It runs the tests, moves the notes under `## X.Y.Z - YYYY-MM-DD`, sets `package.json` `version`, commits `Release: X.Y.Z` and creates the annotated tag `vX.Y.Z`. It prints each registered host with its update command, and updates none. If it stops after the commit, the same bump creates the missing tag.
4. Update hosts one at a time with `ags host update`.

## Layout

```text
AGENTS.md            guide for agents working on AGS itself
README.md            human overview and command reference
CHANGELOG.md         Unreleased notes and released versions
LEDGER.md            concept ledger
BACKLOG.md           deferred work
docs/                design records: V2 spec/inventory, V3 spec/implementation plan/proto-rules
package.json         version, bin `ags`, engines, dependencies
pnpm-lock.yaml       dependency lock file
catalog.yaml         rules, skills, settings
rules/<id>.md        strong and soft rules
skills/<id>/         skills: SKILL.md, optional scripts/, references/, assets/
templates/           agents-block.md, ags.yaml
scripts/             ags.mjs, install-global.mjs and lib/
test/                node --test suites and fixtures
hosts.yaml           registry; machine-local, gitignored
reports/runs/        run log; gitignored
.tmp/                local development area, gitignored; .tmp/ags/ is reserved for the ags command
```

This repository is not a host. It has no `.agents/`, no harness skill folders and no AGS block, and `ags host prepare` and `ags host install` refuse it. `skills/` is not a harness discovery path, so the material stays inactive while you work on it.
