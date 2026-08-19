# Ω∞v Oceanicos Roadmap

This roadmap follows the growth law:

```text
0 → MINI → + → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞
```

Each phase is **earned**. We do not pretend later layers already exist as architecture just because they appear on the vision diagram.

Canonical model: [MINI.md](./MINI.md).

## Vision

Ω∞v is a verification-first system that starts as a living MINI kernel (Observe → Verify → Remember) and expands into a full-stack trusted intelligence ecosystem only when reality verifies each next step.

## Current Status

- **Zero**: acknowledged — complete
- **MINI kernel**: Observe → Verify → Remember — complete (see Phase 2)
- **Expansions present but not kernel**: attestation, API, web

The expansions are implemented rather than sketched: attestation signs with
HMAC-SHA256 or Ed25519, the API serves the loop plus Act/Learn/Recompile over
HTTP, and the web dashboard renders the evidence chain. That says what exists,
not what it is worth — none of it is production-hardened, and the open gaps are
listed under each phase below.

They remain expansions. The kernel is still Observe → Verify → Remember, and
[MINI.md](./MINI.md) governs that definition.

## Phase Breakdown

### Phase 0 — Zero

Honest origin. No assumed ecosystem, capital, or verified stack.

**Done when**: project admits it starts empty and refuses fake completeness.

### Phase 1 — Constitution

Foundational documents and governance:

- `CHARTER.md`
- `MANIFEST.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `README.md`
- `docs/MINI.md`

### Phase 2 — MINI kernel (complete)

Smallest useful living system:

```text
💧 Ω∞v MINI ::= 👁 → ✓ → 🧠
```

| Package                 | Role              |
| ----------------------- | ----------------- |
| `@omega-v/types`        | Shared contracts  |
| `@omega-v/observer`     | 👁 Observe         |
| `@omega-v/verification` | ✓ Verify          |
| `@omega-v/remember`     | 🧠 Remember       |
| `@omega-v/mini`         | Compose the cycle |

**Done when**:

- [x] Observe normalizes claims
- [x] Verify produces evidence paths
- [x] Remember stores append-only hash-chained memory
- [x] MiniKernel runs one cycle without API/UI
- [x] MINI is the documented default mental model everywhere
- [x] Integration tests treat MINI as the primary runtime unit

Each tick above is anchored to evidence by
`tests/__tests__/roadmap-claims.test.ts`, which fails if a box is checked while
the thing it claims is absent. That test checks evidence anchors, not the full
meaning of each sentence — see its header for what it does and does not decide.

### Phase 3 — Earned core expansions

Only after MINI is real:

| Expansion            | Intent                                         |
| -------------------- | ---------------------------------------------- |
| `+ Reason`           | Richer evidence and explanation                |
| `+ Intent`           | Explicit goals/policies for cycles             |
| `+ Build` / `+ Test` | Stronger packaging and proof harnesses         |
| `+ Attest`           | `@omega-v/attestation` cryptographic proof     |
| `+ Act`              | Authorized actions gated by memory/attestation |

**Attestation note**: the package may already exist; roadmap treats production-grade attestation workflows as earned completion, not a kernel prerequisite.

Attestation status: signing is implemented for HMAC-SHA256 and Ed25519, with
key material parsed at construction and the verifying algorithm taken from
configuration rather than from the attestation. The API now supports an
explicit Ed25519 configuration, publishes only safe public trust metadata,
and exposes signing and verification through the HTTP loop. The web, CLI, SDK,
and integration tests carry that trust surface across the stack. The API's
`attestation.created` runtime event now records non-secret signing audit
metadata, including algorithm, key version, key fingerprint, verification
identity, confidence and rule versions. Runtime snapshots and append-only
logs now have an AES-256-GCM increment when configured, and recorded
attestations have append-only revocation controls with an opt-in admin bearer
boundary. Still not earned: HSM/KMS custody, complete data-at-rest coverage,
key rotation and recovery, distributed revocation consistency, expiry policy,
and stronger administrative authorization. An opt-in `OMEGA_ATTESTATION_TTL_MS`
now invalidates expired attestations for verification and action authorization;
clock policy and distributed time coordination remain open. The unauthenticated `/health` route now exposes non-secret liveness/readiness, memory integrity, persistence codec, and attestation policy evidence; the dashboard, SDK, and CLI consume that contract without claiming deployment health.

### Phase 4 — Interface expansions

| Expansion  | Surface        |
| ---------- | -------------- |
| `+ API`    | `apps/api`     |
| `+ Web`    | `apps/web`     |
| `+ CLI`    | `packages/cli` |
| `+ SDK`    | `packages/sdk` |
| `+ Mobile` | planned        |

### Phase 5 — Depth expansions

- Stronger rule engine / compiler / IR
- Durable multi-process persistence
- Bounded local query and temporal audit APIs (implemented increment; distributed indexing remains open)
- Policy-driven verification workflows

### Phase 6 — Distribution expansions

- Edge runtimes
- Agents
- Infrastructure (Docker/K8s/cloud)
- VaaS (verification as a service)

### Phase 7 — Ecosystem expansions

- Governance / trust
- Community + stewardship
- Economy / value loops
- Compound → evolve → return to reality (`∞`)

## Runbook

### Developer Quick Start

```bash
git clone https://github.com/starofgodmayomi-droid/omega-v-oceanicos.git
cd omega-v-oceanicos
pnpm install
pnpm test -- packages/mini packages/remember
pnpm run dev   # expansion surfaces (API/Web), optional for MINI work
```

### Current Live Ports (expansions)

- API: `http://localhost:3000`
- Web: `http://localhost:3001`

