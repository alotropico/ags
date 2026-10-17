# AGS

Reusable agent rules, skills, and small deterministic helpers. Use `ags` to install selected guidance into a Git repository, customize it there, and review changes when updating.

[Quick start](#quick-start) · [Customization](#customization) · [Everyday usage](#everyday-usage) · [Commands](#commands) · [Technical reference](#technical-reference) · [Working on AGS](#working-on-ags)

## Quick start

Requires **Node.js 20+**, **pnpm**, **Git**, and the AGS Git checkout with its release tags. Windows is verified; Apple Silicon macOS support is provisional. Linux and mobile are outside the supported contract. See [macOS setup](#macos-setup-and-verification).

### 1. Install the command

From the AGS checkout in PowerShell:

```powershell
pnpm install
node .\scripts\install-global.mjs
ags doctor
```

The installer's bin directory must be on PATH. If needed, run `pnpm setup`, restart the terminal app, and rerun the installer. See [installer options and troubleshooting](#installer-options-and-troubleshooting).

### 2. Install guidance in a project

Use a project in its main Git worktree:

```powershell
ags skills list
ags host install --route "C:/projects/my-app"
ags host status --route "C:/projects/my-app"
```

Choose optional rules and skills, supply any required settings, and confirm the installation plan. Existing agent setup is backed up first; installation never commits.

The picker uses **Up/Down** to move, **Space** to toggle, and **Enter** to continue. **Esc** cancels without writing. `[+]` marks required companion skills. See [selection and confirmation](#selection-and-confirmation) for other terminal and agent workflows.

### 3. Use it with your agent

Open the project in your coding harness. AGS writes the shared instructions to `AGENTS.md`, rules to `.agents/rules/`, and skills to `.agents/skills/`. Verify that your harness discovers them; installation and activation are separate. See [harness discovery](#harness-discovery).

Projects hold installed copies and need neither `ags` nor the AGS checkout at runtime.

## Customization

### Choose rules and skills

The catalog marks items as `always`, `detected`, or `opt-in`. Browse IDs with `ags skills list`; choose opt-ins during installation or change selections on an update.

From the project root, preview a selection change:

```powershell
ags host update --enable "code-idioms,state-topology" --dry-run
```

Review the plan, then rerun without `--dry-run` to confirm it interactively. `--enable` and `--disable` accept comma-separated rule or skill IDs. Required companions remain included while their parent is selected.

Selected soft rules can also require companions. `code-idioms` requires `typescript-react`; its complete installed references cover backend TypeScript, React implementation and concrete client-cost work selectively. Required companions stay out of explicit `skills.enabled`. A disabled required child fails before writes with its parent and actionable enable/disable choices; an independently selected child survives removal of its former parent. The picker and plan show included companions. A deleted required child offers reviewed restore/ignore, without an invalid disable choice while its parent remains selected.

### Set project values

`.agents/ags.yaml` stores selections, settings, reporting, and optional integration preferences. Install/update adds settings needed by selected skills, with defaults and comments. Existing values, comments, and order are preserved.

For declared settings, use repeatable `--set` flags:

```powershell
ags host update --set git.mainBranch=main --set checks.type=typecheck --dry-run
```

Use the project's actual branch and `package.json` script names. After reviewing, rerun without `--dry-run`. `checks.*` values are script names, not shell commands; a configured Prettier check must not write files.

A typical configuration looks like this:

```yaml
format: 2
host: my-app
agsVersion: 5.0.0
reporting: true
skills:
  enabled: [css-theme-tokens]
  disabled: []
rules:
  enabled: [code-idioms]
  disabled: []
git:
  mainBranch: main
checks:
  type: typecheck
local: {}
```

The version shown is an example; `agsVersion` is maintained by the lifecycle commands. Commit the configuration with the project and keep secrets out of it. Edit reserved preferences such as `reporting` by hand; `--set` accepts catalog-declared settings and exactly the optional `integrations.claudeSkills` boolean. Other integration preferences remain hand-edited.

### Add project guidance

| Guidance | Put it here |
| --- | --- |
| Project facts and conventions | `AGENTS.md`, outside the generated AGS block. |
| Project rules | `.agents/rules/<project-id>.md`, with a non-AGS ID and a `description`. |
| Project skills | `.agents/skills/<project-id>/`, with a non-AGS ID. |
| Notes for an installed skill | `.agents/local/<skill-id>.md`; read before that skill. |
| Other local guidance | `.agents/local/`, linked from a rule, skill, or project instructions. |

Project facts and formats override AGS defaults; AGS safety constraints do not yield. Keep lasting instructions outside the generated block, which is regenerated on update.

You may edit installed AGS material. The next update reviews those changes and offers applicable `promote`, `restore`, `ignore`, or `disable` decisions. Promotion carries reusable guidance back into AGS. For project-only exceptions, prefer local notes.

## Everyday usage

Run these from a project root unless a route or registered host is specified:

```powershell
ags host status
ags check --only "type,lint"
ags diff
ags git-changes --output-to stdout
ags host update --dry-run
```

- **Inspect:** `host status` shows versions, local changes, settings, pending work, usage, and doctor warnings. `ags doctor` validates a host without repairing it. On an AGS checkout it creates a missing local ledger and leaves an existing ledger unchanged.
- **Check:** `ags check` runs the installed check helper using the configured project scripts. It chooses npm, Yarn, or pnpm from the project.
- **Share changes:** `ags git-changes` exports a readable list of changed files and statuses (clipboard, file, or stdout). `ags diff` writes a full patch to `.tmp/scratch/changes.diff` by default. Both work in any Git repository without an AGS installation.
- **Update:** inspect the dry run, then apply the reviewed plan. Updates stay within the installed major by default; `--to X.Y.Z` selects an explicit release with a supported migration.

Use `--route "C:/projects/my-app"` to work from another directory. Update/status/unregister also accept `--host <id>` from `ags host list`. Mutation operates on one host at a time; `--all` is for inspection and report collection.

For optional tool/skill offers, run `ags setup` in the relevant project and review its plan. This configures optional integrations; it does not install the `ags` command or create an AGS host installation.

## Commands

Use `ags help <command>` or `ags <command> --help` for accepted parameters and examples:

```powershell
ags help host install
ags host update --help
```

### Inspect and configure

| Command | Purpose |
| --- | --- |
| `ags doctor` | Validate AGS and a host; supports `--route` or `--all`; never repairs. |
| `ags skills list` | List catalog IDs, kinds, install classes, descriptions, and keywords. |
| `ags setup` | Refresh capabilities and review compatible optional integrations. |
| `ags skill add <source> --skill <name>` | Install a project-local third-party skill through the skills CLI. |
| `ags check --only "type,lint,prettier"` | Run selected configured checks; omit `--only` for all configured checks. |

### Manage hosts

| Command | Purpose |
| --- | --- |
| `ags host prepare` | Move existing agent setup into a backup before installation. |
| `ags host prepare --backup-only --file <path>` | Make a verified copy-only legacy backup; repeat `--file` as needed. |
| `ags host install` | Install the latest release or resume an interrupted installation. |
| `ags host register` | Register an existing installation in this checkout without changing host guidance; accepts `--route` and an optional `--name`. |
| `ags host update` | Update guidance and review local changes; use `--to` to select a release. `--commit` then commits only the host paths the update wrote or deleted, as `AGS: update <host> <from> -> <to>`; other changes stay untouched, and it refuses during a merge, rebase, cherry-pick or revert. Without it, AGS never commits in a host. |
| `ags host status` | Inspect a host; supports `--route`, `--host`, or `--all`. |
| `ags host list` | List registered hosts and installed versions. |
| `ags host unregister` | Remove registry entries and records; leave host files in place. |

### Diffs, snapshots, and temporary files

| Command | Purpose |
| --- | --- |
| `ags git-changes [options]` | Export changed files and statuses; no host install required. |
| `ags diff [current] [staged] [N or hash]` | Write a Git diff patch; no installed skill required. |
| `ags snapshot` | Archive a host's `AGENTS.md` and `.agents/` with a manifest. |
| `ags snapshot source` | Archive tracked AGS working-tree files with a manifest. |
| `ags snapshot tree` | Write a names-only Markdown directory tree for AGS or a project. |
| `ags tmp inspect` | Inventory eligible temporary files and hashes. |
| `ags tmp clean --manifest <file>` | Review manifest-directed archive moves. |

### Reporting

| Command | Purpose |
| --- | --- |
| `ags report usage` | Record a known action and outcome in the host spool. |
| `ags report collect` | Collect new events; supports `--route`, `--host`, or `--all`; leaves spools untouched. |
| `ags report compact` | Compact closed central usage segments. |
| `ags report clean --before YYYY-MM` | Review central cleanup and retain a cutoff against recollection. |

### Versions and releases

| Command | Purpose |
| --- | --- |
| `ags version` | Show package/release versions, unreleased commits, and notes. |
| `ags version note "<text>"` | Append an unreleased changelog note. |
| `ags version bump patch` | Test, commit, and tag a release; also accepts `minor` or `major`. |

## Technical reference

### Selection and confirmation

On a fresh interactive install, **A** selects all and **N** clears explicit choices. Required companions remain selected. The picker scrolls and preserves prior output; simple terminals offer numbered choices such as `1,3,5` (`stop` cancels). Explicit flags, resumed installs, dry runs, and non-interactive calls retain their existing behavior.

Prepare/install/register/update/unregister show a plan with a 12-character digest. Interactive commands collect per-item decisions, optionally reuse a choice for remaining items, then confirm. `stop` and `--dry-run` write nothing.

Without a TTY, pending decisions exit 3 with the plan and rerun. Use its actual `--plan <digest>` and reviewed `--decide <path>=<choice>` values; `--decide-all <choice>` answers items offering that choice. Agents must show the user the plan before passing its digest.

Reruns identify their shell: PowerShell, CMD delegating through PowerShell, or POSIX zsh/`/bin/sh`. Replace decision placeholders before execution.

Flags accept `--flag value` or `--flag=value`; duplicate singleton flags and unexpected positionals are errors. Repeatable flags retain all values. Bare command groups show help; questions require a TTY. Route paths follow OS rules; serialized relative paths use `/`. Unrepresentable names and portable case collisions fail before mutation.

| Exit code | Meaning |
| --- | --- |
| 0 | Success. |
| 1 | Failure or refusal. |
| 2 | Invalid usage. |
| 3 | A decision or confirmation is needed. |

### Host files, ownership, and safety

A host is a Git repository in its main worktree. Prepare/install/register/update/status/unregister refuse linked worktrees, submodules, and separate Git directories. The AGS source repository cannot itself be a host.

| Path | Owner or purpose |
| --- | --- |
| `AGENTS.md` | Project-owned, with the generated AGS block at the top. |
| `.agents/ags.yaml` | Committed configuration and selections. |
| `.agents/rules/<id>.md` | Managed soft rules for AGS IDs; project rules for other IDs. |
| `.agents/skills/<id>/` | Managed skills for AGS IDs; project/third-party skills for other IDs. |
| `.agents/local/` | Project-owned notes and guidance. |
| `.tmp/ags/backups/<stamp>/` | Prepare/install/update backups. |
| `.tmp/ags/locks/` | Host lock. |
| `.tmp/ags/reports/usage.jsonl` | Host usage spool. |
| `.tmp/ags/snapshots/` | Host snapshots. |
| Git exclude file | AGS exclude block when `.tmp/` is not otherwise ignored. |

Managed material comes from annotated tag `vX.Y.Z`. A project rule/skill using a reserved AGS ID stops install/update and prints a rename to `<host-id>-<id>`. Strong rules are inlined.

The generated block runs from `<!-- AGS:BEGIN <version> <hash> -->` to `<!-- AGS:END -->`: strong rules, then a soft-rule index with AGS entries before described project rules. Edits inside it require restore or stop.

Prepare moves setup to `.tmp/ags/backups/<stamp>-prepare/` and prints a cleanup prompt. Install prepares when needed, writes material/settings/block/excludes, registers the host, and resumes interrupted installs. Neither commits. Update reviews edits and regenerates the block.

Overwritten/deleted host files are backed up first. Locks protect each host and AGS; interrupted commands print recovery reruns. Gitignored, machine-local `hosts.yaml` stores IDs/names/paths and ignore/promotion records. Unregister discards records, retaining host files.

External installers must register the finished installation in the AGS checkout used for host management and report collection. A private release cache has its own registry; registering there does not register the host in another checkout. Use `ags host register --route "C:/projects/my-app" --dry-run`, then apply its reviewed plan. Registration reads the existing format-2 configuration, requires the installed annotated release locally, and writes only this checkout's registry. Repeated registration is a no-op. Optional `--name` changes the display name; relocation retains ignore/promotion records when the old location no longer identifies that host. Conflicting paths or still-live duplicate IDs refuse. It never updates guidance, commits, or auto-registers hosts during inspection/report collection.

Inspection atomically refreshes gitignored `hosts/<id>.json` with path, version, separate sorted AGS/non-AGS skill names, tools, timestamp and validated managed Claude alias descriptors. Unavailable hosts retain stale snapshots. It takes no mutation locks and writes no host files. Discovery deduplicates target identities and reads only entry metadata for third-party links, without managing their trees. Doctor checks scripts/trunk resolution and missing/dangling/altered aliases, naming reviewed repair paths.

### Installer options and troubleshooting

The command runs working-tree code immediately; installed guidance comes from release tags. `version`/`doctor` report state without certifying release equality. Host lifecycle requires Git history, not a copied ZIP/package.

After moving the checkout, rerun from its new location:

```powershell
node .\scripts\install-global.mjs --replace
```

Use `--bin <absolute-directory>` to choose a directory already on PATH:

```powershell
node .\scripts\install-global.mjs --bin "$env:USERPROFILE\bin"
```

Windows writes `ags.CMD`, `ags.ps1`, and `ags`. Default bin selection: `PNPM_HOME` itself, `pnpm bin -g`, then `%LOCALAPPDATA%\pnpm`; no `bin` is appended to `PNPM_HOME`.

A shim pointing elsewhere, including a dangling link, stops installation: use `--replace` or another bin. Same-checkout reinstalls are idempotent. `pnpm setup` updates user PATH; restart the terminal app to avoid stale inherited values.

Check resolution with `Get-Command ags -All` (PowerShell), `where.exe ags` (CMD), or `command -v ags`/`type -a ags` (zsh). Compare with installer/doctor output. Node resolves from the active environment.

### macOS setup and verification

From the Git checkout with its release history:

```sh
pnpm install --frozen-lockfile
node scripts/install-global.mjs --bin "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
ags doctor
```

The executable LF launcher uses `PNPM_HOME`, pnpm's reported global bin, or `$HOME/.local/bin`. Write failures stop with a `--bin` remedy. No `sudo` or shell-file edits; persist PATH yourself if needed. Reinstall moved checkouts with `--replace`.

Provisional verification targets Apple Silicon, zsh/`/bin/sh`, and default/case-sensitive local filesystems. Intel needs separate evidence.

`pnpm trial:macos` runs the full suite, temporary case-sensitive APFS checks, and a launcher smoke from a prepared checkout. It neither replaces global `ags` nor releases/adopts a host.

### Harness discovery

Verify loading in the actual harness/version. `.agents/skills/` installation alone does not establish Claude discovery through `.claude/skills/`.

V6 offers compact Claude skill discovery through the explicit preference below. Filesystem success and harness loading are separate evidence. AGS adds no root instruction file/import/link, precedence mode or user-setting workaround. Existing prepare/install handling of root `CLAUDE.md`, including `.bak` backups, stays unchanged.

### Compact Claude skill discovery

`integrations.claudeSkills` is an optional boolean, false when absent. Preview with `ags host update --host <id> --set integrations.claudeSkills=true --dry-run`, then apply the reviewed digest. Each selected installed AGS skill gets `.claude/skills/<id>` pointing to the same host's `.agents/skills/<id>`. Native symlinks use `../../.agents/skills/<id>`. Windows prefers symlinks, probes capability, then permits native directory junctions verified with Claude Code 2.1.288. No source/global targets, duplicate copies, elevation or Developer Mode/Git configuration changes are used; unsupported linking fails before lifecycle writes.

Plans bind link descriptors and parent/target identity to the existing digest, locks and recovery flow. Existing `hosts/<id>.json` records ownership; backups and host snapshots save descriptors rather than traverse alias trees. File/directory/wrong/dangling/unexpected-parent collisions refuse before writes. An unrecorded exact-target link is adopted only as an explicit reviewed plan item. False or deselection removes only recorded matching link entries, never their targets; unrelated `.claude` material remains host-owned. Missing managed aliases have reviewed repair paths. Unregister drops records and leaves host files under its existing contract.

Git for Windows reads a junction as a directory, so each managed alias is excluded locally: a separate `# AGS:CLAUDE-ALIASES:BEGIN`/`END` region in `.git/info/exclude` lists one `/.claude/skills/<id>` line per managed alias, without a trailing slash so symlinks and junctions both match. Third-party `.claude/skills/` entries stay visible to Git. The region follows the final alias set in the same reviewed plan, is written before links are created and removed when none remain; an edited region is restored with a backup. Doctor reports a missing, edited or stale region. Cursor also loads `.claude/skills/`, so a skill may appear twice there; deduplication is unverified. Windows junctions store absolute targets: after moving a host, delete its `.claude/skills/<id>` junctions (never their targets) and rerun `ags host update`.

Official [Claude skill documentation](https://code.claude.com/docs/en/skills) describes directory symlinks and target deduplication. [Instruction loading](https://code.claude.com/docs/en/memory) separately describes direct `AGENTS.md` support from 2.1.277 with session/configuration limitations. Windows Claude 2.1.288 junction discovery/reference reading and a separate tools-disabled root startup phrase were observed in fixtures. Native symlinks were denied by that environment. Cursor duplicate activation, native macOS linking and other host/session root loading need their own evidence. External automatic task-loading probes were blocked by approval review; local review does not establish activation. No instruction parity is inferred from a working skill alias.

### Optional integrations

Setup detects the skills CLI, Graphify, Fallow, and ast-grep, preferring project-local executables. Intent applies to TanStack packages exposing native skills. Detection is informational and revalidated before use; missing tools do not block unrelated work. In AGS, setup records capabilities only.

Reviewed setup/install plans offer compatible integrations: pinned Mantine 9 form material (older/unverifiable versions skipped), version-matched TanStack skills via Intent, and Fallow/ast-grep when installed. Intent's required package allowlist appears before writes.

Use `--no-official-skills` on setup/install to save an opt-out, or edit these preferences in the project configuration:

```yaml
integrations:
  officialSkills: false
  fallow: false
  astGrep: false
  claudeSkills: false
```

The skills proxy delegates to `skills add`, requires `--skill` without a TTY, targets `.agents/skills/`, and refuses existing destinations. Output/status/lockfiles/updates stay backend-owned. Third-party skills remain project-owned, outside the catalog.

The `ags-graphify` skill requires Graphify; automation stays local/deterministic. External models, hosted inference, and API-credit operations require explicit requests; project restrictions still apply.

### Configuration rules

Reserved keys: `format`, `host`, `agsVersion`, `reporting`, `skills`, `rules`, `integrations`, `local`. `local` is free-form; other namespaces must be catalog-declared. Unknown keys fail. `reporting: false` disables recording without writes.

Updates change existing values only for `agsVersion` or explicit `--set` arguments. Strings are verbatim; `key=` is empty; booleans are `true`/`false`. Missing required values prompt or exit 3 without a TTY.

Check selects the manager from `packageManager` or a single lockfile and runs `<manager> run <script>`. Missing/non-executable managers and child signals fail explicitly. Helpers need only Node. Windows batch backends reject NUL/newline arguments; remove NUL or use a native executable for newlines.

### Git changes export

`ags git-changes` exports either a patch diff or a file list with change types (`--format diff|list`; non-interactive default is list). The wizard defaults to diff. It does not require host registration or an AGS install. Default destination is the clipboard in a terminal and stdout when redirected. Use `ags help git-changes` for flags and the interactive wizard.

| Example | Effect |
| --- | --- |
| `ags git-changes` | Wizard when stdin, stdout, and stderr are terminals; otherwise all working-tree scopes. |
| `ags git-changes --staged-only --output-to stdout` | Staged files only, printed to stdout. |
| `ags git-changes --latest-commits 3 --file-path ./review.txt` | Working tree plus the last three commits, saved to a file. |
| `ags git-changes --commit HEAD --no-working-tree` | One commit's file list only. |

Relative `--file-path` values resolve from the invocation directory, even with `--cwd` targeting another worktree.

### Diff selectors

Diff leaves source/index unchanged, prints output path/size/source, and replaces `.tmp/scratch/changes.diff` by default. Untracked `.tmp/` artifacts are excluded.

| Example | Includes |
| --- | --- |
| `ags diff` | Current and staged changes. |
| `ags diff current` | Unstaged and untracked changes. |
| `ags diff staged` | Staged changes. |
| `ags diff 1` | Last commit. |
| `ags diff current staged 1` | Current, staged, and last-commit changes as one net diff. |
| `ags diff a1b2c3d` | That commit's patch. |
| `ags diff commit HEAD~2` | A particular commit by reference. |
| `ags diff --name review` | Default selection, written to `.tmp/scratch/review.diff`. |

`unstaged` aliases `current`; selectors may be reordered. Combinations are net diffs; canceling changes disappear. Counts/merges use first-parent history; root commits use the empty tree. Disambiguate numeric hashes with `commit <hash>`. `--route` selects a repository; `--name` accepts a plain filename, adding `.diff` when missing.

Legacy forms: `ags diff commits review 3`, `ags diff range review <from> [to]`, and `ags diff <staged|changes|untracked|current> review [N]` (`N` only for `current`). Named `current` includes staged changes; shorthand `current` excludes them.

### Source and tree snapshots

Source snapshots archive tracked working-tree files from the command's AGS checkout; untracked/deleted files are omitted. No host installation or `--route`. Default: `.tmp/ags/snapshots/source-<timestamp>.zip`. Manifest: version, HEAD, selection, timestamp, sizes, and SHA-256 hashes. HEAD identifies the base commit, not a clean tree.

| Option | Meaning |
| --- | --- |
| `--out <file.zip>` | New path inside AGS; relative to the current directory; existing files are never overwritten. |
| `--only <paths>` | Comma-separated repository-relative files/folders; `base` means root files. |
| `--except <paths>` | Exclusions using the same syntax; cannot combine with `--only`. |
| `--preset review` or `--preset review-lite` | Fixed review selections and generated tree/manifest; cannot combine with selection flags. |
| `--include-standard-excluded` | Include tracked `.env*`, `credentials.json`, `id_rsa`, and `*.pem`; Git-ignored files remain excluded. |

Non-preset exclusions: `hosts.yaml`, `reports/`, `.tmp/`, `.git/`, `node_modules/`, source `manifest.json`. Links and Git-ignored files stay excluded even if force-tracked. Presets use fixed path sets, including optional `hosts.yaml`, an in-memory tree, and `snapshot-manifest.json`. `review` includes rules, skills, templates, scripts, and tests, and omits the lockfile. Manifests include resolved/missing paths, HEAD, and payload hashes, excluding their own hash.

```powershell
ags snapshot source --preset review
ags snapshot source --only "base,rules" --out .tmp/ags/snapshots/rules-review.zip
ags snapshot source --except "test,docs"
```

This replaces the old `ags snapshot canonical` subcommand.

Tree snapshots include names/structure only: empty directories and hidden/untracked/ignored entries. `.git`, `node_modules`, and `.tmp` are excluded at every level; links/junctions are marked, never followed. Default in any Git repository: `.tmp/records/<date>-tree-snapshot-<time>.md`.

```powershell
ags snapshot tree
ags snapshot tree --route "C:/projects/my-app"
ags snapshot tree --out .tmp/records/2026-10-05-repository-tree.md
```

`--route` accepts a repository or subdirectory. `--out` requires a new Markdown path inside that repository, relative to the current directory.

### Reporting, archiving, and backups

Usage records hold known action/type/outcome, host/version, optional harness/session context, normalized prompts capped at 160 characters, and attachment basenames. Legacy `path=level` remains accepted; the skill generates no scores.

Collection preserves spools, warns on malformed lines, defers incomplete tails, and deduplicates against raw/compact data under a central lock. `reports/usage/YYYY-MM-NNN.jsonl` segments close at 1,000 records or month completion; closed segments never reopen.

Compaction verifies groups/counts/time bounds/source IDs under `reports/usage/compact/` before deleting raw inputs; conflicts preserve input and fail. Cleanup saves `reports/usage/retention.json` first to prevent recollection. Run logs remain untouched.

Tmp inspection covers regular files under `.tmp/plans/`, `.tmp/records/`, and `.tmp/scratch/`. `ags-sweep` manifests in `.tmp/records/` contain `schemaVersion: 1`, `archiveMonth: YYYY-MM`, and `path`/`hash`/`disposition` entries.

Only `completed`/`archive` entries move under `.tmp/archive/YYYY-MM/`, retaining paths/names. Active/keep/unmarked files, links, operational files, archives, and manifests are protected. Traversal, stale hashes, and collisions fail; moves are recorded for recovery.

Copy-only backups use `operation: backup-only`, hash-verify regular tracked/ignored/untracked files (including config/hooks), and retry without modifying originals. Repeat `--file` as needed; handle links manually. Retain legacy backups until explicitly retired.

POSIX copy backups preserve/verify permission bits, including executability; rename-based prepare retains them. Restore copied permissions. ACLs, ownership, and extended attributes are excluded; manifest format is unchanged.

### Updates and relocated hosts

A target with a different major version is refused before any write. Downgrades are refused. A same-major update keeps the host's format-2 configuration, settings, comments, selections, reporting preference, local notes, ignore and promotion records, and project-owned files.

Preview an update from the host, including after the checkout has moved:

```powershell
ags host update --route "C:/projects/my-app" --dry-run
```

Update registers a missing host id or reconciles an unavailable old location. A conflicting id, or an old location that still contains that host, is refused. A missing machine registry starts empty. Use a reviewed plan rather than importing another registry.

### Try a disposable host

Use a throwaway repository and answer the prompts:

```powershell
$trialDir = Join-Path $env:TEMP ("ags-trial-" + [guid]::NewGuid().ToString("n"))
git init $trialDir
ags host install --route $trialDir
ags host status --route $trialDir
ags host unregister --route $trialDir
Remove-Item -Recurse -Force $trialDir
```

## Working on AGS

Read [AGENTS.md](AGENTS.md) for source work and [CHANGELOG.md](CHANGELOG.md) for releases. The concept ledger is the gitignored `LEDGER.md`; `ags doctor` creates it when it is missing.

The source checkout is not a host: it has no `.agents/`, harness skill directories, or AGS block. Its `skills/` directory is not a harness discovery path, so guidance remains inactive while being edited. Prepare/install refuse this root.

### Release a version

Versions follow semver: patch for wording/CLI fixes; minor for compatible skills/rules/settings/CLI additions; major for removed/renamed IDs/settings or changed host layouts/schemas.

1. Commit normal work, including reviewed host promotions.
2. Add notes with `ags version note "<text>"`, review `ags version`, and commit those notes so the tree is clean. Promotions add their own notes.
3. Run `ags version bump <level>` with `patch`, `minor`, or `major`. Review the notes/version and confirm. The command refuses uncommitted changes and empty unreleased notes unless `--allow-empty` is supplied; it runs the full suite, updates changelog/package version, commits `Release: X.Y.Z`, and creates annotated tag `vX.Y.Z`.
4. Update hosts individually with `ags host update`. The bump prints registered-host update commands and updates none.

If the bump stops after committing, rerun it to create the missing tag. Release notes move under `## X.Y.Z - YYYY-MM-DD`. Quote comma-separated arguments in PowerShell.

### Source layout

| Path | Purpose |
| --- | --- |
| `AGENTS.md`, `README.md` | Source-work instructions and user documentation. |
| `CHANGELOG.md` | Unreleased notes and released versions. |
| `LEDGER.md` | Local concept ledger. Gitignored; `ags doctor` creates the empty table when the file is missing. |
| `catalog.yaml` | Rules, skills, and setting definitions. |
| `rules/<id>.md`, `skills/<id>/` | Guidance; skill directories may include scripts, references, and assets. |
| `templates/` | Generated-block and host-configuration templates. |
| `scripts/` | CLI, global installer, and implementation modules. |
| `test/` | Node test suites and fixtures. |
| `package.json`, `pnpm-lock.yaml` | Version, command entry, engines, dependencies, and lockfile. |
| `hosts.yaml`, `hosts/<id>.json` | Machine-local registry and observed state; gitignored. |
| `reports/runs/`, `reports/usage/` | Run logs and collected/compact usage; gitignored. |
| `.tmp/` | Local development artifacts; `.tmp/ags/` is reserved for the CLI. |
| `.tmp/archive/` | Completed plans, planning guides, and other local history. |
