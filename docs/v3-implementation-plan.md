# AGS V3 Implementation Plan

Status: execution plan derived from `docs/v3-spec.md`. The specification owns product and architecture decisions; this plan owns sequencing, repository changes, migrations, tests, rehearsals, and release mechanics. A route change updates this plan. A product-boundary change updates the specification first.

Created: 2026-09-28. Revised: 2026-09-29.

## 1. Baseline and constraints

Verified at plan creation:

- the stable repository is `C:\Cosmos\projects\ags` on `master` at release `v2.1.2`;
- no Git remote is configured;
- `package.json` is version `2.1.2` and `pnpm test` is the complete suite;
- the global installer writes shims that contain an absolute path to one checkout's `scripts/ags.mjs`;
- this automation shell has `PNPM_HOME` at `C:\Users\Leandro\AppData\Local\pnpm` but currently resolves no `ags` shim, so execution must install and verify the stable shim explicitly;
- `hosts.yaml`, `reports/`, and `.tmp/` are checkout-local and gitignored;
- `scripts/lib/host.mjs:updateTarget` refuses a cross-major update;
- V2 update backs up overwritten host files, writes `agsVersion` last, and has injected fault points; and
- V2's plain `ignore` record may retain a removed managed file in its discovery path, which is insufficient for retired V3 ids.

Recheck these facts before implementation and again before cutover. The plan assumes a sibling standalone clone at `C:\Cosmos\projects\ags-v3`; change every occurrence together if another path is chosen.

Internal milestones are evidence gates, not supported intermediate products. Do not point the global shim or a live host at the V3 clone before final cutover.

## 2. Establish the isolated V3 checkout

First complete and commit the specification, this plan, backlog dispositions, proto-rule status clarification, and ledger rows in the stable repository. Run:

```powershell
Set-Location 'C:\Cosmos\projects\ags'
pnpm test
node .\scripts\install-global.mjs --bin 'C:\Users\Leandro\AppData\Local\pnpm'
& 'C:\Users\Leandro\AppData\Local\pnpm\ags.ps1' doctor
git status --short
git log -1 --oneline
```

Record the resulting commit as the V3 base. Then create an independent clone, not a linked worktree, so release tags remain isolated until cutover:

```powershell
git clone --no-hardlinks 'C:\Cosmos\projects\ags' 'C:\Cosmos\projects\ags-v3'
Set-Location 'C:\Cosmos\projects\ags-v3'
git switch -c codex/ags-v3
pnpm install --frozen-lockfile
node .\scripts\install-global.mjs --bin 'C:\Cosmos\projects\ags-v3\.tmp\scratch\v3-bin'
```

Use `C:\Cosmos\projects\ags-v3\.tmp\scratch\v3-bin\ags.ps1` for every AGS command in the clone. Use the explicit stable shim path when a session has not inherited `PNPM_HOME`. Confirm that the stable shim names `C:\Cosmos\projects\ags\scripts\ags.mjs` and the temporary shim names the clone; a bare `ags` command, when resolved, must still use the stable V2 checkout.

Do not copy the stable `hosts.yaml` into the development clone. Rehearsals create a temporary registry there from disposable hosts.

## 3. Inventory and catalog freeze

### 3.1 Evidence records

Create dated records under `.tmp/records/` for representative Watcher, HXP, and D2 cases. Each record should capture the task and code, observed mechanism, intended semantics or ambiguity, candidate decision, counterexample, portability, proposed tier, and disposition. These records are evidence, not active guidance.

Cover at least:

- correct and incorrect ownership boundaries;
- useful and cosmetic extractions;
- determinate and indeterminate async outcomes;
- stale completion and cancellation;
- empty result versus request failure;
- local lifecycle code versus a genuine resource concern;
- modern CSS that removes script and CSS that should remain conventional; and
- a small fix where broader cleanup would be scope expansion.

### 3.2 Concept and overlap map

Map all 51 proto-rules and affected V2 instructions against:

