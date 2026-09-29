# AGS V3 Specification

Status: normative specification for AGS V3. The released V2 code, `README.md`, and `AGENTS.md` remain authoritative for current behavior until `3.0.0` is released. `docs/v3-implementation-plan.md` derives execution detail from this specification and must not redefine it.

Created: 2026-09-28. Revised: 2026-09-29.

## 1. Purpose and authority

V2 made AGS a safe release and host-distribution system. V3 uses that foundation to expand and improve the guidance itself: ownership and boundaries, state and asynchronous correctness, resource and API boundaries, explicit architectural review, modern CSS, and concise workspace operations.

V3 is one coordinated jump from the V2 release line to `3.0.0`. Planning, implementation, testing, and correction may take many commits and days, but AGS does not publish or install partial V3 states merely to make intermediate work useful.

This document is self-contained for V3 commitments. Its design inputs include released V2 behavior, the 51 exploratory concepts in `docs/v3-proto-rules.md`, current AGS material, and reviewed cases from Watcher, HXP, and D2. Those sources supply evidence; they do not override this specification. `BACKLOG.md` holds deferred possibilities and inactive candidates.

Normative terms:

- **Must** and **must not** define release requirements.
- **Should** defines the expected design unless recorded evidence justifies another choice.
- A **decision** is settled V3 direction.
- A **working boundary** is required in purpose but still open in exact id, wording, or file placement.
- A **candidate** is inactive. Recording it does not cause an agent to discover, load, or follow it.

## 2. Product principles

1. **Content is the objective.** Lifecycle mechanics enter V3 only where content delivery, migration, validation, or safe cutover requires them.
2. **One jump, with internal iteration.** V2 remains the live system until the complete V3 release is ready.
3. **Task-shaped loading.** Guidance is organized by what is being touched or done. An ordinary task must not load a general architectural doctrine.
4. **Lean active guidance.** An instruction is active only when it prevents an observed mistake, expresses a deliberate preference, protects safety, or defines a necessary workflow.
5. **Task scope does not expand.** Discovering or loading guidance does not authorize unrelated cleanup, modernization, review, or refactoring.
6. **Evidence precedes architecture.** Findings distinguish observed mechanism, intended semantics, confidence, consequence, and authority to change behavior.
7. **Judgment remains with the agent.** Deterministic code validates structures, performs mechanical operations, and records facts; it does not make product or architectural judgments.
8. **Shared principle, local fact.** AGS owns portable guidance. Hosts own repository structure, commands, framework choices, browser policy, aliases, legacy boundaries, and product rules.
9. **One concept, one tier.** Strong rules, soft rules, skills, references, host guidance, and code must not restate the same instruction.
10. **Repair wording before adding rules.** A corrective rule is not added merely to compensate for earlier vague or overbroad guidance.

## 3. Delivery and cutover contract

### 3.1 Single release transition

- The next planned capability release is `3.0.0`.
- Intermediate V3 commits are internal construction states, not supported releases and not candidates for live-host installation.
- Watcher remains on the latest V2 release until `3.0.0` is tagged and the stable AGS checkout has completed its cutover checks.
- HXP and D2 may supply evidence and disposable rehearsals without receiving partial V3 installations.
- A critical V2 safety or correctness repair may still receive a patch release, but it must not contain partial V3 content.

### 3.2 Isolation while V2 remains live

V3 implementation must occur in a checkout isolated from the stable AGS checkout used by the global `ags` shim. The stable checkout and shim continue serving V2 throughout V3 development.

The isolation design must account for two repository facts:

- the installed shim points to a concrete checkout's `scripts/ags.mjs`; and
- linked Git worktrees share refs and tags while ignored state such as `hosts.yaml` is checkout-local.

Therefore a worktree may isolate files but must not be treated as release-tag isolation or as a carrier of the stable checkout's local registry and records. Rehearsal commands use an explicitly temporary shim that points only to the isolated V3 checkout or a disposable clone.

### 3.3 Required cutover behavior

The release cutover must provide all of the following behavior; exact commands and ordering belong in the implementation plan:

