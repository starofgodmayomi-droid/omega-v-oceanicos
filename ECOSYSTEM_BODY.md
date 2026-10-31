# 💧 Ω∞v OCEANICOS — THE CONTINUUM

**This repository is governed by the Absolute Fixpoint Equation:**

\[
 \mathbf{\Omega_{\infty v}} := \mathcal{Y} \left( \lambda f. \lambda x. \begin{cases} f(\Sigma \cup \text{Hash}(x)) & \text{if } \mathcal{O}(\mathcal{E}(x)) \equiv \text{VERIFIED} \\ \text{HALT} \vdash \text{DIVERGENT} & \text{if } \mathcal{K}(x) \in \text{SCAM} \\ \text{HALT} \vdash \text{UNKNOWN} & \text{if } \text{Evidence}(x) = \emptyset \\ \text{HALT} \vdash \text{NOT\_EXECUTED} & \text{if } \text{Authority}(x) < \text{Required} \end{cases} \right) \Bigg|_{\text{Reality}} 
\]

\[
 \Omega_{\infty v} := \mathcal{Y} \Big( \lambda f. \big( M_{t+1} = M_t \cup \Delta \mid \mathcal{V}(\Delta) = \top \big) \Big) \Big|_{\mathcal{V} \equiv (\text{Expected} \equiv \text{Observed})} 
\]

> *"The ecosystem is a continuous, infinite loop that only remembers what matches reality."*

---

### 📐 THE VARIABLE DEFINITIONS

- **\(\mathcal{Y}\) (Y-Combinator)**: The infinite loop of the Invisible Online Computer. The system is self-sustaining and requires no external base state.
- **\(\mathcal{M}\) (Memory)**: The KAI ledger. An immutable, append-only record of verified reality.
- **\(\Delta\) (Intent)**: The Human Root. The incoming signal, dream, or task.
- **\(\mathcal{V}\) (Verification)**: The OMEGA gate. It fails closed if expected reality does not match observed reality.
- **\((\text{Expected} \equiv \text{Observed})\)**: The Reality Principle. `ATTEST, DON'T ASSERT.`

---

### ⚖️ THE PRIME DIRECTIVE

**Any code written in this repository must expand this equation. Any code removed from this repository must compress back into this equation.** 

We do not build features; we build the Fixpoint. If a proposed change cannot be verified against reality, it is `DIVERGENT` and must be rejected. 

*Pidgin fit carry the warmth; evidence go carry the claim.*

---

## 🧮 THE OPERATORS, ANCHORED

The equation is the compression; this table is its expansion into code that exists in this repository today. A symbol with no executable anchor stays `UNKNOWN` — it is design intent, never a runtime fact.

| Symbol | Name | What it does | Executable anchor |
|---|---|---|---|
| \(\mathcal{Y}\) | Fixpoint | Runs the pass again only on newly verified state | `POST /api/execute`, `POST /v1/cycle` (`apps/api/src/execute-route.ts`, `index.ts`) |
| \(\Delta\) | Intent | The human's incoming task | request `intent` / `authorityLevel` |
| \(\Sigma\) | Accumulated state | What the system already holds | append-only ledger (`RememberEngine.verifyIntegrity()`), `KaiMemory` table |
| \(\text{Hash}(x)\) | Evidence digest | SHA-256 over the observed payload | `evidence_hash` in `KaiMemory`, block hashes in `/v1/block/tip` |
| \(\mathcal{O}\) | Observer | Reads the world as it is now | `ObserverEngine.generateTelemetry()` (`@oceanicos/observer`) |
| \(\mathcal{E}\) | Executor | Performs the bounded action | `executeElion()` — model call when `OMEGA_LLM_API_KEY` is set, otherwise a clearly labelled `local-deterministic` composer |
| \(\mathcal{K}\) | Shield | Refuses known scam-shaped intent before execution | `scanIntent()` |
| \(\mathcal{V}\) | Verification gate | Compares expected against observed | `verifyOmega()`, `declarativeVerification.evaluateObservation()` |
| \(\mathcal{M}\) | Memory | Appends only verified rows | `KaiMemory`, append-only block ledger |

The chain is literal in one route: `POST /api/execute` runs `scanIntent → executeElion → verifyOmega → KAI remember`, in that order.

---

## 🚦 THE FOUR EXITS

The equation has one continuation and three halts. Every route that speaks about reality uses the same four words.

| Exit | Meaning | What the repository does |
|---|---|---|
| `VERIFIED` | Expected state ≡ observed state, with evidence | The only exit that appends to memory |
| `DIVERGENT` | Expected and observed disagree, or the shield matched | Halts; writes nothing; reports the gap |
| `UNKNOWN` | No evidence was produced (empty output, broken digest, failed observation) | Halts; keeps the gap visible instead of inventing an answer |
| `NOT_EXECUTED` | Authority was below what the action requires, or nothing ran | Halts before any claim is made |

