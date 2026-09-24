# OceanicOS Living Agnostic Charter — Error Handling and Conflict Resolution

**Module:** Error Handling and Conflict Resolution  
**Status:** Proposed and repository-aligned  
**Version:** 0.1  
**Scope:** Fail-closed handling of uncertainty, disagreement, and recovery

## 1. Purpose

This module defines how OceanicOS responds when a transition fails, evidence is incomplete, or observers disagree. It treats conflict as durable information rather than noise to be hidden. It also prevents recovery mechanisms from converting uncertainty into unsupported certainty.

The protocol applies to API requests, worker leases, observations, evidence probes, attestations, and memory records. It does not require a particular governance model. Voting, consent, hierarchy, and federated review may all be used, provided that authority, evidence, dissent, and unresolved uncertainty remain visible.

> Conflict is not permission to choose a convenient story. It is a state that requires preserved evidence and an accountable next transition.

## 2. Resolution states

Every failure or disagreement MUST enter a named state before a retry, override, or closure is allowed.

| State | Meaning | Execution rule |
|---|---|---|
| `REVIEW` | A human or accountable policy boundary must inspect the transition | No irreversible action until review is complete |
| `DIVERGENT` | Observations or expected and observed states conflict | Preserve both records; do not summarize as success |
| `UNKNOWN` | Evidence is unavailable, inconclusive, or not reproducible | Do not promote the claim to verified reality |
| `NOT_EXECUTED` | Admission, authorization, lease, or execution did not occur | A retry requires a new bounded attempt |
| `RESOLVED` | The conflict has an accepted explanation or next action | Record the decision and its authority |
| `SUPERSEDED` | A later verified record replaces the operational relevance of an earlier one | Preserve the earlier record and link the replacement |

`RESOLVED` does not mean that every interpretation was accepted. It means that the system has recorded the decision, the evidence considered, the authority used, and the remaining limitations.

## 3. Conflict record

A conflict record MUST contain or link to:

- A stable `commandId`, transition identifier, or case identifier.
- The observations, attempts, or records that disagree.
- The observer or system identity for each record.
- Timestamps and runtime context.
- The shared facts that all parties accept, if any.
- The interpretations that remain different.
- The evidence needed to narrow or resolve the disagreement.
- The authority responsible for the next decision.
- A stop condition that prevents unreviewed escalation.
- The final state and any linked replacement or retry.

A conflict record MUST NOT overwrite the original observations. Redaction MAY remove secrets or unnecessary personal data, but it MUST preserve enough provenance to explain what was removed and why.

## 4. Failure classification

Failures are classified by where the transition stopped. Classification determines the permitted recovery path.

### 4.1 Input and identity failures

Malformed identifiers, missing required fields, unknown commands, and invalid scopes MUST fail before worker registration, lease acquisition, or external side effects. The response MUST identify the rejected boundary without exposing secrets.

### 4.2 Authority and policy failures

A capability is not authority. When the requester lacks required authority or the policy denies the transition, the system MUST record `REVIEW` or `NOT_EXECUTED`. A worker MUST NOT reinterpret a denied policy as a temporary infrastructure error.

### 4.3 Capacity, lease, and concurrency failures

A rejected lease or exhausted capacity MUST be recorded separately from a successful lease. The system MUST preserve the winner, rejected attempts, expiry, and release result where those facts are available. It MUST NOT describe one successful lease as proof of global consensus or cross-host coordination.

### 4.4 Persistence failures

When the system cannot write or replay the evidence store, it MUST return an uncertainty result. It MUST NOT claim durable evidence because the in-memory operation appeared successful. Recovery MAY retry after persistence is restored, but the retry MUST be linked to the uncertain attempt.

### 4.5 Reality divergence

When observed reality differs from the expected result, the command MUST become `DIVERGENT` or `UNKNOWN` according to the strength of the observation. The execution record and the reality record remain separate. A later decision may accept the divergence, repair the system, or revise the expectation, but it MUST NOT erase the original mismatch.

## 5. Resolution procedure

A conforming resolution follows this sequence:

```text
DETECT
  → CLASSIFY
  → PRESERVE
  → CONSTRAIN
  → REVIEW
  → TEST OR OBSERVE
  → DECIDE
  → RECORD
  → RECONCILE
```

### 5.1 Detect and classify

The system identifies the first failing boundary and assigns a resolution state. If more than one boundary failed, it records the earliest known cause and keeps later symptoms as linked evidence.

### 5.2 Preserve

The system appends the relevant event or conflict record before attempting recovery whenever persistence is available. It preserves both successful and rejected attempts. A log entry that says only “failed” is insufficient when the system can identify the target, actor, reason, and timestamp.

### 5.3 Constrain

The system stops the affected transition, expires or releases ownership, and prevents recursive retries from expanding scope. A retry budget, lease expiry, or explicit human stop MUST bound recovery.

### 5.4 Review and test

