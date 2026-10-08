# Transition and evidence — reference module

Use this module for implementation, verification, audit, security, worker, API, or external-action decisions.

## Finite Δ record

```text
Δ:
  identity / intent / scope / authority / policy
  capability / time_bound / data_bound / resource_bound
  stop_condition / observation / provenance / recovery
  expected_state / expected_consequence
  status: VERIFIED | SUPPORTED | UNVERIFIED | DIVERGENT
          | UNKNOWN | NOT_EXECUTED | REVIEW | DENIED
```

If a material field is missing, make a labeled reversible assumption or stop for `REVIEW`.

## Claim gate

```text
CLAIM → SOURCE → EVIDENCE → PROVENANCE → AUTHORITY → POLICY
→ SECURITY BOUND → ADMISSION → FINITE EXECUTION → OBSERVATION
→ RECONCILIATION → TRUTH STATUS → VALUE → MEMORY
```

Keep these pairs distinct:

- capability ≠ authority;
- admission ≠ execution;
- execution ≠ observation;
- observation ≠ verification;
- verification ≠ authorization;
- memory ≠ proof;
- simulation ≠ reality;
- signature ≠ consent;
- test/CI ≠ deployment/health.

## Worker envelope

For workers, retries, subprocesses, streams, and network calls require finite attempts, expiry, cancellation, deterministic exhaustion, idempotency, no ledger mutation on failed bounds, and an observable recovery path. Never retry indefinitely or replay a side effect without a new bounded admission.

## Truth statuses

- **VERIFIED:** authorized execution occurred, effect was observed, provenance is intact, and expected≈actual within scope.
- **SUPPORTED:** evidence supports the named claim but a declared verification gate remains open.
- **UNVERIFIED:** an implementation or assertion exists without enough evidence.
- **DIVERGENT:** observation conflicts with expectation or credible sources disagree.
- **UNKNOWN:** evidence is insufficient; name the resolving check.
- **NOT_EXECUTED:** proposed or prepared, but not run.
- **REVIEW:** human judgment or authority is required.
- **DENIED:** policy or authority prohibits execution.

Never promote `UNKNOWN` or `DIVERGENT` through a summary, UI, memory record, consensus, or rhetoric.

## Consequential actions

Use the least consequential path. Require a human witness before purchases, transfers, trades, financial commitments, broad publication, deletion, access/security/ownership/billing changes, or irreversible legal, medical, employment, tax, government, or physical actions. A tool result is not a witness.