1. All ordinary V3 work is committed and the release candidate satisfies the content, migration, rehearsal, and full-suite gates before the stable checkout changes.
2. The exact `3.0.0` release commit is known and is a descendant of the recorded stable V2 base.
3. The stable checkout advances cleanly to that exact commit without reconstructing or replacing its machine-local state.
4. `hosts.yaml` and retained local records are inventoried and backed up before the switch, then verified unchanged afterward. Development-checkout state must not silently replace them.
5. The global shim begins using V3 only when its target checkout advances to the V3 release commit. If the checkout path changes, the installer is rerun deliberately.
6. The annotated `v3.0.0` tag resolves to the stable checkout's release commit before any live host update.
7. The stable checkout passes AGS doctor, version, registry, and full-suite checks before Watcher is offered the migration.
8. Live hosts update one at a time. Watcher is first; HXP and D2 wait for their host decisions and are not part of proving the cutover itself.

### 3.4 Interruption and recovery

Cutover has explicit recovery boundaries:

- Before the stable checkout advances, interruption leaves the global shim and all live hosts on V2.
- After the checkout advances but before the tag is present, rerunning the release completion path must create or verify only the missing tag.
- If the advanced checkout cannot operate and no host has migrated, the recorded clean V2 commit remains a usable checkout target; recovery preserves `hosts.yaml` and records and does not use a destructive reset.
- A live host migration advances its version only after all managed writes, deletions, block changes, registry changes, and verification succeed. Rerunning from an interruption must be safe.
- After a host reaches V3, AGS does not invent a downgrade. Recovery uses that migration's backups or a subsequent corrective release.

## 4. Guidance architecture

### 4.1 Tiers

V3 retains the V2 tier model:

| Tier | Responsibility |
| --- | --- |
| Strong rule | A constraint needed in nearly every task, within the small AGS block budget |
| Soft rule | Guidance tied to the kind of code or state being touched |
| Skill | A workflow tied to what the user asks the agent to do |
| Reference | Detailed evidence rubrics, examples, and counterexamples loaded by a skill |
| Host guidance | Repository facts, commands, product policy, stack choices, and local refinements |
| Deterministic code | Validation and mechanical work that should not depend on agent judgment |

References deepen a workflow; they do not duplicate its headline rules. Host guidance may refine portable defaults but cannot weaken AGS safety constraints.

### 4.2 Working target boundaries

These are working ids until catalog freeze. Their responsibilities are V3 commitments; exact merging and naming remain open where stated.

| Working item | Tier | Direction | Responsibility |
| --- | --- | --- | --- |
| `core` | Strong rule | Always | Precedence, settings, local refinements, task scope, managed ownership, and usage feedback within the line budget |
| `tmp-conventions` | Soft rule | Always | Existing `.tmp/` behavior |
| `workspace-operations` | Soft rule | Always | Concise, conditional search and pure filesystem-operation guidance |
| `code-idioms` | Soft rule | Opt-in | General craft after deeper ownership, async, and resource concerns move to coherent homes |
| `state-topology` | Soft rule | Opt-in | Authority, readers, writers, lifecycle, and persistence for shared-state changes |
| `ownership-boundaries` | Soft rule | Opt-in | Ownership, meaningful extraction, reuse, contracts, and policy placement |
| `async-state` | Soft rule | Opt-in | Valid states, evidence, uncertainty, retry, staleness, cancellation, and guarded transitions |
| `resource-boundaries` | Soft rule | Opt-in | Service, resource, feature, presentation, normalization, caching, invalidation, and API error semantics |
| `react-state-transitions` | Skill | Opt-in | Explicit Review, Plan, or Implement workflow for React ownership and transition defects |
| `architecture-review` | Skill | Opt-in | Requested evidence-based review across ownership, async, resource, reuse, and lifecycle boundaries |
| `css-authoring-conventions` | Skill | Opt-in | Existing authoring guidance plus V3's touched-code modern CSS policy |
| `plan-work` | Skill | Always | Default execution planning without creating a separate specification; may route genuine deferrals to backlog handling |
| `write-spec` | Skill | Opt-in | Create or revise a self-contained normative specification: commitments, constraints, open decisions, and acceptance evidence, without execution procedure |
| `manage-backlog` | Skill | Opt-in | Maintain a deduplicated inactive inventory with a likely home, deferral reason, and evidence for reconsideration |
| `spec-first-plan` | Skill | Opt-in | For explicitly thorough design work, complete the specification first and then derive a separate repository-grounded implementation plan |

