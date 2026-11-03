# NEXT — one finite transition or STOP

`NEXT` is the selector that answers "what is the next most important thing?"
without claiming the answer is permission.

```text
NEXT = argmax_{Δ ∈ Authorized} EvidenceBackedValue(Δ) / (Risk(Δ) + Cost(Δ) + ε)
```

The law lives in `packages/mini/src/next-selector.ts`
(`selectAuthorizedNext`). It is a finite ranking function: inputs in, one
selection or `STOP` out. It does not observe evidence, read the repository,
mutate state, or start work.

## Contract

`POST /v1/ecosystem/next` (read access; `POST` because it carries a body).

```json
{
  "candidates": [
    { "id": "observe-a-claimed-state", "authorized": true, "evidenceBackedValue": 8, "risk": 2, "cost": 1 },
    { "id": "unrequested-expansion", "authorized": false, "evidenceBackedValue": 40, "risk": 1, "cost": 1 }
  ],
  "epsilon": 0.000000001
}
```

- `1–32` candidates; `id` is `1–128` safe ASCII characters and unique.
- `authorized` is required and must be a boolean. Omission is not permission.
- `evidenceBackedValue`, `risk`, and `cost` are finite numbers from `0` to
  `1e15`; `epsilon` is optional and must be in `(0, 1]`.
- Any other field is refused. `execute`, `authority`, and similar smuggled keys
  make the whole request `INVALID`.

Responses:

| Status | HTTP | Meaning |
| --- | --- | --- |
| `SELECTED` | 200 | one authorized candidate plus its ranking |
| `STOP` | 200 | no authorized candidate was supplied |
| `INVALID` | 400 | the request left the contract; `issues` names each field |

Every successful response carries `execution: "NOT_STARTED"`,
`evidence: "CALLER_SUPPLIED_ESTIMATES"`, and
`authority: "selection-is-not-permission"`. Ranking ties break toward the
lexicographically smaller `id`.

## Surfaces

| Surface | Location |
| --- | --- |
| Law | `packages/mini/src/next-selector.ts` |
| API | `POST /v1/ecosystem/next` in `apps/api/src/index.ts` |
| Dashboard | `apps/web/src/NextSelectionPanel.tsx` inside the whole-ecosystem dashboard |

The dashboard panel starts from three editable example estimates and states
that they are the operator's, not observed. Nothing is fetched until
`SELECT NEXT` is pressed.

## Boundaries

- `CALLER-SUPPLIED ESTIMATES` — the API ranks numbers it was given. It does not
  measure value, risk, or cost.
- `SELECTION ≠ PERMISSION` — a winning candidate is not authorization.
- `PLAN ≠ EXECUTION` — `execution` stays `NOT_STARTED`; no repository, ledger,
  or runtime state changes.
- An unauthorized candidate is excluded from the ranking even when its ratio
  would win; `excludedUnauthorized` reports how many were set aside.

## Evidence

```bash
node --experimental-strip-types --test-concurrency=1 \
  --test ./tests/integration/authorized-next.integration.test.ts
```

The suite covers selection, unauthorized exclusion, equal-score tie-breaking,
`STOP`, invalid shapes and smuggled fields, non-mutation of the caller, and the
compiled route in `apps/api/dist`.
