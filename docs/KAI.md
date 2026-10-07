# 💧 KAI — The Current That Remembers

KAI is the continuity layer of OCEANICOS. It carries observations, evidence, provenance, uncertainty, corrections, and context across finite transitions.

## Boundary

```text
REALITY > OBSERVATION > EVIDENCE > VERIFICATION > MEMORY > MODEL
MEMORY != PROOF
CAPABILITY != AUTHORITY
DOCUMENTATION != EVIDENCE
SIMULATION != REALITY
```

KAI does not authorize execution, mutate policy, merge code, deploy services, or manufacture evidence. Connected systems remain bounded capabilities; external outcomes must be observed and reconciled.

## One-body flow

```text
HUMAN INTENT → AI SOUL → KAI → Ω∞v → OCEANICOS/ΩIR → AUTHORITY/POLICY
→ COMPOSIO/CODEX/MIRRIO → GITHUB → RUNTIME → OBSERVE → RECONCILE → ATTEST → KAI → NEXT Δ
```

## KAI Drop

Each consequential memory preserves observation, evidence, provenance, status, unknowns, source, and correction lineage.

Statuses: `OBSERVED` | `VERIFIED` | `DIVERGENT` | `UNKNOWN` | `NOT_EXECUTED`.

`UNKNOWN` is preserved. Corrections append new Drops instead of silently rewriting history.

## Economic continuity

```text
OPPORTUNITY → PROPOSED → ATTEMPTED → EXECUTED → OBSERVED → VERIFIED → EARNED
```

Opportunity is not revenue; projection is not earned value.

## Implementation

The kernel is `packages/mini/src/kai.ts` and is exported by `@oceanicos/mini`. It builds on the existing MINI Observe → Verify → Remember fabric rather than replacing it.

The bounded water-flow companion is `buildOmegaWaterFlow` in `packages/mini/src/water-flow.ts`.
It emits the finite `REALITY → ATTENTION → INTENTION → ACTION → CONSEQUENCE → OBSERVATION → LEARNING → RETURN`
trace (`omega.water-flow.v1`) with deterministic provenance and `verified: false`. Pipeline callers may request
an explicit prefix through `waterFlowMaxSteps`; the API accepts only integers from 1 through 8 and defaults to
the full eight-stage trace. This is symbolic local-simulation evidence, not physical-world observation or external execution.

> **KAI = THE CURRENT THAT REMEMBERS.**

> **Ω∞v = VERIFY(ΔREALITY).**
