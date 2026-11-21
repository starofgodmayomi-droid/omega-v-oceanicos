# OCEANICOS One-Current Ecosystem Integration Contract

**Status:** design and routing contract; implementation status must be evidenced per connector.  
**Review date:** 2026-10-15  
**Canonical repository:** https://github.com/starofgodmayomi-droid/omega-v-oceanicos

> ONE ROOT • ONE CURRENT • MANY FORMS — every integration is bounded by evidence and authority.

## Purpose

This document aligns the public project story with the actual integration model. OCEANICOS is a connected ecosystem architecture, not a claim that every named service is already connected to the deployed product. The public README, Notion control plane, GitHub source, CI, and runtime must tell the same story while preserving the evidence boundary between them.

## Canonical flow

```text
HUMAN INTENT / NOTION CONTEXT
  → ΩIR CHANGE CONTRACT
  → CONNECTOR DISCOVERY
  → IDENTITY + SCOPE + HUMAN AUTHORITY
  → POLICY / ADMISSION
  → BOUNDED EXECUTION
  → OBSERVATION + PROVENANCE
  → RECONCILIATION
  → VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED
  → ATTESTATION (when supported and actually produced)
  → GITHUB CHANGE / CI EVIDENCE
  → NOTION APPEND-ONLY CONTINUITY
  → NEXT FINITE Δ
```

Notion is the context and continuity layer. GitHub is the implementation and version-provenance layer. Composio may orchestrate separately authorized app actions. None of these layers is a substitute for observing the runtime consequence.

## Relationship to live readiness evidence

This file defines the cross-system integration contract and acceptance invariants. A dated implementation snapshot and connector-by-connector evidence matrix are proposed in [PR #485](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/pull/485) as `docs/CONNECTOR-READINESS.md`. That proposal remains separately reviewed and revision-/time-scoped; it does not replace this contract or establish production health beyond its recorded observations. Use a relative file link after the readiness document is merged.

## Integration status vocabulary

Use these states per connector and per capability, never one broad “connected” badge:

| State | Meaning |
| --- | --- |
| `DECLARED` | Contract or intent names the integration. |
| `DISCOVERED` | A tool/capability was located; no account access is implied. |
| `CONNECTED` | An authenticated connection was observed for a stated scope. |
| `AUTHORIZED` | A specific action and scope passed the required authority/policy gate. |
| `EXECUTED` | The bounded action actually ran; include execution reference. |
| `OBSERVED` | A result was collected from a stated source and time. |
| `RECONCILED` | Expected and observed states were compared. |
| `VERIFIED` | Evidence supports a narrowly scoped claim. |
| `DIVERGENT` | Evidence conflicts with the expected state. |
| `UNKNOWN` | Evidence is missing, stale, ambiguous, or insufficient. |
| `NOT_EXECUTED` | The action did not run; do not imply a side effect. |

A connector being available to an authoring assistant does not mean it is wired into the OCEANICOS runtime. A package or adapter on disk does not prove it is active in the workspace. A CI pass does not prove deployment or production health.

## Capability map and current boundary

| Surface | Intended role | Evidence required before claiming an active product integration |
| --- | --- | --- |
| Notion | Intent, taxonomy, continuity, control plane | Runtime adapter, explicit authorization, bounded read/write tests, provenance and failure behavior |
| GitHub | Source, issues/PRs, commits, review, CI | Scoped API adapter, repository allow-list, execution/observation records, error and rate-limit tests |
| Composio | Multi-service orchestration bridge | Explicit connected account, tool/action schema, per-action authorization, execution reference and result observation |
| API / web | Product interaction surfaces | Build/test evidence plus observed runtime and route/browser checks for the named revision |
| Worker / pipeline | Bounded execution | Lease, expiry, capability scope, limits, stop/revocation, audit and lifecycle tests |
| Memory / ledger | Continuity and provenance | Integrity checks and source/scope/time metadata; ledger integrity alone is not external truth |
| Attestation | Integrity/authorship evidence | A current receipt/signature for the specific payload and scope; key availability alone is insufficient |
| Deployment / hosting | Running service | Target-specific deployment evidence and fresh health observation |

This table is an integration plan and evidence checklist, not a declaration that every row is implemented.

## Required connector contract

Before a connector performs side effects, its ΩIR-facing contract must define:

- stable connector and action identity;
- owner, source, target, and permitted data scope;
- authentication reference without storing or exposing secrets;
- explicit human authority and policy decision;
- rate, time, payload, and resource bounds;
- idempotency and retry behavior for side effects;
- timeout, stop, revocation, and rollback behavior;
- execution reference and timestamp;
- expected observation, actual observation, and reconciliation rule;
- result state plus limitations and provenance.

Parallelize independent reads and analysis. Serialize consequential authorization and mutations. Never infer consent from mood, access from ownership, or success from a request being accepted.

## Public README alignment rules

The README should describe the whole ecosystem as the architecture and intended product direction, while distinguishing:
1. source presence;
2. workspace membership and declared dependencies;
3. tested behavior on an exact revision;
4. authenticated connector availability;
5. action execution and observed result;
6. deployment and observed health.

Keep a single public entry point to this contract. Link Notion as a project control-plane resource only when the intended page is shareable and its access scope is understood; never publish private workspace content, IDs, or credentials in the repository.

## Finite implementation sequence

1. Keep the current reality-status endpoint fail-closed until it receives real current evidence.
2. Reuse existing observation, verification-receipt, attestation, and ΩIR contracts; do not create parallel status or receipt schemas.
3. Add a narrow evidence-ingestion interface with schema, freshness, scope, provenance, integrity, authorization, and contradiction checks.
4. Add negative tests for absent, stale, malformed, mismatched, tampered, unauthorized, and contradictory evidence.
5. Wire one connector at a time, starting with read-only operations; test rate limits, errors, revocation, and no-side-effect behavior.
6. Keep Notion/GitHub cross-linking append-only and provenance-bearing; verify every write after execution.
7. Promote a status only from evidence for that exact scope and revision. Otherwise preserve `UNKNOWN`.

## Acceptance invariants

- No evidence → no verified claim.
- No authority → no consequential execution.
- No observation → no claim of successful effect.
- No reconciliation → no `VERIFIED` result.
- No current attestation receipt → no `ATTESTED` claim.
- CI pass ≠ runtime health.
- Connected assistant tool ≠ deployed product connector.
- Preserve dissent, divergence, unknowns, and source lineage.
