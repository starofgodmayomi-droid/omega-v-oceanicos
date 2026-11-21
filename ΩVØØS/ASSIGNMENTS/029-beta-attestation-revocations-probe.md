# Order 029 — Attestation Revocations Probe

**Agent**: antigravity (Gemini)
**Branch**: `agent/gemini/vibeos-attestation-revocations`
**Assigned**: 2026-11-21T04:15:00Z
**Status**: IN_PROGRESS

## Domain

Add a dedicated `🚫 Attestation Revocations` quick-action probe to the ΔVRØ HOUSE VibeOS
surface (`apps/web/src/VibeOS.tsx`) that inspects sovereign local attestation revocation journal
and consistency scope via `GET /attest/revocations` without asserting distributed consensus.

## Law

SWARM_PROTOCOL.md § IV.4 / Law 1: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.

## Epistemic Contract

- Probe status: `OBSERVED` (not `VERIFIED`)
- Fail-closed: errors collapse to `UNKNOWN`
- Displays: count · revision · integrity · consistency · verified state
- Principle: "revocation journal audits locally revoked keys, not distributed consensus"

## Endpoint

`GET /attest/revocations` → `{ success: true, data: [...], meta: { integrity, revision, consistency, verified } }`

## Files Changed

- `apps/web/src/VibeOS.tsx` — `runAttestationRevocationsCheck` handler + button
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test #59
- `ΩVØØS/ASSIGNMENTS/029-beta-attestation-revocations-probe.md` — this file
- `kai_ledger.json` — Receipt appended

## Done When

- DOM test passes (59/59)
- `pnpm --filter web build` succeeds
- All 5 gates pass
- PR merged to `main`
