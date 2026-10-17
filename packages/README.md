# Packages

Shared libraries on one spine. The kernel phrase is the default mental model:

```text
Ω∞v MINI ::= Observe → Verify → Remember
```

A row is membership and a TypeScript file count under `src/`. It is not import proof, not a test result, and not a running engine. Confirm membership from `pnpm-workspace.yaml` before treating a directory as active.

## MINI kernel

| Directory | Package name | Membership | `src` `.ts` files |
| --- | --- | --- | ---: |
| `types/` | `@oceanicos/types` | WORKSPACE | 10 |
| `observer/` | `@oceanicos/observer` | WORKSPACE | 2 |
| `verification/` | `@oceanicos/verification` | WORKSPACE | 5 |
| `remember/` | `@oceanicos/remember` | WORKSPACE | 6 |
| `mini/` | `@oceanicos/mini` | WORKSPACE | 42 |

```typescript
import { MiniKernel } from '@oceanicos/mini';

const mini = new MiniKernel({ rules: [] });
```

The fenced sample is a shape, not a health check. Rules are required by the real constructor; an empty list is not evidence that a cycle passed.

## Other workspace members

| Directory | Package name | Membership | `src` `.ts` files |
| --- | --- | --- | ---: |
| `attestation/` | `@oceanicos/attestation` | WORKSPACE | 4 |
| `auth/` | `@omega-v/auth` | WORKSPACE | 2 |
| `compiler/` | `@omega-v/compiler` | WORKSPACE | 2 |
| `coordination/` | `@omega-v/coordination` | WORKSPACE | 4 |
| `evolution/` | `@omega-v/evolution` | WORKSPACE | 2 |
| `gateway/` | `@omega-v/gateway` | WORKSPACE | 2 |
| `ir/` | `@omega-v/ir` | WORKSPACE | 3 |
| `kernel/` | `@omega-v/kernel` | WORKSPACE | 2 |
| `mood/` | `@omega-v/mood` | WORKSPACE | 4 |
| `oreade/` | `@omega-v/oreade` | WORKSPACE | 2 |
| `pipeline/` | `@omega-v/pipeline` | WORKSPACE | 2 |
| `webhook/` | `@omega-v/webhook` | WORKSPACE | 2 |
| `worker/` | `@omega-v/worker` | WORKSPACE | 2 |

Apps `apps/api` and `apps/web` are workspace applications, not rows in the package tables. Their guides are [apps/README.md](../apps/README.md).

## On disk, off the workspace

These directories exist. They are **not** listed in `pnpm-workspace.yaml`. The old index called many of them engines (AMM, ZK, rollup, staking, consensus). That wording is withdrawn. Intent labels live in each package README and are not completion claims.

