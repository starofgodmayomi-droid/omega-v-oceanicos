# Order 010: VibeOS Therapeutic State Machine Probe

## Intent
Elevate and connect the calm KAI ↔ ELION ↔ OMEGA Therapeutic State Machine (`omega.therapeutic-state-machine.v1`) into the main VibeOS desktop surface as a dedicated quick action probe.

## Scope
- Domain: `apps/web/src/VibeOS.tsx`
- Endpoint: `GET /v1/therapeutic/state`
- Preserves epistemic boundary: state is observed only; not a deployment claim (`OBSERVED`).
- Surfaces KAI (continuity ledger & memory-only authority), ELION (bounded-execution authority), OMEGA (verification-gate authority), and the 5-step therapeutic loop (`observe → bound → execute → reconcile → remember`).
- Adds comprehensive DOM test in `apps/web/src/__tests__/dom/VibeOS.test.tsx` (test 37).

## Verification Evidence
- 37/37 DOM tests passing across all test suites.
- Web build compiles and bundles cleanly in 396ms.
- Fail-closed verification preserved: empty or error responses collapse to `UNKNOWN`.
