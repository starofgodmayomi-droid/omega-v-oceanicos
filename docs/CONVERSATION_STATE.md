# Ω∞v Oceanicos — Compressed Conversation State

**Purpose.** Preserve one evidence-bound repository lineage toward verified reality. Operating laws: evidence over assertion; `ATTEST ≠ ASSERT`; preserve dissent and uncertainty; every change must be implemented, integrated, tested, documented, observable, reproducible, and review-gated. Push, PR publication, merge, and deployment are distinct actions.

## Current observed state

Repository: `starofgodmayomi-droid/omega-v-oceanicos`  
Worktree: `/home/ubuntu/current-main-worktree`  
Base: `origin/main` at `bd78ac8b398beefd4e6c1648743866ed70328051`
Branch: `feat/persistence-key-rotation`
Working tree: controlled persistence-key rotation implementation and evidence records are uncommitted; no publication, merge, or deployment is claimed for this branch.

PR #33 merged as `fb73ac28990b2b42b6339da2e8ca76007616dd70` at `2026-08-16T14:46:39Z`. PR #34 merged as `5e267b54c2bf831cfdb6004b4948a33c3ee1b114` at `2026-08-16T14:58:55Z`. PR #35 merged as `bd78ac8b398beefd4e6c1648743866ed70328051` at `2026-08-16T15:03:03Z` to reconcile state records. The observed CI matrix for PR #34 and PR #35 was green for Node 18, Node 20, Windows compatibility, package/smoke, and report; attested-artifact publication was skipped. No deployment is claimed.

## Verified evolution lineage

| Slice                     | Evidence-bound result                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MINI and trust foundation | MINI Observe → Verify → Remember remains the documented kernel; HMAC-SHA256 and opt-in Ed25519 trust surfaces span attestation, API, web, SDK, CLI, and tests.                                                                                                                                                                             |
| PR #33 merged increments  | Signing audit metadata; AES-256-GCM runtime persistence; durable revocation and `/act` denial; web ledger and operator control; SDK/CLI revocation; kernel-memory encryption and controlled previous-key reads; attestation TTL; SDK/CLI verification; constant-time bearer matching; frontend TTL evidence; whole-system policy contract. |
| PR #34 merged increment   | API `/health` exposes non-secret liveness/readiness, memory integrity, persistence and codec modes, and attestation policy. The web dashboard renders observed readiness, the SDK exposes typed `getHealth()`, and the CLI provides `health` with fail-closed degraded exits.                                                              |
| Pending rotation slice    | Runtime snapshot and event-log reads accept active plus optional previous persistence keys. New writes use the active key. API policy/observability, web, SDK, CLI, tests, and docs expose only key-source provenance and previous-key presence.                                                                                           |

## Persistence rotation evidence

Core persistence tests passed: **45 tests**. Focused cross-surface tests passed: **108 tests** across API, persistence, web DOM, web/API contract, SDK, and CLI. The full local gate passed: `pnpm format:check`, `pnpm type-check`, `pnpm test -- --coverage`, `pnpm build`, and `git diff --check`; observed result was **23 suites / 339 tests**, **71.15% global branch coverage**, and a successful workspace/Vite build.

The implementation supports authenticated snapshot fallback using `OMEGA_PERSISTENCE_KEY_PREVIOUS`, active-key writes, mixed event-log reads, and non-secret `none/current/previous/mixed` provenance. An earlier focused run exposed one expected API assertion drift after the health persistence shape expanded; that assertion was updated and the rerun passed. No secret values are emitted by API, web, SDK, CLI, or tests.

> This is controlled local fallback compatibility, not HSM/KMS custody, secure deletion, automated re-encryption, recovery policy, distributed key coordination, or a claim that all stored data is encrypted.

## Open risks and uncertainty

HSM/KMS custody; secure deletion; automated persistence re-encryption; persistence-key recovery policy; complete data-at-rest coverage; distributed revocation consistency; clock and distributed-time coordination; stronger administrative authorization; deployment hardening; mobile surface; and human cryptographic/revocation review remain open. TTL remains local/configured and is not a distributed clock guarantee. The admin token is a configured bearer boundary, not a complete identity or custody system.

## Human gates and next executable loop

The user has explicitly authorized slice-by-slice publication and merge. Next: commit this locally verified rotation slice, push it to a new PR, observe CI, mark ready, and merge only if the repository gates permit. Deployment remains a separate human gate. After delivery, select the next smallest complete increment, prioritizing distributed revocation consistency or stronger administrative authorization.

> One root. One current. Many minds. Infinite forms.
