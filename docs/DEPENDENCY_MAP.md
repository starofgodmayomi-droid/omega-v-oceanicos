# Dependency Map — Ω∞v Oceanicos

> INVENTORY → **DEPENDENCY MAP** → CONTRACT MAP → MIGRATION → TEST → EVIDENCE
>
> **Reconciled** at tip `d1bde925` (branch `reconcile-architecture`) against the
> live API self-model (`GET /v1/dependencies`), `pnpm-workspace.yaml`,
> `apps/api/package.json`, and the packages present on disk. This map records
> **observed** edges and classifications, not a claim of VERIFIED / DEPLOYED /
> HEALTHY for any dormant surface.

## How this map was observed

| Source | Method | Status |
|--------|--------|--------|
| `pnpm-workspace.yaml` | read | 24 workspace members |
| `apps/api` imports | `grep @oceanicos/@omega-v` in `apps/api/src` | 10 packages imported |
| Live self-model | `curl http://localhost:5000/v1/dependencies` | 43 nodes, `success:true` |
| Disk inventory | `ls packages/` | 63 package directories (excl. `README.md`) |
| Runtime | `GET /health` → `ready`; `GET /` → 200; proxy → 200 | api + web healthy |

Every classification below is **OBSERVED**, not asserted. `VERIFIED` is reserved
for a check that ran; dormant packages carry no such claim.

## Legend

| Classification | Meaning | Count |
|----------------|---------|------|
| **BUILT** | `pnpm-workspace.yaml` **and** imported by `apps/api` | 9 |
| **WORKSPACE** | `pnpm-workspace.yaml`, not imported by `apps/api` | 8 |
| **SOURCE-ONLY** | On disk, in the self-model, not in the workspace | 27 |
| **STUB** | SOURCE-ONLY, thin implementation | 2 |
| **UNTRACKED** | On disk, **not** in the self-model, workspace, or API | 26 |

## Core graph (BUILT — the live spine)

These 9 packages are workspace members, built by the `setup` service, and
imported by `apps/api`. This is the only surface that is OBSERVED running.

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
```

## WORKSPACE (buildable, not API-imported)

```text
@omega-v/gateway      -> @oceanicos/types
@omega-v/auth         -> @oceanicos/types
@omega-v/webhook      -> @oceanicos/types
@omega-v/coordination -> (no workspace deps declared)
@omega-v/evidence     -> @oceanicos/types   [promoted this pass]
@oceanicos/kai        -> @oceanicos/mini, @oceanicos/types
@oceanicos/elion      -> @oceanicos/mini, @oceanicos/types
@oceanicos/omega      -> @oceanicos/mini, @oceanicos/verification, @oceanicos/types
```

`@oceanicos/kai`, `@oceanicos/elion`, and `@oceanicos/omega` are the named
entry points for the KAI / ELION / OMEGA roles in `ECOSYSTEM_BODY.md`. They
re-export the KAI continuity, transition-executor, and reality-verification
primitives already implemented in `@oceanicos/mini` and `@oceanicos/verification`;
they hold no independent authority and the API does not import them yet.

These build (the `setup` service compiles the full workspace tree) but the API
does not import them. Workspace membership is not capability and not a claim
that they serve traffic.

## Naming-split reconciliation (executed this pass)

The phantom `@omega-v/types` dependency — referenced by 38 `package.json` files
and 44 source files but never resolvable as a package — was renamed to the
real `@oceanicos/types` across all package manifests and source imports. The
BUILT packages survived pre-fix only because their narrow tsconfig `include`
excluded the files that imported `@omega-v/types`; the dormant packages could
not build at all.

`apps/api/src/dependency-route.ts` and `packages/registry/src/index.ts` retain
`@omega-v/types` as **data strings** (dependency-graph labels, not imports) —
these describe the historical graph and are intentionally left.

## First earned promotion: `@omega-v/evidence` → WORKSPACE

Promoted from SOURCE-ONLY to WORKSPACE. Changes:

| Change | What |
|--------|-----|
| `pnpm-workspace.yaml` | Added `packages/evidence` |
| `package.json` dep | `@omega-v/types` → `@oceanicos/types` |
| `tsconfig.json` include | `src/**/*` → `src/index.ts` (excludes tests from build, matches BUILT pattern) |
| TypeScript devDep | `^5.4.5` → `^6.0.3` (root tsconfig uses `ignoreDeprecations: "6.0"`) |
| `src/index.ts` import | `@omega-v/types` → `@oceanicos/types` |
| `@oceanicos/types` | Added `EvidenceArtifact`, `EventLogEntry`, `evidencePath?`, `rules?` (additive, non-breaking) |

**Verified:** `tsc` build passes, full workspace build passes, smoke test
(generate artifact + verify integrity + tamper detection) passes, BUILT
packages unaffected, API healthy (200), contract tests pass (3/3).

## UNTRACKED orphans (26 — the divergence)

These package directories exist on disk with real source (300–5300 lines each)
and real `package.json` manifests, but are **not** in `pnpm-workspace.yaml`,
**not** in the API self-model, **not** built, and **not** tested. They encode a
"decentralized verification network" vision (AMM, consensus, rollups, sharding,
staking, governance) that has not been earned into the workspace.

```
agents  amm  attestor  consensus  da  dht  dispute  dissensus  enclave  evm
federation  governor  mempool  mesh  oracle  orchestrator  relay  replay
reputation  rollup  sequencer  sharding  staking  vaas  vault  zk
```

> **UNKNOWN preserved.** Whether these packages compile, type-check, or agree
> with the contracts in `@oceanicos/types` is **not observed**. They must not be
> promoted or cited as functional until each is admitted to the workspace,
> built, and tested in an authorized transition.

## SOURCE-ONLY + STUB (28 + 2 — tracked but dormant)

The self-model tracks these (they appear in `/v1/dependencies`) but they are
not workspace members. The self-model flags **27 archive candidates** and
identifies **14 lowest-risk promotions** (depend only on `types`):

```
lowest-risk: ir, registry, evidence, intent, contract, governance,
             human, learning, store, security, telemetry, bridge,
             analytics, green
