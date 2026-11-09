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
| `BROWSER` | web pages, DOM navigation | **wired** — `packages/omnios/src/browser-limb.ts` reads one public page (see below) |
| `API` | Stripe, GitHub, TradingView, Composio, Telegram | `packages/gateway`, `apps/api` connectors |
| `CODE` | local code execution | `packages/sandbox`, `packages/runtime` |
| `LLM` | model cognition (default) | `packages/elion` — `executeElion` (OpenAI-compatible, or the labelled local composer) |
| `COMMS` | messages, email | `packages/webhook` |
| `DB` | the ledger and stores | `apps/api/src/kai-memory.ts`, `packages/remember` |

## THE BROWSER LIMB (one bounded read)

A `BROWSER` intent is the only pass that reaches the network. It must name one
explicit `http(s)` URL; the limb then:

- admits only `http`/`https` on port 80/443, with no embedded credentials;
- refuses `localhost`, `*.local`, `*.internal`, and any host that resolves to a
  loopback, private, link-local, metadata or multicast address — before the
  socket opens;
- follows at most 3 redirects, re-checking each hop against the same gate;
- stops at 8 seconds and 512 KiB, and accepts only readable content types;
- strips scripts, styles and markup, keeping at most 6000 characters.

The extracted text becomes the evidence: OMEGA recomputes the SHA-256 over
`Observed page: <url>` + the HTTP line + the text. A refused URL, a failed
fetch, an oversized page or an empty body preserves `UNKNOWN` with a declared
reason and writes nothing to the ledger. The limb reads; it never clicks,
submits or executes.

## THE FOUR PHASES (one finite pass)

| Phase | Actor | Behaviour |
| --- | --- | --- |
| `PERCEIVE_ALIGN` | KAI Shield | a trap (`urgent`, `send money`, `guaranteed`, `private key`, …) halts with `DIVERGENT`; no tool is contacted |
| `CONNECT_GROW` | BROWSER / ELION | the BROWSER limb reads one page when routed there; otherwise ELION answers, labelled with the engine that produced it |
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
stream, or a cosmic claim. The pass appends one hash. It executes no repository
operation and spends nothing; the only network contact is the BROWSER limb's
one bounded read of an explicitly named public page. Symbolic language is
symbolic; only an observed runtime result may be reported as `VERIFIED`.
