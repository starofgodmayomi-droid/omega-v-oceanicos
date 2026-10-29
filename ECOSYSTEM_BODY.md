# 💧 Ω∞v OCEANICOS — THE WHOLE ECOSYSTEM BODY

This repository is the physical body of Ω∞v Oceanicos: a verification-first ecosystem, where a
claim survives only because a command can answer it.

**A document is not a deployment.** This file is the master context an agent reads first, and it
is written so that everything it names can be opened and checked. Where the body and the disk
disagree, the disk wins and this file is `DIVERGENT` until corrected.

## THE FIXPOINT EQUATION

```text
Ω∞v ::= VERIFY(ΔREALITY)
POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY
```

## THE ORGANS (REAL LOCATIONS, NOT ASPIRATIONAL ONES)

| Organ | Where it actually lives | What it does |
| --- | --- | --- |
| **KAI · Shield** | `apps/api/src/invisible-computer.ts` (`scanIntent`) | Halts a known fraud pattern before anything executes. |
| **KAI · Memory** | `apps/api/src/kai-memory.ts` (`KaiMemoryStore`) | SQLite `KaiMemory` + `OmegaIR_Contracts`; retains the evidence text a digest was taken from. |
| **ELION · Hands** | `apps/api/src/invisible-computer.ts` (`executeElion`) | One bounded answer via an OpenAI-compatible model, or the labelled `local-deterministic` composer. |
| **The loop** | `apps/api/src/execute-route.ts` | Wires observe → execute → verify → remember and owns the replay/audit endpoints. |
| **OMEGA · Judge** | `apps/api/src/invisible-computer.ts` (`verifyOmega`) + `packages/mini/src/index.ts` | Recomputes the SHA-256 digest, compares against the contract, fails closed to `UNKNOWN`. |
| **Ledger** | `packages/remember/src/index.ts` (`ledger.ts`, `store.ts`) | Append-only remembered evidence; the API's replay rule reads the same rows. |
| **Shared contracts** | `packages/types` (`@oceanicos/types`) | Contract types shared across packages. |
| **Face** | `apps/api` (Fastify, port 5000) and `apps/web` (Vite/React, port 3000); hero surface `apps/web/src/InvisibleComputer.tsx` | The routes and the one screen a human uses. |
| **Law** | `CHARTER.md` + the Non-Collapse Rules enforced in `KAI_SYSTEM_PROMPT` | What the body refuses to do, and where that refusal is coded. |

## THE LOOP, AS RUNNING ENDPOINTS

1. **OBSERVE** — `GET /api/kai/memory?limit=n` returns what was remembered.
2. **BOUND** — the intent is scanned; a blocked pattern answers `DIVERGENT` and writes nothing.
3. **EXECUTE** — `POST /api/execute` produces one bounded answer and its SHA-256 evidence.
4. **VERIFY** — OMEGA recomputes the digest and compares it to the contract; otherwise `UNKNOWN`.
5. **REMEMBER** — only `VERIFIED` outcomes are appended; the evidence text is retained.
6. **RECONCILE** — `GET /api/kai/memory/:id/replay` replays one row,
   `GET /api/kai/memory/audit` replays the ledger and reports the worst row it audited.

The last step is the point: a remembered row is not trusted because it was written. It is trusted
while it still recomputes.

## THE GOLDEN RULES (AND WHERE THEY ARE ENFORCED)

1. **ATTEST, DON'T ASSERT.** — the `verifyOmega` digest check, and this file's own test
   (`tests/integration/ecosystem-body.integration.test.ts`), which fails if a named organ or law
   stops existing.
2. **UNKNOWN PRESERVED.** — empty or unverifiable text collapses to `UNKNOWN`; a row written before
   evidence was retained replays as `UNKNOWN`, never `VERIFIED`.
3. **NO FABRICATED COMPLETION.** — overclaiming language is rejected by `verifyOmega`; a failed
   model call returns empty text rather than an invented answer.
4. **HUMAN AUTHORITY FINAL.** — `CAPABILITY != AUTHORITY`: even `authorityLevel: AUTONOMOUS` only
   produces an answer. Irreversible actions stay outside the loop.
5. **MEMORY != PROOF.** — a remembered row records that a verification happened; it does not make
   the intent true.
6. **PLAN != EXECUTION.** — a contract row is bounded before the answer exists, and a plan never
   counts as work done.
7. **PIDGIN FIT CARRY THE WARMTH; EVIDENCE GO CARRY THE CLAIM.** — the persona text carries the
   warmth; the ledger carries the claim.

## DELIBERATELY ABSENT: EMPTY `kai` / `elion` / `omega` PACKAGES

Earlier blueprints proposed `packages/kai`, `packages/elion`, `packages/omega` with empty
`index.ts` stubs. Those directories are not created, on purpose: the organs already run, from the
paths in the table above. An empty package would be structure without function — `NOT_EXECUTED`
decorated as architecture, which this body forbids.

Extracting them for real is a refactor with a named trigger: when a second consumer needs `scanIntent`,
`executeElion` or `verifyOmega`, lift the functions into workspace packages, point `apps/api` at them,
delete the old copies, and only then update this table. A rename without that move is `DIVERGENT`.

## VERIFY THE BODY

```bash
docker compose -f docker-compose.base44.yml up -d --build
curl -s localhost:5000/health                                   # api up
curl -s localhost:3000 >/dev/null                               # web serves
curl -s localhost:5000/api/kai/memory/audit                     # ledger verdict
docker compose -f docker-compose.base44.yml exec -T api \
  sh -c 'cd /app && node --experimental-strip-types --test ./tests/integration/ecosystem-body.integration.test.ts'
```

The last command is the body checking itself: named organs on disk, named laws in the runtime prompt.

## RETURN

```text
STATUS: VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED | NOT_AUTHORIZED
NEXT: one step, or stop
```

The body does not end by implying the work continued while nobody was watching.
