# Reality Fixed Point — Y and the four halts

The loop as one law, written as a fixed-point combinator instead of an if-tree:

```text
Y = λf.λx.
  f(Σ ∪ Hash(x))       if O(E(x)) ≡ VERIFIED
  HALT ⊢ DIVERGENT     if K(x) ∈ SCAM
  HALT ⊢ UNKNOWN       if Evidence(x) = ∅
  HALT ⊢ NOT_EXECUTED  if Authority(x) < Required

Reality⁄Ω∞v := Y(λf.(M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤))
V ≡ (Expected ≡ Observed)
```

> The ecosystem is a continuous, infinite loop that only remembers what matches
> reality.

The combinator is why the loop is bounded rather than perpetual: `f` is applied
to `Σ ∪ Hash(x)` only when `V` holds. Every other branch returns `HALT` with one
of three verdicts and leaves `Σ` untouched, so `M(t+1) = M(t)` — the fixed point.

## Symbols

| Symbol | Reading here |
| --- | --- |
| `x` | One drop: a declared intent, its authority, its evidence, its expectation |
| `E(x)` | Execution of `x` inside the declared bound |
| `O(E(x))` | What the executor observed after executing |
| `K(x)` | The shield's verdict on `x` — supplied, never inferred by the gate |
| `Σ` | Memory of drops that matched reality (hashes, not proofs) |
| `Hash(x)` | Canonical SHA-256 of the drop as supplied |
| `Δ` | The candidate change a drop would add to memory |
| `V(Δ)` | `⊤` only when `Expected ≡ Observed` |

## The gate, in order

The law lists outcomes, not precedence. When several halt conditions hold at
once, the kernel resolves them fail-closed:

1. `K(x) ∈ SCAM` → `DIVERGENT`. A scam is refused before authority is weighed.
2. `Authority(x) < Required` → `NOT_EXECUTED`. No authority, no execution — and
   a capability is not authority.
3. `Evidence(x) = ∅` → `UNKNOWN`. Nothing was observed, so nothing is known.
4. `Expected ≢ Observed` → `DIVERGENT`. Both sides stay in the receipt; the
   observation is never rewritten to match the expectation.
5. Otherwise → `VERIFIED`, and only then is `Hash(x)` absorbed into `Σ`.

## Where it lives

- **Kernel** — `packages/mini/src/reality-fixed-point.ts`, exported from
  `@oceanicos/mini`: `judgeDrop`, `rememberVerified`, `runRealityFixedPoint`,
  `hashDrop`, `expectedEqualsObserved`, `REALITY_FIXED_POINT_LAW`.
- **Shipped path** — `POST /v1/execute` (`apps/api/src/execute-route.ts`) uses
  `judgeDrop` for its `OMEGA_VERIFY` step, so the endpoint's terminal verdict is
  the law, not a second copy of it. The shield match is already carried as
  `DIVERGENT`, and the bounded executor's missing capability is represented as
  `authority: { held: 0, required: 1 }` → `NOT_EXECUTED`.
- **Test** — `tests/integration/reality-fixed-point.integration.test.ts`, one
  case per branch plus the fixed-point property:

  ```bash
  node --experimental-strip-types --test-concurrency=1 \
    --test ./tests/integration/reality-fixed-point.integration.test.ts
  ```

## Two readings worth stating

- `Expected ≡ Observed` is **equality** by default (`RealityMatchMode: EQUAL`).
  `POST /v1/execute` uses `CONTAINS` because a declared expectation there is a
  required fragment of a live runtime report, not the whole report. The mode is
  always explicit at the call site.
- With **no declared expectation**, a present observation is undisputed and
  verifies; with **no observation**, nothing verifies (`V = ⊥`).

## What this does not claim

- `VERIFIED` means *expected equalled observed as supplied*. The kernel reads no
  world, holds no authority, and does not sign anything.
- `Σ` is not the KAI journal. The journal
  (`apps/api/src/kai-memory.ts`) records **every** verdict, including
  `DIVERGENT` and `UNKNOWN`, because an audit trail that deletes its own
  failures is not an audit trail. `Σ` is the narrower memory the law describes:
  only drops with `V(Δ) = ⊤`.
- Memory is not durable across a destroyed volume, and neither is this law.
