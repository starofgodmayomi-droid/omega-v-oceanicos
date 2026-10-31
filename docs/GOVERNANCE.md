# Governance

Who may do what, and — more importantly — what is not protected.

Section XXIX asks that governance itself be versioned and observable. This
document is that record, and a test holds it to the route inventory in
`apps/api/src/route-contract.ts`, so it cannot quietly fall behind the code.

## The controls

| Variable                        | Effect when set                                                                                                             | Effect when unset                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `OMEGA_AUTH_MODE`               | `required` gates every route except `/health`; `local` gates nothing                                                        | `local` outside production, `required` when `NODE_ENV=production`    |
| `OMEGA_READ_TOKEN`              | In `required` mode, every `GET` except `/health` needs this bearer token                                                    | Required mode refuses to start                                       |
| `OMEGA_ADMIN_TOKEN`             | In `required` mode, every write needs this bearer token                                                                     | Required mode refuses to start                                       |
| `OMEGA_LOCAL_JOB_LEDGER_TOKEN`  | `/jobs*` additionally requires this bearer token                                                                            | Job routes need only the mode-level token                            |
| `OMEGA_ALLOW_UNSIGNED_CYCLE`    | `true` lets `POST /v1/cycle` run without an asymmetric signature                                                            | Every cycle must carry a valid `x-omega-signature`/`x-omega-public-key` pair |
| `OMEGA_SIGNING_KEY`             | Enables `POST /v1/attest` (HMAC-SHA256, at least 32 characters)                                                             | Attestation answers `503 ATTESTATION_SIGNING_KEY_REQUIRED`           |
| `OMEGA_PERSISTENCE_DELETION_MODE` | Declares `unlink-only` or `overwrite-unlink`; invalid values degrade readiness                                              | `unavailable`; no erasure capability is declared                     |
| `OMEGA_PERSISTENCE_CUSTODY_MODE`  | Declares `unverified-local`, `operator-managed`, `hsm-kms`, or `external-reference`; invalid values degrade readiness       | `unverified-local`; no custody proof is declared                     |

`OMEGA_AUTH_MODE` is the only switch that decides whether tokens matter at
all. In `required` mode the two tokens must both be present and must differ,
and an unset or malformed value fails startup rather than falling open.
Tokens are compared byte-for-byte after the `Bearer ` prefix is stripped.

Deletion and custody declarations are configuration evidence only. They never
prove secure erasure, backup or replica deletion, an HSM/KMS, a custodian, or
recovery material.

## What is gated

**Read-gated** — in `required` mode, every `GET` other than `/health`.
`/health` stays open so a load balancer can probe it without a credential.

**Admin-gated** — in `required` mode, every `POST`. Revocation changes what an
existing attestation means; persistence acknowledgement records a human review
event; persistence re-encryption rewrites authenticated local ciphertext only
after complete previous-key evidence and refuses otherwise.

**Local-job-gated** — `POST /jobs`, `POST /jobs/:jobId/claim`,
`POST /jobs/:jobId/complete`, and `POST /jobs/:jobId/fail` need
`OMEGA_LOCAL_JOB_LEDGER=on`, answer `503 LOCAL_JOB_LEDGER_DISABLED` when it is
off, and require `OMEGA_LOCAL_JOB_LEDGER_TOKEN` when that variable is set. The
same gate covers `GET /jobs` and `GET /jobs/:jobId`. The ledger is bounded and
local; it is not a queue, scheduler, or proof of durable execution.

## What is not gated

In `local` mode (the default outside production) **every route above is open**
to anyone who can reach the port, including these writes:

- `POST /v1/attest`
- `POST /v1/cycle`
- `POST /v1/pipeline`
- `POST /v1/reality/step`
- `POST /v1/reality/run`
- `POST /v1/omega/commands`
- `POST /v1/omega/commands/:id/admit`
- `POST /v1/omega/commands/:id/approve`
- `POST /v1/omega/commands/:id/execute`
- `POST /v1/omega/commands/:id/observe`
- `POST /v1/omega/commands/:id/verify-reality`
- `POST /v1/omega/workers/register`
- `POST /v1/omega/workers/:workerId/heartbeat`
- `POST /v1/omega/workers/:workerId/lease`
- `POST /v1/omega/workers/:workerId/lease/:leaseId/release`
- `POST /v1/miner/start`
- `POST /v1/miner/stop`
- `POST /v1/auth/keypair`
- `POST /v1/block/sign`
- `POST /v1/block/verify-signature`
- `POST /attest/revoke`
- `POST /persistence/acknowledge`
- `POST /persistence/reencrypt`
- `POST /jobs` and the job lifecycle writes

A caller who can reach a `local`-mode service can mint blocks, record
attestations, drive the reality loop, and revoke attestations. That is
defensible for a service bound to a developer machine or sitting behind a
gateway that authenticates first. It is indefensible as an assumption nobody
wrote down, which is what it was until now. **Do not expose this API directly
to a network you do not control.**

## What the loop enforces regardless of tokens

Authorization is not the only control, and these hold with every variable
unset:

- `POST /v1/attest` refuses to sign without a sufficiently strong
  `OMEGA_SIGNING_KEY` (**503**)
- `POST /v1/cycle` refuses an incomplete signature pair (**400**) and an
  invalid signature (**401**) unless unsigned cycles are explicitly allowed
- `POST /attest/revoke` refuses to revoke twice (**409**) and refuses a
  malformed request (**400**)
- `POST /v1/pipeline` refuses a missing compile, admission, authority, or
  policy block (**400**), and refuses to claim durable memory when the causal
  memory key is unset (**503**)
- `POST /v1/reality/step` halts on an unverified observation instead of
  committing it to `Σ`

An open write surface is not the same as an unconstrained one. What a caller
cannot do is make the system attest to something it did not verify.

## What is deliberately absent

There are no user accounts, roles, per-caller identity, or rate limiting.
`x-omega-operator-id` is an assertion by the caller and is recorded, not
authenticated. Recording that these do not exist is the point: a governance
document listing only the controls that are present would describe a stricter
system than the one that runs.

## Portable runtime smoke evidence

The root `pnpm smoke:api` command builds the workspace, starts the compiled
API, checks `/health`, reads the ledger tip and mood routes, and verifies that
`/v1/stream` emits `TIP` and `BLOCK_MINTED` frames. Its result is evidence
that the local compiled package graph served the tested contract under a local
signing key with persistence disabled. It is not evidence of deployment,
production hardening, distributed durability, or external verification.
