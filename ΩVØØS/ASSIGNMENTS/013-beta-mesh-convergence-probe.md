# Order 013: VibeOS Multi-Region Mesh Convergence Probe

## Intent
Connect the live multi-region mesh consensus simulation (`GET /v1/mesh/simulate`) directly into the VibeOS desktop surface as a dedicated quick action probe.

## Scope
- Domain: `apps/web/src/VibeOS.tsx`
- Endpoint: `GET /v1/mesh/simulate`
- Surfaces:
  - Consensus round (`consensusRound`)
  - Quorum status (`quorumReached`)
  - Participating sovereign nodes across regions (`node-us-virginia`, `node-eu-frankfurt`, `node-cn-shanghai`, `node-me-dubai`) with latency and verdicts
  - Cluster signature proof (64-hex SHA-256)
- DOM Test Suite: `apps/web/src/__tests__/dom/VibeOS.test.tsx` (added test 40, 40/40 passing)
- Epistemic Boundary: Simulation only; does not assert distributed physical deployment.

## Verification Evidence
- 40/40 DOM unit tests passing across all suites.
- Web application bundles in 429ms.
- Fail-closed verification preserved: empty or malformed responses collapse to `UNKNOWN`.
