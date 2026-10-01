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

## Attestation: current runtime reality & recommended hardening

Observed runtime

- The API implements a `/v1/attest` endpoint that currently uses HMAC-SHA256
  in the AttestationService invocation in `apps/api/src/index.ts` when the
  endpoint runs a one-off signing operation.
- The repository also contains Ed25519 key handling and reference verifier
  implementations (spec examples, Python verifier, browser verifier). Ed25519
  capability exists in the codebase, but not all attestation paths use it.

Truthful summary

- ED25519 CAPABILITY = PRESENT IN REPO
- HMAC-SHA256 ATTESTATION = USED BY `/v1/attest` IN RUNTIME
- "ALL ATTESTATION = ED25519" = NOT SUPPORTED BY CURRENT RUNTIME

Security risk posture

- Algorithm mismatch across code, docs, and higher-level claims can lead to
  verifier confusion or unexpected acceptance paths. The repo's own security
  policy lists algorithm confusion as in-scope.
- A single default attestation algorithm should be chosen for runtime, or the
  implementation should clearly document and gate multiple algorithms via
  configuration and tests that demonstrate the verifier's behaviour.

Recommended immediate hardening steps (short-term)

1. Introduce a runtime configuration option to select the attestation algorithm
   (example: `OMEGA_ATTESTATION_ALGORITHM=hmac-sha256|ed25519`) with a
   conservative default matching the most-reviewed code path (currently
   `hmac-sha256`). Document this variable in `apps/api/README.md` and
   `docs/spec/ATTESTATION-ENVELOPE.md`.
2. Ensure the verifier and signer are tested against each supported algorithm
   in unit tests (both sign and verify) and add a contract test that fails if
   an attestation created with the chosen algorithm does not verify with the
   configured verifier.
3. Update documentation and security policy statements to avoid asserting that
   all attestations are Ed25519 unless runtime and CI demonstrate it.
4. Plan a migration path to Ed25519 (recommended for asymmetric, non-repudiable
   attestations) with a compatibility layer (HMAC acceptance only when an
   explicit `OMEGA_ALLOW_HMAC=true` is set and documented). Treat HMAC as
   legacy for high-assurance deployments.
5. Add an integration smoke test in CI that creates an attestation using the
   configured algorithm and verifies it with the repository verifier (this can
   be toggled in CI to avoid exposing keys publicly).

Recommended medium-term steps (next Δs)

- Reconcile all top-level docs (README, MANIFEST, SECURITY, SPEC) to the
  attestation configuration and make an explicit statement of the supported
  runtime algorithms.
- Run the proof suite on the branch and capture CI evidence (format, lint,
  type-check, tests, build, docker smoke). Resolve failing tests in order of
  security and auth boundaries.
- Implement the runtime `OMEGA_ATTESTATION_ALGORITHM` config with tests and add
  a migration proposal in `docs/decisions/` to record the chosen path.

Minimal, non-destructive fixes applied in this branch

- apps/README.md: clarified API port default (5000) and VITE_API_URL defaults.
- docs/AUDIT/inspect-2026-10-01.md: added the inspection report describing
  observed mismatches and next steps.
- This SECURITY.md (updated) now includes the attestation reality and
  recommended immediate hardening steps.

Next suggested action

- Create an issue tracking the attestation hardening and auth-boundary
  verification (I will open one for the repo and link to the audit report).
- Run CI on this branch (open a PR) and collect evidence. Fix any failures
  observed in the pipeline starting with auth and attestation tests.


Inspector: Ω∞v continuity agent
Date: 2026-10-01T00:00:00Z
