# Packages

Shared libraries and core verification loop components.

## Overview

The verification loop is built on three core packages that can be used independently or together:

```
Observation → Verification → Attestation
    ↓            ↓               ↓
@omega-v/   @omega-v/        @omega-v/
observer    verification     attestation
```

## Structure

```
packages/
├── types/              # Shared type definitions for entire ecosystem
├── observer/           # Step 1: Capture and normalize observations
├── verification/       # Step 2: Apply rules and generate evidence
└── attestation/        # Step 3: Cryptographically sign results
```

## Packages

### @omega-v/types

Shared TypeScript interfaces and types used across all packages.

**Key Types:**

- `Observation` — A claim with metadata about what was observed
- `VerificationRule` — A rule for testing observations
- `VerificationResult` — Rules applied with evidence
- `Attestation` — Signed verification result
- `EventLogEntry` — Immutable event log record

**Why separate?**

- Zero dependencies (pure types)
- Fast compilation
- Used by all other packages

**See also:** [types/README.md](types/README.md)

### @omega-v/observer

Step 1 of the verification loop: Capture claims and prepare them for verification.

**Features:**

- Claim validation
- Automatic deduplication
- Confidence normalization (0-1)
- Metadata attachment

**Main export:**

```typescript
class Observer {
  observe(input: ObservationInput): Observation;
  getCacheStats(): { size: number; windowMs: number };
}
```

**See also:** [observer/README.md](observer/README.md)

### @omega-v/verification

Step 2 of the verification loop: Apply rules to observations and produce evidence.

**Features:**

- Rule registration and management
- Automatic rule matching by category
- Evidence path generation (step-by-step reasoning)
- Result caching

**Main export:**

```typescript
class VerificationEngine {
  registerRule(rule: VerificationRule): void;
  verify(observation: Observation): VerificationResult;
  getApplicableRules(observation: Observation): VerificationRule[];
}
```

**See also:** [verification/README.md](verification/README.md)

### @omega-v/attestation

Step 3 of the verification loop: Sign verification results and create unforgeable proof.

**Features:**

- Cryptographic signature generation
- Signature verification
- Key versioning
- Key rotation support

**Main export:**

```typescript
class AttestationService {
  attest(result: VerificationResult): Attestation;
  verify(attestation: Attestation): boolean;
  rotateKey(newKey: string, newVersion: string): void;
}
```

**See also:** [attestation/README.md](attestation/README.md)

## Installation

### Use Individual Packages

```bash
# Just observation
npm install @omega-v/types @omega-v/observer

# Full loop
npm install @omega-v/types @omega-v/observer @omega-v/verification @omega-v/attestation
```

### Use from Monorepo

```bash
# Install all
npm install

# Build all packages
npm run build

# Test all packages
npm run test
```

## Development

### Add a New Package

```bash
mkdir packages/my-package
cd packages/my-package

# Create package.json
cat > package.json << EOF
{
  "name": "@omega-v/my-package",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}
EOF

# Create src/index.ts
mkdir src
touch src/index.ts
```

### Run Tests for One Package

```bash
npm test -- packages/observer/
```

### Build One Package

```bash
npm run -w @omega-v/observer build
```

## Testing

Each package includes:

- 70%+ code coverage for branches, functions, lines
- Unit tests for all public APIs
- Validation tests for error cases
- Integration tests (coming soon)

## Type Safety

All packages use strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

## Documentation

Each package includes:

- `README.md` — Quick start and features
- Inline JSDoc comments on all public APIs
- Examples in type definitions

## Versioning

Packages follow semantic versioning:

- **MAJOR** — Breaking API changes
- **MINOR** — New features (backward compatible)
- **PATCH** — Bug fixes

Current version: **0.1.0** (preview/alpha)

---

**Status:** In active development  
**Last Updated:** 2026-08-07

export interface PublicAPI {
// Single responsibility
}

export class Implementation implements PublicAPI {
// Single, testable behavior
}

````

## Shared Types

Common types are in `packages/types/`:

```typescript
export interface Observation {
  id: string;
  claim: string;
  source: string;
  timestamp: string;
  confidence: number;
  metadata: Record<string, unknown>;
}
````

---

See [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
