# ORDER 009 — Beta / Ecosystem Equation & Fixpoint Law Probe in VibeOS

| Field | Value |
| --- | --- |
| Assigned to | **Beta** — Builder (VibeOS UI & Ecosystem Equation) |
| Domain | `apps/web/src/` |
| Branch | `agent/gemini/vibeos-ecosystem-equation` |
| Status | **COMPLETED & VERIFIED** |
| Authority | Add a dedicated `🌌 Ecosystem Equation` quick action probe in VibeOS that queries `GET /v1/ecosystem/equation` and displays the in-process law fixpoint (`omega.ecosystem-body.y.v1`). |

## Objective

1. Enable instant observation of the Ecosystem Body Fixpoint Equation from VibeOS via `🌌 Ecosystem Equation`.
2. Present the bounded in-process law observation: law (`omega.ecosystem-body.y.v1`), source (`ECOSYSTEM_BODY.md`), reality criterion (`Expected ≡ Observed`), compression digest, and the canonical equation.
3. Preserve fail-closed epistemology: the equation query records an `OBSERVED` snapshot without asserting external disk mutation or deployment claims.

## Authorized Edits

- `apps/web/src/VibeOS.tsx` — `runEquationCheck` handler and `🌌 Ecosystem Equation` button in `.vibe-actions`.
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test asserting ecosystem equation probe interaction.
- `ΩVØØS/ASSIGNMENTS/009-beta-ecosystem-equation-probe.md` — this assignment.
- Append receipt to `kai_ledger.json`.

## Acceptance Gate

- `pnpm --filter web test:current-dom`: 36/36 tests pass.
- `pnpm --filter web build`: clean TypeScript check and Vite bundle.
- `pnpm validate:swarm`: verified under `SWARM_PROTOCOL.md`.
