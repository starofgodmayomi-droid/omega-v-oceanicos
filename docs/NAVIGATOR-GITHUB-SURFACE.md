# Navigator GitHub evidence surface

**Status:** `SUPPORTED` for the typed contract and local API adapter in this
branch. `UNKNOWN` for any deployed Navigator origin, CORS binding, or
production health.

**Recorded:** 2026-09-30

## Intent

Navigator is a presentation adapter over `starofgodmayomi-droid/omega-v-oceanicos`.
It does not replace the repository as system of record, grant authority, or
infer deployment from source.

```text
HUMAN INTENT
  → bounded proposal (REVIEW, authorized: false)
  → omega-v-oceanicos implementation / CI
  → observed GitHub evidence
  → omega-navigator-evidence.v1 snapshot
  → Navigator presentation
  → next finite Δ
```

## Contract

- Schema: `docs/contracts/omega-navigator-evidence.v1.schema.json`
- Types: `packages/types/src/navigator-contract.ts`
- Runtime: `GET /v1/navigator/evidence` (read-only)

Allowed statuses: `VERIFIED`, `SUPPORTED`, `UNVERIFIED`, `DIVERGENT`, `UNKNOWN`.
`HEALTHY`, `DEPLOYED`, and other invented labels are rejected by the parser.

## Boundary

- No mutation route.
- No credential exchange.
- No network/shell observation inside the API adapter.
- `UNKNOWN` is preserved when deployment or health is unobserved.
- Value Navigator proposals remain `REVIEW` / `authorized: false`.

## Next gate

An explicit runtime-origin and auth decision before wiring a hosted Navigator
to this API. Until then, GitHub remains the observed implementation plane.
