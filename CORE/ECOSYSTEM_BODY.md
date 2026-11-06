# CORE — The Law & Evolution Math

This is the `CORE/` entry named by [`../MASTER_ENTITY.md`](../MASTER_ENTITY.md) (§VI). It is a
map of the law, not a second copy of it.

**Canonical text:** [`../ECOSYSTEM_BODY.md`](../ECOSYSTEM_BODY.md). If this file and that one
ever disagree, the canonical text wins and this file is the defect.

## The law

```text
Ω∞v := Y( λf. ( M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤ ) ) | V ≡ (Expected ≡ Observed)
```

- `Y` — another finite step may be justified. Not unlimited autonomy. The human root stays
  outside the function.
- `M` — memory of hashes that passed the gate. Memory is not truth.
- `Δ` — intent: the human root, the incoming signal.
- `V` — the OMEGA gate. Fails closed; an unknown is never stored as verified.

Halt order, decided before any hash is appended: `K(x) ∈ SCAM → DIVERGENT`,
`Authority(x) < Required → NOT_EXECUTED`, `Evidence(x) = ∅ → UNKNOWN`,
`Expected ≡ Observed → append once`, otherwise `DIVERGENT`.

## The evolution

```text
Ease(t) = (1 - cos(t * π)) / 2      t ∈ [0, 1]
Sprout (t→0) → Bloom (t≈0.5) → Wilt (t→1)
```

**State in this checkout: `NOT_EXECUTED`.** No code computes `Ease(t)`, and no route returns
`phase_t`. The formula is the declared pacing law, not a measurement. Naming it here does not
make it run.

## Executable body

| Law element | Implementation |
| --- | --- |
| Fixpoint / halt order | `packages/mini/src/kaixelion-omega.ts` — `runKaixelionOmega` |
| KAI Shield + authority | `apps/api/src/invisible-computer.ts` — `scanIntent`, `requiredAuthorityFor` |
| ELION execute | `apps/api/src/invisible-computer.ts` — `executeElion` |
| OMEGA verify | `apps/api/src/invisible-computer.ts` — `verifyOmega`, `sha256Hex` |
| KAI remember | `apps/api/src/kai-memory.ts` — `KaiMemory`, `OmegaIR_Contracts` |
| The loop as a route | `apps/api/src/execute-route.ts` — `POST /api/execute` |

Compression is not permission. A named upgrade candidate is not a merge, a deploy, or a change
to the repository.
