# Order 030 — Mesh Nodes Probe

**Agent**: antigravity (Gemini)
**Branch**: `agent/gemini/vibeos-mesh-nodes`
**Assigned**: 2026-11-21T04:45:00Z
**Status**: IN_PROGRESS

## Domain

Add a dedicated `🌐 Mesh Nodes` quick-action probe to the ΔVRØ HOUSE VibeOS
surface (`apps/web/src/VibeOS.tsx`) that inspects sovereign multi-region simulated node topology
and average latency factor via `GET /v1/mesh/nodes` without asserting live WAN reachability.

## Law

SWARM_PROTOCOL.md § IV.4 / Law 1: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.

## Epistemic Contract

- Probe status: `OBSERVED` (not `VERIFIED`)
- Fail-closed: errors collapse to `UNKNOWN`
- Displays: total node count · regions list · average latency factor
- Principle: "mesh node topology audits simulated multi-region endpoints, not live WAN reachability"

## Endpoint

`GET /v1/mesh/nodes` → `{ success: true, nodes: [ { nodeId, region, jurisdiction, latencyFactorMs }, ... ] }`

## Files Changed

- `apps/web/src/VibeOS.tsx` — `runMeshNodesCheck` handler + button
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test #60
- `ΩVØØS/ASSIGNMENTS/030-beta-mesh-nodes-probe.md` — this file
- `kai_ledger.json` — Receipt appended

## Done When

- DOM test passes (60/60)
- `pnpm --filter web build` succeeds
- All 5 gates pass
- PR merged to `main`
