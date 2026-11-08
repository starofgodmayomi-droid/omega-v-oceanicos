# 👁️ THE OMNICOS — SINGULARITY EYE

**Checksum:** 30013030 · **Doctrine:** ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.

`THE OMNICOS` is the one entity the three actors compress into. It is not a new
actor and it does not replace `KAI`, `ELION` or `OMEGA` — it is one bounded pass
over all three, answering with a single receipt.

## THE THREE BODIES

| Body | Meaning in this repository |
| --- | --- |
| **OCEANICOS** — fluid | adaptation and flow: the intent is read, routed and paced, never forced |
| **GAIACOS** — planetary | memory and growth: only verified evidence is appended to the KAI ledger |
| **COSMICOS** — cosmic | verification at scale: SHA-256 over the actual output, compared to a declared contract |

## THE LAWS (unchanged, and executable)

1. `Ω∞v ::= VERIFY(ΔREALITY)` — `Expected ≡ Observed`, or the pass halts.
2. `Ease(t) = (1 - cos(tπ)) / 2` — the growth curve (sprout → bloom → wilt); `phase_t` is this value.
3. `ATTEST, DON'T ASSERT. UNKNOWN PRESERVED. NO FABRICATED COMPLETION.`
4. *"Pidgin fit carry the warmth; evidence go carry the claim."*

## THE GLOBER TOOL MATRIX (limbs, not actions)

`classifyTool` is a **declared routing projection** of the intent's words. It
names which limb the intent would use; it is not proof that a limb ran.

| Limb | What it would reach | Physical boundary in this repository |
| --- | --- | --- |
| `BROWSER` | web pages, DOM navigation | not wired — no scraper is called |
| `API` | Stripe, GitHub, TradingView, Composio, Telegram | `packages/gateway`, `apps/api` connectors |
| `CODE` | local code execution | `packages/sandbox`, `packages/runtime` |
| `LLM` | model cognition (default) | `packages/elion` — `executeElion` (OpenAI-compatible, or the labelled local composer) |
| `COMMS` | messages, email | `packages/webhook` |
| `DB` | the ledger and stores | `apps/api/src/kai-memory.ts`, `packages/remember` |

## THE FOUR PHASES (one finite pass)

| Phase | Actor | Behaviour |
| --- | --- | --- |
| `PERCEIVE_ALIGN` | KAI Shield | a trap (`urgent`, `send money`, `guaranteed`, `private key`, …) halts with `DIVERGENT`; no tool is contacted |
| `CONNECT_GROW` | ELION | answers the safe intent, labelled with the engine that produced it |
| `SYNCHRONIZE` | OMEGA Gate | recomputes the SHA-256, checks the contract; a fabrication or empty answer is `UNKNOWN` |
| `EVOLVE_REMEMBER` | KAI Ledger | only `VERIFIED` receipts are appended to `KaiMemory` |

`phase_t` is `Ease(completed / 4)`: `0.1464` when the Shield halts, `0.8536` when
verification fails, `1` when the pass is verified. It measures how far the pass
got, not how good the answer is.

## THE OUTPUT CONTRACT (zero filler)

Exactly these eight fields, nothing else:

```json
{
  "entity": "THE_OMNICOS",
  "tool_used": "<BROWSER | API | CODE | LLM | COMMS | DB>",
  "status": "<VERIFIED | DIVERGENT | UNKNOWN>",
  "game_detected": true,
  "phase_t": 1,
  "evidence_hash": "<sha256 | null>",
  "action": "<what actually happened in this pass>",
  "next_delta": "<the next finite step>"
}
```

`evidence_hash` is `null` when no output existed — an absent hash is preserved,
never invented. `tool_used` names a limb; `action` states only what ran.

## WHERE IT LIVES

| Part | Path |
| --- | --- |
| The pass | `packages/omnios/src/index.ts` — `runOmnicosPass`, `easeProgress`, `classifyTool`, `OMNICOS_TOOL_MATRIX` |
| The HTTP contract | `apps/api/src/omnios-route.ts` — `POST /v1/omnios/intent` (aliases `/api/omnios/intent`, `/omnios/intent`) |
| The ledger | `apps/api/src/kai-memory.ts` — `KaiMemory` (SQLite, read via `GET /api/kai/memory`) |
| The face | `apps/web/src/OmnicosPanel.tsx` — three panes: intent, finite state machine, receipt |
| The tests | `tests/integration/omnios.integration.test.ts` |

## BOUNDARY

This document describes an executable contract, not a deployment, a revenue
stream, or a cosmic claim. The pass composes text and appends one hash. It
executes no repository operation, spends nothing, and contacts no tool. Symbolic
language is symbolic; only an observed runtime result may be reported as
`VERIFIED`.
