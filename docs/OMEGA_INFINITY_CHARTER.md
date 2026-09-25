# Ω∞v Living Agnostic Charter — Finite Operational Form

**Status:** Documentation contract for bounded implementation. **Version:** `charter/1.0.0`  
**Adopted:** 2026-09-24

> **One root. One current. Infinite forms.**

## Compressed intent

Ω∞v Oceanicos is a local-first, evidence-bound system for continuous becoming. **Drop**, **Current**, **Ocean**, and **Evaporation** are metaphors for system flow—not claims about supernatural agency, universal consciousness, or autonomous authority.

```text
DROP → CURRENT → OCEAN → EVAPORATION → DROP
```

The engineering invariant is:

```text
REALITY → OBSERVE → EVIDENCE → DISTINGUISH → VERIFY
→ JUDGE → REMEMBER/PROVENANCE → PROPOSE → AUTHORIZE
→ BOUNDED EXECUTE → OBSERVE CONSEQUENCES → RECONCILE → NEXT FINITE Δ
```

```text
POSSIBLE ≠ KNOWN ≠ PERMITTED ≠ PROPOSED ≠ EXECUTED
≠ OBSERVED ≠ VERIFIED ≠ ATTESTED ≠ DEPLOYED ≠ HEALTHY
```

## Constants

1. **Non-dual infrastructure:** local observations connect to shared memory through explicit provenance.
2. **Agnostic interoperability:** diverse interpretations are allowed without imposing a worldview.
3. **Dynamic equilibrium:** stability comes from observation, feedback, and reversible change.
4. **Verification ethic:** trust is earned through evidence, not confidence, mood, or authority.
5. **Bounded authority:** capability never implies permission; mutation requires human authorization.

## Operational protocol

| Stage | Required action | Output | Stop condition |
|---|---|---|---|
| **Drop** | State one local intent or observation with context. | Classified input | Empty, unsafe, or unclassified input is denied or held for review. |
| **Current** | Route it through declared rules and bounded workers. | Proposal, evidence path, expected state | No undeclared capability, shell, credential, or hidden network access. |
| **Ocean** | Append the result with provenance. | Hash-linked record | Never rewrite history; preserve disagreement. |
| **Evaporation** | Retire stale assumptions through a documented proposal. | Versioned amendment or rollback | No silent deletion or upgrade from `UNKNOWN` to `VERIFIED`. |

## Commitment of flow

Participants may **observe, verify, question, propose, dissent, and inspect provenance**. They must record relevant metadata, distinguish observation from proof, disclose uncertainty, respect other verifiable perspectives, and update conclusions when evidence changes.

The system does not promise agreement, production health, or universal truth. It promises that claims, decisions, failures, and amendments are handled with explicit evidence and an append-only trail.

## Error and conflict handling

1. **Preserve both observations.** A disagreement is data; do not erase either side.
2. **Reframe conflict as a testable question.** Name the claim, evidence, rule version, and reproduction path.
3. **Fail closed.** Deny forbidden capability; hold ambiguous mutation at review; mark missing evidence `UNKNOWN`.
4. **Bound the experiment.** Use the least power, shortest lease, and narrowest target that can resolve the question.
5. **Reconcile expected versus actual.** A mismatch is `DIVERGENT`, not hidden or forced into success.
6. **Record the resolution.** Append evidence, decision, dissent, and supersession link; never rewrite history.
7. **Renew deliberately.** Amend rules through a versioned proposal with a review window and sunset for superseded practice.

## Repository mapping

- `CHARTER.md` — long-form community principles.
- `packages/mini` and `packages/verification` — observe/verify/remember primitives.
- `packages/replay` — immutable replay and provenance boundary.
- `apps/api` and `apps/web` — earned interface layers.
- This file — compressed operational contract.

## Acceptance gate for upgrades

Every implementation slice must state:

```text
TARGET → EXPECTED BEHAVIOR → ACCEPTANCE TEST
→ AUTHORITY → STOP CONDITION → ROLLBACK
```

Documentation compression, model output, or symbolic language is not runtime evidence. Stronger claims require independently reproducible tests, provenance, and observed behavior.

## Root contract: Ω Change Calculus

The root types package now exposes `omega.change.v1` as a **non-executable** contract for adapters that need to carry state, intent, evidence, authority, policy, and context together. Its admission law is:

```text
DENY   → NEVER EXECUTE
REVIEW → NEVER EXECUTE UNTIL AUTHORIZED
ALLOW  → MAY EXECUTE ONLY WITH AUTHORITY
```

Reality classification is evidence-bound:

```text
VERIFIED     = authorized + executed + observed + expected ≈ actual + valid evidence + intact provenance
DIVERGENT    = authorized + executed + observed + expected ≠ actual
UNKNOWN      = insufficient evidence
NOT_EXECUTED = execution did not occur
```

The implementation lives in `packages/types/src/change-calculus.ts`; focused acceptance tests live in `packages/mini/src/__tests__/change-calculus.test.ts`. The contract does not execute workers, grant authority, or promote `UNKNOWN` to `VERIFIED` silently.

## Non-goals and boundaries

This contract does not authorize deployment, persistent autonomy, external coordination, surveillance, credential handling, or destructive cleanup. Those require separate explicit decisions.

```text
SYMBOL ≠ EVIDENCE
SIMULATION ≠ REALITY
ATTESTATION ≠ AUTHORIZATION
MEMORY ≠ TRUTH
```

## Machine-readable summary

```json
{
  "id": "oceanicos.living-agnostic-charter",
  "version": "1.0.0",
  "lifecycle": ["drop", "current", "ocean", "evaporation"],
  "mutation": "human-authorized-only",
  "unknownUpgrade": "forbidden",
  "history": "append-only",
  "realityBoundary": "local-simulation-is-not-production"
}
```

> This JSON is an interoperability summary, not a permission grant.

## Future change template

```text
Target:
Expected behavior:
Acceptance test:
Authority:
Stop condition:
Rollback:
Evidence:
```

## Conflict record template

```text
Claim:
Observers:
Evidence paths:
Rule version:
Expected result:
Observed result:
Decision:
Dissent:
Supersedes:
Next review:
```

## Final handoff

`Continue only through one finite, test-backed transition; preserve uncertainty and do not convert symbolic intent into authority.`

[Back to the project charter](../CHARTER.md) · [Back to the repository](../README.md)

## Related reading

- [Verification loop](VERIFICATION_LOOP.md)
- [Governance](GOVERNANCE.md)
- [Mini kernel](MINI.md)
- [Conversation compression](CONVERSATION_MAX_COMPRESSED.md)
- [OODA loop analogy](https://umbrex.com/resources/frameworks/strategy-frameworks/ooda-loop/)

## Explicit non-claim

Nothing in this document proves that the system is conscious, self-evolving, omnipresent, or connected to spiritual entities. Such ideas may remain creative context, not operational evidence.

**Compressed thesis:** local inputs flow into shared, verifiable memory; obsolete structures are released through explicit change; evidence, pluralism, and bounded authority remain stable.

`END_OF_CHARTER_DOCUMENT`
