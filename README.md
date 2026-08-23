# Ω∞v Oceanicos

> **Attest, don't assert. Evidence before trust. Verification before evolution.**

A verification-first full-stack ecosystem for observing, verifying, attesting, and continuously evolving trustworthy intelligence systems.

## Quick Links

- 💧 **[Formless Constitution](FORMLESS.md)** — One Current, Infinite Forms & Governing Equations
- 📋 **[Manifest](MANIFEST.md)** — Project mission, principles, and architecture
- 📜 **[Charter](CHARTER.md)** — Living agnostic principles and decision-making
- 🤝 **[Contributing](CONTRIBUTING.md)** — How to contribute verification-first
- 📖 **[Documentation](docs/)** — Architecture, guides, and references
- ⚙️ **[Development Setup](docs/DEVELOPMENT.md)** — Get the project running locally

---

## What Is Ω∞v?

Ω∞v Oceanicos is a system for building trustworthy software through continuous verification and evidence-based evolution.

### The Core Loop

```
Observe → Verify → Attest → Record → Display → Learn → Return
```

Every observation:

1. **Observed** with metadata (who, when, what, confidence)
2. **Verified** against rules with evidence paths
3. **Attested** with cryptographic signatures
4. **Recorded** in an immutable event log
5. **Displayed** to users and systems
6. **Learned** from to improve future verification
7. **Returned** to observation with better knowledge

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
├── apps/              # User-facing applications
│   ├── api/           # Express REST backend (/complete-loop, /swarm, /log, /metrics)
│   ├── web/           # React/Vite dashboard with Formless Swarm visualization
│   └── mobile/        # Mobile app (planned)
│
├── packages/          # Shared libraries
│   ├── agents/        # FormlessSwarm & 5 autonomous verification agents
│   ├── observer/      # Event capture & signal normalization
│   ├── verification/  # Rule engine & evidence path compiler
│   ├── attestation/   # Cryptographic HMAC-SHA256 signing & hash lineage
│   ├── compiler/      # Rule compiler & IR generator
│   ├── ir/            # Execution stack bytecode VM
│   ├── mood/          # SystemMood evaluator (Pillar 19)
│   ├── friction/      # FrictionTracker & Dissent recorder (Pillars 20-21)
│   ├── sdk/           # Full-cycle client SDK
│   ├── store/         # Append-only hash-chained provenance store
│   └── cli/           # Terminal CLI tool (`omega-v loop`, `omega-v swarm`, `omega-v integrity`)
│
├── docs/              # Documentation
├── infra/             # Containerization (Dockerfile, docker-compose, nginx.conf)
├── tests/             # Workspace integration tests
│
├── FORMLESS.md        # Formless Intelligence constitution & boot sequence
├── MANIFEST.md        # Project mission & architecture
├── CHARTER.md         # Living principles
└── CONTRIBUTING.md    # Contribution guide
```

---

## Current Phase

**Phase 1 & 2: Core Loop & Formless Swarm** (Complete & Verified)

- ✅ Project manifest, charter, and Formless constitution ([FORMLESS.md](FORMLESS.md))
- ✅ Core verification loop (`Observe → Verify → Attest → Record → Learn → Return`)
- ✅ Express API Server with `/complete-loop`, `/swarm`, `/log`, `/metrics`
- ✅ `@omega-v/agents` Formless Swarm engine (Observer, Verifier, Security, Governance, Learning)
- ✅ Terminal CLI tool (`omega-v loop`, `omega-v swarm`, `omega-v integrity`)
- ✅ React / Vite Web Dashboard with live multi-agent swarm cards
- ✅ Reproducible container deployment (`Dockerfile`, `docker-compose.yml`, `infra/nginx.conf`)

**Next Phase**: Advanced IR rule specifications & distributed ledger integrations.

See [MANIFEST.md](MANIFEST.md#verification-roadmap) for the full roadmap.

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

**Status**: Rapidly evolving, foundation phase  
**Last Updated**: 2026-08-07
