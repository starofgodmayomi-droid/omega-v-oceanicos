---
name: oceanicos-value-navigator
description: "Turn an observed need into a bounded proposal, evidence-bearing observation, truthful reconciliation, and one next value transition."
---

# Oceanicos Value Navigator — repository contract

Use this skill to move one finite opportunity from **Observe → Understand → Propose → (human-authorized action elsewhere) → Measure → Learn → Next Δ**. A score is a prioritization hypothesis, not demand, income, or value proof.

> **Possible ≠ known ≠ representable ≠ permitted ≠ proposed ≠ attempted ≠ executed ≠ observed ≠ verified ≠ earned.**

## Reality-bound value loop

```text
REAL PROBLEM → HONEST PROMISE → USEFUL DELIVERY → OBSERVABLE IMPROVEMENT
→ TRANSPARENT EXCHANGE → RECORDED OUTCOME → REPEATABLE VALUE
```

This is not guaranteed money and does not grant autonomy or authority by scale. Wealth language is translated into capability, creation, execution, verified value, earned outcome, memory, reuse, and compounding; each step remains an evidence question.

## Runtime surface

The dashboard's Value Navigator and API share `OmegaChangeRecord` semantics through `@oceanicos/mini`.

- `POST /v1/value-navigator/proposals` creates a durable `REVIEW`, `authorized:false`, `NOT_EXECUTED` record.
- `GET /v1/value-navigator/proposals` lists the append-only local journal.
- `GET /v1/value-navigator/proposals/{proposalId}` returns proposal history.
- `POST /v1/value-navigator/proposals/{proposalId}/observe` appends a superseding observation record; it never edits the proposal.

The API accepts only declared fields. Clients cannot set `decision`, `authorized`, or reconciliation `status`. Observations are supplied by the caller; the server does **not** fetch URLs, access accounts, invoke shell commands, send outreach, spend money, or execute a proposal. In required-auth mode the existing API admin bearer boundary applies to writes.

## OUPEMLI-E route

1. **Observe:** beneficiary, problem, frequency, friction, urgency, source, and direct evidence.
2. **Understand:** job-to-be-done, smallest useful outcome, alternatives, assumptions, risks, and dissent.
3. **Plan:** one route—service, product, education, referral, open-source/portfolio, licensing, or partnership—with buyer, scope, price hypothesis, channel, timebox, metrics, and stop condition.
4. **Execute:** only an independently authorized activity elsewhere; preserve the execution artifact and authority.
5. **Measure:** record attempts, responses, conversions, time, cost, quality, feedback, and actual exchange.
6. **Learn:** identify the signal that changed belief, confounders, failed assumptions, and unknowns.
7. **Improve:** choose exactly one next transition: narrow audience, change offer, improve delivery, adjust price, switch channel, stop, or scale. Scaling requires repeatable evidence and explicit authorization.

## Status contract

- Proposal: always `decision: REVIEW`, `authorized: false`, `reconciliationStatus: NOT_EXECUTED`.
- `VERIFIED`: supplied observation, source, and evidence match the expected outcome after whitespace/case normalization. Scope is only **hypothesis reconciliation**; this is not independently authenticated external truth.
- `DIVERGENT`: complete supplied observation differs from the expected outcome.
- `UNKNOWN`: observation failed or is incomplete.
- `NOT_EXECUTED`: no action has been performed by this feature.

Every observation appends a new `OmegaChangeRecord` with lineage to the proposal and previous record. The local JSONL journal uses a SHA-256 hash chain for integrity detection; a hash chain is not truth, authority, a digital signature, backup, or distributed durability.

## Evidence and authority record

For every material claim or action, preserve:

```text
subject / intent / state_before / evidence[source,timestamp,observation]
authority / policy_constraints / decision[ALLOW|DENY|REVIEW]
transition / state_after / expected_consequence / observed_consequence
reconciliation / status[VERIFIED|DIVERGENT|UNKNOWN|NOT_EXECUTED]
provenance / next_transition
```

Proposal is not action. Capability is not authority. Verification is not authorization. Unknown is not false. Attestation is provenance, not impact proof. This skill itself grants no authority to publish, message, spend, access accounts, or change external systems.

## Minimum truthful cycle

1. Record the beneficiary, observed need, source/evidence, expected outcome, constraints, and stop condition. Keep assumptions explicit.
2. Use the optional 0–100 score only as a **value-potential hypothesis**.
3. Submit a proposal; review/authorization stays human-routed.
4. Only after an independently authorized activity occurs elsewhere, submit its observed outcome and provenance. Missing evidence remains `UNKNOWN`.
5. Compare expected and observed outcomes; preserve divergence and the original record.
6. Select one bounded next experiment. Never infer money, demand, deployment, or health from a proposal, score, test, signature, or match alone.

For human-sensitive or external activity, read the relevant safeguards and obtain the required consent/authority before action. This skill itself grants no authority.
