# AGS V2 Specification

- Status: revision 4, final, for implementation
- Date: 2026-09-27
- Supersedes: `.tmp/references/ags-minimal-v1-spec.md` (V1) and the earlier revisions of this spec. Revision 2 integrated the Claude and Sol agreement and the user's decisions of 2026-09-27. Revision 3 resolved Sol's second review (section 29, items 28 to 38), and Sol accepted its pushback. Revision 4 is final: it adds the user's final decisions (items 39 to 47). After its acceptance it took four local corrections: the host lock is the only write under `.tmp/` before the exclude block, with its crash case (16.1); a lock is stale only when its process has ended (16.1, item 48); fault points sit at file boundaries (27); and an item an interrupted run wrote in part is not a collision (16.4, 16.6). The superseded working files, including the first draft (`2026-09-27-ags-v2-sol-spec.md`), the agreement and revisions 2 and 3 (`2026-09-27-ags-v2-spec-r2.md`, `2026-09-27-ags-v2-spec-r3.md`), are in `.tmp/archive/2026-09/`. The reply to Sol's second review, with its outcome, is `.tmp/plans/2026-09-27-ags-v2-reply-to-sol-2.md`.
- Inputs: `.tmp/2026-09-26-meta-guidance-not-in-ags.md` (a Run 2 input; Appendix H lists all of them) and `.tmp/references/ags-quality-proto-rules.md` (V3). `.tmp/ags-v2-direction-handoff.md` set the direction; this spec supersedes it. Because `.tmp/` is gitignored, Run 1 starts by tracking this file, the backlog and both inputs in AGS (28.1, step 1).
- Section 29 records what is decided. Section 30 lists the defaults revision 2 introduced, all accepted. Section 31 points to the live backlog, `.tmp/plans/2026-09-27-ags-backlog.md`.

## 1. Purpose

AGS keeps reusable agent guidance in one source repository: rules, skills, settings definitions and small deterministic helpers. It installs a copy of the selected material into each host repository. Agents in a host read only files inside that host.

AGS records which version each host has, detects changes made in hosts, and moves changes in both directions under the user's control.

V2 replaces the V1 model, where hosts read one live canonical tree through an absolute path.

## 2. Normative language

- **must / must not**: required for V2 conformance.
- **should / should not**: the default unless a documented reason applies.
- **may**: optional.

## 3. Principles

1. **AGS is the source.** Each host holds a complete, self-contained copy of its resolved selection, not of the whole catalog. It is installed from tagged releases and discovered natively by harnesses.
2. **Per-host generation is limited.** AGS generates per-host content only in the `AGENTS.md` block and in `.agents/ags.yaml`. Released managed content is identical across hosts on the same version. Host-owned material and recorded divergence may differ.
3. **Host guidance is first-class.** It has a defined structure (11.6), deterministic discovery, and a precedence rule: host facts and formats override AGS defaults; AGS safety constraints do not yield.
4. **Hosts may edit AGS material.** The user reviews each edit on the next AGS run. Promotion changes AGS only, never the host file.
5. **Reversible and re-runnable, not transactional.** Git and backups undo operations. Reruns are idempotent. `agsVersion` marks a completed install. Decisions are bound to a plan, and locks prevent concurrent runs. There is no journal and no automatic rollback. Every interruption point has a defined rerun result, derived from git state and backup manifests (16.1, 15.4).
6. **Prepare is conservative.** It shows its plan, requires confirmation, and is reversible.
7. **Nothing is lost silently.** Host changes to managed material are decided by the user. Overwritten or deleted host files are backed up. Every content rewrite or migration is tracked in the concept ledger (section 26).
8. **Minimal first, for capabilities.** `2.0.0` is the minimal lifecycle. New capabilities are added when Watcher usage calls for them. Existing guidance is not held back: Run 2 consolidates all of its variants into canonical AGS versions (28.2). Safety mechanics are never deferred on the grounds that there is only one user.
9. **Deterministic mechanics, harness reasoning.** AGS supplies knowledge, conventions and cheap deterministic mechanics, in `ags` and in skill-local scripts. The harness remains the agent. A skill never replaces a deterministic script: where one exists, the skill runs it.
10. **Always-loaded guidance stays thin.** Depth arrives on demand through soft rules and skills.

## 4. Non-goals

V2 does not include the following. The backlog (section 31) records each one with its notes.

- CLI support beyond the current Windows environment;
- the tools catalog, and installing, updating or configuring machine-wide tools such as Graphify and Fallow;
- harness adapters (`.cursor/skills`, `.claude/skills`) or Claude Code skill discovery;
- installing unreleased AGS content into a host (`--worktree`);
- git relationships between AGS and hosts: subtree, submodule, nested repositories, or external git directories;
- rendering setting values into copied files;
- a continuation journal, a resume engine, or automatic rollback;
- updates across major versions; a major release must bring its own configuration and host migration path (15.1);
- more than one kind of host, such as hosts whose guidance must stay untracked;
- host lifecycle commands in linked worktrees, submodules, or repositories with a separate git directory (22.1);
- renaming host items automatically; on a collision, AGS stops and prints the rename (16.6);
- three-way promotion;
- third-party skill import;
- collecting usage records into AGS;
- host updates started by `version bump`, and `--all` mutation flows;
- `ags snapshot source`;
- prescribing agent hierarchies (planner, reviewer, verifier agents);
- proto-rules, planned for V3;
- separating personal and team material in shared repositories;
- D2's installation decisions.

## 5. Changes from V1

| Area | V1 | V2 |
| --- | --- | --- |
| Runtime | Hosts read canonical AGS by absolute path | Hosts hold copies; AGS is not needed at runtime |
| Skill discovery | Listed in `.agents/AGS.md` | Native: `.agents/skills/<id>/SKILL.md` |
| Host entry | Block in `AGENTS.md` pointing to `.agents/AGS.md` | Block holds the strong rules and the rule index; `.agents/AGS.md` removed |
| Core rules | `rules/core.md`, 26 lines, read through a pointer | Five strong lines inlined in the block |
| Optional rules | Listed in `.agents/AGS.md` | Soft rules copied to `.agents/rules/` and indexed in the block, with host rules |
| Host guidance | Free-form `.agents/local/` | Defined structure: host facts, host rules, host skills, host notes (11.6) |
| Settings | `git.mainBranch` and `checks.*`, set with dedicated flags | Declared in the catalog, set with `--set`; skills read `.agents/ags.yaml` |
| Selection | `default`, `when`, `enabled` and `disabled` | `install: always \| detected \| opt-in`, `enabled` and `disabled`, companions |
| Versions | None | Semver release tags, `CHANGELOG.md`, host stamp `agsVersion` |
| Host edits | Forbidden; canonical edits reported | Allowed and reviewed on AGS runs; promotion writes AGS only |
| Operation safety | Quarantine and staged repair | Locks, plans with hashes and a digest, bound decisions, revalidation, backups, idempotent reruns |
| Change reports | `ags report changes`, level 9 | Removed; host-change review and changelog notes replace them |
| Usage reports | Written into AGS `reports/` | Written in the host under `.tmp/ags/reports/`; collection deferred |
| Host-location exceptions | `requires-host-location` projections | Removed; every skill is host-located |
| Existing agent setup | Quarantine during repair | Prepare: a shown plan, confirmation, then a backup |
| Diff helper | `ags diff` | `write-commit-diff` skill script; `ags diff` is an alias |
| Checks | `ags check` | `check` skill script; `ags check` is an alias |
| Snapshots | Host snapshot and `snapshot canonical` | Host snapshot only |
| Command history | None | Run log in AGS `reports/runs/` |

## 6. Core invariants

1. **One source.** Shared material is authored only in AGS. Hosts receive copies.
2. **No runtime dependency.** Installed material works with the AGS repository and the `ags` command absent. Anything that calls `ags` from a host, such as usage recording or an alias, is optional and phrased "if the `ags` command is available".
3. **Released content is identical.** Every managed file equals its AGS source at the host's installed version, after line-ending normalization, unless the host changed it. AGS generates per-host content only in the AGS block and in `.agents/ags.yaml`.
4. **Releases are tags.** Hosts install and update only from release tags (15.2).
5. **No silent overwrite.** AGS never overwrites, deletes or keeps a host change to managed material without a user decision. There are two exceptions: removal after an opt-out, which the user asked for, and the replacement of a promoted file once a release contains the promotion (16.9). Every host file AGS overwrites or deletes is backed up first. Every write to managed files, the AGS block, `ags.yaml` or the registry appears in a plan the user confirms.
6. **Commits and pushes.** AGS never commits in a host. In AGS, only `ags version bump` commits. AGS never pushes anywhere.
7. **Host-owned files.** AGS never modifies:
   - `AGENTS.md` outside the block;
   - host rules and host skills, meaning items in `.agents/` whose id is not an AGS id;
   - `.agents/local/**`;
   - any other host file outside the managed set, except for prepare's confirmed moves (16.3) and the exclude block (16.12).

   `.agents/ags.yaml` is host-owned. AGS merges schema changes into it, writes `agsVersion`, and applies the values the user passes with `--set`, `--enable` and `--disable`.
8. **AGS does not apply to itself.** The AGS repository contains no host installation. Install and prepare refuse the AGS root.
9. **Selection.** Explicit selection beats detection. A companion cannot be opted out while a selected parent includes it.
10. **One kind of host.** A host is a repository's main worktree, with its git directory at `.git`. It commits `AGENTS.md` and `.agents/` like any other source; AGS never commits them itself. While git ignores `AGENTS.md`, `.agents/` or any file under it, the host is unsupported: `doctor` reports an error, and install and update refuse.

## 7. Terminology

| Term | Meaning |
| --- | --- |
| AGS | The source repository at the AGS root, currently `C:/Cosmos/projects/ags` |
| Host | A git repository where AGS is installed |
| Registry | `hosts.yaml` in AGS; machine-local and gitignored |
| AGS id | An id in the catalog at a given version; reserved in hosts |
| Managed file | A host file installed from selected AGS material |
| AGS block | The generated region of the host `AGENTS.md`, between AGS markers |
| Exclude block | The generated region of the host's git exclude file, between AGS markers |
| Host-owned file | Any host file AGS never modifies (invariant 7) |
| Host rule, host skill | A rule file or skill folder in `.agents/` whose id is not an AGS id |
| Host note | `.agents/local/<skill-id>.md`, which refines one skill for the host |
| Installed version (I) | `agsVersion` in `.agents/ags.yaml` |
| Target version (T) | The version an operation installs; the latest release by default |
| Base content (B) | A managed path's content at I, read from tag `vI` |
| Host content (H) | The path's current content in the host |
| Target content (Tc) | The path's content at T, or absent |
| Source content (S) | The path's content in the AGS working tree |
| Host change | A managed file or AGS block whose host content differs from what AGS installed at I |
| Plan | The complete list of what an operation will write, with hashes |
| Plan digest | The hash that identifies one exact plan (16.1) |
| Decision | The user's choice for one plan item, keyed by path |
| Promotion | Copying a host change into the AGS working tree, the choice "update AGS" |
| Setup | Agent guidance present in a host before its first install |
| Terminal | Both stdin and stdout are TTYs. Agent shells are not: in Cursor on 2026-09-27, stdin, stdout and stderr all reported no TTY |
| Concept ledger | `LEDGER.md` in AGS: where each concept of rewritten or migrated material went |
| Run log | One JSON line per `ags` invocation, in AGS `reports/runs/` |
| AGS run | Any `ags` command that inspects or changes a host |

## 8. Harness support

| Harness | Reads `AGENTS.md` | Discovers `.agents/skills` | Notes |
| --- | --- | --- | --- |
| Cursor | Yes, root and subfolders | Yes (verified) | Same-name skills from several locations are shown once; observed, not guaranteed |
| Codex | Yes, from the repository root down to the working directory | Yes, from the working directory up to the repository root | Same-name skills both appear; follows symlinks |
| Claude Code | Only when no `CLAUDE.md` is on the path (2.1.277+), unless the per-user setting `claude-md-and-agents-md` is on | No (`.claude/skills` only) | Partial support in V2: the strong rules and the rule index, no skills |

- The design must not require harness-specific files (`.cursor/`, `.claude/`, `.codex/`).
- Before a host's `CLAUDE.md` is removed, the installed Claude Code version is probed (Appendix G).

## 9. AGS source repository

### 9.1 Layout

```text
AGENTS.md            guide for agents working on AGS itself
README.md            human overview and command reference
CHANGELOG.md         Unreleased notes and released versions
LEDGER.md            concept ledger (section 26)
BACKLOG.md           deferred work (section 31)
docs/                design records: v2-spec.md (this file), v2-meta-inventory.md, v3-proto-rules.md
package.json         version, bin `ags`, engines, dependencies
catalog.yaml         rules, skills, settings
rules/<id>.md        strong and soft rules
skills/<id>/         skills: SKILL.md, optional scripts/, references/, assets/
templates/           agents-block.md, ags.yaml
scripts/             ags.mjs and lib/
test/                node --test suites and fixtures
hosts.yaml           registry; machine-local, gitignored
reports/runs/        run log; gitignored
.tmp/                local development area, gitignored (section 17); .tmp/ags/locks/ holds the AGS locks
```

### 9.2 Responsibilities

- `package.json` `version` equals the latest release after every bump.
- `CHANGELOG.md` always starts with a `## Unreleased` section.
- `catalog.yaml` is the only list of AGS ids. Material not in the catalog is never installed.
- `templates/agents-block.md` defines the block layout (Appendix A). `templates/ags.yaml` is the starting `ags.yaml`.
- The root `AGENTS.md` tells agents how to work on AGS: the source layout, catalog rules, tests, the release flow, the ledger, the `.tmp` conventions, and the fact that AGS does not apply to itself. It contains no host guidance and no AGS block.
- `docs/v2-spec.md` is the plan of record until Run 2 ends. After that, `README.md`, the root `AGENTS.md` and the code are authoritative, and the spec is kept as a record.

