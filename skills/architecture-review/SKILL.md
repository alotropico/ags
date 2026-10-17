---
name: architecture-review
description: Perform an evidence-based architecture review of ownership, async truth, resource lifecycle, reuse, and contracts within an explicit scope. Use only for a requested review or refactor assessment. Report findings; do not implement unless separately authorized.
---

# Architecture review

Use this skill only when the user requests architectural review, assessment, or refactor analysis. Ordinary editing and a numeric size signal do not activate it.

## Authorization

Establish the requested scope and mode first:

- **Review:** inspect, classify, and report. No application changes.
- **Plan:** validate findings and produce an execution plan. No implementation.
- **Implement:** only when the user separately asks to change code; do not treat review or planning as permission.

## Evidence workflow

1. Inventory candidate owners, state, effects, dependencies, resource identities, policies, and contracts within scope.
2. Treat counts, search hits, diagnostics, and prior audits as leads. Reopen and trace the real flow before calling one a finding.
3. Separate verified mechanism, intended policy, inference, ambiguity, and product decisions.
4. For each proposed boundary, compare before and after inputs, outputs, authority, writers, dependencies, lifecycle, and reasons to change.
5. Reject cosmetic splits, wrapper contracts that preserve the same surface, speculative shared abstractions, and findings whose consequence is not demonstrated. Review simplicity explicitly: identify unnecessary cleverness, indirection, layers, or machinery without a concrete need, and compare a smaller implementation that preserves correctness and maintainability.
6. Check relevant host guidance and installed ownership, async, state-topology, and resource rules without widening beyond the requested scope.
7. Classify surviving items by consequence and confidence. Preserve legitimate local lifecycle code and bounded duplication where they are clearer.
8. Stop at the authorized mode.

## Report

Lead with whether the concern is localized or systemic and what is already sound. For each actionable finding include evidence, consequence, confidence, the smallest coherent target, preserved behavior, and the decision or test needed. Label rejected candidates and unresolved product decisions when doing so prevents repeated investigation.

A review may recommend sequence but does not create implementation authority or a general cleanup backlog.
