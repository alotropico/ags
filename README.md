# AGS

Rules, skills, and small deterministic helpers for coding agents. Installed into a Git repository, then left there.

[What it does](#what-it-does) · [Written for](#written-for) · [Quick start](#quick-start) · [Documentation](docs/README.md)

```
┌────────────────────┐    ags host install    ┌────────────────────┐
│    AGS checkout    │   release tag vX.Y.Z   │  host repository   │
├────────────────────┤  ───────────────────▶  ├────────────────────┤
│ rules/             │                        │ AGENTS.md          │
│ skills/            │                        │ .agents/ags.yaml   │
│ catalog.yaml       │                        │ .agents/rules/     │
└────────────────────┘                        │ .agents/skills/    │
                                              └────────────────────┘
```

The `ags` command copies the selection you confirm. It copies it from an annotated release tag, into the host's main worktree. After that, the agent reads the host copy. Invoking an `ags` helper still runs code from this checkout.

---

## What it does

Three pieces, kept apart:

| Piece | Where it lives | When it matters |
| --- | --- | --- |
| ◆ **Source** | This Git checkout, with its release tags | Install, update, and `ags` itself |
| ◆ **Host copy** | The project's `AGENTS.md` and `.agents/` | Every agent session in that project |
| ◆ **Helpers** | The `ags` command | Checks, diffs, snapshots, usage records |

◆ **Rules** are standing instructions. Strong rules are inlined into `AGENTS.md` and apply on every task. Soft rules are files the agent opens when the task touches that topic.

◆ **Skills** are procedures for a kind of work: a plan, a commit series, a React change, a CSS edit, an accessibility pass.

◆ **Helpers** are code. `ags check`, `ags diff`, and `ags git-changes` do a fixed job and write a fixed result.

You choose what is copied. The catalog marks each rule and skill `always`, `detected`, or `opt-in`. A later update brings a newer release across and reviews edits you made to the installed copy. Promotion can carry a reusable edit back into this checkout.

Installation writes files and leaves the commit to you. `ags host update --commit` is the one host command that commits, and it commits only the paths that update wrote or deleted.

---

## Written for

Any Git repository on its main worktree can be a host. Linked worktrees, submodules, and this checkout itself are refused. The **catalog text** is written for a narrower kind of project. Read it that way when you choose skills.

### ◈ Application

TypeScript, frontend or backend. React components and hooks, including JavaScript React. CSS and SCSS, CSS modules, and theme tokens. Web UI that prefers semantic HTML, native browser behavior, and accessibility on the interaction you are changing. Shared client state: stores, selectors, caches, the URL, storage, and async work.

One skill is selected by package detection. If `package.json` depends on `@platform/ui-library`, UI-library CSS guidance can be installed with its CSS companions.

### ◈ Repository

A Node package whose checks are `package.json` scripts: a typecheck, a linter, and a Prettier check that does not write files. `ags check` runs them through npm, Yarn, or pnpm, whichever the project already uses.

Git with a trunk branch, feature branches, an optional ticket prefix, small commits, and a merge request when you ask to ship.

### ◈ Agent

A harness that loads `AGENTS.md` and `.agents/rules/` and `.agents/skills/`. That is the layout this tree is written against. Cursor is the harness those paths match directly. Claude Code can receive optional per-skill aliases under `.claude/skills/`; turning that on is a reviewed host update, and a file on disk still has to be loaded by that harness. Details: [Harnesses](docs/harnesses.md).

### ◈ Machine

**Windows** is the verified platform. **Apple Silicon macOS** is provisional (zsh or `/bin/sh`). Linux and mobile are outside the supported contract. Setup for both supported platforms: [Install the command](docs/install-command.md).

### ◈ When the project is another stack

Planning, specifications, commits, branches, shipping, debugging, diff export, and temporary-file rules apply in other repositories too. For those hosts, leave the TypeScript, React, client-state, CSS, and web skills unselected. `ags skills list` shows each id and its install class. Optional setup can also offer Mantine 9 form material, TanStack skills, Fallow, ast-grep, and Graphify when those tools are already present: [Integrations](docs/integrations.md).

---

## Quick start

Requires **Node.js 20+**, **pnpm**, **Git**, and this checkout with its release tags. The command runs the working tree you installed it from. Installed guidance comes from release tags. Uncommitted edits in this checkout affect the command, and they reach a host only after a release.

### 1 · Command

From this checkout, in PowerShell:

```powershell
pnpm install
node .\scripts\install-global.mjs
ags doctor
```

The installer's bin directory has to be on `PATH`. If `ags` is not found, run `pnpm setup`, restart the terminal, and rerun the installer. PATH, `--bin`, moving the checkout, and macOS: [Install the command](docs/install-command.md).

### 2 · Host

Point at the project's main worktree:

```powershell
ags skills list
ags host install --route "C:/projects/my-app"
ags host status --route "C:/projects/my-app"
```

The picker uses **Up/Down** to move, **Space** to toggle, and **Enter** to continue. **Esc** cancels and writes nothing. `[+]` marks a required companion skill. Existing agent setup is backed up first.

Supply any required settings when asked. A typical required value is `git.mainBranch`. Full selection, confirmation, and a throwaway trial: [Install a host](docs/install-host.md).

### 3 · Agent

Open the host in the harness. Confirm that it loads `AGENTS.md`, `.agents/rules/`, and `.agents/skills/`. Installation and activation are separate.

### 4 · A short session

From the host root:

```powershell
ags host status
ags check --only "type,lint"
ags host update --dry-run
```

| Need | Command |
| --- | --- |
| Versions, local edits, settings, warnings | `ags host status` |
| Configured type, lint, and Prettier checks | `ags check` |
| A file list or a patch, in any Git repo | `ags git-changes` |
| A diff file under `.tmp/scratch/` | `ags diff` |
| A reviewed update plan | `ags host update --dry-run` |

`git-changes` and `diff` work with or without an AGS install. Parameters for any command: `ags help <command>`.

---

## Documentation

The pages under [`docs/`](docs/README.md) are the detailed reference. This file stays the front door.

| | |
| --- | --- |
| **Install** | [Command](docs/install-command.md) · [Host](docs/install-host.md) |
| **Shape the copy** | [Catalog](docs/catalog.md) · [Configuration](docs/configuration.md) |
| **Day to day** | [Commands](docs/commands.md) · [Git exports](docs/git-exports.md) |
| **Files and safety** | [Host contract](docs/host-contract.md) · [Harnesses](docs/harnesses.md) |
| **Around the edges** | [Integrations](docs/integrations.md) · [Snapshots](docs/snapshots.md) · [Reporting](docs/reporting.md) |
| **This repository** | [Releases](docs/releases.md) · [AGENTS.md](AGENTS.md) · [CHANGELOG.md](CHANGELOG.md) |

── ◈ ──
