# Architecture

The Ω∞v Oceanicos system is designed around a single principle: **every component should strengthen the verification loop**.

Architecture does **not** begin as a giant ecosystem. It begins at **ZERO**, becomes a **MINI** kernel, and expands only when reality verifies the next step.

See [MINI.md](./MINI.md) for the canonical growth model.

---

## Growth spine

```text
0 → MINI (👁 → ✓ → 🧠) → earned +layers → FULL STACK → ECOSYSTEM → 🌎 ↺ ∞
```

### Zero

No assumed ecosystem, capital, architecture, or unverified trust.

### MINI kernel (current foundation)

```text
💧 Ω∞v MINI ::= 👁 OBSERVE → ✓ VERIFY → 🧠 REMEMBER
```

| Layer       | Package                 | Role                                 |
| ----------- | ----------------------- | ------------------------------------ |
| 👁 Observe   | `@omega-v/observer`     | Capture events and claims; normalize |
| ✓ Verify    | `@omega-v/verification` | Apply rules; produce evidence paths  |
| 🧠 Remember | `@omega-v/remember`     | Append-only hash-chained memory      |
| 💧 Compose  | `@omega-v/mini`         | One living cycle over the three      |

Shared contracts live in `@omega-v/types`.

### Earned expansions (not the kernel)

Each `+` is optional until the previous layer is real:

```text
+ Reason · + Intent · + Build · + Test · + Attest · + Act
+ API · + CLI · + SDK · + Web · + Mobile
+ AI · + Agents · + Data · + Infrastructure
+ Security · + Governance · + Community
+ Stewardship · + Economy · + Evolution
```

Present in repo today as expansion surfaces (not MINI prerequisites):

- `@omega-v/attestation` — `+ ATTEST`
- `apps/api` — `+ API`
- `apps/web` — `+ Web`

---

## System layers (expanded view)

The diagram below is the **target composition** after earned expansion — not the starting assumption.

```
┌─────────────────────────────────────────────────────────────┐
│  User Interfaces (Web Dashboard, Mobile, CLI)              │  ← earned +
│  Entry points for observation and result visualization     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  APIs & SDKs (REST, gRPC, JavaScript, Python, etc.)       │  ← earned +
│  Public contracts for interaction                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Expansion: Attestation                                      │  ← earned +
│  Cryptographically sign remembered verification results     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  💧 MINI KERNEL                                              │  ← foundation
│  ├─ 👁 Observer: Captures events and claims                 │
│  ├─ ✓ Verification: Apply logic; produce evidence           │
│  └─ 🧠 Remember: Append-only verified memory                │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Compiler & Intermediate Representation (IR)               │  ← later +
│  ├─ Rule Language Parser                                   │
│  ├─ Bytecode Generator                                     │
│  └─ Runtime Bytecode Interpreter                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Persistence Layer (beyond in-process Remember)             │  ← later +
│  ├─ Durable event store                                     │
│  ├─ Verification index                                      │
│  └─ Attestation store                                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│  Infrastructure                                             │  ← later +
│  ├─ Docker · Kubernetes · Edge · Cloud                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Core components

### 1. Observer (👁 MINI)

**Purpose**: Capture observations (events, claims, states) and normalize them.

**Responsibilities**:

- Accept observations from any source
- Validate observation schema (who, when, what, confidence)
- Deduplicate similar observations
- Create normalized event stream

**Example**:

```typescript
observer.observe({
  claim: 'Service X is healthy',
  source: {
    system: 'health-check-api',
    version: '1.2.3',
    environment: 'production',
  },
  observedBy: 'monitor',
  metadata: {
    responseTime: 45,
    statusCode: 200,
  },
  confidence: 0.95,
  confidenceReason: 'consecutive successful checks',
});
```

**Output**: Standardized `Observation`, ready for verification.

---

### 2. Verification Engine (✓ MINI)

**Purpose**: Apply verification rules to observations and produce evidence.

**Responsibilities**:

- Load and manage versioned verification rules
- Execute rules against observations
- Produce evidence paths (not just true/false)
- Handle rule errors gracefully

**Output**: `VerificationResult` with evidence path.

---

### 3. Remember (🧠 MINI)

**Purpose**: Persist verified experience in an append-only, hash-chained log.

**Responsibilities**:

- Store observation + verification as durable memory
- Maintain integrity via chained hashes
- Support recall and query without a database assumption
- Record failures with the same rigor as successes

**Output**: `MemoryRecord` + `EventLogEntry[]`.

---

### 4. MiniKernel (💧 compose)

**Purpose**: Run one living cycle without requiring API, UI, or cloud.

```typescript
import { MiniKernel } from '@omega-v/mini';

