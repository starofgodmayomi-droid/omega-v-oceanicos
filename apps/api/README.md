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

The Value Navigator appends local `OmegaChangeRecord` proposals and observations
to a separate hash-chained JSONL journal. Set `OMEGA_VALUE_NAVIGATOR_PATH` to
choose its location; otherwise the path is `{dbPath}.value-navigator.jsonl`.
The journal is tamper-evident for accidental edits/corruption, not a signature,
backup, distributed store, or proof of truth. A damaged journal fails closed.
New directories/files use restrictive local permissions where supported. The
journal is bounded to 5,000 entries and 100 observations per proposal; do not
put secrets or sensitive personal data in its caller-supplied evidence fields.
The collection route returns at most the most recent 200 records; the
per-proposal route returns that proposal's bounded complete history.

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
cryptographic attestation. With file-backed persistence enabled, the API uses
the shared SQLite command volume as an atomic revocation registry: independent
API instances observe new records and reject duplicate writes. Responses label
this evidence as `multi-process-single-volume` and `verified: true`. This does
not claim cross-host ordering, replica agreement, external storage, backup
consistency, or deployment health. Memory mode remains `single-process` and
unverified.

## Core runtime routes

```text
GET  /health
GET  /v1/kernel/capabilities
GET  /v1/mood
GET  /v1/ecosystem/status
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
GET  /v1/value-navigator/proposals
GET  /v1/value-navigator/proposals/:proposalId
POST /v1/value-navigator/proposals
POST /v1/value-navigator/proposals/:proposalId/observe
POST /v1/execute
GET  /v1/execute/memory
GET  /v1/execute/memory/export
GET  /v1/execute/verified
```

### POST /v1/execute — the KAI/ELION loop

One bounded slice: `KAI OBSERVE → ELION BOUND → ELION EXECUTE → OMEGA VERIFY →
KAI REMEMBER`. Body: `{ "intent": "...", "expectedOutcome"?: "...", "authority"?: "READ_ONLY" | "BOUNDED" | "AUTONOMOUS" }`.

- **KAI OBSERVE** scans the intent against `KAI_SHIELD_RULES` (guaranteed
  returns, send-money/urgency, seed-phrase requests, giveaway schemes, gift-card
  payments, prize claims). A match halts with `DIVERGENT` and the reason
  `KAI Shield blocked this intent.` — ELION never forms a contract.
- **ELION BOUND** forms the ΩIR contract. `AUTONOMOUS` on an irreversible intent
  returns `NOT_EXECUTED` / `HUMAN_AUTHORIZATION_REQUIRED`.
- **ELION EXECUTE** is a bounded executor that reports only the process's own
  observed state (ledger height/integrity, worker contracts, KAI memory height).
  No model connector is configured, so a generative intent is `NOT_EXECUTED`
  with `ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT` — nothing is
  invented.
- **OMEGA VERIFY** hashes the output with SHA-256 and returns
  `evidenceHash`. With an `expectedOutcome`, the normalized output must contain
  it or the verdict is `DIVERGENT`; empty output is `UNKNOWN`.
- **KAI REMEMBER** appends the drop, with its own verdict, to the hash-chained
  journal at `OMEGA_KAI_MEMORY_PATH` (default `${OMEGA_DB_PATH}.kai-memory.jsonl`).

`GET /v1/execute/memory?limit=20` returns the remembered drops, newest first,
with the journal height. Memory is evidence of what this process recorded — not
proof of external reality, and not durable across a destroyed volume.

`GET /v1/execute/verified?limit=20` returns **Σ**, the verified-only memory: only
drops OMEGA judged `VERIFIED` are appended, so `DIVERGENT`, `UNKNOWN` and
`NOT_EXECUTED` verdicts leave it byte-identical (`M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤`).
It is hash-chained and stored beside the journal at `OMEGA_KAI_VERIFIED_PATH`
(default `${OMEGA_DB_PATH}.kai-verified.jsonl`). It degrades closed: a tampered or
unreadable line answers `503 KAI_VERIFIED_MEMORY_INTEGRITY_DEGRADED` rather than
silently reloading a shorter history.

`GET /v1/execute/memory/export` returns the full memory state as one JSON document
(`omega.memory.export.v1`), sent as an attachment: the journal (every verdict) and
Σ (verified only), each with its height and integrity, plus the fixed-point law and
the limitation string. It reads only what this process recorded.

Value Navigator proposals always remain `decision: REVIEW`,
`authorized: false`, and `NOT_EXECUTED`. Observations are supplied by the
caller; a `VERIFIED` result means only that the submitted source/evidence and
normalized outcome match the stated hypothesis. It does not prove demand,
execution, earnings, deployment, or external-world truth. The API performs no
outbound observation, shell operation, outreach, spending, or proposal
execution. Writes inherit the existing admin bearer boundary in required-auth
mode. See [the repository contract](../../skills/oceanicos-value-navigator/references/repository-contract.md).

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

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
