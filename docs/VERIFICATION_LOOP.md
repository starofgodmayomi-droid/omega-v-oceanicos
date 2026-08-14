# The Verification Loop

This document describes the heart of Ω∞v Oceanicos: the complete verification workflow from observation to learning.

---

## Overview

### MINI foundation (always)

```text
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

This is the smallest useful kernel. See [MINI.md](./MINI.md).

### Expanded loop (earned layers wrap MINI)

```
Observe → Verify → Remember → Attest → Display → Learn → Return
```

Attest/Display/Learn are expansions. They must not redefine or replace MINI.
Understanding both layers is crucial: start from MINI, then earn the rest.

---

## Step 1: Observe

### Purpose
Capture a claim, event, or state change and prepare it for verification.

### Input
Any claim from any source:
- A health check returning a status code
- A metric exceeding a threshold
- A user assertion about system behavior
- A contract claiming certain conditions were met

### Process

#### 1.1 Receive the Claim
```typescript
const claim = {
  statement: "Service X returned HTTP 200",
  source: "health-check-endpoint",
  timestamp: "2026-08-07T10:30:00Z"
};
```

#### 1.2 Normalize with Metadata
```typescript
const observation = {
  // The claim itself
  claim: {
    statement: "Service X returned HTTP 200",
    category: "health-check"
  },

  // Source information
  source: {
    system: "health-check-api",
    version: "1.2.3",
    environment: "production"
  },

  // Temporal data
  timestamp: "2026-08-07T10:30:00Z",
  observedBy: "monitoring-system",

  // Evidence and confidence
  metadata: {
    statusCode: 200,
    responseTime: 45,
    attempts: 3,
    lastSuccess: "2026-08-07T10:25:00Z"
  },
  confidence: 0.95,  // 0-1 scale
  confidenceReason: "3 consecutive successful checks"
};
```

#### 1.3 Validate Schema
```typescript
// Check that observation includes required fields
validate(observation, OBSERVATION_SCHEMA);
// ✓ Passes validation
```

#### 1.4 Deduplicate
```typescript
// Check if we've seen this exact observation recently
const isDuplicate = store.findSimilar(observation, {
  timeWindow: 60000,  // 60 seconds
  threshold: 0.95     // 95% similarity
});

if (isDuplicate) {
  return { status: "deduplicated", originalId: isDuplicate.id };
}
```

### Output

**Normalized Observation** with ID and timestamp:
```typescript
{
  id: "obs-2026-08-07-1234",
  claim: { ... },
  source: { ... },
  timestamp: "2026-08-07T10:30:00Z",
  observedBy: "monitoring-system",
  metadata: { ... },
  confidence: 0.95,
  status: "normalized"
}
```

---

## Step 2: Verify

### Purpose
Apply verification rules to the observation and produce evidence of truth or falsehood.

### Input
- Normalized observation from Step 1
- Applicable verification rules
- Rule versions and parameters

### Process

#### 2.1 Select Applicable Rules

```typescript
const applicableRules = rules.filter(rule => {
  return rule.appliesTo.includes(observation.claim.category);
});

// Example: For "health-check" observations, apply:
// - health-status-rule v1.2.0
// - response-time-threshold-rule v1.0.5
```

#### 2.2 Compile Rules to IR (if needed)

```typescript
// Rule language:
// when response_time < 100 and status_code == 200
// then health_check_passed = true

// Compile to bytecode:
const bytecode = compiler.compile(rule.definition);