## Workflow Principles

- Start from Zero; ship MINI first
- Build the smallest executable loop before the ecosystem story
- Keep every package compilable independently
- Keep each package exporting one public interface
- Keep the repo runnable from a fresh clone
- **Each `+` is earned by the previous layer**
- Prioritize runtime truth over aspirational diagrams

## Notes

- `pnpm` is the workspace package manager
- MINI does not require API or Web to be valid
- Existing API/Web/attestation code is welcome expansion work; it must not redefine the kernel
- Previous milestone (complete): make MINI the default path in apps and docs,
  and enter completed loops into Remember. `/complete-loop` now returns the
  memory record alongside the observation, verification and attestation.

### Known drift, not yet closed

Recorded here so it is visible rather than rediscovered. None of these is
blocked on design; each is a decision or a scoped change.

- **Two package managers, one lockfile.** `pnpm` is canonical: `pnpm-lock.yaml`
  is the committed lockfile and CI installs with `pnpm install --frozen-lockfile`.
  The READMEs mostly say `npm install`, which does work — verified on a clean
  clone: 671 packages, then 263 tests, build and lint all green. But npm ignores
  `pnpm-lock.yaml` and there is no `package-lock.json`, so an npm install
  resolves fresh and can differ from what CI proved. Mixing them in one tree is
  the actual hazard: running `npm install` over an existing pnpm `node_modules`
  fails with a misleading `EUNSUPPORTEDPROTOCOL workspace:*` raised by pnpm's
  own store layout, not by anything in this repository's manifests. No manifest
  here uses the `workspace:` protocol.
- ~~**`format:check` was not run by CI and failed on 14 files.**~~ **Closed.**
  The formatting drift was corrected, `pnpm format:check` was added to the
  verify workflow after dependency installation, and the main-branch workflow
  now passes it on both supported Node versions. The workflow summaries report
  formatting explicitly alongside lint, type-check, test, coverage and build.
- ~~**CI skipped stacked pull requests entirely.**~~ **Closed.** The workflow
  filtered `pull_request` to `[main, develop]`, so a pull request based on any
  other branch ran no jobs at all. Nothing failed because nothing ran, and an
  absence of checks is easily read as passing ones. The filter is removed, so
  every pull request is verified whatever it targets.
- ~~**`summary.confidence` is the claimant's own number.**~~ **Closed.** The
  summary now reports the lowest confidence among the rules that actually ran,
  and carries the claim's own figure separately as `claimedConfidence`. This
  mattered further down the chain than it first looked: the value reached
  `attestation.confidence`, which sits inside the signed payload, so the system
  was issuing unforgeable signatures over a number the submitter chose.
- ~~**Signing events lacked audit metadata.**~~ **Closed.** The API's
  `attestation.created` runtime event records non-secret signing metadata,
  and the regression test verifies its identity, algorithm, key version,
  fingerprint, confidence, rule versions and verification outcome without
  exposing the signing secret. Durable persistence remains separately gated by
  `OMEGA_PERSISTENCE` and is covered by the append-only persistence tests.
- **Runtime persistence encryption — increment implemented, capability not
  complete.** When `OMEGA_PERSISTENCE_KEY` is configured, the API encrypts and
  authenticates runtime snapshots and event-log lines with AES-256-GCM, reports
  the active algorithm through observability, and reports wrong-key or damaged
  records instead of silently restoring empty state. Kernel memory files,
  key custody, rotation, recovery and broader data-at-rest coverage remain open.
