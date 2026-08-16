# @omega-v/api

REST API backend for Ω∞v Oceanicos.

This API exposes the **MINI kernel** (Observe → Verify → Remember) and its earned expansions via HTTP endpoints. Understand the foundation in [packages/mini/README.md](../../packages/mini/README.md) and [docs/MINI.md](../../docs/MINI.md).

## The MINI Foundation

Every endpoint is either:

- **MINI** (the core verification loop): `/observe`, `/verify`, `/complete-loop`, `/memory`
- **+ ATTEST** (earned expansion): `/attest`, `/attest/verify`
- **+ ACT** (authorized actions): `/act`
- **+ LEARN** (recording outcomes): `/learn`
- **+ RECOMPILE** (proposing updates): `/recompile`

The smallest useful system is the MINI cycle. Everything else is built on top of it.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

## Running the published image

Each commit merged to `main` publishes a container image with signed build
provenance:

```
docker pull ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest

docker run -p 3000:3000 \
  -e OMEGA_SIGNING_KEY="$(openssl rand -hex 32)" \
  ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest
```

The API refuses to start without `OMEGA_SIGNING_KEY`. That is deliberate:
a key baked into an image is a key held by everyone who pulls it.

The image carries a provenance attestation recording which commit and which
workflow produced that exact digest. It can be checked without trusting this
document:

```
gh attestation verify \
  oci://ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest \
  --repo starofgodmayomi-droid/omega-v-oceanicos
```

`ATTEST ≠ ASSERT` applies to the artifact too. The pipeline claiming a build
passed is an assertion; a signature a stranger can verify is not.

## Mental Model: The Loop

```
🌌 VISION
   ↓
💧 Ω∞v MINI
   ├─ 👁 OBSERVE: Capture and normalize claims
   ├─ ✓ VERIFY: Apply rules; produce evidence paths
   └─ 🧠 REMEMBER: Store in append-only hash-chained memory
   ↓
+ ATTEST: Cryptographically sign verification results
   ↓
+ ACT: Authorize actions gated by verified memory
   ↓
+ LEARN: Record outcomes to improve the system
   ↓
+ RECOMPILE: Propose improvements from learning
```

Every request follows this shape: Observe → Verify → Remember → (optional expansions).

## Endpoints

### MINI Kernel

#### Complete Loop (Observe → Verify → Remember + ATTEST)

```
POST /complete-loop
```

Execute the entire MINI cycle in one request, plus cryptographic attestation.

This is the recommended entry point. It demonstrates the full mental model:

**Request:**

```json
{
  "claim": "Service X returned HTTP 200",
  "category": "health-check",
  "source": {
    "system": "health-check-api",
    "version": "1.2.3",
    "environment": "production"
  },
  "observedBy": "monitoring-system",
  "metadata": {
    "statusCode": 200,
    "responseTime": 45
  },
  "confidence": 0.95,
  "confidenceReason": "3 consecutive checks"
}
```

**Response:**

```json
{
  "data": {
    "observation": {/* Step 1: Normalized claim */},
    "verification": {/* Step 2: Evidence path */},
    "memory": {/* Step 3: Recorded in append-only chain */},
    "attestation": {/* + ATTEST: Signed verification */}
  },
  "timestamp": "2026-08-07T10:30:02Z"
}
```

The response shows all three MINI steps plus the attestation expansion.

### Health Check

```
GET /health
```

Returns unauthenticated liveness and readiness evidence for probes. The response keeps `status: "ok"` for compatibility, adds a `readiness` value, reports observer/verifier/attester availability, memory integrity and codec mode, persistence mode and codec mode, and the non-secret attestation policy. A healthy memory chain returns HTTP `200` with `readiness: "ready"`; an integrity failure returns HTTP `503` with `readiness: "degraded"`. No token, private key, or signing material is returned.

**Response:**

```json
{
  "data": {
    "status": "ok",
    "readiness": "ready",
    "checks": {
      "observer": "ready",
      "verifier": "ready",
      "attester": "ready",
      "memory": { "status": "ready", "integrity": true, "encryption": "disabled" },
      "persistence": { "mode": "memory", "encryption": "disabled" }
    },
    "policy": {
      "attestationAlgorithm": "HMAC-SHA256",
      "attestationTtlMs": null,
      "readAuthConfigured": false,
      "adminAuthConfigured": false,
      "revocationEnabled": true
    }
  },
  "timestamp": "2026-08-16T10:30:00Z"
}
```