| Directory | Package name | Membership | `src` `.ts` files |
| --- | --- | --- | ---: |
| `agents/` | `@omega-v/agents` | SOURCE-ONLY | 2 |
| `amm/` | `@omega-v/amm` | SOURCE-ONLY | 2 |
| `analytics/` | `@omega-v/analytics` | SOURCE-ONLY | 2 |
| `attestor/` | `@omega-v/attestor` | SOURCE-ONLY | 2 |
| `benchmark/` | `@omega-v/benchmark` | SOURCE-ONLY | 2 |
| `bridge/` | `@omega-v/bridge` | SOURCE-ONLY | 2 |
| `cli/` | `@omega-v/cli` | SOURCE-ONLY | 12 |
| `consensus/` | `@omega-v/consensus` | SOURCE-ONLY | 2 |
| `contract/` | `@omega-v/contract` | SOURCE-ONLY | 2 |
| `da/` | `@omega-v/da` | SOURCE-ONLY | 2 |
| `dht/` | `@omega-v/dht` | SOURCE-ONLY | 2 |
| `dispute/` | `@omega-v/dispute` | SOURCE-ONLY | 2 |
| `dissensus/` | `@omega-v/dissensus` | SOURCE-ONLY | 2 |
| `edge/` | `@omega-v/edge` | SOURCE-ONLY | 2 |
| `enclave/` | `@omega-v/enclave` | SOURCE-ONLY | 2 |
| `evidence/` | `@omega-v/evidence` | SOURCE-ONLY | 2 |
| `evm/` | `@omega-v/evm` | SOURCE-ONLY | 2 |
| `federation/` | `@omega-v/federation` | SOURCE-ONLY | 2 |
| `friction/` | `@omega-v/friction` | SOURCE-ONLY | 2 |
| `governance/` | `@omega-v/governance` | SOURCE-ONLY | 2 |
| `governor/` | `@omega-v/governor` | SOURCE-ONLY | 2 |
| `graph/` | `@omega-v/graph` | SOURCE-ONLY | 2 |
| `green/` | `@omega-v/green` | SOURCE-ONLY | 2 |
| `human/` | `@omega-v/human` | SOURCE-ONLY | 2 |
| `intent/` | `@omega-v/intent` | SOURCE-ONLY | 2 |
| `learning/` | `@omega-v/learning` | SOURCE-ONLY | 2 |
| `lexicon/` | `@omega-v/lexicon` | SOURCE-ONLY | 2 |
| `mempool/` | `@omega-v/mempool` | SOURCE-ONLY | 2 |
| `mesh/` | `@omega-v/mesh` | SOURCE-ONLY | 2 |
| `notary/` | `@omega-v/notary` | SOURCE-ONLY | 2 |
| `oracle/` | `@omega-v/oracle` | SOURCE-ONLY | 2 |
| `orchestrator/` | `@omega-v/orchestrator` | SOURCE-ONLY | 2 |
| `policy/` | `@omega-v/policy` | SOURCE-ONLY | 2 |
| `registry/` | `@omega-v/registry` | SOURCE-ONLY | 2 |
| `relay/` | `@omega-v/relay` | SOURCE-ONLY | 2 |
| `replay/` | `@omega-v/replay` | SOURCE-ONLY | 2 |
| `reputation/` | `@omega-v/reputation` | SOURCE-ONLY | 2 |
| `rollup/` | `@omega-v/rollup` | SOURCE-ONLY | 2 |
| `runtime/` | `@omega-v/runtime` | SOURCE-ONLY | 2 |
| `sandbox/` | `@omega-v/sandbox` | SOURCE-ONLY | 2 |
| `scheduler/` | `@omega-v/scheduler` | SOURCE-ONLY | 2 |
| `sdk/` | `@omega-v/sdk` | SOURCE-ONLY | 5 |
| `security/` | `@omega-v/security` | SOURCE-ONLY | 2 |
| `sequencer/` | `@omega-v/sequencer` | SOURCE-ONLY | 2 |
| `sharding/` | `@omega-v/sharding` | SOURCE-ONLY | 2 |
| `staking/` | `@omega-v/staking` | SOURCE-ONLY | 2 |
| `store/` | `@omega-v/store` | SOURCE-ONLY | 2 |
| `telemetry/` | `@omega-v/telemetry` | SOURCE-ONLY | 2 |
| `vaas/` | `@omega-v/vaas` | SOURCE-ONLY | 2 |
| `vault/` | `@omega-v/vault` | SOURCE-ONLY | 2 |
| `zk/` | `@omega-v/zk` | SOURCE-ONLY | 2 |

## Naming

Two scopes are in use: `@oceanicos/*` on the MINI kernel and attestation, `@omega-v/*` elsewhere. This index does not rename either.

## Commands

```bash
pnpm install
pnpm --filter @oceanicos/mini build
```

Root `pnpm test` does not take a path filter. See the root manifest for the enumerated list.

**Status of this index:** documentation only, aligned to the workspace file on the commit that contains it.
**See also:** [docs/MINI.md](../docs/MINI.md), [docs/REPO_INVENTORY.md](../docs/REPO_INVENTORY.md)