V2 material whose responsibility remains coherent should keep its id. A major release is not permission for gratuitous renaming.

### 4.3 Entry points and selective loading

The generated `AGENTS.md` index and skill descriptions are routing surfaces, not places to hide the full guidance. Each soft rule and skill must make clear:

- what work activates it;
- nearby work that does not activate it;
- whether it authorizes review, planning, implementation, or a subset;
- which host facts may refine it; and
- when the agent must stop for product or architectural direction.

Broad labels such as "code quality," "cleanup," and "best practices" are insufficient triggers. An index entry may be visible without its target file being read. An irrelevant rule, skill, reference, or host note being opened during a representative task is a loading defect to investigate.

Artifact words are routing signals:

- an unqualified request for a **plan** routes to `plan-work` and does not imply a separate specification;
- a request for a **specification**, product contract, or normative requirements routes to `write-spec`;
- a request to **defer**, triage future work, or maintain a backlog routes to `manage-backlog`; and
- a request for a **thorough spec and plan**, or to design commitments before implementation sequencing, routes to `spec-first-plan`.

When the wording could reasonably select more than one artifact and the choice would materially change the result, the agent may ask whether the user wants an execution plan, a specification, a deferred inventory, or a spec-first plan. It should not ask when the requested artifact is already clear.

### 4.4 Active-guidance admission

Every proposed instruction must answer:

1. Which observed mistake, safety concern, or deliberate preference does it address?
2. What concrete decision changes when it is followed?
3. What is a legitimate counterexample?
4. Is it portable, stack-specific, or host-specific?
5. Is its proper home guidance, workflow, reference, host fact, or mechanical validation?
6. Does existing material already cover it?
7. Can shorter or more precise wording avoid follow-up corrective rules?

An instruction that cannot answer the first two questions does not enter active material. Trivial and redundant candidates are dropped rather than archived automatically.

### 4.5 Task-local scope

- Apply guidance to code written or changed for the requested task.
- Inspect surrounding code only as needed for correctness, ownership, and consistency.
- A loaded skill does not authorize whole-file cleanup, broad extraction, architecture migration, CSS modernization, or repair of nearby debt.
- New CSS direction applies to new or task-touched styles and markup. Established surrounding CSS may remain unchanged.
- A requested review may report broader findings but does not authorize implementation.
- An explicitly requested refactor may widen the affected surface only as far as needed to establish its target invariant.

This constraint must be visible in always-loaded guidance. Individual skills may narrow it but must not duplicate it.

## 5. Content requirements

### 5.1 Ownership, reuse, and boundaries

V3 guidance must help agents:

- place state, constants, effects, policy, and presentation mapping with the narrowest correct owner;
- distinguish values a parent truly controls from authoritative context a consumer can obtain directly;
- keep consumer policy beside the consumer while moving only stable domain or resource semantics upward;
- require an extraction to create coherent owners and a smaller, more meaningful contract;
- detect controller objects, options bags, contexts, and wrappers that merely hide the same oversized communication surface;
- reuse code only where behavior, ownership, and lifecycle align; and
- accept bounded duplication when it is more honest than a premature shared abstraction.

The guidance must compare contracts before and after a proposed boundary. Size alone does not justify extraction.

### 5.2 State and asynchronous truth

V3 guidance must cover:

- explicit valid states and atomic transitions;
- externally meaningful truth rather than request implementation phases;
- known success, known failure, and indeterminate outcomes;
- retries that resolve remaining uncertainty without repeating a mutation that may already have completed;
- stale or superseded work losing authority;
- synchronous event guards where rendered disabled state is too late;
- structured cancellation and cleanup;
- operation identity where uncancellable workflows may overlap; and
- effects as external synchronization rather than derived-state repair or indirect event handling.