### Observe

```
POST /observe
```

**Step 1 of verification loop**: Submit an observation.

**Request:**

```json
{
  "claim": "Service X returned HTTP 200",
  "category": "health-check",
  "source": {
    "system": "health-check-api",
    "version": "1.2.3",
    "environment": "production"
  },
  "observedBy": "monitoring-system",
  "metadata": {
    "statusCode": 200,
    "responseTime": 45
  },
  "confidence": 0.95,
  "confidenceReason": "3 consecutive checks"
}
```

**Response:**

```json
{
  "data": {
    "id": "obs-2026-08-07-1",
    "claim": { "statement": "...", "category": "health-check" },
    "source": { ... },
    "timestamp": "2026-08-07T10:30:00Z",
    "confidence": 0.95,
    "status": "normalized"
  },
  "timestamp": "2026-08-07T10:30:00Z"
}
```

### Verify

```
POST /verify
```

**Step 2 of verification loop**: Verify an observation against rules.

**Request:**

```json
{
  "observation": {/* Observation object from /observe */}
}
```

**Response:**

```json
{
  "data": {
    "id": "ver-2026-08-07-abc",
    "observationId": "obs-2026-08-07-1",
    "summary": {
      "passed": true,
      "confidence": 0.95,
      "rulesApplied": 2,
      "rulesPassed": 2,
      "rulesFailed": 0
    },
    "evidencePath": [
      {
        "step": 1,
        "rule": "response-time-threshold",
        "passed": true,
        "reasoning": "Response time 45ms is below 100ms threshold"
      },
      {
        "step": 2,
        "rule": "status-code-check",
        "passed": true,
        "reasoning": "Status code is 200 (expected)"
      }
    ],
    "ruleVersions": {
      "response-time-threshold": "1.0.5",
      "status-code-check": "1.2.0"
    },
    "status": "completed"
  },
  "timestamp": "2026-08-07T10:30:01Z"
}
```

### Attest

```
POST /attest
```

**Step 3 of verification loop**: Create a cryptographically signed attestation.

**Request:**

```json
{
  "verificationResult": {/* VerificationResult from /verify */}
}
```

**Response:**

```json
{
  "data": {
    "id": "att-2026-08-07-xyz",
    "verificationId": "ver-2026-08-07-abc",
    "verified": true,
    "confidence": 0.95,
    "signature": "0x1a2b3c4d5e6f...",
    "signingKey": "sha256:9f2c1a7b4e6d0835",
    "keyVersion": "1",
    "signingAlgorithm": "HMAC-SHA256",
    "attestedAt": "2026-08-07T10:30:02Z",
    "attestedBy": "attestation-service",
    "status": "signed"
  },
  "timestamp": "2026-08-07T10:30:02Z"
}
```

### Revoke an Attestation

```
POST /attest/revoke
GET /attest/revocations
GET /attest/policy
```

Revocation is an operator-mediated, append-only control separate from the
signed attestation payload. When `OMEGA_ADMIN_TOKEN` is configured,
`POST /attest/revoke` requires `Authorization: Bearer <admin token>`; a read
token is not accepted as mutation authority. The local development default
leaves this gate unset, while production configuration should set it. The
request requires a recorded `attestationId`, a human-readable `reason`, and optionally `revokedBy`. A
revoked attestation remains cryptographically inspectable, but
`POST /attest/verify` reports `valid: false` with `revoked: true`, and `/act`
returns `409 REVOKED_ATTESTATION` rather than authorizing an action. When
`OMEGA_ATTESTATION_TTL_MS` is configured, expiry is an additional authorization
predicate: verification reports `expired: true` and `/act` returns
`409 EXPIRED_ATTESTATION`. Duplicate revocation requests are rejected with `409 ATTESTATION_ALREADY_REVOKED`. When `OMEGA_ADMIN_OPERATOR_ALLOWLIST` is configured, an unlisted identity fails with `403 ADMIN_OPERATOR_NOT_ALLOWED`; this is an additional local bearer-plus-identity boundary, not a complete identity, authentication, or authorization system.
`GET /attest/revocations` also returns non-secret integrity metadata: `disabled` when persistence is off, `legacy` when an older snapshot has no registry digest, `intact` when the digest matches loaded records, and `mismatch` when it does not. The response also exposes a local monotonic-in-process `revision` derived from the append-only registry length; verification and mutation responses carry the same revision evidence. A mismatched registry fails closed with `503 REVOCATION_REGISTRY_INTEGRITY` for verification-sensitive mutation and action paths. This digest and revision are local freshness/tamper-evidence signals, not distributed consistency, custody, secure deletion, or proof that another node has observed the same registry state.

