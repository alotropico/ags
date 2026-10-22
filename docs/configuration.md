# Configuration

[Index](README.md) · [Catalog](catalog.md) · [Host contract](host-contract.md)

`.agents/ags.yaml` stores selections, settings, reporting, and optional integration preferences. Install and update add the settings selected skills need, with defaults and comments. Existing values, comments, and order stay.

Commit the file with the project. Keep secrets out of it.

## Change a selection

From the project root:

```powershell
ags host update --enable "code-idioms,state-topology" --dry-run
```

Review the plan, then rerun without `--dry-run`. `--enable` and `--disable` accept comma-separated rule or skill ids. Required companions remain while their parent is selected. They stay out of explicit `skills.enabled`.

How classes and companions behave: [Catalog](catalog.md). Picker keys and non-interactive `--decide`: [Install a host](install-host.md).

## Set project values

For declared settings, repeat `--set`:

```powershell
ags host update --set git.mainBranch=main --set checks.type=typecheck --dry-run
```

Use the project's actual branch and `package.json` script names. After reviewing, rerun without `--dry-run`.

A typical file:

```yaml
format: 2
host: my-app
agsVersion: 6.0.1
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

`agsVersion` in the example is illustrative. Lifecycle commands maintain the real value.

`--set` accepts catalog-declared settings and the optional integration booleans `integrations.officialSkills`, `integrations.fallow`, `integrations.astGrep`, `integrations.mantineForm`, `integrations.tanstackSkills`, and `integrations.claudeSkills`. The installation menu records per-integration choices using these preferences. Edit other reserved preferences, including `reporting`, by hand.

Strings are stored verbatim. `key=` sets an empty string. Booleans are `true` or `false`. A missing required value prompts, or exits 3 when there is no TTY.

New setting keys can use detected values: `git.mainBranch` from an unambiguous local Git default, and check settings from one recognized, non-writing script per category. The preview shows these values. Existing settings, including intentionally empty check settings, and explicit `--set` values are preserved. Detection never fetches a remote or runs the scripts.

Updates change an existing value only for `agsVersion` or an explicit `--set`. A same-major update keeps format 2, settings, comments, selections, the reporting preference, local notes, ignore and promotion records, and project-owned files.

## Project-owned guidance

| Guidance | Put it here |
| --- | --- |
| Project facts and conventions | `AGENTS.md`, outside the generated AGS block. |
| Project rules | `.agents/rules/<project-id>.md`, with a non-AGS id and a `description`. |
| Project skills | `.agents/skills/<project-id>/`, with a non-AGS id. |
| Notes for an installed skill | `.agents/local/<skill-id>.md`. The agent reads this before that skill. |
| Other local guidance | `.agents/local/`, linked from a rule, skill, or project instructions. |

Project facts and formats override AGS defaults. AGS safety constraints stay in force. Keep lasting instructions outside the generated block. Update regenerates that block.

You may edit installed AGS material. The next update reviews those changes and offers the applicable `promote`, `restore`, `ignore`, or `disable` decision. Promotion carries reusable guidance back into AGS. For a project-only exception, prefer a local note.

A project rule or skill that uses a reserved AGS id stops install and update. The message prints a rename to `<host-id>-<id>`.

## Reserved keys

`format`, `host`, `agsVersion`, `reporting`, `skills`, `rules`, `integrations`, `local`.

`local` is free-form. Every other namespace has to be catalog-declared. Unknown keys fail. `reporting: false` disables recording and does not write usage events.

## How checks run

`ags check` selects the package manager from `packageManager` or from a single lockfile, then runs `<manager> run <script>`. Omit `--only` to run every configured check. Pass a subset with `--only "type,lint,prettier"`.

A missing or non-executable manager fails explicitly. A child process killed by a signal fails explicitly. Helpers need Node. Windows batch backends reject `NUL` and newline arguments. Remove `NUL`, or use a native executable when the argument contains a newline.

The configured Prettier script checks formatting. It must not write files.

── ◈ ──

[Index](README.md)
