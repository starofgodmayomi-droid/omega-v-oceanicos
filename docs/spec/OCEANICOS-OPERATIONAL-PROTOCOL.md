# OceanicOS Living Agnostic Charter — Operational Protocol Specification

**Module:** Operational Protocols  
**Status:** Proposed and repository-aligned  
**Version:** 0.1  
**Scope:** Bounded transitions through the Ω∞v Oceanicos runtime

## 1. Purpose

This module translates the Living Agnostic Charter into an operational contract. It defines how a localized request, called a **Drop**, may move through the system without turning capability into authority, assertion into evidence, or successful execution into verified reality.

The protocol is implementation-agnostic at the boundary. A deployment may use an API, command-line client, worker process, or another adapter. Every adapter must preserve the same distinctions between intent, authority, execution, observation, reconciliation, and memory.

The protocol does not claim omniscience, universal control, cross-host durability, consensus, or consciousness. It defines a finite transition language for systems that must remain inspectable and accountable.

## 2. Normative terms

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** describe protocol requirements.

A **Drop** is a bounded request to change or inspect a system. A **Current** is the processing path that validates, admits, executes, and observes the request. The **Ocean** is the wider environment whose state may confirm, contradict, or remain silent about the request. These terms are organizational metaphors; they do not grant software agency or authority.

> A protocol result is evidence about a finite transition. It is not a claim about every system that resembles the transition.

## 3. The Drop contract

Every Drop MUST be represented by a request with the following fields or equivalent provenance:

| Field | Requirement | Purpose |
|---|---|---|
| `commandId` or equivalent | Stable and unique within the evidence store | Connects proposal, events, observations, and reconciliation |
| `intent` | Human-readable and bounded | States what the requester wants to learn or change |
| `requestedBy` | Identifies the requesting principal | Preserves accountability for the proposal |
| `workers` or target scope | Explicitly bounded | Prevents silent expansion of the affected surface |
| `idempotencyKey` | Stable for retries | Prevents duplicate proposals from becoming duplicate transitions |
| authority and policy context | Present when the action requires it | Separates permission to act from capability to act |
| stop condition | Defined before execution | Establishes when the transition must halt |
| expected observation | Defined before execution when practical | Makes the result testable rather than rhetorical |

A request that lacks a required field MUST be rejected before it enters worker state or external execution. A system MAY accept a request for further review when it is incomplete, but it MUST label the request as non-executable.

## 4. Lifecycle protocol

The lifecycle is a sequence of finite state transitions. Each transition MUST leave evidence that is sufficient to explain what happened without relying on an unrecorded narrative.

```text
DROP
  → DISTINGUISH
  → VALIDATE
  → AUTHORIZE
  → ADMIT
  → BOUND
  → EXECUTE
  → OBSERVE
  → RECONCILE
  → ATTEST
  → REMEMBER
  → NEXT FINITE DROP
```

### 4.1 Distinguish

The system MUST classify the request before acting. At minimum, it must distinguish an observation, a proposal, an authorization, an execution request, an evidence probe, and a reconciliation request. A capability such as “can write to a database” is not evidence that the write is authorized.

### 4.2 Validate

Validation MUST cover syntax, identity, scope, idempotency, required policy, and known resource existence. Invalid identifiers and unknown resources MUST fail before workers are registered, leases are acquired, or side effects are attempted.

### 4.3 Authorize and admit

Authorization establishes that a principal may request the transition. Admission establishes that the current system is willing and able to execute it under its policy and capacity constraints. These are separate decisions and MUST NOT be inferred from one another.

The API's existing `REVIEW → AUTHORIZED → EXECUTED` path is one concrete implementation of this distinction. A successful admission does not establish that the requested change occurred in reality.

### 4.4 Bound

Before execution, the system MUST record the target, capability, lease or ownership boundary, expiry behavior, and stop condition. A worker MUST NOT continue after its authority or lease expires. Retrying a request MUST produce a new bounded attempt rather than silently extending the old one.

### 4.5 Execute

Execution records what the runtime attempted and what the runtime returned. It MUST NOT be described as verified reality unless an observation and reconciliation step supports that claim.

### 4.6 Observe and reconcile

Observation records the state that was actually inspected, including observer identity, timestamp, context, and evidence path. Reconciliation compares the observation with the expected result and produces one of the following classes:

| Result | Meaning | Permitted next action |
|---|---|---|
| `VERIFIED` | The observation matches the bounded expectation | Record the result and propose the next finite transition |
| `DIVERGENT` | The observation conflicts with the expectation | Preserve both records and require review |
| `UNKNOWN` | Evidence is missing, inconclusive, or unavailable | Do not promote the claim to verified reality |
| `NOT_EXECUTED` | The transition was rejected, expired, or never admitted | Repair or revise the proposal before retrying |

A `DIVERGENT` or `UNKNOWN` result MUST NOT be silently converted into success by a later summary, memory record, or user interface.

### 4.7 Attest and remember

Attestation binds a finding to its evidence, rule version, observer, and time. Memory preserves the result and its provenance for future proposals. Neither attestation nor memory creates authority that was absent from the original transition.

## 5. Evidence protocol

Evidence MUST answer five questions:

1. **Who** observed or performed the transition?
2. **When** did it occur?
3. **Where** or in which runtime context was it observed?
4. **What** exact state or event was recorded?
5. **How strong** is the evidence, and what does it not establish?

Evidence records SHOULD include a stable event type, a command or transition identifier, a timestamp, and a redacted payload appropriate to the audience. Sensitive credentials, secrets, and unnecessary personal data MUST NOT be copied into a public evidence record.

