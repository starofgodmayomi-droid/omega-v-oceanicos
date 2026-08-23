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

## Authentication boundary

The API defaults to `OMEGA_AUTH_MODE=local`, preserving local-development behavior and the existing opt-in token gates. For a network-exposed deployment, set `OMEGA_AUTH_MODE=required` together with both `OMEGA_READ_TOKEN` and `OMEGA_ADMIN_TOKEN`. The service refuses to initialize if either required bearer token is missing or blank.

In required mode, unauthenticated `GET /health` remains available for local process probes. All other `GET` routes and `POST /attest/verify` require the read bearer token. Every other non-health request requires the admin bearer token. These are shared-secret credentials, not identity proofing; production deployments should place them behind an approved secret store and identity or gateway boundary. The API reports only the non-secret mode label (`local` or `required`) through health, state, and attestation-policy responses.

The single-origin dashboard follows that same boundary. In required mode, the SPA shell, static assets, deep-link HTML fallback, API reads, and the server-sent event stream are not anonymous browser resources; they require the read credential. Dashboard mutations require the admin credential. A normal browser navigation or `EventSource` cannot manufacture an `Authorization` header, and this repository does not provide user accounts, login, cookie sessions, or gateway credential injection. Therefore the published image is an **API-and-SPA artifact**, not a turnkey browser deployment: expose it only behind an approved identity/gateway layer that authenticates the operator and injects the appropriate read/admin credentials, or add and review a dedicated browser session design before using the dashboard on a network. Do not make the static shell public as a workaround, because that would not solve unauthenticated API access and could create a misleading security boundary.

The executable contract is covered by the required-auth regression suite: anonymous HTML and asset requests receive `401 READ_ACCESS_REQUIRED`, while requests carrying the read bearer receive the shell or asset. This proves the boundary; it does not prove that a particular gateway, identity provider, cookie session, or browser deployment is configured.

```bash
# Local compatibility mode (default)
export OMEGA_AUTH_MODE=local

# Required mode for an exposed deployment
export OMEGA_AUTH_MODE=required
export OMEGA_READ_TOKEN='read-secret-from-protected-storage'
export OMEGA_ADMIN_TOKEN='admin-secret-from-protected-storage'
```

## Running the published image

Each commit merged to `main` publishes a container image with signed build
provenance:

```
docker pull ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest

docker run -p 3000:3000 \
  -e OMEGA_SIGNING_KEY="$(openssl rand -hex 32)" \
  -e OMEGA_AUTH_MODE=required \
  -e OMEGA_READ_TOKEN="$(openssl rand -hex 32)" \
  -e OMEGA_ADMIN_TOKEN="$(openssl rand -hex 32)" \
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

The image also carries a signed SPDX inventory of everything inside it, so
the question "does this ship a package with a known vulnerability" can be
answered without pulling and unpacking the image:

```
gh attestation verify \
  oci://ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest \
  --repo starofgodmayomi-droid/omega-v-oceanicos \
  --predicate-type https://spdx.dev/Document