### 9.3 AGS is not a host

`skills/` is not a harness discovery path, so AGS material stays inactive while agents work on AGS. The AGS repository must not contain `.agents/`, `.cursor/skills/`, `.claude/skills/`, or an AGS block in `AGENTS.md`.

## 10. Host layout and ownership

### 10.1 Layout

```text
AGENTS.md                    host-owned; the AGS block sits at the top
.agents/
  ags.yaml                   host settings and selection
  rules/<id>.md              AGS soft rules (AGS ids) and host rules (other ids)
  skills/<id>/               AGS skills (AGS ids) and host skills (other ids)
  local/                     host notes and other host-owned guidance
.tmp/                        local only (section 17)
  ags/backups/<stamp>/       backups taken by prepare, install and update
  ags/locks/                 the host lock
  ags/reports/usage.jsonl    usage records
  ags/snapshots/             host snapshots
git exclude file             the exclude block, only when `.tmp/` is not otherwise ignored
```

### 10.2 Ownership classes

| Class | Paths | What AGS may do |
| --- | --- | --- |
| Managed | `.agents/rules/<AGS id>.md`, `.agents/skills/<AGS id>/**` | Install, update, delete; host changes decided by the user |
| Generated | The AGS block in `AGENTS.md` | Create and regenerate; edits decided by the user |
| Host settings | `.agents/ags.yaml` | Schema merge, `agsVersion`, values passed through flags |
| Host-owned | Everything else, including `AGENTS.md` outside the block, host rules, host skills and `.agents/local/**` | Nothing, except prepare's confirmed moves |
| Local-only | `.tmp/**` and the exclude block | Backups, locks, usage records, snapshots, scratch output, the exclude entry |

### 10.3 Managed set

For a host at version V, the managed set is the files of the material selected for that host, taken from tag `vV`:

- skill `<id>`: every file of `skills/<id>/`, at `.agents/skills/<id>/`;
- soft rule `<id>`: `rules/<id>.md`, at `.agents/rules/<id>.md`.

Strong rules are not files in hosts. They are inlined into the AGS block.

There is no lockfile. For change detection, AGS treats every skill folder or rule file in the host whose id is an AGS id at I as installed from I, whatever the current selection says. Extra files in such a folder are host additions.

AGS ids are reserved in hosts. Host rules and host skills must not use an id that exists in the catalog at I or at T:

- install refuses while one does (16.4);
- update stops on a collision with an id that is new at T (16.6);
- `doctor` reports AGS-id items that are not selected, because the next update plans their removal.

Material restored from a backup follows the same rule: an item whose id is an AGS id is never restored under that id. It becomes one of:

- a host note, `.agents/local/<id>.md`, holding only what differs from the AGS item, when it means the same thing;
- a host rule or host skill renamed to a non-AGS id, by default `<host id>-<id>`, with its frontmatter `name` changed, when it means something else;
- a file in `.agents/local/`, linked from host guidance (11.6).

The ledger row names the choice. In Run 2, consolidation may move such content into the AGS item itself (28.2).

Host rules and host skills otherwise use natural ids, with no required prefix. A collision is handled when it happens: the command stops before writing anything and prints an exact rename that adds the host id as a prefix, such as `watcher-state-topology` (16.6).

### 10.4 Hashes, line endings and binaries

- Text comparisons normalize CRLF to LF. AGS writes text as git stores it, which is LF.
- A file that is not valid UTF-8, or that contains a NUL byte, is binary and compares byte for byte.
- Hashes are SHA-256 in hex, of the LF-normalized text or of the bytes for binaries. Records and manifests store the full hash. Displays, the plan digest and the block marker use the first 12 characters.

## 11. Guidance model

### 11.1 Tiers

| Tier | When loaded | Where | Guarantee |
| --- | --- | --- | --- |
| Hard | Not loaded; enforced | `ags` checks and refusals | Enforced by code |
| Strong rules | Always | Inline in the AGS block | Loaded by any harness that reads `AGENTS.md` |
| Soft rules | When their condition applies | `.agents/rules/<id>.md`, indexed in the block | Best effort: the agent must notice the condition |
| Skills | When the harness matches a task to the skill's description | `.agents/skills/<id>/SKILL.md` | Harness-native, best effort |

Examples of hard enforcement:

- install and update refusals;
- collision detection;
- blocking the opt-out of a companion;
- settings validation;
- plan confirmation and decisions bound to the plan;
- backups before destructive writes;
- locks;
- `doctor` checks;
- release gates.

### 11.2 Strong rules

- Only constraints needed in every task.
- A strong rule file has no frontmatter and at most 5 non-empty lines. Its content is inlined verbatim.
- The whole AGS block should stay at or under 40 lines. `doctor` warns above that.
- `core` is the only strong rule in `2.0.0`, and it cannot be disabled. It carries the precedence line (Appendix A).
- The block does not list skills; harnesses discover them.

### 11.3 Soft rules

- A soft rule is a constraint or convention tied to what is being touched: files, areas or artifacts. Examples: "editing SCSS files", "creating files under `.tmp/`".
- Every soft rule file, whether AGS or host, starts with frontmatter holding one key, `description`. It is a single line of at most 160 characters that states the condition. The block index shows it.
- Agents can miss a soft rule. Anything that must always hold is a strong rule or is enforced in code.

### 11.4 Skills

- A skill is a procedure or body of task knowledge tied to what is being done. Examples: "commit", "clean up CSS modules", "plan work".
- `SKILL.md` frontmatter must contain:
  - `name`, equal to the catalog id: lowercase letters, digits and hyphens, at most 64 characters;
  - `description`: at most 1024 characters, stating what the skill does and when to use it.
- AGS adds no AGS-specific frontmatter.
- Skills may contain `scripts/`, `references/` and `assets/`.
- A skill may link to another skill only if that skill is one of its `includes` companions. Links must resolve in the host layout. A skill may name another skill conditionally, for example "use the `check` skill when it is installed".
- Skill text states the outcome and leaves delegation to the harness.

### 11.5 Choosing a tier

| The guidance is… | Tier |
| --- | --- |
| Needed in every task | Strong rule |
| Tied to what is being touched | Soft rule |
| Tied to what is being done | Skill |
| Checkable mechanically | Hard (code) |

The same content must not live in two tiers.

### 11.6 Host guidance

A host's own guidance has a fixed structure:

| Kind | Where | How agents find it |
| --- | --- | --- |
| Host facts | `AGENTS.md` outside the block: profile, commands, known pitfalls. Short, and relevant to every task | Always loaded |
| Host rules | `.agents/rules/<id>.md` with a non-AGS id and `description` frontmatter | The block index, after the AGS soft rules |
| Host skills | `.agents/skills/<id>/` with a non-AGS id | Native skill discovery |
| Host notes | `.agents/local/<skill-id>.md` | The core line that says to read it before using that skill |
| Other host files | Anywhere in `.agents/local/` | A link from one of the places above; `doctor` warns about unlinked files |

- **Precedence:** host facts and formats override AGS defaults. AGS safety constraints do not yield. The core carries this as one line.
- A host note counts as linked when its file name, without `.md`, is the id of a skill installed in the host, AGS or host. `doctor` warns about a host note whose skill is not installed, because the core line then points nowhere.
- Any other file in `.agents/local/` counts as linked when a Markdown link or a backticked path in host facts, a host rule, a host skill or a host note resolves to it.
- Differences meant to last belong in host guidance, not in edits to managed files. Host edits to managed files are the channel for improving AGS itself (16.8).

## 12. Selection

### 12.1 Install classes

Catalog field `install`:

| Value | Meaning |
| --- | --- |
| `always` | Installed in every host unless disabled |
| `detected` | Installed when its `when` condition matches the host; re-evaluated at every update |
| `opt-in` | Installed only when enabled |

### 12.2 Conditions

The V1 condition grammar is kept unchanged, with the predicates `package`, `lockFile` and `repoName`:

```yaml
when:
  any:
    - package: "@platform/ui-library"
    - lockFile: pnpm-lock.yaml
```

The V1 matching rules carry over: exact package names in the dependency sections of `package.json`, exact lock-file names, and exact repository names only for approved exceptions. A missing or invalid `package.json` means "not detected".

`when` is allowed only with `install: detected`, and is required there.

### 12.3 Host selection

The selection lives in `.agents/ags.yaml`:

- `skills.enabled` and `rules.enabled` hold opt-ins. They also force-install a `detected` item whose condition does not match.
- `skills.disabled` and `rules.disabled` hold opt-outs of `always` or `detected` items.

These are errors:

- an id listed in both `enabled` and `disabled`;
- an unknown id;
- `core` listed in `disabled`.

The selection is set at install (`--enable`, `--disable`, or a terminal prompt listing the opt-in items). Later it changes by editing `ags.yaml`, or with `--enable` and `--disable` on update, followed by the update run.

### 12.4 Companions

- `includes` lists companion skills. Selecting a skill installs its companions, recursively.
- Disabling a companion of a selected parent is an error that names the parent. To drop a companion, drop its parent.
- A skill installed only as a companion is removed once no selected parent needs it, as an opt-out (16.6).

### 12.5 Resolution order

1. Start with the `always` items, the `detected` items whose condition matches, and the `enabled` items.
2. Remove the `disabled` items.
3. Add every companion, recursively. Fail if any companion is disabled.
4. Validate settings for the result (13.4).

## 13. Settings and skill parameters

### 13.1 `.agents/ags.yaml`, format 2

```yaml
format: 2
host: watcher
agsVersion: 2.0.0
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

- Reserved top-level keys: `format`, `host`, `agsVersion`, `reporting`, `skills`, `rules`, `local`.
- Every other top-level key is a settings namespace declared by the catalog, such as `git` or `checks`.
- `reporting` is a boolean, `true` by default, that switches usage recording (section 18). It is edited by hand.
- `local` is free-form, for host rules and host skills. AGS does not validate it.
- Keys that are neither reserved nor declared by the catalog are errors.
- `format: 1` files are rejected with a message. The registry has no V1 hosts, so no migration exists.
- `ags.yaml` is committed with the host. It must never hold secrets, including under `local`.

### 13.2 Settings declared in the catalog

```yaml
settings:
  - key: git.mainBranch
    type: string
    required: true
    description: Trunk branch that feature branches start from and merge into.
  - key: git.ticketPrefix
    type: string
    default: ""
    description: Prefix for ticket ids in branch names and merge request titles. Empty means no ticket part.
  - key: checks.type
    type: string
    default: ""
    description: package.json script that runs the type check. Empty means not configured.
  - key: checks.lint
    type: string
    default: ""
    description: package.json script that runs the linter. Empty means not configured.
  - key: checks.prettier
    type: string
    default: ""
    description: package.json script that checks formatting without writing files. Empty means not configured.
```

- A key is `<namespace>.<name>`, and each part matches `[a-z][a-zA-Z0-9]*`. The namespace must not be a reserved key. Keys are unique.
- Types: `string` and `boolean`.
- `required` (default `false`) and `default` are mutually exclusive. A default must match its type. A boolean setting must have a default.
- `git.mainBranch` keeps the V1 branch-name validation.
- `checks.*` values, when not empty, must be `package.json` script names (the V1 rule). They are never shell command lines.
- Skills list the keys they read in their catalog `params` field.

### 13.3 Skills point to settings

- Skills name settings by key and read `.agents/ags.yaml` at the repository root. AGS never substitutes values into copies.
- Every skill with `params` must contain a `## Host settings` section (Appendix D). For each key, it gives the meaning and what to do when the value is empty or missing.
- Skill text must not contain template syntax such as `{{…}}` or conditionals. Behavior for empty values is written as prose.
- Agents use values exactly as written. A missing required value means stop and ask the user.

### 13.4 Validation

At install and at every update:

- every key in a skill's `params` exists in the catalog `settings`;
- every required key used by a selected skill has a non-empty value;
- values match their types and their key-specific rules.

A missing value is asked for in a terminal, or supplied with `--set`. Otherwise the command stops with exit code 3.

### 13.5 Values on the command line

- `--set key=value`, repeatable, accepts declared settings only. Reserved keys are edited by hand.
- Strings are taken verbatim. `--set key=` sets an empty string.
- Booleans accept `true` or `false` only.

### 13.6 Merging on update

AGS edits `ags.yaml` through YAML document editing that preserves comments and order. It:

- adds the keys needed by newly selected skills, with their default (or an empty string) and the setting description as a comment;
- never changes existing values, except `agsVersion` and values passed through flags;
- writes nothing else.

Keys and ids are removed or renamed only in major versions, and V2 updates never cross one (16.5). An update therefore never meets a key or an id that its target no longer declares.

## 14. Catalog, format 2

```yaml
format: 2

rules:
  - id: core
    tier: strong
    install: always
  - id: tmp-conventions
    tier: soft
    install: always

skills:
  - id: plan-work
    install: always
  - id: write-commit-diff
    install: always
  - id: report-usage
    install: always
  - id: ui-library-css
    install: detected
    when:
      any:
        - package: "@platform/ui-library"
    includes: [css-authoring-conventions, css-theme-tokens]
  - id: css-authoring-conventions
    install: opt-in
    includes: [css-cleanup]
  - id: css-cleanup
    install: opt-in
    params: [checks.type, checks.lint, checks.prettier]
  - id: css-theme-tokens
    install: opt-in
  - id: git-cleanup
    install: opt-in
    params: [git.mainBranch]
  - id: ship
    install: opt-in
    params: [git.mainBranch]
  - id: check
    install: opt-in
    params: [checks.type, checks.lint, checks.prettier]

settings:
  # section 13.2
```

