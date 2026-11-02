# KAI × ELION × OMEGA

**Status:** `SUPPORTED` as a local pure step. Not a claim that `/api/execute` uses it, and not a claim that a ledger was written.

Source law: [`ECOSYSTEM_BODY.md`](../ECOSYSTEM_BODY.md).

Skill: [`skills/kaixelion-omega/SKILL.md`](../skills/kaixelion-omega/SKILL.md).

Code: [`packages/mini/src/kaixelion-omega.ts`](../packages/mini/src/kaixelion-omega.ts).

```text
KAI observe → authority → ELION compose → OMEGA compare → remember or halt
```

| Gate                                       | Result         | ELION               | Memory                              |
| ------------------------------------------ | -------------- | ------------------- | ----------------------------------- |
| Scam pattern                               | `DIVERGENT`    | does not run        | unchanged                           |
| Authority below required                   | `NOT_EXECUTED` | does not run        | unchanged                           |
| Empty observation                          | `UNKNOWN`      | local sentence only | unchanged                           |
| Caller repeats the expected state          | `UNKNOWN`      | local sentence only | unchanged                           |
| Observation differs                        | `DIVERGENT`    | local sentence only | unchanged                           |
| Independent witness recomputes and matches | `VERIFIED`     | local sentence only | hash appended in the returned tuple |

`ledgerMutation` is always false. `halt: false` means another finite step may be requested. It does not start that step.

The expected state is bound by the function: `No external effect was performed.`

`/api/execute` on main is a different organ. It can still mark a local template `VERIFIED`. This document does not change that route.
