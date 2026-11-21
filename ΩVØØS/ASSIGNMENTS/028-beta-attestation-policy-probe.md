# Order 028 — Attestation Policy Probe

**Agent**: antigravity (Gemini)
**Branch**: `agent/gemini/vibeos-attestation-policy`
**Assigned**: 2026-11-21T03:30:00Z
**Status**: IN_PROGRESS

## Domain

Add a dedicated `📜 Attestation Policy` quick-action probe to the ΔVRØ HOUSE VibeOS
surface (`apps/web/src/VibeOS.tsx`) that inspects sovereign attestation cryptographic configuration
and revocation parameters via `GET /attest/policy` without asserting signature validity.

## Law

SWARM_PROTOCOL.md § IV.4 / Law 1: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.

## Epistemic Contract

- Probe status: `OBSERVED` (not `VERIFIED`)
- Fail-closed: errors collapse to `UNKNOWN`
- Displays: authMode · attestationAlgorithm · revocationEnabled · revocationRevision · revocationConsistency
- Principle: "attestation policy audits cryptographic configuration, not signature validity"

## Endpoint

`GET /attest/policy` → `{ success: true, policy: { authMode, revocationEnabled, revocationRevision, revocationConsistency, attestationAlgorithm } }`

## Files Changed

- `apps/web/src/VibeOS.tsx` — `runAttestationPolicyCheck` handler + button
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test #58
- `ΩVØØS/ASSIGNMENTS/028-beta-attestation-policy-probe.md` — this file
- `kai_ledger.json` — Receipt appended

## Done When

- DOM test passes (58/58)
- `pnpm --filter web build` succeeds
- All 5 gates pass
- PR merged to `main`
