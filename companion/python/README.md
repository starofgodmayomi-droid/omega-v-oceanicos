# Oceanicos Python Companion

This is the first Python companion integration slice for the Omega OS platform. It is a **stdlib-only, execution-free evidence adapter**.

## Contract

`inspect_record(record)` returns a structured decision envelope containing:

- `decisionSummary`
- `action`
- `reasonCode`
- `evidenceRefs`
- `result`
- `confidence`
- `authorizationRequired`
- `executed`
- `limitations`

The result is always a recommendation. The companion does not run shell commands, call remote services, handle credentials, mutate files, or expose hidden chain-of-thought. Consequential work must be routed through an authorized platform surface.

## Ledger integrity

`verify_ledger_chain(entries)` independently checks a bounded exported ledger without importing the TypeScript runtime. It verifies the genesis anchor, contiguous sequence IDs, every `previousHash` link, and the canonical FNV-1a hash produced by `ProvenanceStore`. It stops at the first failure and never repairs or mutates evidence. This proves local chain integrity only; it does not prove that the recorded observation is true or that a signed decision was correct.

The independent Ed25519 reference verifier remains at `docs/spec/verify_attestation.py`. It verifies the signed attestation payload with only the public key and explicitly reports that signature validity proves origin and integrity, not the truth of the underlying decision.

## Run

```bash
printf '%s\n' '{"decisionSummary":"Review signed evidence","action":"report","reasonCode":"ATTESTATION_REVIEW","evidenceRefs":["att-1"],"confidence":0.95}' | python3 companion/python/oceanicos_companion.py
```

An exported ledger array can be checked through the same entrypoint:

```bash
cat ledger.json | python3 companion/python/oceanicos_companion.py
```

## Test

```bash
python3 -m unittest discover -s companion/python -p 'test_*.py'
```

This local companion slice does not claim deployment, external execution, provider authentication, or physical-world observation.

---

## Whole-universe alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Universe Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
