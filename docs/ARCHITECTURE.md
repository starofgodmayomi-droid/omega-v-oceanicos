# Architecture

The Ω∞v Oceanicos system is designed around a single principle: **every component should strengthen the verification loop**.

---

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  User Interfaces (Web Dashboard, Mobile, CLI)              │
│  Entry points for observation and result visualization     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  APIs & SDKs (REST, gRPC, JavaScript, Python, etc.)       │
│  Public contracts for interaction                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Verification Engine                                        │
│  ├─ Observer: Captures events and claims                   │
│  ├─ Verification Rules: Apply logic to observations        │
│  ├─ Attestation: Cryptographically sign results            │
│  └─ Evidence Path: Track proof of verification             │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Compiler & Intermediate Representation (IR)               │
│  ├─ Rule Language Parser                                   │
│  ├─ Bytecode Generator                                     │
│  └─ Runtime Bytecode Interpreter                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Persistence Layer                                          │
│  ├─ Event Store (Append-only observation log)              │
│  ├─ Verification Index (Query verification results)        │
│  ├─ Attestation Store (Signatures and proofs)              │
│  └─ Rules Registry (Versioned verification rules)          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Infrastructure                                             │
│  ├─ Docker: Containerized services                         │
│  ├─ Kubernetes: Distributed orchestration                  │
│  ├─ Edge: Lightweight verification at network edge         │
│  └─ Cloud: Serverless verification services               │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Observer

**Purpose**: Capture observations (events, claims, states) and normalize them.

**Responsibilities**:

- Accept observations from any source (API, CLI, SDK, real-time events)
- Validate observation schema (who, when, what, where, confidence)
- Deduplicate similar observations
- Create normalized event stream

**Example**:

```typescript
observer.observe({
  claim: "Service X is healthy",
  source: "health-check-api",
  timestamp: 2026-08-07T10:30:00Z,
  metadata: {
    responseTime: 45,
    statusCode: 200,
    version: "1.2.3"
  },
  confidence: 0.95
});
```

**Output**: Standardized Event object, ready for verification.

---

### 2. Verification Engine

**Purpose**: Apply verification rules to observations and produce evidence.

**Responsibilities**:

- Load and manage versioned verification rules
- Execute rules against observations
- Produce evidence paths (not just true/false)
- Handle rule errors gracefully
- Support multiple verification strategies (deterministic, probabilistic, consensus)

**Example**:

```typescript
verification.verify(event, {
  rules: ['health-check', 'response-time-threshold'],
  ruleVersion: '1.2.0',
});

// Returns:
// {
//   success: true,
//   evidence: [
//     { rule: "health-check", passed: true, details: {...} },
//     { rule: "response-time-threshold", passed: true, details: {...} }
//   ],
//   confidence: 0.95,
//   ruleVersion: "1.2.0"
// }
```

**Output**: Verification result with evidence path.

---

### 3. Attestation Service

**Purpose**: Cryptographically sign verification results and create unforgeable proof.

**Responsibilities**:

- Generate or load signing keys
- Sign verification results with timestamp
- Include attestation metadata (key ID, rule version, signer identity)
- Support key rotation
- Enable signature verification

**Example**:

```typescript
const attestation = await attestation.attest(verificationResult);

// Returns:
// {
//   verificationId: "v-2026-08-07-1234",
//   signature: "0x1a2b3c...",
//   signingKey: "key-v2",
//   timestamp: 2026-08-07T10:30:05Z,
//   ruleVersion: "1.2.0",
//   signer: "api-server-1"
// }
```

**Output**: Signed attestation object.

---

### 4. Compiler & IR

**Purpose**: Transform high-level rule definitions into portable bytecode.

**Responsibilities**:

- Parse rule language (domain-specific language, DSL)
- Generate bytecode (Oceanicum Intermediate Representation)
- Validate rule syntax and semantics
- Support rule versioning
- Enable portable execution across platforms

**Example**:

```
Rule Language:
┌─────────────────────────┐
│ when response_time < 100 │
│ and status_code == 200   │
│ then is_healthy          │
└─────────────────────────┘
              ↓
         Compiler
              ↓
      Bytecode (IR)
┌─────────────────────────┐
│ LOAD response_time       │
│ CONST 100               │
│ LT                      │
│ LOAD status_code        │
│ CONST 200               │
│ EQ                      │
│ AND                     │
│ STORE is_healthy        │
└─────────────────────────┘
```

**Output**: Portable bytecode that can run anywhere.

---

### 5. Persistence Layer

**Purpose**: Store observations, verifications, and attestations immutably.

**Responsibilities**:

- Maintain append-only event log
- Index verification results for querying
- Store signed attestations
- Manage rule versioning
- Support temporal queries (what was true at time T?)

**Storage Model**:

