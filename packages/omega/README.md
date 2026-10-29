# @oceanicos/omega

⚖️ **OMEGA** — the judge: response integrity, and the hash a claim can point at.

```text
💧 Ω∞v ::= VERIFY(ΔREALITY)
OMEGA: reconcile expected vs. actual · fail closed
```

## What this package owns

- `verifyResponseIntegrity(text)` — fails closed on an empty or oversized
  (`MAX_EVIDENCE_LENGTH`) response.
- `hashEvidence(text)` — SHA-256 of the response.

## Boundary

A hash proves the response is unchanged, **not** that it is true. Callers must
report `algorithm: 'SHA-256'`, `scope: 'output-integrity'` and
`truth: 'not-established'` alongside it — `POST /execute` in `apps/api` does.

This is the Invisible Computer's verification gate. It is not
`packages/mini`, which carries the admission/transition/compression machinery
for the wider ecosystem.
