---
name: omnicos-singularity-eye
description: Operate THE OMNICOS receipt across OCEANICOS, GAIACOS and COSMICOS through the KAI shield, one local composition and the SHA-256 gate. Use when an OMNICOS intent must return a bounded receipt with game_detected and tool_used, or when wiring the receipt to the API and web surfaces.
---

# THE OMNICOS — Singularity Eye

Operating contract for `packages/mini/src/omnicos.ts`, the root adapter `OMNICOS/singularity_eye.ts`, the API route in `apps/api/src/omnicos-route.ts`, and the web surface in `apps/web/src/OmnicosPanel.tsx`.

The stored directive is [OMNICOS/CORE/OMNICOS.md](../../OMNICOS/CORE/OMNICOS.md). It is an evolution of the stored ΩVØØS prompt; it does not replace `ECOSYSTEM_BODY.md`.

```text
POSSIBLE → KAI SHIELD → OBSERVE → local CODE composition → SHA-256 → receipt → NOT_EXECUTED next step
```

## States

- `DIVERGENT` — the KAI shield matched a game phrase. `game_detected` is `true`, the eye closes, and nothing is executed.
- `UNKNOWN` — the receipt is a local composition, an empty intent, or an intent that only named a Glober tool. The digest matches the bytes this process wrote; that match is not an observation.
- `VERIFIED` — named by the stored contract, never emitted by this receipt. A self-hash cannot become verification.
- `NOT_EXECUTED` — the next step named in `next_delta` when a tool was named but not called. A named capability is not an executed tool.

## Law

The law lives once, in `@oceanicos/mini`. The root adapter re-exports it, so the CLI, the API and the UI return the same receipt. `tool_used` is always `CODE`: no browser, API, LLM, comms or database tool is connected, and reporting one as used would be a fabricated completion.

`evidence_hash` is the SHA-256 of `action`. Reading the receipt does not grant AUTHORITY, write a ledger row, call a model, move money, or change the repository. Capability is not authority, and a connected tool is not a connected observation.

## Surfaces

- `POST /api/omnicos` (alias `POST /omnicos`, the Vite proxy target) with `{ "intent": "…", "phaseT": 0.35 }` returns the receipt as the whole body.
- `POST /api/omnicos` answers `400 INTENT_REQUIRED` for an empty intent and `400 INTENT_TOO_LONG` above 2000 characters.
- UI: the singularity-eye panel under the Invisible Online Computer on the home route.
- CLI: `node --experimental-strip-types OMNICOS/singularity_eye.ts "intent" 0.4`.

## What this skill refuses

- Calling a local composition verification.
- Reporting a Glober tool as used because the intent named it.
- Treating `game_detected` as a judgment about a person; it is a phrase match, not an accusation.
- Widening the receipt into a deploy, a payment, a message, or a repository change.

## One cycle

Observe one intent, return one receipt, record what was not executed. Verify with `node --experimental-strip-types --test ./tests/integration/omnicos-singularity-eye.integration.test.ts ./tests/integration/omnicos-route.integration.test.ts` and `pnpm validate:skills`. The next transition is a separate authorized change.
