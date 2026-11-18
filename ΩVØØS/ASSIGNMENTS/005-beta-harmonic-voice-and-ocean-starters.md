# ORDER 005 — Beta / Harmonic Voice Audio & Ocean Conversation Starters

| Field | Value |
| --- | --- |
| Assigned to | **Beta** — Builder (VibeOS UI & Audio Synthesis) |
| Domain | `apps/web/src/` |
| Branch | `agent/gemini/vibeos-harmonic-starters` |
| Status | **COMPLETED & VERIFIED** |
| Authority | Synthesise authentic 432 Hz pure sine tone audio upon clicking Voice Bridge, and render prompt starters in empty conversation state. |

## Objective

1. Enable genuine acoustic resonance in VibeOS by synthesising a gentle, pure 432 Hz sine tone via native Web Audio API (`window.AudioContext`) when the Voice Bridge probe verifies.
2. Provide frictionless conversation prompt starters in the empty chat state for instant exploration of Water Intelligence, the 12 Living Entities, and the KAI Shield loop.
3. Preserve fail-closed doctrine: audio synthesis never blocks execution and gracefully handles environments without audio drivers.

## Authorized Edits

- `apps/web/src/VibeOS.tsx` — `playHarmonicTone` audio synthesis and `.vibe-prompt-starters` UI.
- `apps/web/src/VibeOS.css` — starter pills and responsive styling.
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test asserting prompt starter interaction.
- `ΩVØØS/ASSIGNMENTS/001-alpha-gaiacos-risk-gate.md` — mark Order 001 verified.
- `ΩVØØS/ASSIGNMENTS/005-beta-harmonic-voice-and-ocean-starters.md` — this assignment.
- Append receipt to `kai_ledger.json`.

## Acceptance Gate

- `pnpm --filter web test:current-dom`: 32/32 tests pass.
- `pnpm --filter web build`: compiles and bundles cleanly.
- `pnpm validate:swarm`: verified under `SWARM_PROTOCOL.md`.
