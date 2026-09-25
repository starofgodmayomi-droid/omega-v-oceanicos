# Repository Inventory — EARNED COMPLEXITY Audit

> Per the OCEANICOS spec §32: "DO NOT PRE-BUILD NODES THAT HAVE NOT EARNED THEMSELVES."
>
> This inventory classifies every package by its current evidence state.

## Audit Date
2026-09-25 — runtime-observed via `docker compose -f docker-compose.base44.yml`

## Classification

| State | Meaning |
|-------|---------|
| **BUILT** | Has `dist/`, compiled, wired into the API or web app |
| **SOURCE-ONLY** | Has `src/` but no `dist/`, not in the API build chain |
| **STUB** | < 200 lines of source, minimal implementation |

## BUILT — EARNED (8 packages)

These packages are compiled, imported by the API, and exercised at runtime:

| Package | Name | Lines | Role |
|---------|------|-------|------|
| `kernel` | `@omega-v/kernel` | 822 | Constitutional state machine |
| `ir` | `@omega-v/ir` | 395 | ΩIR spec + verification VM |
| `verification` | `@oceanicos/verification` | 748 | Rule evaluation, asymmetric signing |
| `observer` | `@oceanicos/observer` | 418 | Telemetry generation |
| `remember` | `@oceanicos/remember` | 648 | SQLite append-only hash chain |
| `mini` | `@oceanicos/mini` | 2677 | MINI kernel + admission + transition |
| `attestation` | `@oceanicos/attestation` | 1085 | HMAC-SHA256 + Ed25519 signing |
| `types` | `@oceanicos/types` | 1232 | Shared contracts & validators |

## SOURCE-ONLY — NOT YET EARNED (62 packages)

These packages have source code but are NOT built and NOT wired into the API.
Per EARNED COMPLEXITY, they should not be promoted until a demonstrated need
requires them and a contract justifies their activation.

### Spec-aligned (in desired eventual structure)

| Package | Name | Lines | Spec Role | Recommendation |
|---------|------|-------|-----------|----------------|
| `policy` | `@omega-v/policy` | 407 | POLICY = constraint | Build when admission needs policy enforcement |
| `worker` | `@omega-v/worker` | 699 | WORKER = bounded capability | Build when bounded execution is needed |
| `registry` | `@omega-v/registry` | 423 | Worker registry | Build alongside worker |
| `compiler` | `@omega-v/compiler` | 204 | C1 deterministic compiler | Build when ΩIR→execution is needed |
| `sdk` | `@omega-v/sdk` | 3015 | C9 SDK | Build when external integration is needed |
| `cli` | `@omega-v/cli` | 5296 | C9 CLI | Build alongside SDK |
| `evidence` | `@omega-v/evidence` | 146 | Evidence model | Build when evidence chain is formalized |
| `intent` | `@omega-v/intent` | 378 | Intent model | Build when intent formalization is needed |
| `contract` | `@omega-v/contract` | 576 | Contract model | Build when contracts are formalized |
| `governance` | `@omega-v/governance` | 166 | Governance model | Build when governance is formalized |
| `human` | `@omega-v/human` | 85 | Human authority | Build when authority is formalized |
| `learning` | `@omega-v/learning` | 150 | Learning loop | Build when learning is earned |
| `evolution` | `@omega-v/evolution` | 161 | Evolution | Build when evolution is earned |
| `runtime` | `@omega-v/runtime` | 192 | Runtime model | Build when runtime is formalized |
| `mood` | `@omega-v/mood` | 371 | MOOD = experience | Build when affective interface is earned |
| `graph` | `@omega-v/graph` | 273 | Relationship graph | Build when knowledge graph is earned |
| `store` | `@omega-v/store` | 344 | State store | Build when state store is needed |
| `pipeline` | `@omega-v/pipeline` | 640 | Pipeline | Build when pipeline is formalized |
| `security` | `@omega-v/security` | 196 | Security | Build when security is formalized |
| `sandbox` | `@omega-v/sandbox` | 310 | Sandbox | Build when sandboxing is needed |
| `scheduler` | `@omega-v/scheduler` | 306 | Scheduler | Build when scheduling is needed |
| `telemetry` | `@omega-v/telemetry` | 266 | Telemetry | Build when telemetry is needed |
| `webhook` | `@omega-v/webhook` | 428 | Webhook | Build when webhooks are needed |
| `gateway` | `@omega-v/gateway` | 526 | Gateway | Build when gateway is needed |
| `bridge` | `@omega-v/bridge` | 383 | Bridge | Build when bridging is needed |
| `edge` | `@omega-v/edge` | 283 | Edge | Build when edge is needed |
| `auth` | `@omega-v/auth` | 408 | Auth | Build when auth is formalized |
| `analytics` | `@omega-v/analytics` | 261 | Analytics | Build when analytics is earned |
| `benchmark` | `@omega-v/benchmark` | 373 | Benchmark | Build when benchmarking is needed |
| `friction` | `@omega-v/friction` | 251 | Friction signal | Build when friction is formalized |
| `green` | `@omega-v/green` | 207 | Green | Build when sustainability is earned |
| `lexicon` | `@omega-v/lexicon` | 332 | Lexicon | Build when language model is earned |
| `notary` | `@omega-v/notary` | 344 | Notary | Build when notarization is needed |

