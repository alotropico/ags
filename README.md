# AGS

AGS is the local canonical guidance and deterministic command set for coding agents. V1 supports Windows only.

Host repositories keep a small entry and their own settings. Canonical custom and third-party skills live under this checkout's `skills/<id>/`. A registered `requires-host-location` exception may live only at the host path listed in `.agents/AGS.md`. A canonical skill is never copied into a host as that exception.

## Prerequisites

- Windows
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

The installer writes `ags.CMD`, `ags.ps1`, and `ags` shims that call this tree's live `scripts/ags.mjs`. `--bin` chooses only that shim directory. It does not change the canonical source root. The directory must be on PATH. After the shims are written, the installer retargets every registered host. A failed retarget leaves the successful shim and host writes in place and returns nonzero.

```powershell
node .\scripts\install-global.mjs --bin C:\Users\<user>\bin
```

Shim directory order when `--bin` is omitted:

1. `PNPM_HOME` itself. `bin` is not appended.
2. The directory printed by `pnpm bin -g`.
3. `%LOCALAPPDATA%\pnpm` when that path can be determined.

If an existing `ags` shim does not point at this tree, the installer stops. Pass `--replace` to overwrite it, or pass `--bin` for a different directory. On a non-Windows platform the installer exits before it writes anything.

`pnpm setup` adds the pnpm global bin directory to the user PATH. Restart the terminal app afterward. A new tab keeps the PATH from when the app started.

## Temporary host trial

Use a temporary Git repository. Do not point the trial at a repository you care about.

```powershell
$dir = Join-Path $env:TEMP ("ags-trial-" + [guid]::NewGuid().ToString("n"))
git init $dir
ags host install --route $dir --yes
ags host unregister --route $dir --yes
Remove-Item -Recurse -Force $dir
```

## Host settings

Selections, usage reporting, Git, and checks live in the host's `.agents/ags.yaml`. `hosts.yaml` stores only the host id, name, and path.

```yaml
adapters:
  claude: skip
git:
  mainBranch: main
checks:
  type: typecheck
  lint: lint
  prettier: prettier:check
```

`claude` is `skip`, `block`, or `override`. `skip` is the default and leaves `CLAUDE.md` untouched. `block` inserts one managed block. `override` replaces the file with the AGS pointer after a quarantine backup. `--claude` and `--no-claude` remain as deprecated aliases.

Check values are package script names. AGS detects `pnpm`, `yarn`, or `npm` from `packageManager`, otherwise from exactly one supported lockfile, and runs `<manager>.cmd run <script>`. It refuses an obvious Prettier write script. The installer shows the manager, script name, and script body before confirmation. A core update does not replace existing values. An old full command is migrated only when it is exactly that manager running one existing script.

`ui-library-css` is the CSS entry point when `package.json` depends on `@platform/ui-library`. A Markdown link from one canonical skill to another forces that skill into `includes`. `ui-library-css` includes `css-authoring-conventions` and `css-theme-tokens`, and authoring includes `css-cleanup`. Those companions stay canonical. A skill that truly cannot live in canonical AGS can be installed with `--route` as one registered host-local exception. AGS prints a warning and records it.

## Commands

| Command | Purpose |
| --- | --- |
| `ags doctor` | Check the canonical tree and, with a host route, that host |
| `ags host install\|update\|list\|sync\|repair\|unregister` | Host entry, selections, drift, and repair |
| `ags skills list\|install\|reconcile` | Canonical skills and host-copy reconciliation |
| `ags reporting on\|off\|status` | Per-host usage reporting |
| `ags report usage\|changes` | Append usage or canonical-change records |
| `ags check` | Run the host's configured type, lint, and Prettier checks |
| `ags snapshot` | Zip one host's effective guidance, including selected companion skills |
| `ags snapshot canonical` | Zip this checkout to `.tmp/snapshots/ags-canonical.zip`, including tracked `pnpm-lock.yaml` when it is not ignored. Git-ignored paths stay out even if force-tracked. `--include-standard-excluded` relaxes only the sensitive-path list. `--only base,rules` keeps root files and named folders. `--except skills` drops named paths |
| `ags diff commits\|range\|staged\|changes\|untracked\|current` | Write a patch under the host `.tmp/`. Diff counts follow first-parent history. Last-N and current-N include the root commit by diffing from Git's empty tree |

## Layout

Canonical `.tmp` is for AGS maintenance and for files the AGS scripts stage. A host plan or other host artifact goes under that host's own `/.tmp`.

```text
AGENTS.md  README.md  package.json  pnpm-lock.yaml  catalog.yaml  hosts.yaml
rules/  skills/  scripts/  templates/  reports/
```

Host:

```text
AGENTS.md
CLAUDE.md              optional; skip, block, or override
.agents/AGS.md
.agents/ags.yaml
.agents/local/
.tmp/
```
