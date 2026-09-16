# Ω∞v Change Calculus

## Status

This document defines the repository-level abstraction for **admissible change**. It sharpens Ω∞v from a state-transition model into a calculus for determining which changes may be accepted, which must be reviewed or denied, and how external changes are represented without falsely attributing them to Ω.

## 1. Core invariant

```text
💧 Ω∞v ::= ADMISSIBLE(ΔREALITY)
```

An observed state change is not automatically an Ω-authorized change.

```text
OBSERVED CHANGE ≠ AUTHORIZED CHANGE ≠ PROVEN CHANGE
```

Ω∞v therefore separates three questions:

```text
DID IT HAPPEN?
→ ATTESTATION / OBSERVATION

SHOULD IT HAVE HAPPENED?
→ AUTHORITY + POLICY

WHY DO WE BELIEVE IT HAPPENED?
→ EVIDENCE + PROVENANCE
```

## 2. Transition primitive

Let reality at time `t` be `S_t` and a candidate change be:

```text
ΔS = S_(t+1) - S_t
```

An Ω-transition is represented conceptually as:

```text
τ = (S, I, E, A, P, C) → (D, S', R)
```

where:

- `S` = current state
- `I` = intent
- `E` = evidence
- `A` = authority
- `P` = policy
- `C` = context
- `D` = decision
- `S'` = resulting state
- `R` = resulting record / proof

The admissibility decision is:

```text
D = VERIFY(S, I, E, A, P, C)
```

Only an admissible decision may authorize the corresponding Ω transition.

## 3. Operational calculus

```text
CANDIDATE CHANGE
      ↓
OBSERVE
      ↓
EVIDENCE
      ↓
VERIFY
      ↓
AUTHORITY
      ↓
POLICY
      ↓
DECISION
      ↓
┌───────────────┐
│ DENY / REVIEW │
└───────────────┘
        or
        ↓
      ALLOW
        ↓
    TRANSITION
        ↓
    CONSEQUENCE
        ↓
   ATTESTATION
        ↓
    PROVENANCE
        ↓
      MEMORY
        ↓
    NEXT STATE
        ↺
```

## 4. Two graphs bound by one transition

Ω∞v maintains two conceptually distinct graphs:

### State graph

```text
S₀ → S₁ → S₂ → S₃ → …
```

This records **what changed**.

### Justification graph

```text
Evidence
   ↓
Verification
   ↓
Authority
   ↓
Policy
   ↓
Decision
   ↓
Transition
```

This records **why the transition was admissible**.

The binding relation is:

```text
JUSTIFICATION GRAPH
        │
        ↓
S₀ → TRANSITION → S₁
        │
        ↓
PROVENANCE RECORD
```

The system therefore aims to preserve:

```text
STATE + CAUSALITY + JUSTIFICATION + CONSEQUENCE
```

## 5. Universal ΩObject

A future canonical domain object may be modeled as:

```text
ΩObject {
    subject
    intent
    state_before
    evidence
    authority
    policy
    decision
    transition
    state_after
    consequence
    attestation
    provenance
    timestamp
    lineage
}
```

This is an architectural abstraction, not a claim that every field is already implemented in the current repository.

Potential instances include:

```text
API request
AI inference
agent action
database mutation
deployment
credential issuance
policy change
model update
human approval
worker execution
configuration change
```

## 6. External change versus Ω-intended change

Reality changes outside Ω∞v. The system must observe and attribute those changes rather than retroactively claiming authorization.

### External change

```text
EXTERNAL CHANGE
      ↓
OBSERVE
      ↓
CLASSIFY
      ↓
ATTRIBUTE
      ↓
VERIFY
      ↓
UPDATE MODEL OF REALITY
```

### Ω-intended change

```text
Ω INTENT
   ↓
JUSTIFY
   ↓
AUTHORIZE
   ↓
EXECUTE
   ↓
ATTEST
   ↓
PROVENANCE
```

The distinction prevents causality and authority from being inferred merely because a state change was observed.

## 7. Recursive boundary

Ω∞v applies its own change calculus to changes of Ω itself:

```text
Ω OS
  │
  │ proposes Ω change
  ↓
OBSERVE / EVIDENCE
  ↓
VERIFY
  ↓
AUTHORITY
  ↓
POLICY
  ↓
TEST
  ↓
ATTEST
  ↓
Ω OS'
```

Thus the architecture is recursively self-describing without granting an agent inherent authority to modify the system.

## 8. Ω OS role

```text
Traditional OS = COMPUTE CONTROL

Ω OS = CHANGE CONTROL
```

Ω OS does not replace the underlying operating system. Conceptually:

```text
HARDWARE
   ↓
BASE OS
   ↓
Ω OS
   ↓
Ω KERNEL
   ↓
AGENTS / AI / APPS / WORKERS
   ↓
REALITY
```

The current repository should treat this as a target architecture and contract, not as evidence that a complete Ω OS already exists.

## 9. Strong invariant

```text
NO Ω-AUTHORIZED STATE CHANGE
WITHOUT
TRACEABLE JUSTIFICATION.
```

Equivalent operational rule:

```text
ADMISSIBLE(Δ)
=
EVIDENCE
∧ VERIFICATION
∧ AUTHORITY
∧ POLICY
∧ TRACEABILITY
```

A denied or unresolved transition is not silently converted into an allowed transition by assertion.

## 10. Repository mapping

The existing repository already contains partial primitives relevant to this calculus: foundational observation/evidence types, verification results, cryptographic attestations, and append-only remembered blocks. The current type surface includes `IObservation`, `IEvidence`, `VerificationResult`, `Attestation`, and `IMiniBlock`. fileciteturn8file0

The next implementation step is therefore **not** to invent a parallel architecture. It is to determine the smallest compatible contract that binds existing observation, verification, attestation, and memory primitives to an explicit change/decision record.

## 11. Completion semantics

```text
IMPLEMENTED ≠ VERIFIED
VERIFIED ≠ ATTESTED
ATTESTED ≠ AUTHORIZED
AUTHORIZED ≠ DEPLOYED
DEPLOYED ≠ HEALTHY
HEALTHY ≠ PERMANENT
```

A claim about a transition must state which level has actually been demonstrated.

## 12. Recursive loop

```text
OBSERVE
→ JUSTIFY
→ AUTHORIZE
→ CHANGE
→ PROVE
→ REMEMBER
→ LEARN
→ RECOMPILE
→ OBSERVE
→ ∞
```

## 13. One-line definition

> **💧 Ω∞v is a recursive calculus for determining which changes to reality are observable, justified, authorized, attributable, provable, and learnable.**

## 14. Hierarchy

```text
                    REALITY
                       │
                ┌──────▼──────┐
                │   Ω∞v       │
                │   CALCULUS  │
                └──────┬──────┘
                       │
                 Ω KERNEL
                       │
                    Ω OS
                       │
                OCEANICOS
                       │
        AI • AGENTS • PEOPLE • APPS
        DATA • INFRA • NETWORKS • WORLD
                       │
                       ▼
                    REALITY
                       ↺∞
```

**One calculus. One kernel. One OS. Infinite surfaces.**
