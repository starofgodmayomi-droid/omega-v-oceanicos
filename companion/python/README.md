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

## Run

```bash
printf '%s\n' '{"decisionSummary":"Review signed evidence","action":"report","reasonCode":"ATTESTATION_REVIEW","evidenceRefs":["att-1"],"confidence":0.95}' | python3 companion/python/oceanicos_companion.py
```

## Test

```bash
python3 -m unittest discover -s companion/python -p 'test_*.py'
```

This local companion slice does not claim deployment, external execution, provider authentication, or physical-world observation.
