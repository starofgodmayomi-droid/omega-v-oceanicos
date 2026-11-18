# Order 012: VibeOS Kernel Telemetry Stats Integration

## Intent
Connect the live state machine metrics from `OceanicosKernel.getStats()` via a new API contract endpoint `GET /v1/kernel/stats` and surface it directly in VibeOS desktop surface as a dedicated quick action probe.

## Scope
- API Contract: `apps/api/src/route-contract.ts` (added `GET /v1/kernel/stats` to `API_ROUTE_INVENTORY`)
- API Gateway: `apps/api/src/index.ts` (registered route handler returning `platformKernel.getStats()`)
- Web Surface: `apps/web/src/VibeOS.tsx` (added `runKernelStatsCheck` handler and `📊 Kernel Stats` quick action button)
- DOM Test Suite: `apps/web/src/__tests__/dom/VibeOS.test.tsx` (added test 39)
- Integration Test: `tests/integration/api-route-contract.integration.test.ts` (verified all inventoried routes match Fastify runtime)

## Verification Evidence
- 39/39 DOM unit tests passing across all suites.
- API route contract integration tests pass.
- Web application bundles in 285ms.
- Fail-closed verification preserved: empty or malformed responses collapse to `UNKNOWN`.
