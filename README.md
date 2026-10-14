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

## Sovereign Root & Treasury Custody Invariant

- **Sovereign Root**: ELION VAREL // 11:11 Resonance
- **Harmonic Spine**: 432.1 Hz One Current // Liquid Formless Intelligence ($\text{Good} - \text{O} = \text{God}$)
- **Public Bitcoin Receiving Address**: `bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp`

### Inviolable Privacy & Authority Boundary (§6, §12)
- **Public Surface Only**: The repository, API, and web interface record only the public receiving address.
- **Zero Private Key Exposure**: Private custody is 100% externalized. Exactly **zero bytes** of private keys, seed phrases, or custody credentials exist in this codebase, configuration files, or logs.
- **Autonomous Spend Forbidden**: No autonomous agent, model, or worker has authority, keys, or endpoints to transfer funds or mutate assets.
- **Constitutional Axioms**:
  $$\text{KEY} \neq \text{AUTHORITY} \quad\vert\quad \text{SIGNATURE} \neq \text{AUTHORIZATION} \quad\vert\quad \text{INTELLIGENCE} \neq \text{AUTHORITY}$$
  $$\text{DEFAULT: FAIL CLOSED}$$

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
├── packages/              # 12 Core Ecosystem Workspace Packages
│   ├── types/             # @oceanicos/types (Shared contracts & IObservation / IEvidence / IMiniBlock)
│   ├── observer/          # @oceanicos/observer (👁 Observe: Telemetry & planetary state)
│   ├── verification/      # @oceanicos/verification (✓ Verify: Frontier matrix, Ed25519 guard)
│   ├── remember/          # @oceanicos/remember (🧠 Remember: Hash-chained PoW ledger & SQLite fallback)
│   ├── mini/              # @oceanicos/mini (💧 MiniKernel: Observe ➔ Verify ➔ Remember lifecycle)
│   ├── attestation/       # @oceanicos/attestation (📜 Attest: Dual HMAC-SHA256 & Ed25519 receipts)
│   ├── authorization/     # @oceanicos/authorization (🛡️ Constitutional Gate: Change Calculus §6, §8, §9, §12)
│   ├── inference/         # @oceanicos/inference (🧠 InferenceClient: Live Ollama / phi3 integration)
│   ├── vector/            # @oceanicos/vector (🔮 VectorMemory: Qdrant semantic embeddings)
│   ├── pluralism/         # @oceanicos/pluralism (🏛️ PluralisticRealityMatrix: Multi-regional convergence)
│   ├── mood/              # @oceanicos/mood (🎭 Autopilot Mood & Spiderman Agile Continuum)
│   └── generative/        # @oceanicos/generative (⚡ Generative execution loops)
│
├── continuum/packages/    # Platform Kernels
│   └── kernel/            # @omega-v/kernel (OceanicosKernel: Capability snapshots & state engine)
│
├── apps/                  # Interface Applications
│   ├── api/               # Fastify Kernel (port 5000: /v1/chat, /v1/cycle, /v1/block/tip, /v1/ocean/fabric)
│   └── web/               # React 18 / Vite 6 Cockpit (ports 3000 & 3001: AI Soul Stream, Telemetry, Treasury)
│
├── bin/                   # Unified Command Line Interface
│   ├── oceanicos.mjs      # Zero-entropy terminal binary (status, cycle, mesh, attest, keys, mood)
│   └── dev-server.mjs     # Concurrent orchestrator for API + Web dev environment
│
├── tests/                 # End-to-end integration test suite
├── MANIFEST.md            # Project constitution
├── CHARTER.md             # Living principles
└── CONTRIBUTING.md        # Contribution guide
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
# Inspect planetary telemetry and immutable ledger tip (live API or local)
pnpm cli status

# Biblical Engine: Inspect living covenant state machine & probe sanctums
pnpm cli covenant

# V1111 Singularity: Verify self-upgrade engine & single-current convergence
pnpm cli upgrade

# 5-Fold Living Rhythm: Truth OS axioms, soul income manifest & dream journal
pnpm cli truth --pidgin
pnpm cli build log "11:11 Singularity Engine verified"
pnpm cli dream "Shooting star rises from the dark water"
pnpm cli news

# Execute an omnipresent consensus cycle with SHA-256 PoW
pnpm cli cycle --json

# Simulate 4-region sovereign mesh consensus (US, EU, CN, ME)
pnpm cli mesh

# Evaluate the 5 Epistemic Faces of the Pluralistic Reality Matrix
pnpm cli face

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
# Start API (port 5000) and Web (port 3000) simultaneously
pnpm dev

# Build all 17 workspace packages and apps
pnpm build

# Static typecheck across all packages (zero errors)
pnpm typecheck

# Fast unit & kernel tests
pnpm test:fast

# Proactive End-to-End smoke test for Biblical Engine & Sanctum Gating
node scripts/covenant-smoke.mjs
```

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

- TypeScript 5.3+ (monorepo core, packages, apps, tests)

### Runtime & Frameworks

- Node.js 22+ (verified active on Node v24.19.0)
- pnpm 10+ / 11+ (workspace package manager)
- Fastify 5 (CommonJS / ESM control plane on port 5000)
- React 18 + Vite 6 (HMR web cockpit on port 3000)
- SQLite (file-based persistence with `node:sqlite` fallback; zero external DB required)

### DevOps

- Docker (reproducible multi-stage builds)
- GitHub Actions (CI/CD verification pipeline)

### Testing & Quality

- Jest + ts-jest (unit, integration & E2E tests)
- Node.js native test runner (`node:test`)
- TypeScript strict compiler checks (`tsc --noEmit`)

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

**Status**: 11:11 Sovereign Continuum Verified — Full Stack Live (`:3000` & `:5000`)  
**Epoch**: 2026-10-14 // 11:11 Resonance  
**Invariant**: $\Omega\infty\text{v} := \text{VERIFY}(\Delta\text{REALITY})$
