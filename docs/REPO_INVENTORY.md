# Repository Inventory — workspace vs disk

> Per the OCEANICOS spec: **DO NOT PRE-BUILD NODES THAT HAVE NOT EARNED THEMSELVES.**
>
> This inventory classifies package directories by workspace configuration and declared API dependencies. It does **not** claim that a package is built, imported at runtime, verified, deployed, or healthy merely because it appears in a manifest.

## Audit date and evidence

**2026-10-10** — inspected `main` at `555f6e65c941778a96a368d5f456743083bf827c`.

Evidence sources:

- `pnpm-workspace.yaml` — authoritative explicit workspace paths.
- Each workspace package's `package.json` — package directory and declared name.
- `apps/api/package.json` — direct API workspace dependency declarations.
- `docs/REPO_INVENTORY.md` contract test — compares this inventory with those manifests.
- [Verification Pipeline run 38021218381](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/38021218381) — succeeded on `main` at the audited commit. This is CI evidence for that revision; it does not prove deployment or current production health.

An earlier 2026-09-27 snapshot at `61b5fff` classified `worker` and `pipeline` as source-only. The current workspace configuration includes both. Historical classifications remain in Git history; the manifest is the source of truth for the inventory below.

## Non-collapse

```text
PRESENT ON DISK
  ≠ WORKSPACE MEMBER
  ≠ DECLARED API DEPENDENCY
  ≠ IMPORTED OR USED AT RUNTIME
  ≠ BUILT BY A PARTICULAR COMMAND
  ≠ TESTED
  ≠ VERIFIED
  ≠ DEPLOYED
```

## Classification

| State | Meaning |
|---|---|
| **API-DECLARED** | Workspace member named as a direct `workspace:` dependency in `apps/api/package.json`; this does not prove runtime use. |
| **WORKSPACE-ONLY** | Workspace member not declared as a direct API workspace dependency. |
| **SOURCE-ONLY** | Package directory exists under `packages/`, but is not listed in `pnpm-workspace.yaml`. |
| **STUB** | A source-only directory with a thin implementation; not an active workspace capability. |

## API-DECLARED — workspace + direct API dependency (9 packages)

| Package | Name | Declared role |
|---|---|---|
| `types` | `@oceanicos/types` | Shared contracts |
| `observer` | `@oceanicos/observer` | Observe |
| `verification` | `@oceanicos/verification` | Verify |
| `remember` | `@oceanicos/remember` | Remember |
| `mini` | `@oceanicos/mini` | MINI kernel |
| `attestation` | `@oceanicos/attestation` | Attest |
| `kernel` | `@omega-v/kernel` | Finite-state kernel |
| `oreade` | `@omega-v/oreade` | ƆREADE layer, not authority |
| `mood` | `@omega-v/mood` | Planning context, not evidence |

The API manifest declares these workspace dependencies. The list alone does not prove each is imported, executed, or exposed as an API capability.

## WORKSPACE-ONLY — workspace member, no direct API dependency (9 packages)

| Package | Name | Declared role |
|---|---|---|
| `gateway` | `@omega-v/gateway` | Gateway |
| `ir` | `@omega-v/ir` | Intermediate-representation bytecode and execution engine |
| `compiler` | `@omega-v/compiler` | Rule DSL to IR bytecode compiler |
| `evolution` | `@omega-v/evolution` | Rule recompilation and drift detection |
| `coordination` | `@omega-v/coordination` | Bounded coordination |
| `auth` | `@omega-v/auth` | Authentication |
| `webhook` | `@omega-v/webhook` | Webhooks |
| `worker` | `@omega-v/worker` | Fail-closed local worker pool |
| `pipeline` | `@omega-v/pipeline` | Stage graph over the worker pool |

These packages are explicit workspace members, but are not direct API workspace dependencies. That does not prove whether another package uses them or whether a specific build/test ran.

This includes `@omega-v/ir`, `@omega-v/compiler`, and `@omega-v/evolution`: all three are workspace members on the audited tip, not source-only directories, and not direct API dependencies in the current API manifest.

The workspace also includes the `apps/api` and `apps/web` applications. They are applications, not entries in either package table.

## SOURCE-ONLY / STUB — on disk, off workspace

The following are examples, not an exhaustive package list: `policy`, `registry`, `sdk`, `cli`, `evidence`, `intent`, `contract`, and the distributed/speculative set (`agents`, `amm`, `consensus`, `zk`, …). Confirm membership from `pnpm-workspace.yaml` before treating any directory as an active workspace package.

## Naming split (observed)

- `@oceanicos/*` — types, observer, verification, remember, mini, attestation.
- `@omega-v/*` — kernel, oreade, mood, gateway, ir, compiler, evolution, coordination, auth, webhook, worker, pipeline, plus source-only packages.

Unresolved naming edge. Do not silently rename packages.

## Summary (audited tip)

| Category | Count | Action |
|---|---:|---|
| Workspace members | 20 (18 packages + 2 apps) | Membership only; do not infer capability |
| API-declared | 9 packages | Direct manifest dependencies; verify actual use separately |
| Workspace-only | 9 packages | Not direct API dependencies |
| On-disk, off-workspace | Non-exhaustive | Promote only when earned |

## Test and CI evidence

The root `package.json` maintains explicit file lists for `pnpm test` and `pnpm test:e2e`; do not assume those commands discover arbitrary tests or accept path-filter semantics. `pnpm test:worker` is the focused worker lifecycle command.

At audited main commit `fd4417e73c4aa10cec678d1f09eb6f09a0cffec2`, Verification Pipeline run [37074868414](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/runs/37074868414) completed successfully. Its Node 22.x and 24.x verification jobs, Compose configuration, Windows compatibility, and package/smoke jobs succeeded; artifact publication was skipped. This records CI for that commit only, not deployment or runtime health.

## Migration path

```text
INVENTORY (this document, 2026-10-02)
→ DEPENDENCY MAP (docs/DEPENDENCY_MAP.md)
→ CONTRACT MAP
→ MIGRATION
→ TEST
→ OBSERVE
→ RECONCILE
```

Do NOT merge blindly. Do NOT delete history. Promote only when earned.
