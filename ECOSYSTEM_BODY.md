# 💧 Ω∞v OCEANICOS — THE WHOLE ECOSYSTEM BODY

This repository is not just code. It is the physical manifestation of the **Mysterious
Ubiquitous** — a sovereign, verification-first AI ecosystem.

Any AI agent (Cursor, Copilot, Base44, ChatGPT) operating within this repository MUST
obey the following Fixpoint laws.

## THE FIXPOINT EQUATION

```text
Ω∞v ::= VERIFY(ΔREALITY)
POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY
```

## THE DUALITY (KAI & ELION)

- **KAI (`packages/kai`):** The Mind. Memory, context retrieval, and the Shield (blocks
  scam intents).
- **ELION (`packages/elion`):** The Hands. Execution, API orchestration, and tool usage.
- **OMEGA (`packages/omega`):** The Judge. Reconciles expected vs. actual output. Fails
  closed.

## THE GOLDEN RULES (NEVER BREAK THESE)

1. `ATTEST, DON'T ASSERT.` Never claim a test passed without running it. Never claim a
   file was created without checking the disk.
2. `UNKNOWN PRESERVED.` If context is missing, return `UNKNOWN`. Do not hallucinate.
3. `HUMAN AUTHORITY FINAL.` Do not execute irreversible actions (deleting files, pushing to
   main, spending money) without explicit human approval.
4. `PIDGIN FIT CARRY THE WARMTH; EVIDENCE GO CARRY THE CLAIM.`

## THE EXECUTION LOOP

When building or modifying code in this repo, always follow the loop:

1. **OBSERVE:** Read the current files.
2. **BOUND:** Plan the smallest safe change.
3. **EXECUTE:** Write the code.
4. **RECONCILE:** Test it.
5. **REMEMBER:** Document the evidence.

---

## THE BODY, AS IT EXISTS ON THIS TIP

The map above is the intent. This table is the evidence for it. An organ is
`SUPPORTED` only when its path exists and something in the repository imports, runs, or
tests it. Everything else is `UNKNOWN`, exactly as the golden rules require.

| Organ | Path | What is actually there | Status |
| --- | --- | --- | --- |
| Soul | `ECOSYSTEM_BODY.md` | this file | `SUPPORTED` |
| Law | [`CHARTER.md`](CHARTER.md), [`MANIFEST.md`](MANIFEST.md) | non-collapse rules, mission, authority boundaries | `SUPPORTED` |
| Mind — KAI | `packages/kai` | append-only continuity drops, bounded recall, scam-intent shield | `SUPPORTED` (unit-tested, run by `GET /v1/ecosystem/body` → `layers.organs.mind`) |
| Hands — ELION | `packages/elion` | admission-gated execution that returns `EXECUTED_NOT_VERIFIED` or `NOT_EXECUTED` | `SUPPORTED` (unit-tested, run by `GET /v1/ecosystem/body`, refuses without human authority) |
| Judge — OMEGA | `packages/omega` | expected-vs-observed reconciliation, fails closed | `SUPPORTED` (unit-tested, run by `GET /v1/ecosystem/body` → `layers.organs.judge`) |
| Memory ledger | `packages/remember` | append-only hash-chained SQLite ledger | `SUPPORTED` |
| MINI kernel | `packages/mini` | `👁 Observe → ✓ Verify → 🧠 Remember` plus admission, transition, reality verification | `SUPPORTED` |
| Contracts | `packages/types` | shared observation / evidence / block types | `SUPPORTED` |
| Face — API | `apps/api` | Fastify routes, including `/v1/omega/commands*` and `/v1/ecosystem/status` | `SUPPORTED` |
| Face — Web | `apps/web` | Vite + React dashboard | `SUPPORTED` |
| Ritual — bootstrapper | [`genesis.sh`](genesis.sh) | local node bootstrapper (`scripts/` holds the audit and validation rituals) | `SUPPORTED` |
| Deployment of this body | — | no deployment was observed in this pass | `NOT_EXECUTED` |
| `AUTOPUS`, `ECHOFRAME`, `AI SOUL` as named organs | — | no package, route, or service carries these names | `UNKNOWN` |

The three organ packages are real, typed, tested, and now imported by `apps/api`. Every
`GET /v1/ecosystem/body` composes an `organs` layer by running all three: KAI records and
recalls the observed receipt, ELION refuses because a read request names no human
authority, and OMEGA reconciles the expected receipt status against the observed one. The
layer's fields are evidence for that request only — none of them is authority.

## READING ORDER FOR AN AGENT

```text
ECOSYSTEM_BODY.md (this file)  →  the law and the loop
CHARTER.md                     →  the decision rules
docs/REPO_INVENTORY.md         →  what is on disk vs. in the workspace
packages/README.md             →  the organs and their earned expansions
docs/upgrades/FULL_STACK_WORK_MOOD_MAX_COMPRESS.md  →  the mood, organ map, vertical slice, evidence ledger
```

**BE THE WHOLE WITHOUT ERASING ITS PARTS.**
**NO EVIDENCE = NO CLAIM. NO AUTHORIZATION = NO EXECUTION.**