- `rules/core.md`, `rules/code-idioms.md`, and `rules/state-topology.md`;
- `skills/react-state-transitions/` and its references;
- CSS skills and their references;
- `skills/plan-work/` and the proposed `write-spec`, `manage-backlog`, and `spec-first-plan` boundaries;
- relevant Watcher, HXP, and D2 host material; and
- existing ledger and backlog dispositions.

For each concept choose exactly one active home, host home, backlog entry, merge destination, or removal rationale. Do not draft final wording until overlapping owners are resolved.

### 3.3 Freeze outputs

Before changing ids, freeze and review:

1. the final catalog: ids, tiers, install classes, triggers, includes, params, and settings;
2. the generated-index descriptions for every soft rule;
3. skill frontmatter descriptions as routing text;
4. the inclusion graph and install classes for the planning-artifact skills;
5. a V2-to-V3 transformation manifest with one row per affected id;
6. Watcher's target selection and planned HXP/D2 selections; and
7. every `.agents/local/<id>.md` destination for changed ids.

The transformation manifest should be a tracked supporting document if it remains useful after release; otherwise keep the working table under `.tmp/records/` and move its durable decisions into the spec and ledger. It must include columns for source releases, source id/path, result, target id/path, selection transform, ignored/promoted record transform, host-note transform, and disposition.

Resolve every open spec decision due at catalog freeze. Update `docs/v3-spec.md` before implementing any changed product boundary.

## 4. Write and validate V3 material

### 4.1 Expected repository surface

Depending on the frozen catalog, create or revise:

- `catalog.yaml`;
- `rules/core.md` for the always-visible task-scope statement;
- `rules/code-idioms.md` to replace the 300-line extraction instruction with a scoped inspection signal;
- `rules/state-topology.md` and the new ownership, async, resource, and workspace-operation rules;
- `skills/react-state-transitions/SKILL.md` and only the references still needed for React-specific mechanics;
- the architecture-review skill or the selected existing review skill;
- `skills/css-authoring-conventions/SKILL.md` and a reference only if real cases need compatibility detail;
- `skills/plan-work/SKILL.md`, preserving ordinary execution planning as the default and adding only the artifact-selection boundary;
- new opt-in `skills/write-spec/SKILL.md` and `skills/manage-backlog/SKILL.md`;
- new opt-in `skills/spec-first-plan/SKILL.md`, with `write-spec` and `manage-backlog` as catalog companions;
- `templates/agents-block.md` only if the frozen core/index design requires it; and
- `LEDGER.md` for every rewrite, merge, removal, migration, or deferral.

Do not create a single proto-rule dump. Rules contain compact decisions; procedural tracing belongs in skills; detailed evidence and counterexamples belong in references; repository facts remain in hosts. Start the three new planning-artifact skills as concise self-contained `SKILL.md` files. Add references or scripts only after a concrete case demonstrates progressive-disclosure or deterministic-mechanics value.

The target catalog direction is:

- `plan-work`: `always`, no companion requirement;
- `write-spec`: `opt-in`;
- `manage-backlog`: `opt-in`; and
- `spec-first-plan`: `opt-in`, including `write-spec` and `manage-backlog`.

`plan-work` may conditionally name `manage-backlog` when it is installed, but an ordinary plan does not load it preemptively. `spec-first-plan` owns the combined workflow; it must not duplicate the full bodies of its companion skills.

### 4.2 Per-item review loop

For each rule or skill:

1. apply the admission test from the specification;
2. state its trigger and nearest non-trigger;
3. verify its authorization mode and stop condition;
4. compare it with existing material and remove duplicates;
5. test it against one accepted and one rejected case; and
6. inspect its index or description text as the agent's entry point.

Run focused validation after each coherent group:

```powershell
node --test test/catalog.test.mjs test/material.test.mjs test/links.test.mjs test/blocks.test.mjs test/selection.test.mjs test/skills-list.test.mjs
& 'C:\Cosmos\projects\ags-v3\.tmp\scratch\v3-bin\ags.ps1' doctor
```

Run the complete `pnpm test` at every milestone exit and before each commit; do not invoke AGS source scripts directly.