### Runtime State

```
GET /state
GET /events
GET /runs
```

These endpoints expose the current runtime state, recent lifecycle events, and completed observation/verification/attestation runs. Local development persists these records to `/tmp/omega-v-oceanicos/runtime.json` by default.

Set `OMEGA_RUNTIME_STORE_PATH` to choose another JSON store path. Persistence
defaults off under `NODE_ENV=test` and on elsewhere; set `OMEGA_PERSISTENCE`
to `on` or `off` to override that explicitly. Set `OMEGA_PERSISTENCE_KEY`
to encrypt the runtime snapshot and append-only event log with authenticated
AES-256-GCM envelopes. The key is never returned by the API. Existing plaintext
stores remain readable for controlled migration, while all new writes use the
configured encryption key.

The API requires a signing key. Set `OMEGA_SIGNING_KEY`, or construct
`AttestationService` with one. There is no default: a key shipped in source
would make every attestation forgeable by anyone holding the repository, so
the service throws `MissingSigningKeyError` rather than sign with one.

Every response includes an `x-request-id` header. Supplying an existing `x-request-id` reuses it; otherwise the API generates one. Complete-loop events and runs retain that request ID alongside their correlation ID.

Structured error responses also include the request ID in their JSON body, so a failure can be traced from the UI or CLI without relying on log timing.

When `OMEGA_READ_TOKEN` is configured, read-only evidence endpoints require `Authorization: Bearer <token>`. This boundary is opt-in so local development remains unchanged when the variable is absent. `/health` remains available without a bearer token for liveness/readiness probes. Missing or invalid read credentials return `401 READ_ACCESS_REQUIRED` with a traceable request ID. Configured read and admin bearer values are compared with a constant-time byte comparison after the bearer scheme is parsed. The API also emits `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` on responses.

### Runtime Observability

```
GET /observability
```

Returns a read-only operational evidence summary composed from the runtime state, durable event log, configured attestation service, and hash-chained memory. It includes runtime mode and persistence, the configured persistence and kernel-memory encryption algorithms or `disabled`, active/previous persistence-key configuration and observed `none/current/previous/mixed` source, recent and durable event counts, completed runs, request and correlation lineage, verification and attestation validity, and memory integrity. It never returns private keys, seeds, secrets, or raw signing material; the algorithm and key-source fields describe local configuration and observed reads only. They do not claim HSM/KMS custody, secure deletion, recovery, distributed coordination, or complete data-at-rest coverage.

### Evidence Export

```
GET /evidence/export
```

Returns a bounded JSON evidence package containing the current observability summary, up to 40 recent events, and up to 10 recent completed runs. The export is read-only, preserves request and correlation lineage, reports explicit memory integrity, and never returns private keys, seeds, or raw signing material. When `OMEGA_READ_TOKEN` is configured, this route requires the bearer token.

### Single Origin

Every endpoint below is also served under an `/api` prefix, and the built web
client is served from the same origin when present.

The client addresses the API as `/api/...`. In development the Vite dev server
strips that prefix; in a production build no dev server exists, so the API
strips it itself. Without that, a built bundle calls `/api/*` and nothing
answers — the routes work on the development path and not the shipped one.

Set `OMEGA_WEB_DIST` to point at the client bundle. It defaults to
`apps/web/dist`, and if no build is present the API serves the API alone.

### Kernel Memory

```
GET /memory
GET /memory/integrity
```

Every completed loop is entered into the MINI kernel's hash-chained memory
(`packages/remember`) as three linked records: the observation, the
verification and the memory record itself. Unlike `GET /runs`, which is a
bounded window, this chain is append-only.

`GET /memory` returns the chain, with `meta.size` and whether the chain is
durable in this environment. `GET /memory/integrity` recomputes every hash
and reports `intact`. It responds `409` rather than `200` when the chain
does not verify, so a broken chain is a failure and not a field to read past.

