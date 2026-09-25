# Ω∞v Oceanicos Totality Contract

## Purpose

This document is the compressed, executable interpretation of the conversation that produced the current `omega-v-oceanicos` repository. It is a coordination contract for the repository’s full-stack runtime, not a claim of orbital deployment or unlimited infrastructure.

## Brand and system mood

The brand is **Oceanicos Ω∞**: a local-first verification ecosystem whose mood is optimistic, pluralistic, and evidence-led. “Good − O = God” is retained as a creative brand axiom; it is not a security rule, operational guarantee, or factual infrastructure claim. The operational rule is simpler: **attest, do not assert**.

## Canonical runtime

The repository root is canonical. Its smallest executable loop is:

```text
👁 Observe → ✓ Verify → 🧠 Remember → MINI → API/Web/CLI surfaces
```

| Layer | Canonical implementation | Contract |
| --- | --- | --- |
| Shared types | `packages/types` | Observation, evidence, block, and trust contracts |
| Observe | `packages/observer` | Normalized telemetry with unique identifiers |
| Verify | `packages/verification` | Fail-closed policy evaluation and cryptographic evidence |
| Remember | `packages/remember` | SQLite-backed append-only, hash-chained persistence |
| Mini kernel | `packages/mini` | Composes one complete observation-to-memory cycle |
| Attest | `packages/attestation` | HMAC-SHA256 and Ed25519 attestation workflows |
| Gateway | `apps/api` | Cycle, tip, mood, stream, mesh, and attestation routes |
| Console | `apps/web` | Dark-mode telemetry and trust-surface dashboard |
| CLI | `bin/oceanicos.mjs` | Status, cycle, mood, mesh, keys, and attestation operations |

## Safety and truth boundaries

A missing or invalid signing key must fail closed. Secrets must remain in environment configuration and must never appear in logs, evidence artifacts, dashboards, or public health metadata. The repository distinguishes verified local behavior from aspirational deployment: Docker and CI are build surfaces, not proof of production availability.

The current implementation supports local verification, SQLite persistence, API and web surfaces, SSE streaming, attestation, regional convergence simulation, and CLI evidence. HSM/KMS custody, distributed revocation consistency, production deployment, and post-deployment health remain explicitly open concerns.

## Full-stack proof command

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run totality
```

`totality` runs the build, strict type-check, and integration suite. The suite is the source of truth for the current local contract; it must pass before a release claim is made.

## Repository hygiene

The generated `oceanicos/` child workspace from the earlier bootstrap experiment is intentionally not the canonical application. The root repository already contains the richer architecture and its own verified tests. Keep experimental scaffolds separate from production-facing root packages, or remove them in a reviewed cleanup change.
