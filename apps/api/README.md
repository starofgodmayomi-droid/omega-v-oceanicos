# @omega-v/api

REST API backend for Ω∞v Oceanicos.

Exposes the complete verification loop via HTTP endpoints.

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

## Endpoints

### Health Check

```
GET /health
```

Returns API status.

**Response:**

```json
{
  "data": { "status": "ok" },
  "timestamp": "2026-08-07T10:30:00Z"
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

### Complete Loop

```
POST /complete-loop
```

Execute the entire verification loop in one request: Observe → Verify → Attest.

**Request:** Same as `/observe`

**Response:**

```json
{
  "data": {
    "observation": {/* Observation from step 1 */},
    "verification": {/* VerificationResult from step 2 */},
    "attestation": {/* Attestation from step 3 */}
  },
  "timestamp": "2026-08-07T10:30:02Z"
}
```

### Runtime State

```
GET /state
GET /events
GET /runs
```

These endpoints expose the current runtime state, recent lifecycle events, and completed observation/verification/attestation runs. Local development persists these records to `/tmp/omega-v-oceanicos/runtime.json` by default.

Set `OMEGA_RUNTIME_STORE_PATH` to choose another JSON store path. Persistence
defaults off under `NODE_ENV=test` and on elsewhere; set `OMEGA_PERSISTENCE`
to `on` or `off` to override that explicitly.

The API requires a signing key. Set `OMEGA_SIGNING_KEY`, or construct
`AttestationService` with one. There is no default: a key shipped in source
would make every attestation forgeable by anyone holding the repository, so
the service throws `MissingSigningKeyError` rather than sign with one.

Every response includes an `x-request-id` header. Supplying an existing `x-request-id` reuses it; otherwise the API generates one. Complete-loop events and runs retain that request ID alongside their correlation ID.

Structured error responses also include the request ID in their JSON body, so a failure can be traced from the UI or CLI without relying on log timing.

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

A damaged line is counted and reported rather than silently dropped, so a
partial history can never be mistaken for a complete one.

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

**Response:**

```json
{
  "data": {
    "count": 2,
    "registered": 2,
    "category": null,
    "rules": [
      {
        "name": "response-time-threshold",
        "version": "1.0.5",
        "appliesTo": ["health-check"],
        "description": "Verify response time is below 100ms",
        "active": true
      },
      {
        "name": "status-code-check",
        "version": "1.2.0",
        "appliesTo": ["health-check"],
        "description": "Verify HTTP status code is 200 OK",
        "active": true
      }
    ]
  },
  "timestamp": "2026-08-07T10:30:00Z"
}
```

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
