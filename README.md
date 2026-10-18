# AGS

AGS centralizes coding-agent guidance and workflows across repositories. Its CLI distributes rules and skills, provides deterministic tools, and records usage.

Adapt shared defaults per project and bring reusable improvements back into AGS.

[Capabilities](#what-ags-provides) · [How it works](#how-it-works) · [Project fit](#project-fit) · [Quick start](#quick-start) · [Documentation](docs/README.md)

```text
┌────────────────────┐    ags host install    ┌────────────────────┐
│    AGS checkout    │  ------------------->  │  host repository   │
├────────────────────┤   release tag vX.Y.Z   ├────────────────────┤
│ rules/             │                        │ AGENTS.md          │
│ skills/            │                        │ .agents/ags.yaml   │
│ catalog.yaml       │                        │ .agents/rules/     │
│                    │                        │ .agents/skills/    │
└────────────────────┘                        └────────────────────┘
          ^                                             │
          └────── promote reusable improvements ────────┘
```

## What AGS provides

| Capability | What it gives you |
| --- | --- |
| **Shared guidance** | Rules, skills, and project settings for planning, implementation, review, debugging, validation, and shipping. |
| **Host management** | A registry of repositories, installed versions, local changes, reviewed updates, backups, and promotion of reusable improvements. |
| **Deterministic tools** | CLI helpers for checks, Git exports, snapshots, and temporary-file cleanup. |
| **Optional integrations** | Suggestions and setup for compatible third-party skills and tools, based on the project's packages and available executables. |
| **Usage reporting** | Optional records of meaningful actions and outcomes, collected across hosts into local reports. |

Integrations include Mantine 9 form material, TanStack skills, Fallow, ast-grep, and Graphify. `ags skill add` installs third-party skills through the skills CLI; their updates remain with that backend. See [Integrations](docs/integrations.md) and [Reporting](docs/reporting.md).

> **🚧 Planned companion UI**
>
> The planned app would visualize hosts, usage, and workflows, and let you edit both canonical AGS material and individual hosts' guidance and settings.

## How it works

A **host** is a repository receiving AGS guidance. The `ags` command copies the selection you confirm from an annotated release tag into that host's main worktree.

Each host keeps its settings in `.agents/ags.yaml` and its guidance in `AGENTS.md`, `.agents/rules/`, and `.agents/skills/`:

- **Rules** are standing instructions. Strong rules appear in `AGENTS.md` for every task; agents open soft rules when a task touches their topic.
- **Skills** are procedures for a kind of work: a plan, a commit series, a React change, a CSS edit, or an accessibility pass.

The catalog classifies material as `always`, `detected`, or `opt-in`. Updates bring newer releases across and review edits to installed copies. Reusable changes can be **promoted back into AGS**; project instructions and local notes keep host-specific guidance alongside shared defaults. See [Configuration](docs/configuration.md).

Agents read the host's installed files. The CLI runs code from the AGS checkout, so uncommitted source edits affect the command immediately; guidance reaches hosts through a release and install or update.

Installation leaves the commit to you. `ags host update --commit` is the only host command that commits; it commits only the paths written or deleted by that update. Details: [Host contract](docs/host-contract.md).

## Project fit

AGS is **opinionated and frontend first**. Its bundled guidance favors:

- **Application code:** TypeScript, including backend code; React components and hooks, including JavaScript; CSS/SCSS, CSS modules, and theme tokens. Client-state guidance covers stores, selectors, caches, URLs, storage, and async work.
- **Web UI:** Semantic HTML, native browser behavior, and accessibility on the interaction being changed. Projects using `@platform/ui-library` receive detected CSS guidance with its companions.
- **Development workflow:** Git with a trunk branch, feature branches, optional ticket prefixes, small commits, and merge requests. Checks run the project's `package.json` scripts for types, lint, and formatting through npm, Yarn, or pnpm; Prettier checks must not write files.

Other stacks can use planning, specifications, Git, shipping, debugging, and temporary-file guidance while leaving stack-specific skills unselected. `ags skills list` shows the choices. You can also build a different guidance system on AGS's centralization framework, adapting the catalog while retaining host management, versioned distribution, and reporting.

| Environment | Support and requirements |
| --- | --- |
| **Repositories** | Git main worktrees. Linked worktrees, submodules, separate Git directories, and the AGS checkout itself are refused. |
| **Agent harnesses** | Must load `AGENTS.md`, `.agents/rules/`, and `.agents/skills/`. Cursor matches this layout. Claude Code can receive optional skill aliases under `.claude/skills/`; verify loading in your harness. [Harness details](docs/harnesses.md). |
| **Windows** | Supported and verified. PowerShell examples below. |
| **macOS** | Experimental and untested. Implementation targets Apple Silicon with zsh or `/bin/sh`. [Setup instructions](docs/install-command.md#macos). |
| **Linux and mobile** | Outside the supported contract. |

## Quick start

Requires **Node.js 20+**, **pnpm**, **Git**, and this checkout with its release tags.

### 1. Install the command

From this checkout, in PowerShell:

```powershell
pnpm install
node .\scripts\install-global.mjs
ags doctor
```

The installer's bin directory must be on `PATH`. If `ags` is not found, run `pnpm setup`, restart the terminal, and rerun the installer. Custom paths, moving the checkout, and macOS: [Install the command](docs/install-command.md).

### 2. Install into a host

Point at the project's main worktree:

```powershell
ags skills list
ags host install --route "C:/projects/my-app"
ags host status --route "C:/projects/my-app"
```

Use <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>Space</kbd> to toggle, and <kbd>Enter</kbd> to confirm. <kbd>Esc</kbd> cancels without writing. `[+]` marks a required companion skill. Existing agent setup is backed up first.

Supply required settings such as `git.mainBranch` when asked. Selection, confirmation, and a disposable trial: [Install a host](docs/install-host.md).

### 3. Open your agent

Open the host in your agent harness and confirm it loads the installed instructions and skills. Installation alone does not establish activation; see [Harnesses](docs/harnesses.md).

### 4. Work across repositories

Run host commands from the host root, or target a repository with `--route` or a registered `--host`:

| Need | Command |
| --- | --- |
| Registered hosts and installed versions | `ags host list` |
| Versions, local edits, settings, warnings | `ags host status` |
| Configured type, lint, and Prettier checks | `ags check` (or `--only "type,lint"`) |
| A file list or a patch, in any Git repo | `ags git-changes` |
| A diff file under `.tmp/scratch/` | `ags diff` |
| A reviewed update plan | `ags host update --dry-run` |
| Collect usage from all registered hosts | `ags report collect --all` |

`git-changes` and `diff` work with or without an AGS install. Use `ags setup` in a project to review compatible integrations, and `ags help <command>` for parameters.

## Documentation

The [documentation index](docs/README.md) leads to the full usage reference.

| Topic | Reference |
| --- | --- |
| **Install** | [Command](docs/install-command.md) · [Host](docs/install-host.md) |
| **Customize** | [Catalog](docs/catalog.md) · [Configuration](docs/configuration.md) |
| **Daily use** | [Commands](docs/commands.md) · [Git exports](docs/git-exports.md) |
| **Host behavior** | [Host contract](docs/host-contract.md) · [Harnesses](docs/harnesses.md) |
| **Tools and records** | [Integrations](docs/integrations.md) · [Snapshots](docs/snapshots.md) · [Reporting](docs/reporting.md) |
| **This repository** | [Releases](docs/releases.md) · [AGENTS.md](AGENTS.md) · [CHANGELOG.md](CHANGELOG.md) |
