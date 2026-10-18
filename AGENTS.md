# Working on AGS

AGS is the source repository for reusable agent guidance: rules, skills, settings definitions and small deterministic helpers. The `ags` command installs a copy of the selected material into each host repository. Hosts hold installed copies of released material; nothing reads this repository at runtime.

## AGS is not a host

- This repository has no `.agents/`, no `.cursor/skills/`, no `.claude/skills/`, and no AGS block in this file.
- `skills/` is not a harness discovery path, so the material here stays inactive while you work on it.
- `ags host prepare` and `ags host install` refuse this root.

## Layout

- `AGENTS.md`: this guide. `README.md`: what AGS is, which projects it is written for, and the short install path. `docs/README.md`: index of the usage reference.
- `CHANGELOG.md`: unreleased notes and released versions.
- `package.json`: version, bin `ags`, engines, dependencies. `catalog.yaml`: rules, skills, settings.
- `docs/`: usage reference. `rules/<id>.md`: strong and soft rules. `skills/<id>/`: `SKILL.md`, optional `scripts/`, `references/`, `assets/`.
- `templates/`: `agents-block.md`, `ags.yaml`. `scripts/`: `ags.mjs`, `install-global.mjs` and `lib/`. `test/`: `node --test` suites.
- Machine-local and gitignored: `LEDGER.md` (concept ledger), `hosts.yaml` (registry), `hosts/<id>.json` (current observed state), `reports/` (run logs and collected/compact usage), `.tmp/` (`.tmp/ags/locks/` holds the AGS locks).

## Catalog

- `catalog.yaml` is the only list of AGS ids. Material outside the catalog is never installed.
- Ids match `[a-z0-9]+(-[a-z0-9]+)*`, at most 64 characters, unique across rules and skills. Paths derive from ids.
- Install classes: `always`, `detected` (requires `when`), `opt-in`. `includes` lists companion skills on skills or soft rules; strong rules cannot include companions. Selection expands one skill closure without adding companions to explicit enabled lists; an explicitly disabled required child is an error. `params` lists the setting keys a skill reads.
- Skill frontmatter: `name` equals the id; `description` at most 1024 characters. Soft rules: one `description` line of at most 160 characters.
- Strong rules have no frontmatter and at most 5 non-empty lines. The rendered AGS block stays within 40 lines.

## Writing material

- Choose the tier: needed in every task is a strong rule; tied to what is being touched is a soft rule; tied to what is being done is a skill; checkable mechanically belongs in code. The same content never lives in two tiers.
- No template syntax (`{{…}}`) or conditionals in material. Write empty-value behavior as prose.
- Every skill with `params` has a `## Host settings` section.
- A skill links only to its `includes` companions. It may name another skill conditionally ("use the `check` skill when it is installed").
- A soft rule may link to a directly declared companion's `SKILL.md`, never deep references or undeclared skills. Domain references load only for the applicable task; installing a companion does not activate all its content.
- Borrowed material has pinned `sources.yaml` metadata and required notices beside the skill. Whole-skill copying preserves these files; entry instructions do not load provenance bookkeeping.
- Skill scripts are Node 20+ ESM, standard library only, no network, no `ags`.

## Tests

- For this repository only, do not run tests or create scratch repositories for testing small or medium-small tasks, such as adding CLI help descriptions or making limited documentation edits. Review the diff and use lightweight direct checks when useful; run tests only if the user explicitly requests them.
- For larger tasks, `pnpm test` runs every suite and must pass before finishing. Releases still run the full suite.
- Tests build scratch AGS and host repositories under the OS temporary folder, never in this repository or a real host.
- Fault points are injected with `AGS_TEST_FAULT=<command>:<point>` (append `:crash` to end the process at once).

## Releases

1. Commit normal work, including promotions from hosts.
2. Add notes with `ags version note "<text>"`; review with `ags version`.
3. `ags version bump patch|minor|major` shows the notes and next version, then asks for confirmation.
4. It runs the tests, moves the notes under the version, commits `Release: X.Y.Z` and tags `vX.Y.Z`. Only the bump commits in AGS.
5. Update hosts one at a time with `ags host update`.

## Ledger

`LEDGER.md` belongs to an AGS source checkout. It is gitignored. `ags doctor` creates it when the file is missing and never overwrites an existing file, including a malformed one. Installing AGS into a host does not create this file.

Record a row when guidance is rewritten, removed, or migrated. Each row has exactly one disposition: `AGS`, `Host`, `Backlog`, `Removed`, or `Migrate later`. `Removed` and `Migrate later` rows carry a rationale. A `Backlog` row describes the deferred item itself.

```markdown
| # | Concept | Source | Disposition | Destination | Rationale |
| --- | --- | --- | --- | --- | --- |
```

## .tmp conventions

- Layout: `plans/`, `records/`, `scratch/`, `archive/YYYY-MM/`, and `ags/`, reserved for the `ags` command.
- New files are named `YYYY-MM-DD-kebab-slug.md`; existing files are not renamed.
- The macOS trial writes generated logs/JSON/text under `.tmp/records/YYYY-MM-DD-v5-macos-trial-<suffix>/`; its fixed artifact names are an exception to the note naming rule.
- Cleanup manifests use `YYYY-MM-DD-sweep.json` under `.tmp/records/`.
- No dot-folders and no instruction entry files (`AGENTS.md`, `CLAUDE.md` and similar) under `.tmp/`.
- `.tmp/` is gitignored, so built-in search and indexing may skip it. Read `.tmp/` files by path. Search with `rg --no-ignore` on an explicit `.tmp/` path, or `rg --hidden --no-ignore` from the root.

## Commands

- Use `ags` for deterministic operations. Never invoke files under `scripts/` by path, except the installer below. Repository verification also permits `pnpm trial:macos [--out <new-directory>]`; its runner stays outside the installed CLI.
- The global `ags` runs this working tree through shims. After moving this directory, rerun `node scripts/install-global.mjs --replace` from its new location to replace the old target.
