# Ω∞v OS Compression Contract

## Irreducible invariant

> **Ω∞v ::= VERIFY(ΔREALITY)**
>
> Operationally: **Ω∞v is a provable, admissible, bounded change.**

The compressed form is not permission to collapse categories. It is a mnemonic for the complete lifecycle:

```text
WORLD → DISTINGUISH → INTENT → EVIDENCE → ADMIT → BOUNDED CHANGE
      → OBSERVE → PROVE → REMEMBER → RECOMPILE → next change
```

## Anti-collapse law

The OS preserves these distinctions across types, routes, SDK, CLI, Web, memory, and GitHub workflows:

```text
POSSIBLE ≠ KNOWN ≠ PERMITTED ≠ ATTEMPTED ≠ EXECUTED
         ≠ OBSERVED ≠ VERIFIED

MODEL OUTPUT ≠ CLAIM
CLAIM ≠ TRUTH
CAPABILITY ≠ AUTHORITY
AUTHORITY ≠ EXECUTION
EXECUTION ≠ SUCCESS
OBSERVATION ≠ PROOF
ATTESTATION ≠ AUTHORIZATION
TEST PASS ≠ REALITY
```

Unknown, review, deny, divergent, unobserved, and unauthorized are valid retained states. The target is **zero illegal transitions**, not literal zero information entropy.

## OS hierarchy

```text
Ω∞v invariant
  → Ω OS governed transition layer
    → execution environment
      → Ω kernel: ΩIR + admission + reality observer/verifier
        → core engine
          → AI / agents / workers
            → API / SDK / CLI / Web / Mobile / infrastructure
              → data / memory / security / GitHub
                → observed reality
```

Every consequential tool is normalized as a capability, represented in non-executable ΩIR, validated, admitted, executed in a bounded transition, and independently observed.

## Human, AI, infrastructure, reality

| Actor | Contract |
| --- | --- |
| Human | Intent and consequential accountability |
| AI / agent | Intelligence, proposal, and bounded work |
| Tool / infrastructure | Capability only |
| Ω kernel | Admissibility and trust boundary |
| Reality observer | Final evaluator of claimed outcome |

No worker grants itself authority. GitHub is a repository/tool surface, not an authority source.

## Pluralism and memory

Dissent is preserved as signal:

```text
DISSENT → INVESTIGATE → EVIDENCE → RESOLVE
                               or preserve uncertainty
```

Memory is more than storage:

```text
MEMORY = state + lineage + causality + justification + outcome
```

A divergence identifies a failed assumption and can update evidence, policy, model, or plan before recompilation. It never silently becomes success.

## Repository self-application

Repository work follows the same transition system:

```text
ISSUE / INTENT → PROPOSAL / PR → REVIEW → CI / VERIFICATION
→ MERGE → post-merge observation → next bounded change
```

Implementation status must distinguish **implemented**, **verified**, **merged**, and **deployed**. No completion state is inferred from code presence alone.

## Safety invariants

- No speculation or fabricated state.
- No destructive rewrite.
- No hidden authority or secret leakage.
- No arbitrary shell or undeclared capability.
- No remote mutation by default.
- No credential worker.
- No silent dissent collapse.
- No financial, legal, employment, tax, account-security, public-publication, or production-deployment action without its relevant approval workflow.

The compressed form is therefore the **explanatory layer**; the typed contracts, admission gate, attestations, provenance, observations, and tests are the **anti-collapse layer**.


## Durable coordination upgrade

The command/event layer now supports restart recovery through a configurable SQLite database path (`OMEGA_DB_PATH`). Independent API processes sharing that volume coordinate worker registration, heartbeats, and exclusive leases through transactional writes. This is a real multi-process, single-volume boundary; it is not yet cross-host consensus or a network database. A staging or production topology must therefore provide a shared filesystem with correct locking semantics or adopt a reviewed network database adapter before claiming distributed deployment.


## Observable coordination surface

The dashboard consumes `GET /v1/omega/workers`, `GET /v1/omega/leases`, and redacted `GET /v1/omega/events` on a bounded three-second refresh interval. These views expose observed worker presence, lease state, and lifecycle evidence only. They do not authorize execution, prove external reality, or establish cross-host consensus. An unavailable endpoint is rendered as `UNKNOWN`, not as an empty or healthy state.
