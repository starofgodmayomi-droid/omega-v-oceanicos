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

## Current repository state

The active worktree is `/home/ubuntu/current-main-worktree` on branch `feat/signing-audit-trail`. Local commits currently include:

| Commit    | Meaning                                                   | Publication state                                      |
| --------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `c075154` | Signing audit metadata                                    | Published on PR #33 branch                             |
| `47a2901` | Runtime persistence encryption                            | Published on PR #33 branch                             |
| `ab9ac4d` | Attestation revocation controls                           | Local and not yet published at the time of this record |
| `2cbdc72` | Dashboard revocation control plus compressed state record | Local and not yet published at the time of this record |
| pending   | SDK and CLI revocation surfaces                           | Locally verified; not yet committed or published       |

| |
| PR #33 targets `main`, remains **draft/open/mergeable**, and has no recorded review decision. Its last observed CI run was green across Node 18, Node 20, Windows compatibility, packaging/smoke testing, and report generation; the attested-artifact publication job was correctly skipped. The revocation commit still requires explicit authorization before being pushed. |

PR #32, the Windows compatibility increment, remains open and green from the last observed check. No merge is claimed for either PR.

## Verification evidence

The combined signing-audit and persistence-encryption state passed:

| Check                                    | Observed result                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                      | Passed                                                                                                                          |
| `pnpm type-check`                        | Passed                                                                                                                          |
| `pnpm test` before revocation            | 302 tests passed                                                                                                                |
| `pnpm test` after revocation integration | 23 suites, 305 tests passed                                                                                                     |
| `pnpm build`                             | Passed for all workspace packages and web Vite build                                                                            |
| Live encrypted persistence smoke test    | Passed: health, AES-256-GCM observability mode, encrypted snapshot, encrypted event log                                         |
| Live revocation smoke test               | Passed: revoke, verification invalidation, action denial, duplicate rejection, encrypted files                                  |
| Web revocation DOM test                  | Passed: reason-gated button, request payload, and visible `ATTESTATION REVOKED` state                                           |
| SDK/CLI revocation tests                 | Passed: 15 focused tests covering typed SDK requests, bearer propagation, CLI listing, CLI mutation, and missing-reason failure |

| `git diff --check` | Passed before the revocation commit |

The last full local verification after integrating SDK and CLI revocation observed 312 passing tests and a successful build. The repository may contain generated build output ignored by Git; only intended source and documentation changes should be committed.

## Remaining gaps and uncertainty

The following are explicitly **not complete**: HSM/KMS key custody, key rotation and recovery policy for persistence encryption, encryption of the separate kernel-memory file, distributed revocation consistency, expiry policy, administrative authorization policy, and production deployment hardening. The encryption increment protects the API runtime snapshot and event log only; it is not a claim that every stored datum is encrypted.

The web client does not yet expose revocation controls. Its contract test deliberately records the revocation endpoints as existing but unused, preserving that gap rather than hiding it.

## Next authorized action

1. Obtain confirmation to push commit `ab9ac4d` to PR #33.
2. Observe the resulting CI run through the GitHub API.
3. Keep PR #33 draft and route cryptographic and revocation review to a human.
4. Continue with the next smallest worker-sized slice, prioritizing an explicit revocation/admin authorization boundary or kernel-memory encryption, depending on repository evidence and review feedback.
5. Do not merge or deploy without a separate human authorization.