The coordination evidence endpoint demonstrates this boundary. It records a lease lifecycle, replays the same durable SQLite volume, reports the scope `multi-process-single-volume`, and states that the result does not prove cross-host durability, consensus, deployment health, or external coordinator control.

## 6. Authority, consent, and stop conditions

A system MUST identify the authority required for a transition before execution. Human review is required when the consequence, irreversibility, or uncertainty exceeds the configured policy boundary. The protocol does not treat broad user intent as blanket authorization for unrelated operations.

Every executable transition MUST have a stop condition. Examples include lease expiry, capacity exhaustion, policy mismatch, missing evidence, conflicting observation, user revocation, or a bounded attempt count. When a stop condition is reached, the system MUST preserve the partial evidence and transition to a non-executing state.

A rollback MUST be described as a separate transition with its own authority, scope, evidence, and observation. “Undo” is not evidence that the original transition had no consequence.

## 7. Conflict and dissent protocol

Conflict is a recorded state, not a failure of communication to be hidden. When observations disagree, the system MUST:

1. Preserve each observation and its provenance.
2. State which facts are shared and which interpretations differ.
3. Mark the transition `DIVERGENT`, `UNKNOWN`, or `REVIEW` as appropriate.
4. Identify the next evidence needed to resolve or narrow the disagreement.
5. Prevent irreversible execution until the required authority resolves the conflict.

No participant may be penalized merely for producing a reproducible dissenting observation. A dissenting observation may be rejected as unverifiable, but the rejection itself requires a recorded reason and an authority boundary.

## 8. Failure and recovery rules

Failures MUST be observable and replayable. The system MUST distinguish at least these cases:

- **Malformed input:** reject before side effects.
- **Unknown resource:** reject before worker or lease creation.
- **Missing authority:** refuse execution and preserve the proposal for review.
- **Lease conflict:** record the winner and rejected attempt without claiming consensus.
- **Lease expiry:** terminate ownership and requeue or stop according to policy.
- **Persistence failure:** return an uncertainty result rather than claiming durable evidence.
- **Observation divergence:** preserve the execution result and the conflicting reality observation separately.

Recovery MAY retry a bounded transition, but it MUST retain the original attempt and link the retry to it. A retry is not permission to erase an adverse result.

## 9. Runtime mapping

The current repository implements portions of this module as follows:

| Protocol concept | Current implementation evidence |
|---|---|
| Proposal and idempotency | `POST /v1/omega/commands` and the durable command store |
| Review and authorization | `REVIEW → AUTHORIZED` command transitions |
| Execution boundary | `AUTHORIZED → EXECUTED` command transition |
| Reality reconciliation | `POST /v1/omega/commands/:id/observe` and `verify-reality` |
| Durable events | `GET /v1/omega/events` backed by SQLite persistence |
| Worker and lease bounds | Worker registration, exclusive leases, expiry, and release events |
| Coordination evidence | `POST /v1/omega/coordination/evidence` |
| Provenance of accepted evidence | `coordination.evidence-recorded` event |

This mapping is descriptive, not aspirational. A row is an implementation claim only to the extent that the route, source, tests, and CI evidence continue to support it.

## 10. Machine-readable transition example

The following example is illustrative. It is not an authorization token and does not execute an action by itself.

```json
{
  "commandId": "omega-coordination-2026-09-24-001",
  "intent": "Verify exclusive lease behavior on one durable SQLite volume",
  "requestedBy": "verification-suite",
  "workers": ["probe-worker-a", "probe-worker-b"],
  "idempotencyKey": "coordination-evidence-001",
  "authority": {
    "kind": "test-scope",
    "grants": ["register-probe-workers", "acquire-probe-lease", "replay-events"]
  },
  "policy": {
    "maxAttempts": 1,
    "sharedVolumeRequired": true,
    "crossHostClaim": false
  },
  "stopCondition": "Stop after one lease winner, one rejected attempt, release, and replay.",
  "expectedObservation": "Exactly one lease is acquired and the lifecycle is present after reopening the same volume."
}
```

A conforming implementation MUST return the actual observed result and limitations instead of assuming that the expected observation occurred.

## 11. Conformance checklist

An implementation conforms to this module when it can demonstrate, with executable tests or equivalent runtime evidence, that it:

- rejects malformed and unknown requests before side effects;
- separates capability, authority, admission, execution, and verification;
- bounds worker ownership with expiry and explicit release;
- records both successful and rejected attempts;
- replays durable evidence within its declared persistence scope;
- distinguishes `VERIFIED`, `DIVERGENT`, `UNKNOWN`, and `NOT_EXECUTED`;
- preserves dissent and conflicting observations;
- records a redacted provenance event for accepted evidence;
- states what its evidence does not prove; and
- provides a bounded stop or rollback path for every executable transition.

Conformance is a living claim. A later implementation change MUST update the evidence, tests, or this specification when the protocol boundary changes.

## References

[1]: ../../CHARTER.md "Living Agnostic Charter — Ω∞v Oceanicos"

[2]: ../architecture/OCEANICOS-CONSTITUTION.md "OCEANICOS / Ω∞v — Constitutional Integration Map"

[3]: ../VERIFICATION_LOOP.md "Ω∞v Oceanicos Verification Loop"

[4]: ../../apps/api/README.md "Ω∞v Oceanicos REST API Reference"

[5]: ../architecture/OCEAN-POINT-OF-VIEW.md "OCEANICOS — Ocean Point of View"

---

**Module status:** Proposed operationalization of the Living Agnostic Charter. Runtime behavior, tests, and observed CI records remain authoritative over this document.
