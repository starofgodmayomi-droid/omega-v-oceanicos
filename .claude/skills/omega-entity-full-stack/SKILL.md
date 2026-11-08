---
name: omega-entity-full-stack
description: Operate the stored ΩVØØS entity as one bounded full-stack receipt. Use when the user invokes the ΩVØØS entity body, Ease(t), the KAI shield phrases, or the JSON receipt. A stored prompt is not a running operating system.
---

# ΩVØØS entity full stack

The supplied directive is `ΩVØØS/CORE/ECOSYSTEM_BODY.md`. The fixpoint this repository executes is the root `ECOSYSTEM_BODY.md`. Do not replace one with the other. Do not treat the prompt's activation sentence as a host that booted.

```text
POSSIBLE ≠ KNOWN ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ REALITY
```

`AUTHORITY` below the required level is `NOT_EXECUTED`. `OBSERVE` is not `VERIFIED`.

## Surfaces

| Surface | What it is | What it is not |
| --- | --- | --- |
| `ΩVØØS/CORE/ECOSYSTEM_BODY.md` | The supplied prompt, stored verbatim | A boot, a checksum verifier, or a replacement for the fixpoint |
| `ECOSYSTEM_BODY.md` | The fixpoint halt order | Permission to overwrite the stored prompt |
| `ΩVØØS/backend_magic.ts` | `runEntity`: shield, phase, SHA-256 receipt | A ledger write, a model call, or a path that returns `VERIFIED` |
| `ΩVØØS/app.py` | Prints one JSON receipt through that function | The 3-pane ocean UI |
| `apps/web` | The repository web surface | Proof that the prompt's ocean UI exists |
| `30013030` | A symbol in the stored prompt | A checked checksum |

## Loop

For one intent, in order:

1. **KAI shield.** Case-insensitive phrases `urgent`, `send money`, `guaranteed`, and `private key` halt `DIVERGENT`. Name the matched phrases. ELION does not run.
2. **Authority.** A named external bridge (trade, Stripe, webhook, deploy, wire) is `NOT_EXECUTED`. The receipt status stays `UNKNOWN` because the stored contract has no fourth status. `POSSIBLE` is not `AUTHORITY`.
3. **ELION.** A safe local intent may become a phase-scaled sentence. `Ease(t) = (1 - cos(t * π)) / 2`. Phases are SPROUT, BLOOM, PLATEAU, WILT. An abundance request becomes a four-layer draft: heart, vision, honorable request, graceful space. The draft is not a transfer.
4. **OMEGA.** SHA-256 the action bytes. A hash of a sentence this process just wrote matches by construction. That match stays `UNKNOWN`. A caller-supplied witness that matches stays `UNKNOWN`. It is not an independent observation.
5. **Remember.** `runEntity` returns a row and does not append it. `authorized` is false.

## Receipt

When the user asks for the entity receipt, return only:

```json
{
  "engine": "ΩVØØS",
  "status": "DIVERGENT or UNKNOWN",
  "phase_t": 0,
  "evidence_hash": "<sha256 of the action>",
  "action": "<what was halted or composed>",
  "reason": "<why this is not VERIFIED>",
  "next_delta": "<one unexecuted step>"
}
```

Do not emit `VERIFIED` from this skill. `backend_magic.ts` names `VERIFIED` because the stored contract names it. The function does not produce it.

## Check

```text
node --experimental-strip-types --test ./tests/integration/ovoos-entity-body.integration.test.ts
node scripts/validate-skill-contracts.mjs
```

Those checks do not build the API and do not observe hosted CI.