- **Partial event-log recovery — degraded readiness implemented, recovery policy
  not complete.** A malformed or unauthenticated durable-log line remains visible
  as `source: partial` with `skippedLogEntries > 0`; enabled partial recovery now
  makes `/health` return HTTP 503 with `readiness: degraded`, and `/state`
  reports `trustBasis.serviceReadiness: 0`. Missing logs remain valid cold starts;
  repair, operator acknowledgement, and distributed recovery remain open.
- **Persistence-key rotation — authenticated local re-encryption implemented; custody and distributed recovery remain open.** `OMEGA_PERSISTENCE_KEY` encrypts new snapshot/event-log writes; `OMEGA_PERSISTENCE_KEY_PREVIOUS` permits authenticated local reads during a controlled rotation, and observability reports `current`, `previous`, or `mixed` without exposing secrets. Health, state, observability, SDK, CLI, dashboard, and tests expose pending rotation and the authenticated `POST /persistence/reencrypt` boundary. The mutation requires an admin bearer token and allowlisted operator, refuses corrupt or partial local evidence, rewrites snapshot/log ciphertext under the current key through a mode-600 local transaction journal, preserves logical event history, and emits non-secret record-count/key-source evidence. Startup reconciles complete staged journals and fails readiness closed for malformed or incomplete journal artifacts. HSM/KMS custody, secure deletion, key recovery, and distributed coordination remain open.
- **Attestation revocation — local integrity evidence implemented, capability
  not complete.** Recorded attestations can be revoked with an operator reason;
  revocation is persisted, emitted as an append-only event, visible through the
  API, invalidates verification for authorization purposes, and blocks `/act`.
  A local SHA-256 registry digest now reports `disabled`, `legacy`, `intact`, or
  `mismatch`; mismatch fails closed for verification-sensitive action and
  mutation paths. This is tamper evidence over local records, not distributed
  consistency, custody, secure deletion, or proof that records and digest could
  not be altered together. Broader policy administration, expiry, distributed
  consistency and recovery procedures remain open.
- **Operator identity allowlist — optional local boundary implemented, identity
  system not complete.** `OMEGA_ADMIN_OPERATOR_ALLOWLIST` can require a listed
  operator identity for revocation mutations. API policy exposes only its
  configured presence; web, SDK, and CLI carry the identity boundary and fail
  closed for unlisted identities. This does not establish authentication,
  identity proofing, role separation, audit-grade identity, or deployment policy.
- **Revocation freshness — local revision evidence implemented, distributed
  consistency not complete.** Ledger, verification, mutation, policy, web, SDK,
  and CLI surfaces expose a local registry `revision` derived from the
  append-only record sequence. This provides bounded local freshness evidence
  only; it does not coordinate nodes, establish a global order, or prove that
  another replica observed the same state.
- **Health/readiness observability — local recovery boundary implemented, deployment health not claimed.** `GET /health` remains unauthenticated for probes and returns explicit liveness, readiness, memory-integrity, persistence-codec, and non-secret policy evidence. An enabled corrupt runtime snapshot or partial event log now degrades readiness with HTTP `503`, while an enabled missing store or log remains a valid cold start; the web dashboard, typed SDK, and CLI consume the same readiness response and fail closed when degraded.
- **State readiness contract — explicit cross-surface signal implemented, distributed readiness not complete.** `GET /state` now returns `readiness: ready | degraded` alongside `trustBasis.serviceReadiness`, `eventLogSource`, and `skippedLogEntries`. The SDK exposes `getState()`, the CLI status command renders the contract, and the dashboard shows state readiness separately from probe health. This does not establish deployment orchestration, distributed health coordination, or production availability.
- **Durable-log recovery provenance — local diagnostics, operator-action routing, and human acknowledgement evidence implemented; repair policy not complete.** Health, state, observability, SDK, CLI, dashboard, and operator docs expose the durable-log source, skipped count, reason, authenticated key source, `operatorAction` routing hint, and latest acknowledgement from the same runtime read. Admin-authenticated, allowlist-aware acknowledgement records an active append-only event and leaves readiness unchanged. It proves review evidence only; it does not repair, authorize, deploy, prove recovery, or establish custody or distributed completeness.
- **Bounded temporal audit query — local contract implemented, distributed audit not complete.** `GET /audit/events` supports exact type/stage/status filters, inclusive time bounds, and a default limit of `100` capped at `500`. API, dashboard, SDK, and CLI surfaces preserve bounded counts, skipped records, local source, key-source, and normalized filter evidence. Focused and full repository tests verify the contract. This is a local event-log query, not a distributed audit index, completeness proof for unpersisted history, global ordering, or replica consistency.

---

**Last Updated**: 2026-08-16