```

Seven are **blocked by `@omega-v/sdk`** (the SDK is itself SOURCE-ONLY and
un-built, so its dependents cannot be promoted first):

```
blocked-by-sdk: policy, worker, cli, sandbox, scheduler, benchmark, notary
```

STUB packages (thin implementations): `runtime`, `lexicon`.

## Corrections vs prior map (tip `35eab29`)

| Prior claim | Current evidence (tip `d1bde925`) |
|-------------|------------------|
| Map covers ~13 packages | **43 tracked + 26 untracked = 69 surfaces** observed on disk |
| `@omega-v/ir` is BUILT | **SOURCE-ONLY** — not in `pnpm-workspace.yaml` |
| `@omega-v/mood` is STUB | **BUILT** — workspace + imported by `apps/api` |
| `@omega-v/oreade` omitted | **BUILT** — workspace + imported by `apps/api` |
| `coordination` archive candidate | **WORKSPACE** — in `pnpm-workspace.yaml`, not API-imported |
| `gateway` / `auth` / `webhook` SOURCE-ONLY | **WORKSPACE** |
| `worker` / `pipeline` SOURCE-ONLY | **WORKSPACE** — still not API-imported |
| 26 decentralized-network packages absent | **UNTRACKED** — now named; previously invisible to the map |

## Authority and promotion

Promoting a SOURCE-ONLY or UNTRACKED package requires, per the self-model's
own contract:

1. Workspace membership is explicit in `pnpm-workspace.yaml`.
2. Dependencies are already BUILT or promoted in the same authorized transition.
3. A demonstrated runtime need.
4. Tests + observation after the change.
5. Human authority for the transition (capability ≠ authority).

`@omega-v/sdk` is the gating blocker for 7 packages: until the SDK is itself
admitted, built, and tested, none of its dependents can be promoted safely.

## What was NOT opened

- No UNTRACKED or SOURCE-ONLY package was built, imported, or executed.
- No package's internal source was audited for correctness — only classification,
  line counts, and wiring were observed.
- No test was run against dormant packages.
- The web app (`apps/web`) imports **no** workspace package (Vite transpiles
  standalone); its only coupling to the API is the `/api/*` proxy + `VITE_API_URL`.

## Next Δ

1. **CONTRACT MAP** for one lowest-risk promotion candidate (e.g. `evidence` or
   `intent` — depend only on `types`).
2. Decide, with human authority, whether the 26 UNTRACKED packages are
   **earned expansions to promote one-at-a-time** or **archive candidates** to
   link-and-set-aside. Bulk promotion is prohibited by the self-model contract.
3. `@omega-v/sdk` promotion unblocks 7 dependents — it is the highest-leverage
   single gate, but it is itself SOURCE-ONLY and must be earned first.
