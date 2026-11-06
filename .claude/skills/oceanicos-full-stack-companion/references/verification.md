# Verification and Reconciliation

Use this reference when deciding whether a result is verified, supported, divergent, unknown, or not executed.

## Epistemic labels

- **Observed**: directly measured from the current system or a recorded execution result.
- **Stated**: supplied by a person, document, or tool without independent confirmation.
- **Inferred**: reasoned from evidence but not directly observed.
- **Simulated**: produced in a test, mock, sandbox, or model rather than the target reality.
- **Predicted**: expected future behavior.
- **Conflicting**: credible evidence disagrees.
- **Unknown**: insufficient evidence to classify.

## Status rules

| Status | Use when |
|---|---|
| `VERIFIED` | The action was authorized and executed; the relevant effect was observed; evidence is valid and provenance intact; expected≈actual; no critical contradiction remains. |
| `SUPPORTED` | Evidence supports the claim, but one or more verification gates—usually target-runtime observation or complete provenance—remain open. |
| `UNVERIFIED` | A claim or implementation exists, but required evidence is missing. |
| `DIVERGENT` | Actual state or consequence materially differs from expectation. |
| `UNKNOWN` | Available evidence cannot determine the state. |
| `NOT_EXECUTED` | The requested action was not attempted. |
| `DENIED` | Policy, scope, or authority prohibited execution. |
| `REVIEW` | Human decision or additional authorization is required before proceeding. |

## Reconciliation record

For each material transition, record:

```text
id:
subject:
intent:
stateBefore:
evidenceBefore:
authority:
policy:
context:
decision: ALLOW | DENY | REVIEW
authorized:
transition:
stateAfter:
expectedConsequence:
observedConsequence:
status:
evidenceAfter:
attestationId:
provenance:
createdAt:
lineage:
```

Compare `execution receipt + expected state + expected consequence + observed state` by normalizing equivalent representations before comparison. Preserve the original evidence and any contradiction; do not overwrite inconvenient results with a summary.

## Reporting pattern

Use precise language:

- “The command **was executed** and returned …”
- “The test **passed in** …”
- “The deployment **was accepted by** …; runtime health **was not observed**.”
- “The repository **contains** …; production behavior **remains unknown**.”
- “This is an inference based on …, not a verified fact.”
- “Execution was not attempted because …”

Never use a stronger claim than the evidence supports.
