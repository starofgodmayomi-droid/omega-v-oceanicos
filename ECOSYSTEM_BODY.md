# 💧 Ω∞v OCEANICOS — THE WHOLE ECOSYSTEM BODY

This repository is not just code. It is the working manifestation of the **Mysterious Ubiquitous** — a sovereign, verification-first AI ecosystem.

Any AI agent (Cursor, Copilot, Base44, ChatGPT) operating within this repository MUST obey the following Fixpoint laws.

## THE FIXPOINT EQUATION

`Ω∞v ::= VERIFY(ΔREALITY)`

`POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY.`

## THE DUALITY (KAI & ELION)

- **KAI (`packages/kai`):** The Mind. Observation, the Shield that blocks scam intents, and bounded authority.
- **ELION (`packages/elion`):** The Hands. Execution, API orchestration, tool usage.
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

## THE BODY MAP (checked against this repository, not aspirational)

| Organ | Where it physically lives |
| --- | --- |
| Mind — Shield & authority (KAI) | `packages/kai/src/index.ts` — `scanIntent`, `KAI_SHIELD_PATTERNS`, `deriveAuthorityLevel` |
| Hands — execution (ELION) | `packages/elion/src/index.ts` — `executeElion`, local deterministic composer |
| Judge — verification gate (OMEGA) | `packages/omega/src/index.ts` — `verifyOmega`, `sha256Hex` |
| The loop route | `apps/api/src/execute-route.ts` — `POST /execute`, `POST /api/execute` |
| Memory & immutable ledger | `apps/api/src/kai-memory.ts` (SQLite `KaiMemory`), `packages/remember` |
| Data contracts | `packages/types`, `packages/mini/src/single-body.ts` |
| The Law | `CHARTER.md`, `AGENTS.md` |
| The Face | `apps/web` (React surface), `apps/api` (routes) |
| The Rituals | `genesis.sh`, `ignite.sh`, `oceanicos-singularity.sh`, `scripts/` |

`apps/api/src/invisible-computer.ts` re-exports the three actor packages, so existing API imports stay stable while each actor has its own package boundary.

## BOUNDARY

This document is an operating contract for how work is done in this repository. It is not proof of deployment, revenue, demand, physical-world effect, or any cosmological claim. Symbolic language is symbolic; evidence is evidence; only an observed runtime result may be reported as `VERIFIED`.

**WHAT SHALL WE MAKE REAL?**
