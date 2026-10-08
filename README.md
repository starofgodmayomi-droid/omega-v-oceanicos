<p align="center">
  <img src="apps/web/public/omega-mark.svg" alt="Ω∞v OCEANICOS" width="88" height="88" />
</p>

<h1 align="center">OCEANICOS</h1>

<p align="center"><strong>REALITY, VERIFIED.</strong></p>

<p align="center">Ω∞v is the verification engine. OCEANICOS is the platform.</p>

<p align="center">
  <a href="docs/BRAND.md">Brand system</a> ·
  <a href="MANIFEST.md">Manifest</a> ·
  <a href="CHARTER.md">Charter</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

[![Verification Pipeline](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml/badge.svg)](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/actions/workflows/verify.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> **Attest, don't assert. Evidence before trust. Verification before evolution.**

OCEANICOS is evidence-bound infrastructure for turning human intent into bounded,
observable, and auditable action. It brings together a verification kernel, API,
web dashboard, CLI, SDKs, memory, attestation, workers, and operational contracts
without treating any single component—or any agent—as the final authority.

## At a glance

- 📋 **[Manifest](MANIFEST.md)** — Project mission, principles, and architecture
- 💧 **[Mirror-Water Universal Body](docs/MIRROR-WATER-UNIVERSAL-BODY.md)** — one body, one current, bounded transitions, and evidence-bound truth
- 🌊 **[Ω∞v Maximum Full-Stack Space of Reality](docs/OMEGA-INFINITY-MAXIMUM-FULL-STACK-SPACE.md)** — canonical ecosystem vision: representation, authority, bounded execution, observation, reconciliation, and next finite Δ
- 📜 **[Charter](CHARTER.md)** — Living agnostic principles and decision-making
- 🌊 **[Finite operational charter](docs/OMEGA_INFINITY_CHARTER.md)** — Drop → Current → Ocean → Evaporation protocol
- 🤝 **[Contributing](CONTRIBUTING.md)** — How to contribute verification-first
- 📖 **[Documentation](docs/)** — Architecture, guides, and references
- 🌊 **[Whole-ecosystem master prompt](docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md)** — canonical continuity/design layer, bounded by repository evidence
- 🧭 **[Ω∞v OCEANICOS Unified Skill](skills/oceanicos-unified/SKILL.md)** — compressed source-root, reality-first, Lucid, mirror-water, Voice Bridge, and ƆREADE operating contract
- 🧭 **[Value Navigator contract](skills/oceanicos-value-navigator/references/repository-contract.md)** — proposals, evidence, observation, and reconciliation
- 🌉 **[Voice Bridge](skills/voice-bridge/SKILL.md)** — one human source across many expressive forms
- Ɔ **[ƆREADE × Oceanicos Harmonizer](skills/oread-pidgin-harmonizer/SKILL.md)** — symbolic meaning translated into bounded action
- 🧩 **[OceanicOS Framework](skills/oceanicos-framework/SKILL.md)** — finite transitions, evidence, and human authority
- 🌊 **[Oceanicos Full Stack](skills/oceanicos-full-stack/SKILL.md)** — the renamed Ω∞v verification spine, whole-ecosystem routing, and bounded FLOW
- 🌐 **[Full-stack reality-access handoff](docs/upgrades/FULL_STACK_REALITY_ACCESS_2026-09-28.md)** — connector taxonomy without implicit ownership or authority
- 🗺️ **[Repository inventory](docs/REPO_INVENTORY.md)** — workspace vs disk (current evidence)
- ⚙️ **[Development Setup](docs/DEVELOPMENT.md)** — Get the project running locally
| | Meaning |
| --- | --- |
| **Platform** | OCEANICOS — one ecosystem body with many bounded capabilities |
| **Engine** | Ω∞v — the verification and evidence loop |
| **Core loop** | Observe → Verify → Remember |
| **Earned loop** | Observe → Verify → Remember → Attest → Display → Learn → Return |
| **Primary rule** | Reality remains the final authority |
| **Governance rule** | Human authority is required for consequential action |
| **Current proof** | Local repository and hosted CI evidence; deployment is a separate state |

## Why OCEANICOS exists

Modern systems can generate convincing answers, execute tools, and produce reports
without proving that the underlying claim is correct. OCEANICOS is designed to
make the difference visible:

- A **claim** is not proof.
- A **model response** is not reality.
- A **capability** is not authority.
- An **execution** is not success.
- An **attestation** is not authorization.
- A **green test run** is not a production deployment.

The platform preserves evidence, uncertainty, divergence, dissent, provenance, and
human approval boundaries as first-class system states.

## The operating model

```text
HUMAN INTENT
    ↓
DISCOVER → EVIDENCE → AUTHORITY → POLICY → ADMISSION → BOUND
    ↓
EXECUTE → OBSERVE → RECONCILE → VERIFY → ATTEST
    ↓
PROVENANCE → MEMORY → LEARN → NEXT FINITE TRANSITION
```

The Ω∞v notation is a conceptual compression of this finite operating model:

```text
Ω∞v := VERIFY(ΔREALITY)
∞    := ITERATED FINITE VERIFIED Δ
```

Here, `∞` does not mean unlimited autonomy, authority, budget, consciousness, or
control. It means that verified transitions can be continued while their
constraints and provenance remain visible.

## The MINI kernel

The smallest useful unit is deliberately small:

```text
💧 Ω∞v MINI ::= Observe → Verify → Remember
```

Each MINI cycle should preserve:

1. **Observation** — what was seen, by whom, when, and from which source.
2. **Verification** — which rules were applied and what evidence they produced.
3. **Memory** — an append-only record that can be inspected, reconciled, and
   connected to later transitions.

Attestation, APIs, UI, workers, connectors, and deployment are earned expansions.
They do not replace the kernel and they do not inherit authority merely by being
present in the repository.

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ Human intent, governance, authorization, and decision records │
├──────────────────────────────────────────────────────────────┤
│ Web dashboard · CLI · SDK · API · worker interfaces          │
├──────────────────────────────────────────────────────────────┤
│ Attestation · provenance · observation · reconciliation       │
├──────────────────────────────────────────────────────────────┤
│ MINI kernel: Observer → Verification → Remember               │
├──────────────────────────────────────────────────────────────┤
│ Runtime, persistence, containers, CI, and deployment gates     │
└──────────────────────────────────────────────────────────────┘
```

### Repository map

| Surface | Location | Role |
| --- | --- | --- |
| Shared contracts | `packages/types` | Typed observations, evidence, lifecycle, and worker contracts |
| Observation | `packages/observer` | Capture and normalize bounded observations |
| Verification | `packages/verification` | Apply rules and produce evidence paths |
| Memory | `packages/remember` | Append-only and hash-chained records |
| MINI kernel | `packages/mini` | Compose Observe → Verify → Remember |
| Attestation | `packages/attestation` | Produce and verify supported cryptographic receipts |
| API | `apps/api` | Fastify runtime and network contracts |
| Web | `apps/web` | React/Vite dashboard and evidence visualization |
| CLI and SDK | `packages/cli`, `packages/sdk` | Programmatic and terminal access |
| Workers | `packages/worker` | Bounded leases, lifecycle, and fail-closed execution |
| Tests | `tests/` | Integration, contract, runtime, and regression evidence |
| CI and release | `.github/workflows/`, `Dockerfile`, `docker-compose.yml` | Verification, packaging, and staged release gates |

> **Inventory rule:** present on disk does not mean workspace-active, imported by
the API, deployed, or verified. Consult [the repository inventory](docs/REPO_INVENTORY.md),
[the dependency map](docs/DEPENDENCY_MAP.md), and [the roadmap](docs/ROADMAP.md).

### Symbolic topology proposal

The supplied “multi-universal reality OS” material is retained here as a **creative
design language**, not as evidence that physical, spiritual, planetary, or financial
systems exist or are controlled by this repository. Its categories can be translated
into bounded software concerns as follows:

| Symbolic category | Bounded Oceanicos interpretation | Evidence state |
| --- | --- | --- |
| Source / Potentiality | intent, proposal, and unexecuted possibility | `PROPOSED` |
| Spatial geometry / Fluid dynamics | bounded spatial or telemetry input | `UNKNOWN` until an approved observer is connected |
| Atmospheric conduction / Energetic catalyst | communication and transition metadata | `UNKNOWN` beyond local runtime evidence |
| Biological vessels | human actors, affected parties, and consent boundaries | `HUMAN-GOVERNED` |
| Mind and synthetic logic | bounded model or worker capability | `CAPABILITY`, not authority |
| Soulbound matrix | identity, lineage, and provenance records | `UNKNOWN` as a metaphysical claim |
| Mirror interface / Observer | dashboard presentation and independent observation | `SUPPORTED` only within tested surfaces |
| Cryptographic value | accounting or payment integration proposal | `NOT IMPLEMENTED` |
| Continuous becoming | finite repeatable transitions with stop conditions | `SUPPORTED` as a design principle |

The attachment’s changing-clothes, mirror, water, pursuit, blessing, prayer, and
cosmic imagery remain symbolic motifs. They are not claims of supernatural agency,
physical liquid computation, consciousness, or guaranteed transformation. Likewise,
Bitcoin, Lightning, wallet, treasury, fee, or payout language is intentionally not
implemented from this proposal: no custody, payment authorization, external wallet,
or financial outcome is inferred from a local simulation or green test run.

The safe translation remains:

```text
DROP → DISTINGUISH → VALIDATE → AUTHORIZE → ADMIT → BOUND
→ EXECUTE → OBSERVE → RECONCILE → ATTEST → REMEMBER → NEXT DROP
```

> **Pidgin fit carry the warmth; evidence go carry the claim.**

## Quick start

### Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer
- Git
- Docker, only for container or Compose checks

### Install and run locally

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
pnpm install --frozen-lockfile
pnpm dev
```

The root development command builds the workspace and starts:

- API: `http://localhost:5000`
- Web dashboard: `http://localhost:3000`

The local dashboard is an inspection and verification surface. It is not proof of
production availability, identity proofing, external custody, or deployment health.

### Run the repository verification gate

```bash
pnpm verify:full
```

This is a local evidence command covering the repository's configured build,
type-check, integration, and API smoke stages. Its result is bounded to the exact
machine, commit, configuration, and time at which it runs.

## Common commands

```bash
# Build all workspace packages and applications
pnpm build

# Type-check the workspace
pnpm typecheck

# Run the enumerated integration suite
pnpm test

# Run the end-to-end integration command
pnpm test:e2e

# Run formatting and whitespace checks
pnpm format:check

# Run the API smoke path
pnpm smoke:api

# Start and stop the local Compose profile
pnpm docker:up
pnpm docker:down

# Use the unified CLI
pnpm cli status
pnpm cli mood
pnpm cli cycle --json
```

Read the relevant command and source contract before extending a workflow. Do not
pipe remote scripts into a shell, invent credentials, or infer production behavior
from a local command.

## Evidence and status vocabulary

OCEANICOS keeps implementation state separate from verification state and deployment
state. Use these labels in code, documentation, pull requests, and operations:

| Status | Meaning |
| --- | --- |
| `OBSERVED` | A state or event was captured with provenance. |
| `VERIFYING` | A bounded check is in progress. |
| `VERIFIED` | Evidence supports the claim within the stated scope. |
| `AUTHORIZED` | A human or policy boundary permits the action. |
| `EXECUTING` | An admitted action is running. |
| `UNKNOWN` | Evidence is insufficient; do not promote the claim. |
| `DIVERGENT` | Expected and observed states differ. |
| `NOT_EXECUTED` | Proposed or prepared, but not run. |
| `STAGED_ONLY` | An artifact was prepared without claiming deployment. |

A test, build, attestation, or tool response never upgrades a claim beyond the
evidence it actually covers.

## Security and governance

The project is built around explicit boundaries:

- Fail closed when required credentials, policy, identity, or evidence are missing.
- Keep secrets out of source code, logs, fixtures, commits, and documentation.
- Separate access, capability, authorization, execution, observation, and proof.
- Preserve append-only records, lineage, revocation state, and relevant dissent.
- Require human review for consequential, destructive, security-sensitive, or
  production actions.
- Treat external connectors and provider integrations as unavailable until tested.
- Keep symbolic language as a meaning layer; never use it as technical evidence.

Read [SECURITY.md](SECURITY.md), [CHARTER.md](CHARTER.md), and the
[operational protocol](docs/spec/OCEANICOS-OPERATIONAL-PROTOCOL.md) before changing
security, governance, authority, or external-action behavior.

## Documentation guide

- [Brand system](docs/BRAND.md) — canonical name, voice, visual tokens, and lockup
- [Project manifest](MANIFEST.md) — mission, principles, architecture, and roadmap
- [Charter](CHARTER.md) — decision-making, conduct, and human governance
- [Development guide](docs/DEVELOPMENT.md) — local workflows and repository conventions
- [API guide](apps/api/README.md) — server routes and runtime contracts
- [Web guide](apps/web/README.md) — dashboard behavior and local proxy usage
- [Local Compose deployment](docs/LOCAL_COMPOSE_DEPLOYMENT.md) — bounded local stack validation
- [Attestation envelope](docs/spec/ATTESTATION-ENVELOPE.md) — receipt and verification contract
- [Repository inventory](docs/REPO_INVENTORY.md) — active workspace and evidence boundaries
- [Roadmap](docs/ROADMAP.md) — completed slices, open gaps, and next transitions
- [Contributing guide](CONTRIBUTING.md) — how to propose and verify changes

## Engineering workflow

Every meaningful change follows a small, reviewable loop:

```text
Inspect → Bound → Implement → Test → Reconcile → Commit → CI → Review → Next
```

A pull request should state:

1. What changed and why.
2. Which files and contracts changed.
3. Which local and hosted checks passed.
4. Which security and authority boundaries were preserved.
5. What remains unknown, skipped, staged, or unexecuted.
6. What human or operational gate comes next.

The canonical automatic verification workflow is
[`.github/workflows/verify.yml`](.github/workflows/verify.yml). Release staging is
not the same as provider deployment, and a green pull request is not permission to
merge or publish.

## Current state

The repository is an actively evolving verification-first system. The current
working state, roadmap, branch, commit, and CI conclusions are authoritative for
specific claims; this README is a stable product and engineering guide.

Current boundaries include:

- The MINI kernel and multiple earned full-stack surfaces are implemented.
- Local and hosted verification provide evidence for the commands and commits run.
- Release bundles can be validated for provenance and staged with a checksum.
- Provider-specific deployment, production runtime health, external identity
  integration, universal correctness, and physical-world claims remain separate
  gates and must not be inferred.

## Contributing

Contributions are welcome across code, tests, documentation, verification, security,
operations, and community practice.

Before opening a pull request:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm build
pnpm test
pnpm typecheck
```

Keep changes small, explain the evidence, preserve uncertainty, and update the
nearest contract or documentation when behavior changes.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full process.

## Community and license

- Issues and discussions: [GitHub repository](https://github.com/starofgodmayomi-droid/omega-v-oceanicos)
- Code of conduct: [CHARTER.md](CHARTER.md)
- License: [Apache License 2.0](LICENSE)

## Brand meaning

- **Ω∞** is the mark: continuity, recursion, and open-ended evolution.
- **Ω∞v** is the verification engine and kernel identity.
- **OCEANICOS** is the platform and ecosystem body.
- **One root. One current. Infinite forms.** is the creative creed.
- **REALITY, VERIFIED.** is the public promise, bounded by evidence.

The water metaphor means current, memory, adaptation, and connection. It is a
language for architecture and human meaning—not a claim of omniscience, literal
infinity, consciousness, or control of external reality.

---

**Status:** MINI kernel and earned expansions — expand only with evidence
**Last updated:** 2026-10-02

## Whole-ecosystem root

The canonical expandable continuity/root prompt is [docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md](docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md). It is a design/continuity contract, not runtime proof. Existing repository contracts, ΩIR types, admission gates, tests, and runtime observations remain the executable evidence boundary.