```

Both attestations are bound to the image **digest**, not to the `latest`
tag. A tag moves; an attestation bound to one would describe whatever it
points at today rather than what was actually built.

`ATTEST ≠ ASSERT` applies to the artifact too. The pipeline claiming a build
passed is an assertion; a signature a stranger can verify is not. Provenance
says who built it, the inventory says what is in it, and neither requires
trusting this document.

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
  "confidenceReason": "3 consecutive checks",
  "parentId": "obs-parent-1",
  "lineage": ["obs-root-1", "obs-parent-1"]
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

Returns unauthenticated liveness and readiness evidence for probes. The response keeps `status: "ok"` for compatibility, adds a `readiness` value, reports observer/verifier/attester availability, memory integrity and codec mode, persistence mode and codec mode, durable event-log source, skipped log entries, and the non-secret attestation policy. A healthy memory chain, usable persistence snapshot, and complete durable log return HTTP `200` with `readiness: "ready"`; a memory-integrity failure, enabled corrupt persistence snapshot, or enabled partial event log returns HTTP `503` with `readiness: "degraded"`. An enabled but missing store or log is treated as a valid cold start and remains observable through the persistence source fields. No token, private key, or signing material is returned.

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

**Step 1 of verification loop**: Submit an observation. Optional `parentId` and bounded `lineage` fields preserve local predecessor evidence; the API accepts at most 32 non-empty lineage identifiers. These fields do not prove causality, distributed ordering, or external execution.

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
  "confidenceReason": "3 consecutive checks",
  "parentId": "obs-parent-1",
  "lineage": ["obs-root-1", "obs-parent-1"]
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

### Persistence Re-encryption

```
POST /persistence/reencrypt
```

This operator mutation closes the local ciphertext-rotation gap without
pretending that a local rewrite is distributed recovery. It is available only
when persistence is enabled, both current and previous persistence keys are
configured, and the runtime has complete restored evidence using the previous
key. The request requires a reason of 8–1000 characters and an operator identity;
when configured, `OMEGA_ADMIN_TOKEN` must be supplied as a distinct bearer
credential and `OMEGA_ADMIN_OPERATOR_ALLOWLIST` must contain the identity.

The operation validates the snapshot and every event-log line before writing
sibling temporary files and renaming them into place. A corrupt snapshot or
partial log returns `409 PERSISTENCE_REENCRYPTION_FAILED` and leaves the
original files untouched. Success emits `persistence.rotation.reencrypted`,
returns the observed source key categories and logical record counts, and
exposes the latest non-secret result through health, state, observability, the
SDK, CLI, and dashboard. The event log remains logically append-only; its
ciphertext is deliberately rewritten as a controlled rotation operation. The
operation writes a mode-600 local transaction journal before committing the
staged files. On restart, the API reconciles a complete journal transaction
before loading readiness evidence; a malformed or incomplete journal leaves
readiness degraded and is surfaced as `reencryptionRecovery.status: "blocked"`.
A recovered journal is reported as `"recovered"` and then removed. This journal is crash-recovery evidence for one local process, not distributed coordination
or proof of replica consistency. Health, state, and observability also expose
`persistenceCurrentKeyFingerprint` and `persistencePreviousKeyFingerprint` (or
`null`) as deterministic short identifiers of configured local secrets. They
support equality checks during rotation but are not secrets and do not prove
custody, HSM/KMS control, recovery, secure deletion, or deployment authorization. Health, state, and observability also expose a coverage inventory for the runtime snapshot, event log, kernel-memory file, and in-memory local-job ledger with `runtime-observed` evidence and `complete: false`. The local-job ledger is `encryption: disabled`, `keySource: none`, and non-durable by design; databases, object storage, backups, and external services remain explicitly unverified.

**Request:**

```json
{
  "reason": "Rotate complete local persistence to the current key",
  "operatorId": "rotation-operator"
}
```

### Runtime State

```
GET /state
GET /events
GET /runs
```

These endpoints expose the current runtime state, recent lifecycle events, and completed observation/verification/attestation runs. The state response includes an explicit `readiness` value (`ready` or `degraded`), `eventLogSource`, `skippedLogEntries`, and `trustBasis.serviceReadiness`; these values are one contract, so an enabled partial durable log reports `degraded` and readiness `0` while preserving inspectable entries. The typed SDK exposes `getState()`, the CLI status command renders the same readiness evidence, and the dashboard shows it separately from probe health. Local development persists these records to `/tmp/omega-v-oceanicos/runtime.json` by default.

Set `OMEGA_RUNTIME_STORE_PATH` to choose another JSON store path. Persistence
defaults off under `NODE_ENV=test` and on elsewhere; set `OMEGA_PERSISTENCE`
to `on` or `off` to override that explicitly. Set `OMEGA_PERSISTENCE_KEY`
to encrypt the runtime snapshot and append-only event log with authenticated
AES-256-GCM envelopes. The key is never returned by the API. Existing plaintext
stores remain readable for controlled migration, while all new writes use the
configured encryption key. When rotating keys, set both `OMEGA_PERSISTENCE_KEY`
and `OMEGA_PERSISTENCE_KEY_PREVIOUS`; the authenticated `POST
/persistence/reencrypt` mutation can then rewrite complete local snapshot and
event-log evidence under the current key. It requires the admin bearer token and
an allowlisted `x-omega-operator-id`, refuses corrupt or partial evidence, and
returns non-secret record counts and observed key sources. It preserves logical
event history but does not prove distributed recovery, custody, secure deletion,
or deployment authorization.

The API requires a signing key. Set `OMEGA_SIGNING_KEY`, or construct
`AttestationService` with one. There is no default: a key shipped in source
would make every attestation forgeable by anyone holding the repository, so
the service throws `MissingSigningKeyError` rather than sign with one.

Every response includes an `x-request-id` header. Supplying an existing `x-request-id` reuses it; otherwise the API generates one. Complete-loop events and runs retain that request ID alongside their correlation ID.

Structured error responses also include the request ID in their JSON body, so a failure can be traced from the UI or CLI without relying on log timing.

When `OMEGA_READ_TOKEN` is configured, read-only evidence endpoints require `Authorization: Bearer <token>`. This boundary is opt-in so local development remains unchanged when the variable is absent. `/health` remains available without a bearer token for liveness/readiness probes. Missing or invalid read credentials return `401 READ_ACCESS_REQUIRED` with a traceable request ID. Configured read and admin bearer values are compared with a constant-time byte comparison after the bearer scheme is parsed. The API also emits `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` on responses.

### Bounded Audit Query

```
GET /audit/events?type=&stage=&status=&from=&to=&limit=
```

Returns a bounded, read-only query over the local runtime event log. Supported
filters are exact `type`, `stage`, and `status` values, inclusive ISO-8601
`from` and `to` timestamps, and an integer `limit`. The default limit is `100`
and the maximum is `500`; invalid values return `400 INVALID_AUDIT_QUERY`.
Results are ordered newest first and include explicit `meta.bounded`, `meta.total`,
`meta.skipped`, `meta.source`, `meta.reason`, `meta.keySource`, and normalized filter evidence. The health, state, and observability responses expose the same durable-log provenance as `eventLogSource`, `skippedLogEntries`, `eventLogReason`, and the authenticated event-log key source.

This endpoint is **local evidence only**. It is not a distributed audit index,
not a completeness proof for unpersisted history, and not a claim that another
node has observed the same events. When persistence is disabled, the source is
in-memory; when persistence is enabled, the response reports the observed
restoration source and skipped records without silently treating partial history
as complete.

### Runtime Observability

```
GET /observability
```

Returns a read-only operational evidence summary composed from the runtime state, durable event log, configured attestation service, and hash-chained memory. It includes runtime mode and persistence, the configured persistence and kernel-memory encryption algorithms or `disabled`, active/previous key configuration, observed persistence key-source evidence, `persistenceRotationPending`, `operatorAction`, durable-log source/skipped/reason/key-source evidence, and observed kernel-memory key-source evidence (`none`, `current`, `previous`, or `mixed`), recent and durable event counts, completed runs, request and correlation lineage, verification and attestation validity, and memory integrity. It never returns private keys, seeds, secrets, or raw signing material; the algorithm and key-source fields describe local configuration and observed reads only. `operatorAction` is a routing hint derived from those local signals; it does not acknowledge, repair, authorize, or deploy a persistence change. An admin-authenticated `POST /persistence/acknowledge` with an allowlisted operator identity and a reason of 8–1000 characters records an active append-only acknowledgement event and exposes the latest acknowledgement in health, state, and observability. The acknowledgement is evidence that a human reviewed the boundary, not evidence that repair or recovery succeeded. They do not claim HSM/KMS custody, secure deletion, recovery, distributed coordination, or complete data-at-rest coverage.

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

### Dissensus

```
POST /dissensus
GET  /dissensus
```

Reconciles several verifiers' opinions without resolving them. Returns a
verdict of `AGREED`, `SPLIT` or `UNKNOWN`, the minimum confidence across
opinions, and every opinion received — including the ones that disagree.

There is no majority vote and no averaging. Two verifiers passing and one
failing is `SPLIT`, not `AGREED`, because reporting agreement there would
discard the objection.

**A split does not block `/act`.** Pass `dissensusId` when authorizing and
the action records `status: "authorized-with-dissent"`, the objecting
opinions, and `requiresHumanReview` when routing says so. The action
proceeds because blocking would force resolution before evidence exists;
the dissent is attached permanently because erasing it would let the record
claim the action was uncontested.

Referencing a `dissensusId` that was never recorded is refused with `404`,
for the same reason an attestation without runtime lineage is.

#### Routing policy

`OMEGA_DISSENSUS_MIN_CONFIDENCE`, `OMEGA_DISSENSUS_QUORUM` and
`OMEGA_DISSENSUS_HUMAN_ON_SPLIT` set the routing policy. Unset, the built-in
values apply.

Every reconciliation reports the policy it was judged under, including a
`provenance` field of `default`, `configured` or `derived`:

- **`default`** — the numbers were chosen by an author. The current
  `minimumConfidence` of `0.7` is one of these. It was not measured, and
  reporting it without saying so would let a chosen number read as evidence.
- **`configured`** — an operator set them and is answerable for them.
- **`derived`** — computed from recorded outcomes. **Nothing produces this
  yet**, because no outcome data has been collected.

Values are refused rather than clamped. A confidence outside `0..1`, a
non-integer quorum, or a split flag that is not exactly `true` or `false`
fails at startup with the variable named. Clamping would invent a number
nobody chose and then route human review by it.

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
- `OMEGA_ADMIN_REQUIRE_ALLOWLIST` — Set to `on` to fail closed for all admin mutations unless the operator allowlist is configured, the supplied identity is listed, and `x-omega-operator-id` is present. In strict mode, a JSON body `operatorId` cannot substitute for the dedicated header; unset preserves the optional-allowlist behavior. The header remains an asserted local identity, not complete authentication or identity proofing.
- `OMEGA_PERSISTENCE_DELETION_MODE` — Optional declaration of `unlink-only` or `overwrite-unlink` cleanup behavior. `unavailable` is the default; invalid values degrade readiness. The API always reports `verified: false`: this is capability/configuration evidence, not proof of secure erasure, filesystem behavior, backups, replicas, or custody.
- `OMEGA_PERSISTENCE_CUSTODY_MODE` and `OMEGA_PERSISTENCE_CUSTODY_REFERENCE` — Optional declaration of `unverified-local`, `operator-managed`, `hsm-kms`, or `external-reference` custody context plus a bounded non-secret reference. `unverified-local` is the default; invalid or reference-less declarations degrade readiness. Every mode reports `verified: false`; no HSM/KMS, operator, external system, recovery material, or deployment claim is made.
- `OMEGA_SIGNING_KEY` — Required signing key for attestation; there is no default
- `OMEGA_PERSISTENCE` — Explicit persistence override: `on` or `off`
- `OMEGA_PERSISTENCE_KEY` — Active secret for AES-256-GCM encryption of runtime snapshot and event-log files; new writes always use this key, and it is never exposed in logs or API responses
- `OMEGA_PERSISTENCE_KEY_PREVIOUS` — Optional previous secret accepted for controlled reads during local key rotation; snapshot/event-log observability reports `previous` or `mixed` without returning either secret. This is fallback compatibility, not custody, secure deletion, automated re-encryption, or recovery policy. `OMEGA_PERSISTENCE_RECOVERY_MODE` may be `operator-provided` or `external-reference`, with `OMEGA_PERSISTENCE_RECOVERY_REFERENCE` as a bounded non-secret label; omitted configuration is `unavailable`, and invalid declarations degrade readiness. The resulting mode, reference, and parse reason are declaration evidence only: the API does not verify the operator, custodian, recovery material, or external system.
- `OMEGA_LOCAL_JOB_LEDGER` — Set to `on` to enable the bounded local job ledger; it remains disabled by default and never starts external workers or network activity
- `OMEGA_LOCAL_JOB_LEDGER_TOKEN` — Dedicated token required by the loopback-only local job endpoints when the ledger is enabled. In `OMEGA_AUTH_MODE=local`, it may be supplied as the bearer token for backward compatibility. In `OMEGA_AUTH_MODE=required`, keep the global `Authorization` bearer role (`read` for GET or `admin` for mutations) and send this dedicated value in `x-omega-local-job-token`; the two credentials remain separate.
- `OMEGA_LOCAL_JOB_LEDGER_PATH` and `OMEGA_LOCAL_JOB_LEDGER_KEY` — Optional paired settings for AES-256-GCM encrypted, atomic, single-process job-ledger persistence. Missing storage is an empty cold start; malformed or unauthenticated storage fails closed. These settings do not provide backup, recovery, distributed durability, or key custody.
- `OMEGA_MEMORY_PATH` — Optional JSONL path for the MINI kernel memory chain
- `OMEGA_MEMORY_KEY` — Optional active secret for AES-256-GCM encryption of new kernel-memory lines
- `OMEGA_MEMORY_KEY_PREVIOUS` — Optional previous secret accepted during controlled key rotation; new writes still use `OMEGA_MEMORY_KEY`. Memory observability reports `current`, `previous`, or `mixed` according to the authenticated encrypted lines restored, without returning either secret.
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
**Last Updated:** 2026-08-16

## Local Job Ledger (Opt-In, Local-Only)

The API includes a deliberately small job boundary for deterministic local integrations. It is **disabled by default** and never starts a timer, subprocess, shell command, crawler, or network client. To opt in for a local development process, set `OMEGA_LOCAL_JOB_LEDGER=on` and provide `OMEGA_LOCAL_JOB_LEDGER_TOKEN`; requests must arrive over loopback. In local authentication mode, the dedicated value may remain `Authorization: Bearer <token>`. In required authentication mode, the normal global bearer credential remains in `Authorization` (`read` for GET or `admin` for mutations), and the dedicated ledger value must be sent separately as `x-omega-local-job-token`. This separation avoids collapsing API role authentication and local-ledger boundary authentication into one credential.

This ledger accepts only `synthetic-observe` jobs whose `sourceUri` begins with `local://`. It is an in-memory, bounded operational evidence surface by default with `durable: false`, `source: "memory"`, and `encryption: "disabled"`; restarting the process clears jobs and counters. For a single local process that needs restart continuity, also set `OMEGA_LOCAL_JOB_LEDGER_PATH` and `OMEGA_LOCAL_JOB_LEDGER_KEY`. The ledger then writes jobs, idempotency records, and bounded lifecycle events as an AES-256-GCM authenticated envelope, reports `durable: true`, `source: "file"`, and `encryption: "aes-256-gcm"`, and restores them on startup. A missing file is an empty cold start; malformed, unauthenticated, or incompatible storage fails closed. This is local single-process persistence, not a distributed queue, scheduler, crawler, vector index, retry system, backup, recovery service, or proof of durable execution.

