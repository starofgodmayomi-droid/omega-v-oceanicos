# Dependency Map — Ω∞v Oceanicos

> INVENTORY → **DEPENDENCY MAP** → CONTRACT MAP → MIGRATION → TEST → EVIDENCE
>
> Observed at tip `61b5fff`. This map records **declared** edges, not verification of runtime health.

## Legend

| Classification | Meaning |
|----------------|---------|
| **BUILT** | `pnpm-workspace.yaml` + imported by `apps/api` |
| **WORKSPACE** | `pnpm-workspace.yaml`, not imported by `apps/api` |
| **SOURCE-ONLY** | On disk, not in the workspace |
| **STUB** | SOURCE-ONLY, thin implementation |

## Core graph (BUILT)

```text
@oceanicos/types
    |
    +-- @oceanicos/observer
    |       |
    |       +-- @oceanicos/verification
    |               |
    |               +-- @oceanicos/remember
    |                       |
    |                       +-- @oceanicos/mini --+
    +-- @oceanicos/attestation -------------------+ 
    +-- (standalone / no workspace deps)          |
            @omega-v/kernel                       +-- apps/api
            @omega-v/oreade                       |
            @omega-v/mood ------------------------+ 

WORKSPACE (not imported by apps/api):
    @omega-v/gateway      -> @oceanicos/types
    @omega-v/auth         -> @oceanicos/types
    @omega-v/webhook      -> @oceanicos/types
    @omega-v/coordination -> (no workspace deps declared)
```

## Corrections vs 2026-09-25 map

| Prior claim | Current evidence |
|-------------|------------------|
| `@omega-v/ir` is BUILT | **SOURCE-ONLY** — not in `pnpm-workspace.yaml` |
| `@omega-v/mood` is STUB | **BUILT** — workspace + imported by `apps/api` |
| `@omega-v/oreade` omitted | **BUILT** — workspace + imported by `apps/api` |
| `coordination` archive candidate | **WORKSPACE** — in `pnpm-workspace.yaml`, not API-imported |
| `gateway` / `auth` / `webhook` SOURCE-ONLY | **WORKSPACE** |

## Key observations

1. **`types` is the MINI root.** The earned observe-verify-remember-mini chain is self-contained.
2. **`ir` is not an active workspace package.** Do not treat Omega IR as compiled runtime on this tip.
3. **Mood and OREADE are live API imports.** They remain **layers**, not authority.
4. **Four workspace packages are not API-imported.** Workspace membership is not capability.
5. **Dormant packages must not be promoted in bulk.**

## Promotion risk

Promoting a SOURCE-ONLY package requires:

1. Workspace membership is explicit
2. Dependencies are already BUILT or promoted in the same authorized transition
3. A demonstrated runtime need
4. Tests + observation after the change

Lowest-risk (depend only on types, still off-workspace): evidence, intent, contract, governance, human, security, telemetry, bridge, analytics, green.

Blocked by sdk: policy, worker, sandbox, scheduler, benchmark, notary.

## Next step

CONTRACT MAP for one candidate at a time. Recommended serial slices already in flight as PRs (not merged here):

1. Ignore `.pnpm-store` (#322)
2. Oreade container / idempotent retries (#327, #329)
3. Fail-closed worker constitution (#330)
