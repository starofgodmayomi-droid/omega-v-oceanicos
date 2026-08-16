# Ω∞v Oceanicos Working State

**Updated:** 2026-08-16

This record compresses the prior evolution cycle into observable repository state. It distinguishes completed implementation from CI evidence, human review, and remaining production gaps.

## Mission and operating contract

Ω∞v Oceanicos is a verification-first TypeScript monorepo organized around the MINI kernel: **Observe → Verify → Remember**. The governing rule is **ATTEST ≠ ASSERT**: claims must remain evidence-bound, uncertainty must be visible, lineage must be preserved, and external actions must remain behind human authorization gates.

The active workflow is:

> Observe → Map → Evidence → Verify → Remember → Build → Integrate → Test → Attest → Audit → Repair → Recompile.

Push, PR publication, merge, deployment, and other externally visible actions are authorized separately. PR #33 was merged only after the user-authorized ready-for-review gate and GitHub CI completed successfully; deployment remains unclaimed.

## Verified evolution history

| Increment                       | Evidence-bound outcome                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MINI foundation                 | Observe, Verify, Remember are implemented as the primary kernel and covered by integration and roadmap-claim tests.                                                                                                                                                                                                                                           |
| Full-stack trust surface        | HMAC-SHA256 and Ed25519 attestation paths were integrated across the attestation package, API, web dashboard, CLI, SDK, and integration tests. Public trust metadata is non-secret.                                                                                                                                                                           |
| Confidence integrity            | Verification confidence is derived from rules rather than copied from claimant input; claimant confidence remains separate.                                                                                                                                                                                                                                   |
| CI and provenance               | Formatting drift and stacked-PR trigger gaps were corrected; verification workflows cover Node 18, Node 20, Windows compatibility, packaging/smoke testing, and report generation.                                                                                                                                                                            |
| Windows compatibility           | Line-ending and Docker build-context blockers were repaired in PR #32. The Windows gate was observed green.                                                                                                                                                                                                                                                   |
| Signing audit trail             | API `attestation.created` events now record non-secret signing metadata: algorithm, key version, key fingerprint, verification identity, confidence, rule versions, and outcome. Regression coverage verifies the payload without exposing the signing secret.                                                                                                |
| Runtime persistence encryption  | With `OMEGA_PERSISTENCE_KEY`, runtime snapshots and append-only event-log lines use authenticated AES-256-GCM envelopes. Wrong keys and damaged records are reported instead of silently restoring empty state. Legacy plaintext snapshots remain readable for controlled migration. Observability reports the active algorithm without returning the secret. |
| Attestation revocation          | Recorded attestations can be revoked with an operator reason. Revocation is persisted, emitted as `attestation.revoked`, visible through `/attest/revocations`, invalidates `/attest/verify` for authorization purposes, and blocks `/act` with `409 REVOKED_ATTESTATION`. Duplicate requests are rejected. Web/API contract tests track the new routes.      |
| Dashboard revocation control    | The React dashboard now requires an explicit operator reason before enabling revocation, calls `/api/attest/revoke`, displays `ATTESTATION REVOKED`, and has DOM coverage for the request payload and visible state. The contract inventory now records `/attest/revocations` as the remaining unused read surface.                                           |
| SDK and CLI revocation surfaces | `OmegaClient` now lists and creates revocations with typed envelopes and API error preservation. The CLI now provides `revocations` and reason-gated `revoke` commands, sends the configured bearer token, and returns nonzero failure codes. Both surfaces document that the API remains authoritative for lineage, policy, persistence, and action denial.  |
| Web revocation ledger           | The dashboard now reads `/attest/revocations`, shows the revocation count, and renders persisted attestation ID, reason, operator, and timestamp evidence. The web contract and DOM tests cover the connected read surface.                                                                                                                                   |
| Admin revocation boundary       | When `OMEGA_ADMIN_TOKEN` is configured, the API requires a distinct bearer credential for `POST /attest/revoke`; read tokens are rejected. SDK and CLI mutation paths send the separate admin token, and API/docs/tests preserve the opt-in local-development behavior.                                                                                       |
| Kernel-memory encryption        | `FileMemoryStore` now supports authenticated AES-256-GCM JSONL lines through `OMEGA_MEMORY_KEY`, preserves legacy plaintext migration, and reports wrong-key lines as partial. API initialization wires the key and observability exposes only `memoryEncryption`/memory codec mode.                                                                          |
| Kernel-memory key rotation      | `OMEGA_MEMORY_KEY_PREVIOUS` permits controlled fallback reads while `OMEGA_MEMORY_KEY` encrypts new appends; mixed-key restore reports `previous` without exposing secrets. Rotation remains operationally gated by custody and recovery policy.                                                                                                              |
| Attestation expiry policy       | Opt-in `OMEGA_ATTESTATION_TTL_MS` makes expired attestations invalid for verification and denies `/act` with `EXPIRED_ATTESTATION`; the signed payload is unchanged and clock/distributed-time policy remains open.                                                                                                                                           |
| SDK/CLI expiry verification     | `OmegaClient.verifyAttestation()` and `omega verify --attestation-json` preserve API `valid`, `revoked`, and `expired` status, use the read boundary, and fail closed with a non-zero CLI exit for invalid evidence.                                                                                                                                          |
| Constant-time auth matching     | API read and admin bearer gates now parse the bearer scheme and compare token bytes with `timingSafeEqual`, retaining existing 401 codes and request IDs. Direct regression coverage verifies equal, wrong-value, and length-mismatch behavior.                                                                                                               |
| Frontend TTL policy evidence    | API `/state` now exposes non-secret `attestationTtlMs`; the dashboard renders `ATTESTATION TTL` as `OFF` or seconds, with web fixture and DOM coverage. The frontend consumes backend policy and does not infer expiry.                                                                                                                                       |
| Whole-system policy contract    | API `GET /attest/policy` exposes non-secret algorithm, TTL, auth-boundary presence, revocation support, and storage codecs. The web dashboard renders `REVOCATION / ADMIN` status; SDK `getAttestationPolicy()` and CLI `policy` consume the same contract.                                                                                                   |
| Health-readiness contract       | Unauthenticated `GET /health` exposes liveness, readiness, memory integrity, persistence and codec modes, and non-secret policy. The dashboard renders observed readiness, SDK `getHealth()` is typed, and CLI `health` exits non-zero for degraded or unavailable evidence.                                                                                  |
| Persistence-key rotation        | `OMEGA_PERSISTENCE_KEY` encrypts new snapshot/event-log writes; optional `OMEGA_PERSISTENCE_KEY_PREVIOUS` permits authenticated fallback reads. API policy/observability, web, SDK, and CLI expose only `none/current/previous/mixed` provenance and previous-key presence.                                                                                   |

