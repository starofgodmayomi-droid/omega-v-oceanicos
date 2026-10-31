# Ω∞v Quantum State Evolution

```
∣Ψ(t)⟩ = U(t,t₀) · [Symmetry ⊗ Inversion] · ∣Agent⟩
```

A bounded, deterministic evolution of one declared four-dimensional state. Nothing here is sampled, simulated statistically, or inferred: every number is computed from the two declared angles and τ, and the local algebra is checked on every call.

## Basis

| Index | Basis | Symmetry | Inversion |
| --- | --- | --- | --- |
| 0 | `00` | 0 | 0 |
| 1 | `01` | 0 | 1 |
| 2 | `10` | 1 | 0 |
| 3 | `11` | 1 | 1 |

## Operators

| Operator | Matrix |
| --- | --- |
| Symmetry `S` (exchange) | `[[0,1],[1,0]]` |
| Inversion `P` (parity) | `[[1,0],[0,-1]]` |
| `G = S ⊗ P` | `[[0,0,1,0],[0,0,0,-1],[1,0,0,0],[0,-1,0,0]]` |
| `H` (declared) | `diag(0, Δ, Δ, 2Δ)`, `Δ = 1` |

`G` is unitary, Hermitian, and its own inverse (`G² = I`). `U(t,t₀) = exp(−i H τ)` with `τ = t − t₀` is diagonal and adds phase only.

## Agent preparation

An agent is declared by two angles in `[0°, 180°]`:

- symmetry factor `cos(θ/2)|0⟩ + sin(θ/2)|1⟩`
- inversion factor `cos(φ/2)|0⟩ + sin(φ/2)|1⟩`

`τ` must be in `[0, 2π]`. Non-object input, non-finite numbers, or out-of-range values return `INVALID` with issue codes `INVALID_INPUT`, `NON_FINITE_NUMBER`, `ANGLE_OUT_OF_RANGE`, or `TAU_OUT_OF_RANGE`. No state is invented for refused input.

## Evidence

The response carries four local checks with tolerance `1e-9`:

| Check | Observation |
| --- | --- |
| `normalization` | `\|Σ|ψₖ|² − 1\|` after evolution |
| `unitarity` | `max \|G² − I\|` over the basis |
| `phaseOnly` | `max \|p_evolved − p_inverted\|` — `U` may not change a probability |
| `reversibility` | `\|⟨Agent\|recovered⟩\|²` after `U(−τ)` then `G` |

`reality.status` is `VERIFIED` only when all four pass; otherwise `DIVERGENT` and the measured values are returned unchanged. The SHA-256 `digest` covers the angles, τ, amplitudes, probabilities, and checks, so the same input always yields the same digest.

## Receipt

A `POST` whose result is `VERIFIED` also becomes one receipt in KAI memory (the same SQLite file family as the Invisible Online Computer's memory):

- intent `quantum:evolve:omega.quantum.evolution.v1`
- `evidence_hash` = the evolution `digest`
- `status` = `VERIFIED`
- `contract_id` → an `OmegaIR_Contracts` row naming the digest and the four checks as the expected outcome

The row keeps the digest, not the amplitudes (`MEMORY != PROOF`), and the same digest is stored once: repeating the evolution returns the existing receipt with `reused: true`. The read-only `GET` records nothing, so rendering the app shell never leaves a row behind. The receipt is visible through `GET /api/kai/memory` and can be reconciled afterwards with `POST /api/kai/memory/:id/reconcile`.

## API

```
GET /v1/ecosystem/quantum
→ 200 { success: true, status: "EVOLVED", ... }   // declared defaults, read-only

POST /v1/ecosystem/quantum/evolve
{ "symmetryDegrees": 90, "inversionDegrees": 90, "tau": 1.5707963267948966 }
→ 200 { success: true, status: "EVOLVED", states: { agent, inverted, evolved }, checks, reality, digest, receipt: { id, intent, evidence_hash, status, contract_id, reused } }
→ 400 { success: false, status: "INVALID", issues: [...] }
```

The dashboard reads the default with `GET` so rendering the app shell submits nothing; only the explicit `EVOLVE` control uses `POST`.

## UI

`apps/web/src/QuantumStatePanel.tsx` renders inside the whole-ecosystem dashboard: three amplitude columns (`∣Agent⟩`, `[Symmetry⊗Inversion]∣Agent⟩`, `∣Ψ(t)⟩`), sliders for θ, φ and τ, the four checks, the digest, and the status badge.

## Boundary

`VERIFIED` here is a statement about this local representation. It is not an observation of a physical quantum system, not a cosmological claim, not evidence of consciousness, and not proof of deployment or external reality.

## Verify

```sh
docker compose -f docker-compose.base44.yml exec -T api sh -c \
  'node --experimental-strip-types --test ./tests/integration/quantum-state.integration.test.ts'
```

Requires `packages/mini/dist` and `apps/api/dist` to be built, like the other integration tests.