This is the `2.0.0` catalog. Run 2 adds `commit-granular`, and replaces the skills and rules with their consolidated canonical versions, including the full `ship` (28.2).

### 14.1 Fields

Rules:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Equals the file stem of `rules/<id>.md` |
| `tier` | Yes | `strong` or `soft` |
| `install` | Yes | 12.1 |
| `when` | Only with `detected` | 12.2 |

Skills:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Equals the folder name `skills/<id>/` and the frontmatter `name` |
| `install` | Yes | 12.1 |
| `when` | Only with `detected` | 12.2 |
| `includes` | No | Companion skill ids |
| `params` | No | Setting keys the skill reads |
| `keywords` | No | Search terms for `ags skills list` |

Settings: `key`, `type`, `required` (default `false`), `default`, `description`.

- Paths are derived from ids and are not listed.
- Descriptions are read from the files: `SKILL.md` frontmatter for skills, rule frontmatter for soft rules.
- Removed from V1: `default`, `entryPoint`, `path`, `kind`, the catalog `description`, and the requirement for `keywords`.
- Fields for deferred features (`uses`, `tools`, third-party `source`) are backlog items (section 31).

### 14.2 Validation

Run by `doctor`, and by every command that reads a catalog:

- `format` is 2;
- ids are unique across rules and skills, match `[a-z0-9]+(-[a-z0-9]+)*`, and have at most 64 characters;
- derived paths exist;
- skill frontmatter: `name` equals the id; `description` exists and has at most 1024 characters;
- soft rules have a single-line `description` of at most 160 characters; strong rules have no frontmatter and at most 5 non-empty lines;
- `when` appears only with `detected`, and is required there;
- `includes` ids are skills, and have no cycles;
- `params` keys are declared in `settings`, and settings are valid (13.2);
- links resolve in the host layout;
- a block with every AGS rule selected stays within the 40-line budget.

## 15. Versioning and releases

### 15.1 Semver for AGS

Versions are `MAJOR.MINOR.PATCH`:

| Part | Used for | Host impact |
| --- | --- | --- |
| Patch | Wording fixes, clarifications, CLI bug fixes | Update only |
| Minor | New skills, rules or settings; backward-compatible CLI additions | Update only |
| Major | Removed or renamed ids or setting keys; changed host layout or schemas | Needs a migration; V2 has none, so V2 hosts never update across a major (16.5) |

The first V2 release is `2.0.0`. Proto-rules arrive as `3.0.0`. A major release must bring its own explicit configuration and host migration path, which retires removed ids and setting keys from host selections and `ags.yaml`. Until it exists, V2 hosts cannot update across that major (backlog: config migrations).

### 15.2 Sources of truth

- A release is an annotated tag `vX.Y.Z`, digits only, with no pre-release or build suffix. "Latest" means the highest release tag in semver order. Other tags are ignored.
- The catalog and the material of a release are read from its tag with `git show`, never from the working tree.
- `package.json` `version` equals the latest release.
- `CHANGELOG.md` holds the notes.
- At the start of Run 1, the last V1 commit is tagged `v1-final`. It is not a release tag, so hosts never install it; it is the fixed reference for ledger sources.

### 15.3 Notes

- `ags version note "<text>"` appends a bullet under `## Unreleased`.
- A promotion appends "Promoted from <host name>: `<source path>`", unless that exact bullet is already under `## Unreleased`.
- These replace `ags report changes`.

### 15.4 Release flow

1. Commit normal AGS work, including promotions.
2. Check `ags version`: the current version, the latest release, the commits since it, and the Unreleased notes.
3. Run `ags version bump patch|minor|major [--allow-empty]`. It:
   1. completes an untagged release first. When `package.json` `version` is above the latest release and a commit with the subject `Release: <that version>` is in HEAD's history, the plan is only the missing annotated tag on that commit, with the notes of its changelog section. That run does nothing else, and says so;
   2. refuses when AGS has uncommitted changes, conflict markers, or an in-progress merge, rebase, cherry-pick or revert. When the only changes are to `CHANGELOG.md` and `package.json`, the refusal names the recovery for an interrupted bump: `git restore -- CHANGELOG.md package.json`, then the same bump;
   3. refuses when the latest release tag is not an ancestor of HEAD, so that a release never drops an earlier one;
   4. refuses `patch` and `minor` when the working-tree catalog drops an id or a setting key of the latest release, or changes a setting's type;
   5. refuses when `## Unreleased` is empty, unless `--allow-empty` is passed;
   6. shows the notes and the next version, and asks for confirmation (16.2);
   7. takes the AGS lock and revalidates;
   8. runs the AGS `test` script, and refuses if it fails;
   9. moves the notes under `## X.Y.Z - YYYY-MM-DD` and sets `package.json` `version`;
   10. commits `Release: X.Y.Z` and creates the annotated tag `vX.Y.Z`, with the notes as its message;
   11. prints the registered hosts with their installed versions and the update command for each. It updates none of them.

   A failure in sub-steps 9 or 10 exits 1 and prints its recovery: before the commit, the restore command of sub-step 2; after the commit, the same bump, which creates the tag through sub-step 1.
4. Update hosts one at a time with `ags host update`. Each run reports its own result, and on failure its rerun command.

### 15.5 Host stamp

`agsVersion` is written last, by a completed install or update. `doctor` reports an error if the tag it names does not exist.

## 16. Host operations

### 16.1 Operation model

`host prepare`, `host install`, `host update` and `host unregister` follow this sequence. `version bump` uses the same locks and the same confirmation (15.4).

1. **Resolve.** Find the host's git root. Refuse it unless its git directory is `.git` at the root (22.1).
2. **Inspect.** Read the registry entry, `ags.yaml`, I and T, the catalog at I and at T, and every relevant path. Inspection takes no lock.
3. **Plan.** List every item with its path, its kind, the hashes that apply (B, H, Tc, S), and its action or its choices.
4. **Digest.** The plan digest is the first 12 characters of the SHA-256 of the plan's canonical JSON: keys sorted, paths with forward slashes. It covers the host id, I, T, the selection, the settings changes, and every item with its hashes and action.
5. **Show and decide.** The plan is shown. In a terminal, the user answers each question and confirms. Without a terminal, see 16.2.
6. **Lock,** after confirmation. Take the host lock, `<host>/.tmp/ags/locks/host`. Then take the AGS lock, `<AGS>/.tmp/ags/locks/ags`, when the plan writes AGS: the registry, promotions or notes. Always in this order. A lock is a directory created atomically that records the command, its process id and its start time. It is stale only when that process has ended, or, when its record is missing or unreadable, once it is older than 15 seconds. Age never makes a recorded lock stale: a run may hold its locks through a terminal prompt or the bump's tests. A stale lock is removed and taken. A command waits up to 2 seconds for a live lock, as V1's `withLock` does, then exits 1, naming the holder and the lock's path, so that a lock kept by a reused process id can be deleted by hand.
7. **Revalidate.** Under the locks, recompute the plan and compare digests. Any difference discards every decision: a terminal shows the new plan, and otherwise the command exits 3 with it.
8. **Apply,** in this order. Each step finishes before the next starts. Each file is written to a temporary file in the same folder and renamed into place.
   1. The exclude block, so that `.tmp/` is ignored before the next two steps write backups and moved setup into it. The host lock, taken at step 6, is the only write under the host's `.tmp/` before this step. When an edited block is restored, the step backs up the exclude file first.
   2. Backups. Every other host file that will be overwritten or deleted is copied into `.tmp/ags/backups/<YYYY-MM-DD-HHmmss>-<operation>/`, renamed as in Appendix E.4. Then `manifest.json` is written. It records the operation, the versions, the digest, and for each file: original path, backup path, whether it was tracked, byte count and SHA-256.
   3. Prepare's moves, in prepare and install (16.3). They are their own backup, and they always finish before `ags.yaml` is written.
   4. AGS writes: promotions, then notes.
   5. `ags.yaml`, without the new `agsVersion`.
   6. Managed files: writes, then deletions.
   7. The AGS block.
9. **Verify.** Re-read every written path and compare it with the planned result.
10. **Record.** Write the registry entry with its ignore and promotion records, then `agsVersion`.
11. **Unlock,** and print a summary.

A run that ends before confirmation, because of `--dry-run`, exit code 3, a plan without writes, or a stop, takes no lock and writes nothing except its run-log line (section 21). A run whose revalidation finds a new plan already holds the locks; it releases them when it exits 3 or the user stops.

A failure at any step stops the command with exit code 1. The command names the writes it completed and those it did not, prints the rerun command, releases its locks, and never writes `agsVersion`. Nothing is rolled back; the backups and git restore anything. A crash leaves the locks in place, and the rerun removes them once they are stale (step 6). Each interruption point has a defined rerun result:

| Interrupted | The rerun |
| --- | --- |
| Before the host lock | Finds nothing written, and plans afresh |
| After the host lock, before the exclude block | Finds nothing but the locks a crash left, with the host lock in a `.tmp/` that git may not ignore yet. It removes them once stale and plans afresh, the exclude block included when `.tmp/` is still not ignored |
| In the exclude block or the backups | Finds host files untouched, except possibly the exclude block, which needs nothing. It plans afresh. An incomplete backup folder, without a manifest, stays for `doctor` to report |
| In prepare's moves | Finds an incomplete prepare manifest, and continues it in the same folder (16.3) |
| After prepare's moves, before `ags.yaml` | Finds the setup moved and no `ags.yaml`, and plans a fresh install with nothing left to move |
| In the AGS writes | Finds host files untouched, and replans the update. A promotion already in AGS is recorded without a question, and a note already present is not appended again |
| After `ags.yaml` | Resumes the install (16.4, step 3), or replans the update. Paths already at target need no action |
| After the registry, before `agsVersion` | Finds the entry already matching; only `agsVersion` remains |

Reruns are idempotent:

- a host path already equal to its planned result needs no action and no decision;
- a promotion whose source content already equals the host content is complete: its record is written without a question;
- a changelog note that is already present is not appended again;
- the `ags.yaml` merge and the exclude block only add what is missing;
- an incomplete prepare manifest is continued, never replaced.

Known limitation: after an interrupted update to T, a rerun to a later target sees AGS's partial writes as host changes. The failure message therefore prints the rerun command with `--to T`.

### 16.2 Confirmation and decisions

- A plan with no writes exits 0 without asking.
- In a terminal, commands prompt: one question per item, with a "same for all remaining" answer, then a final confirmation of the whole plan. Answering "stop" ends the command without writing.
- Without a terminal, commands never prompt. When a confirmation or a decision is missing, the command exits 3 and prints the plan, its digest, and the exact rerun command. The rerun passes:
  - `--plan <digest>`, which confirms that exact plan;
  - `--decide <path>=<choice>`, repeatable, keyed by the item's path;
  - or `--decide-all <choice>`, for every item that offers that choice.
- A digest that no longer matches makes the command exit 3 with the new plan. Earlier decisions are discarded.
- `--dry-run` shows the plan and its digest and exits 0. Like every run that ends before confirmation, it takes no lock and writes nothing except its run-log line (16.1).
- Agents show the plan to the user, ask, and rerun with the flags. They never pass `--plan` for a plan the user has not seen. The exit-3 output says so, so the instruction reaches agents even without a skill.
- Choice tokens: `promote`, `restore`, `ignore`, `disable`.
- Item keys: host paths for files, `AGENTS.md` for the AGS block, `.git/info/exclude` for the exclude block.

`version note`, `report usage`, `snapshot`, `diff` and `check` act directly, without a plan.

### 16.3 Prepare

`ags host prepare [--route .] [--include-nested] [--dry-run] [--plan <digest>]`

1. Resolve the host's git root.
   - Refuse the AGS root.
   - Refuse an installed host (`agsVersion` present), and point to `ags host update`.
   - Refuse an interrupted install (an `ags.yaml` of format 2 without `agsVersion`), and point to `ags host install`, which resumes it.
2. Detect setup with the Appendix E lists. Walk the file system, including gitignored paths. Skip `.git`, `.tmp`, `node_modules` and nested git repositories.
   - Root setup, meaning list entries at the repository root, is planned for moving.
   - Nested setup, meaning the same names below the root, is listed. It is planned for moving only with `--include-nested`, or when the user says so in a terminal.
   - An incomplete prepare manifest, left by an interrupted run, is continued: its pending entries join the plan, in the same backup folder.
3. Plan:
   - the moves;
   - creating `.tmp/`, and the exclude block if `.tmp/` is not ignored;
   - tool-configuration files, reported and never moved;
   - notable findings, for example `.tmp/` listed in `.cursorignore` or `.cursorindexingignore`, which AGS never edits, or an ignore rule that matches `AGENTS.md` or `.agents/`, which makes install refuse (invariant 10).
4. If there is nothing to do, say so and exit 0.
5. Confirm (16.2).
6. Apply (16.1, step 8):
   1. write `manifest.json` in `.tmp/ags/backups/<stamp>-prepare/`, listing every planned move with its hashes, marked incomplete;
   2. move the setup file by file into that folder, keeping relative paths, renamed as in Appendix E.4, then remove the folders the moves emptied;
   3. mark the manifest complete.

   Each entry's state is read from the file system: moved when only its backup path exists, pending when only its original path exists. When both paths exist, or neither does, the command stops with exit code 1 and names the entry.
7. Print the cleanup prompt (Appendix F).

Prepare never deletes; to discard a backup, the user deletes its folder. Prepare never moves work products or anything outside the Appendix E setup list. For example, it leaves `.cursor/plans/`, documentation folders, hooks and scripts alone. Tracked files it moves show up as deletions in git; the host commits them. Work products found in a particular host are cleaned up once, by hand (Appendix G for Watcher).

### 16.4 Install