// Bytecode (simplified):
// LOAD metadata.responseTime
// CONST 100
// LT                    // Less than
// LOAD metadata.statusCode
// CONST 200
// EQ                    // Equal
// AND
// STORE health_check_passed
```

#### 2.3 Execute Each Rule

```typescript
for (const rule of applicableRules) {
  const result = verificationEngine.execute({
    observation,
    rule,
    ruleVersion: rule.version
  });

  results.push({
    rule: rule.name,
    ruleVersion: rule.version,
    passed: result.passed,
    evidence: result.evidencePath,
    details: result.details
  });
}
```

#### 2.4 Build Evidence Path

The evidence path is not just "true" or "false" — it's the complete reasoning:

```typescript
const evidencePath = [
  {
    step: 1,
    rule: "response-time-threshold",
    condition: "metadata.responseTime < 100",
    value: 45,
    threshold: 100,
    passed: true,
    reasoning: "45ms is less than 100ms threshold"
  },
  {
    step: 2,
    rule: "status-code-check",
    condition: "metadata.statusCode == 200",
    value: 200,
    expected: 200,
    passed: true,
    reasoning: "Status code matches expected value"
  },
  {
    step: 3,
    rule: "combined-health-check",
    condition: "step1.passed AND step2.passed",
    operands: [true, true],
    passed: true,
    reasoning: "All conditions met: health check passes"
  }
];
```

#### 2.5 Handle Rule Failures

Failures are **not** errors. They're evidence of problems:

```typescript
const failureResult = {
  passed: false,
  evidence: [{
    step: 1,
    rule: "response-time-threshold",
    condition: "metadata.responseTime < 100",
    value: 245,
    threshold: 100,
    passed: false,
    reasoning: "245ms exceeds 100ms threshold",
    severity: "warning"  // or "critical"
  }],
  failureType: "threshold-exceeded",
  failureSeverity: "warning",
  suggestedAction: "Investigate performance degradation"
};
```

### Output

**Verification Result** with evidence:
```typescript
{
  id: "ver-2026-08-07-5678",
  observationId: "obs-2026-08-07-1234",
  timestamp: "2026-08-07T10:30:01Z",
  
  summary: {
    passed: true,
    confidence: 0.95,
    rulesApplied: 3,
    rulesPassed: 3,
    rulesFailed: 0
  },
  
  rules: [
    { name: "response-time-threshold", passed: true, ... },
    { name: "status-code-check", passed: true, ... },
    { name: "combined-health-check", passed: true, ... }
  ],
  
  evidencePath: [...],
  
  ruleVersions: {
    "response-time-threshold": "1.0.5",
    "status-code-check": "1.2.0",
    "combined-health-check": "1.2.0"
  }
}
```

---

## Step 3: Remember (MINI)

### Purpose
Persist the observation and verification as durable memory without assuming a database or ecosystem.

### Process

```typescript
import { Remember } from '@omega-v/remember';

const memory = new Remember();
const record = memory.remember(observation, verification);
// append-only: OBSERVATION → VERIFICATION → MEMORY
memory.verifyIntegrity();
```

### Output

**MemoryRecord** linked to observation + verification ids, plus hash-chained log entries.

### Kernel composition

```typescript
import { MiniKernel } from '@omega-v/mini';
const result = new MiniKernel({ rules }).cycle(input);
// result.observation / result.verification / result.memory
```

---

## Step 4: Attest (`+ ATTEST` expansion)

### Purpose
Cryptographically sign the verification result, creating an unforgeable proof.

This step is an **earned expansion**. MINI is complete without it.

### Input
- Verification result from Step 2
- Signing key
- Attestor identity

### Process

#### 3.1 Prepare the Payload

```typescript
const payloadToSign = {
  verificationId: "ver-2026-08-07-5678",
  observationId: "obs-2026-08-07-1234",
  claim: observation.claim,
  verified: true,
  confidence: 0.95,
  ruleVersions: verification.ruleVersions,
  timestamp: "2026-08-07T10:30:01Z",
  verifiedBy: "verification-engine"
};
```

#### 3.2 Compute Signature

```typescript
// Using the signing key (private key held securely)
const signature = cryptography.sign(
  JSON.stringify(payloadToSign),
  signingKey
);

