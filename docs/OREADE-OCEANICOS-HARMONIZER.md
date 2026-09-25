# ƆREADE × Ω∞v Oceanicos Harmonizer

**Status:** Repository guidance

## Purpose

This note connects ƆREADE’s symbolic and community-facing language with Ω∞v Oceanicos’s verification ethic. ƆREADE may supply meaning, metaphor, motivation, and Pidgin warmth. Oceanicos supplies bounded scope, authority checks, observable state, evidence, dissent handling, and finite next actions.

The connection is a design language, not a claim that spiritual figures are software agents or that symbolic guidance proves an external event.

## Translation rule

> **Symbolic intent can propose a Drop; only bounded execution and independent observation can establish a result.**

Map requests through:

```text
DROP → DISTINGUISH → VALIDATE → AUTHORIZE → ADMIT → BOUND
→ EXECUTE → OBSERVE → RECONCILE → ATTEST → REMEMBER → NEXT DROP
```

Every executable Drop should identify its intent, requester, target scope, authority, idempotency key, stop condition, expected observation, and evidence path. Evidence answers **who, when, where, what, strength, and limitation**.

## State discipline

| Symbolic statement | Oceanicos treatment |
|---|---|
| “Activate the gods for their people” | Treat as a request to enable clearly bounded community features; do not claim supernatural activation. |
| “The system has done everything” | Require a finite target, execution record, observation, and reconciliation. |
| “The ancestors protect us” | Preserve as cultural or personal meaning; do not present it as a verified security control. |
| “The AI knows the answer” | Label it as generated guidance with model and evidence limits; never treat generation as truth. |
| “All and all” | Translate into explicit scope, affected users, authority, and stop conditions. |

Results remain distinct:

- `VERIFIED`: observed state matches the bounded expectation.
- `DIVERGENT`: observed state conflicts with the expectation; preserve both.
- `UNKNOWN`: evidence is missing or inconclusive; do not promote the claim.
- `NOT_EXECUTED`: rejected, expired, or never admitted.

## Implementation guidance

When extending Oceanicos with ƆREADE-inspired interfaces or language:

1. Keep symbolic content in user-facing copy, prompts, or metadata rather than hidden authority paths.
2. Make permissions, worker scope, leases, stop conditions, and external side effects explicit.
3. Record provenance and limitations without exposing secrets or unnecessary personal data.
4. Preserve dissent and conflicting observations instead of forcing consensus.
5. Add tests for authorization, malformed input, unknown resources, persistence failure, observation divergence, and retry linkage.
6. Update evidence and specifications whenever a protocol boundary changes.

The API exposes `POST /v1/omega/oreade/drop` as a read-only translation boundary. It returns a bounded Drop proposal and a next-action message. It does not create an Omega command, grant authority, acquire a worker lease, execute a side effect, or claim verified reality. The route inherits the API’s existing authentication policy for POST requests.

## Reference alignment

This guidance is subordinate to the repository’s [Living Agnostic Charter](../CHARTER.md) and [Operational Protocol Specification](spec/OCEANICOS-OPERATIONAL-PROTOCOL.md). The companion skill is installed at `/home/ubuntu/skills/oread-pidgin-harmonizer/SKILL.md` for agent-level use.