const mini = new MiniKernel({ rules: [...] });
const { observation, verification, memory } = mini.cycle(input);
```

---

### 5. Attestation Service (`+ ATTEST`)

**Purpose**: Cryptographically sign verification results after MINI memory exists.

**Status**: Expansion package. Useful and present, but not part of the MINI definition.

**Output**: Signed `Attestation`.

---

### 6. Compiler & IR (later `+`)

**Purpose**: Transform high-level rule definitions into portable bytecode.

Not required for MINI. Simple in-process rules are enough for the kernel.

---

### 7. Persistence beyond Remember (later `+`)

**Purpose**: Durable, multi-process stores (PostgreSQL, object storage, brokers).

MINI Remember is in-process and honest about that boundary. External persistence is earned when multi-instance reality demands it.

---

## Data flow

### MINI cycle (foundation)

```
1. OBSERVE   → normalize claim
2. VERIFY    → evidence path
3. REMEMBER  → append-only memory
```

### Expanded loop (after earned layers)

```
Observe → Verify → Remember → Attest → Display → Learn → Return
```

The expanded loop never replaces MINI; it wraps it.

---

## Interface boundaries

### MINI (always available)

```typescript
mini.cycle(input);
mini.registerRule(rule);
mini.verifyMemoryIntegrity();
```

### Expansion APIs (when earned)

#### REST API

- `POST /observe` — Submit an observation
- `POST /verify` — Verify an observation
- `GET /verification/:id` — Retrieve verification result
- `GET /attestations` — Query attestations
- `GET /rules` — List available rules

#### CLI (planned expansion)

```bash
omega observe "claim" --source api --confidence 0.95
omega verify claim-id --rules health-check
omega remember verification-id
```

---

## Concurrency & distribution

### MINI (single process)

- Sequential cycle execution
- In-process append-only memory
- Hash-chain integrity checks

### Expanded deployments

- Multiple instances, brokers, and distributed stores are later `+` layers
- Edge and cloud modes must still speak MINI types

---

## Error handling

### Observation errors

- Invalid schema → Reject with clear error message
- Duplicate observation → Deduplicate within window

### Verification errors

- Rule not found / no rules → Result still produced; may pass with zero rules or fail closed by policy
- Rule execution exception → Record as failed verification evidence

### Memory errors

- Integrity failure → Surface immediately; do not silently repair history
- Write failure (future durable backends) → Do not acknowledge completion

### Attestation errors (expansion)

- Key unavailable → Fail attestation
- Signature failure → Log and alert

---

## Security considerations

### MINI

- Memory is hash-chained; tampering is detectable via `verifyIntegrity()`
- No private keys required for the kernel itself

### Expansion (attestation / infra)

- Keys never travel inside observations
- Keys encrypted at rest; rotation tracked
- Private keys never leave secure location

---

## Performance characteristics

### MINI targets (single process)

- **Observe**: sub-10ms typical
- **Verify**: sub-100ms typical for simple rules
- **Remember**: append O(1); integrity check O(n)

Expansion layers publish their own SLOs when earned.

---

## Testing strategy

### Unit tests

- Each MINI package tested independently
- Integrity and failure-memory cases required for Remember

### Kernel tests

- Full MINI cycle: Observe → Verify → Remember
- Failed verification still remembered

### Expansion tests

- Attestation, API, Web only after their packages claim readiness
- Integration tests verify expansions compose with MINI without forking types

---

## Deployment modes

### MINI / Development

- In-process kernel
- No external services required
- `MiniKernel` runnable from tests or a thin script

### Expanded production (later)

- API + Web + durable store + key management
- Only after MINI behavior is proven under real use

---

## References

- [MINI.md](./MINI.md) — Zero → MINI → expansion
- [MANIFEST.md](../MANIFEST.md) — System principles and invariants
- [CHARTER.md](../CHARTER.md) — How we make architectural decisions
- [VERIFICATION_LOOP.md](./VERIFICATION_LOOP.md) — Detailed workflow including post-MINI steps
- [ROADMAP.md](./ROADMAP.md) — Earned expansion phases

---

**Last Updated**: 2026-08-14  
**Status**: Living — kernel-first; expands with evidence
