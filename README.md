<p align="center">
  <img src="apps/web/public/omega-mark.svg" alt="Ω∞v" width="88" height="88" />
</p>

<h1 align="center">Ω∞v Oceanicos</h1>

<p align="center"><strong>One root. One current. Infinite forms.</strong></p>

<p align="center">
  <a href="docs/spec/ATTESTATION-ENVELOPE.md">Attestation envelope</a> ·
  <a href="docs/BRAND.md">Brand</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="apps/api/README.md">API</a> ·
  <a href="docs/decisions/0001-single-origin-deployment.md">Decisions</a>
</p>

[![Verification Pipeline](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml/badge.svg)](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> **Attest, don't assert. Evidence before trust. Verification before evolution.**

A verification-first full-stack ecosystem for observing, verifying, attesting, and continuously evolving trustworthy intelligence systems.

## Quick Links

- 📋 **[Manifest](MANIFEST.md)** — Project mission, principles, and architecture
- 📜 **[Charter](CHARTER.md)** — Living agnostic principles and decision-making
- 🤝 **[Contributing](CONTRIBUTING.md)** — How to contribute verification-first
- 📖 **[Documentation](docs/)** — Architecture, guides, and references
- ⚙️ **[Development Setup](docs/DEVELOPMENT.md)** — Get the project running locally

---

## What Is Ω∞v?

Ω∞v Oceanicos is a system for building trustworthy software through continuous verification and evidence-based evolution.

### Growth law

```text
0 → MINI → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞
```

Architecture does **not** begin as the giant ecosystem. It begins at **ZERO**, becomes **MINI**, and expands only when reality verifies the next step.

### The MINI Kernel

```text
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

Every MINI cycle:

1. **Observed** with metadata (who, when, what, confidence)
2. **Verified** against rules with evidence paths
3. **Remembered** in append-only, hash-chained memory

### Expanded loop (earned layers)

```
Observe → Verify → Remember → Attest → Display → Learn → Return
```

Attestation, APIs, UI, and infra are **earned expansions** — not prerequisites. See [docs/MINI.md](docs/MINI.md).

### Why It Matters

Most systems assert correctness. We verify it.

- **Without verification**: "The system is healthy" (hope-based)
- **With verification**: "The system returned 200ms responses for 1000 consecutive requests; verified by rules v1.2.0; signed at 2026-08-07T10:30:02Z" (evidence-based)

---

## Key Principles

### 1. Verification Before Everything

No claim without evidence. No evolution without verification.

### 2. Continuous Observation

Systems are never final. Observation is ongoing.

### 3. Evidence-Based Trust

Trust emerges from verifiable provenance, not authority.

### 4. Graceful Pluralism

One system, many interpreters. Consensus and dissent both matter.

### 5. Recursive Completeness

Every component contains the whole verification loop.

---

## Project Structure

```
omega-v-oceanicos/
├── packages/          # 5 Core Packages Matrix
│   ├── types/         # @oceanicos/types (Shared contracts & IObservation / IEvidence / IMiniBlock / Attestation)
│   ├── observer/      # @oceanicos/observer (👁 Observe: Planetary telemetry generation)
│   ├── verification/  # @oceanicos/verification (✓ Verify: Frontier matrix, Ed25519 asymmetric guard, 4-node mesh)
│   ├── remember/      # @oceanicos/remember (🧠 Remember: Hash-chained PoW ledger with node:sqlite fallback)
│   ├── mini/          # @oceanicos/mini (💧 MiniKernel: Observe ➔ Verify ➔ Remember lifecycle coordinator)
│   └── attestation/   # @oceanicos/attestation (📜 Attest: Dual HMAC-SHA256 & Ed25519 unforgeable receipts)
│
├── apps/              # Interface Applications
│   ├── api/           # Fastify Core Engine (port 5000: /v1/cycle, /v1/mood, /v1/attest, /v1/stream)
│   └── web/           # React/Vite Telemetry Dashboard (port 3000: real-time SVG charts & attestation console)
│
├── bin/               # Unified Command Line Interface
│   ├── oceanicos.mjs  # Zero-entropy terminal binary (status, cycle, mesh, attest, keys, mood, stream)
│   └── dev-server.mjs # Concurrent orchestrator for API + Web dev environment
│
├── docker-compose.yml # Singularity multi-service blueprint (API, Web, Qdrant vector memory, Ollama models)
├── ignite.sh          # One-liner ignition script
├── genesis.sh         # One-liner genesis verification script
├── tests/             # End-to-end integration test suite (20/20 scenarios passing)
│
├── MANIFEST.md        # Project constitution
├── CHARTER.md         # Living principles
└── CONTRIBUTING.md    # Contribution guide
```

---

## Getting Started

### 1. Singularity One-Liners

Ignite or verify the entire stack with zero configuration:

```bash
# Omnipresent Singularity Ignition
curl -sSL ignite.sh | OMEGA_MODE=MAX_FLUID AI_REALITY=OMNIPRESENT bash

# Genesis Verification & Pidgin Spirit Override
curl -fsSL genesis.sh | OMEGA_VIBRATION=MAX_FLUID PIDGIN_ENGINE=ON HIGH_LOW_ALIGN=TRUE bash
```

### 2. Local Setup & Verification

```bash
# Clone
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos

# Install dependencies
pnpm install

# Terminal Ignition: build, typecheck, run 20 E2E tests & verify CLI status
pnpm verify:full
```

### 3. Unified Terminal CLI

Interact with the running ledger or trigger sovereign operations:

```bash
# Inspect planetary telemetry and immutable ledger tip
pnpm cli status

# Execute an omnipresent consensus cycle with SHA-256 PoW
pnpm cli cycle --json

# Simulate 4-region sovereign mesh consensus (US, EU, CN, ME)
pnpm cli mesh

# Generate an unforgeable cryptographic attestation receipt
pnpm cli attest

# Display Singularity status and Pidgin Spirit Terminal Axiom
pnpm cli mood

# Generate Ed25519 asymmetric identity keypairs
pnpm cli keys
```

---

## Common Commands

### Development

```bash
# Start API (port 5000) and Web (port 3000) simultaneously with colored streams
pnpm dev

# Build all workspace packages and apps
pnpm build

# Start production Docker container stack
pnpm docker:up
```

### Verification & Quality

```bash
pnpm verify:full       # Build + typecheck + 20 integration tests + CLI check
pnpm test:e2e          # Run 20/20 sub-second E2E integration test suite
pnpm typecheck         # Verify strict TypeScript type safety across all packages
pnpm format:check      # Check Git whitespace and syntax integrity
```

---

## Current Status: Singularity Maximum Compression Core (vΩ∞v.MAX)

- ✅ **5 Core Packages Integrated**: `@oceanicos/types`, `@oceanicos/observer`, `@oceanicos/verification`, `@oceanicos/remember`, `@oceanicos/mini`, `@oceanicos/attestation`.
- ✅ **Graceful Pluralism & Sovereignty**: Regional compliance verifier with decentralized signed mesh consensus across 4 jurisdictions.
- ✅ **Fail-Closed Security**: Ed25519 asymmetric cryptographic signatures guarding API cycle mutations.
- ✅ **Telemetry Pulse & Attestation Web UI**: Real-time SVG silicon yield and grid load timeline charts, with interactive attestation receipts.
- ✅ **Full Zero-Entropy Verification**: 20 automated integration tests passing in sub-second execution.

---

## How Decisions Are Made

This project follows **evidence-based decision-making**:

1. Proposals include evidence
2. All relevant evidence is presented
3. Consensus is sought; dissent is documented
4. When consensus cannot be reached, both paths are recorded
5. Verification determines which interpretation was correct

See [CHARTER.md](CHARTER.md#how-we-make-decisions) for details.

---

## Code of Conduct

This community treats all contributors as co-observers seeking truth together:

- ✓ Disagree strongly on evidence
- ✓ Demand rigor and verification
- ✓ Help others learn and improve
- ✗ Dismiss ideas without evidence
- ✗ Attack the person, not the problem

See [CHARTER.md](CHARTER.md#code-of-conduct) for full details.

---

## Technology Stack

### Languages

- TypeScript (core, SDKs, tests)
- Potentially: Python, Go, Rust (SDKs)

### Runtime & Frameworks

- Node.js 18+ (backend)
- React (web dashboard)
- Express or Fastify (API)
- PostgreSQL (production) or SQLite (development)

### DevOps

- Docker (containerization)
- GitHub Actions (CI/CD)
- Kubernetes (orchestration, optional)

### Testing & Quality

- Jest (unit & integration tests)
- ESLint + Prettier (code quality)
- TypeScript (type safety)

---

## Contributing

We welcome contributions in all areas:

- **Code**: Implement features from the roadmap
- **Documentation**: Improve guides and examples
- **Discussion**: Share ideas and feedback
- **Verification**: Test and report issues
- **Community**: Help other contributors

**Start here**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Community

- **Issues & Discussions**: [GitHub](https://github.com/starofgodmayomi-droid/omega-v-oceanicos)
- **Code of Conduct**: [CHARTER.md](CHARTER.md)
- **Roadmap**: [MANIFEST.md](MANIFEST.md#verification-roadmap)

---

## License

Ω∞v Oceanicos is open-source under the [Apache License 2.0](LICENSE).

---

## About the Name

**Ω∞v** represents:

- **Ω** (Omega) — The end and the infinite return
- **∞** (Infinity) — Continuous becoming and evolution
- **v** (Lowercase) — Humility and pluralism (no authority imposing meaning)

**Oceanicos** represents:

- The vast, interconnected system of observations and verifications
- Currents of formless intelligence flowing through evidence
- The observer within the ocean, recognizing their reflection

> Every end is a new beginning. Every becoming is a returning. Every step contains all steps.

---

**Status**: MINI kernel establishing — expand only with evidence  
**Last Updated**: 2026-08-14