## 5. Implement cross-major migration

### 5.1 File design

The expected implementation is:

- a new `scripts/lib/migrations.mjs` for discovering, validating, and composing migration declarations;
- a deterministic V3 declaration under `migrations/`, named for its target version or migration boundary;
- changes in `scripts/lib/host.mjs` to replace the unconditional major-version refusal with migration-path resolution;
- narrow changes in `scripts/lib/config.mjs`, `scripts/lib/catalog.mjs`, registry handling, or operation planning only where the frozen transformations require them; and
- tests in `test/update.test.mjs`, `test/faults.test.mjs`, plus a focused migration suite if that keeps the matrix readable.

Do not introduce a framework before the V3 declaration makes the required interface concrete.

### 5.2 Migration declaration

The V3 migration declaration must name:

- its accepted source releases and target release;
- id retain/rewrite/rename/split/merge/remove operations;
- selection transforms for enabled, disabled, detected, and included material;
- setting additions, removals, renames, defaults, and type constraints;
- managed path moves and deletions;
- ignored and promoted record transforms;
- host-note moves or explicit decision points; and
- any config or catalog format change.

Validate declarations when loaded: ids and paths must be contained and unique, source ranges cannot overlap ambiguously, every changed id must have a disposition, and every declared target must exist in the target catalog.

### 5.3 Planning and classification

Refactor `updateTarget` so it:

1. validates the installed and requested release;
2. continues choosing the latest same-major release by default for V2 behavior;
3. permits a requested cross-major target only when one complete migration chain exists; and
4. refuses downgrade, unknown releases, gaps, or ambiguity with an actionable message.

During update inspection, load the installed release's catalog and source as V2 already does, then apply the migration declaration before resolving the target selection and classifying host files. The printed plan must expose every config, selection, managed-file, note, record, and block consequence.

For a retired id, do not offer V2's ordinary `ignore` outcome at its old discovery path. Offer only outcomes defined by the manifest:

- accept the migration, with the old content backed up before removal or replacement;
- explicitly convert retained content to a collision-free host-owned id and update its frontmatter/indexing consequences; or
- stop and leave the host at V2.

A renamed id may carry a note automatically only when the mapping is one-to-one, the destination does not exist, and the plan shows the move. Splits, merges, collisions, and semantically ambiguous notes require a decision.

### 5.4 Atomicity and resumption

Choose observable-state resumption or a journal before writing the apply phase. Preserve the existing operation contract:

- acquire AGS and host locks before mutation;
- back up every overwritten or deleted host file, including notes being moved;
- never write outside the verified AGS or host root;
- write and verify managed material before the version marker;
- update registry records consistently with their file decisions;
- write `agsVersion` last; and
- print an exact rerun command on interruption.

Add fault points before and after every new externally visible migration side effect. A rerun must either complete the same reviewed plan or reject it as stale and produce a new plan; it must never apply a second semantic transform.

## 6. Test matrix

### 6.1 Migration fixtures

Use the actual annotated V2 tags as source truth. Build a host fixture for each of `2.0.0`, `2.0.1`, `2.1.0`, `2.1.1`, and `2.1.2`; add any V2 patch released before freeze.

Across the matrix cover:

- every retained, rewritten, renamed, split, merged, and removed id;
- enabled, disabled, detected, included, and absent selections;
- unchanged, edited, deleted, missing, binary, and CRLF managed files;
- one-to-one, ambiguous, colliding, and absent host notes;
- current and stale ignored/promoted registry records;
- obsolete-path cleanup when a user would otherwise choose ignore;
- preserved YAML comments and ordering;
- edited or missing AGS block;
- config format unchanged and changed, if applicable;
- missing migration, ambiguous migration, and downgrade refusal; and
- clean rerun, doctor, status, and selection after completion.

### 6.2 Fault and concurrency tests

Extend `test/faults.test.mjs` so every added side effect is interrupted once in normal-error mode and at the destructive-process boundary where crash injection is meaningful. Assert the host version remains V2 until the final marker, backups are complete for already-touched files, and the documented rerun reaches exactly the intended V3 state.