```
Event Store:
  ID | Timestamp | Type | Observation | Source | Confidence
  1  | 10:30:00  | CLAIM | "Health OK" | API    | 0.95
  2  | 10:30:05  | CLAIM | "Health OK" | API    | 0.96
  ...

Verification Index:
  Event ID | Rule | Version | Result | Confidence | Timestamp
  1        | health-check | 1.2.0 | true | 0.95 | 10:30:01
  2        | health-check | 1.2.0 | true | 0.96 | 10:30:06
  ...

Attestation Store:
  Verification ID | Signature | Key ID | Timestamp | Signer
  v-1             | 0x1a2b... | key-v2 | 10:30:01  | server-1
  v-2             | 0x3c4d... | key-v2 | 10:30:06  | server-1
  ...
```

**Output**: Queryable, immutable history.

---

## Data Flow

### The Verification Loop

```
1. OBSERVE
   ┌──────────────────────┐
   │ Event from any source│
   └──────────────────────┘
            ↓
2. NORMALIZE
   ┌──────────────────────┐
   │ Add metadata, schema │
   └──────────────────────┘
            ↓
3. VERIFY
   ┌──────────────────────┐
   │ Apply rules, produce │
   │ evidence path        │
   └──────────────────────┘
            ↓
4. ATTEST
   ┌──────────────────────┐
   │ Cryptographic sign   │
   │ the verification     │
   └──────────────────────┘
            ↓
5. RECORD
   ┌──────────────────────┐
   │ Append to event log  │
   │ Index for queries    │
   └──────────────────────┘
            ↓
6. DISPLAY
   ┌──────────────────────┐
   │ Show to users via UI,│
   │ API, or CLI          │
   └──────────────────────┘
            ↓
7. LEARN
   ┌──────────────────────┐
   │ Extract patterns,    │
   │ improve rules        │
   └──────────────────────┘
            ↓
8. RETURN
   ┌──────────────────────┐
   │ Feed learning back   │
   │ into observation     │
   └──────────────────────┘
```

---

## Interface Boundaries

### Public APIs

#### REST API

- `POST /observe` — Submit an observation
- `POST /verify` — Verify an observation
- `GET /verification/:id` — Retrieve verification result
- `GET /attestations` — Query attestations
- `GET /rules` — List available rules

#### SDK

- `observer.observe(claim)` — Programmatic observation
- `verification.verify(claim, rules)` — Programmatic verification
- `attestation.attest(result)` — Programmatic attestation
- `store.query(filter)` — Query the event store

#### CLI

```bash
omega observe "claim" --source api --confidence 0.95
omega verify claim-id --rules health-check
omega attest verification-id
omega query attestations --since 2026-08-07
```

---

## Concurrency & Distribution

### Single Instance

- Event loop processes observations sequentially
- In-memory verification results are cached
- Append-only writes ensure consistency

### Multiple Instances

- Events are propagated through event broker (Kafka, RabbitMQ)
- Verification results are consensus-based when needed
- Attestations are anchored to a single authority (or distributed consensus)
- Database is distributed (PostgreSQL replication, or distributed store)

### Edge Deployment

- Lightweight verifier runs at the edge
- Observations are submitted to central system
- Attestations are signed by the edge node
- Periodic sync with central authority

---

## Error Handling

### Observation Errors

- Invalid schema → Reject with clear error message
- Unknown source → Accept but flag for review
- Duplicate observation → Deduplicate (same event, different times)

### Verification Errors

- Rule not found → Fail gracefully, return error
- Rule execution exception → Catch and record as failed verification
- Timeout → Record timeout as verification failure

### Attestation Errors

