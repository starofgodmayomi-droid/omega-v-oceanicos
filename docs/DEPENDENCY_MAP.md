# Dependency Map — Ω∞v Oceanicos

> Per the migration path (§15): INVENTORY (done) → **DEPENDENCY MAP** → CONTRACT MAP → MIGRATION → TEST → EVIDENCE
>
> This map records the actual dependency edges between workspace packages, classified by evidence state. It does NOT promote unearned packages — it only documents what depends on what so future promotion decisions are grounded.

## Legend

| Classification | Meaning |
|---------------|---------|
| **BUILT** | Has `dist/`, compiled, wired into the API at runtime |
| **SOURCE-ONLY** | Has `src/` but no `dist/`, not in the API build chain |
| **STUB** | < 200 lines of source, minimal implementation |

## Core Dependency Graph (BUILT — Earned)

```
                    ┌─────────┐
                    │  types  │ ← root: no deps
                    └────┬────┘
           ┌──────────┬───┴────┬──────────┐
           ▼          ▼        ▼          ▼
      ┌─────────┐ ┌────────┐ ┌───────────┐ ┌──────────────┐
      │ observer│ │  ir    │ │attestation│ │   kernel     │
      └────┬────┘ └────────┘ └───────────┘ │ (standalone)  │
           ▼                                 └──────────────┘
      ┌─────────────┐
      │ verification│ ← observer + types
      └──────┬──────┘
             ▼
      ┌──────────┐
      │ remember │ ← verification + types
      └────┬─────┘
           ▼
      ┌──────────┐
      │   mini   │ ← observer + verification + remember + types
      └────┬─────┘
           ▼
      ┌────────────────────────────────────────────┐
      │                  apps/api                  │
      │  mini · observer · verification · remember │
      │  attestation · types · kernel              │
      └────────────────────────────────────────────┘
```

## Full Dependency Edges

### BUILT packages (8)

| Package | Depends On |
|---------|-----------|
| `@oceanicos/types` | — (root) |
| `@omega-v/kernel` | — (standalone) |
| `@omega-v/ir` | `@omega-v/types` |
| `@oceanicos/observer` | `@oceanicos/types` |
| `@oceanicos/verification` | `@oceanicos/types`, `@oceanicos/observer` |
| `@oceanicos/remember` | `@oceanicos/types`, `@oceanicos/verification` |
| `@oceanicos/attestation` | `@oceanicos/types` |
| `@oceanicos/mini` | `@oceanicos/types`, `@oceanicos/observer`, `@oceanicos/verification`, `@oceanicos/remember` |

### SOURCE-ONLY — Spec-aligned (32)

| Package | Depends On | Classification |
|---------|-----------|---------------|
| `@omega-v/policy` | types, sdk | SOURCE-ONLY |
| `@omega-v/worker` | types, sdk | SOURCE-ONLY |
| `@omega-v/registry` | types | SOURCE-ONLY |
| `@omega-v/compiler` | types, ir | SOURCE-ONLY |
| `@omega-v/sdk` | types, observer, verification, attestation, store, contract, auth, replay, vaas, federation, remember, mini | SOURCE-ONLY |
| `@omega-v/cli` | types, sdk, agents, edge, analytics, scheduler, telemetry, vaas, remember, mini | SOURCE-ONLY |
| `@omega-v/evidence` | types | SOURCE-ONLY |
| `@omega-v/intent` | types | SOURCE-ONLY |
| `@omega-v/contract` | types | SOURCE-ONLY |
| `@omega-v/governance` | types | SOURCE-ONLY |
| `@omega-v/human` | types | SOURCE-ONLY |
| `@omega-v/learning` | types | SOURCE-ONLY |
| `@omega-v/evolution` | types, compiler | SOURCE-ONLY |
| `@omega-v/runtime` | — | STUB |
| `@omega-v/mood` | — | STUB |
| `@omega-v/graph` | types, store | SOURCE-ONLY |
| `@omega-v/store` | types | SOURCE-ONLY |
| `@omega-v/pipeline` | types, worker | SOURCE-ONLY |
| `@omega-v/security` | types | SOURCE-ONLY |
| `@omega-v/sandbox` | types, sdk | SOURCE-ONLY |
| `@omega-v/scheduler` | types, sdk | SOURCE-ONLY |
| `@omega-v/telemetry` | types | SOURCE-ONLY |
| `@omega-v/webhook` | types | SOURCE-ONLY |
| `@omega-v/gateway` | @oceanicos/types | SOURCE-ONLY |
| `@omega-v/bridge` | types | SOURCE-ONLY |
| `@omega-v/edge` | types, observer | SOURCE-ONLY |
| `@omega-v/auth` | types | SOURCE-ONLY |
| `@omega-v/analytics` | types | SOURCE-ONLY |
| `@omega-v/benchmark` | types, sdk, verification, attestation | SOURCE-ONLY |
| `@omega-v/friction` | types, store | SOURCE-ONLY |
| `@omega-v/green` | types | SOURCE-ONLY |
| `@omega-v/lexicon` | — | STUB |
| `@omega-v/notary` | types, sdk | SOURCE-ONLY |