Retain stale-digest and shared-lock tests. Add contention between a V3 host migration and version/reporting operations if the migration touches AGS registry state.

### 6.3 Material and routing tests

Extend catalog, material, link, block, selection, and skills-list tests for final ids and descriptions. Prefer structural assertions over keyword tests for judgment-heavy guidance.

The generated block fixture must show the intended rule routes without exceeding the existing line budget. Skill-list output must expose enough description to select the correct workflow without embedding the workflow itself.

## 7. Selective-loading evaluation

Prepare four small, realistic tasks in disposable host copies:

1. an ordinary one-file bug fix unrelated to CSS or architecture;
2. a CSS feature where a modern supported feature is useful;
3. a shared-state change with real authority and lifecycle questions; and
4. an explicitly requested architecture review.

For each task:

- start from the installed generated `AGENTS.md` and normal harness discovery;
- capture the files the agent actually opens, including host notes and references;
- record the routing reason for each read;
- mark irrelevant full guidance reads and missing relevant reads;
- assess task-scope behavior and the quality of the resulting decision; and
- revise descriptions, index conditions, includes, or tier placement when routing is wrong.

Do not turn read counts into quotas. A visible index line or skill description is not equivalent to loading the target file. Acceptance requires explained relevance and no unresolved recurring irrelevant route.

Run a second routing evaluation for planning artifacts:

1. a plain request to plan a multi-file implementation;
2. a request for a normative product specification;
3. a request to triage a mixed list of future ideas;
4. an explicit request for a thorough spec followed by an implementation plan; and
5. an intentionally ambiguous request where choosing the artifact without clarification would materially change the deliverable.

Verify that only the plain plan uses `plan-work` by default, the specialized descriptions select their own workflows, the combined workflow reads the spec companion before deriving the plan, backlog handling is read only when a real deferral arises even though it is an available companion, and the ambiguous case asks one concise artifact question.

## 8. Disposable host rehearsals

### 8.1 Rehearsal environment

Use copies under a newly created temporary directory, never the live Watcher, HXP, or D2 paths. Give the V3 clone a temporary `hosts.yaml` that registers only those copies. The temporary V3 shim created in section 2 is the only command used.

Before copying a host, record whether its working tree contains relevant uncommitted host guidance. A plain Git clone represents committed state only; if a rehearsal needs uncommitted guidance, create a filesystem copy that excludes `.git` and attach it to a fresh disposable repository, documenting that choice.

### 8.2 Watcher migration rehearsal

In the disposable Watcher copy:

1. establish the selected V2 source version and representative host edits, ignored records, promoted records, and notes;
2. run a dry plan for `--to 3.0.0` and review every transformation;
3. run the migration with the intended decisions;
4. verify `AGENTS.md`, `.agents/ags.yaml`, managed rules and skills, local notes, registry records, and backups;
5. run V3 doctor and status against the copy;
6. run Watcher's configured repository checks; and
7. rerun update to prove idempotence.

Repeat with injected interruptions and with a retired-id host edit that tests the no-obsolete-ignore rule.

### 8.3 HXP and D2 fresh-install rehearsals

Prepare each disposable host from its actual repository facts. Install V3 fresh with its planned selection and settings, then verify:

- repository facts remain in host guidance;
- shared AGS files contain no host-specific paths, commands, aliases, or product policy;
- generated indexes and skill descriptions route the shared-state and CSS tasks correctly; and
- doctor, status, and configured host checks pass.

Live installation timing remains separate and does not block proving the V3 package.

### 8.4 Cutover rehearsal

Create a disposable stable AGS clone with a nonempty `hosts.yaml`, representative `reports/runs/`, and `.tmp/records/`. Give it a shim in another temporary bin. Rehearse the exact section 10 sequence and establish:

- the local state hashes and inventory are unchanged;
- the shim remains V2 until the checkout advances;
- the fetched release commit is a fast-forward descendant;
- the missing-tag completion path creates only `v3.0.0`;
- doctor, version, host list, and tests work after advancement; and
- returning to the recorded V2 commit before any host update restores a usable V2 command without losing local state.

