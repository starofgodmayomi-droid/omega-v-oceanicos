# @omega-v/api

Fastify HTTP runtime for Ω∞v | OCEANICOS.

The executable contract is the current `createApp` surface. Persistence,
local jobs, readiness, attestation revocations, and optional static-client
serving are supported modules and are registered by `createApp`. The supported
route inventory is pinned in `src/route-contract.ts` and enforced by
`src/__tests__/route-inventory.test.ts`.

## Run

```bash
pnpm --filter api build
pnpm --filter api dev
```

The default port is `5000`; `PORT` or `API_PORT` overrides it.

## Authentication

`OMEGA_AUTH_MODE` is `local` by default outside production and `required` in
production. Required mode needs distinct `OMEGA_READ_TOKEN` and
`OMEGA_ADMIN_TOKEN` values. Health remains unauthenticated; GET evidence
routes use the read token and mutations use the admin token.

Optional local-job authentication uses `OMEGA_LOCAL_JOB_LEDGER_TOKEN`.

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

## Static client

Set `OMEGA_WEB_DIST` to a built `apps/web` directory to serve the SPA from the
same Fastify origin. `/` serves `index.html`, `/assets/*` serves built assets,
and eligible non-API GET paths fall back to `index.html` for client-side
routing. API/module paths remain JSON 404s when unmatched.

```text
OMEGA_WEB_DIST=apps/web/dist
```

Static serving is optional; the API remains usable without a web build.

## Contract verification

`src/route-contract.ts` is deliberately independent from route registration.
The contract test calls `createApp`, asks Fastify for its registered route
tree, and requires every inventory entry to be present. If a route is
intentionally removed, remove it from the inventory and update this document
in the same change; otherwise a supported module has become orphaned.

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


## Ω operations observability

The read-only operations surface includes `GET /v1/omega/workers`, `GET /v1/omega/leases`, and redacted `GET /v1/omega/events`. The web dashboard refreshes these endpoints every three seconds and labels unavailable evidence as `UNKNOWN`. Worker and lease records are coordination evidence only; they do not authorize commands, bypass admission, or verify external reality.
