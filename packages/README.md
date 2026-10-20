# Shared packages

This monorepo contains a small verification spine and a wider set of domain-oriented modules. Use this index to navigate; package READMEs link to source, tests, and available scripts. A declared package is not automatically a production-ready or externally connected service.

## Core verification and stewardship spine

These packages most directly express the evidence-first operating model.

| Package | Responsibility |
|---|---|
| [`@oceanicos/mini`](mini/README.md) | Shared ecosystem package |
| [`@oceanicos/types`](types/README.md) | Shared ecosystem package |
| [`@oceanicos/observer`](observer/README.md) | Shared ecosystem package |
| [`@oceanicos/verification`](verification/README.md) | Shared ecosystem package |
| [`@oceanicos/remember`](remember/README.md) | Shared ecosystem package |
| [`@oceanicos/attestation`](attestation/README.md) | Cryptographic attestation service for Ω∞v Oceanicos |
| [`@omega-v/evidence`](evidence/README.md) | Ω∞v Evidence Artifact Engine (Section XXIV) |
| [`@omega-v/graph`](graph/README.md) | Provenance Knowledge Graph & Lineage Traversal Engine for Ω∞v Oceanicos (Section XIV) |
| [`@omega-v/policy`](policy/README.md) | Dynamic Declarative Compliance, Policy Bundles & Cryptographic Compliance Receipts for Ω∞v Oceanicos |
| [`@omega-v/security`](security/README.md) | Verifiable Identity, Authorization & Security Policy Engine for Ω∞v Oceanicos (Sections XVIII & XIX) |
| [`@omega-v/dissensus`](dissensus/README.md) | Reconciliation of plural verifier opinions for Ω∞v Oceanicos |
| [`@omega-v/lexicon`](lexicon/README.md) | Verdict states in the languages their readers speak, for Ω∞v Oceanicos |
| [`@omega-v/oreade`](oreade/README.md) | Bounded ƆREADE symbolic translation for Ω∞v Oceanicos Drops |
| [`@omega-v/mood`](mood/README.md) | System Mood Evaluator for Ω∞v Oceanicos (Pillar 19) |
| [`@omega-v/coordination`](coordination/README.md) | Bounded, auditable parallel workers and builders for Ω∞v Oceanicos |
| [`@omega-v/runtime`](runtime/README.md) | Bounded low-overhead agent loops and memory fabric for Ω∞v Oceanicos |
| [`@omega-v/worker`](worker/README.md) | Bounded worker pool for Ω∞v Oceanicos — leases, local HMAC observation receipts, fail-closed authority |

## Operator and integration surfaces

| Package | Responsibility |
|---|---|
| [`@omega-v/cli`](cli/README.md) | Command line tool for Ω∞v Oceanicos verification loop |
| [`@omega-v/sdk`](sdk/README.md) | Programmatic Client SDK for Ω∞v Oceanicos |

## Domain and expansion modules

The following package descriptions record declared design scope. Check each package's current source and tests before treating the named capability as complete.

