# Governance

Who may do what, and — more importantly — what is not protected.

Section XXIX asks that governance itself be versioned and observable. This
document is that record. The routes named below are quoted from
`apps/api/src/route-contract.ts`, the same inventory the compiled route-parity
test holds to the routes Fastify actually registers, so an endpoint that leaves
the runtime leaves this document too.

## The two authentication modes

`OMEGA_AUTH_MODE` is the single switch that decides whether the runtime
authenticates callers at all. It accepts only `local` or `required`; anything
else refuses to start.

| Mode | What it does | Where it is the default |
| --- | --- | --- |
| `local` | No bearer is checked. Every registered route answers anyone who can reach the port. | `NODE_ENV` is not `production` |
| `required` | Every route except `GET /health` demands a bearer. A `GET` needs `OMEGA_READ_TOKEN`; every other method needs `OMEGA_ADMIN_TOKEN`. | `NODE_ENV=production` — the published image sets it explicitly |

`required` refuses to start without both tokens and refuses to start when the
two are identical. Bearers are compared with `timingSafeEqual`. `GET /health`
stays open in both modes so a load balancer can probe it without holding a
credential. `OMEGA_CORS_ORIGINS` must name explicit origins in `required` mode;
`*` is only the local default.

### Controls beyond the mode

| Variable                          | Effect when set                                                                                                                                                              | Effect when unset                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `OMEGA_ADMIN_OPERATOR_ALLOWLIST`  | `POST /attest/revoke`, `POST /persistence/acknowledge`, `POST /persistence/reencrypt`, and `POST /v1/omega/commands/:id/approve` require `x-omega-operator-id` from the list | Any operator identity is accepted                |
| `OMEGA_ADMIN_REQUIRE_ALLOWLIST`   | When `on`, those four routes fail closed unless the allowlist is configured and the identity is listed                                                                       | Allowlist remains optional                       |
| `OMEGA_LOCAL_JOB_LEDGER_TOKEN`    | Every `/jobs` route requires a matching bearer, and that bearer replaces the admin token for those routes                                                                    | `/jobs` falls back to the mode's normal bearer   |
| `OMEGA_PERSISTENCE_DELETION_MODE` | Declares `unlink-only` or `overwrite-unlink`; invalid values degrade readiness and every mode reports `verified:false`                                                       | `unavailable`; no erasure capability is declared |
| `OMEGA_PERSISTENCE_CUSTODY_MODE`  | Declares `unverified-local`, `operator-managed`, `hsm-kms`, or `external-reference`; invalid/reference-less values degrade readiness and every mode reports `verified:false` | `unverified-local`; no custody proof is declared |

The operator allowlist controls default to **off**; `OMEGA_ADMIN_REQUIRE_ALLOWLIST=on`
is an explicit fail-closed hardening decision. `OMEGA_PERSISTENCE_DELETION_MODE`
is a separate local capability declaration and never proves secure erasure,
backup deletion, replica deletion, or custody. `OMEGA_PERSISTENCE_CUSTODY_MODE`
and its bounded reference are declaration evidence only; they never verify an
HSM/KMS, operator, external system, recovery material, or deployment. An
unconfigured deployment is fully open, and that is a deployment decision rather
than a safe default. It is stated here rather than discovered.

## What is gated

**Read-gated** — in `required` mode, every `GET` other than `/health` needs
`OMEGA_READ_TOKEN`. This covers the whole read surface: the ecosystem body, the
ledger tip, the SSE stream, mood, navigator evidence, mesh, persistence status,
attestation policy and revocations, and the Ω command read routes.

**Admin-gated** — in `required` mode, every non-`GET` needs
`OMEGA_ADMIN_TOKEN`. That includes `POST /v1/cycle`, `POST /v1/pipeline`,
`POST /v1/attest`, the value-navigator proposals, the Ω command lifecycle
writes, worker registration and leases, connector observation, and the
persistence and revocation mutations. The four mutations named in the table
above additionally require the operator allowlist.

Approval only advances a `PROPOSED` or `REVIEW` command to `AUTHORIZED`; it does
not execute the command. Revocation changes what an existing attestation means;
persistence acknowledgement records a human review event and does not change
readiness or claim repair; re-encryption rewrites authenticated local ciphertext
only after complete previous-key evidence, records non-secret counts and
key-source provenance, and uses a local transaction journal to reconcile or
block interrupted startup; it does not prove distributed recovery or authorize
deployment. Deterministic short fingerprints for configured local
current/previous secrets are configuration-equality evidence only; they never
prove custody, HSM/KMS control, recovery, or secure deletion. Recovery policy
declarations (`unavailable`, `operator-provided`, or `external-reference`)
expose bounded configuration labels only; unsupported or malformed declarations
are invalid and fail readiness closed, while valid labels never verify an
operator, custodian, recovery material, or external system. Custody declarations
follow the same boundary and always report `verified:false`.

