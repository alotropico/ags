## 1. Skills

| Skill | Path(s) under `.agents/` | Description | Scope | Unique | Fit |
|---|---|---|---|---|---|
| `react-state-transitions` | designer2: `skills/react-state-transitions/SKILL.md` (+ `references/refactoring-patterns.md`, `references/review-and-planning.md`, `agents/openai.yaml`) | Audit React state ownership and invariants; flag effect-driven repair of contradictions. Explicit Review / Plan / Implement modes; implementation only when asked. | Stack (React). Core idea (every exposed state satisfies an invariant; transitions go valid→valid) is agnostic. | Yes (designer2; also staged in Meta `templates/ags/shared/`) | Portable |
| `start-ticket` | designer2, hxpoc, ui-library: `skills/start-ticket/SKILL.md` | Create a local feature branch for a Jira ticket from the trunk; naming deferred to `git-conventions.md`. | Agnostic (Git + Jira workflow) | No (3; trunk `integration-2025Q1` in designer2/hxpoc, `main` in ui-library; ui-library links `documentation/agent/`) | Mixed (hardcoded trunk and `CORE-` prefix; trivially parameterizable) |
| `smoke-save` | designer2: `skills/smoke-save/SKILL.md` | Browser smoke test of Designer2 Save (collaboration merge dialog + commit) on a disposable design. `disable-model-invocation`. | App (Designer2) | Yes | Tailored |
| `smoke-branch-merge` | designer2: `skills/smoke-branch-merge/SKILL.md` | Browser smoke test of Designer2 Branching & Merging including forced conflict resolution; gated on `window.apm.serialized.branchingMerging`. | App (Designer2) | Yes | Tailored |

## 2. Rules (`.agents/guidance/`)

AGS `rules/core.md` covers none of these topics.

| Rule | Path(s) under `.agents/` | Description | Scope | Unique | Fit |
|---|---|---|---|---|---|
| Code idioms | designer2, hxpoc, watcher: `guidance/code-idioms.md` | TypeScript/React craft by example: component structure, types, imports, callbacks/hooks, orchestrator hooks, derived state vs effects, "avoid" list. designer2 adds a modern-vs-legacy scope gate; watcher adds state ladder, client API, testing. | Stack (TypeScript + React) | No (3; all divergent) | Mixed (shared React core, e.g. orchestrator hooks and derived state; repo-specific aliases, libraries, scope gates) |
| Git conventions | designer2, hxpoc, watcher: `guidance/git-conventions.md` | Branch naming, when to commit, commit subject format, dividing commits, MR title. designer2: `CORE-<n>-slug` branches, ticket in branch/MR not subject. hxpoc: adds commit body, commit range diffs, Jira story shape. watcher: `Type: Scope, summary`, no Jira. | Agnostic (Git) | No (3; divergent house styles) | Mixed ("when to commit" and "dividing commits" are portable; formats are house-specific) |
| State topology procedure | designer2, hxpoc, watcher: `guidance/state-topology.md` | Before touching shared client state, fill a 15-field record (owner, authoritative representation, writers, readers, lifecycle, persistence, …) with `fact` / `policy` / `inference` / `unresolved` labels. Includes worked counter-examples. | Agnostic method (examples are React / Zustand / React Query / URL state) | No (3; same method, repo-specific scope lists and examples) | Mixed (method is portable; examples and scope gate are tailored). Strong shared-rule candidate. |
| State records | designer2: `guidance/state/feature-flags.md`, `serialized-design.md`, `service-vs-zustand.md`; hxpoc: `guidance/state/auth-token.md`, `permissions.md`, `selected-application.md`; watcher: `guidance/state/README.md` (stub) | Filled topology records for specific facts, each with a `Last verified` SHA. | App | Yes (each record) | Tailored |
| Repository profile | designer2, hxpoc, watcher: `guidance/repository-profile.md` | Machine-verified fact block (trunk, package manager, verification commands, pinned majors) plus landmines; read by `verify-profile.mjs`. hxpoc adds the Module Federation store-import contract. | Agnostic structure, App content | No as a pattern (3); content unique per repo | Tailored (the fact-block format is portable). Verification commands partly overlap AGS host `checks`, but AGS has no profile/landmine equivalent. |
| Forms | designer2: `guidance/forms.md`; hxpoc: `guidance/forms.md` | designer2: where form controls vs page components live, barrel exports, legacy `form_features/` gate. hxpoc: `@mantine/form` `useForm` with reference implementations. | Stack (React; hxpoc also Mantine) | Yes (content differs completely) | Tailored |
| Linting and formatting | designer2: `guidance/linting-and-formatting.md` | ESLint only, no Prettier; done gate `npm run check:types && npm run lint`; no project-wide `--fix`; do not mix formatting with behavior changes; describes afterFileEdit hooks. | Stack (ESLint / npm) | Yes | Mixed (the "no project-wide fix" and "no mixed diffs" policies are portable) |
| Diagnostics mode | watcher: `guidance/diagnostics.md` | Workspace-gated `[wdiag]` probes for freeze/memory/disk investigation: enable, read logs, probe status, retire procedure. | App (Watcher) | Yes | Tailored |
| Server | watcher: `guidance/server.md` | Express API layout (`server.ts`, `modules/`, `db/` SQLite repos, `workspace/`) and conventions. | Stack (Express + SQLite) | Yes | Tailored |
| Candidates | designer2, hxpoc, watcher: `guidance/candidates.md` | Evidence-linked backlog of ideas for human promotion (designer2/hxpoc) or forward-drift / non-candidate upgrade list (watcher). | Agnostic process | No (3; different content) | Tailored content, portable format |