Set `OMEGA_MEMORY_PATH` to choose where the chain is written. It defaults
to `/tmp/omega-v-oceanicos/memory.jsonl`. Under `NODE_ENV=test` the chain
is in-process only.

### Provenance Log

```
GET /log
```

Returns the durable append-only event history as recorded on disk, one JSON
line per event. `GET /events` returns only a bounded recent window over this
log; `/log` returns everything.

The response `meta` block reports how the read went:

- `source` — `restored`, `partial`, `missing`, or `disabled`
- `skipped` — lines that could not be parsed
- `reason` — present when the read was lossy

A damaged or unauthenticated line is counted and reported rather than silently
dropped, so a partial history can never be mistaken for a complete one. When
`OMEGA_PERSISTENCE_KEY` is configured, each line is authenticated and encrypted
independently so append-only growth remains observable.

Set `OMEGA_EVENT_LOG_PATH` to choose the log location. It defaults to the
runtime store path with a `.log.jsonl` suffix.

### Event Stream

```
GET /events/stream
```

Opens a server-sent event stream. Each complete loop emits observation, verification, and attestation lifecycle events with a correlation ID.

### Public Attestation Key

```
GET /attest/public-key
```

Returns safe Ed25519 trust metadata for clients that need to verify attestations. The response includes the algorithm, key identifier, fingerprint, key version, and public key. Private keys, seeds, secrets, and raw signing material are never returned.

`GET /attest/policy` separately exposes non-secret capability configuration: the attestation algorithm, TTL, presence of read/admin boundaries, revocation support, storage codec names, persistence-key source, and whether a previous persistence key is configured. It never returns token or key values and does not claim custody, secure deletion, automated re-encryption, recovery, or distributed policy coordination.

**Response:**

```json
{
  "data": {
    "algorithm": "Ed25519",
    "keyId": "sha256:...",
    "fingerprint": "sha256:...",
    "keyVersion": "test-ed25519-v1",
    "publicKey": "-----BEGIN PUBLIC KEY-----..."
  },
  "timestamp": "2026-08-14T13:00:00Z"
}
```

### Verify Attestation

```
POST /attest/verify
```

Executes the attestation service's HMAC signature verification.

**Request:**

```json
{
  "attestation": {/* Attestation from /complete-loop or /attest */}
}
```

**Response:**

```json
{
  "data": { "valid": true },
  "timestamp": "2026-08-14T13:00:00Z"
}
```

### Authorize Action

```
POST /act
GET /actions
```

`POST /act` authorizes the local `record-verified-result` action only when the supplied attestation has a valid signature and `verified: true`. Failed verification returns `409`; invalid signatures return `403`. Authorized actions are recorded in the runtime ledger and emitted on the event stream.

### Record Learning

```
POST /learn
GET /learning
```

Learning must reference an authorized action and declare a `success`, `failure`, or `uncertain` outcome. The feedback is recorded in the runtime ledger and emitted as a `learning.recorded` event.

### Propose Recompile

```
POST /recompile
GET /recompilations
```

`POST /recompile` creates a versioned `proposed` recompile record from a learning ID. It records rationale and lineage for review; it does not claim that code or production policy was automatically changed.

### List Rules

```
GET /rules
```

List registered verification rules.

Without a query, returns every registered rule. With `?category=x`, returns
the rules that would apply to an observation in that category. `count`
reflects what was returned; `registered` always reflects the whole registry,
so a filtered result cannot be mistaken for an empty one.

Each rule carries an `executable` flag, and `executable` counts how many of
the returned rules the engine can actually evaluate. A rule's `definition`
is a declaration, not a language the engine interprets — execution is
implemented per rule name. **A registered rule that is not executable fails
verification rather than passing quietly**, so this flag tells a caller in
advance what would otherwise arrive as a failed verdict.

**Response:**

```json
{
  "data": {
    "count": 2,
    "registered": 2,
    "executable": 2,
    "category": null,
    "rules": [
      {
        "name": "response-time-threshold",
        "version": "1.0.5",
        "appliesTo": ["health-check"],
        "description": "Verify response time is below 100ms",
        "active": true,
        "executable": true
      },
      {
        "name": "status-code-check",
        "version": "1.2.0",
        "appliesTo": ["health-check"],
        "description": "Verify HTTP status code is 200 OK",
        "active": true,
        "executable": true
      }
    ]
  },
  "timestamp": "2026-08-07T10:30:00Z"
}
```

