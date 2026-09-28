# Working on AGS

AGS is the source repository for reusable agent guidance: rules, skills, settings definitions and small deterministic helpers. The `ags` command installs a copy of the selected material into each host repository. Hosts hold installed copies of released material; nothing reads this repository at runtime.

## AGS is not a host

- This repository has no `.agents/`, no `.cursor/skills/`, no `.claude/skills/`, and no AGS block in this file.
- `skills/` is not a harness discovery path, so the material here stays inactive while you work on it.
- `ags host prepare` and `ags host install` refuse this root.

## Layout

- `AGENTS.md`: this guide. `README.md`: human overview and command reference.
- `CHANGELOG.md`: Unreleased notes and released versions. `LEDGER.md`: concept ledger. `BACKLOG.md`: deferred work.
- `docs/`: design records (`v2-spec.md`, `v2-meta-inventory.md`, `v3-proto-rules.md`).
- `package.json`: version, bin `ags`, engines, dependencies. `catalog.yaml`: rules, skills, settings.
- `rules/<id>.md`: strong and soft rules. `skills/<id>/`: `SKILL.md`, optional `scripts/`, `references/`, `assets/`.
- `templates/`: `agents-block.md`, `ags.yaml`. `scripts/`: `ags.mjs` and `lib/`. `test/`: `node --test` suites.
- Machine-local and gitignored: `hosts.yaml` (registry), `reports/runs/` (run log), `.tmp/` (`.tmp/ags/locks/` holds the AGS locks).

## Catalog

- `catalog.yaml` is the only list of AGS ids. Material outside the catalog is never installed.
- Ids match `[a-z0-9]+(-[a-z0-9]+)*`, at most 64 characters, unique across rules and skills. Paths derive from ids.
- Install classes: `always`, `detected` (requires `when`), `opt-in`. `includes` lists companion skills; `params` lists the setting keys a skill reads.
- Skill frontmatter: `name` equals the id; `description` at most 1024 characters. Soft rules: one `description` line of at most 160 characters.
- Strong rules have no frontmatter and at most 5 non-empty lines. The rendered AGS block stays within 40 lines.

## Writing material

- Choose the tier: needed in every task is a strong rule; tied to what is being touched is a soft rule; tied to what is being done is a skill; checkable mechanically belongs in code. The same content never lives in two tiers.
- No template syntax (`{{…}}`) or conditionals in material. Write empty-value behavior as prose.
- Every skill with `params` has a `## Host settings` section in the wording of spec Appendix D.
- A skill links only to its `includes` companions. It may name another skill conditionally ("use the `check` skill when it is installed").
- Skill scripts are Node 20+ ESM, standard library only, no network, no `ags`.

## Tests

- `pnpm test` runs every suite. Every change ends with it passing.
- Tests build scratch AGS and host repositories under the OS temporary folder, never in this repository or a real host.
- Fault points are injected with `AGS_TEST_FAULT=<command>:<point>` (append `:crash` to end the process at once).

## Releases

1. Commit normal work, including promotions from hosts.
2. Add notes with `ags version note "<text>"`; review with `ags version`.
3. `ags version bump patch|minor|major` shows the notes and next version, then asks for confirmation.
4. It runs the tests, moves the notes under the version, commits `Release: X.Y.Z` and tags `vX.Y.Z`. Only the bump commits in AGS.
5. Update hosts one at a time with `ags host update`.

## Ledger

Every rewrite, removal or migration of guidance adds rows to `LEDGER.md` in the same commit. Each row has exactly one disposition: `AGS`, `Host`, `Backlog`, `Removed` or `Migrate later`. `Removed` rows carry a rationale.

## .tmp conventions

- Layout: `plans/`, `records/`, `scratch/`, `archive/YYYY-MM/`, and `ags/`, reserved for the `ags` command.
- New files are named `YYYY-MM-DD-kebab-slug.md`; existing files are not renamed.
- No dot-folders and no instruction entry files (`AGENTS.md`, `CLAUDE.md` and similar) under `.tmp/`.
- `.tmp/` is gitignored, so built-in search and indexing may skip it. Read `.tmp/` files by path. Search with `rg --no-ignore` on an explicit `.tmp/` path, or `rg --hidden --no-ignore` from the root.

## Commands

- Use `ags` for deterministic operations. Never invoke files under `scripts/` by path.
- The global `ags` runs this working tree through shims. After moving this directory, rerun `node scripts/install-global.mjs`.

## Plan of record

`docs/v2-spec.md` is authoritative until Run 2 ends; after that, `README.md`, this file and the code are. Deferred work lives in `BACKLOG.md`.