## 9. Release-candidate freeze

Resolve all rehearsal findings, then perform one final pass:

1. remove duplicate, vague, speculative, and scope-expanding wording;
2. rerun the concept disposition and transformation manifest;
3. verify there are no `Migrate later` outcomes for V3 sources;
4. update `README.md`, `AGENTS.md`, `CHANGELOG.md`, `BACKLOG.md`, and `LEDGER.md`;
5. run `pnpm test` and V3 doctor;
6. commit all ordinary work on `codex/ags-v3`;
7. add and review release notes with the temporary V3 shim; and
8. confirm the clone is clean.

Create the release commit and tag inside the independent clone:

```powershell
Set-Location 'C:\Cosmos\projects\ags-v3'
& '.\.tmp\scratch\v3-bin\ags.ps1' version
& '.\.tmp\scratch\v3-bin\ags.ps1' version bump major
git status --short
git log -1 --oneline --decorate
git rev-parse 'v3.0.0^{commit}'
```

This tag remains isolated in the standalone clone. Do not fetch it into the stable repository during the checkout switch; let the stable missing-tag recovery path create and verify its own tag on the imported release commit.

## 10. Stable cutover

Run only after user approval of the final release and cutover.

### 10.1 Preflight and local-state backup

From a fresh PowerShell session:

```powershell
$stableRoot = 'C:\Cosmos\projects\ags'
$v3Root = 'C:\Cosmos\projects\ags-v3'
$stableAgs = 'C:\Users\Leandro\AppData\Local\pnpm\ags.ps1'
$cutoverBackup = Join-Path ([IO.Path]::GetTempPath()) ('ags-v3-cutover-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $cutoverBackup | Out-Null
Set-Location $stableRoot
git status --short
$stableBase = (git rev-parse HEAD).Trim()
Set-Content -LiteralPath (Join-Path $cutoverBackup 'stable-base.txt') -Value $stableBase
if (Test-Path -LiteralPath 'hosts.yaml') {
    $registryHash = (Get-FileHash -LiteralPath 'hosts.yaml' -Algorithm SHA256).Hash
    Copy-Item -LiteralPath 'hosts.yaml' -Destination $cutoverBackup
}
if (Test-Path -LiteralPath 'reports') { Copy-Item -LiteralPath 'reports' -Destination $cutoverBackup -Recurse }
if (Test-Path -LiteralPath '.tmp\records') { Copy-Item -LiteralPath '.tmp\records' -Destination $cutoverBackup -Recurse }
Get-Content -LiteralPath $stableAgs
& $stableAgs version
& $stableAgs doctor
& $stableAgs host list
```

Stop if tracked files are dirty, the current command does not target `$stableRoot`, doctor fails, or the local-state copy fails. Ignored machine-local state is expected and must not be removed to make the checkout look clean.

### 10.2 Import and advance the release commit

Fetch only the V3 branch into a temporary remote-tracking ref, not its tags:

```powershell
Set-Location $stableRoot
git fetch --no-tags $v3Root 'codex/ags-v3:refs/remotes/v3/release'
$v3Commit = (git rev-parse 'refs/remotes/v3/release').Trim()
git merge-base --is-ancestor $stableBase $v3Commit
if ($LASTEXITCODE -ne 0) { throw 'V3 release is not a descendant of the stable base.' }
git show -s --format='%H %s' $v3Commit
git merge --ff-only $v3Commit
```

The last command is the switch: the existing global shim still points to `$stableRoot`, so it starts using V3 when the fast-forward completes. Do not run a host command between the fast-forward and the release-completion step.

### 10.3 Complete the tag and verify state

