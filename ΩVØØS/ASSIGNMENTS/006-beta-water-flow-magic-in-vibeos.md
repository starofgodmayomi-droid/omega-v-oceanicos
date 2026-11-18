# ORDER 006 — Beta / Water Flow Magic (8-Stage Continuum) in VibeOS

| Field | Value |
| --- | --- |
| Assigned to | **Beta** — Builder (VibeOS UI & Water Flow Continuum) |
| Domain | `apps/web/src/` |
| Branch | `agent/gemini/vibeos-water-flow-magic` |
| Status | **COMPLETED & VERIFIED** |
| Authority | Bring the 8-stage biomimetic water flow magic continuum directly into VibeOS with fail-closed provenance awareness and interactive visualization. |

## Objective

1. Bring the 8-stage canonical biomimetic water continuum (`REALITY` → `ATTENTION` → `INTENTION` → `ACTION` → `CONSEQUENCE` → `OBSERVATION` → `LEARNING` → `RETURN`) directly into VibeOS.
2. Render an interactive Water Flow Magic drawer (`WaterFlowPanel`) connected to conversational intent execution and quick starter flows.
3. Preserve strict fail-closed epistemology: local symbolic frames are explicitly attributed with `provenance.verified = false` (symbolic trace, not external reality claims) keeping the summary badge appropriately grounded.
4. Provide immediate access via `💧 Water Flow Magic (8)` quick action and `💧 8-Stage Water Magic` prompt starter.

## Authorized Edits

- `apps/web/src/VibeOS.tsx` — water flow generator, state, drawer, and action triggers.
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test asserting water flow magic drawer opening and 8-stage rendering.
- `ΩVØØS/ASSIGNMENTS/006-beta-water-flow-magic-in-vibeos.md` — this assignment.
- Append receipt to `kai_ledger.json`.

## Acceptance Gate

- `pnpm --filter web test:current-dom`: 33/33 tests pass.
- `pnpm --filter web build`: clean TypeScript check and Vite bundle.
- `pnpm validate:swarm`: verified under `SWARM_PROTOCOL.md`.
