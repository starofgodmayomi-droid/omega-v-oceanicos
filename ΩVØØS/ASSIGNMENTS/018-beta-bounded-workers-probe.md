# Order 018: VibeOS Bounded Workers Coordination Probe

## Intent
Connect the live bounded worker registry and coordination contract (`GET /v1/omega/workers`) directly into the VibeOS desktop surface as a dedicated quick action probe (`🤖 Bounded Workers`).

## Scope
- Domain: `apps/web/src/VibeOS.tsx`
- Endpoint: `GET /v1/omega/workers`
- Surfaces:
  - 9 registered sovereign worker roles with risk classification breakdown (7 read-only · 2 human-gated mutating: `tester`, `repo-builder`)
  - Active worker coordination state count
  - Cardinal operational principle: `"worker output is evidence, not authority"`
  - Coordination boundary: durable on configured SQLite volume; does not grant execution or deployment authority
- DOM Test Suite: `apps/web/src/__tests__/dom/VibeOS.test.tsx` (added test 45, 45/45 passing)
- Epistemic Boundary: Local worker coordination telemetry; worker output does not grant authorization.

## Verification Evidence
- 45/45 DOM unit tests passing across all suites.
- Web application bundles in 319ms.
- Fail-closed verification preserved: empty, degraded, or malformed responses collapse to `UNKNOWN`.