| Package | Declared scope |
|---|---|
| [`@omega-v/agents`](agents/README.md) | Formless Agent Swarm for Ω∞v Oceanicos |
| [`@omega-v/amm`](amm/README.md) | Verifiable Automated Market Maker (AMM), Constant Product Invariant, Concentrated Liquidity & Swap Proofs for Ω∞v Oceanicos |
| [`@omega-v/analytics`](analytics/README.md) | Verification analytics, efficacy scoring, and pattern extraction for Ω∞v Oceanicos |
| [`@omega-v/attestor`](attestor/README.md) | Decentralized Threshold Multi-Signature Attestation Network & Quorum Certificates for Ω∞v Oceanicos |
| [`@omega-v/auth`](auth/README.md) | Decentralized Identity (DID), Capability-Based Access Control, and Proof-of-Authority Auth Engine for Ω∞v Oceanicos |
| [`@omega-v/benchmark`](benchmark/README.md) | Verifier Performance, Latency Quantile (P50/P90/P99), and Throughput Stress Profiling Engine for Ω∞v Oceanicos |
| [`@omega-v/bridge`](bridge/README.md) | Cross-Chain Cryptographic State Proofs, Light Client Verification, Merkle Mountain Range (MMR) & Relayer Attestations for Ω∞v Oceanicos |
| [`@omega-v/compiler`](compiler/README.md) | Rule DSL compiler to Oceanicum IR bytecode for Ω∞v Oceanicos |
| [`@omega-v/consensus`](consensus/README.md) | Byzantine Fault Tolerant (BFT) State Machine Replication & Proof-of-Attestation Consensus Engine for Ω∞v Oceanicos — Quorum Certificates, Block Finality, Slashing |
| [`@omega-v/contract`](contract/README.md) | Formal Schema & Behavioral Contract Verification Engine for Ω∞v Oceanicos |
| [`@omega-v/da`](da/README.md) | Data Availability Sampling, Reed-Solomon Erasure Coding, Blob Storage & KZG Commitment Proofs for Ω∞v Oceanicos |
| [`@omega-v/dht`](dht/README.md) | Distributed Hash Table, Kademlia-Style Content-Addressable Routing for Ω∞v Oceanicos |
| [`@omega-v/dispute`](dispute/README.md) | Verifiable Decentralized Dispute Resolution, Evidence Submissions & Arbitration Jury Engine for Ω∞v Oceanicos |
| [`@omega-v/edge`](edge/README.md) | Edge observation buffering, offline-first Merkle batching, and sync for Ω∞v Oceanicos |
| [`@omega-v/enclave`](enclave/README.md) | Hardware TEE Confidential Computing & Remote Attestation Engine for Ω∞v Oceanicos — MRENCLAVE Proofs, Sealed State, Hardware Nonces |
| [`@omega-v/evm`](evm/README.md) | Verifiable Oceanic Virtual Machine (OVM), Stack Execution, Gas Metering & State Trie Commitments for Ω∞v Oceanicos |
| [`@omega-v/evolution`](evolution/README.md) | Controlled Rule Recompilation & Drift Detection Engine for Ω∞v Oceanicos (Section XXVII) |
| [`@omega-v/federation`](federation/README.md) | Cross-Mesh Inter-Cluster Verification Federation Protocol for Ω∞v Oceanicos |
| [`@omega-v/friction`](friction/README.md) | Friction & Dissent Tracker for Ω∞v Oceanicos (Pillars 20-21) |
| [`@omega-v/gateway`](gateway/README.md) | Adaptive Rate Limiter, Request Signing, and Anomaly Detection Gateway for Ω∞v Oceanicos |
| [`@omega-v/governance`](governance/README.md) | Ω∞v Governance Engine (Section XXIX) |
| [`@omega-v/governor`](governor/README.md) | On-Chain Timelocked Decentralized Governance, Verifiable Vote Aggregation & Execution Proofs for Ω∞v Oceanicos |
| [`@omega-v/green`](green/README.md) | Ω∞v GREEN Rule Engine (Section XXV) |
| [`@omega-v/human`](human/README.md) | Ω∞v Human Intelligence Module (Section XXVIII) |
| [`@omega-v/intent`](intent/README.md) | Verifiable AI Agent Intent Solver & Cross-Domain Composable Settlement Engine for Ω∞v Oceanicos |
| [`@omega-v/ir`](ir/README.md) | Oceanicum IR (Intermediate Representation) bytecode and execution engine for Ω∞v Oceanicos |
| [`@omega-v/kernel`](kernel/README.md) | Oceanic Finite State Machine Kernel — Canonical Verification-First Full-Stack Transition Loop for Ω∞v Oceanicos |
| [`@omega-v/learning`](learning/README.md) | Ω∞v Learning Engine (Section XXVI) |
| [`@omega-v/mempool`](mempool/README.md) | High-Throughput Priority Transaction Mempool, MEV Bundle Bidding & Nonce Queuing for Ω∞v Oceanicos |
| [`@omega-v/mesh`](mesh/README.md) | Peer-to-Peer Gossip Protocol & Verifiable Message Propagation for Ω∞v Oceanicos — DHT Peer Discovery, Signed Gossip, Epidemic Broadcast, Merkle Sync |
| [`@omega-v/notary`](notary/README.md) | Cryptographic Timestamp Notarization, Merkle Transparency Log & Inclusion Proof Engine for Ω∞v Oceanicos |
| [`@omega-v/oracle`](oracle/README.md) | Cryptographic External World State Verifier & Multi-Source Consensus Oracle Engine for Ω∞v Oceanicos |
| [`@omega-v/orchestrator`](orchestrator/README.md) | Multi-Agent Swarm Orchestrator & Parallel Worker Dispatcher for Ω∞v Oceanicos |
| [`@omega-v/pipeline`](pipeline/README.md) | Automated Verified CI/CD Pipeline Orchestrator for Ω∞v Oceanicos — Stage graphs, dependency ordering, gate checks, worker dispatch, rollback, and build observation receipts |
| [`@omega-v/registry`](registry/README.md) | Decentralized Verifiable Package & Artifact Registry for Ω∞v Oceanicos — Signed Manifests, Provenance Verification, Tamper-Evident Downloads |
| [`@omega-v/relay`](relay/README.md) | Decentralized Cross-Shard & Cross-Rollup Packet Relaying, Merkle Delivery Receipts & Replay Protection for Ω∞v Oceanicos |
| [`@omega-v/replay`](replay/README.md) | Verification Replay Engine — capture, store, replay, and diff past verification loop executions for Ω∞v Oceanicos |
| [`@omega-v/reputation`](reputation/README.md) | Verifiable On-Chain Agent Reputation, EigenTrust Scoring & Sybil-Resistant Feedback for Ω∞v Oceanicos |
| [`@omega-v/rollup`](rollup/README.md) | Optimistic and ZK-Validity Layer-2 Rollup Execution Engine, State Transition Proofs & L1 Settlement for Ω∞v Oceanicos |
| [`@omega-v/sandbox`](sandbox/README.md) | Deterministic Isolated Rule Execution Sandbox with Resource & Timeout Guards for Ω∞v Oceanicos |
| [`@omega-v/scheduler`](scheduler/README.md) | Autonomous periodic verification scheduler — runs the Ω∞v kernel loop on a configurable cadence |
| [`@omega-v/sequencer`](sequencer/README.md) | MEV-Resistant Fair Ordering, Verifiable Delay Functions (VDF), Encrypted Mempool & Batch Settlement Engine for Ω∞v Oceanicos |
| [`@omega-v/sharding`](sharding/README.md) | Adaptive State Sharding, Cross-Shard Atomic Two-Phase Commit (2PC) & Dynamic Merkle State Rebalancing for Ω∞v Oceanicos |
| [`@omega-v/staking`](staking/README.md) | Proof-of-Stake Delegation & Slashing Engine for Ω∞v Oceanicos |
| [`@omega-v/store`](store/README.md) | Append-only provenance store for Ω∞v Oceanicos |
| [`@omega-v/telemetry`](telemetry/README.md) | Distributed provenance tracing, W3C trace context, and SLO verification engine for Ω∞v Oceanicos |
| [`@omega-v/vaas`](vaas/README.md) | Verification-as-a-Service (VaaS) multi-tenant gateway, rate-limiting, and tenant-isolated verification execution for Ω∞v Oceanicos |
| [`@omega-v/vault`](vault/README.md) | Cryptographic State Vault, Checkpoint Backup & Disaster Recovery Engine for Ω∞v Oceanicos |
| [`@omega-v/webhook`](webhook/README.md) | Real-Time Verification Event Webhook Dispatcher with HMAC Signatures & Exponential Backoff for Ω∞v Oceanicos |
| [`@omega-v/zk`](zk/README.md) | Zero-Knowledge Succinct Verification Proofs & Privacy-Preserving Attestations for Ω∞v Oceanicos |


## Local verification

At the repository root:

```bash
pnpm build
pnpm test
pnpm verify:full
```

For an individual package, inspect its `package.json` first and run only a script that exists, for example `pnpm --filter @omega-v/observer build` or `pnpm --filter @omega-v/observer test` where declared. Root and package scripts can differ; do not infer test coverage from a README alone.

## Status semantics

- **Declared:** manifest, directory, or interface exists.
- **Implemented:** behavior exists in source.
- **Tested:** a named test executed successfully on a specific revision.
- **Observed:** behavior was checked in the target environment.
- **Verified:** evidence satisfied explicit acceptance criteria.
- **Deployed:** a separate deployment event and target environment are confirmed.

These states are not interchangeable. In particular, labels such as *decentralized*, *on-chain*, *zero-knowledge*, *enclave*, or *autonomous* may describe a module's intended domain; they do not prove a live network, production deployment, cryptographic audit, hardware backing, or independent third-party verification.