## 3. Others

| Item | Path(s) under `.agents/` | Description | Scope | Unique | Fit |
|---|---|---|---|---|---|
| Local notes template | designer2, hxpoc, watcher: `guidance/local.example.md` | Template for a gitignored `local.md` (machine paths, test accounts; no secrets). | Agnostic | No (3) | Portable. AGS replaces the concept with host-owned `.agents/local/`. |
| Guidance index | designer2, hxpoc, watcher: `guidance/README.md`; `.agents/README.md` | Tree maps and setup commands (`yarn agent:sync`, `agent:verify`). | Agnostic | No (3 each) | Tailored. Replaced by the AGS host entry. |
| afterFileEdit hooks | designer2: `hooks/hooks.json`, `hooks/lint-fix-eslint-ts.js`, `hooks/README.md`; hxpoc: `hooks/hooks.json`, `hooks/lint-fix-eslint.js`, `hooks/format-with-prettier.js`, `hooks/README.md` | Cursor hooks: ESLint `--fix` (designer2, TS/TSX only) or ESLint then Prettier (hxpoc) on edit; always exit 0. | Stack (ESLint / Prettier, JS/TS) | No (2 variants; source is Meta `templates/hooks/`) | Portable. AGS has no hooks; `doctor` flags `hooks` as legacy. |
| Adapter / verify / snapshot scripts | designer2, hxpoc, watcher: `scripts/generate-adapters.mjs`, `scripts/verify-profile.mjs`, `scripts/snapshot-llm-system.mjs`, `scripts/README.md` | Generate `.cursor/` adapters, verify the repository profile against the repo, snapshot the agent system. | Stack (Node) | No (3; all divergent) | Tailored. Functionally superseded by `ags render` / `checks` / `snapshot` / `doctor` (no profile-verification equivalent). |
| `migrate-local.mjs` | designer2, hxpoc, watcher: `scripts/migrate-local.mjs` | One-shot migration of ignored leftovers from the pre-convergence layout. | Stack (Node) | No (3, identical) | Tailored, obsolete after AGS cutover |
| Stewardship: Meta pointer | designer2, hxpoc, watcher: `stewardship/meta.md` | Portable discovery of the Meta repo (`COSMOS_META` env, `local.md`, parent walk). | Agnostic | No (3; minor variants) | Portable within Cosmos. AGS treats `stewardship` as legacy. |
| Stewardship: pilot observations | designer2, hxpoc, watcher: `stewardship/PILOT-OBSERVATIONS.md` | Evidence log from real use of guidance; observations are not decisions. | Agnostic process | No (3; different content) | Tailored content, portable format |
| Stewardship: handoff | designer2, hxpoc, watcher: `stewardship/STEWARD-HANDOFF.md` | Conceptual/historical context of the AGS system for future stewards (hxpoc copy is 320 lines). | Agnostic | No (3; divergent) | Tailored (historical) |

## Takeaways

- **Best promotion candidates for AGS**, portable across stacks or across React hosts: `react-state-transitions`, `start-ticket` (with trunk and ticket prefix as parameters), the state-topology method, and the shared core of code idioms and git conventions ("when to commit", "dividing commits").
- **Keep host-only**: `smoke-*`, state records, repository profiles, forms, diagnostics, server, and Watcher's `css-theme-tokens`.
- **Decide explicitly**: afterFileEdit hooks and profile verification have no AGS home.
