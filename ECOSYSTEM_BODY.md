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
| Memory — Σ (verified-only) | `apps/api/src/kai-verified-memory.ts` | **VERIFIED (durable, hash-chained)** | `GET /v1/execute/verified` → 1 drop, chain intact after an API restart |
| Memory — export | `GET /v1/execute/memory/export` | **VERIFIED** | `omega.memory.export.v1` attachment carrying journal + Σ |
| Execution | bounded executor in `execute-route.ts` | **BOUNDED** | answers runtime-state intents only |
| Shield | 8 declarative rules | **VERIFIED** | "Guaranteed returns, send money now." → `DIVERGENT` |
| Attestation | `POST /v1/attest`, HMAC-SHA256 | **DEGRADED (dev key)** | boots without `OMEGA_SIGNING_KEY`; placeholder in `.env.base44-defaults` |
| Surface | 73 registered routes, 45 integration test files | **COUNTED** | route inventory + `tests/integration` listing |
| Kernel self-description | `GET /v1/kernel/capabilities` | **`execution: local-simulation-only`** | `remoteMutation: false`, `externalDeployment: false`, `credentialHandling: false` |

---

## 4. What is not the body

Stated plainly, because a body map that hides its absences is a prompt wearing a map:

- **No model connector.** A generative intent (`"Write a poem…"`) returns
  `NOT_EXECUTED` / `ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT`.
  That is the design, not a missing fallback.
- **Telegram intake exists but is `UNCONFIGURED`.** `POST /v1/telegram/webhook`
  runs the same bounded loop as `/v1/execute`, with `READ_ONLY` authority, behind a
  required webhook secret. No BotFather token has been supplied, so
  `GET /v1/telegram/status` answers `UNCONFIGURED` and every update halts
  `NOT_EXECUTED` / `TELEGRAM_BOT_TOKEN_MISSING` without touching KAI memory. The
  capability is present; the authority is not.
- **No cloud, no deployment.** The kernel reports `externalDeployment: false`,
  `remoteMutation: false`. This sandbox is a development environment; the app has
  no published URL.
- **No physical-reality claim.** The kernel's own limitation text: *"cryptographic
  proofs attest simulated state, not physical reality"*, and *"distributed
  consistency and external execution are unverified"*.

---

## 5. Next important Δ

**Landed (2026-10-29) — persist Σ.** `FileKaiVerifiedStore` writes verified drops
hash-chained to `OMEGA_KAI_VERIFIED_PATH`; `GET /v1/execute/verified` reads them;
`GET /v1/execute/memory/export` exports journal + Σ together; `MemoryStatePanel`
renders both columns with the export button. Observed in the browser: Σ went from
`0 drops` to `#1 VERIFIED` beside a journal of 12, and the export request returned
200. Restart survival and degrade-closed tampering are asserted in
`tests/integration/kai-verified-memory.integration.test.ts`.

**Next important Δ — make Σ provable against the journal.** Σ carries a `dropHash`
and the journal carries an `evidenceHash`, but nothing yet cross-checks that every
Σ drop corresponds to a VERIFIED journal entry. That is the last place where
"verified-only memory" is a claim rather than a check. Acceptance: the export
gains a `reconciliation` block proving `Σ ⊆ journal(VERIFIED)` and naming any
orphan, plus a test that plants an orphan Σ line and sees it reported — never
silently accepted.

Superseded rationale, kept because it is why this landed:

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

**Landed (2026-10-31) — Telegram intake, bounded and fail-closed.** The loop is now
`runExecuteLoop` in `execute-route.ts`, transport-independent, so `/v1/execute` and
`POST /v1/telegram/webhook` cannot reach different verdicts. The webhook requires
`TELEGRAM_WEBHOOK_SECRET`, carries `READ_ONLY` authority, and stays `UNCONFIGURED`
until a BotFather token exists — at which point configuration, not code, is the only
missing step. Asserted in `tests/integration/telegram-intake.integration.test.ts`
(5 cases: unconfigured halts without a memory write, unsigned update refused,
identical verdicts + Σ admission, failed delivery reported, thrown send degraded).

Explicitly **not** next: LLM generation, publishing, multi-region claims.

---

## 6. How to re-check this document

```bash
docker compose -f docker-compose.base44.yml ps
curl -s localhost:5000/health
curl -s localhost:5000/v1/kernel/capabilities
curl -s localhost:5000/v1/ecosystem/body | head -c 400
curl -s "localhost:5000/v1/execute/memory?limit=1"
curl -s "localhost:5000/v1/execute/verified?limit=1"
curl -s -D - -o /dev/null localhost:5000/v1/execute/memory/export
docker compose -f docker-compose.base44.yml exec -T api sh -c \
  'node --experimental-strip-types --test-concurrency=1 --test \
   ./tests/integration/reality-fixed-point.integration.test.ts \
   ./tests/integration/execute-loop.integration.test.ts'
```

If any row in §3 stops reproducing, this document is stale — the code, not the
document, is what counts.