// signature = "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a"
```

#### 3.3 Create the Attestation

```typescript
const attestation = {
  // The signed content
  verificationId: "ver-2026-08-07-5678",
  observationId: "obs-2026-08-07-1234",
  verified: true,
  confidence: 0.95,

  // The signature
  signature: "0x1a2b3c4d5e6f...",
  
  // Signature metadata
  signingKey: "key-2026-08-production-v2",
  keyVersion: "2",
  signingAlgorithm: "ECDSA-SHA256",
  
  // Temporal data
  attestedAt: "2026-08-07T10:30:02Z",
  attestedBy: "attestation-service-1",
  attestedByKeyVersion: "2",
  
  // For auditability
  ruleVersions: verification.ruleVersions,
  
  // For verification
  verifyingPublicKey: publicKey
};
```

#### 3.4 Enable Signature Verification

Anyone can verify the signature:

```typescript
// Given the attestation, can I verify it's authentic?
const isValid = cryptography.verify(
  attestation.signature,
  {
    verificationId: attestation.verificationId,
    verified: attestation.verified,
    // ... other fields
  },
  attestation.verifyingPublicKey
);

console.log(isValid); // true
```

### Output

**Signed Attestation**:
```typescript
{
  id: "att-2026-08-07-9012",
  verificationId: "ver-2026-08-07-5678",
  observationId: "obs-2026-08-07-1234",
  signature: "0x1a2b3c4d5e6f...",
  signingKey: "key-2026-08-production-v2",
  keyVersion: "2",
  attestedAt: "2026-08-07T10:30:02Z",
  attestedBy: "attestation-service-1",
  verified: true,
  confidence: 0.95,
  status: "signed"
}
```

---

## Step 5: Record (durable expansion of Remember)

### Purpose
When multi-process reality demands it, store the complete chain of observation, verification, memory, and attestation beyond in-process Remember.

### Input
- Observation from Step 1
- Verification from Step 2
- Attestation from Step 3

### Process

#### 4.1 Append to Event Store

```typescript
// Event log is append-only
eventStore.append({
  type: "OBSERVATION",
  id: "obs-2026-08-07-1234",
  data: observation,
  timestamp: observation.timestamp
});

eventStore.append({
  type: "VERIFICATION",
  id: "ver-2026-08-07-5678",
  data: verification,
  timestamp: verification.timestamp
});

eventStore.append({
  type: "ATTESTATION",
  id: "att-2026-08-07-9012",
  data: attestation,
  timestamp: attestation.attestedAt
});
```

#### 4.2 Create Indices

```typescript
// Index for fast querying
verificationIndex.add({
  observationId: "obs-2026-08-07-1234",
  verificationId: "ver-2026-08-07-5678",
  attestationId: "att-2026-08-07-9012",
  verified: true,
  timestamp: "2026-08-07T10:30:02Z",
  ruleVersions: verification.ruleVersions
});

// Index by observation source
sourceIndex.add({
  source: "health-check-api",
  observationId: "obs-2026-08-07-1234",
  timestamp: "2026-08-07T10:30:00Z"
});
```

#### 4.3 Enable Temporal Queries

```typescript
// "Was this service healthy at 10:30:00?"
const result = verificationIndex.query({
  timestamp: "2026-08-07T10:30:00Z",
  source: "health-check-api"
});

// Returns: Attestation with proof that it was healthy
```

### Output

**Recorded Event Chain**:
```
Event 1: obs-2026-08-07-1234 (OBSERVATION)
  └─ Event 2: ver-2026-08-07-5678 (VERIFICATION)
      └─ Event 3: att-2026-08-07-9012 (ATTESTATION)

Queryable by:
- Observation ID
- Verification ID
- Attestation ID
- Source
- Timestamp range
- Rule version
```

---

## Step 6: Display

### Purpose
Make verification results visible to users and systems.

### Input
- Recorded events from Step 4

### Channels

#### 5.1 Web Dashboard
```
Timeline View:
┌─────────────────────────────────────┐
│ 10:30:00 | health-check-api        │
│          | Status: ✓ Healthy        │
│          | Confidence: 95%           │
│          | Rule Version: 1.2.0       │
├─────────────────────────────────────┤
│ 10:29:00 | health-check-api        │
│          | Status: ✓ Healthy        │
│          | Confidence: 92%           │
├─────────────────────────────────────┤
│ 10:28:00 | health-check-api        │
│          | Status: ✗ Degraded       │
│          | Confidence: 87%           │
│          | Issue: Response time exceeded
└─────────────────────────────────────┘