The lifecycle is `queued → running → succeeded|failed`. Submission requires an idempotency key and an operator identity header. A worker claims a queued job with `x-omega-worker-id`, and completion or failure requires the same worker identity. Terminal jobs cannot be changed. Lifecycle events are copied into the existing bounded runtime event stream with request, correlation, sequence, and provenance fields; job payloads, tokens, filesystem paths, and shell/network instructions are not returned.

```bash
export OMEGA_LOCAL_JOB_LEDGER=on
export OMEGA_LOCAL_JOB_LEDGER_TOKEN='local-development-only'
export OMEGA_LOCAL_JOB_LEDGER_PATH='/tmp/omega-v-oceanicos/local-jobs.json'
export OMEGA_LOCAL_JOB_LEDGER_KEY='local-development-ledger-key'
export OMEGA_ADMIN_OPERATOR_ALLOWLIST='local-operator'

curl -sS -X POST http://127.0.0.1:3000/jobs \
  -H 'Authorization: Bearer local-development-only' \
  -H 'x-omega-operator-id: local-operator' \
  -H 'Content-Type: application/json' \
  -d '{"kind":"synthetic-observe","idempotencyKey":"demo-1","sourceUri":"local://fixture/demo"}'
```

The endpoint set is `POST /jobs`, `GET /jobs`, `GET /jobs/:jobId`, `POST /jobs/:jobId/claim`, `POST /jobs/:jobId/complete`, and `POST /jobs/:jobId/fail`. External URLs, shell execution, arbitrary worker payloads, and production deployment are intentionally outside this slice and require separate security and infrastructure review.