`ags host install [--route .] [--id <id>] [--name <name>] [--enable <ids>] [--disable <ids>] [--set key=value ...] [--include-nested] [--dry-run] [--plan <digest>]`

1. Resolve the host. Refuse the AGS root. Refuse an installed host (`agsVersion` present), and point to update.
2. Require at least one release tag. T is the latest release.
3. **Resume.** If `.agents/ags.yaml` has format 2 and no `agsVersion`, a previous install was interrupted. This run resumes it: it skips setup detection, keeps the recorded id and selection, and plans only what is missing or different.
4. Otherwise, include prepare's plan (16.3) in the install plan, continuing an incomplete prepare manifest if there is one. Prepare's moves finish before `ags.yaml` is written, so a rerun either repeats setup detection or resumes the install, never both.
5. Resolve the selection at T (section 12). In a terminal, offer the opt-in items. Validate settings (13.4).
6. Refuse while a host rule or host skill uses an AGS id at T, counting only what remains after prepare's moves. An item whose files all equal Tc, such as one an interrupted install wrote in part, is not refused. The refusal comes before anything is written and prints the exact rename (16.6).
7. Plan the writes:
   - `ags.yaml` in format 2: the selection, and the settings with their defaults and description comments, without `agsVersion`;
   - the managed files, from tag `vT`;
   - `AGENTS.md` with the block at the top, creating the file if it is missing;
   - the exclude block, if `.tmp/` is not ignored;
   - the registry entry. The default id is the slug of the repository folder name, and the default name is the folder name.
8. Confirm and apply (16.1). `agsVersion` is written last.
9. Print a summary, plus the cleanup prompt when setup was moved.

Install never commits.

### 16.5 Update

`ags host update [--route . | --host <id>] [--to X.Y.Z] [--enable <ids>] [--disable <ids>] [--set key=value ...] [--dry-run] [--plan <digest>] [--decide <path>=<choice> ...] [--decide-all <choice>]`

1. Resolve and verify the host (16.13). Refuse an interrupted install, and point to install.
2. I is `agsVersion`. T is the latest release with I's major version, or `--to`. Downgrades are refused, and so is a T with another major version, because V2 has no migrations (15.1).
3. Compute the selection at T from `ags.yaml`, the flags and detection.
4. Classify every path managed at I and every path selected at T (16.6), applying the records (16.9, 16.10).
5. Check the AGS block (16.11) and the exclude block (16.12).
6. Plan the `ags.yaml` merge (13.6).
7. Show, decide, revalidate, back up, apply, verify and record (16.1).

The same flow runs when T equals I. It then reviews host changes, re-evaluates detection, and regenerates the block, for example after a host rule was added.

### 16.6 Classification

For each path:

| Host content | At T | Action |
| --- | --- | --- |
| Equals Tc | Any | Keep: already at target. Records for the path are dropped |
| Equals B | Changed | Write Tc |
| Equals B | Absent: removed, deselected or opted out | Delete |
| Absent, and B absent | New | Add |
| Differs from B | Equals B | Ask: promote (when eligible), restore, ignore |
| Differs from B | Changed | Ask: restore, ignore |
| Differs from B | Absent: the file or its id was removed from AGS | Ask: restore (delete after backup), ignore (keep) |
| Differs from B | Absent: deselected or opted out | Delete after backup, without asking |
| Added in a managed folder (B and Tc absent) | — | Ask: promote (when eligible), restore (move to backup), ignore |
| Added in a managed folder, and T adds the same path | Different content | Ask: restore (write Tc), ignore |
| Absent: the host deleted it | Present | Ask: restore, ignore, or disable the skill when its whole folder is gone |
| Absent | Absent | Nothing |

- **Collision:** when an id new at T names a rule file or skill folder that already exists in the host, the update stops before anything is written, with exit code 1, in a terminal too. The exception is an item whose files all equal Tc, such as one an interrupted run wrote in part: it is not a collision, and its paths are classified as usual. The output gives the exact rename, adding the host id as a prefix: `.agents/rules/<id>.md` to `.agents/rules/<host id>-<id>.md`, or `.agents/skills/<id>/` to `.agents/skills/<host id>-<id>/` with `name` in its `SKILL.md` changed to match. The user may instead remove the item or choose another non-AGS id, then reruns. AGS never renames host files; automatic renaming is a backlog item.
- **Eligible for promotion:** S equals B and Tc equals B, so that neither the AGS source nor the target release changed the file since the host's base (for an added file, S and Tc are absent); AGS has no in-progress merge, rebase, cherry-pick or revert; and the item is a managed file, not the block or `ags.yaml`.
- A kept file whose id is no longer in the catalog becomes host-owned.
- `disable` is refused for a companion of a selected parent.
- AGS never deletes source material because a host deleted it.

### 16.7 Choices

- **Promote** ("update AGS") copies H, normalized to LF, into the AGS working tree at the source path. It appends the changelog note and records the promotion (16.9). The host file is not touched, and the host may advance to T while it still diverges. AGS never commits a promotion.
- **Restore** backs up H, then writes Tc, or deletes the file when Tc is absent.
- **Ignore** keeps H and records the decision (16.10).
- **Disable** adds the skill to `skills.disabled` in `ags.yaml`.

### 16.8 Promotion

- Promotion is how host edits improve AGS. The user reviews the promoted change in AGS, commits it, and releases it.
- In `2.0.0`, promotion is offered only when it cannot conflict: neither the AGS source nor the target release changed the file since the host's base (16.6). Otherwise the choices are restore and ignore, and the user carries the edit over by hand. Three-way promotion is a backlog item.
- Revalidation (16.1) catches a source file that changed between the plan and the write.

### 16.9 Promotion records

A promotion stores, in the host's registry entry: the path, the host hash, the resulting AGS hash, and T of the promoting run.

- Later runs to the same target list the item as "promoted, pending release" and do not ask, while the host content still equals the recorded host hash.
- The first run to a later target writes Tc without asking when Tc equals the recorded AGS hash and the host content equals the recorded host hash. This is the automatic replacement of invariant 5. The record is then dropped.
- Otherwise the record is dropped and the path is classified normally. This happens when the host changed the file again, or when the release does not contain the promotion as recorded.

### 16.10 Ignore records

An ignore stores: the path, the host hash, the Tc hash, and T. Later runs skip the item, listed as "ignored", while both hashes match. When either changes, the record is dropped and the user is asked again.

### 16.11 The AGS block

- The begin marker is `<!-- AGS:BEGIN <version> <hash> -->` and the end marker is `<!-- AGS:END -->`. The hash covers the LF-normalized content between the markers.
- Content: the strong rules, then the rule index (Appendix A).
- The index lists every soft rule file in the host's `.agents/rules/` after the run: AGS rules in catalog order, then host rules by id, each with its `description`. A host rule without a description is left out, and `doctor` warns.
- Install inserts the block at the top of `AGENTS.md`, creating the file if needed.
- On update:
  - **Hash intact:** regenerate the block for T. This is a no-op when nothing changed.
  - **Edited:** ask: `restore` or stop. `restore` regenerates the block, with the old block backed up and its diff printed. To keep an edit, the user moves it outside the block, into host facts, and reruns; when the edit only added lines, the block is then intact again.
  - **Missing** (no `AGENTS.md`, or no markers): ask: `restore` (recreate the block at the top) or stop.
  - **Malformed** (unbalanced or repeated markers): exit 1; the user fixes it by hand.
- A host cannot advance `agsVersion` while its block is missing, or edited without a decision. To refuse the block permanently, run `ags host unregister`.

### 16.12 The exclude block

- The file is `.git/info/exclude` at the host root. AGS resolves it with `git rev-parse --git-path info/exclude` and refuses any other result. Hosts are main worktrees (invariant 10), so the file is inside the host root.
- AGS writes the block only when `.tmp/` is not already ignored, as reported by `git check-ignore`. It never removes the block.
- The markers are `# AGS:BEGIN` and `# AGS:END`, and the content is `/.tmp/`. Lines outside the markers are always preserved.
- **Edited region:** ask: `restore` or stop. `restore` backs up the exclude file and regenerates the region. Without a terminal, exit 3; the decision is passed as `--decide .git/info/exclude=restore`.

### 16.13 Registry, status, list, unregister

`hosts.yaml`, format 2:

```yaml
format: 2
hosts:
  - id: watcher
    name: Watcher
    path: C:/Cosmos/projects/alotropico/watcher
    ignored: []
    promoted: []
```

- These V1 rules are kept:
  - `id` is a slug;
  - normalized paths are unique, compared case-insensitively on Windows;
  - before every operation, the host's `ags.yaml` `host` value must match the registry entry.
- `ignored` and `promoted` hold the records of 16.9 and 16.10.
- An installed host that is not registered gets a "register" item in its update plan. When the entry's recorded path no longer holds a host with that id, the plan updates the path. When another entry holds the id or the path, the command stops.
- `ags host status [--route . | --host <id>]` is read-only and takes no lock. It shows:
  - the installed and latest versions;
  - a plan summary with its digest;
  - host changes, pending promotions, ignored items and collisions;
  - missing settings and the reporting switch;
  - the number of usage records;
  - `doctor` warnings.
- `ags host list` shows registry entries with their installed versions.
- `ags host unregister (--route . | --host <id>) [--plan <digest>]` removes the entry and its records. Host files are not touched.
- There is no uninstall command in V2.

## 17. `.tmp` conventions

### 17.1 Scope

These conventions apply in every host and in AGS itself. `.tmp/` is local and gitignored, and must stay readable by agents.

### 17.2 Layout

```text
.tmp/
  plans/            plans and specs; multi-file plans as folders
  records/          records of finished work, and handoffs
  scratch/          disposable output: diffs, logs, experiments
  archive/YYYY-MM/  finished or stale material moved out of the way
  ags/              reserved for the ags CLI: backups/, locks/, reports/, snapshots/
```

### 17.3 Names

New files use `YYYY-MM-DD-kebab-slug.md`, and new folders `YYYY-MM-DD-kebab-slug/`. Existing files are not renamed, including when they are archived.

### 17.4 No trigger names

No dot-folders and no instruction entry files may exist anywhere under `.tmp/`. The entry files are `AGENTS.md`, `AGENTS.override.md`, `CLAUDE.md`, `CLAUDE.local.md` and `GEMINI.md`.

Cursor and Claude Code load such files from subfolders when an agent works with files near them, which would bring old guidance back to life. Backups comply by renaming (Appendix E.4). `doctor` flags violations.

### 17.5 Ignoring and readability

- `.tmp/` is gitignored in AGS and in every host, through an ignore rule or the exclude block. Git's ignore is the only ignore AGS relies on.
- `.tmp/` must not be listed in `.cursorignore`, `.cursorindexingignore` or any other harness-specific ignore file; `.cursorignore` blocks agent reads. Nor may an unanchored `tmp/` line, which Cursor also applies to `.tmp/`; write `/tmp/` instead. AGS never edits these files, and `doctor` reports the entry.
- **Contract:** agents read `.tmp/` files by direct path. Built-in search, Grep, `@` suggestions and indexing are not guaranteed to include gitignored `.tmp/` content, whether or not a harness ignore file lists it. Terminal tools may search `.tmp/` explicitly, for example with `rg --no-ignore`; `tmp-conventions` says so.
- Observed in Cursor in AGS, where `.tmp/` is ignored through `.gitignore` and listed in no harness ignore file: direct reads worked; the built-in search skipped the files, and on 2026-09-27 returned no matches, rather than an error, for a `.tmp/` file given by its exact path; `rg --no-ignore` found them.
- Observed in Cursor 3.22.7 from the AGS workspace, in a scratch host ignored only through the exclude block: the direct read worked; Grep (host root and exact path) and Glob found nothing, without an error; `rg` found nothing and `rg --hidden --no-ignore` found the file.
- Observed in Watcher, ignored through `.gitignore`, in the same session: Grep, Glob and `rg` behaved as in the scratch host, but the direct read was denied, also after a window reload. Two causes: Cursor caches a known workspace's `.cursorignore` until the window reloads, and it applies Watcher's unanchored `tmp/` line to `.tmp/` as well. A folder that is not a known Cursor workspace showed no `.cursorignore` effect at all.
- Observed with Watcher open as the workspace: `@` did not suggest the probe file, the search panel did not find its token, and Indexing & Docs did not list it as indexed.
- Old material under `.tmp/` stays inert because backups rename instruction entry files and discovery-triggering folders (17.4, Appendix E.4), not because search skips it.
- Run 2 probed the contract on 2026-09-28 in Watcher and a scratch host; the record is Watcher's `.tmp/records/2026-09-28-ags-tmp-probe.md`.

### 17.6 Delivery

The always-installed soft rule `tmp-conventions` delivers these conventions, and `doctor` checks them. An archiving command and an agent sweep skill are backlog items.

## 18. Usage recording

1. Recording is minimal, cooperative and host-side. The `reporting` key in `.agents/ags.yaml` switches it.
2. `ags report usage [--route .] --file <host path>=<level> ... [--label "<text>"]` appends one record to `<host>/.tmp/ags/reports/usage.jsonl` under the host lock. With `reporting: false`, it is a successful no-op.
3. A record:

   ```json
   {"id":"<random UUID>","timestamp":"2026-09-28T14:02:11Z","agsVersion":"2.0.0","label":"…","files":[{"path":".agents/skills/plan-work/SKILL.md","level":6,"sha256":"<hash of the file as read>"}]}
   ```

   - Valid paths: managed files at I, and `AGENTS.md` for the block.
   - Levels 0 to 8 keep their V1 meanings. Duplicate paths collapse to the highest level.
4. The always-installed skill `report-usage` holds the level scale and the command. The core points to it, phrased "if the `ags` command is available".
5. Records stay in the host. Collection into AGS is a backlog item whose contract is recorded there. Until it exists, usage-driven work reads Watcher's records directly.