### Distributed-systems (not in desired structure, speculative)

| Package | Name | Lines | Recommendation |
|---------|------|-------|----------------|
| `agents` | `@omega-v/agents` | 466 | Archive — no earned need |
| `amm` | `@omega-v/amm` | 489 | Archive — no earned need |
| `attestor` | `@omega-v/attestor` | 482 | Archive — superseded by `@oceanicos/attestation` |
| `consensus` | `@omega-v/consensus` | 459 | Archive — no earned need |
| `coordination` | `@omega-v/coordination` | 335 | Archive — no earned need |
| `da` | `@omega-v/da` | 407 | Archive — no earned need |
| `dht` | `@omega-v/dht` | 310 | Archive — no earned need |
| `dispute` | `@omega-v/dispute` | 425 | Archive — no earned need |
| `dissensus` | `@omega-v/dissensus` | 621 | Archive — no earned need |
| `enclave` | `@omega-v/enclave` | 439 | Archive — no earned need |
| `evm` | `@omega-v/evm` | 535 | Archive — no earned need |
| `federation` | `@omega-v/federation` | 334 | Archive — no earned need |
| `governor` | `@omega-v/governor` | 481 | Archive — no earned need |
| `mempool` | `@omega-v/mempool` | 447 | Archive — no earned need |
| `mesh` | `@omega-v/mesh` | 373 | Archive — no earned need |
| `oracle` | `@omega-v/oracle` | 461 | Archive — no earned need |
| `orchestrator` | `@omega-v/orchestrator` | 304 | Archive — no earned need |
| `relay` | `@omega-v/relay` | 372 | Archive — no earned need |
| `replay` | `@omega-v/replay` | 535 | Archive — no earned need |
| `reputation` | `@omega-v/reputation` | 368 | Archive — no earned need |
| `rollup` | `@omega-v/rollup` | 386 | Archive — no earned need |
| `sequencer` | `@omega-v/sequencer` | 297 | Archive — no earned need |
| `sharding` | `@omega-v/sharding` | 421 | Archive — no earned need |
| `staking` | `@omega-v/staking` | 430 | Archive — no earned need |
| `vaas` | `@omega-v/vaas` | 251 | Archive — no earned need |
| `vault` | `@omega-v/vault` | 342 | Archive — no earned need |
| `zk` | `@omega-v/zk` | 351 | Archive — no earned need |

## Summary

| Category | Count | Action |
|----------|-------|--------|
| BUILT (earned) | 8 | Keep — actively used |
| SOURCE-ONLY (spec-aligned) | 32 | Build when earned — do NOT pre-build |
| SOURCE-ONLY (speculative) | 27 | Archive — no demonstrated need |

**Total: 70 packages → 8 earned, 62 not yet earned.**

## Migration Path (per spec §15)

```
INVENTORY (done)
→ DEPENDENCY MAP (next)
→ CONTRACT MAP
→ MIGRATION
→ TEST
→ EVIDENCE
```

Do NOT merge blindly. Do NOT delete history. Classify, relate, and promote only when earned.
