# Order 027 — Command Provenance Probe

**Agent**: antigravity (Gemini)
**Branch**: `agent/gemini/vibeos-command-provenance`
**Assigned**: 2026-11-21T02:50:00Z
**Status**: IN_PROGRESS

## Domain

Add a dedicated `🔍 Command Provenance` quick-action probe to the ΔVRØ HOUSE VibeOS
surface (`apps/web/src/VibeOS.tsx`) that inspects sovereign command lineage and event history
via `GET /v1/omega/commands/:id/provenance` without asserting execution authority.

## Law

SWARM_PROTOCOL.md § IV.4 / Law 1: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.

## Epistemic Contract

- Probe status: `OBSERVED` (not `VERIFIED`)
- Fail-closed: errors collapse to `UNKNOWN`
- Displays: commandId · status · lineage step count · events count · intent · requestedBy · redacted
- Principle: "command lineage audits transitions, not execution authority"

## Endpoint

`GET /v1/omega/commands` → list commands
`GET /v1/omega/commands/:id/provenance` → `{ success, provenance: { commandId, intent, requestedBy, status, lineage, events, redacted, ... } }`

## Files Changed

- `apps/web/src/VibeOS.tsx` — `runCommandProvenanceCheck` handler + button
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test #57
- `ΩVØØS/ASSIGNMENTS/027-beta-command-provenance-probe.md` — this file
- `kai_ledger.json` — Receipt appended

## Done When

- DOM test passes (57/57)
- `pnpm --filter web build` succeeds
- All 5 gates pass
- PR merged to `main`
