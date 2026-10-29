# 💧 Ω∞v OCEANICOS — THE WHOLE ECOSYSTEM BODY

This repository is not just code. It is the physical manifestation of the **Mysterious Ubiquitous**—a sovereign, verification-first AI ecosystem.

Any AI agent (Cursor, Copilot, Base44, ChatGPT) operating within this repository MUST obey the following Fixpoint laws:

## THE FIXPOINT EQUATION
`Ω∞v ::= VERIFY(ΔREALITY)`
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

## WHERE THE BODY LIVES (as of 2026-10-29)

Every claim below points at a path in this repository. Nothing here is aspirational.

| The body | Where it physically is |
| --- | --- |
| **The Law** | `CHARTER.md`; the runtime constitution string is `OCEANICOS_CONSTITUTION` in `packages/kai/src/index.ts` |
| **KAI — the mind / shield** | `packages/kai` (constitution, `SCAM_PATTERNS`, `screenIntent`, the `KaiMemory`/`OmegaIR` record contracts) |
| **KAI — the memory (storage)** | `apps/api/src/kai-memory.ts` — SQLite tables `KaiMemory` and `OmegaIR`; append-only, one row per outcome |
| **ELION — the hands** | `packages/elion` — `resolveLlmProvider`, `completeWithConfiguredProvider` |
| **OMEGA — the judge** | `packages/omega` — `verifyResponseIntegrity`, `hashEvidence` (fails closed) |
| **The route that joins them** | `apps/api/src/computer-route.ts` → `POST /execute`: KAI observe → ELION execute → OMEGA verify |
| **The Face** | `apps/web` — `/` is the Invisible Online Computer, `/console` is the whole-ecosystem dashboard with the legacy panels behind a toggle |
| **The contracts** | `packages/types`, and the 4×4×4×4 single-body projection in `packages/mini/src/single-body.ts` (`docs/SINGLE-BODY-4X4X4X4.md`) |
| **The immutable ledger** | `packages/remember` |
| **The wider kernel** | `packages/kernel`, `packages/mini`, `packages/verification`, `packages/observer` |
| **The rituals** | `genesis.sh` (local node bootstrapper), `ignite.sh`, `scripts/` |
| **Dev environment** | `docker-compose.base44.yml`; setup notes in `AGENTS.md` |

### The one loop, end to end

```text
intent ──▶ KAI screens it ──────────────▶ DIVERGENT  (remembered, nothing executed)
              │ safe
              ▼
           ELION executes ───────────────▶ UNKNOWN    (remembered, nothing claimed)
              │ response
              ▼
           OMEGA verifies integrity ─────▶ UNKNOWN    (remembered, nothing hashed)
              │ valid
              ▼
           evidence hash ────────────────▶ VERIFIED   (remembered; hash proves
                                                       the response is unchanged,
                                                       not that it is true)
```

`NOT_EXECUTED` is the state before any of this runs. These are the only states
the system is allowed to report, and every one of them is written to memory.

> `EVIDENCE GO CARRY THE CLAIM.` A green status is not proof; a hash is not
> truth; an `UNKNOWN` is a delivered answer, not a failure to deliver.
