# @omega-v/types

Shared type definitions for Ω∞v Oceanicos.

This package defines the core data structures that flow through the verification loop:

- **Observation** — A claim with metadata about what was observed
- **VerificationRule** — A rule for testing observations
- **VerificationResult** — The result of applying rules with evidence paths
- **Attestation** — A cryptographically signed verification result
- **EventLogEntry** — An immutable record in the event log

## Installation

```bash
npm install @omega-v/types
```

## Usage

```typescript
import { Observation, VerificationResult, Attestation } from '@omega-v/types';

const observation: Observation = {
  id: 'obs-123',
  claim: { statement: 'Service is healthy', category: 'health-check' },
  source: { system: 'health-api', version: '1.0', environment: 'prod' },
  timestamp: new Date().toISOString(),
  observedBy: 'monitoring',
  metadata: { statusCode: 200, responseTime: 45 },
  confidence: 0.95,
  confidenceReason: '3 consecutive checks passed',
  status: 'normalized',
};
```

## Type Hierarchy

```
Observation (claim + metadata)
  ↓
VerificationResult (rules applied, evidence generated)
  ↓
Attestation (cryptographically signed result)
  ↓
EventLogEntry (recorded in immutable log)
```

## Key Types

### Observation

Represents a claim about system state with supporting evidence.

**Fields:**

- `id` — Unique identifier
- `claim` — The statement and category
- `source` — Where this came from
- `timestamp` — When it was observed
- `metadata` — Supporting data (metrics, logs, etc.)
- `confidence` — How certain (0-1 scale)
- `status` — Current state (normalized, verified, failed)

### VerificationResult

Shows whether an observation is true with full evidence trail.

**Fields:**

- `id` — Unique verification ID
- `evidencePath` — Step-by-step reasoning
- `summary` — Overall pass/fail and statistics
- `ruleVersions` — Which rule versions were used

### Attestation

A cryptographically signed verification result, proving it happened at a specific time.

**Fields:**

- `signature` — Unforgeable proof
- `signingKey` — Which key created the signature
- `attestedAt` — When this was signed
- All fields from VerificationResult for proof

## API Reference

See [../TYPES.md](../TYPES.md) for complete API documentation.

---

**Package Status:** Production-ready  
**Last Updated:** 2026-08-07
