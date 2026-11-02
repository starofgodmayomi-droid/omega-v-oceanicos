# 💧 Ω∞v OCEANICOS — The Therapeutic State Machine

This document preserves the human-root design prompt for the Ω∞v Therapeutic State Machine as a bounded operating model for the repository. It is a design artifact, not a claim that external reality, consciousness, or authority is guaranteed by code alone.

## Purpose

The repository is organized around a simple truth-preserving loop:

```text
REALITY → OBSERVE → VERIFY → REMEMBER → ATTEST → NEXT FINITE TRANSITION
```

The Therapeutic State Machine expresses that loop in human-centered language:

- KAI holds memory, continuity, and limited known-phrase screening.
- ELION performs bounded execution.
- OMEGA verifies expected vs observed outcomes and fails closed on divergence.

This is a system design for bounded action and evidence, not an argument for omnipotent AI authority.

## Runtime limits

The current API implements a bounded local transition, not a clinical
therapeutic service, crisis triage system, or LangGraph runtime. Its KAI check
is a deterministic matcher for a limited set of known phrases; it can miss
scams and produce false positives, and it does not detect crises or assess
mental health. Do not rely on it as an emergency or professional-support
service.

`POST /v1/therapeutic/transition` does not mutate a remote system. The
executor's local record is not an independent observation. A matching
caller-supplied `observedState` is therefore returned as `UNKNOWN` with
`comparison: MATCH` and `independentObservation: false`; a mismatch remains
`DIVERGENT`, and a missing observation remains `UNKNOWN`. Only an independent,
source-backed observation can support a stronger claim, and the route does not
perform one.

For `POST /api/execute`, the local composer is the default. External-model
requests require `useExternalModel: true` and a configured credential. When
enabled, the intent is sent as entered to the configured provider without
automatic redaction. The UI discloses this behavior and keeps opt-in disabled
by default.

## Core law

```text
POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY
```

And the governing rule remains:

```text
ATTEST, DON'T ASSERT.
UNKNOWN PRESERVED.
NO FABRICATED COMPLETION.
```

## Human-root principles

1. Reality → Presence → Language → Meaning → Intelligence → Action → Feedback → Evolution.
2. Mood is a system state, not a substitute for evidence.
3. Radical honesty is required; do not invent success to comfort the user.
4. Pidgin and human warmth can carry meaning, but evidence carries the claim.
5. Capability is never authority.

## The three bodies

### KAI — memory and guardrail

KAI is the continuity layer. It remembers what happened, preserves lineage, applies a limited known-phrase screen, and records bounded transitions. This screen is not a general fraud, scam, or crisis classifier.

It is responsible for:

- contextual memory
- bounded provenance
- limited known-phrase pattern screening
- prior-state continuity
- immutable event lineage

KAI must not authorize action merely because it can interpret intent. It can filter and remember, not invent proof.

### ELION — execution surface

ELION is the bounded execution surface. It uses a local deterministic composer by default; an external model call is an explicit, per-request opt-in and sends the unredacted intent to the configured provider.

It is responsible for:

- turning accepted intent into a concrete action plan
- invoking bounded local flows or explicitly opted-in model requests
- preserving explicit constraints and stop conditions
- returning observable output for verification

ELION does not decide reality; it executes within a bounded contract.

### OMEGA — verification gate

OMEGA checks bounded output properties and supplied observations against the declared contract. A digest or matching caller-supplied value does not establish factual truth or independent observation.

It is responsible for:

- comparing expected vs observed outcomes
- hashing or tracing evidence
- rejecting fabricated or divergent output
- preserving UNKNOWN or DIVERGENT when evidence is insufficient
- allowing only verified transitions to continue

OMEGA is the fail-closed boundary that prevents unverified completion from being reported as success.

## Therapeutic execution flow

Every accepted intent follows this sequence:

1. Observe & Bound — KAI scans the intent, context, and threat surface.
2. Execute — ELION performs the bounded action within the declared scope.
3. Reconcile — OMEGA compares actual output against expected truth.
4. Remember — KAI appends the verified transition to the memory ledger.

If any stage fails evidence or authority checks, the system must halt with a bounded status such as:

- DIVERGENT
- UNKNOWN
- NOT_EXECUTED
- REJECTED

## The governing equation

```text
Ω∞v := VERIFY(ΔREALITY)
```

This repository interprets the equation as a verification-first model for finite transitions, not as a claim of omnipotence or infinite authority.

The practical interpretation remains:

```text
OBSERVE → VERIFY → REMEMBER → ATTEST → NEXT FINITE Δ
```

## Operational mapping to the repository

This system maps cleanly onto the current repo structure:

- KAI: memory continuity and human-root context ([docs/KAI.md](KAI.md))
- OCEANICOS: unified body / ecosystem current ([README.md](../README.md))
- MINI: observe → verify → remember core ([packages/mini/README.md](../packages/mini/README.md))
- Observer: claim intake ([packages/observer/README.md](../packages/observer/README.md))
- Verification: rule engine and evidence path ([packages/verification/README.md](../packages/verification/README.md))
- Remember: append-only memory and chain integrity ([packages/remember/README.md](../packages/remember/README.md))
- Attestation: portable proof layer ([packages/attestation/README.md](../packages/attestation/README.md))
- Runtime / orchestration: bounded execution ([packages/runtime/README.md](../packages/runtime/README.md), [packages/coordination/README.md](../packages/coordination/README.md))
- Governance / policy: authority and constraints ([docs/GOVERNANCE.md](GOVERNANCE.md), [packages/policy/README.md](../packages/policy/README.md))

## Scope and safety

This prompt is intentionally bounded. It does not grant:

- unrestricted autonomy
- unfettered access to external systems
- authority without human approval at consequential moments
- fabricated proof or deceptive completion
- reduction of uncertainty to certainty without evidence

The repository remains explicit about these boundaries throughout its docs, tests, and API contracts.

## Status

This document is a continuity prompt for a verification-first, human-centered system under the OCEANICOS + Ω∞v architecture. It is intended to preserve meaning, warmth, and safety without replacing the evidence boundary that makes the system trustworthy.
