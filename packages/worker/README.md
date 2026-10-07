# @omega-v/worker

Bounded worker pool for Ω∞v Oceanicos.

This package leases jobs to capability-matched workers, records local HMAC observation receipts, and fail-closes when a worker lacks authority, policy, or an unexpired grant.

It does **not** claim SLSA provenance, distributed fleet health, a persistent worker fleet, or production deployment.

## Boundary

- Capability ≠ authority. A registered worker without `authoritySubject` + `policyId` cannot lease.
- Expired authority cannot lease.
- Completing a job emits `LOCAL_HMAC_OBSERVED` / `runtimeClaim: NOT_CLAIMED`.
- The default signing secret is forbidden.
- GitHub Actions execution is finite CI evidence; it is not a deployed runtime worker.
- Uploaded logs are retained as workflow artifacts for bounded inspection and are not a production audit ledger.

## Local evidence command

```sh
pnpm test:worker
```

## GitHub worker execution

The repository workflow at `.github/workflows/worker.yml` runs the bounded worker on pull requests and pushes to `main`. It also supports a manual **Run workflow** dispatch with:

- `cycles`: integer string from `1` to `32`;
- `interval_ms`: integer string from `0` to `3600000`.

The worker script enforces those bounds, runs with external actions and Git writes disabled, uploads inspection logs as a short-lived workflow artifact, and writes a scoped job summary. A successful workflow proves only that the declared CI steps completed in GitHub's runner context.

A persistent or production worker requires a separately authorized hosting target, runtime identity, secrets, networking policy, observability, and post-deployment smoke evidence. None is inferred from this workflow.
