# Ω∞v Repository Consolidation

## Canonical Repository

`starofgodmayomi-droid/omega-v-oceanicos` is the canonical implementation repository for the Ω∞v Oceanicos full-stack system. The related `echoframe12-ui/-v` repository is treated as an architectural reference and migration source, not as a second live source of truth.

This decision preserves the target repository's longer history, broader package surface, existing applications, and max-compression work without a destructive history rewrite.

## Consolidation Decision

The target repository is the stronger implementation baseline: it has a larger commit history and a broader package surface, including the MINI kernel, API and web applications, CLI, SDK, attestation, registry, pipeline, worker, enclave, governance, security, and infrastructure components.

| Area | Canonical decision |
| :--- | :--- |
| Source of truth | `starofgodmayomi-droid/omega-v-oceanicos` |
| Git history | Preserve the target repository's existing history |
| Runtime kernel | Keep `Observe → Verify → Remember` as the smallest runnable unit |
| Full stack | Keep API, web, CLI, SDK, attestation, infrastructure, and earned expansions |
| Package naming | Avoid mass namespace renames without a compatibility release |
| Related repository | Import only genuinely unique future capabilities through focused changes |
| Validation | Require workspace, documentation, type, test, and build checks |

## Why This Is Safer

A blind merge would create conflicts across applications, packages, workspace manifests, documentation, CI, and lockfiles. It could also duplicate packages that have evolved under different names, including `@omega-v/*` and `@oceanicos/*` namespaces.

The consolidation therefore compresses duplication conceptually while preserving independently verifiable implementation boundaries. No repository history is deleted, no branch is force-pushed, and no package is silently replaced.

## Upgrade Contract

Every consolidation or upgrade must keep the repository runnable from a fresh clone, preserve the MINI kernel's independence from API and web infrastructure, maintain unique workspace package names, retain constitutional and operational documentation, keep the verification loop testable, and record changes in focused Git commits.

The repository audit command enforces the structural portions of this contract. Runtime behavior remains governed by the existing type-check, test, build, smoke, and totality commands.

## Next Safe Expansion

The next high-value expansion is a compatibility layer for any genuinely unique capability from `echoframe12-ui/-v`, accompanied by an isolated package, tests, and migration notes. A wholesale code merge is not justified because the target already contains the more advanced full-stack implementation.

> Compress duplication, not evidence. Merge capabilities, not ambiguity. Upgrade through verified change.