**Local-job-gated** — `/jobs`, `/jobs/:jobId`, and the claim, complete, and fail
mutations require `OMEGA_LOCAL_JOB_LEDGER=on`. When
`OMEGA_LOCAL_JOB_LEDGER_TOKEN` is configured it is the only credential those
routes accept, in either mode: the admin bearer is rejected there, and the job
token is rejected everywhere else. When no job token is configured the routes
fall back to the mode's normal bearer, so they are never left open by
`required` mode. A job ledger configured with a storage path and key is
encrypted and portable across a process restart; without that pair it is
in-memory and `durable:false`. It is not a queue, crawler, scheduler, or proof
of durable execution.

## What is not gated

**`local` mode.** Everything above assumes `required`. With `OMEGA_AUTH_MODE=local`
— the default whenever `NODE_ENV` is not `production` — no bearer is checked on
any route, and a caller who can reach the port can:

- record attestations and cycles (`POST /v1/attest`, `POST /v1/cycle`)
- run the bounded pipeline (`POST /v1/pipeline`)
- create and advance value-navigator proposals
- create, admit, approve, execute, observe, and verify Ω commands
- register workers, heartbeat, and take leases
- start and stop the miner (`POST /v1/miner/start`, `POST /v1/miner/stop`)
- mint and verify block signatures (`POST /v1/auth/keypair`, `POST /v1/block/sign`, `POST /v1/block/verify-signature`)
- record mood codex decisions and connector observations
- acknowledge, re-encrypt, and revoke (`POST /persistence/acknowledge`, `POST /persistence/reencrypt`, `POST /attest/revoke`) — subject only to the operator allowlist when it is configured

Job routes are the exception that still applies in local mode: a configured
`OMEGA_LOCAL_JOB_LEDGER_TOKEN` is enforced there in both modes.

This is defensible for a service intended to sit behind a gateway that
authenticates before it, or on a developer machine that already exposes no
other port. It is indefensible as an assumption nobody wrote down, which is
what it was until now. **Do not expose this API directly to a network you do
not control without `OMEGA_AUTH_MODE=required`.**

## What the loop enforces regardless of tokens

Authorization is not the only control, and these hold with every variable
unset:

- `POST /v1/pipeline` rejects caller-supplied admission gates with
  `400 PIPELINE_ADMISSION_EVIDENCE_NOT_ACCEPTED` and runs nothing
- `POST /v1/omega/connectors/observe` rejects caller-supplied admission and
  execution fields and does not call an adapter or the journal
- `POST /v1/omega/commands/:id/verify-reality` rejects a client verdict; it can
  only read a stored, independently observed result
- `POST /attest/revoke` refuses to revoke twice (**409**) or to revoke
  something never recorded (**404**)
- the attestation service refuses to start without `OMEGA_SIGNING_KEY`
- `POST /v1/pipeline` is rate limited to 10 requests per minute, and the Ω
  command, worker, and connector routes carry their own bounded per-route
  limits

An open write surface is not the same as an unconstrained one. What a caller
cannot do is make the system attest to something it did not verify.

## What is deliberately absent

There are no user accounts, no roles, no per-caller identity beyond the
operator header on revocation, persistence acknowledgement, persistence
re-encryption, and Ω command approval, and no audit of who held a bearer token.
`x-omega-operator-id` is an assertion by the caller, checked against an
allowlist — it is not authentication, and the allowlist is the only thing
standing behind it. Rate limiting exists only on the Ω command, worker, and
connector scopes and on `POST /v1/pipeline`; the remaining routes are
unthrottled.

Recording that these do not exist is the point. A governance document listing
only the controls that are present would describe a stricter system than the
one that runs.

## Portable runtime smoke evidence

The root `pnpm smoke:api` command is a local reproducibility control. It builds
the workspace, starts the compiled API from the `apps/api` package directory,
checks `/health`, reads the ledger tip and mood routes, and verifies that
`/v1/stream` emits `TIP` and `BLOCK_MINTED` frames. Its result is evidence that
this local compiled package graph served the tested contract under a local
signing key with persistence disabled. It is not deployment authorization,
distributed readiness, production availability, external custody, backup or
replica evidence, or proof that a remote environment runs the same state.

## Coordination declaration boundary

Persistence accepts `local-single-process`, `operator-coordinated`, and
`external-coordinator` declarations, requiring a non-empty reference for the
latter two. API health/readiness, observability/state, SDK, CLI, dashboard, and
operator documentation preserve the same mode, reference, reason, and
`verified:false` provenance. Invalid declarations degrade readiness. This
evidence does not prove distributed consistency, leader election, replica
agreement, global ordering, external coordinator control, or deployment
availability.

## Container healthcheck boundary

