# Packages

Shared libraries for the Ω∞v growth spine:

```text
0 → MINI (👁 → ✓ → 🧠) → earned +expansions → continuum subsystems
```

## MINI kernel

```text
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

```
packages/
├── types/              # Shared contracts
├── observer/           # 👁 Capture and normalize observations
├── verification/       # ✓ Apply rules and generate evidence
├── remember/           # 🧠 Append-only hash-chained memory
└── mini/               # 💧 Compose one living cycle
```

| Package                 | Role                         |
| ----------------------- | ---------------------------- |
| `@omega-v/types`        | Zero-dependency shared types |
| `@omega-v/observer`     | Step 1 — observe             |
| `@omega-v/verification` | Step 2 — verify              |
| `@omega-v/remember`     | Step 3 — remember            |
| `@omega-v/mini`         | Kernel composition           |

### Quick start (MINI only)

```typescript
import { MiniKernel } from '@omega-v/mini';

const mini = new MiniKernel({ rules: [/* VerificationRule */] });
const { observation, verification, memory } = mini.cycle({
  claim: 'Service healthy',
  category: 'health-check',
  source: { system: 'api', version: '1.0.0', environment: 'test' },
  observedBy: 'dev',
  metadata: { statusCode: 200, responseTime: 40 },
  confidence: 0.95,
  confidenceReason: 'checks passed',
});
```

## Earned expansions

These packages expand MINI when earned:

```
packages/
├── attestation/        # + ATTEST — cryptographic signing
├── dissensus/          # + DISSENT — reconcile plural verifiers
├── lexicon/            # + LEGIBILITY — verdicts in Naijá and English
├── sdk/                # + SDK — typed client
├── cli/                # + CLI — operator commands
├── coordination/       # + COORDINATION — bounded coordination contracts
└── runtime/            # + RUNTIME — bounded agent execution loop
```

| Package                 | Expansion                                       |
| ----------------------- | ----------------------------------------------- |
| `@omega-v/attestation`  | `+ ATTEST` — signatures others can check        |
| `@omega-v/dissensus`    | `+ DISSENT` — disagreement preserved            |
| `@omega-v/lexicon`      | `+ LEGIBILITY` — verdicts in Naijá and English  |
| `@omega-v/sdk`          | `+ SDK` — typed access                          |
| `@omega-v/cli`          | `+ CLI` — operator surface                      |
| `@omega-v/coordination` | `+ COORDINATION` — bounded workers and builders |
| `@omega-v/runtime`      | `+ RUNTIME` — bounded agent loop and memory     |

Apps (`apps/api`, `apps/web`) are interface expansions (`+ API`, `+ Web`).

## Continuum Subsystems

Extended subsystem modules for the Ω∞v Oceanicos ecosystem:

| Package | Description |
| --- | --- |
| `@omega-v/agents` | Formless Agent Swarm Engine |
| `@omega-v/amm` | Automated Market Maker & Liquidity Engine |
| `@omega-v/analytics` | Verification Analytics Engine |
| `@omega-v/attestor` | Distributed Attestor Network |
| `@omega-v/auth` | Zero-Trust Authentication Engine |
| `@omega-v/benchmark` | Verification Benchmark Engine |
| `@omega-v/bridge` | Cross-Chain Verification Bridge |
| `@omega-v/compiler` | Rule & Contract Compiler Engine |
| `@omega-v/consensus` | Plural Consensus Engine |
| `@omega-v/contract` | Formal Verification Contract Engine |
| `@omega-v/da` | Data Availability Verification Engine |
| `@omega-v/dht` | Distributed Hash Table Network |
| `@omega-v/dispute` | Dispute Resolution Engine |
| `@omega-v/edge` | Edge Observation Engine |
| `@omega-v/enclave` | Confidential Computing Enclave Engine |
| `@omega-v/evidence` | Evidence Graph Engine |
| `@omega-v/evm` | EVM Verification Execution Engine |
| `@omega-v/evolution` | Evolutionary Architecture Engine |
| `@omega-v/federation` | Federation Mesh Engine |
| `@omega-v/friction` | Friction Quantification Engine |
| `@omega-v/gateway` | API Gateway Engine |
| `@omega-v/governance` | Autonomous Governance Engine |
| `@omega-v/governor` | Protocol Governor Engine |
| `@omega-v/graph` | Provenance Knowledge Graph Engine |
| `@omega-v/green` | Ecological Optimization Engine |
| `@omega-v/human` | Human-in-the-Loop Verification Engine |
| `@omega-v/intent` | Intent Resolution Engine |
| `@omega-v/ir` | Intermediate Representation Engine |
| `@omega-v/kernel` | Core State Kernel Engine |
| `@omega-v/learning` | Adaptive Learning Engine |
| `@omega-v/mempool` | Transaction Mempool Engine |
| `@omega-v/mesh` | Service Mesh Engine |
| `@omega-v/mood` | Collective Mood Engine |
| `@omega-v/notary` | Notary Verification Engine |
| `@omega-v/oracle` | Trusted Oracle Engine |
| `@omega-v/orchestrator` | Pipeline Orchestrator Engine |
| `@omega-v/pipeline` | Verification Pipeline Engine |
| `@omega-v/policy` | Policy Evaluation Engine |
| `@omega-v/registry` | Component Registry Engine |
| `@omega-v/relay` | Cross-Chain Relay Engine |
| `@omega-v/replay` | Deterministic Replay Engine |
| `@omega-v/reputation` | Reputation Scoring Engine |
| `@omega-v/rollup` | Rollup Verification Engine |
| `@omega-v/sandbox` | Isolated Sandbox Execution Engine |
| `@omega-v/scheduler` | Verification Task Scheduler |
| `@omega-v/security` | Autonomous Security Engine |
| `@omega-v/sequencer` | Transaction Sequencer Engine |
| `@omega-v/sharding` | State Sharding Engine |
| `@omega-v/staking` | Proof-of-Stake Verification Engine |
| `@omega-v/store` | Durable Provenance Store |
| `@omega-v/telemetry` | Telemetry & Observability Engine |
| `@omega-v/vaas` | Verification-as-a-Service Gateway |
| `@omega-v/vault` | Cryptographic State Vault |
| `@omega-v/webhook` | Webhook Event Notification Engine |
| `@omega-v/worker` | Background Task Worker Engine |
| `@omega-v/zk` | Zero-Knowledge Proof Engine |

## Installation

### From monorepo

```bash
pnpm install
pnpm --filter @omega-v/mini build
pnpm test -- packages/mini packages/remember
```

### Mental model

1. Prefer `@omega-v/mini` for the default runtime unit
2. Use observer / verification / remember directly when testing a single leg
3. Reach for attestation/API/web only when the expansion is intentionally in scope

## Testing

Each MINI package includes unit tests. Kernel tests live in `packages/mini`.

Coverage thresholds are enforced globally via root Jest config.

## Versioning

Semantic versioning. Current: **0.1.0** (MINI establishing).

---

**Status:** MINI kernel establishing  
**Last Updated:** 2026-08-14  
**See also:** [docs/MINI.md](../docs/MINI.md)