## 19. Skill-local scripts

1. Deterministic helpers run by skills live in the skill's `scripts/` folder and are copied with it.
2. Constraints:
   - Node 20+ ESM, standard library only;
   - no network access;
   - no dependence on the AGS path or on `ags`;
   - inputs as arguments: agents read settings and pass the values;
   - concise output, written to `.tmp/` or to stdout;
   - child processes started with argument arrays, never with shell strings built from input. The one exception is V1's validated `.cmd` fallback for package scripts on Windows.
3. Skills invoke them from the host root, as `node .agents/skills/<id>/scripts/<name>.mjs ...`. AGS's own `scripts/` are never invoked by path; use `ags` instead.
4. **Aliases.** `ags diff` and `ags check` run the host's installed copy of the script with the same arguments. If the skill is not installed in the host, the alias says so and exits 1.

### 19.1 `write-commit-diff`

The `write-commit-diff` script ports the V1 `ags diff` modes (`commits`, `range`, `staged`, `changes`, `untracked`, `current`) and writes `.tmp/scratch/<name>.diff`. The skill is `always`.

### 19.2 `check`

`node .agents/skills/check/scripts/run-checks.mjs [--type <script>] [--lint <script>] [--prettier <script>]` ports V1 `ags check`:

- it finds the package manager from the `packageManager` field and the lock files, and stops when they conflict;
- every script it is given must exist in `package.json`;
- it runs the scripts in the order type, lint, prettier, each through the package manager (`<manager>.cmd run <script>` on Windows, with V1's fallback);
- it runs all of them, then fails if any failed;
- it rejects a prettier script that writes files;
- statuses: `passed`, `failed`, `not-configured`, `stale-configuration`, `unavailable`, `rejected`.

`ags check [--route .] [--only type,lint,prettier]` reads `checks.*` from `ags.yaml` and runs the script with those values. The skill tells agents to read the same keys and pass them.

## 20. Host snapshot

`ags snapshot [--route .] [--out <file.zip>]` writes a zip of `AGENTS.md`, `.agents/**` and a `manifest.json`. The manifest holds the host id, `agsVersion`, the creation time, and each file's path, byte count and SHA-256.

- The default output is `.tmp/ags/snapshots/<YYYY-MM-DD-HHmmss>.zip`. `--out` must end in `.zip`.
- The command takes the host lock and writes nothing else.

## 21. Run log

1. Every `ags` invocation appends one line to `<AGS>/reports/runs/YYYY-MM.jsonl` when it ends:

   ```json
   {"command":"host update","flags":{"dry-run":true},"params":["."],"at":"2026-09-27T05:45:12Z","error":false}
   ```

   - `command`: the command group and action;
   - `flags`: the parsed flags, as given;
   - `params`: the positional arguments;
   - `at`: the start time, in ISO-8601 UTC;
   - `error`: `true` when the exit code is 1 or 2. Exit code 3, a pending decision, is not an error.
2. Appends take the lock `<AGS>/.tmp/ags/locks/runs` (16.1, step 6). A failed append prints a warning and never changes the exit code.
3. `reports/` is gitignored, so the log stays on this machine. Settings hold no secrets, so flags are logged as given.
4. It is built at the end of Run 1, before the `2.0.0` release.

## 22. CLI

### 22.1 Entry

- `ags` comes from `package.json` `bin`. On Windows it is exposed through shims written by the existing global-install script. Portability is a backlog item.
- The CLI derives the AGS root from its own location (`import.meta.url`), never from the working directory.
- Host commands accept `--route <path>`, which defaults to the working directory, and resolve the host's git root.
- `host status`, `prepare`, `install`, `update` and `unregister` refuse a repository whose git directory is not `.git` at its root: a linked worktree, a submodule, or a separate git directory. They name the main worktree when git reports one. `doctor`, `snapshot`, `report usage`, `diff` and `check` also work in linked worktrees.

### 22.2 Commands

| Command | Purpose |
| --- | --- |
| `ags doctor [--route .]` | Validate AGS, or a host (section 23) |
| `ags host prepare` | Back up an existing setup (16.3) |
| `ags host install` | First install, or resume an interrupted one (16.4) |
| `ags host update` | Update, and review host changes (16.5) |
| `ags host status` | Read-only host review (16.13) |
| `ags host list` | Registry entries |
| `ags host unregister` | Remove a registry entry (16.13) |
| `ags skills list` | Catalog view: ids, install classes, descriptions, keywords |
| `ags version` | Current version, latest release, unreleased commits and notes |
| `ags version note "<text>"` | Append an Unreleased note (15.3) |
| `ags version bump <level>` | Release commit and tag (15.4) |
| `ags report usage` | Record usage in a host (section 18) |
| `ags snapshot` | Host snapshot (section 20) |
| `ags diff <mode> ...` | Alias of the `write-commit-diff` script (19.1) |
| `ags check` | Alias of the `check` script (19.2) |

### 22.3 Interaction

See 16.2. In a terminal, commands prompt. Without a terminal, they never prompt; they exit 3 with the plan, its digest and the exact rerun command.

### 22.4 Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Failure |
| 2 | Invalid usage |
| 3 | Decision or confirmation needed |

### 22.5 Output

- Plans are compact tables.
- Warnings go to stderr.
- A command never reports success after a partial write. It names the files that were not completed and prints the rerun command.

## 23. `doctor`

`doctor` never repairs anything.

At the AGS root it checks:

- Node 20+;
- catalog validity (14.2);
- `CHANGELOG.md` starts with `## Unreleased`;
- `package.json` `version` matches the latest release, once one exists; an untagged release commit is reported with its recovery (15.4);
- `LEDGER.md` exists, and every row has one of the five dispositions (section 26);
- no host installation exists inside AGS;
- the registry is valid;
- stale locks;
- git state, reported as information: uncommitted changes, and commits since the latest release.

With a host route it also checks:

- the git directory is `.git` at the root. In a linked worktree, `doctor` says so and skips the registry checks;
- identity against the registry;
- `ags.yaml` is valid and in format 2; `agsVersion` is present (otherwise: interrupted install) and its tag exists;
- the selection is valid, and required settings are set;
- managed files: host changes, pending promotions, collisions, and unselected AGS-id items that the next update will remove;
- the AGS block: valid markers, intact hash, an index that matches the host's rules, and the size budget;
- `.tmp/`: it exists, is ignored by git, is not listed in `.cursorignore` or `.cursorindexingignore`, and contains no trigger names;
- the exclude block is intact, when present;
- host rules have a `description`; host notes name an installed skill; other files in `.agents/local/` are linked (11.6);
- git ignores none of `AGENTS.md`, `.agents/` or the files under it. A match is an error (invariant 10);
- backup folders without a complete manifest;
- the number of usage records, and stale locks.

## 24. Safety

- Each file is written through a temporary file in the same folder and renamed into place. There is no multi-file rollback (16.1).
- Before AGS overwrites or deletes any host file, it backs the file up (16.1). There is no exception: prepare moves setup into its backup and never deletes.
- Every path AGS reads or writes must stay inside the host or the AGS root. The V1 containment and reparse-point checks are kept. Hosts are main worktrees, so the exclude file, `.git/info/exclude`, is inside the host root (16.12).
- AGS writes into its own repository only for:
  - promotions, into the working tree;
  - `CHANGELOG.md`, and `package.json` during a bump;
  - the registry;
  - the run log and the locks.

  It commits only during `version bump`, and never pushes.
- There is one lock per host and one for AGS, always taken host first, and only after confirmation (16.1).

## 25. Removing V1 and the rewrite scope

**Code to remove:**

- `assertCanonicalAccess`, `adoptCanonicalRoot`, `retargetHosts`, and the `canonicalRoot` setting;
- `requires-host-location` exceptions, `localExceptions` and `projectionProblems`;
- `skills install`, `skills reconcile`, `host sync`, `host repair` and `planRepair`;
- `report changes`, `recordChanges`, and every level-9 path;
- `ags reporting on|off|status` and `setReporting`;
- `.agents/AGS.md` rendering: `renderHostEntry` and `templates/host-ags.md`;
- `snapshot canonical` and `scripts/snapshot-canonical.mjs`;
- the V1 install and update flags `--main-branch`, `--check-type`, `--check-lint` and `--check-prettier`, replaced by `--set`;
- the host-retargeting parts of `scripts/install-global.mjs`, keeping the shim installation.

**Code to adapt:**

- `render.mjs`: the block markers with version and hash, and the rule index;
- `util.mjs`:
  - `normalizedFileMap`, `copyTree` and `git()`;
  - `quarantine`, which becomes a backup with renaming and a manifest;
  - `ensureHostTmpIgnored`, which becomes the exclude block (16.12);
- `catalog.mjs`: format 2;
- `links.mjs`: resolution in the host layout;
- `packages.mjs`: detection, and the source of the `check` script port;
- `reports.mjs`: `withLock` for every lock, with the stale rule of 16.1, host-side usage records, and the run log;
- `checks.mjs`: moves into `skills/check/scripts/run-checks.mjs`; the CLI keeps the alias;
- `diff.mjs`: moves into the `write-commit-diff` script; the CLI keeps the alias;
- `snapshot.mjs`: host snapshot only;
- `doctor.mjs` and `discovery.mjs` (the prepare lists);
- `host.mjs`: the operation model, install and update;
- `skills.mjs`: `skills list` only.

**Documentation to rewrite,** each with ledger rows:

- the root `AGENTS.md`, first, so that agents working on AGS during Run 1 follow V2 rules and stop running `ags report changes`;
- `README.md`;
- `rules/core.md` (Appendix A);
- `templates/agents-block.md`;
- `catalog.yaml`;
- the skills with V1 wording: `plan-work`, `ship`, `check`, `git-cleanup`, `css-authoring-conventions`, `css-cleanup`. `ship` and `git-cleanup` stay free of commit, branch-name and ticket formats. The `2.0.0` `ship` is interim: Run 2 replaces it with the consolidated version (28.2).

**New files:**

- `CHANGELOG.md` and `LEDGER.md`;
- `BACKLOG.md` and `docs/`, tracked at the start of Run 1 (28.1, step 1);
- `rules/tmp-conventions.md`;
- `skills/report-usage/`;
- `skills/write-commit-diff/`, with its script;
- `skills/check/scripts/run-checks.mjs`;
- `templates/ags.yaml`;
- the `package.json` `version` field;
- `settings` in the catalog.

**Tests:** replace the roughly 100 canonical-model references in `test/*.mjs`, and add section 27.

## 26. Concept ledger

1. `LEDGER.md` in AGS, tracked in git. Every content rewrite or migration adds a section of rows.
2. Row format:

   | # | Concept | Source | Disposition | Destination | Rationale |
   | --- | --- | --- | --- | --- | --- |

   - **Concept:** one idea, such as a rule, a habit, a pitfall, a procedure or a fact.
   - **Source:** a path plus a heading or line, at a fixed revision: `v1-final:rules/core.md`, a Watcher backup path, or a meta inventory item.
   - **Disposition:** exactly one of `AGS`, `Host`, `Backlog`, `Removed`, `Migrate later`.
   - **Destination:** the path that now holds the concept, or, for `Backlog`, the entry in `BACKLOG.md`.
   - **Rationale:** required for `Removed` and `Migrate later`, optional otherwise.
3. `Migrate later` is temporary, and only for host material in Run 2. Its row names the current host path, the intended destination or candidate area, and why it waits. The parked file must pass the `doctor` linkage check (11.6).
4. Reviews check the work against the ledger. Each review gets one bounded correction pass; leftovers go to the backlog.
5. **Run 1** has two sections. The first, written at step 1, covers the plan inputs handled there (Appendix H, group 6): one row per superseded document, and one per note item reconciled into `BACKLOG.md`. The second covers the Phase A rewrites (section 25). Its sources are, at `v1-final`:
   - `rules/core.md`, the root `AGENTS.md`, `README.md`, `templates/host-ags.md` and `templates/agents-block.md`;
   - the V1-specific lines of the six rewritten skills;
   - the behaviors of the removed commands and settings.

   Run 1 closes with every row disposed, and none `Migrate later`.
6. **Run 2** adds sections for the Watcher backup, each other source group of Appendix H, the consolidation and the prose pass. Consolidation rows record every unique concept of every variant and where it went (28.2). Run 2 closes with zero `Migrate later` rows.

## 27. Tests

Tests use `node --test`. Fixtures build temporary AGS and host git repositories, each with its own tags. Operations are tested as state transitions.

- **Catalog:**
  - install classes; `when` only with `detected`;
  - `includes` closure and cycles;
  - `params` declared;
  - frontmatter of skills and soft rules; strong-rule shape;
  - derived paths; links in the host layout;
  - the block budget.
- **Selection:**
  - `always`, `detected` and `opt-in`;
  - `enabled` and `disabled`, from `ags.yaml` and from flags;
  - companion opt-out blocked;
  - unknown ids; `core` cannot be disabled;
  - detected items added and removed when detection changes.
- **Settings:**
  - key syntax, namespace collisions, `required` with `default`, typed defaults;
  - missing required values: terminal prompt, and exit code 3;
  - `--set` for strings, empty strings and booleans;
  - `checks.*` must be script names;
  - defaults written with comments; comments and order preserved;
  - `local` accepted as free-form; undeclared keys rejected;
  - a fixture skill that reads `git.ticketPrefix: CORE-`.
- **Operation model:**
  - locks: taken only after confirmation; a concurrent apply is blocked; a lock whose process has ended is taken over; a live lock older than 15 seconds still blocks; a lock without a record is taken over once older than 15 seconds;
  - runs that end before confirmation (`--dry-run`, exit code 3, no writes, stop) leave the host and AGS unchanged, apart from the run log; a revalidation mismatch releases the locks it took;
  - the digest is stable for equal inputs and changes with any input;
  - a stale `--plan` digest exits 3 and discards decisions;
  - revalidation catches a file changed between plan and apply;
  - apply order: the exclude block before any write under `.tmp/` except the host lock and, when an edited block is restored, the exclude file's backup; prepare's moves before `ags.yaml`;
  - backup renaming and manifest;
  - an interruption after a promotion: the rerun records it without asking and does not duplicate the note.
- **Fault points:** every side-effect boundary has a named fault point, active only when the environment variable `AGS_TEST_FAULT` names it. The command fails there as it would on a failed write: exit code 1, locks released. For each command and each of its points, a test interrupts the run there and asserts: exit code 1; an unchanged `agsVersion`; the rerun result given in 16.1 or 15.4; and, after the rerun, the same final state as an uninterrupted run, apart from backup folders and the run log, with any moved setup in exactly one backup folder. A stage that copies, moves, writes or deletes several files has a point after its first, a middle and its last file, and its fixture gives it at least three files. The points:
  - prepare: after the host lock; after the exclude block; after the manifest is written; after the first, a middle and the last move; before the manifest is marked complete;
  - install: the prepare points, then after the manifest is marked complete; after `ags.yaml`; after the first, a middle and the last managed write; after the AGS block; after the registry;
  - update: after the host lock; with an edited exclude block restored, after its backup and after the block; after the first, a middle and the last backup copy, and after the backup manifest; after the first, a middle and the last promotion, and after the notes; after `ags.yaml`; after the first, a middle and the last managed write; after the first, a middle and the last deletion; after the AGS block; after the registry;
  - version bump: after `CHANGELOG.md`, after `package.json`, and after the commit.
- **Crash after the host lock:** in prepare and in install, on a host whose `.tmp/` git does not ignore yet, a crash variant of that point ends the process without releasing the lock. The test asserts that the lock is left, and that the rerun finds its process ended, removes it, still plans the exclude block, and reaches the same final state as an uninterrupted run.
- **Prepare:**
  - nothing found;
  - root setup moved; nested setup listed and not moved; `--include-nested`;
  - gitignored setup such as `.cursor/rules`; skipped folders (`.git`, `.tmp`, `node_modules`, nested repositories);
  - renaming and manifest;
  - tool configuration reported and not moved; never-touched paths stay (`.cursor/plans/`, `documentation/`);
  - the manifest is written before the first move; an interrupted prepare is continued in the same folder; an entry found at both paths, or at neither, stops the run;
  - confirmation without a terminal;
  - refusals: installed host, interrupted install, AGS root, linked worktree;
  - `.tmp/` created only after confirmation, and excluded only when needed; an ignore rule matching `.agents/` reported.
- **Install:**
  - fresh host; host with setup; `AGENTS.md` created with the block;
  - a host item using an AGS id, selected or not: refused before any write, with the exact rename printed;
  - refused while git ignores `AGENTS.md`, `.agents/` or a file under it;
  - exclude block only when `.tmp/` is not ignored;
  - registry entry; `agsVersion` written last;
  - interrupted before `agsVersion`, then resumed;
  - no commit.
- **Update:**
  - no-op;
  - AGS modifies, adds, deletes and renames files;
  - opt-out deletion after a backup;
  - every classification row of 16.6, with each choice;
  - both the target and the host adding the same path;
  - collision with an id new at T: stopped before any write, in a terminal too, with the rename to `<host id>-<id>` printed; the rerun after the rename proceeds;
  - ignore records: skip, and ask again after a change;
  - promotion not offered when S differs from B, or when Tc differs from B;
  - a T with another major version refused;
  - promotion, release, then the automatic replacement;
  - promotion, then a release without it: asked again;
  - CRLF host files without false changes; binary files;
  - `--dry-run`; exit code 3 with `--plan`, `--decide` and `--decide-all`; "same for all" in a terminal;
  - downgrade refused;
  - registering an unregistered host, and updating a moved host's path.
- **AGS block:**
  - intact: regenerated;
  - edited: restore or stop; added lines moved outside the block leave it intact;
  - missing: restore or stop, with no version advance;
  - malformed: exit 1;
  - index with host rules; a host rule without a description;
  - budget warning.
- **Exclude block:**
  - written only when needed;
  - lines outside the markers preserved;
  - edited: restore or stop; exit code 3 without a terminal;
  - a linked worktree refused.
- **Version:**
  - bump refusals: uncommitted changes, conflict markers, operations in progress, empty notes, failing tests, a latest release that is not an ancestor of HEAD, and `patch` or `minor` with a dropped id, a dropped setting key or a changed setting type;
  - recovery: an untagged release commit gets only its tag from the next bump; an interrupted bump before its commit is refused with the restore command;
  - notes moved and `package.json` updated;
  - commit and annotated tag;
  - hosts printed, none updated;
  - `version note`, and promotion notes not duplicated;
  - "latest" ignores non-release tags such as `v1-final`.
- **Usage recording:**
  - record shape: id, `agsVersion`, hashes;
  - the host lock; no-op when reporting is off;
  - invalid paths and levels; duplicate paths collapsed.
- **Run log:**
  - one line per invocation;
  - `error` for exit codes 0, 1, 2 and 3;
  - the lock; a failed append leaves the exit code unchanged.
- **Snapshot:** contents, manifest, default path, `--out` validation.
- **Skill scripts:**
  - `write-commit-diff` matches the existing `ags diff` tests;
  - `run-checks` matches the existing `ags check` tests;
  - both use the standard library only and run without `ags`;
  - aliases run the host copy, and fail clearly when the skill is not installed.
- **`doctor`:** each check fires on a fixture that violates it, including host notes linked by name, a host note whose skill is not installed, other unlinked local files, host rules without a description, ignored `.agents/` as an error, backup folders without a manifest, an untagged release, a linked worktree, and ledger dispositions.
- **With their features (backlog):** concurrent report collection, third-party symlinks and path traversal, tools, partial host rollout.
- **Manual, in Run 2:** the `.tmp` probe.

## 28. Runs and acceptance

Each run follows plan, execute, review, adjust. A run's plan executes without pauses.

### 28.1 Run 1: the instance refactor and `2.0.0`

Before it starts:

- The GitLab plugin is disabled in Cursor, so no plugin supplies git rules. This was observed on 2026-09-27: its MCP tools and subagent no longer load. The personal git skills and the Layer 0 routing line still apply; they defer to host guidance before Watcher is installed (28.2).
- The last V1 commit is tagged `v1-final` (15.2).

Work, in order:

1. **Track the plan inputs,** in one commit, before any other change:
   - this spec as `docs/v2-spec.md`, edited there from then on;
   - the backlog as `BACKLOG.md`;
   - the meta inventory as `docs/v2-meta-inventory.md`, and the proto-rules as `docs/v3-proto-rules.md`;
   - the items of `.tmp/references/ags-future-work-notes.md` and `ags-raw-notes.md` that `BACKLOG.md` lacks, added to it;
   - `.tmp/references/ags-react-skills.md` deleted, and the direction handoff and the rest of `.tmp/references/` archived;
   - `LEDGER.md`, with its first section: a row for each of these documents and note items (Appendix H, group 6).

   AGS has no remote, and none is added in these runs. Tracking protects the inputs through git history, not against losing the disk; that is accepted.
2. Rewrite the root `AGENTS.md` for working on AGS (section 25).
3. Schemas: catalog, `ags.yaml` and registry, all format 2.
4. The operation model (16.1, 16.2).
5. Prepare, install, update, status, list and unregister; the AGS block, the exclude block, promotion and records.
6. Versioning: `version`, `version note`, `version bump`, and `CHANGELOG.md`.
7. Material: the new core, `tmp-conventions`, `report-usage`, `write-commit-diff`, the `check` script, the six rewritten skills, and the catalog.
8. Usage recording, snapshot, `skills list` and `doctor`.
9. Removal of the V1 machinery, and the `README.md` rewrite.
10. The Phase A ledger section.
11. Tests (section 27), including the fault points.
12. The run log.
13. Release `2.0.0`.

Acceptance:

1. `pnpm test` passes, and `doctor` is clean at the AGS root.
2. None of the V1 machinery in section 25 remains, and no document or skill tells agents to read AGS through an absolute path.
3. On a fixture host, the whole cycle behaves as specified: prepare, install, host edit, update with each choice, promotion, release, and update with the automatic replacement.
4. Every row of the Phase A ledger section is disposed.
5. The run log records each invocation.
6. Tag `v2.0.0` exists, `CHANGELOG.md` has a `2.0.0` entry, and `package.json` says `2.0.0`.
7. The plan inputs of step 1 are tracked in AGS.

### 28.2 Run 2: Watcher, consolidation and the prose pass

Run 2 installs Watcher, consolidates the existing guidance into canonical AGS versions, and updates Watcher to them. It is not a temporary migration around today's AGS content.

**Prerequisite: Layer 0 defers to AGS hosts.** Watcher's install must not begin while the old routing can silently select the personal `ship`. Before step 1:

- In `C:/Cosmos/projects/meta/templates/user-rules.md`:
  - the routing line (line 67) says: when the user says `commit`, `ship` or `rebase onto`, use the repository's `.agents/skills/commit-granular/`, `ship/` or `rebase-onto/` when it exists, and otherwise the personal skill of that name;
  - the same line says that, in a repository with `.agents/ags.yaml`, host guidance is authoritative for repository-specific formats;
  - the standards line (line 30) names the repository's `AGENTS.md` and `.agents/` before `.cursor/rules/` files such as `git.mdc`.
- `meta/audit/scripts/install-layer0.py` installs the change into the cloud User Rules and the local mirror.
- The personal `~/.cursor/skills/ship/SKILL.md` and `~/.cursor/skills/commit-granular/SKILL.md` start with the same rule. They are not deleted: HXP and D2 depend on them until Phase E (28.3).

The acceptance check must pass before step 1 starts:

1. `~/.cursor/rules/00-layer0.mdc` contains the new routing and standards lines, and no longer contains "invoke the personal skill by that name".
2. In a new Cursor chat, the user rules the agent receives contain the new routing line.
3. Both personal skills start with the rule.

**Consolidation rules.** Every relevant variant is input: AGS's current material, the Meta repository, Layer 0, and the D2, HXP and Watcher variants listed in Appendix H. A variant is not authoritative because it is already in AGS; a richer or more current variant elsewhere may win. For each rule or skill with overlapping variants:

1. compare the variants by meaning;
2. write one comprehensive shared AGS version that keeps the useful behavior of every variant, without concatenating repeated or contradictory prose;
3. turn genuine host differences into settings, or into host facts, host notes, host rules or host skills when the behavior is specific to one repository;
4. record every unique concept and its destination in the ledger.

AGS correctness and lifecycle safety take priority over incidental details of any variant, including Watcher's. Settings are added only for differences the variants actually show. Consolidation adds ids and rewrites content, but drops no id or setting key of `2.0.0`, because `2.x` releases cannot (15.4). Content merged from one AGS item into another leaves the first id in place.

**The consolidated `ship`** keeps the capabilities found across its variants, where they apply:

- judge whether the current branch fits the work, and create a branch when the work has none, named from host conventions when the needed facts are available;
- ask when a ticket, a branch name or another required value cannot be inferred;
- determine whether the merge request targets the main branch, an integration branch or another branch;
- commit with the host's subject and body conventions;
- push;
- prepare the merge request title and other useful review material;
- keep Bugbot, or a comparable optional review, where it still applies.

The `2.0.0` `ship`, which only pushes and builds a review link, is interim. Watcher's initial install leaves it disabled.

Work, in order:

1. **Watcher** (Appendix G): the one-time cleanup, including the `.tmp/` entry and the "AGS door" comments in `.cursorignore`; the Claude Code version probe before `CLAUDE.md` moves; prepare; install from the latest release, with `ship` disabled; the interim restore of host guidance, with ledger rows; `doctor` clean.
2. **Round trip,** right after install, while the AGS source still equals Watcher's base: a real Watcher edit to an installed AGS file is promoted, committed in AGS, released as `2.0.x`, and Watcher updates clean with the automatic replacement.
3. **`.tmp` probe,** with Watcher's `.cursorignore` entry already removed: direct read, `@` mention, the built-in search and Grep, terminal search with and without `--no-ignore`, and indexing, in Watcher and in a scratch host whose `.tmp/` is ignored only through the exclude block. The observed results are recorded in `.tmp/records/`, and section 17.5 is corrected to match them.
4. **Consolidation,** under the rules above, driven by Appendix H, with ledger rows, released as `2.x` minor versions:
   - the git skills: the consolidated `ship`; `git-cleanup`; `commit-granular`, as an opt-in AGS skill; branch creation, with the `start-ticket` variants as input. They read `git.mainBranch` and `git.ticketPrefix`. D2 and HXP use identical conventions with `CORE-`, and Watcher uses the same conventions with an empty or custom prefix; exceptions go in host notes. The D2 non-goal covers D2's installation decisions only;
   - every other rule and skill with variants, including the CSS skills, `plan-work`, `write-commit-diff`, and the items behind Watcher's interim host guidance (Appendix G);
   - every `Migrate later` row resolved.
5. **Watcher update** to the consolidated release. First remove or trim the interim host items that consolidation replaced, so that no host item collides with a new AGS id. Then update, enabling `ship` and the other consolidated skills Watcher uses, and confirm that Watcher keeps substantially the useful behavior it had before Run 2.
6. **Prose pass** over AGS: remove contradictions and repetition without losing nuance, with ledger rows for merges and removals. Watcher then updates to the last Run 2 release.

Run 2 ends after the prose pass and Watcher's final update. Its releases are `2.x`.

Acceptance:

1. The Layer 0 acceptance check passed before step 1.
2. Watcher:
   - the prepare backup exists, with a manifest and renamed trigger names;
   - Watcher is at the last Run 2 release, and `doctor` is clean;
   - `ship` is enabled, in its consolidated version;
   - `write-commit-diff` works through its skill script;
   - Cursor lists the installed skills;
   - `.tmp/` is gitignored, and neither `.cursorignore` nor `.cursorindexingignore` lists it;
   - the `.tmp` probe is recorded.
3. The round trip in step 2 happened.
4. AGS holds one consolidated canonical version of each rule and skill that had variants, and Watcher keeps substantially the useful behavior it had before Run 2.
5. Every source in Appendix H has ledger rows, all disposed, and none is `Migrate later`.
6. Every release has notes and passes its tests.

### 28.3 After the two runs

- **Usage-driven additions:** backlog items that real Watcher use shows are needed, each as its own minor release with tests, outside the two runs. The evidence comes from Watcher's usage records and the run log.
- **Phase E:** install on HXP, and on D2 once its decisions are made, with `commit-granular` enabled. Then remove the personal `commit-granular` and `ship` skills and the Layer 0 routing line, so the same names do not exist in two places, and settle the `Backlog` rows filed under Phase E.
- **Content beyond the existing material:** deeper TanStack and Mantine guidance, and further improvement of the consolidated content. It builds on Run 2's canonical versions; it is not where existing variants are first reconciled.
- **Phase F:** more skills, such as a deep-review skill that uses Graphify and Fallow when they are available; tools; third-party imports.
- **V3:** proto-rules, including the state-management and code-quality rules, as `3.0.0` with its own configuration and host migration path.

## 29. Decided

Recorded here so the archived working files never need rereading. The source of each decision is in parentheses.

1. Copy model. Watcher is installed right after the instance refactor, before the Run 2 consolidation. Proto-rules come in V3. (user)
2. Host edits are allowed and reviewed on each AGS run: promote, restore or ignore, with "same for all". (user)
3. Promotion changes AGS only. The host may advance while diverging, and the host file is replaced automatically once a release contains the promotion. (agreement)
4. In `2.0.0`, promotion is offered only when neither the AGS source nor the target release changed the file since the base; three-way promotion comes later. (agreement; tightened in revision 3)
5. No continuation journal. Reruns are idempotent, `agsVersion` is written last, locks prevent concurrent runs, and decisions are bound to a plan digest. (user, agreement)
6. One kind of host; no `mode` setting. (user)
7. `ags check` stays, with V1 semantics; `checks.*` are `package.json` script names. (user, approved by default)
8. `ags diff` stays as an alias. A skill never replaces a deterministic script. (user)
9. The host `ags snapshot` stays; `snapshot source` is deferred. (user)
10. Usage recording is minimal and host-side; collection is deferred. (user)
11. The ledger is tracked in AGS. (user)
12. The GitLab plugin is disabled, and the AGS git conventions govern in AGS hosts. Until Phase E removes them, the personal git skills and the Layer 0 routing line defer to host guidance (item 29). (user)
13. `commit-granular` becomes an opt-in AGS skill for D2 and HXP. The user-level copies are replaced once those hosts have it. (user)
14. A JSON Lines run log is built at the end of Run 1. (user)
15. The first draft's section 30 defaults are accepted. Where the agreement changed one, the agreement's version stands. (user)
16. Prepare shows its plan and requires confirmation. Root setup is moved by default, nested setup only on confirmation, and the cleanup prompt reports before moving. (agreement)
17. AGS block edits: restore or stop; the user moves an edit worth keeping outside the block. Refusing the block means unregistering. (agreement; carry-over dropped in revision 3)
18. Exclude block: fixed markers; restore or stop when edited; exit code 3 without a terminal. (agreement)
19. Release: commit first; bump makes only the release commit and tag; hosts update in separate runs. (agreement)
20. Host guidance structure, and the precedence line. (agreement)
21. The `.tmp` readability contract; no harness-specific ignore file lists `.tmp/`. (agreement; widened from `.cursorignore` in revision 4)
22. Git standardization, as part of the Run 2 consolidation; the scope of the D2 non-goal; the `CORE-` fixture. (user, agreement)
23. The third-party contract, for when import arrives (section 31). (agreement)
24. Probe the Claude Code version before removing Watcher's `CLAUDE.md`. (agreement)
25. Run 1 ends at the `2.0.0` release; Run 2 starts with Watcher. The Run 1 ledger covers the plan inputs of step 1 and the Phase A rewrites. (agreement; plan inputs added in revision 4, item 46)
26. Run 2 ends after the prose pass and Watcher's final update. Usage-driven additions need days of real use, so they come afterwards, as separate minor releases. (user)
27. The backlog is its own live file, not part of this spec. (user)

Revision 3, from Sol's second review:

28. The plan inputs are tracked in AGS at the start of Run 1: the spec, the meta inventory and the proto-rules in `docs/`, and the backlog as `BACKLOG.md`. Appendix H completes the Run 2 sources. (Sol)
29. Before Watcher is installed, the Layer 0 routing line and the personal `commit-granular` and `ship` skills defer to the host's skill of the same name and to host guidance. `2.0.0`'s `ship` and `git-cleanup` stay free of formats. (Sol accepted the correction: the conflict comes from the personal `ship`, the personal `commit-granular` and the routing, not from the `2.0.0` skills; the gate is item 42)
30. Failure boundaries: the exclude block first; prepare's moves before `ags.yaml`; a prepare manifest written before the first move; recovery for an interrupted bump; a fault-point test at every side-effect boundary. There is still no general journal. (Sol)
31. Locks are taken after confirmation, and revalidation runs under them. A run that ends before confirmation writes only its run-log line. (accepted by Sol)
32. `--discard-existing` is removed; prepare never deletes. (Sol)
33. Hosts are main worktrees: lifecycle commands refuse linked worktrees, submodules and separate git directories. No containment exception is needed; worktree hosts are a backlog item. (accepted by Sol)
34. V2 updates never cross a major version; a major release brings its own configuration and host migration path. `version bump patch|minor` refuses dropped ids, dropped setting keys and changed setting types, and no bump runs on a HEAD that lacks the latest release. (Sol, with the release gates added; confirmed by the user)
35. Restored items never keep an AGS id. Watcher's `css-theme-tokens` is restored as the host skill `watcher-css-theme-tokens`, then consolidated into the AGS skill with a Watcher host note (Appendix G). (Sol; resolution set in revision 4)
36. A host note is linked by its name; other local files need a link. (Sol)
37. A host where git ignores `AGENTS.md` or `.agents/` is unsupported: `doctor` reports an error, and install and update refuse. (Sol)
38. Section 30, item 22 is accepted. (Sol)

Revision 4, the user's final decisions, after Sol accepted revision 3's pushback:

39. Host rules and host skills use natural ids, with no required prefix. A collision with an AGS id stops install or update before anything is written, and prints an exact rename to `<host id>-<id>`; the user renames the item and reruns. Automatic renaming is a backlog item. (user; replaces revision 3's prefix recommendation)
40. Run 2 is canonical consolidation, not a temporary migration. Every variant in AGS, the Meta repository, Layer 0 and the hosts is input, and being in AGS does not make a variant authoritative. Run 2 ends with the consolidated versions in AGS, Watcher updated to them, every source disposed, and no `Migrate later` rows (28.2). (user)
41. The consolidated `ship` keeps the capabilities found across its variants; the `2.0.0` `ship` is interim. Watcher's initial install leaves AGS `ship` disabled, and Watcher enables it once the consolidated release exists, within Run 2. Other opt-in skills are enabled at the initial install only where their `2.0.0` version, with an interim host note, keeps what Watcher does today. (user; the rule for other opt-in skills is a local choice)
42. The Layer 0 edits happen before Run 2, and their acceptance check must pass before Watcher's install begins. The personal skills stay until Phase E. (user)
43. `.tmp/` stays gitignored in AGS and in every host, and no harness-specific ignore file lists it. Built-in search is not guaranteed to reach it; the Run 2 probe records what it observes. (user)
44. AGS has no remote in these runs. Tracking protects the plan inputs through git history, not against losing the disk. (user)
45. Out of V2: automatic worktree handling, automatic renaming of host items, third-party imports, tools management and proto-rules. (user)
46. The plan inputs handled at Run 1 step 1 get their ledger rows then, in the ledger's first section, so that no note is left in `.tmp/` without a disposition. (local choice)
47. Watcher's `graphify` skill and Meta's `graphify.mdc` rule go to the backlog's tools entry instead of being removed, so their usage rules survive Graphify's removal from Watcher. (local choice)

After revision 4's acceptance:

48. A lock is stale only when the process it records has ended, or, without a readable record, once it is older than 15 seconds. Age never breaks a recorded lock, because V2 holds locks through terminal prompts, applies and the bump's tests. This replaces V1's age rule. (user)

## 30. Defaults introduced in revision 2

The user accepted items 1 to 21 on 2026-09-27, except item 1, which the user reversed. Item 22 is accepted too (section 29, item 38). Revisions 3 and 4 adjusted items 2, 19, 20 and 22; their own decisions are section 29, items 28 to 48.

1. Reversed: the backlog stays its own live file (section 31).
2. `--plan <digest>` is the only confirmation without a terminal. `--yes` is gone.
3. `ags reporting on|off|status` is removed; `reporting` is edited in `ags.yaml`.
4. `check` becomes a skill-local script with `ags check` as its alias, the same pattern as `write-commit-diff`, so checks work without `ags`.
5. Aliases run the host's installed copy of the script.
6. The catalog drops `path` and `kind`. Soft rules carry their `description` in frontmatter, like host rules; strong rules have no frontmatter.
7. Setting types are `string` and `boolean`. `string-list` waits until a setting needs it. `required` and `default` are mutually exclusive.
8. The exclude block is written only when `.tmp/` is not otherwise ignored, and AGS never removes it.
9. The core drops V1's line "`.agents/local/` is host-owned. Do not overwrite, delete, or reformat it", to fit the precedence line into five lines. The ledger records the removal.
10. The `<!-- AGS: migrate later -->` marker is dropped; the ledger tracks parked items.
11. In the run log, `error` is `true` for exit codes 1 and 2 only.
12. The ledger is `LEDGER.md` at the AGS root, and `v1-final` is its source reference.
13. `--enable` and `--disable` also work on update.
14. An installed host that is not registered is registered through an update plan item, and a moved host's path is updated the same way.
15. The snapshot default path is `.tmp/ags/snapshots/<stamp>.zip`.
16. All locks live under `.tmp/ags/locks/` in their repository: `host` in the host, `ags` and `runs` in AGS.
17. Pre-release tags are not supported. Releases match `vX.Y.Z` only.
18. `git-cleanup` joins the Phase A rewrite list.
19. The user-level `commit-granular` is retired in Phase E, not during Run 2, because D2 and HXP use it until then.
20. The Run 2 round trip happens right after the Watcher install, before the consolidation changes AGS files.
21. Appendix H of the first draft is removed. Its matrix is now the table in 16.6.
22. At the start of Run 1, the backlog moves to a tracked `BACKLOG.md` at the AGS root, next to `LEDGER.md`, so ledger rows marked `Backlog` point at an entry git keeps.

## 31. Backlog

The backlog is its own live file, `.tmp/plans/2026-09-27-ags-backlog.md`. At the start of Run 1 it moves to a tracked `BACKLOG.md` at the AGS root, next to `LEDGER.md` (28.1, step 1).

- Nothing in it is part of V2 unless it moves into this spec.
- After Run 2, usage-driven additions pick from it (28.3).
- Ledger rows with the disposition `Backlog` point at its entries.

## Appendix A: AGS block

The begin marker carries the AGS version and the first 12 hex characters of the SHA-256 of the LF-normalized content between the markers.

```markdown
<!-- AGS:BEGIN 2.0.0 1f2e3d4c5b6a -->
## AGS

- Host settings are in `.agents/ags.yaml`. Use values exactly as written; if a value a task needs is missing, ask the user.
- Host guidance wins on facts and formats: `AGENTS.md` outside this block, host rules, and `.agents/local/` override AGS defaults. AGS safety constraints never yield.
- Before using a skill, read `.agents/local/<skill-name>.md` if it exists; it refines the skill for this repository.
- AGS installs its skills and rules into `.agents/skills/` and `.agents/rules/`. Keep repository-specific differences in host guidance; any edit to an AGS file is shown to the user at the next AGS run.
- If the `ags` command is available, record guidance usage after substantive work with the `report-usage` skill.

Read a rule before work that matches its condition:

- `.agents/rules/tmp-conventions.md`: creating, moving, or archiving files under `.tmp/`.
- `.agents/rules/state-topology.md`: changing stores, selectors, or data flow between features.
<!-- AGS:END -->
```

- The five bullets are the V2 `rules/core.md`.
- The index lists the AGS soft rules in catalog order, then the host rules by id. `state-topology` is an illustrative host rule with a natural id. If AGS later adds the id `state-topology`, the update stops and prints the rename to `watcher-state-topology` (16.6).

## Appendix B: Watcher `ags.yaml` (illustrative)

```yaml
format: 2
host: watcher
agsVersion: 2.0.0
reporting: true
skills:
  enabled: [git-cleanup, check]
  disabled: []
rules:
  enabled: []
  disabled: []
git:
  # Trunk branch that feature branches start from and merge into.
  mainBranch: main
checks:
  # package.json script that runs the type check. Empty means not configured.
  type: typecheck
  # package.json script that runs the linter. Empty means not configured.
  lint: lint
  # package.json script that checks formatting without writing files. Empty means not configured.
  prettier: ""
local: {}
```

The selection and the script names are illustrative; install records what Watcher actually enables and runs. `ship` is absent on purpose: the initial install leaves it disabled, and Watcher enables it with the consolidated release (28.2). `git.ticketPrefix` appears once a selected skill reads it, which happens with the consolidated git skills.

## Appendix C: Host note example (illustrative)

`.agents/local/ship.md` in a hypothetical host:

```markdown
# ship: notes for this repository

- Open merge requests against `release/next` when the ticket is labeled `hotfix`.
```

## Appendix D: Host settings wording for skills

```markdown
## Host settings

Read these keys from `.agents/ags.yaml` at the repository root before acting. Use each value exactly as written; never guess one. If a required key is missing, stop and ask the user.

- `git.mainBranch` (required): the trunk branch that feature branches start from and merge into.
- `git.ticketPrefix`: prefix for ticket ids in branch names and merge request titles. With `CORE-`, a branch is `CORE-1234-short-slug`. If the key is empty or missing, leave the ticket part out: `short-slug`.
```

In the body, steps refer to "the prefix from Host settings" rather than repeating the rule. For a skill with a script:

```markdown
Run `node .agents/skills/check/scripts/run-checks.mjs`, passing `--type`, `--lint` and `--prettier` with the non-empty values of `checks.type`, `checks.lint` and `checks.prettier`. If all three are empty, say that no checks are configured.
```

## Appendix E: Prepare lists

The lists live in code, in `discovery.mjs`. Extending them is a minor change.

Root setup means an entry below at the repository root. Nested setup means the same names in subfolders.

### E.1 Setup: moved by prepare

Files:

- `AGENTS.md`, `AGENTS.override.md`;
- `CLAUDE.md`, `CLAUDE.local.md`;
- `GEMINI.md`;
- `.cursorrules`, `.windsurfrules`;
- `.github/copilot-instructions.md`;
- `.clinerules`, which may be a file or a folder.

Folders:

- `.agents/`;
- `.cursor/rules/`, `.cursor/skills/`, `.cursor/commands/`;
- `.claude/skills/`, `.claude/commands/`, `.claude/agents/`;
- `.codex/skills/`, `.codex/agents/`;
- `.github/instructions/`, `.github/prompts/`, `.github/agents/`, `.github/chatmodes/`;
- `.windsurf/rules/`.

### E.2 Tool configuration: reported, never moved

- `.cursor/mcp.json`, `.cursor/hooks.json`, `.cursor/environment.json`, `.cursor/worktrees.json`;
- `.cursorignore`, `.cursorindexingignore`;
- `.mcp.json`, `.vscode/mcp.json`;
- `.claude/settings.json`, `.claude/settings.local.json`;
- `.codex/config.toml`;
- `.gemini/settings.json`.

### E.3 Never touched

Everything else, including:

- `.cursor/plans/` and `.cursor/records/`;
- documentation folders;
- hooks, scripts and CI files;
- source code;
- `.gitignore` and `.gitattributes`.

The cleanup prompt handles line-level leftovers in shared files.

### E.4 Renaming in backups

- Every path segment that starts with `.` gets a leading `_`. For example, `.agents/skills/x` becomes `_agents/skills/x`, and `.cursorrules` becomes `_cursorrules`.
- The entry files `AGENTS.md`, `AGENTS.override.md`, `CLAUDE.md`, `CLAUDE.local.md` and `GEMINI.md` get `.bak` appended.
- `manifest.json` maps every backup path to its original path.

## Appendix F: Cleanup prompt printed by prepare and install

```text
AGS moved this repository's previous agent setup to <backup path>. manifest.json there lists every file; file and folder names were changed so no agent tool loads them.

Find what the backup missed, and report before changing anything:

1. Search the repository, including gitignored files but skipping .git, node_modules, and .tmp, for leftovers of the old setup: references to the moved paths, agent or tool entries in .gitignore, .gitattributes, .cursorignore, and editor settings, package.json scripts, CI files, and local git config entries.
2. Report each finding with its path (and line, for lines inside shared files), what it belongs to, and what you propose: move the file into the backup, remove the line, or leave it. Also report the tool-configuration files AGS listed and whether each still makes sense, and what in the backup looks worth restoring as host guidance: AGENTS.md outside the AGS block, host rules in .agents/rules/, or host notes in .agents/local/.
3. Wait for the user to confirm. Then move each confirmed file into the same backup folder, keeping its relative path and renaming it the way the backup does: add a leading "_" to any path segment that starts with ".", and add ".bak" to AGENTS.md, AGENTS.override.md, CLAUDE.md, CLAUDE.local.md, and GEMINI.md. Add each move to manifest.json. Record each removed line, with its file and line, in traces.md in the backup folder.
4. Do not touch documentation, source code, or project infrastructure. If you are unsure whether something belongs to the old setup, list it instead of moving it.
```

## Appendix G: Watcher one-time cleanup and install

This procedure is specific to Watcher and is not an AGS feature. HXP and D2 get their own one-time lists when their turn comes.

Before prepare:

1. Move `.cursor/plans/` into `.tmp/plans/`, and `.cursor/records/` into `.tmp/records/`, keeping the existing names. Delete `.cursor/debug-*.log`.
2. Move `fallow-recursive-dead-code-cleanup-report.md` from the repository root into `.tmp/records/`.
3. Remove Graphify:
   - delete `graphify-out/`;
   - remove the graphify block from `.gitignore`;
   - remove the `graphify-out/graph.json merge=graphify` line from `.gitattributes`;
   - unset the local git config `merge.graphify.driver`.

   The skill folder leaves with the `.agents/` backup.
4. Remove the repository-level Fallow install:
   - `yarn remove fallow`;
   - delete `.fallow/`;
   - remove its `.gitignore` line;
   - delete `.tmp/fallow-dupes/` and `.tmp/fallow-recursive-cleanup/`;
   - keep `.fallowrc.json`, dropping or repointing its `$schema`, which points into `node_modules`.
5. In `.cursorignore`:
   - remove the `.tmp/` line and the "AGS door" comments;
   - remove the `tmp/` line if no `tmp/` folder exists.
6. Remove the `.gitignore` line for `.agents/guidance/local.md`.
7. Probe Claude Code with `claude --version`. At 2.1.277 or later, it reads `AGENTS.md` once `CLAUDE.md` is gone. If it is older, update it first. If it is not installed, record that. Prepare then moves `CLAUDE.md` with the rest of the setup.

Then:

1. Run `ags host prepare`, review and confirm its plan, then give the printed prompt to an agent and confirm its proposals.
2. Run `ags host install --set git.mainBranch=main --enable <opt-in skills> --set checks.type=<script> ...`. Enable an opt-in skill only where its `2.0.0` version, with the interim host note of step 3, keeps what Watcher does today. Leave `ship` disabled: its `2.0.0` version only pushes and builds a review link (28.2).
3. Restore from the backup as interim host guidance, adding a ledger row for every concept in it, and never under an AGS id (10.3). A row is `Host` when the material is only about Watcher, and `Migrate later` when it has variants elsewhere, for the consolidation (28.2, step 4):
   - host facts into `AGENTS.md`, outside the block: the repository profile, the `documentation/` pointers, and the known pitfalls, including "do not run `fallow fix --production` on this repo";
   - Watcher's git conventions (`.agents/guidance/git-conventions.md`: `Type: Scope, summary`, a required body, no Jira), as the host rule `git-conventions`, so that the deferring personal skills follow Watcher's format until the consolidated git skills exist;
   - Watcher's variants of AGS skills (`css-authoring-conventions`, `css-cleanup`, `git-cleanup`, `plan-work`, `ship`, `write-commit-diff`), which all differ from AGS's. For each skill the install enables or installs by default, what differs becomes an interim host note, `.agents/local/<id>.md`. The `ship` variant gets no host note, because `ship` stays disabled; the personal `ship` covers Watcher until the consolidated release. Every variant is a consolidation input. The `.ps1` diff scripts are `Removed`: the `write-commit-diff` script's `commits` and `range` modes replace them;
   - Watcher's `css-theme-tokens` normalizes Watcher's own theme variables in `src/client/style/variables.scss`, while the AGS skill of that id covers `@platform/ui-library` tokens. It is restored as the host skill `watcher-css-theme-tokens`, with its `name` changed. The consolidation then merges the variants (AGS's `css-theme-tokens`, Meta's `css-tokens` and Watcher's) into one AGS `css-theme-tokens`. That skill holds the shared normalization rules and keeps the `@platform/ui-library` facts as their own part. Watcher enables it, its token sources become the host note `.agents/local/css-theme-tokens.md`, and `watcher-css-theme-tokens` is removed. Only a behavior the shared skill cannot hold stays in the renamed host skill;
   - the `graphify` skill: `Backlog`, under the tools entry, since Graphify leaves Watcher (step 3 of "Before prepare");
   - guidance only about Watcher, such as the diagnostics mode, the server layout and the state records: host rules with natural ids and a description, or files in `.agents/local/` linked from `AGENTS.md`;
   - guidance with variants elsewhere, such as the code idioms, the state topology and the candidates list: host rules with natural ids, such as `state-topology`, or linked local files, as interim copies;
   - the records in `.agents/archive/` and the machine-local notes from `.agents/guidance/local.md`: into `.tmp/records/`, as `Host` rows;
   - the generated adapter `.cursor/rules/00-watcher-generated.mdc` and the scripts in `.agents/scripts/`: `Removed` where AGS supersedes them, as the meta inventory's rows explain, and otherwise `Host`;
   - the stewardship files: decided with their meta inventory rows.
4. Run `ags host update` to index the restored host rules, then `ags doctor --route .`, and commit the Watcher changes.
5. Do the round trip (28.2, step 2) and the `.tmp` probe (28.2, step 3).

Moving `CLAUDE.md` also makes Claude Code fall back to `AGENTS.md` in Watcher.

## Appendix H: Run 2 sources

Every source below gets ledger rows: group 6 at Run 1 step 1, the others in Run 2. The meta inventory, tracked as `docs/v2-meta-inventory.md`, reviewed only the `.agents/` folders of D2, HXP and Watcher; this appendix is the complete list. For each rule or skill with variants, every variant is a consolidation input (28.2), AGS's own included.

1. **Watcher's backup,** restored as in Appendix G.
2. **D2 and HXP** (`C:/Cosmos/projects/work/designer2` and `C:/Cosmos/projects/work/hxpoc`): their `.agents/` material, as rowed in the meta inventory, and their `.cursor/rules/` files where these state conventions that AGS consolidates, such as git conventions. They are read, never changed. Material that only D2 or HXP uses, and Watcher does not, is `Backlog` under the Phase E entry; for example `smoke-save`, `smoke-branch-merge`, their state records and forms, `linting-and-formatting`, and the afterFileEdit hooks.
3. **The Meta repository** (`C:/Cosmos/projects/meta`):
   - `templates/ags/shared/`: Meta's versions of AGS and D2 skills (`css-authoring-conventions`, `css-cleanup`, `css-tokens`, `git-cleanup`, `plan-work`, `ship`, `start-ticket`, `write-commit-diff`, `react-state-transitions`, `smoke-save`, `smoke-branch-merge` and `windows-browser-use`), and its scripts;
   - `templates/rules/`: the Layer 1 rules `plans`, `code-hygiene`, `react-state`, `react-ui` and `graphify`;
   - `templates/ags/pins/` and `templates/ags/consumers/`: per-host adoption records, used as evidence for dispositions.
4. **Layer 0,** where it overlaps AGS:
   - the routing and standards lines of `templates/user-rules.md`, installed as the cloud User Rules and as `~/.cursor/rules/00-layer0.mdc`;
   - the Windows browser rules: the "Windows browser automation" section of `00-layer0.mdc`, and `~/.cursor/rules/01-no-chrome-protocol.mdc`;
   - the personal skills `commit-granular`, `ship`, `rebase-onto` and `css-audit` in `~/.cursor/skills/`.

   The rest of Layer 0, such as tone, context compaction, verification and session habits, stays user-level and is not a source.
5. **AGS's current rules and skills,** as one variant of each item.
6. **AGS's own notes,** handled at Run 1 step 1:
   - the items of `.tmp/references/ags-future-work-notes.md` and `ags-raw-notes.md`, reconciled into `BACKLOG.md`;
   - the V1 spec, `ags-migration-sources.md` and `.tmp/decisions/ags-v1-softened-decisions.md`, archived as V1 history that this spec and `v1-final` supersede (`Removed`);
   - `ags-react-skills.md` (below).

Known dispositions:

- `.tmp/references/ags-react-skills.md` is a byte-for-byte copy of the V1 spec, with no React content: `Removed`, deleted at Run 1 step 1 with its ledger row. The React material is D2's `react-state-transitions`, a consolidation input.
- `windows-browser-use` launches Chrome with a remote-debugging port. It overlaps and contradicts Layer 0's browser rules, which forbid `chrome://` URLs and browser-use CDP probes unless remote debugging is already active, and prefer Playwright. Meta's `pins/watcher.yaml` defers the skill for Watcher. The skill and its overlap with Layer 0 are `Backlog` under the Phase E entry.
- The personal skills and the routing line are consolidation inputs: `commit-granular` and `ship` for the git skills; `rebase-onto` against the git skills and `css-audit` against the CSS skills, each ending as `AGS` or `Backlog`. Retiring the personal copies, and retiring or rewording the routing and standards lines, is `Backlog` under Phase E.
- Watcher's `css-theme-tokens`: the interim host skill `watcher-css-theme-tokens`, then consolidated into AGS `css-theme-tokens` with a Watcher host note (Appendix G). The meta inventory's "keep host-only" is superseded, because it would keep an AGS id.
- Graphify's skill (Watcher's) and rule (Meta's `templates/rules/graphify.mdc`): `Backlog`, under the tools entry.
- Every other item of every group gets its own disposition.
