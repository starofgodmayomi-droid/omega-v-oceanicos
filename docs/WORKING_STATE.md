# Ω∞v Oceanicos Working State

**Updated:** 2026-08-16

This record compresses the prior evolution cycle into observable repository state. It distinguishes completed implementation from CI evidence, human review, and remaining production gaps.

## Mission and operating contract

Ω∞v Oceanicos is a verification-first TypeScript monorepo organized around the MINI kernel: **Observe → Verify → Remember**. The governing rule is **ATTEST ≠ ASSERT**: claims must remain evidence-bound, uncertainty must be visible, lineage must be preserved, and external actions must remain behind human authorization gates.

The active workflow is:

> Observe → Map → Evidence → Verify → Remember → Build → Integrate → Test → Attest → Audit → Repair → Recompile.

Push, PR publication, merge, deployment, and other externally visible actions are authorized separately. No merge has been performed in this cycle.

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

## Current repository state

The active worktree is `/home/ubuntu/current-main-worktree` on branch `feat/signing-audit-trail`. Local commits currently include:

| Commit    | Meaning                                                   | Publication state                                      |
| --------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `c075154` | Signing audit metadata                                    | Published on PR #33 branch                             |
| `47a2901` | Runtime persistence encryption                            | Published on PR #33 branch                             |
| `ab9ac4d` | Attestation revocation controls                           | Published on PR #33 branch                             |
| `2cbdc72` | Dashboard revocation control plus compressed state record | Published on PR #33 branch                             |
| `d4ebd10` | SDK and CLI revocation surfaces                           | Published on PR #33 branch                             |
| `9a876f2` | Coverage repair for SDK/CLI failure paths                 | Published on PR #33 branch                             |
| `5fb5277` | Web revocation ledger                                     | Local and not yet published at the time of this record |
| `150ec2b` | Admin revocation boundary                                 | Local and not yet published at the time of this record |
| `1affdd7` | Kernel-memory encryption                                  | Local and not yet published at the time of this record |
| pending   | Kernel-memory key rotation                                | Locally verified; not yet committed or published       |

| |
| PR #33 targets `main`, remains **draft/open/mergeable**, and has no recorded review decision. Its last observed CI run was green across Node 18, Node 20, Windows compatibility, packaging/smoke testing, and report generation; the attested-artifact publication job was correctly skipped. The revocation, interface, and coverage-repair commits were authorized and pushed; the web-ledger, admin-boundary, and kernel-memory commits remain local until their CI publication is separately authorized. |

PR #32, the Windows compatibility increment, remains open and green from the last observed check. No merge is claimed for either PR.

## Verification evidence

The combined signing-audit and persistence-encryption state passed:

| Check                                    | Observed result                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm format:check`                      | Passed                                                                                                                                                                                                             |
| `pnpm type-check`                        | Passed                                                                                                                                                                                                             |
| `pnpm test` before revocation            | 302 tests passed                                                                                                                                                                                                   |
| `pnpm test` after revocation integration | 23 suites, 305 tests passed                                                                                                                                                                                        |
| `pnpm build`                             | Passed for all workspace packages and web Vite build                                                                                                                                                               |
| Live encrypted persistence smoke test    | Passed: health, AES-256-GCM observability mode, encrypted snapshot, encrypted event log                                                                                                                            |
| Live revocation smoke test               | Passed: revoke, verification invalidation, action denial, duplicate rejection, encrypted files                                                                                                                     |
| Web revocation DOM test                  | Passed: reason-gated button, request payload, and visible `ATTESTATION REVOKED` state                                                                                                                              |
| SDK/CLI revocation tests                 | Passed: 15 focused tests covering typed SDK requests, bearer propagation, CLI listing, CLI mutation, and missing-reason failure                                                                                    |
| CI coverage repair                       | PR #33 Node 20 exposed a global branch-coverage regression at 68.93% despite 312 passing tests; SDK/CLI error-path tests raised local coverage to 71.15% with 315 passing tests, preserving the existing 70% gate. |
| Web ledger verification                  | Full local coverage gate passes with 317 tests; the dashboard ledger and route contract remain covered, and the production web build passes.                                                                       |
| Admin boundary verification              | API, SDK, and CLI focused tests pass; full local coverage/build pass with 318 tests and the configured admin token is distinct from the read token.                                                                |
| Kernel-memory verification               | Full local coverage/build pass with 321 tests; encrypted lines, wrong-key partial reporting, plaintext migration, and non-secret API mode reporting are covered.                                                   |
| Key-rotation verification                | Full local coverage/build pass with 322 tests; previous-key fallback, current-key appends, mixed-key restore, and non-secret source reporting are covered.                                                         |

| `git diff --check` | Passed before the revocation commit |

The last full local verification after integrating kernel-memory key rotation observed 322 passing tests, 71.15% global branch coverage, and a successful build. The repository may contain generated build output ignored by Git; only intended source and documentation changes should be committed.

## Remaining gaps and uncertainty

The following are explicitly **not complete**: HSM/KMS key custody, key rotation and recovery policy for persistence encryption, complete data-at-rest coverage beyond the runtime and kernel-memory files, distributed revocation consistency, expiry policy, stronger administrative authorization policy, and production deployment hardening. The encryption increment protects the API runtime snapshot and event log only; it is not a claim that every stored datum is encrypted.

The web client exposes revoke and revocation-ledger controls. Stronger administrative policy, distributed revocation consistency, expiry, and recovery remain open.

## Next authorized action

1. Obtain confirmation to push the locally verified kernel-memory key-rotation commit to PR #33.
2. Observe the resulting CI run through the GitHub API.
3. Keep PR #33 draft and route cryptographic and revocation review to a human.
4. Continue with the next smallest worker-sized slice, prioritizing key custody/rotation/recovery or distributed revocation consistency, depending on repository evidence and review feedback.
5. Do not merge or deploy without a separate human authorization.
