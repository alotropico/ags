---
name: write-spec
description: Create or revise a self-contained normative specification of purpose, commitments, constraints, decisions, and acceptance evidence. Use when the user asks for a spec, requirements, or product contract. Do not turn it into an implementation procedure.
---

# Write a specification

Use this skill when the requested artifact defines what a system or change must achieve and why. A request to "plan the implementation" routes to `plan-work`, not here.

## Establish authority

1. Name the specification's status, scope, authority, and superseded sources.
2. Distinguish settled decisions, working boundaries, inactive candidates, and genuinely open decisions.
3. Inspect the relevant repository behavior and durable records. Treat attached notes and prior plans as evidence unless the user explicitly makes them authoritative.
4. State normative terms when their strength matters.

## Write the contract

Cover only sections the subject needs:

- purpose, non-goals, and governing principles;
- terminology and system boundaries;
- required behavior and constraints;
- ownership, safety, compatibility, and migration commitments;
- acceptance evidence and release or completion criteria; and
- open decisions with the point by which each must be resolved.

Make each commitment self-contained enough that a later plan can derive work from it without inventing product decisions. Include legitimate exceptions and stop conditions where an absolute rule would be wrong.

Detailed command sequences, file-by-file edits, fixture inventories, phase exits, and release choreography belong in a derived execution plan unless the exact mechanism is itself required behavior.

## Reconcile

- Remove duplicate or conflicting authority instead of leaving two normative homes.
- Send worthwhile inactive possibilities through `manage-backlog` when it is installed; otherwise identify them for the repository's existing deferred register.
- Record rewrites or removals in the repository's concept ledger when it has one.
- Finish with unresolved decisions and evidence still needed. Do not implement from a specification-only request.
