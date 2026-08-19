# Security Policy

## Reporting a vulnerability

**Use GitHub's private vulnerability reporting**, not a public issue:
<https://github.com/starofgodmayomi-droid/omega-v-oceanicos/security/advisories/new>

A public issue is the worst channel for a signature flaw. It tells everyone
who can read the repository how to forge an attestation before anyone can fix
it, and this project exists to make forgery hard.

Please include the commit or image digest, what you did, what you expected,
and what happened. A working proof is welcome and never required — a clear
description of the flaw is worth more than a partial exploit.

There is no bounty and no service-level commitment. This is one unfunded
project with no users yet, and promising a response time it cannot keep would
be the kind of unbacked claim the charter forbids.

## What is in scope

- **The attestation envelope.** Any way to make `verifyAttestation` accept a
  signature the private key did not produce, or reject one it did. The format
  is specified in [docs/spec/ATTESTATION-ENVELOPE.md](docs/spec/ATTESTATION-ENVELOPE.md)
  and implemented three times — TypeScript signer, Python reference verifier,
  browser verifier. **A disagreement between any two of them is a finding**,
  even without an exploit, because the specification is a promise to people
  outside this repository.
- **Algorithm confusion.** The verifier must take its algorithm from its own
  configuration and never from the attestation. A path that reintroduces this
  is a finding.
- **Key handling.** Any path that logs, returns, or persists a private key or
  a raw signing secret. `getKeyInfo()` and the attestation record must expose
  a fingerprint only.
- **Persistence integrity.** Any way to alter a persisted chain so that
  `verifyIntegrity()` still returns true, or to make a corrupt store read as
  `restored`.
- **Revocation.** Any way to make a revoked attestation verify, or to revoke
  something without recorded lineage.
- **Supply chain.** Anything that makes the published image or its provenance
  attestation misrepresent what was built.

## What is out of scope, and why

**The write endpoints are unauthenticated.** `/observe`, `/verify`, `/attest`,
`/act`, `/learn`, `/recompile`, `/complete-loop` and `/dissensus` accept
requests from anyone who can reach the port. This is documented in
[docs/GOVERNANCE.md](docs/GOVERNANCE.md) and is not a vulnerability report —
it is a known property of a service intended to sit behind a gateway that
authenticates before it.

Reports that the API has no rate limiting, no accounts and no roles are
likewise already recorded there. If you can get past a control the governance
document claims **is** enforced, that is very much in scope.

**The example key pair in the specification is deliberately public.** It was
generated for the worked example and discarded; it signs nothing else.

## Supported versions

`main` only. There are no released versions to back-port to, and claiming a
support matrix for versions nobody runs would be fiction.

## What this project already does

Stated so a reporter knows what has been tried rather than rediscovering it:

- no default signing key — the service refuses to start without one
- constant-time comparison for HMAC signatures and bearer tokens
- the verifier's algorithm comes from configuration, never the attestation
- the public key is derived from the private key rather than trusted alongside
- secret scanning and push protection are enabled on this repository
- the container refuses to start without `OMEGA_SIGNING_KEY`, and CI fails the
  build if it starts anyway
