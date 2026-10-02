---
name: oceanicos-framework
description: "Run human–AI collaboration as finite, evidence-bound transitions from intent to observed reality and the next learning drop."
---

# OceanicOS Framework

Oceanicos is a reality-bound operating body for turning human intent into bounded action, action into observation, observation into evidence, and evidence into the next finite transition. It does not claim omniscience, universal control, consciousness, or literal infinity.

> **Reality ≠ model ≠ plan ≠ claim ≠ code ≠ test ≠ CI ≠ signature ≠ attestation ≠ simulation ≠ memory.**

```text
POSSIBLE → KNOWN → REPRESENTABLE → PERMITTED → PROPOSED
→ ATTEMPTED → EXECUTED → OBSERVED → VERIFIED → ATTESTED
→ DEPLOYED → HEALTHY → CORRECT
```

## OUPEMLI cycle

Every task follows this loop:

```text
OBSERVE → UNDERSTAND → PLAN → EXECUTE → MEASURE → LEARN → IMPROVE
```

1. **Observe:** collect raw context, actors, state, and source evidence.
2. **Understand:** classify facts, assumptions, interpretations, opinions, uncertainty, and dissent.
3. **Plan:** define one bounded transition, owner, authority, policy, expected observation, metric, stop condition, and rollback.
4. **Execute:** perform only the admitted capability within scope.
5. **Measure:** inspect actual consequence and compare it with expectation.
6. **Learn:** preserve what changed belief, what diverged, and what remains unknown.
7. **Improve:** choose one next finite transition; do not scale from a story.

## Finite transition contract

Represent material changes as:

```text
τ = (STATE, INTENT, EVIDENCE, AUTHORITY, POLICY, CONSEQUENCE)
    → (DECISION, STATE′, RESULT)
```

Decisions are `ALLOW`, `DENY`, or `REVIEW`. `REVIEW` does not execute. A valid transition preserves scope, identity, idempotency, expiry, rate/resource/data limits, audit, revocation, recovery, and a stop condition.

Use the complete path when relevant:

```text
HUMAN INTENT → ΩIR → EVIDENCE → VERIFY → AUTHORITY → POLICY
→ ADMISSION → BOUNDED CAPABILITY → EXECUTE → OBSERVE → RECONCILE
→ ATTEST → PROVENANCE → MEMORY → REPLAY → LEARN → RECOMPILE → NEXT
```

Capability ≠ authority. Admission ≠ execution. Execution ≠ verified reality. Memory ≠ proof. Consensus ≠ truth.

## Evidence and reality

An evidence record answers:

- who observed or acted;
- when;
- where or under which runtime context;
- what exact state/event was seen;
- strength, limitations, and contradiction checks.

The outcome vocabulary is deliberately non-collapsible:

- `VERIFIED`: authorized execution and valid observation match the bounded expectation;
- `DIVERGENT`: observation conflicts with expectation; preserve both and route review;
- `UNKNOWN`: evidence is missing, unavailable, or inconclusive;
- `NOT_EXECUTED`: rejected, expired, unadmitted, or never attempted;
- `DISSENT`: a recorded disagreement requiring explanation, not erasure.

Tests, CI, signatures, and attestations prove only the bounded artifact they directly cover. Reality remains the final evaluator.

## System-of-record roles

- **Notion:** intent, context, relationships, and human memory.
- **GitHub:** implementation, history, CI, and provenance.
- **Runtime:** execution and observation.
- **Reconciliation:** bridge between expected and observed state.
- **Reality:** final court of the claimed consequence.

No one layer automatically proves the next.

## Knowledge Drops

A Drop must include observations, evidence, relationships, decisions, provenance, and the next finite action. Preserve raw history and adverse results. Do not use a capability, memory entry, generated text, or symbolic statement as authorization.

## Required completion check

Before declaring a change complete, confirm: intended behavior exists; affected contracts agree; relevant tests ran; authority and rollback are explicit; secrets and privacy are protected; provenance is preserved; and the next observable consequence is named. If a check was not run, label it `UNVERIFIED` rather than implying completion.