It must preserve legitimate multi-stage workflows, multiple setters in one synchronous transition, and local lifecycle code. It must not reduce these judgments to bans on effects, booleans, or loading flags.

### 5.3 Service, resource, feature, and API boundaries

V3 guidance must distinguish:

- service ownership of I/O mechanics, endpoint contracts, validation, cancellation support, and invariant normalization;
- resource-layer ownership of identity, cache, freshness, deduplication, cancellation, invalidation, and observation when a resource layer exists;
- feature ownership of selection, interaction state, messages, controls, and presentation policy;
- transport facts from consumer policy;
- valid empty results from failed requests; and
- one operation with an explicit policy option from genuinely separate contracts.

It must not force a feature-local query framework merely to remove a small effect. Actual framework choice, version, aliases, API boundaries, and repository policy remain host facts.

### 5.4 React review and refactoring

`react-state-transitions` remains an explicit procedural workflow. V3 must preserve:

- separate Review, Plan, and Implement authorization;
- mechanism confidence, semantic confidence, and priority as separate judgments;
- false-positive checks and explicit ambiguity or product-decision outcomes;
- the smallest invariant-preserving target model; and
- tests demonstrating the invariant in Implement mode.

Portable ownership and async defaults move to their soft-rule homes. React-specific tracing, evidence, and transformation mechanics remain in the skill or its references.

### 5.5 Modern CSS

For new and task-touched work, V3 guidance must:

- prefer logical properties when the dimension is logically block or inline and the host does not require a physical side;
- prefer CSS over JavaScript when CSS expresses the behavior more simply and maintainably;
- consider relational selectors, container queries, and anchor positioning when they remove unnecessary script or coupling;
- verify the exact feature and variant against the host's browser policy;
- use current Chrome, Firefox, and Safari as the shared default when the host defines no other policy; and
- avoid routine JavaScript fallbacks once the selected feature is supported across that target, unless product or host requirements call for one.

The guidance must not prescribe habitual declarations without a demonstrated layout need. Broader modernization requires an explicit refactor request.

### 5.6 Workspace operations

V3 adds only a compact portable default:

- prefer a native filesystem move, rename, or copy for a pure filesystem operation instead of recreating content;
- verify the result and update affected references;
- prefer `rg` for file listing and text search when available, then use the next suitable tool; and
- make commands conditional on the operating system and available tools.

Optional navigation tools may accelerate a task that benefits from them. Their output is evidence to verify, not a finding by itself.

### 5.7 Architecture review

Deep architecture review is activated by an explicit review or refactor request, not by ordinary code editing. Its workflow must:

1. establish scope and authorization;
2. inventory candidate owners, state, effects, dependencies, resource identities, policies, and contracts within that scope;
3. trace each actionable finding through the real flow;
4. separate fact, policy, inference, ambiguity, and product decision;
5. treat diagnostic signals as prompts for relevant inspection rather than violations;
6. compare before-and-after contracts for proposed boundaries;
7. report findings by consequence and confidence, including rejected candidates when useful; and
8. stop before implementation when the request authorizes review or planning only.

### 5.8 Diagnostic signals

Numeric size and count signals invite inspection only when a requested review or refactor covers the unit, or when the signal is relevant to the current defect. Crossing a signal during a small fix must not launch an architecture inventory or widen the task.

When inspection is authorized, the response is qualitative: identify responsibilities and coherent owners, compare contracts, and reject a split that only moves lines. Generated code, declarations, fixtures, static data, and deliberate re-export barrels are excluded from mechanical counts.

The V2 `code-idioms` wording that treats roughly 300 lines as a soft extraction cap must be revised. In V3, that number may prompt inspection of a file already under substantive work, but it is not a violation or an automatic extraction order.

### 5.9 Specifications, plans, and deferred inventories

V3 must preserve the distinctions demonstrated by its own design records.

