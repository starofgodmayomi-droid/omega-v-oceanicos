# api

Fastify HTTP runtime for Ω∞v | OCEANICOS.

The executable contract is the current `createApp` surface. Persistence,
local jobs, readiness, attestation revocations, the Ω∞v reality loop, the
governed command OS, and optional static-client serving are supported modules
and are registered by `createApp`. The supported route inventory is pinned in
`src/route-contract.ts` and enforced by `src/__tests__/route-inventory.test.ts`.

The MINI kernel (`Observe → Verify → Remember`) is the default runtime mental
model: `POST /v1/pipeline` drives one bounded change through
compile → validate → admit → execute → observe, and reports `VERIFIED`,
`DIVERGENT`, or a halt instead of asserting success.

## Run

```bash
pnpm --filter api build
pnpm --filter api dev
```

The default port is `5000`; `PORT` or `API_PORT` overrides it.

## Authentication

`OMEGA_AUTH_MODE` is `local` by default outside production and `required` in
production. Required mode needs distinct `OMEGA_READ_TOKEN` and
`OMEGA_ADMIN_TOKEN` values. Health remains unauthenticated; GET reads use the
read token and writes use the admin token. See `docs/GOVERNANCE.md` for the
full gate map.

Optional local-job authentication uses `OMEGA_LOCAL_JOB_LEDGER_TOKEN`.

`OMEGA_SIGNING_KEY` (at least 32 characters) enables `POST /v1/attest` with
HMAC-SHA256. Without it the route answers `503 ATTESTATION_SIGNING_KEY_REQUIRED`
rather than signing with a default key.

## Persistence

Persistence is controlled by `OMEGA_PERSISTENCE=on|off`. If omitted, tests
default to off and normal runtime defaults to on. Paths and key handling are
configured with:

```text
OMEGA_RUNTIME_STORE_PATH
OMEGA_EVENT_LOG_PATH
OMEGA_PERSISTENCE_KEY
OMEGA_PERSISTENCE_KEY_PREVIOUS
OMEGA_PERSISTENCE_RECOVERY_MODE
OMEGA_PERSISTENCE_RECOVERY_REFERENCE
OMEGA_PERSISTENCE_DELETION_MODE
OMEGA_PERSISTENCE_CUSTODY_MODE
OMEGA_PERSISTENCE_CUSTODY_REFERENCE
OMEGA_PERSISTENCE_COORDINATION_MODE
OMEGA_PERSISTENCE_COORDINATION_REFERENCE
```

`GET /health` reports persistence source, key-source, recovery policy, custody
policy, coordination policy, event-log recovery, rotation state, and bounded
coverage. A corrupt snapshot or partial event log degrades readiness rather
than being silently treated as a clean store.

Operator controls:

```text
GET  /persistence/status
POST /persistence/acknowledge
POST /persistence/reencrypt
```

These routes expose or act on local evidence only. They do not prove HSM/KMS
custody, distributed recovery, distributed coordination, or external backup
state.

## Local jobs

Enable the bounded local evidence ledger with:

```text
OMEGA_LOCAL_JOB_LEDGER=on
OMEGA_LOCAL_JOB_LEDGER_PATH=/path/to/jobs.json
OMEGA_LOCAL_JOB_LEDGER_KEY=<secret>
```

The path and key must be configured together for durable encrypted storage.
Without both, the ledger remains memory-backed when enabled.

Routes:

```text
GET  /jobs
POST /jobs
GET  /jobs/:jobId
POST /jobs/:jobId/claim
POST /jobs/:jobId/complete
POST /jobs/:jobId/fail
```

Jobs are local, bounded, idempotent, and provenance-bearing. They are not a
distributed worker scheduler and do not grant authorization to perform
external actions.

## Attestation revocation

```text
GET  /attest/revocations
POST /attest/revoke
GET  /attest/policy
```

Revocations are operator-mediated local control records separate from the
cryptographic attestation. The current runtime keeps a bounded in-process
registry; distributed revocation consistency is not claimed.

## Core runtime routes

```text
GET  /health
GET  /v1/kernel/capabilities
GET  /v1/mood
POST /v1/attest
POST /v1/cycle
POST /v1/pipeline
GET  /v1/block/tip
GET  /v1/stream
POST /v1/miner/start
POST /v1/miner/stop
GET  /v1/miner/status
GET  /v1/mesh/nodes
GET  /v1/mesh/simulate
POST /v1/auth/keypair
POST /v1/block/sign
POST /v1/block/verify-signature
```

## Reality fixpoint

```text
GET  /v1/reality/state
POST /v1/reality/step
POST /v1/reality/run
```

`Σ` is a set of committed delta hashes, so a repeated step terminates at the
fixed point instead of diverging. Unverified observations, missing evidence,
and insufficient authority halt and leave `Σ` untouched. The loop is
in-memory and starts at `Ø`.

## Governed command OS

```text
GET  /v1/omega/workers
POST /v1/omega/workers/register
POST /v1/omega/workers/:workerId/heartbeat
POST /v1/omega/workers/:workerId/lease
POST /v1/omega/workers/:workerId/lease/:leaseId/release
POST /v1/omega/commands
GET  /v1/omega/commands/:id
POST /v1/omega/commands/:id/admit
POST /v1/omega/commands/:id/approve
POST /v1/omega/commands/:id/execute
POST /v1/omega/commands/:id/observe
POST /v1/omega/commands/:id/verify-reality
GET  /v1/omega/events
```

Commands move through explicit admission and approval before execution, and
an execution is only `VERIFIED` once an observed state matches the expected
one. Worker leases are bounded in-process coordination, not a distributed
scheduler.

## Static client

Set `OMEGA_WEB_DIST` to a built `apps/web` directory to serve the SPA from the
same Fastify origin. `GET /` serves `index.html`, `GET /assets/*` serves built assets,
and eligible non-API GET paths fall back to `index.html` for client-side
routing. API/module paths remain JSON 404s when unmatched.

```text
OMEGA_WEB_DIST=apps/web/dist
```

Static serving is optional; the API remains usable without a web build.

## Contract verification

`src/route-contract.ts` is deliberately independent from route registration.
The contract test calls `createApp`, probes every inventory entry through the
router, and scans the registration sites so the inventory cannot drift in
either direction. If a route is intentionally removed, remove it from the
inventory and update this document in the same change; otherwise a supported
module has become orphaned.

The operational invariant remains:

```text
IMPLEMENTED != VERIFIED
VERIFIED != ATTESTED
ATTESTED != AUTHORIZED
AUTHORIZED != DEPLOYED
DEPLOYED != HEALTHY
```

The API is an evidence boundary, not a claim that every downstream system is
controlled by this process.
