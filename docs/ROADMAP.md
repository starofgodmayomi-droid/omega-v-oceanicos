# Ω∞v Oceanicos Roadmap

This document captures the project roadmap for the Ω∞v Oceanicos verification-first ecosystem.

## Vision

Ω∞v is a full-stack orchestration system that connects observation, verification, attestation, recording, rendering, learning, and evolution into a trusted intelligence loop.

## Current Status

- **Phase 0**: Vision — complete
- **Phase 1**: Constitution — complete
- **Phase 2**: Monorepo skeleton — complete
- **Phase 3**: Runtime — in progress

## Phase Breakdown

### Phase 0 — Vision
Defined the long-term mission, values, and open ecosystem principles.

### Phase 1 — Constitution
Created foundational documents and governance, including:
- `CHARTER.md`
- `MANIFEST.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `README.md`

### Phase 2 — Monorepo Skeleton
Built the initial workspace structure and runnable proof-of-concept:
- `packages/types`
- `packages/observer`
- `packages/verification`
- `packages/attestation`
- `apps/api`
- `apps/web`
- CI workflow
- `pnpm-workspace.yaml`

### Phase 3 — Runtime
Current focus:
- `Observe → Verify → Attest` execution loop
- Runnable local developer experience
- Package-level compile/test boundaries
- `@omega-v/api` and `@omega-v/web`

### Phase 4 — Verification Engine
Next objectives:
- Build rule execution engine and configurable rule models
- Add support for extensible verification rule formats
- Improve evidence path generation and auditing
- Add policy-driven verification workflows

### Phase 5 — Observer
Next objectives:
- Add structured observation capture
- Support event provenance and deduplication
- Add persistence and append-only event storage
- Add telemetry and observability metrics

### Phase 6 — Attestation
Next objectives:
- Add production-grade cryptographic signing
- Integrate Sigstore / transparency log support
- Add key management and rotation
- Add attestation verification workflows

### Phase 7 — API
Next objectives:
- Add REST/gRPC API endpoints
- Add authentication and authorization
- Add query and history APIs
- Add API versioning and contract tests

### Phase 8 — Web
Next objectives:
- Add dashboard visuals and historical views
- Add workflow orchestration UI
- Add real-time observability and runtime metrics
- Add SDK integration examples

### Phase 9 — SDK
Next objectives:
- Add TypeScript and language SDKs
- Add client integration patterns
- Add developer onboarding examples

### Phase 10 — CLI
Next objectives:
- Add CLI tooling for verification workflow
- Add command-based attestation and audit
- Add local runtime orchestration

### Phase 11 — Mobile
Next objectives:
- Add mobile dashboards and alerting
- Add lightweight edge observation clients
- Add offline-first capture and sync

### Phase 12 — Edge
Next objectives:
- Add edge runtime support
- Add lightweight verified agents
- Add distributed attestation and trust anchors

### Phase 13 — VaaS
Next objectives:
- Package verification-as-a-service infrastructure
- Add hosted ingestion, verification, and attestation
- Add enterprise controls and policy orchestration

### Phase 14 — Production
Next objectives:
- Harden stability, security, and compliance
- Add observability, metrics, and SLOs
- Add deployment automation and platform integration
- Add full ecosystem orchestration

## Runbook

### Developer Quick Start

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
pnpm install
pnpm run dev
```

### Current Live Ports

- API: `http://localhost:3000`
- Web: `http://localhost:3001`

## Workflow Principles

- Build the smallest executable loop first
- Keep every package compilable independently
- Keep each package exporting one public interface
- Keep the repo runnable from a fresh clone
- Prioritize runtime over philosophy

## Notes

- `pnpm` is the current workspace package manager
- The repo is now runnable end-to-end locally
- `@omega-v/memory` ships a durable JSON-lines persistence adapter; the API persists its provenance chain across restarts
- The next milestone is streaming reads for large chains and pluggable storage backends (SQLite, object storage)
