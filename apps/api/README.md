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
    "signingKey": "key-2026-08-production-v1",
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

These endpoints expose the current in-memory runtime state, recent lifecycle events, and completed observation/verification/attestation runs.

### Event Stream

```
GET /events/stream
```

Opens a server-sent event stream. Each complete loop emits observation, verification, and attestation lifecycle events with a correlation ID.

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

### List Rules

```
GET /rules
```

List all registered verification rules.

**Response:**

```json
{
  "data": {
    "count": 2,
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
