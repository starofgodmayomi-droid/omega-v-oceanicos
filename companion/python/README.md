# Oceanicos Python Companion

This directory contains two distinct Python surfaces. `oceanicos_companion.py` is the **stdlib-only, execution-free evidence adapter** described below. `main.py` is an optional standalone tensor/voice HTTP observer; it is not required by the canonical TypeScript DAV API path and must not be treated as running merely because the file exists.

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

## Optional tensor observer (`main.py`)

`main.py` exposes an ASGI-compatible `app` and a zero-dependency `http.server` fallback for `/health`, `/tensor/{size}`, and `/api/tensor/{size}` when explicitly started on port `8088`. It computes the same deterministic `T[i,j,k,l] = i + j + k + l` projection for sizes `4`, `6`, and `8`, with a stdlib fallback when NumPy is unavailable. Its response digest is SHA-256 over canonical JSON; it is not an HMAC signature or an external attestation.

The Fastify API does not fetch this observer under the current Option A architecture. If the process is absent, the state of `:8088` is `UNKNOWN`; do not infer health or deployment from source presence. Unsupported input currently returns HTTP `400` with `UNKNOWN`, while invariant failures are surfaced as `UNKNOWN` by the observer. Changing those semantics or making the observer a required dependency is a separate Option B architecture change requiring explicit review.

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