**Ordinary execution plan.** `plan-work` remains the default planning workflow. A plan translates an understood objective into ordered work, likely files, risks, decisions, verification, and a done condition. It may record assumptions and consult or update an existing backlog when a real deferral appears, but it does not create a separate specification by default. Its current durable-plan location and lifecycle remain unless host guidance or the user chooses another location.

**Specification.** `write-spec` defines what a system or change must achieve and why: purpose, authority, terminology, commitments, constraints, unresolved product or architecture decisions, and acceptance evidence. It must be self-contained for its commitments. Detailed command sequences, fixture inventories, phase exits, and release choreography belong in a derived plan or supporting record unless they themselves define required behavior.

**Deferred inventory.** `manage-backlog` keeps inactive possibilities outside active instructions and normative specifications. It deduplicates against existing entries, drops trivial or redundant ideas, and preserves a worthwhile candidate only with its proposal, likely future home, reason for deferral, and evidence or condition for reconsideration. Moving an item into a specification or active material removes its merely-deferred status.

**Spec-first thorough plan.** `spec-first-plan` is used when the user explicitly asks for both artifacts or when a large product or architecture effort clearly requires normative commitments before procedure. It completes or revises the specification first, then derives a separate repository-grounded plan. The plan may sequence files, commands, migrations, tests, rehearsals, and release work, but it must not become a competing source of product decisions. A changed implementation route changes the plan; a changed commitment changes the specification. Relevant deferrals go through `manage-backlog` rather than becoming negative inventory in the spec.

The spec-first workflow need not force an extra user turn when the decisions are already clear. It pauses for direction when an unresolved choice would materially change the specification or when the user requested a review gate between the artifacts.

The three specialized skills begin as concise, self-contained workflows. References or deterministic helpers are added only when real use demonstrates repeated conditional detail or mechanical work worth extracting.

## 6. Deferred-guidance discipline

Inactive candidates must remain outside files agents normally load. `BACKLOG.md` is the deferred register. A candidate worth preserving states:

- what it proposes;
- its likely home if activated;
- why it is deferred; and
- the recurring failure, preference, or evidence that would justify reconsideration.

Candidates must not survive as comments inside active material or as negative inventory in this specification. When evidence promotes a candidate, its product decision enters this specification and its wording enters the appropriate material. Otherwise it stays deferred or is dropped.

## 7. Catalog and host migration

### 7.1 Direct V2 upgrade support

V3 must directly migrate a host from every released V2 version available when the V3 catalog freezes. At this specification's date those versions are `2.0.0`, `2.0.1`, `2.1.0`, `2.1.1`, and `2.1.2`. Any later V2 patch released before freeze joins the required source matrix.

A host must not be required to update through an intermediate V2 release merely to reach V3. Downgrades remain unsupported.

### 7.2 Transformation manifest

Before implementation changes an id or selection, V3 freezes a reviewed manifest containing:

- every retained, rewritten, removed, renamed, split, and merged V2 id;
- every new id, tier, install class, companion relation, and setting;
- source and destination managed paths;
- selection behavior for each source state;
- handling for registry records and ignored or promoted files;
- the destination of every host-owned note associated with a changed id; and
- the concept-ledger disposition and rationale.

Reusing an id is valid only when capability and trigger remain substantially the same. A change after freeze updates the manifest, migration fixtures, and this specification when it alters a product boundary.

### 7.3 No silent loss or obsolete discovery

- No migration may silently discard a host edit, selection, ignored record, promoted record, or host-owned note.
- Every removed, renamed, split, or merged id must define what happens to all of its managed files, host selection, and `.agents/local/<id>.md` note.
- An ambiguous split or merge stops for an explicit decision rather than guessing where a note belongs.
- A plain `ignore` decision must not leave guidance under a retired AGS id or discovery path beside its replacement. Retaining such content requires an explicit conversion to a non-colliding host-owned id/path or relocation outside discovery; otherwise it is backed up and removed.
- Managed files continue to use the conservative host-edit classification. Cross-major migration is not an overwrite channel.

### 7.4 Migration execution invariants