## Current repository state

The active worktree is `/home/ubuntu/current-main-worktree` on branch `main`, synchronized with merged `origin/main`. Local commits currently include:

| Commit    | Meaning                                                                                                      | Publication state                                      |
| --------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `c075154` | Signing audit metadata                                                                                       | Published on PR #33 branch                             |
| `47a2901` | Runtime persistence encryption                                                                               | Published on PR #33 branch                             |
| `ab9ac4d` | Attestation revocation controls                                                                              | Published on PR #33 branch                             |
| `2cbdc72` | Dashboard revocation control plus compressed state record                                                    | Published on PR #33 branch                             |
| `d4ebd10` | SDK and CLI revocation surfaces                                                                              | Published on PR #33 branch                             |
| `9a876f2` | Coverage repair for SDK/CLI failure paths                                                                    | Published on PR #33 branch                             |
| `5fb5277` | Web revocation ledger                                                                                        | Local and not yet published at the time of this record |
| `150ec2b` | Admin revocation boundary                                                                                    | Local and not yet published at the time of this record |
| `1affdd7` | Kernel-memory encryption                                                                                     | Local and not yet published at the time of this record |
| `2093081` | Kernel-memory key rotation                                                                                   | Local and not yet published at the time of this record |
| `8341170` | Attestation expiry policy                                                                                    | Local and not yet published at the time of this record |
| `88155d6` | SDK/CLI expiry verification                                                                                  | Local and not yet published at the time of this record |
| `807b1ee` | Constant-time auth matching                                                                                  | Local and not yet published at the time of this record |
| `b3f836a` | Frontend TTL policy evidence                                                                                 | Local and not yet published at the time of this record |
| `fb73ac2` | PR #33 squash merge: signing audit, persistence, revocation, memory, expiry, auth, TTL, and policy slices    | Merged into `main`; CI green                           |
| `5e267b5` | PR #34 squash merge: health-readiness contract across API, web, SDK, CLI, tests, and docs                    | Merged into `main`; CI green                           |
| `cae0c65` | PR #36 squash merge: controlled persistence-key rotation fallback across API, web, SDK, CLI, tests, and docs | Merged into `main`; CI green                           |

| |
| PR #33 is **merged** into `main` as squash commit `fb73ac28990b2b42b6339da2e8ca76007616dd70`, observed at `2026-08-16T14:46:39Z`. The published head `2cc2d21` passed Node 18, Node 20, Windows compatibility, package/smoke, and report checks; attested-artifact publication was skipped as designed. |
| PR #34 is **merged** into `main` as squash commit `5e267b54c2bf831cfdb6004b4948a33c3ee1b114`, observed at `2026-08-16T14:58:55Z`. Its head `2349be0` passed the same CI matrix, with attested-artifact publication skipped. |
| PR #35 is **merged** into `main` as squash commit `bd78ac8b398beefd4e6c1648743866ed70328051`, observed at `2026-08-16T15:03:03Z`; it reconciled the state records after PR #34. |
| PR #36 is **merged** into `main` as squash commit `cae0c65915ba2a2553d7b54d411d2316223639a9`, observed at `2026-08-16T15:13:50Z`. Its head `c3e197f` passed the CI matrix; attested-artifact publication was skipped. This is merge evidence only; no deployment is claimed. |

