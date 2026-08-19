# Governance

Who may do what, and — more importantly — what is not protected.

Section XXIX asks that governance itself be versioned and observable. This
document is that record, and a test holds it to the routes the API actually
registers, so it cannot quietly fall behind the code.

## The three controls

| Variable                         | Effect when set                                                                           | Effect when unset                 |
| -------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| `OMEGA_READ_TOKEN`               | Every `GET` except `/health` requires a matching bearer token                             | All reads are open                |
| `OMEGA_ADMIN_TOKEN`              | `POST /attest/revoke` and `POST /persistence/acknowledge` require a matching bearer token | Those mutations need no token     |
| `OMEGA_ADMIN_OPERATOR_ALLOWLIST` | Both admin mutations require `x-omega-operator-id` from the list                          | Any operator identity is accepted |

Tokens are compared with `timingSafeEqual`. All three default to **off**: an
unconfigured deployment is fully open, and that is a deployment decision
rather than a safe default. It is stated here rather than discovered.

## What is gated

**Read-gated** — every `GET` other than `/health`, when `OMEGA_READ_TOKEN` is
set. `/health` stays open so a load balancer can probe it without holding a
credential.

**Admin-gated** — `POST /attest/revoke` and `POST /persistence/acknowledge`, by token and by operator identity. Revocation changes what an existing attestation means; persistence acknowledgement records a human review event and does not change readiness or claim repair.

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
operator header on revocation and persistence acknowledgement, and no rate limiting. `x-omega-operator-id` is
an assertion by the caller, checked against an allowlist — it is not
authentication, and the allowlist is the only thing standing behind it.

Recording that these do not exist is the point. A governance document listing
only the controls that are present would describe a stricter system than the
one that runs.
