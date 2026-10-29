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

# REALITY MAP — where each organ actually lives

`ATTEST, DON'T ASSERT` applies to this document too. The blueprint above is the **intent**; this table is the **observed state** of the workspace at 2026-10-29. It is a map of declared structure, not proof of build, test, or runtime health.

| Organ                                             | Lives in                                           | Exported evidence                                                               |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| KAI — the shield and the authority derivation     | `packages/kai/src/index.ts` (`@oceanicos/kai`)     | `scanIntent`, `scanIrreversible`, `deriveAuthorityLevel`, `KAI_SHIELD_PATTERNS` |
| ELION — execution and the labelled local composer | `packages/elion/src/index.ts` (`@oceanicos/elion`) | `executeElion`, `KAI_SYSTEM_PROMPT`, `composeApprovalRequest`                   |
| OMEGA — the fail-closed verification gate         | `packages/omega/src/index.ts` (`@oceanicos/omega`) | `verifyOmega`, `sha256Hex`, `expectedOutcomeFor`, `nextActionFor`               |
| The loop that binds the three                     | `apps/api/src/execute-route.ts`                    | `POST /api/execute`, `POST /api/approve`                                        |
| The Face                                          | `apps/web/src/InvisibleComputer.tsx`               | one input: "WHAT SHALL WE MAKE REAL?"                                           |
| Immutable memory (the ledger)                     | `packages/remember`                                | hash-chained append-only blocks                                                 |
| MINI — the verification kernel                    | `packages/mini`                                    | `MiniKernel`, `compressSingleBody`                                              |
| The Law                                           | `CHARTER.md`                                       | Non-collapse rules                                                              |
| The bootstrapper                                  | `genesis.sh` (repository root)                     | local node genesis                                                              |

## How the body is wired

- `packages/kai`, `packages/elion`, and `packages/omega` are **workspace members** (`pnpm-workspace.yaml`) and direct `apps/api` dependencies, so they are built before the API and are the code the API actually runs.
- `apps/api/src/invisible-computer.ts` is a barrel: `export * from '@oceanicos/kai'`, `'@oceanicos/elion'`, `'@oceanicos/omega'`. The organ code lives in the packages; the route's import surface stays stable.
- `apps/api/src/kai-memory.ts` holds KAI's durable memory (`KaiMemory`, `OmegaIR_Contracts`, `KaiApprovals`) in the shared SQLite file family.
- Structure that the sketch above names but this repository already has under different paths: `packages/types` (the `4×4×4×4` contracts), `packages/remember` (the ledger), `apps/api` (routes/webhooks), `apps/web` (the UI). The ritual runs from `genesis.sh` at the root, not `scripts/genesis.sh`.

## What a claim about the body is allowed to say

```text
PACKAGE DECLARED   ≠ BUILT
BUILT              ≠ TESTED
TESTED             ≠ VERIFIED
VERIFIED           ≠ DEPLOYED
MEMORY             ≠ PROOF
CAPABILITY         ≠ AUTHORITY
PLAN               ≠ EXECUTION
```

To attest the body, run the loop in this repository (not in memory of a past run):

```bash
pnpm build                                                      # organs compile
node --experimental-strip-types --test-concurrency=1 \
  ./tests/integration/execute-route.integration.test.ts         # the loop behaves
pnpm validate:docs                                              # inventory still true
```
