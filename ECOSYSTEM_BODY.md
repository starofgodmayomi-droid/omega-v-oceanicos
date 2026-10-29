# Ω∞v OCEANICOS — ECOSYSTEM BODY

> **Status of this artifact:** a merged body record — law, layers, and the evidence
> that actually exists at this commit. Observation date **2026-10-29**, commit
> **5e3c4993**, branch `dashboard-check`.
>
> This is a body *map*, not a body. It replaces neither the source prompts
> ([WHOLE-ECOSYSTEM-MASTER-PROMPT.md](WHOLE-ECOSYSTEM-MASTER-PROMPT.md),
> [MASTER_HANDOFF.md](MASTER_HANDOFF.md)) nor the running code. Every row below is
> labelled with the observation that produced it; anything not observed is marked
> `UNKNOWN` or `NOT_EXECUTED`, and stays that way.

```text
POSSIBLE ≠ KNOWN ≠ REPRESENTABLE ≠ PERMITTED ≠ PROPOSED
≠ ATTEMPTED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED
≠ DEPLOYED ≠ REALITY
```

---

## 0. The one line

```text
Reality⁄Ω∞v := Y(λf.(M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤))
V ≡ (Expected ≡ Observed)
```

One loop, and one memory rule: *the ecosystem only remembers what matches reality.*
Everything else in this document is how far this repository actually gets inside
that sentence.

---

## 1. The law, and where it executes

```text
Y = λf.λx.
  f(Σ ∪ Hash(x))       if O(E(x)) ≡ VERIFIED
  HALT ⊢ DIVERGENT     if K(x) ∈ SCAM
  HALT ⊢ UNKNOWN       if Evidence(x) = ∅
  HALT ⊢ NOT_EXECUTED  if Authority(x) < Required
```

| Piece | Implementation | Evidence |
| --- | --- | --- |
| The gate | `judgeDrop` — `packages/mini/src/reality-fixed-point.ts` | 7/7 kernel tests pass at this commit |
| The recursion | `runRealityFixedPoint` — same file | halt stops the loop; memory unchanged on halt |
| The memory rule | `rememberVerified` — absorbs `Hash(x)` only on `VERIFIED` | `M(t+1) = M(t)` asserted when nothing verifies |
| The shipped path | `POST /v1/execute` → `OMEGA_VERIFY` calls `judgeDrop` | live: `VERIFIED` / `DIVERGENT` / `NOT_EXECUTED` / shield `DIVERGENT` |
| Precedence | SCAM → AUTHORITY → EVIDENCE → VERIFICATION | asserted in test 6 |

Full reading, including the two ambiguous points (match mode, absent expectation):
[docs/REALITY-FIXED-POINT.md](docs/REALITY-FIXED-POINT.md).

---

## 2. The duality

| | KAI — mind / memory | ELION — hands / execution |
| --- | --- | --- |
| Role | holds context, hashes evidence, keeps the chain, refuses scams | forms the bound contract, acts only inside declared authority |
| In code | `apps/api/src/kai-memory.ts`, `KAI_SHIELD_RULES`, `hashDrop` | `apps/api/src/execute-route.ts` (bound executor) |
| Observed | `GET /v1/execute/memory` → `integrity: verified-local-hash-chain` | `POST /v1/execute` → 5-step receipt |
| Limit | a journal of verdicts is *not* proof of reality | reads only state this process already observed |

`CAPABILITY ≠ AUTHORITY` is enforced literally: a capability the executor does not
hold is passed to the gate as `authority { held: 0, required: 1 }` and halts
`NOT_EXECUTED`. Nothing generates an answer it cannot observe.

---

## 3. Body map — layer, location, status

Observed 2026-10-29 in this sandbox (`docker compose -f docker-compose.base44.yml`):

