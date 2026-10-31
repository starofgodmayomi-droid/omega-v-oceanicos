---
name: kaixelion-omega
description: Run one KAI × ELION × OMEGA step through the ECOSYSTEM_BODY halt order. A local composition is not verification, and a caller sentence is not memory.
---

# KAI × ELION × OMEGA

Use this skill when the work is the Invisible Online Computer cycle or the body equation. Do not invent a second law.

```text
KAI observe → authority → ELION compose → OMEGA compare → KAI remember or halt
```

The equation is `ECOSYSTEM_BODY.md`. The function is `runKaixelionOmega` in `packages/mini/src/kaixelion-omega.ts`.

## Halt order

Decide these before any hash is appended:

1. A known scam pattern → `DIVERGENT`. ELION does not run.
2. `Authority` below the required level → `NOT_EXECUTED`. ELION does not run. A directive needs `AUTONOMOUS`. `POSSIBLE` is not `AUTHORITY`.
3. Empty evidence of reality → `UNKNOWN`. A local sentence may exist. It is not appended.
4. Caller-supplied text that matches the expected state → `UNKNOWN`. A caller is not an independent observation.
5. Observation other than the expected state → `DIVERGENT`.
6. Independent witness whose digest recomputes, and whose observation is the expected state → append `Hash(x)` once. `ledgerMutation` is false.

`OBSERVE` is not `VERIFIED`. `COMPOSED` is not `VERIFIED`. Execution is not success.

## What this skill must not do

- `POST /api/execute` is this function on the caller path. Do not read `source`, `witness`, or `observed` from that body, and do not write `KaiMemory` from it. A local composition stays `UNKNOWN`.
- Do not merge, deploy, or treat a green test of the cycle as production health.
- Do not set `source: "independent"` from a user-typed sentence.

## Check

```text
node --experimental-strip-types --test ./tests/integration/kaixelion-omega.integration.test.ts
```

That test does not build the API and does not observe hosted CI.
