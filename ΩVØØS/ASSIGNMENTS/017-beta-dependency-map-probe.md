# Order 017: VibeOS Dependency Map Introspection Probe

## Intent
Connect the live architectural dependency graph (`GET /v1/dependencies`) directly into the VibeOS desktop surface as a dedicated quick action probe (`📦 Dependency Map`).

## Scope
- Domain: `apps/web/src/VibeOS.tsx`
- Endpoint: `GET /v1/dependencies`
- Surfaces:
  - Total package nodes count and classification breakdown (`built`, `workspace`, `source-only`, `stub`)
  - Cardinal invariant: `"PRESENT ≠ WORKSPACE ≠ IMPORTED ≠ VERIFIED"`
  - Monorepo migration step confirmation: `DEPENDENCY MAP reconciled to pnpm-workspace.yaml`
  - Explicit epistemic boundary: pnpm workspace dependency map; local architectural audit
- DOM Test Suite: `apps/web/src/__tests__/dom/VibeOS.test.tsx` (added test 44, 44/44 passing)
- Epistemic Boundary: Local workspace dependency introspection; does not assert external package registry or remote deployment state.

## Verification Evidence
- 44/44 DOM unit tests passing across all suites.
- Web application bundles in 335ms.
- Fail-closed verification preserved: empty, degraded, or malformed responses collapse to `UNKNOWN`.