| Layer | Where | Status | How it was observed |
| --- | --- | --- | --- |
| Process | `api` + `web` services | **VERIFIED** | `/health` → `readiness: ready`; port 3000 serves Vite |
| Sensory | `@oceanicos/observer` | **OBSERVED (simulated)** | `GET /v1/ecosystem/body` → `layers.sensory.status: OBSERVED`, generated telemetry |
| Verification | `@oceanicos/verification`, OMEGA gate | **VERIFIED (local)** | kernel + execute-loop suites: 8/8 pass at this commit |
| Memory — audit | `apps/api/src/kai-memory.ts` | **VERIFIED (local hash chain)** | journal height > 0, chain re-verified on read |
| Memory — Σ (verified-only) | `runRealityFixedPoint` | **OBSERVED, NOT DURABLE** | lives in the process; no store behind it |
| Execution | bounded executor in `execute-route.ts` | **BOUNDED** | answers runtime-state intents only |
| Shield | 8 declarative rules | **VERIFIED** | "Guaranteed returns, send money now." → `DIVERGENT` |
| Attestation | `POST /v1/attest`, HMAC-SHA256 | **DEGRADED (dev key)** | boots without `OMEGA_SIGNING_KEY`; placeholder in `.env.base44-defaults` |
| Surface | 69 registered routes, 43 integration test files | **COUNTED** | route grep + `tests/integration` listing |
| Kernel self-description | `GET /v1/kernel/capabilities` | **`execution: local-simulation-only`** | `remoteMutation: false`, `externalDeployment: false`, `credentialHandling: false` |

---

## 4. What is not the body

Stated plainly, because a body map that hides its absences is a prompt wearing a map:

- **No model connector.** A generative intent (`"Write a poem…"`) returns
  `NOT_EXECUTED` / `ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT`.
  That is the design, not a missing fallback.
- **No Telegram intake.** No bot is configured; a BotFather token has not been
  supplied. `NOT_EXECUTED`.
- **No cloud, no deployment.** The kernel reports `externalDeployment: false`,
  `remoteMutation: false`. This sandbox is a development environment; the app has
  no published URL.
- **No durable Σ.** Verified-only memory is a value returned by a pure function.
  Restart the API and it is gone (the *audit* journal survives; Σ does not).
- **No physical-reality claim.** The kernel's own limitation text: *"cryptographic
  proofs attest simulated state, not physical reality"*, and *"distributed
  consistency and external execution are unverified"*.

---

## 5. Next important Δ

**Persist Σ — the verified-only memory — so the body can keep what matched reality
across a restart.**

Why this one, now: the law's entire value is `M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤`, and
today the body remembers its failures durably (the journal) while its verified
state evaporates with the process. That inverts the sentence the ecosystem is built
on.

Smallest complete slice:

1. A hash-chained store for Σ beside the KAI journal (same append-only discipline,
   same integrity-on-load check), keyed by drop hash.
2. `runRealityFixedPoint` accepts a seed Σ read from that store; a VERIFIED drop is
   appended to disk, every other verdict leaves it byte-identical.
3. One read surface (`GET /v1/execute/verified`) reporting height + integrity +
   the limitation string — no new capability, no authority.
4. Tests that are already named above extended: restart the app on the same path and
   assert Σ height and chain survive; assert a `DIVERGENT` drop never enters Σ.

Stop conditions: any need for a model connector, a credential, or remote mutation
means this Δ is out of scope. A tampered Σ file must degrade to
`integrity: DEGRADED`, never silently reload.

Explicitly **not** next: Telegram intake (blocked on a token only you can supply),
LLM generation, publishing, multi-region claims.

---

## 6. How to re-check this document

```bash
docker compose -f docker-compose.base44.yml ps
curl -s localhost:5000/health
curl -s localhost:5000/v1/kernel/capabilities
curl -s localhost:5000/v1/ecosystem/body | head -c 400
curl -s "localhost:5000/v1/execute/memory?limit=1"
docker compose -f docker-compose.base44.yml exec -T api sh -c \
  'node --experimental-strip-types --test-concurrency=1 --test \
   ./tests/integration/reality-fixed-point.integration.test.ts \
   ./tests/integration/execute-loop.integration.test.ts'
```

If any row in §3 stops reproducing, this document is stale — the code, not the
document, is what counts.