- A major transition runs only when AGS has a complete migration path from the installed release to the target.
- Migration code is deterministic Node 20+ ESM, standard-library only, and offline.
- The plan shows configuration, selection, block, managed-path, note, and registry consequences before confirmation.
- Plan digests, locks, backups, containment, stale-plan rejection, and `agsVersion`-last behavior remain in force.
- Interruption is safely rerunnable from observable state or a deliberately chosen journal. The choice is settled before implementation.
- Config and catalog format numbers change only for schema changes, not to match product major version.

## 8. Acceptance evidence

### 8.1 Content evidence

Each active concept must be supported by a real or replayable accepted case, a counterexample, or a deliberate portable preference. Review records must identify the decision changed by the guidance, its legitimate exception, and whether the result belongs in shared or host material.

Evaluation asks whether the guidance changes a useful decision, rejects false positives, respects task scope, routes to the correct tier, and can be shorter without losing the behavior. Usage counts alone are not acceptance evidence.

### 8.2 Selective-loading task matrix

The installed V3 material must be exercised through the generated `AGENTS.md` index and the actual skill descriptions. For each task, record what the agent discovered, what it opened, why it opened it, and any irrelevant full guidance read. Success is qualitative; V3 does not prescribe an arbitrary maximum read count.

| Task | Expected relevant route | Loading behavior to establish |
| --- | --- | --- |
| Ordinary one-file fix | Always-visible constraints and only the rule or skill genuinely implicated by the file and defect | No architecture-review workflow, CSS material, or unrelated async/resource reference is opened merely because code is being edited |
| CSS feature | CSS skill, its host refinement when present, and only companions needed by the feature | Modern CSS guidance applies to new or touched styles without triggering whole-file modernization or architecture review |
| Shared-state change | State-topology plus the ownership or async material justified by the actual flow | The agent reads authority and lifecycle guidance without opening CSS or broad review material |
| Explicit architecture review | Architecture-review and only the supporting rules/references needed for the requested scope | Broader inspection is allowed, findings remain evidence-based, and review does not become implementation |

An index or description that routinely sends these tasks to irrelevant material must be rewritten even when every individual guidance sentence is good.

Planning artifacts have their own routing matrix:

| Request | Expected route | Behavior to establish |
| --- | --- | --- |
| "Plan this implementation" | `plan-work` | Produces an execution procedure; no separate spec or backlog sweep appears without a task reason |
| "Write the specification" | `write-spec` | Produces normative commitments and acceptance evidence while keeping detailed execution elsewhere |
| "Triage these ideas for later" | `manage-backlog` | Deduplicates and preserves only actionable deferred candidates; it does not activate them |
| "Produce a thorough spec and implementation plan" | `spec-first-plan`, with its spec and backlog companions available | Completes the spec first, then derives a separate plan and records only relevant deferrals |
| Materially ambiguous artifact request | Clarification before choosing a specialized workflow | Asks which artifact the user intends instead of silently producing the wrong one |

### 8.3 Mechanical and migration evidence

Acceptance must establish:

- catalog, id, frontmatter, link, include, parameter, template-syntax, line-budget, and generated-block validity;
- fresh V3 installation;
- direct migration from every supported V2 release;
- every transformation-manifest outcome, including notes, selections, ignored records, and retired discovery paths;
- preserved config comments and order where applicable;
- host edits, missing and binary files, and line-ending behavior;
- every migration interruption boundary, stale plan, lock contention, rerun, and version-last behavior;
- clean `doctor` and status after install and migration; and
- a passing complete test suite.

### 8.4 Host and cutover evidence

- Watcher supplies the representative cross-major rehearsal in a disposable copy.
- HXP and D2 supply fresh-install and host-policy-separation evidence in disposable copies or fixtures.
- Rehearsals use a temporary V3 shim and registry and do not mutate a live host.
- The release cutover is rehearsed with a disposable stable checkout that contains checkout-local registry and record state.
- The rehearsal proves state preservation, exact-commit advancement, missing-tag completion, shim targeting, and the pre-host-update recovery boundary.

## 9. Release criteria

V3 is ready for `3.0.0` only when:

1. Every proto-rule concept and affected V2 concept has exactly one durable disposition.
2. Every active instruction passes the admission test and has a precise trigger or always-visible justification.
3. Task-local scope is always visible without being repeated throughout the catalog.
4. The AGS block and strong-rule budgets remain valid unless an explicit V3 decision changes them.
5. Ownership, async truth, resource boundaries, React transitions, modern CSS, workspace operations, and architecture review have coherent non-overlapping homes.
6. Active material contains no deferred candidate or commented-out future rule.
7. The target catalog and transformation manifest are complete and reviewed.
8. The code-task and planning-artifact routing matrices demonstrate relevant discovery and expose no unresolved irrelevant-loading pattern.
9. Every supported V2 release migrates directly to V3 without silent loss or obsolete discoverable guidance.
10. Disposable Watcher, HXP, D2, and cutover rehearsals satisfy their required evidence.
11. Migration interruption, rerun, locking, backup, digest, and version-last tests pass.
12. The full suite passes.
13. `README.md`, `AGENTS.md`, `CHANGELOG.md`, `BACKLOG.md`, `LEDGER.md`, the spec, and the implementation plan agree.
14. The stable checkout and shim pass post-cutover checks before any live host update.
15. There is one capability release transition: the final `3.0.0` release.

## 10. Settled decisions

1. V3 is primarily a content expansion and improvement, with lifecycle work limited to migration and safe delivery.
2. V3 is delivered as one coordinated major-version jump; internal phases do not promise useful or installable states.
3. V2 remains live while V3 is built in isolation.
4. The proto-rules are exploratory inputs to partition and test, not installed material.
5. Guidance stays lean, selectively loaded, and task-local.
6. Numeric diagnostic signals invite relevant inspection; they are not violations or automatic refactoring orders.
7. Modern CSS applies to new and touched work under a verified browser policy.
8. Workspace-operation guidance remains concise and conditional.
9. Deferred candidates live outside active guidance and outside this specification's product inventory.
10. `3.0.0` includes an explicit cross-major migration with direct support from every released V2 version at catalog freeze.
11. A retired id cannot survive as ignored, discoverable obsolete guidance beside its replacement.
12. The stable checkout's local registry and records survive cutover unchanged.
13. Ordinary planning produces an execution procedure by default; specifications, deferred inventories, and spec-first thorough plans are distinct V3 skills with discriminating entry points.
14. `spec-first-plan` is an opt-in content workflow, not the deferred machine-readable resumable-plan experiment.
15. The working ids in section 4.2 are the frozen V3 ids. No V2 id is renamed, removed, split, or merged; retained ids keep their managed paths and host-note destinations.
16. `architecture-review` is a new opt-in skill. It does not expand `react-state-transitions` into a general architecture workflow.
17. Browser support remains host policy with current Chrome, Firefox, and Safari as the portable fallback. V3 adds no browser-policy setting.
18. V3 adds no stack-specific shared rule. Framework versions, aliases, resource libraries, and product contracts remain host facts.
19. Cross-major update uses observable host and registry state with the existing digest, lock, backup, verification, and version-last protocol; it adds no migration journal.
20. Catalog and host config remain format 2 because V3 adds no schema field or representation change.

## 11. Open decisions and change control

The implementation plan assigns deadlines to these unresolved product decisions:

| Decision | Required before |
| --- | --- |
| Exact HXP and D2 live rollout timing | After Watcher is healthy on V3 |

The catalog-freeze and migration-mechanism decisions formerly listed here are settled in section 10 and recorded in `docs/v3-transformation-manifest.md`.

The specification may improve as cases are studied and rehearsals expose problems. Before catalog freeze, working boundaries and open decisions may change through reviewed edits. After freeze, a change to an id, concept boundary, selection transform, managed path, or host-note destination updates this specification, the transformation manifest, and its fixtures together. After release freeze, those decisions reopen only for a release-blocking finding and the affected acceptance gates repeat.

The implementation plan may change sequencing, commands, fixtures, and file organization without changing this specification. A changed product or architecture decision must be recorded here first.