Click to expand: See full evidence path
```

#### 5.2 REST API
```bash
GET /verification/ver-2026-08-07-5678

{
  "verificationId": "ver-2026-08-07-5678",
  "verified": true,
  "confidence": 0.95,
  "evidence": [...],
  "attestation": {
    "signature": "0x1a2b3c...",
    "attestedAt": "2026-08-07T10:30:02Z"
  }
}
```

#### 5.3 CLI
```bash
$ omega query att-2026-08-07-9012

Attestation ID: att-2026-08-07-9012
Status:          ✓ Valid
Verified:        true
Confidence:      95%
Rule Versions:   response-time-threshold:1.0.5, status-code:1.2.0
Signed By:       attestation-service-1 (key v2)
Signed At:       2026-08-07 10:30:02

To see full evidence:
  omega show-evidence ver-2026-08-07-5678
```

#### 5.4 Alert Systems
```
If verification fails:
  → Alert to monitoring system
  → Trigger runbook
  → Create incident ticket
  → Notify on-call engineer
  → All with links to evidence
```

### Output

**User-Visible Verification Results** across all channels

---

## Step 7: Learn

### Purpose
Extract patterns from verifications and improve future predictions.

### Process

#### 6.1 Analyze Patterns

```typescript
// Aggregate verification results
const analysis = learningEngine.analyze({
  timeRange: { start: "2026-08-01", end: "2026-08-07" },
  source: "health-check-api",
  rules: ["response-time-threshold"]
});

// Returns patterns:
{
  averageConfidence: 0.94,
  failureRate: 0.03,  // 3% of verifications failed
  commonFailurePatterns: [
    "Response time exceeds threshold between 10:00-11:00 UTC",
    "Failure rate increases after deployment"
  ],
  ruleEffectiveness: 0.97  // How often the rule predicted correctly
}
```

#### 6.2 Identify Rule Improvements

```typescript
// Are our rules too strict? Too loose?
const ruleReview = learningEngine.reviewRule("response-time-threshold", {
  period: "2026-08-01 to 2026-08-07"
});

// Recommendation:
{
  rule: "response-time-threshold",
  currentThreshold: 100,
  suggestedThreshold: 120,
  reasoning: "Threshold too strict; 15% false positives",
  confidence: 0.92,
  impactIfApplied: "Reduce false positives from 15% to 2%"
}
```

#### 6.3 Generate Learning Reports

```typescript
const report = learningEngine.generateReport({
  rules: ["response-time-threshold", "status-code-check"],
  period: "2026-08-01 to 2026-08-07"
});

// Report includes:
// - Accuracy of each rule
// - False positive / false negative rates
// - Recommended thresholds
// - Potential rule interactions
// - Edge cases discovered
```

### Output

**Learning Insights** that feed back into rule evolution

---

## Step 8: Return

### Purpose
Close the loop by using learning to improve observation and verification.

### Process

#### 7.1 Update Rules

```typescript
// Based on learning, propose rule update
const newRule = {
  name: "response-time-threshold",
  version: "1.0.6",  // Previously 1.0.5
  threshold: 120,    // Changed from 100
  previousThreshold: 100,
  reason: "Learning analysis: reduced false positives",
  confidence: 0.92,
  appliedAt: "2026-08-08T00:00:00Z"
};

// Old rule is versioned, new rule becomes default
rulesRegistry.addVersion(newRule);
```

#### 7.2 Adjust Observation Strategy

```typescript
// Update what we observe based on learning
const updatedObservationStrategy = {
  source: "health-check-api",
  frequency: "every 5 minutes",  // Previously every 10 minutes
  metrics: [
    "statusCode",
    "responseTime",
    "memoryUsage",  // New! Learning showed this predicts failures
    "cpuUsage"      // New! Learning showed this predicts failures
  ],
  confidence: 0.94
};