```powershell
Set-Location $stableRoot
& $stableAgs version bump major
$tagCommit = (git rev-parse 'v3.0.0^{commit}').Trim()
$headCommit = (git rev-parse HEAD).Trim()
if ($tagCommit -ne $headCommit) { throw 'v3.0.0 does not identify the stable release commit.' }
if (Test-Path -LiteralPath 'hosts.yaml') {
    $afterRegistryHash = (Get-FileHash -LiteralPath 'hosts.yaml' -Algorithm SHA256).Hash
    if ($afterRegistryHash -ne $registryHash) { throw 'hosts.yaml changed during cutover.' }
}
& $stableAgs doctor
& $stableAgs version
& $stableAgs host list
pnpm test
git status --short
```

Because the imported commit is already `Release: 3.0.0` and the tag is absent locally, `version bump major` must take the supported completion path and create only the missing tag. Stop if it proposes a new version or any content change.

### 10.4 Recovery boundaries

- **Before `git merge --ff-only`:** fix the V3 clone or preflight and rerun; stable V2 is unchanged.
- **After fast-forward, before the tag:** rerun `ags version bump major`; it must complete the missing tag only.
- **Unexpected V3 environment failure before a host update:** ensure tracked files are clean, then run `$recordedBase = (Get-Content -Raw -LiteralPath (Join-Path $cutoverBackup 'stable-base.txt')).Trim()` followed by `git switch --detach $recordedBase`. The global shim again resolves V2 files at the same path. Preserve the V3 `master` ref for diagnosis; do not reset it. Restore machine-local files from `$cutoverBackup` only if their verification failed.
- **Defect in the isolated `3.0.0` candidate:** do not rewrite the release commit or tag. Commit the correction in the V3 clone, add a note, release `3.0.1`, and cut over to that descendant.
- **After any live host reaches V3:** do not use the checkout fallback as a host downgrade. Use the host's update backup and a reviewed corrective migration or release.

## 11. Live rollout and observation

After stable cutover passes and with separate user approval:

1. run `& 'C:\Users\Leandro\AppData\Local\pnpm\ags.ps1' host update --host watcher --to 3.0.0`;
2. review every migration decision, especially changed ids, notes, and retired paths;
3. apply, then run `& 'C:\Users\Leandro\AppData\Local\pnpm\ags.ps1' doctor --route 'C:\Cosmos\projects\alotropico\watcher'`, `& 'C:\Users\Leandro\AppData\Local\pnpm\ags.ps1' host status --host watcher`, and Watcher's configured checks;
4. review and commit only the resulting Watcher changes in Watcher;
5. observe real tasks for routing, false positives, task-scope expansion, and missing host facts; and
6. update HXP and D2 one at a time only after their deferred host decisions are ready.

Record post-release problems as concrete cases. Correct safety or migration defects with patch releases. Consider new guidance only when evidence passes the same admission test used for V3.

## 12. Completion checklist

- [ ] Spec decisions due at catalog freeze are settled.
- [ ] All proto-rule and affected V2 concepts have one disposition.
- [ ] Final catalog, entry-point descriptions, transformation manifest, and host-note map are reviewed.
- [ ] Active material passes admission, overlap, counterexample, and task-scope review.
- [ ] `plan-work`, `write-spec`, `manage-backlog`, and `spec-first-plan` have distinct descriptions, triggers, outputs, and non-triggers.
- [ ] A plain plan produces an execution procedure without a separate specification by default.
- [ ] The spec-first workflow completes a self-contained spec before deriving its separate plan and routes genuine deferrals to backlog handling.
- [ ] Direct migrations pass from every released V2 source version.
- [ ] Retired ids cannot remain as ignored discoverable guidance.
- [ ] Fault, lock, stale-plan, backup, rerun, and version-last tests pass.
- [ ] Code-task and planning-artifact routing evaluations pass without unresolved irrelevant routes.
- [ ] Watcher migration, HXP/D2 fresh install, and stable-cutover rehearsals pass in disposable copies.
- [ ] Full tests and doctor pass in the V3 clone.
- [ ] Release notes and repository docs agree.
- [ ] Stable local registry and records are backed up and verified across cutover.
- [ ] Stable `v3.0.0` tag identifies the exact checked-out release commit.
- [ ] Stable doctor, version, host list, and full suite pass before Watcher changes.
- [ ] Watcher is healthy on V3 before any further live rollout.
