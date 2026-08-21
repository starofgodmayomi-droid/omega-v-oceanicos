# Governance

Who may do what, and — more importantly — what is not protected.

Section XXIX asks that governance itself be versioned and observable. This
document is that record, and a test holds it to the routes the API actually
registers, so it cannot quietly fall behind the code.

## The three controls

| Variable                          | Effect when set                                                                                                                                                              | Effect when unset                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `OMEGA_READ_TOKEN`                | Every `GET` except `/health` requires a matching bearer token                                                                                                                | All reads are open                               |
| `OMEGA_ADMIN_TOKEN`               | `POST /attest/revoke`, `POST /persistence/acknowledge`, and `POST /persistence/reencrypt` require a matching bearer token                                                    | Those mutations need no token                    |
| `OMEGA_ADMIN_OPERATOR_ALLOWLIST`  | All three admin mutations require `x-omega-operator-id` from the list                                                                                                        | Any operator identity is accepted                |
| `OMEGA_ADMIN_REQUIRE_ALLOWLIST`   | When `on`, all three admin mutations fail closed unless the operator allowlist is configured and the identity is listed                                                      | Allowlist remains optional                       |
| `OMEGA_PERSISTENCE_DELETION_MODE` | Declares `unlink-only` or `overwrite-unlink`; invalid values degrade readiness and every mode reports `verified:false`                                                       | `unavailable`; no erasure capability is declared |
| `OMEGA_PERSISTENCE_CUSTODY_MODE`  | Declares `unverified-local`, `operator-managed`, `hsm-kms`, or `external-reference`; invalid/reference-less values degrade readiness and every mode reports `verified:false` | `unverified-local`; no custody proof is declared |

Tokens are compared with `timingSafeEqual`. The three original controls default to **off**; `OMEGA_ADMIN_REQUIRE_ALLOWLIST=on` is an explicit fail-closed hardening decision. `OMEGA_PERSISTENCE_DELETION_MODE` is a separate local capability declaration and never proves secure erasure, backup deletion, replica deletion, or custody. `OMEGA_PERSISTENCE_CUSTODY_MODE` and its bounded reference are declaration evidence only; they never verify an HSM/KMS, operator, external system, recovery material, or deployment. An unconfigured deployment is fully open, and that is a deployment decision
rather than a safe default. It is stated here rather than discovered.

## What is gated

**Read-gated** — every `GET` other than `/health`, when `OMEGA_READ_TOKEN` is
set. `/health` stays open so a load balancer can probe it without holding a
credential.

**Admin-gated** — `POST /attest/revoke`, `POST /persistence/acknowledge`, and `POST /persistence/reencrypt`, by token and by operator identity. Revocation changes what an existing attestation means; persistence acknowledgement records a human review event and does not change readiness or claim repair; re-encryption rewrites authenticated local ciphertext only after complete previous-key evidence, records non-secret counts and key-source provenance, and uses a local transaction journal to reconcile or block interrupted startup; it does not prove distributed recovery or authorize deployment. Deterministic short fingerprints for configured local current/previous secrets are configuration-equality evidence only; they never prove custody, HSM/KMS control, recovery, or secure deletion. Recovery policy declarations (`unavailable`, `operator-provided`, or `external-reference`) expose bounded configuration labels only; unsupported or malformed declarations are invalid and fail readiness closed, while valid labels never verify an operator, custodian, recovery material, or external system. Custody declarations follow the same boundary and always report `verified:false`.

**Local-job-gated** — `POST /jobs`, `POST /jobs/:jobId/claim`, `POST /jobs/:jobId/complete`, and `POST /jobs/:jobId/fail` require `OMEGA_LOCAL_JOB_LEDGER=on`, `OMEGA_LOCAL_JOB_LEDGER_TOKEN`, a matching bearer token, and loopback transport. `GET /jobs` and `GET /jobs/:jobId` use the same token and loopback gate. The ledger is in-memory, bounded, and `durable:false`; it is not a queue, crawler, scheduler, or proof of durable execution.

## What is not gated

**Every other write.** These accept requests from anyone who can reach the
port, regardless of how the three variables are configured:

- `POST /observe`
- `POST /verify`
- `POST /attest`
- `POST /attest/verify`
- `POST /act`
- `POST /learn`
- `POST /recompile`
- `POST /complete-loop`
- `POST /dissensus`

A caller who can reach the service can write into the append-only chain,
authorize actions, and record learnings. `POST /attest/verify` is read-shaped
but is listed here because it is a `POST` and takes no token.

This is defensible for a service intended to sit behind a gateway that
authenticates before it. It is indefensible as an assumption nobody wrote
down, which is what it was until now. **Do not expose this API directly to a
network you do not control.**

## What the loop enforces regardless of tokens

Authorization is not the only control, and these hold with every variable
unset:

- `/act` refuses an attestation whose signature does not verify (**403**)
- `/act` refuses an attestation with no recorded runtime lineage (**404**)
- `/act` refuses an attestation that verified negative (**409**)
- `/act` refuses a `dissensusId` that was never recorded (**404**)
- `/attest/revoke` refuses to revoke twice (**409**) or to revoke something
  never recorded (**404**)
- the attestation service refuses to start without `OMEGA_SIGNING_KEY`

An open write surface is not the same as an unconstrained one. What a caller
cannot do is make the system attest to something it did not verify.

## What is deliberately absent

There are no user accounts, no roles, no per-caller identity beyond the
operator header on revocation, persistence acknowledgement, and persistence re-encryption, and no rate limiting. `x-omega-operator-id` is
an assertion by the caller, checked against an allowlist — it is not
authentication, and the allowlist is the only thing standing behind it.

Recording that these do not exist is the point. A governance document listing
only the controls that are present would describe a stricter system than the
one that runs.

## Symbolic scene simulation

`POST /scene/simulate` is a bounded, unauthenticated local simulation route. It accepts only a bounded seed and step count, emits deterministic trace evidence under `scene-equation.v1`, and always reports `verified:false`. The route, SDK method, CLI command, and dashboard control expose the same boundary: symbolic narrative states are simulation data, not scientific, cosmological, consciousness, sentience, deployment, or external-execution proof.

## Portable runtime smoke evidence

The root `pnpm smoke:api` command is a local reproducibility control. It builds the workspace, starts the compiled API from the `apps/api` package directory, checks health readiness, and exercises the bounded scene route. Its result is evidence that this local compiled package graph served the tested contract under a local signing key with persistence disabled. It is not deployment authorization, distributed readiness, production availability, external custody, backup or replica evidence, or proof that a remote environment runs the same state.

## Coordination declaration boundary

Persistence accepts `local-single-process`, `operator-coordinated`, and `external-coordinator` declarations, requiring a non-empty reference for the latter two. API health/readiness, observability/state, SDK, CLI, dashboard, and operator documentation preserve the same mode, reference, reason, and `verified:false` provenance. Invalid declarations degrade readiness. This evidence does not prove distributed consistency, leader election, replica agreement, global ordering, external coordinator control, or deployment availability.

## Container healthcheck boundary

The published container declares a Docker healthcheck against the unauthenticated `/health` route and fails on an unreachable service or non-2xx response. This is local process and API-probe evidence only; it does not prove deployment availability, replica agreement, persistence durability, external coordination, or production authorization.

## Observation lineage boundary

The Observer and API now preserve optional `parentId` and a bounded `lineage` array of at most 32 non-empty observation identifiers. Invalid lineage input fails closed. This is local predecessor evidence for tracing state transitions; it does not prove causality, distributed ordering, replica agreement, external execution, or truth. The fields remain distinct from verification and attestation.
