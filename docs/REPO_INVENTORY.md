# Repository Inventory — workspace vs disk

> Per the OCEANICOS spec: **DO NOT PRE-BUILD NODES THAT HAVE NOT EARNED THEMSELVES.**
>
> This inventory classifies packages by **current executable evidence**.
> It does **not** claim VERIFIED, DEPLOYED, or HEALTHY.

## Audit Date

2026-09-27 — inspected GitHub tip `61b5fff23af5a8766065e08e3c79858c6ea16187`

Evidence:

- `pnpm-workspace.yaml` (authoritative workspace membership)
- `apps/api/package.json` (declared API imports)
- `apps/api/Dockerfile` (image build filters)
- `packages/` directory listing

Previous inventory dated 2026-09-25 classified `ir` as BUILT and `mood` as STUB.
That snapshot is **DIVERGENT** from the current workspace. History is preserved;
this document supersedes it for current reality.

## Non-collapse

```text
PRESENT ON DISK
  ≠  WORKSPACE-ACTIVE
  ≠  IMPORTED BY apps/api
  ≠  BUILT BY ROOT pnpm scripts
  ≠  TESTED
  ≠  VERIFIED
  ≠  DEPLOYED
```

## Classification

| State | Meaning |
|-------|---------|
| **BUILT** | In `pnpm-workspace.yaml` **and** imported by `apps/api` |
| **WORKSPACE** | In `pnpm-workspace.yaml`, **not** imported by `apps/api` |
| **SOURCE-ONLY** | Directory exists under `packages/`, not in the workspace |
| **STUB** | SOURCE-ONLY with a thin implementation |

## BUILT — workspace + API import (9 packages)

| Package | Name | Role |
|---------|------|------|
| `types` | `@oceanicos/types` | Shared contracts |
| `observer` | `@oceanicos/observer` | Observe |
| `verification` | `@oceanicos/verification` | Verify |
| `remember` | `@oceanicos/remember` | Remember |
| `mini` | `@oceanicos/mini` | MINI kernel |
| `attestation` | `@oceanicos/attestation` | Attest |
| `kernel` | `@omega-v/kernel` | Finite-state kernel |
| `oreade` | `@omega-v/oreade` | ƆREADE (layer, not authority) |
| `mood` | `@omega-v/mood` | Mood context (planning only) |

Apps: `apps/api`, `apps/web` are also workspace members.

## WORKSPACE — active, not API-imported (4 packages)

| Package | Name | Role |
|---------|------|------|
| `gateway` | `@omega-v/gateway` | Gateway |
| `coordination` | `@omega-v/coordination` | Bounded workers/builders |
| `auth` | `@omega-v/auth` | Auth |
| `webhook` | `@omega-v/webhook` | Webhooks |

These are **not** dormant. They are also **not** proven as live API capabilities.

## SOURCE-ONLY / STUB — on disk, off workspace

Includes (non-exhaustive of every speculative package): `ir`, `policy`, `worker`, `registry`, `compiler`, `sdk`, `cli`, `evidence`, `intent`, `contract`, `pipeline`, and the distributed/speculative set (`agents`, `amm`, `consensus`, `zk`, …).

`@omega-v/ir` is **not** workspace-active on this tip. Do not treat it as a runtime kernel.

## Naming split (observed)

- `@oceanicos/*` — types, observer, verification, remember, mini, attestation
- `@omega-v/*` — kernel, oreade, mood, gateway, coordination, auth, webhook, and dormant packages

Unresolved edge. Do not silently rename.

## Summary (this tip)

| Category | Count | Action |
|----------|-------|--------|
| Workspace members | 15 (13 packages + 2 apps) | Keep — currently active |
| BUILT (API-imported) | 9 packages | Runtime path |
| WORKSPACE only | 4 packages | Do not claim API capability |
| On-disk, off-workspace | ~55 | Quarantine / promote only when earned |

## Test-command note

Root `package.json` enumerates a **fixed list of integration files** (currently 12 paths in `test` / `test:e2e`). README language that says “20 tests passing” is **historical / unreconciled**. This session did not execute the suite; current runtime verification remains **UNKNOWN**.

## Migration Path

```text
INVENTORY (this document, 2026-09-27)
→ DEPENDENCY MAP (docs/DEPENDENCY_MAP.md)
→ CONTRACT MAP
→ MIGRATION
→ TEST
→ OBSERVE
→ RECONCILE
```

Do NOT merge blindly. Do NOT delete history. Promote only when earned.
