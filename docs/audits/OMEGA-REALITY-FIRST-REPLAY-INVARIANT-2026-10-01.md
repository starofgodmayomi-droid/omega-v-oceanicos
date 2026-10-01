# Omega Reality First — Replay/Provenance Invariant Audit

## Transition

- **Repository:** `starofgodmayomi-droid/omega-v-oceanicos`
- **Base:** `main` at `593b66e` (merged PR #299)
- **Branch:** `feat/omega-replay-invariant`
- **Scope:** bind a causal-memory reality observation to the exact change record being persisted.
- **Authority:** user-requested next finite `omega-reality-first` upgrade procedure.

## Invariant

`appendCausal(record, reality, attestation)` must fail closed unless:

- `reality.record.id === record.id`;
- `attestation.changeId === record.id`;
- `attestation.changeId === reality.record.id`;
- attestation status matches reality status; and
- the attestation signature verifies with the configured key.

This prevents a validly signed observation from being persisted alongside a different change record.

## Implementation

- Updated `packages/mini/src/causal-memory.ts` with the exact-record provenance checks.
- Added a regression test to `tests/integration/causal-memory.integration.test.ts`.
- No new package, connector, persistence backend, worker, or deployment target was introduced.

## Evidence

| Gate | Result |
| --- | --- |
| Workspace build | Passed |
| Focused causal-memory suite | 7 passed, 0 failed |
| Full integration suite | 90 passed, 0 failed across 10 suites |
| API/runtime smoke | Health `ok`; ledger `ONLINE`; mood `MAX GOOD-O`; verified `true` |
| Totality | `TOTALITY STATUS: VERIFIED` |
| Diff hygiene | `git diff --check` passed |
| Deployment | Not claimed |
| Live Notion synchronization | `UNKNOWN / NOT EXECUTED` |

## Reconciliation

Expected: mismatched reality provenance is rejected without mutating the journal.

Observed: the focused regression test passed, the primary journal retained only its original entry, and all repository gates passed.

Status: **SUPPORTED** for the repository-side contract. This does not prove production deployment, external Notion synchronization, or universal runtime correctness.

## Next finite transition

Review the PR and, if accepted, merge through protected `main`. Then select the next smallest missing invariant from the actual source and evidence rather than from speculative blueprints.
