---
name: omnicos-singularity-eye
description: Operate THE OMNICOS receipt across OCEANICOS, GAIACOS and COSMICOS through the KAI shield, one local composition, the one connected Glober read and the SHA-256 gate. Use when an OMNICOS intent must return a bounded receipt with game_detected and tool_used, or when wiring the receipt to the API and web surfaces.
---

# THE OMNICOS — Singularity Eye

Operating contract for `packages/mini/src/omnicos.ts` (offline law), `packages/mini/src/omnicos-observe.ts` (the connected limb), the root adapter `OMNICOS/singularity_eye.ts`, the API route in `apps/api/src/omnicos-route.ts`, and the web surface in `apps/web/src/OmnicosPanel.tsx`.

The stored directive is [OMNICOS/CORE/OMNICOS.md](../../OMNICOS/CORE/OMNICOS.md). It is an evolution of the stored ΩVØØS prompt; it does not replace `ECOSYSTEM_BODY.md`.

```text
POSSIBLE → KAI SHIELD → OBSERVE → one bounded public read (or local CODE) → SHA-256 → receipt → NOT_EXECUTED next step
```

## States

- `DIVERGENT` — the KAI shield matched a game phrase. `game_detected` is `true`, the eye closes before any network call, and nothing is executed.
- `UNKNOWN` — a local composition, an empty intent, an intent that only named a Glober tool, or an attempted observation that failed or came back mismatched. The digest matches the bytes this process wrote or refused; a self-hash is not an observation.
- `VERIFIED` — only from the one connected Glober tool: a public GitHub repository metadata read whose returned identity matched the identity the intent named.
- `NOT_EXECUTED` — the next step named in `next_delta`. A named capability is not an executed tool, and a completed observation is not an upgrade.

## Law

The law lives once, in `@oceanicos/mini`, in two layers.

- `runOmnicos` (`packages/mini/src/omnicos.ts`) is the offline composition. It composes one local sentence, hashes the bytes it wrote, and returns `DIVERGENT` or `UNKNOWN` only. `tool_used` is `CODE`.
- `observeOmnicos` (`packages/mini/src/omnicos-observe.ts`) is the one connected Glober limb. When the intent names a public GitHub repository — `github owner/repo`, `github.com/owner/repo`, `github:owner/repo` — it runs the declared `github-public-repository` adapter through `executeAdmittedConnector`: one HTTPS GET to `https://api.github.com/repos/{owner}/{repo}`, no credential, `redirect: 'error'`, a 64 KiB body cap, a 5 s timeout, one attempt, read-only, declared under `policy:omnicos-glober-public-read.v1`.
- `tool_used` is `API` only after that call was actually attempted, and `VERIFIED` only when GitHub's returned `full_name` matched the identity the intent named. A failed call, a 404, or a mismatch stays `UNKNOWN` with `next_delta` naming `NOT_EXECUTED`.
- Every other intent, every empty intent, and every shield hit never opens the network. Nothing writes: no ledger row, no message, no payment, no model call, no repository change. Capability is not authority.

`evidence_hash` is the connector's observed evidence digest on a verified read and the SHA-256 of `action` everywhere else. Reading the receipt does not grant AUTHORITY.

## Surfaces

- `POST /api/omnicos` (alias `POST /omnicos`, the Vite proxy target) with `{ "intent": "…", "phaseT": 0.35 }` returns the receipt as the whole body. A verified read and a failed read are both HTTP 200; the verdict rides in `status`.
- `POST /api/omnicos` answers `400 INTENT_REQUIRED` for an empty intent and `400 INTENT_TOO_LONG` above 2000 characters.
- UI: the singularity-eye panel under the Invisible Online Computer on the home route. `Tool used` shows the tool the API actually ran.
- CLI: `pnpm --filter @oceanicos/mini run build` first (the adapter loads the built observation module), then `node --experimental-strip-types OMNICOS/singularity_eye.ts "observe github owner/repo" 0.4`.

## What this skill refuses

- Calling a local composition verification.
- Calling an observation verification when the bytes did not match what the intent asked for.
- Reporting a Glober tool as used because the intent named it, or reporting `API` when the call was refused.
- Treating `game_detected` as a judgment about a person; it is a phrase match, not an accusation.
- Widening the receipt into a deploy, a payment, a message, or a repository change.

## One cycle

Observe one intent, return one receipt, record what was not executed. Verify with `pnpm --filter @oceanicos/mini run build` then `node --experimental-strip-types --test ./tests/integration/omnicos-singularity-eye.integration.test.ts ./tests/integration/omnicos-route.integration.test.ts` and `pnpm validate:skills`. The next transition is a separate authorized change.
