# Workspace Packages

This directory contains the package workspaces declared in the root `pnpm-workspace.yaml`. Package names and API-dependency status below are read from the current workspace and `apps/api/package.json` manifests; membership alone does not establish that a package is used at runtime, tested, deployed, or healthy.

## Workspace package registry

| Package path | Manifest name | API dependency status |
| --- | --- | --- |
| `packages/types` | `@oceanicos/types` | Direct API dependency |
| `packages/observer` | `@oceanicos/observer` | Direct API dependency |
| `packages/verification` | `@oceanicos/verification` | Direct API dependency |
| `packages/remember` | `@oceanicos/remember` | Direct API dependency |
| `packages/mini` | `@oceanicos/mini` | Direct API dependency |
| `packages/attestation` | `@oceanicos/attestation` | Direct API dependency |
| `packages/kernel` | `@omega-v/kernel` | Direct API dependency |
| `packages/oreade` | `@omega-v/oreade` | Direct API dependency |
| `packages/mood` | `@omega-v/mood` | Direct API dependency |
| `packages/gateway` | `@omega-v/gateway` | Workspace member only |
| `packages/ir` | `@omega-v/ir` | Workspace member only |
| `packages/compiler` | `@omega-v/compiler` | Workspace member only |
| `packages/evolution` | `@omega-v/evolution` | Workspace member only |
| `packages/coordination` | `@omega-v/coordination` | Workspace member only |
| `packages/auth` | `@omega-v/auth` | Workspace member only |
| `packages/webhook` | `@omega-v/webhook` | Workspace member only |
| `packages/worker` | `@omega-v/worker` | Workspace member only |
| `packages/pipeline` | `@omega-v/pipeline` | Workspace member only |

The API dependency column describes declared `workspace:` dependencies in `apps/api/package.json`; it does not claim runtime use. `apps/api` and `apps/web` are separate application workspaces, not packages under this directory.

## MINI core

The core package chain is named `@oceanicos/*` in the checked-in manifests:

```text
@oceanicos/types → @oceanicos/observer → @oceanicos/verification
                  → @oceanicos/remember → @oceanicos/mini
```

The dependency chain above is conceptual; consult package manifests for declared edges. `@oceanicos/attestation` is a separate workspace package. Verify implementation and behavior in source and tests before making claims about runtime capabilities or assurances.

## On-disk directories outside the workspace

Other directories may exist under `packages/` without being listed in `pnpm-workspace.yaml`. Treat them as source or proposals, not installable workspace packages, until their workspace membership and implementation are deliberately established.

## Common root commands

Run these from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm run validate:ci
```

These are root scripts declared in `package.json`. The full `pnpm test` suite is the repository's explicit test set; consult the script before assuming it discovers every test file. For a focused change, choose and report the narrowest relevant check, then review the final diff.
