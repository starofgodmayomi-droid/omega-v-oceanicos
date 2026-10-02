# @omega-v/worker

Bounded worker pool for Ω∞v Oceanicos.

This package leases jobs to capability-matched workers, records local HMAC observation receipts, and fail-closes when a worker lacks authority, policy, or an unexpired grant.

It does **not** claim SLSA provenance, distributed fleet health, or deployment.

## Boundary

- Capability ≠ authority. A registered worker without `authoritySubject` + `policyId` cannot lease.
- Expired authority cannot lease.
- Completing a job emits `LOCAL_HMAC_OBSERVED` / `runtimeClaim: NOT_CLAIMED`.
- The default signing secret is forbidden.

## Evidence command

```sh
pnpm test:worker
```
