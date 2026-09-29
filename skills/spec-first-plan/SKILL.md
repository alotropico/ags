---
name: spec-first-plan
description: Produce a thorough design package by completing a self-contained specification first and then deriving a separate repository-grounded implementation plan. Use only when the user explicitly asks for both or for spec-first planning; ordinary planning uses plan-work.
---

# Spec-first plan

Use this workflow for a large product or architecture effort whose normative commitments must be settled before implementation sequencing. Do not use it for an ordinary plan, and do not add a separate specification merely because the implementation is large.

If the request could materially mean only a specification, only an execution plan, or only deferred triage, ask which artifact the user wants.

## 1. Complete the specification

Read and follow [the specification workflow](../write-spec/SKILL.md). Resolve or clearly gate every decision that the implementation route depends on. If the user requested a review checkpoint between artifacts, stop there; otherwise continue without forcing another turn when no material choice remains.

## 2. Derive the plan

Create a separate repository-grounded execution plan. It must:

- cite the specification as its product authority;
- map each commitment to ordered work and acceptance evidence;
- name likely files, migrations, fixtures, tests, rehearsals, risks, and phase exits;
- put prerequisite decisions before work that depends on them;
- keep product choices out of implementation prose; and
- state what changes require a spec revision instead of a plan adjustment.

Use the durable location and lifecycle from `plan-work`; do not duplicate that skill's storage instructions here.

## 3. Reconcile deferrals

Read [the backlog workflow](../manage-backlog/SKILL.md) only when the design produces a genuine inactive candidate. Non-goals, rejected approaches, and unselected alternatives are not backlog entries by default.

Finish with two distinct artifacts, a trace from commitments to verification, and any explicit gate that must be satisfied before execution.