observationConfig.update(updatedObservationStrategy);
```

#### 7.3 Improve Confidence Estimates

```typescript
// As we learn, we refine confidence
const confidenceModel = learningEngine.trainConfidenceModel({
  trainingData: historicalVerifications,
  features: ["responseTime", "statusCode", "memoryUsage"],
  labels: ["verified", "failed"]
});

// Next observations use improved confidence model
observationEngine.setConfidenceModel(confidenceModel);
```

#### 7.4 Return to Step 1

Next observation uses improved rules, strategies, and confidence models:

```typescript
// New observation comes in
observer.observe({
  claim: "Service X returned HTTP 200",
  source: "health-check-api",
  timestamp: "2026-08-08T10:30:00Z",
  metadata: {
    statusCode: 200,
    responseTime: 95,
    memoryUsage: 450,    // ← Newly observed based on learning
    cpuUsage: 35         // ← Newly observed based on learning
  }
});

// Uses updated rules and confidence model → better verification
```

### Output

**Improved System** ready for next cycle

---

## Complete Cycle Summary

```
Observation 1 (Aug 7, 10:30)
  └─ Rule v1.0.5 (threshold: 100)
     └─ Result: Healthy (confidence: 0.95)
        └─ Recorded in event log

Learning (Aug 7, 23:00)
  └─ Analysis: Rule too strict (15% false positives)
     └─ Recommendation: Increase threshold to 120

Evolution (Aug 8, 00:00)
  └─ Rule v1.0.6 published (threshold: 120)
     └─ Observation strategy updated (add memory/CPU metrics)

Observation 2 (Aug 8, 10:30)
  └─ Rule v1.0.6 (threshold: 120)
     └─ Additional metrics (memory, CPU)
        └─ Result: Healthy (confidence: 0.96)
           └─ Recorded in event log
              └─ Better prediction because of learning
```

---

## Practical Example: End-to-End

### Scenario
A health check API reports a service status.

### Complete Loop

**Step 1: Observe**
```
claim: "HTTP 200 from service X"
timestamp: 10:30:00
confidence: 0.95 (3 consecutive checks)
```

**Step 2: Verify**
```
Apply rule "response-time-threshold" v1.0.5
  Condition: responseTime < 100ms
  Value: 45ms
  Result: PASS ✓

Apply rule "status-code-check" v1.2.0
  Condition: statusCode == 200
  Value: 200
  Result: PASS ✓

Overall: PASS (confidence 0.95)
```

**Step 3: Attest**
```
Sign the verification result
signature: 0x1a2b3c...
signingKey: key-2026-08-production-v2
timestamp: 10:30:02
```

**Step 4: Record**
```
Append to event log:
  - Observation
  - Verification
  - Attestation
Index for fast queries
```

**Step 5: Display**
```
Dashboard shows:
  ✓ Healthy (confidence 95%)
  Signed at 10:30:02
  Click to see evidence
```

**Step 6: Learn**
```
Over 7 days:
  - 240 verifications
  - 228 passed, 12 failed
  - Success rate: 95%
  - Rule effectiveness: 97%
  - No recommended changes
```

**Step 7: Return**
```
Rules remain at v1.0.5
Next observation will use same strategy
System has proven stable
```

---

## Key Principles

### 1. Every Step Produces Evidence
- Observation includes metadata
- Verification shows reasoning
- Attestation proves authenticity
- Recording makes it queryable
- Learning extracts wisdom

### 2. No Step Is Final
- Observations can be revised
- Verifications can be re-run with new rules
- Attestations can be audited
- Records are immutable but queryable
- Learning improves future cycles

### 3. The Loop Is Complete
- Every output becomes input to later steps
- Learning closes the circle
- The system verifies itself

---

## References

- [MANIFEST.md](../MANIFEST.md) — Principles and invariants
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System components
- [CONTRIBUTING.md](../CONTRIBUTING.md) — How to implement this

---

**Last Updated**: 2026-08-14  
**Status**: MINI is the heart; expanded steps are earned wrappers