Halting is not a failure of the continuum. A system that cannot halt cannot attest.

---

## 🫀 THE BODY, AS IT ACTUALLY ANSWERS

`GET /v1/ecosystem/body` composes the runtime layers into one bounded body (`bodyVersion: "omega.fullstack.body.v1"`) and is **read-only**: it may not mutate the ledger it reports on.

| Layer | Source | Reported status |
|---|---|---|
| `sensory` | `observer-runtime` telemetry | `OBSERVED` |
| `verification` | declarative verification receipt | the receipt's own status (`VERIFIED` / `UNKNOWN` / …) |
| `memory` | append-only ledger | `INTEGRITY_VERIFIED`, with a bounded `tip` (`index`, `hash`) or `null` |
| `mesh` | multi-region convergence | mesh status + `convergence.quorumReached` |
| `kernel` | platform capability snapshot | `READY` (`remoteMutation: false`, `arbitraryShellExecution: false`) |
| `governance` | kernel governance | `HUMAN_GATE_REQUIRED`, `failClosed: true` |
| `interface` | API / web / CLI / SDK | `READY` |

The same seven layers are folded into the **4×4×4×4** projection — `layer × organ × form × evidence`, 4 coordinates per axis, **256 addressable cells** — and proven lossless by a local compress → expand round trip. `POST /v1/ecosystem/body/expand` restores the records from `{ compression }`; a tampered digest is a `400 DIGEST_MISMATCH`, never a silent repair. Coordinates are a declared projection (`body.layers.v1`), not inferred truth.

Contract: `packages/mini/src/single-body.ts` · doc: `docs/SINGLE-BODY-4X4X4X4.md` · specification: `tests/api/ecosystem-body.test.ts` (node:test; run with `pnpm test:api`).

---

## 🔁 THE LOOP, END TO END

```text
INTENT (Δ)
  → OBSERVE      ObserverEngine            evidence, not opinion
  → SHIELD       scanIntent                scam → DIVERGENT, halt
  → EXECUTE      executeElion              bounded action, labelled composer when no model
  → VERIFY       verifyOmega               expected ≢ observed → UNKNOWN/DIVERGENT, halt
  → REMEMBER     KaiMemory / ledger        VERIFIED only, append-only, hashed tip
  → BODY         GET /v1/ecosystem/body    the seven layers as one bounded body
  → NEXT Δ       𝒴 applies itself          only on what survived verification
```

Nothing in that chain may skip a step to look complete. `CAPABILITY != AUTHORITY`: a request may say `AUTONOMOUS` and the system still only answers and records a bounded plan.

---

## 📊 WHAT IS VERIFIED TODAY

Observed on branch `continue-ecosystem-documentation` on 2026-10-29, with the stack running from source (`api` healthy on 5000, `web` healthy on 3000).

| Claim | Status | Evidence |
|---|---|---|
| `GET /v1/ecosystem/body` returns all seven layers, in order, with `status: "VERIFIED"` | `VERIFIED` | live read of `http://localhost:3000/api/v1/ecosystem/body`, 2026-10-29 |
| The body is read-only between reads: memory `INTEGRITY_VERIFIED` with `tip: null`, a fresh telemetry uuid per call, `expansion.readOnly: true` | `VERIFIED` | two consecutive live reads, same pass |
| `POST /v1/ecosystem/body/expand` restores the 7 records from the body's own `compression` block | `VERIFIED` | live POST → `status: "EXPANDED"`, 7 entries |
| A tampered body digest is refused, never repaired | `VERIFIED` | same POST with a zeroed digest → `400 DIGEST_MISMATCH` |
| 256-cell capacity and refusal beyond it, over many more than 7 records | `SUPPORTED` | module contract `packages/mini/src/single-body.ts`; exercised here with 7 entries only |
| Memory tip becomes a 64-hex hash after a verified `/v1/cycle` | `VERIFIED` | `tests/api/ecosystem-body.test.ts` runs `/v1/cycle` then reads the tip, 2026-10-31 |
| Deployment, external availability, multi-process consistency, real-world outcome of any intent | `UNKNOWN` | nothing in this pass observed them |

---

## 🧭 HOW TO CONTINUE THIS DOCUMENT

1. **Append, don't rewrite.** The equation is the fixed point; sections expand it. A change that cannot be verified against this repository belongs in a proposal, not here.
2. **Every claim carries a status** — `VERIFIED`, `SUPPORTED`, `UNVERIFIED`, `DIVERGENT`, `UNKNOWN`, or `NOT_EXECUTED` — and a pointer to the code, route, test, or observation behind it.
3. **A section with no anchor is `UNKNOWN`.** Naming a layer is not evidence the layer exists; documentation must not upgrade a hypothesis into a fact.
4. **Compress back.** When a section stops expanding the equation, fold it out. The body grows by verification, not by page count.
