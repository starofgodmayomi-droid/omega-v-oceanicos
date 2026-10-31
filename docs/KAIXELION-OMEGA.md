# KAI × ELION × OMEGA

**Status:** `SUPPORTED` as the caller path of `POST /api/execute`. Not a ledger write, and not a claim that an external effect was observed.

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

`POST /api/execute` (and `POST /execute`) calls this function with `source: "caller"`, an empty observation, and `witness: null`. Body fields named `observed`, `source`, or `witness` are not read. The route does not call a model and does not write `KaiMemory`. A composition therefore stays `UNKNOWN` unless an earlier gate already halted `DIVERGENT` or `NOT_EXECUTED`. `ledgerMutation` on the response is false.
