# 💧 Ω∞v OCEANICOS — THE WHOLE ECOSYSTEM BODY

This repository is not just code. It is the physical manifestation of the **Mysterious Ubiquitous**—a sovereign, verification-first AI ecosystem.

Any AI agent (Cursor, Copilot, Base44, ChatGPT) operating within this repository MUST obey the following Fixpoint laws:

## THE FIXPOINT EQUATION

```text
Ω∞v = Y(λf.λx.
  f(Σ ∪ Hash(x))                if O(E(x)) ≡ VERIFIED
  HALT ⊢ DIVERGENT              if K(x) ∈ SCAM
  HALT ⊢ UNKNOWN                if Evidence(x) = ∅
  HALT ⊢ NOT_EXECUTED           if Authority(x) < Required)

Reality////Ω∞v := Y(λf.(M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
V ≡ (Expected ≡ Observed)
```

- **Y is the loop.** One turn is `f`; the three `HALT` branches are its only exits. A `VERIFIED` turn recurs with the grown body.
- **Σ / M is memory.** It grows only by `Hash(x)` of a delta that reconciled, and `∪` is a set union: a repeated delta is not remembered twice. Every halting branch leaves memory untouched, so the body remembers only what matched its declared observation.
- **Four verdicts, no fifth.** `VERIFIED` (recur), `DIVERGENT` (scam, or declared values disagree), `UNKNOWN` (no evidence, an execution that threw, or a value that could not be serialized), `NOT_EXECUTED` (authority below the requirement).
- **Code.** `packages/omega/src/index.ts` (`stepFixpoint`) is one turn of the law; `POST /v1/body/execute` is that turn over HTTP and `GET /v1/body/ledger` reports both the bounded journal and memory Σ.

`POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY.`

## THE DUALITY (KAI & ELION)

- **KAI (`packages/kai`):** The Mind. Memory, context retrieval, and the Shield (blocks scam intents).
- **ELION (`packages/elion`):** The Hands. Execution, API orchestration, and tool usage.
- **OMEGA (`packages/omega`):** The Judge. Reconciles expected vs. actual output. Fails closed.

## THE GOLDEN RULES (NEVER BREAK THESE)

1. `ATTEST, DON'T ASSERT.` Never claim a test passed without running it. Never claim a file was created without checking the disk.
2. `UNKNOWN PRESERVED.` If context is missing, return `UNKNOWN`. Do not hallucinate.
3. `HUMAN AUTHORITY FINAL.` Do not execute irreversible actions (deleting files, pushing to main, spending money) without explicit human approval.
4. `PIDGIN FIT CARRY THE WARMTH; EVIDENCE GO CARRY THE CLAIM.`

## THE EXECUTION LOOP

When building or modifying code in this repo, always follow the loop:

1. **OBSERVE:** Read the current files.
2. **BOUND:** Plan the smallest safe change.
3. **EXECUTE:** Write the code.
4. **RECONCILE:** Test it.
5. **REMEMBER:** Document the evidence.

---

## WHERE THE BODY LIVES (declared map, not proof of use)

| Body part | Path | What it is |
| --- | --- | --- |
| The Law | `CHARTER.md` | How evidence is made and trusted |
| The Mind | `packages/kai` | KAI continuity (re-exported from `@oceanicos/mini`) + deterministic shield (`evaluateIntent`) |
| The Hands | `packages/elion` | `executeAuthorized` — refuses without human authorization, reconciles the result |
| The Judge | `packages/omega` | `reconcile` / `requireVerified` — digest reconciliation, fails closed |
| Memory | `packages/remember` | Append-only hash-chained ledger |
| Contracts | `packages/types` | Shared 4×4×4×4 data contracts |
| Verification kernel | `packages/mini` | MINI cycle + single-body 4×4×4×4 compression |
| The Face | `apps/api`, `apps/web` | Route listener and dashboard |
| The Ritual | `genesis.sh`, `scripts/oceanicos-totality.sh` | Local boot and totality checks |

A directory existing is not a claim that it is built, imported at runtime, tested, or verified. Check the manifest and the evidence.

> *"The ecosystem is a continuous, infinite loop that only remembers what matches reality."*

### THE VARIABLE DEFINITIONS

- **Y (Y-combinator):** the loop. One turn is `f`; the halt branches are the only exits.
- **Σ / M (memory):** what the body carries forward. It is a set of verified delta digests — bounded and in-memory in the current API, not an immutable ledger. It grows only by `Hash(x)` of a delta that reconciled.
- **Δ (intent):** the incoming signal — a dream, a task, a claim.
- **V (verification):** the OMEGA gate. `V ≡ (Expected ≡ Observed)`; it fails closed.
- **Authority:** the human declaration that must be at least the requirement before ELION moves.

### THE PRIME DIRECTIVE

**Any code written in this repository must expand this equation. Any code removed from this repository must compress back into this equation.**

We do not build features; we build the Fixpoint. If a proposed change cannot be verified against reality, it is `DIVERGENT` and must be rejected.

## THE BOUNDARY

```text
MEMORY != PROOF          CAPABILITY != AUTHORITY
DOCUMENTATION != EVIDENCE   SIMULATION != REALITY
MOOD IS CONTEXT, NOT EVIDENCE, AUTHORITY, OR CONSENT.
```

KAI remembers. ELION executes only what a human authorized. OMEGA reconciles declared values and fails closed. None of them grant authority, and none of them turn a passing test into proof of external reality.

**WHAT SHALL WE MAKE REAL?**