- Key unavailable → Fail attestation (don't sign without authority)
- Clock skew → Use server time, not client time
- Signature failure → Log and alert (security issue)

### Storage Errors

- Write failure → Return error, don't acknowledge completion
- Read failure → Return stale cached result, log issue
- Replication lag → Return with freshness timestamp

---

## Security Considerations

### Key Management

- Keys are never transmitted in observation or verification
- Keys are stored encrypted at rest
- Key rotation is tracked (which key created which attestation?)
- Private keys never leave their secure location

### Attestation Trust

- Attestations are signed with private key
- Verifiers use public key to check signatures
- Compromise of one key → revoke and re-sign (but history remains)

### Audit Trail

- All operations are logged
- Logs are stored separately from database
- Logs are immutable (append-only)
- Access to logs is audited

---

## Performance Characteristics

### Observation

- **Latency**: < 10ms (in-memory)
- **Throughput**: 10,000+ observations/second (single instance)

### Verification

- **Latency**: < 100ms (typical rule execution)
- **Cache hit rate**: 80%+ (same rule on similar observations)

### Attestation

- **Latency**: < 50ms (signature generation)
- **Throughput**: 1,000+ attestations/second (single instance)

### Storage Query

- **Latency**: < 100ms (indexed query)
- **Memory**: O(1) per query (streaming results)

### Scalability

- **Horizontal**: Add more instances, shard by observation source
- **Vertical**: Add CPU, RAM for verification caching
- **Temporal**: Archive old data, keep recent in hot storage

---

## Testing Strategy

### Unit Tests

- Each component is tested independently
- Mock external dependencies
- Tests verify behavior and correctness

### Integration Tests

- Full loop: Observation → Verification → Attestation → Storage → Query
- Uses real database and storage
- Tests interaction between components

### Property-Based Tests

- Invariants: "Every attestation has a signature"
- Determinism: "Same observation + same rule = same result"
- Causality: "Verification happens after observation"

### Performance Tests

- Latency: Verify all operations meet SLAs
- Throughput: Verify system handles expected load
- Memory: Verify no memory leaks

---

## Deployment Modes

### Development

- Single container
- SQLite database
- File-based event log
- In-memory attestation signing

### Production

- Docker Compose or Kubernetes
- PostgreSQL with replication
- Message broker for events
- HSM (Hardware Security Module) for keys

### Edge

- Lightweight container
- Local SQLite cache
- HTTP/gRPC to central system
- Local signing keys (rotated frequently)

---

---

## 🏛️ 61-Pillar Full-Stack Architecture Matrix

The system spans 61 modular packages organized into a cohesive, verification-first continuum:

1. **Foundational Verification & Proofs (Pillars I–VIII)**: `@omega-v/verification`, `@omega-v/attestation`, `@omega-v/store`, `@omega-v/observer`, `@omega-v/evidence`, `@omega-v/telemetry`, `@omega-v/mood`, `@omega-v/friction`.
2. **Governance, Analytics & Federation (Pillars IX–XVI)**: `@omega-v/green`, `@omega-v/governance`, `@omega-v/learning`, `@omega-v/analytics`, `@omega-v/scheduler`, `@omega-v/vaas`, `@omega-v/federation`, `@omega-v/replay`.
3. **Smart Contracts, Security & Zero-Knowledge (Pillars XVII–XXIV)**: `@omega-v/contract`, `@omega-v/auth`, `@omega-v/benchmark`, `@omega-v/notary`, `@omega-v/sandbox`, `@omega-v/policy`, `@omega-v/zk`, `@omega-v/gateway`.
4. **Execution Pools, TEE & P2P Consensus (Pillars XXV–XXXII)**: `@omega-v/worker`, `@omega-v/pipeline`, `@omega-v/registry`, `@omega-v/enclave`, `@omega-v/consensus`, `@omega-v/mesh`, `@omega-v/sharding`, `@omega-v/bridge`.
5. **Sequencing, DA & Layer-2 Scaling (Pillars XXXIII–XL)**: `@omega-v/sequencer`, `@omega-v/da`, `@omega-v/rollup`, `@omega-v/intent`, `@omega-v/orchestrator`, `@omega-v/dht`, `@omega-v/staking`, `@omega-v/kernel`.
6. **Mempool, Relay, EVM, AMM & Reputation (Pillars XLI–XLVIII)**: `@omega-v/mempool`, `@omega-v/attestor`, `@omega-v/governor`, `@omega-v/relay`, `@omega-v/evm`, `@omega-v/amm`, `@omega-v/reputation`, `@omega-v/human`.
7. **Oracles, Lineage, Compiler & Developer Interfaces (Pillars XLIX–LXI)**: `@omega-v/oracle`, `@omega-v/webhook`, `@omega-v/vault`, `@omega-v/dispute`, `@omega-v/graph`, `@omega-v/security`, `@omega-v/evolution`, `@omega-v/compiler`, `@omega-v/ir`, `@omega-v/agents`, `@omega-v/edge`, `@omega-v/cli`, `@omega-v/sdk`.

---

## 🌊 Unified 8-Stage Canonical Execution Pipeline

```text
INTENT (RuleCompiler & Oceanicum IR)
  ↓
OBSERVE (Observer Signal Normalization)
  ↓
VERIFY (VerificationEngine Invariant Check)
  ↓
ATTEST (AttestationService Cryptographic Signatures)
  ↓
KERNEL STATE (OceanicosKernel Canonical S_n → S_{n+1} Transition)
  ↓
REPUTATION (OceanicosReputationEngine Weighted Feedback Update)
  ↓
PROVENANCE (ProvenanceStore Hash-Chained Audit Ledger & Graph)
  ↓
RECOMPILE (Continuous Ecosystem Evolution Loop ↺∞)
```

---

## References

- [MANIFEST.md](../MANIFEST.md) — System principles and invariants
- [CHARTER.md](../CHARTER.md) — How we make architectural decisions
- [VERIFICATION_LOOP.md](./VERIFICATION_LOOP.md) — Detailed algorithm walkthrough

---

**Last Updated**: 2026-09-01  
**Status**: Living — 61 Pillars Fully Implemented and Verified