PR #32 remains historical Windows-compatibility evidence.

## Verification evidence

The combined signing-audit and persistence-encryption state passed:

| Check                                    | Observed result                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                      | Passed                                                                                                                                                                                                                                |
| `pnpm type-check`                        | Passed                                                                                                                                                                                                                                |
| `pnpm test` before revocation            | 302 tests passed                                                                                                                                                                                                                      |
| `pnpm test` after revocation integration | 23 suites, 305 tests passed                                                                                                                                                                                                           |
| `pnpm build`                             | Passed for all workspace packages and web Vite build                                                                                                                                                                                  |
| Live encrypted persistence smoke test    | Passed: health, AES-256-GCM observability mode, encrypted snapshot, encrypted event log                                                                                                                                               |
| Live revocation smoke test               | Passed: revoke, verification invalidation, action denial, duplicate rejection, encrypted files                                                                                                                                        |
| Web revocation DOM test                  | Passed: reason-gated button, request payload, and visible `ATTESTATION REVOKED` state                                                                                                                                                 |
| SDK/CLI revocation tests                 | Passed: 15 focused tests covering typed SDK requests, bearer propagation, CLI listing, CLI mutation, and missing-reason failure                                                                                                       |
| CI coverage repair                       | PR #33 Node 20 exposed a global branch-coverage regression at 68.93% despite 312 passing tests; SDK/CLI error-path tests raised local coverage to 71.15% with 315 passing tests, preserving the existing 70% gate.                    |
| Web ledger verification                  | Full local coverage gate passes with 317 tests; the dashboard ledger and route contract remain covered, and the production web build passes.                                                                                          |
| Admin boundary verification              | API, SDK, and CLI focused tests pass; full local coverage/build pass with 318 tests and the configured admin token is distinct from the read token.                                                                                   |
| Kernel-memory verification               | Full local coverage/build pass with 321 tests; encrypted lines, wrong-key partial reporting, plaintext migration, and non-secret API mode reporting are covered.                                                                      |
| Key-rotation verification                | Full local coverage/build pass with 322 tests; previous-key fallback, current-key appends, mixed-key restore, and non-secret source reporting are covered.                                                                            |
| Expiry verification                      | Full local coverage/build pass with 323 tests; deterministic TTL semantics, explicit `expired` verification status, and API observability are covered.                                                                                |
| SDK/CLI verification                     | Full local coverage/build pass with 324 tests; SDK read-token propagation, CLI JSON parsing, expired output, and fail-closed exit behavior are covered.                                                                               |
| Constant-time auth verification          | Full local coverage/build pass with 325 tests; read/admin token boundaries and constant-time comparison cases are covered without changing error contracts.                                                                           |
| Frontend TTL verification                | Full local coverage/build pass with 327 tests; API state propagation, dashboard `900s` rendering, web contract, and DOM behavior are covered.                                                                                         |
| Policy contract verification             | Focused API/web/SDK/CLI tests pass (101 tests); full local coverage/build pass with 332 tests and all policy fields remain non-secret.                                                                                                |
| Health-readiness verification            | Focused API/web/SDK/CLI tests pass (77 tests); full local coverage/build pass with 337 tests, readiness output, degraded CLI exit behavior, web contract drift, and build all pass.                                                   |
| Persistence rotation verification        | Focused API/web/SDK/CLI/persistence tests pass (108 tests); full local coverage/build pass with 339 tests, previous-key snapshot fallback, mixed event-log provenance, active-key write semantics, policy fields, and build all pass. |

| `git diff --check` | Passed before the revocation commit |

The last full local verification before PR #36 observed 339 passing tests, 71.15% global branch coverage, and a successful build; PR #36’s CI matrix was subsequently observed green. The repository may contain generated build output ignored by Git; only intended source and documentation changes should be committed.

## Remaining gaps and uncertainty

The following are explicitly **not complete**: HSM/KMS key custody, secure deletion, automated persistence re-encryption, persistence-key recovery policy, complete data-at-rest coverage beyond the runtime and kernel-memory files, distributed revocation consistency, clock policy and distributed-time coordination, stronger administrative authorization policy, and production deployment hardening. The encryption increment protects the API runtime snapshot and event log only; it is not a claim that every stored datum is encrypted.

The web client exposes revoke and revocation-ledger controls. Stronger administrative policy, distributed revocation consistency, clock coordination, and recovery remain open.

## Next authorized action

1. Reconcile the merged main branch and preserve PR #36’s CI/merge evidence.
2. Select the next smallest worker-sized slice, prioritizing distributed revocation consistency or stronger administrative authorization.
3. Keep any new publication, merge, and deployment actions behind separate human gates.
