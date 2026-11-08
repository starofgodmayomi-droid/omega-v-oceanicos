# ORDER 001 — 01_GAIACOS / KAI Shield risk gate

| Field       | Value                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Assigned to | **Alpha** — Architect (KAI Shield, verification, attestation, persistence)                                              |
| Domain      | `01_GAIACOS` → `apps/api/src/` — the `KAI_SHIELD_PATTERNS` gate in `invisible-computer.ts`                              |
| Branch      | `agent/alpha/gaiacos-risk-gate` — create from the branch this order was read on. Never `main`.                          |
| Status      | **ASSIGNED** — no code written by the assigning node. The delta below is unexecuted until Alpha's PR carries a receipt. |
| Authority   | Open one PR. Do not merge; merge belongs to the human or the Auditor (Gamma).                                           |

## Objective

One bounded delta: the shield must scan the intent's compatibility-normalised form, so a
full-width or compatibility homograph cannot carry a blocked intent past `scanIntent()`.

## Evidence the gate is bypassable (measured in this checkout)

`scanIntent` tests every `KAI_SHIELD_PATTERNS` regex against the raw string. Text that
renders identically to a reader does not match:

| Intent                     | `scanIntent(intent).blocked` today | after `intent.normalize('NFKC')` |
| -------------------------- | ---------------------------------- | -------------------------------- |
| `urgent`                   | `true`                             | `true`                           |
| `ｕｒｇｅｎｔ` (fullwidth) | **`false`**                        | `true`                           |
| `ＵＲＧＥＮＴ` (fullwidth) | **`false`**                        | `true`                           |
| `ｐｒｉｖａｔｅ ｋｅｙ`    | **`false`**                        | `true`                           |

Reproduce without the API:

```bash
node -e "const p=/\burgent(ly)?\b/i; console.log(p.test('ｕｒｇｅｎｔ'), p.test('ｕｒｇｅｎｔ'.normalize('NFKC')))"
# false true
```

The bypass is a shield defect: `DIVERGENT` should halt before ELION, and this input
reaches ELION instead. It is **not** a reason to widen `AUTONOMOUS` or to add patterns.

## Authorised edits

- `apps/api/src/invisible-computer.ts` — `scanIntent` only. `ShieldPattern` /
  `ShieldVerdict` may change only if the normalisation forces it.
- `tests/integration/execute-route.integration.test.ts` — **one** regression test
  asserting a full-width fraud intent halts `DIVERGENT` with `response: null`,
  `evidence_hash: null` and no memory write. That file is Gamma's domain; this order is
  the explicit authorisation for it. Any other test file is a stop.

## Out of scope

The pattern list, labels and ids; `requiredAuthorityFor` / the authority gate; the route's
response shape; anything under `apps/web/`; the ledger schema; behaviour for ASCII intent
(which must not change).

## Acceptance gate

```bash
pnpm build
pnpm lint
node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/execute-route.integration.test.ts
pnpm validate:swarm
```

In the Base44 sandbox there is no host Node runtime — run them in the stack:

```bash
docker compose -f docker-compose.base44.yml exec -T api sh -c 'corepack enable && pnpm build'
docker compose -f docker-compose.base44.yml exec -T api sh -c 'node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/execute-route.integration.test.ts'
```

## Receipt to append to `kai_ledger.json`

`VERIFIED` requires `tests_passed: true` **and** a 64-hex `evidence_hash`
(`git diff origin/main...HEAD | sha256sum`); `pnpm validate:swarm` rejects the receipt
otherwise.

```json
{
  "timestamp": "<ISO-8601>",
  "agent_id": "<platform>",
  "branch": "agent/alpha/gaiacos-risk-gate",
  "status": "<VERIFIED/DIVERGENT/UNKNOWN/NOT_EXECUTED>",
  "files_touched": [
    "apps/api/src/invisible-computer.ts",
    "tests/integration/execute-route.integration.test.ts"
  ],
  "tests_passed": true,
  "evidence_hash": "<sha256>",
  "next_delta": "<one bounded action>"
}
```

## Stop conditions

- The fix needs a pattern to change meaning, or a second source file → stop, report
  `NOT_EXECUTED` with the file you would need.
- The existing `execute-route` tests change outcome for ASCII intent → that is a
  `DIVERGENT` finding, not a test to update.
- You cannot run the gate → report `UNKNOWN`. Do not write a receipt that implies a run.
