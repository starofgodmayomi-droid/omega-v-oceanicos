# ΩVØØS Swarm Assignment 070-beta: DAV Tensor Live Slice Export Endpoint & Web UI

**Domain**: Fastify API (`/tensor/:size/export`, `/api/tensor/:size/export`) & Web UI (`TensorDavVisualizer`)
**Status**: VERIFIED for this slice.

1. **API Export Endpoints**: Added `GET /tensor/:size/export` and `GET /api/tensor/:size/export` in `apps/api/src/tensor-dav-route.ts` and registered both in `apps/api/src/route-contract.ts`. Supports `?format=json` (with `formula`, `expectedChecksumFormula`, `invariants`, `values`, and `sha256`) and `?format=csv` (with invariant header comment and matrix rows). Fails closed with `400 UNKNOWN` for invalid sizes and `422 DIVERGENT` if invariants diverge.
2. **Web UI Export Controls**: Added `Export JSON` and `Export CSV` download links inside `apps/web/src/components/TensorDavVisualizer.tsx` (also exposed in `HypercubeInspectionModal`) whenever a verified tensor receipt is present.
3. **Tests & Contracts**:
   - `tests/integration/api-route-contract.integration.test.ts`: 6/6 integration tests passed.
   - `pnpm --filter web test:current-dom`: 6/6 suites, 91/91 DOM tests passed.
   - `pnpm build`: 20/20 workspace packages built.
   - `pnpm validate:docs`, `pnpm validate:skills`, `pnpm validate:ci`, `pnpm compress:repo`, `pnpm flow:water`: all passed.
