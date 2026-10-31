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
OMEGA_GOVERNANCE_LOG_PATH
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

## Attestation

`POST /v1/attest` signs with `OMEGA_SIGNING_KEY`. The runtime boots without it
(the attester reports `degraded`), and the route answers `503` until a key of at
least `MIN_ATTESTATION_KEY_LENGTH` characters is configured. The signature is
HMAC-SHA256 over the canonical attestation payload; the key value is never
returned by any route.

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

## Pipeline and ecosystem routes

```text
POST /v1/pipeline
GET  /v1/ecosystem/status
GET  /v1/reality/status
GET  /v1/dependencies
```

`POST /v1/pipeline` runs the C0→C6 change pipeline and fails closed:
`compile`, `admission.authorityVerified` and `admission.policySatisfied`
are required, and an observation without evidence stays `UNKNOWN` rather
than being upgraded to `VERIFIED`.

## Governance routes (C6 / C7 / authorization)

```text
POST /v1/reconciliation/reconcile
POST /v1/reconciliation/batch
POST /v1/provenance/append
GET  /v1/provenance/verify
GET  /v1/provenance/lineage/:changeId
GET  /v1/provenance/tip
POST /v1/authorization/grant
POST /v1/authorization/evaluate
POST /v1/authorization/revoke
GET  /v1/authorization/grants
```

Reconciliation compares an expected and an observed state and reports
`VERIFIED`, `DIVERGENT`, `NOT_EXECUTED` or `UNKNOWN`; it records nothing.
Provenance is an append-only hash-chained ledger, and `GET
/v1/provenance/verify` reports chain integrity. Authorization is a
fail-closed grant/evaluate engine: it refuses self-grants, honors expiry
and revocation, and never infers authority from the caller's own claim.

The provenance chain and the authorization grants are journaled. Each mutation
appends one record to `OMEGA_GOVERNANCE_LOG_PATH` (default
`<dbPath dir>/governance.jsonl`) using the same append-only, optionally
AES-256-GCM-encrypted writer as the event log, and the journal is replayed on
boot. A restart therefore resumes the same hash chain — `GET
/v1/provenance/verify` keeps reporting the chain's real integrity — and keeps
the recorded revocations in force.

Governance responses carry `durable`: `true` when the record reached the
journal, `false` when it exists in memory only (`OMEGA_PERSISTENCE=off`, a
`:memory:` database, or an unwritable path). The journal is a single-host file,
not a distributed log.

## Omega command lifecycle

```text
GET  /v1/omega/workers
GET  /v1/omega/commands
POST /v1/omega/commands
GET  /v1/omega/events
POST /v1/omega/coordination/evidence
```

Commands move through propose → admit → approve → execute → observe →
verify-reality under `/v1/omega/commands/:id/...`; worker registration,
heartbeats and leases live under `/v1/omega/workers/...`. Both families are
parameterised and are asserted by `tests/integration/omega_command_api.test.ts`.

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