## Ω∞v scene simulation

`POST /scene/simulate` runs the bounded symbolic equation `DARKNESS → POSSIBILITY → OCEAN → STAR → WATER_FORM → MANY_FORMS → LONELINESS → HUMAN_FORM → MISRECOGNITION → BOUNDARY → QUESTION → FOREST → RETURN`. Optional JSON fields are `seed` and `steps`; steps are bounded to the available equation states. The response includes a deterministic trace, per-step evidence identifiers, rule version `scene-equation.v1`, and `verified: false`.

This endpoint is a local symbolic simulation only. It does not prove physical cosmology, consciousness, sentience, or any claim represented by the myth. Invalid bounds fail with `SCENE_INVALID`.

### Portable API smoke contract

After building the workspace, run `pnpm smoke:api` from the repository root. The portable Node runner starts `apps/api/dist/server.js` from the API package directory, where workspace package resolution is reproducible, checks `/health` for `readiness: "ready"`, and exercises `POST /scene/simulate` through its terminal `return` state. It asserts `deterministic: true` and `verified: false`. This is a local compiled-runtime smoke check; it does not prove deployment health, distributed coordination, external custody, or production availability.

The smoke runner uses a local test signing key and `OMEGA_PERSISTENCE=off`. It must never be interpreted as evidence that production secrets, persistence, backups, replicas, or external services are configured.

### Coordination evidence boundary

`OMEGA_PERSISTENCE_COORDINATION_MODE` declares `local-single-process`, `operator-coordinated`, or `external-coordinator`; reference-bearing modes also require `OMEGA_PERSISTENCE_COORDINATION_REFERENCE`. Invalid or reference-less declarations degrade readiness. Health, state, observability, SDK, CLI, and dashboard surfaces report the same declaration with `verified: false`. These fields do not prove distributed consistency, leader election, replica agreement, global ordering, external coordinator control, or deployment availability.
