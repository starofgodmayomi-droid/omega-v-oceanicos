# OCEANICOS App Setup and Upgrade Check

**Observed:** 2026-11-09 12:58 UTC

This guide explains how to start the OCEANICOS app, what the main screen does, what the current runtime proves, and what the latest upgrade check found.

## What the app is

OCEANICOS is a local verification demo. Its main flow is:

```text
message → KAI observes → ELION composes a bounded answer → OMEGA verifies → KAI remembers
```

A green `VERIFIED` result means that this local cycle completed and its evidence digest matched the local contract. It does **not** mean that an external action happened, that a production deployment is healthy, or that a real-world claim was independently proven.

The default app path uses the local deterministic composer. The external-model checkbox is separate and should remain off unless an authorized model endpoint and an appropriate data policy are configured.

## Start the app from a clean checkout

Requirements:

- Node.js 22 or newer
- pnpm 10 or newer
- Git

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

`pnpm dev` starts both services:

- Web app: `http://localhost:3000`
- API: `http://localhost:5000`

For the hosted sandbox preview, use the Preview URL supplied by the environment rather than replacing it with `localhost`.

Check readiness:

```bash
curl -fsS http://localhost:3000/
curl -fsS http://localhost:5000/health
```

Stop the development process with `Ctrl+C`. The current launcher owns both the API and the Vite web process.

## How to use the screen

1. Open the OCEANICOS preview.
2. Enter a short, non-sensitive intent in **WHAT SHALL WE MAKE REAL?**.
3. Leave the external-model checkbox off for a local deterministic test.
4. Select **EXECUTE**.
5. Read the four recorded steps: `KAI OBSERVE`, `ELION EXECUTE`, `OMEGA VERIFY`, and `KAI REMEMBER`.
6. Treat `UNKNOWN`, `DIVERGENT`, and `NOT_EXECUTED` as meaningful outcomes, not errors to hide.
7. Do not infer permission from a selected upgrade candidate. The UI explicitly keeps upgrade execution `NOT_EXECUTED`.

A safe test message is:

```text
Check the current app setup and identify one safe update; do not modify anything.
```

The observed run returned:

- KAI: `VERIFIED`; no known fraud pattern matched and authority was sufficient for the bounded read-only cycle.
- ELION: `VERIFIED`; local deterministic composer used.
- OMEGA: `VERIFIED`; output matched the contract and the digest recomputed.
- KAI: `VERIFIED`; memory record stored.
- Evidence hash: `5326a83d360b7014edaf5cd62b116e60632f1393bae4317de3ceeb9c0540d86f`.
- Upgrade: `NOT_EXECUTED`; candidate `upgrade.5326a83d360b7014` is only a review handle.

## Optimization cycle

The repository selector was run with explicit, caller-supplied candidates using:

```text
Δ* = argmax [V·Q / (R + C + ε)]
```

The selected candidate was:

```text
id: document-runtime-setup-and-gaps
V·Q estimate: 8.5
risk estimate: 0.2
cost estimate: 0.5
score: 12.142857125510206
execution: NOT_STARTED
```

The dependency-upgrade candidate was marked unauthorized and excluded. The unverified-upgrade-endpoint candidate ranked lower and was not implemented. These estimates are caller inputs; the selector does not measure truth, grant authority, or execute changes.

## Upgrade check results

### Repository dependencies

`pnpm audit --ignore CVE-2026-97058` completed with no new vulnerabilities reported.

`pnpm outdated --format json` found these available updates:

| Package | Current | Wanted | Latest | Decision |
| --- | ---: | ---: | ---: | --- |
| `@types/node` | 26.6.4 | 26.6.4 | 26.6.6 | Not changed; latest is outside the declared wanted range |
| `typescript` | 6.0.3 | 6.0.3 | 7.0.2 | Not changed; major-version upgrade requires a separate compatibility task |

No dependency update was applied in this cycle.

### App/runtime health

The API health endpoint returned `status: ok` and `readiness: ready`. It also reported these limitations:

- `attester: degraded` — the local app is not configured for a fully active attestation service.
- Persistence source and event-log source are missing on a fresh checkout; this is a cold local runtime, not evidence of durable production storage.
- Persistence encryption is disabled in the local development configuration.
- Coordination is `local-single-process`; this does not prove distributed consistency, leader election, or replica agreement.
- Human authorization remains required for sensitive actions.

The app has no dedicated `/v1/upgrade`, `/v1/system/upgrade`, `/api/upgrade`, `/v1/logs`, or `/api/logs` endpoint in this checkout. Upgrade candidates are currently compressed into the execution response and displayed in the UI; they are not automatic update jobs.

The live ecosystem body endpoint returned `VERIFIED` for its local bounded simulation, but its own contract states that local cryptographic proofs attest simulated state and do not prove physical reality or deployment health.

## What to do next

For normal learning and local testing, no further setup is required: install, build, start, open the preview, and send a harmless message.

The next separate engineering task should be chosen explicitly from one of these bounded options:

1. Review the `@types/node` patch-level update in isolation.
2. Create a TypeScript 7 compatibility branch with a dedicated build/test gate; do not upgrade it directly on the app branch.
3. Add a read-only, evidence-bound upgrade-status endpoint if a durable API surface is needed.
4. Configure real persistence, event-log storage, signing keys, and attestation only with an explicit deployment/security plan.

This document records observations and operating instructions. It does not claim that any of those future tasks were executed.
