# Dependency Map — Ω∞v Oceanicos

This is a point-in-time map of **declared workspace membership and dependency edges**, not a claim about runtime use, successful builds, deployment, or health.

## Snapshot and evidence

Inspected `main` at commit `c4d4c12ef865270e5b2081d3bd10288cf1b36c36`. The map below is derived from:

- `pnpm-workspace.yaml` for workspace paths;
- each workspace's `package.json` for package names and `workspace:` dependency declarations;
- `apps/api/package.json` for the API's direct workspace dependencies.

The contract test `tests/integration/repo-inventory-contract.integration.test.ts` compares this graph with the current manifests. Re-run it after changing workspace declarations.

## Non-collapse rule

```text
PRESENT ON DISK
  ≠ WORKSPACE MEMBER
  ≠ DECLARED DEPENDENCY
  ≠ IMPORTED OR USED AT RUNTIME
  ≠ BUILT BY A PARTICULAR COMMAND
  ≠ TESTED
  ≠ VERIFIED
  ≠ DEPLOYED
  ≠ HEALTHY
```

A row below records only manifest declarations. “Workspace dependency” means a dependency whose version in the manifest starts with `workspace:`.

## Manifest-declared workspace graph

| Workspace path | Manifest name | Declared workspace dependencies |
| --- | --- | --- |
| `packages/types` | `@oceanicos/types` | — |
| `packages/observer` | `@oceanicos/observer` | `packages/types` |
| `packages/verification` | `@oceanicos/verification` | `packages/observer`, `packages/types` |
| `packages/remember` | `@oceanicos/remember` | `packages/types`, `packages/verification` |
| `packages/mini` | `@oceanicos/mini` | `packages/observer`, `packages/remember`, `packages/types`, `packages/verification` |
| `packages/attestation` | `@oceanicos/attestation` | `packages/types` |
| `packages/gateway` | `@omega-v/gateway` | `packages/types` |
| `packages/kernel` | `@omega-v/kernel` | — |
| `packages/ir` | `@omega-v/ir` | `packages/types` |
| `packages/compiler` | `@omega-v/compiler` | `packages/ir`, `packages/types` |
| `packages/evolution` | `@omega-v/evolution` | `packages/compiler`, `packages/types` |
| `packages/coordination` | `@omega-v/coordination` | — |
| `packages/oreade` | `@omega-v/oreade` | — |
| `packages/mood` | `@omega-v/mood` | — |
| `packages/auth` | `@omega-v/auth` | `packages/types` |
| `packages/webhook` | `@omega-v/webhook` | `packages/types` |
| `packages/worker` | `@omega-v/worker` | — |
| `packages/pipeline` | `@omega-v/pipeline` | `packages/worker` |
| `apps/api` | `api` | `packages/attestation`, `packages/kernel`, `packages/mini`, `packages/mood`, `packages/observer`, `packages/oreade`, `packages/remember`, `packages/types`, `packages/verification` |
| `apps/web` | `web` | — |

## Interpreting the graph

- The workspace contains **18 package paths and 2 app paths**. `apps/api` and `apps/web` are applications, not packages under `packages/`.
- The API directly declares nine workspace package dependencies: `@oceanicos/types`, `@oceanicos/observer`, `@oceanicos/verification`, `@oceanicos/remember`, `@oceanicos/mini`, `@oceanicos/attestation`, `@omega-v/kernel`, `@omega-v/oreade`, and `@omega-v/mood`.
- `@omega-v/ir`, `@omega-v/compiler`, and `@omega-v/evolution` are workspace members. Their declared graph is shown above; membership does not establish API exposure.
- The `@oceanicos/*` and `@omega-v/*` naming split is present in manifests. Do not silently rename packages.
- On-disk directories omitted from `pnpm-workspace.yaml` are not workspace members. Do not promote them without an explicit, tested need.

For workspace membership, API-declared versus workspace-only counts, and the source-only examples, see [`REPO_INVENTORY.md`](REPO_INVENTORY.md). Consult package source and tests before making behavioral claims. Validate each requested transition with focused checks, observe the result, and report exactly what the evidence covers.