The published container declares a Docker healthcheck against the
unauthenticated `/health` route and fails on an unreachable service or non-2xx
response. This is local process and API-probe evidence only; it does not prove
deployment availability, replica agreement, persistence durability, external
coordination, or production authorization.

## Observation lineage boundary

The Observer and API preserve optional `parentId` and a bounded `lineage` array
of at most 32 non-empty observation identifiers. Invalid lineage input fails
closed. This is local predecessor evidence for tracing state transitions; it
does not prove causality, distributed ordering, replica agreement, external
execution, or truth. The fields remain distinct from verification and
attestation.

## Strict operator identity source boundary

When `OMEGA_ADMIN_OPERATOR_ALLOWLIST` is configured, the three
persistence/revocation mutations and Ω command approval require a matching
`x-omega-operator-id`; `OMEGA_ADMIN_REQUIRE_ALLOWLIST=on` also fails closed if
the list is missing. A JSON body operator cannot substitute for the dedicated
header when the allowlist policy is active. Without the policy, legacy body
fallback remains for compatibility. The header is still a caller assertion
checked against the configured allowlist, not authentication, identity
proofing, or evidence of the human behind the request. The dashboard and SDK
use the labels `dashboard-operator` and `sdk-operator` by default; deployments
enabling the allowlist must configure the labels their clients use.

## Pipeline admission boundary

`POST /v1/pipeline` is open when auth mode is local. Fields named
authorityVerified or policySatisfied inside the request admission object are
not authority. If either is present the route returns 400
PIPELINE_ADMISSION_EVIDENCE_NOT_ACCEPTED and does not run. With those fields
absent, admission evidence comes only from the server pipelineAdmissionEvidence
option supplied to createApp. That option is not read from the request, the
environment, or an admin bearer token. When it is absent, the route still
compiles and can return a water-flow prefix, then the existing gate returns
DENY. The response is halted at ADMIT with haltReason DENIED, authorized false,
and no execution, attestation, or reality verification. A thrown or malformed
server resolver returns 403 PIPELINE_ADMISSION_EVIDENCE_UNAVAILABLE and does not
run. handlerStateAfter does not execute unless that server evidence allows the
transition. A dry run is a kernel execution barrier:
resolveBoundedWorkerHandler returns DRY_RUN before a caller-supplied handler or
the local default handler can run. Compile, validate, admit, and the bounded
water-flow prefix still run. A dry run is not an external simulation.

`POST /v1/omega/connectors/observe` follows the same rule for connector
admission and execution. Request fields named authorityVerified,
policySatisfied, or approvalVerified are not authority. If any of them is
present the route returns 400 CONNECTOR_ADMISSION_EVIDENCE_NOT_ACCEPTED and
does not observe. A request field named execution is not an observation. If it
is present the route returns 400 CONNECTOR_EXECUTION_NOT_ACCEPTED and does not
call the admission resolver, the live adapter, or the journal. Admission
evidence comes only from the server connectorAdmissionEvidence option passed to
createApp. When that option is absent, the route denies admission and does not
call a live adapter. The only HTTP execution is the server-side
github-public-repository adapter, and only after admission. A degraded local
journal still fails before the client-field checks.

## Ω command lifecycle governance

The `/v1/omega/commands` lifecycle records human intent, worker attribution,
ΩIR, evidence, authority, policy, approval, execution, attestation, provenance,
and reality observation as separate states. `DENY` and `REVIEW` never execute.
Approval does not claim success; execution does not claim reality; observation
does not become proof without defined evidence.

`POST /v1/omega/commands/:id/observe` accepts only a caller-supplied
`observedState`. A string that matches the executor's recorded `stateAfter` is
stored as `comparison: MATCH` with `observationSource: caller-supplied` and
`independentObservation: false`. The command status stays `UNKNOWN`. It does
not become `VERIFIED`. A different non-empty string remains `DIVERGENT`. There
is no server-side reality observer on this route.

`POST /v1/omega/commands/:id/verify-reality` does not accept a client verdict.
Fields named `verified`, `classification`, `observedState`,
`independentObservation`, `comparison`, or `observationSource` return
`400 REALITY_VERIFICATION_CLAIM_NOT_ACCEPTED` and do not write. With no stored
reality the route returns `409 OMEGA_REALITY_OBSERVATION_REQUIRED`. A stored
caller-supplied match, an unknown observation, or a divergence returns
`409 COMMAND_REALITY_NOT_INDEPENDENTLY_VERIFIED`. `success: true` requires the
stored command status and classification to already be `VERIFIED` with
`independentObservation` not `false`. This route does not create that state.

The first worker registry enables only observer, researcher, planner, tester,
security-reviewer, and governance-reviewer. Arbitrary shell, credentials,
remote mutation, finance, broad publication, deployment, and hidden autonomous
loops remain disabled. Dissent and conflicting evidence are retained rather
than silently collapsed.