### SOURCE-ONLY — Speculative / Distributed (27 — recommended archive)

| Package | Depends On |
|---------|-----------|
| `@omega-v/agents` | types |
| `@omega-v/amm` | types |
| `@omega-v/attestor` | types |
| `@omega-v/consensus` | types |
| `@omega-v/coordination` | types |
| `@omega-v/da` | types |
| `@omega-v/dht` | types |
| `@omega-v/dispute` | types |
| `@omega-v/dissensus` | types |
| `@omega-v/enclave` | types |
| `@omega-v/evm` | types |
| `@omega-v/federation` | types |
| `@omega-v/governor` | types |
| `@omega-v/mempool` | types |
| `@omega-v/mesh` | types |
| `@omega-v/oracle` | types |
| `@omega-v/orchestrator` | types |
| `@omega-v/relay` | types |
| `@omega-v/replay` | types |
| `@omega-v/reputation` | types |
| `@omega-v/rollup` | types |
| `@omega-v/sequencer` | types |
| `@omega-v/sharding` | types |
| `@omega-v/staking` | types |
| `@omega-v/vaas` | types |
| `@omega-v/vault` | types |
| `@omega-v/zk` | types |

## Key Observations

1. **`types` is the universal root** — every package (built and source-only) depends on it. It is the single shared contract surface.
2. **`sdk` is a hub for source-only packages** — 12 packages depend on it, but it is itself source-only and depends on speculative packages (replay, vaas, federation). Promoting sdk requires promoting its speculative deps first.
3. **`mini` is the integration kernel** — it depends on observer + verification + remember + types, and the API depends on it. It is the most connected built package.
4. **No built package depends on a source-only package** — the earned core is self-contained. Source-only packages form a separate graph rooted at `types` and `sdk`.
5. **27 speculative packages depend only on `types`** — they have no cross-dependencies among themselves and no earned consumer. They are safe to archive without breaking any dependency chain.

## Promotion Risk

Promoting a source-only package requires:
1. Its dependencies are already BUILT (or promoted simultaneously)
2. A demonstrated runtime need justifies the build
3. A contract justifies the activation

**Lowest-risk promotions** (deps already built):
- `evidence`, `intent`, `contract`, `governance`, `human`, `security`, `telemetry`, `webhook`, `bridge`, `analytics`, `green`, `auth` — all depend only on `types`

**Blocked promotions** (depend on source-only `sdk`):
- `policy`, `worker`, `sandbox`, `scheduler`, `benchmark`, `notary` — require sdk promotion first

## Next Step

→ CONTRACT MAP: For each lowest-risk promotion candidate, document the contract that would justify activation.