### Evidence the engine could not gather

Verification fails when a rule cannot be evaluated — either the engine has no
implementation for it, or the observation does not carry the metadata the
rule reads. An observation reporting `statusCode` but no `responseTime` fails
`response-time-threshold` with `condition: "requires responseTime"` rather
than passing on an assumed zero.

This matters at this layer specifically: `summary.passed` becomes the
attestation's `verified` field, that attestation is signed, and `POST /act`
accepts a signed attestation as authorization. A rule that passed without
being evaluated would carry an unforgeable signature onto a claim nothing
checked.

## Error Handling

All errors follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {/* Optional context */},
  "timestamp": "2026-08-07T10:30:00Z"
}
```

**Common error codes:**

- `OBSERVATION_FAILED` — Invalid observation input
- `VERIFICATION_FAILED` — Verification execution error
- `ATTESTATION_FAILED` — Attestation signing error
- `LOOP_FAILED` — Complete loop error
- `NOT_FOUND` — Endpoint not found

## Example: Full Verification Loop

```bash
curl -X POST http://localhost:3000/complete-loop \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "Service X is healthy",
    "category": "health-check",
    "source": {
      "system": "curl-example",
      "version": "1.0.0",
      "environment": "test"
    },
    "observedBy": "manual-test",
    "metadata": {
      "statusCode": 200,
      "responseTime": 50
    },
    "confidence": 0.95,
    "confidenceReason": "Manual verification"
  }'
```

## Configuration

### Environment Variables

- `API_PORT` — Port to run on (default: 3000)
- `OMEGA_READ_TOKEN` — Optional bearer token required for read-only evidence endpoints; unset preserves local development behavior
- `OMEGA_ADMIN_TOKEN` — Optional distinct bearer token required for `POST /attest/revoke`; never reuse or expose a read token as administrative authority
- `OMEGA_ADMIN_OPERATOR_ALLOWLIST` — Optional comma-separated operator identities. When configured, revocation requires `x-omega-operator-id` (or the SDK/CLI equivalent) to match one of these identities; policy exposes only whether the allowlist is configured, not its contents.
- `OMEGA_SIGNING_KEY` — Required signing key for attestation; there is no default
- `OMEGA_PERSISTENCE` — Explicit persistence override: `on` or `off`
- `OMEGA_PERSISTENCE_KEY` — Active secret for AES-256-GCM encryption of runtime snapshot and event-log files; new writes always use this key, and it is never exposed in logs or API responses
- `OMEGA_PERSISTENCE_KEY_PREVIOUS` — Optional previous secret accepted for controlled reads during local key rotation; snapshot/event-log observability reports `previous` or `mixed` without returning either secret. This is fallback compatibility, not custody, secure deletion, automated re-encryption, or recovery policy.
- `OMEGA_MEMORY_PATH` — Optional JSONL path for the MINI kernel memory chain
- `OMEGA_MEMORY_KEY` — Optional active secret for AES-256-GCM encryption of new kernel-memory lines
- `OMEGA_MEMORY_KEY_PREVIOUS` — Optional previous secret accepted during controlled key rotation; new writes still use `OMEGA_MEMORY_KEY`, and mixed-key restoration reports the fallback source without returning either secret
- `OMEGA_ATTESTATION_TTL_MS` — Optional positive lifetime in milliseconds; expired attestations remain cryptographically inspectable but `/attest/verify` reports `expired: true` and `/act` denies with `409 EXPIRED_ATTESTATION`

Revocation records are included in the encrypted runtime snapshot when
persistence is enabled and every revocation also produces an append-only
`attestation.revoked` event. The snapshot carries a local SHA-256 registry digest
for mismatch detection; legacy snapshots without that digest remain visible as
`legacy` rather than being asserted intact.

## Testing

```bash
npm run test
npm run test:watch
```

## Building

```bash
npm run build
npm run start
```

---

**Package Status:** Stable (v0.1.0)  
**Part of:** Ω∞v Oceanicos verification system  
**Last Updated:** 2026-08-07
