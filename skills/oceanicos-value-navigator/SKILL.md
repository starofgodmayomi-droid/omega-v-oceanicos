---
name: oceanicos-value-navigator
description: "Turn an observed need into a bounded proposal, evidence-bearing observation, and truthful reconciliation."
---

# Oceanicos Value Navigator — repository contract

Use this skill to move one finite opportunity from **Observe → Understand → Propose → (human-authorized action elsewhere) → Measure → Learn → Next Δ**. A score is a prioritization hypothesis, not demand, income, or value proof.

> **Possible ≠ known ≠ proposed ≠ authorized ≠ attempted ≠ executed ≠ observed ≠ verified ≠ earned.**

## Runtime surface

The dashboard's Value Navigator and API share `OmegaChangeRecord` semantics through `@oceanicos/mini`.

- `POST /v1/value-navigator/proposals` creates a durable `REVIEW`, `authorized:false`, `NOT_EXECUTED` record.
- `GET /v1/value-navigator/proposals` lists the append-only local journal.
- `GET /v1/value-navigator/proposals/{proposalId}` returns proposal history.
- `POST /v1/value-navigator/proposals/{proposalId}/observe` appends a superseding observation record; it never edits the proposal.

The API accepts only declared fields. Clients cannot set `decision`, `authorized`, or reconciliation `status`. Observations are supplied by the caller; the server does **not** fetch URLs, access accounts, invoke shell commands, send outreach, spend money, or execute a proposal. In required-auth mode the existing API admin bearer boundary applies to writes.

## Status contract

- Proposal: always `decision: REVIEW`, `authorized: false`, `reconciliationStatus: NOT_EXECUTED`.
- `VERIFIED`: supplied observation, source, and evidence match the expected outcome after whitespace/case normalization. Scope is only **hypothesis reconciliation**; this is not independently authenticated external truth.
- `DIVERGENT`: complete supplied observation differs from the expected outcome.
- `UNKNOWN`: observation failed or is incomplete.
- `NOT_EXECUTED`: no action has been performed by this feature.

Every observation appends a new `OmegaChangeRecord` with lineage to the proposal and previous record. The local JSONL journal uses a SHA-256 hash chain for integrity detection; a hash chain is not truth, authority, a digital signature, backup, or distributed durability.

## Minimum truthful cycle

1. Record the beneficiary, observed need, source/evidence, expected outcome, constraints, and stop condition. Keep assumptions explicit.
2. Use the optional 0–100 score only as a **value-potential hypothesis**.
3. Submit a proposal; review/authorization stays human-routed.
4. Only after an independently authorized activity occurs elsewhere, submit its observed outcome and provenance. Missing evidence remains `UNKNOWN`.
5. Compare expected and observed outcomes; preserve divergence and the original record.
6. Select one bounded next experiment. Never infer money, demand, deployment, or health from a proposal, score, test, signature, or match alone.

For human-sensitive or external activity, read the relevant safeguards and obtain the required consent/authority before action. This skill itself grants no authority.