Review identifies the authority allowed to choose among retry, rollback, acceptance of divergence, or closure as unresolved. Tests and new observations should address the smallest uncertainty that can change the decision. A review MUST NOT silently change the original evidence.

### 5.5 Decide and record

The decision record MUST include the selected action, rejected alternatives, evidence considered, authority, timestamp, and remaining limitations. If the conflict remains unresolved, the state remains `UNKNOWN`, `DIVERGENT`, or `REVIEW` rather than being forced into `RESOLVED`.

## 6. Retry and rollback

A retry is a new bounded transition. It MUST have a new attempt identifier or an explicit link to the original attempt, and it MUST re-evaluate authority, policy, capacity, and stop conditions.

A rollback is also a new transition. It requires its own authority and observation path. A rollback MUST NOT be described as proof that the original action had no effect. If rollback cannot be verified, the resulting state remains `UNKNOWN` or `DIVERGENT`.

Automatic retry is permitted only when all of the following hold:

1. The failure class is explicitly retryable.
2. The retry budget is not exhausted.
3. The target scope has not expanded.
4. No human stop or revocation is active.
5. The persistence layer can link the new attempt to the old one.

## 7. Dissent and multi-observer review

When observers disagree, the system MUST preserve each observation rather than selecting the majority by default. A review MAY conclude that one observation is better supported, but it MUST state the evidence and rule used to make that determination.

The protocol permits a final operational decision while retaining unresolved epistemic disagreement. For example, a deployment may be rolled back because risk is unacceptable even when the root cause remains `UNKNOWN`. The operational decision and the epistemic state are separate records.

No participant may be punished for a reproducible dissenting observation. An observation may be rejected as invalid only with a recorded reason tied to the applicable rule or missing evidence.

## 8. API and event mapping

The current repository provides concrete boundaries for this module:

| Conflict-resolution concept | Repository evidence |
|---|---|
| Unknown command rejection | `OMEGA_COMMAND_NOT_FOUND` before coordination probing |
| Review before authorization | `OMEGA_APPROVAL_REQUIRES_REVIEW` |
| Execution requires authority | `OMEGA_EXECUTION_REQUIRES_AUTHORIZATION` |
| Reality observation required | `OMEGA_REALITY_OBSERVATION_REQUIRED` |
| Divergent or unknown reality | `DIVERGENT` and `UNKNOWN` command statuses |
| Lease contention evidence | `worker.lease-acquired` and `worker.lease-rejected` |
| Evidence provenance | `coordination.evidence-recorded` |
| Replayable event trail | `GET /v1/omega/events` |

The route and event names are implementation evidence, not a promise that every future adapter has identical transport semantics. Any adapter must preserve the same state distinctions.

## 9. Machine-readable conflict example

The following record describes an unresolved observation conflict. It is data for review, not an instruction to execute.

```json
{
  "conflictId": "conflict-omega-001",
  "commandId": "omega-change-001",
  "state": "DIVERGENT",
  "sharedFacts": [
    "The command was admitted and execution returned an attestation.",
    "The post-execution observation was collected from the declared runtime."
  ],
  "observations": [
    {
      "observer": "runtime-observer",
      "classification": "DIVERGENT",
      "observedState": "S2",
      "observedAt": "2026-09-24T23:00:00.000Z",
      "evidenceRef": "event:command.reality-observed"
    },
    {
      "observer": "expected-state-record",
      "classification": "EXPECTED",
      "observedState": "S1",
      "evidenceRef": "command:expected-state"
    }
  ],
  "nextEvidence": "Inspect the post-execution state from an independent observer.",
  "authority": "reviewer-required",
  "stopCondition": "Do not retry or publish until the divergence is reviewed."
}
```

## 10. Conformance checklist

An implementation conforms to this module when it can demonstrate that it:

- classifies failures before choosing recovery;
- rejects malformed and unknown requests before side effects;
- preserves successful, rejected, and conflicting observations;
- distinguishes authority failures from infrastructure failures;
- bounds retries, leases, and rollback transitions;
- records the authority and evidence behind a resolution;
- retains unresolved uncertainty instead of fabricating closure;
- permits dissent without deleting the dissenting record; and
- exposes enough provenance for an independent reviewer to reconstruct the conflict.

Conformance is evidence-bound. If an implementation cannot reproduce the required record, it MUST state the limitation and remain in an uncertainty state.

## References

[1]: ../../CHARTER.md "Living Agnostic Charter — Ω∞v Oceanicos"

[2]: ./OCEANICOS-OPERATIONAL-PROTOCOL.md "OceanicOS Living Agnostic Charter — Operational Protocol Specification"

[3]: ../architecture/OCEANICOS-CONSTITUTION.md "OCEANICOS / Ω∞v — Constitutional Integration Map"

[4]: ../VERIFICATION_LOOP.md "Ω∞v Oceanicos Verification Loop"

[5]: ../../apps/api/README.md "Ω∞v Oceanicos REST API Reference"

---

**Module status:** Proposed conflict-resolution operationalization. Runtime behavior, tests, and observed CI records remain authoritative over this document.
