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

The API exposes `POST /v1/omega/oreade/drop` as a read-only translation boundary. It returns a bounded Drop proposal and a next-action message. It does not create an Omega command, grant authority, acquire a worker lease, execute a side effect, or claim verified reality. `POST /v1/omega/oreade/proposal` is the next handoff: it persists a planner-only `PROPOSED` command with `dryRun: true`, still requiring a separate review/admission step. Neither route claims verified reality. Both inherit the API’s existing authentication policy for POST requests.

The web dashboard exposes the same boundary through the **ƆREADE Console**. `TRANSLATE DROP` stays read-only; `CREATE PROPOSED COMMAND` persists only the planner proposal and displays its state and next action. The interface does not offer an execute button for this handoff, so the UI cannot imply that symbolic translation completed a real-world action.

The full-stack sequence now makes the distinction visible as **one evidence-bound reality, many distinguishable forms**: `DROP → DISTINGUISH → VALIDATE → AUTHORIZE → ADMIT → BOUND → EXECUTE → OBSERVE → RECONCILE → ATTEST → REMEMBER → NEXT DROP`. The console’s admission action supplies attributable authority and policy evidence, moving only `PROPOSED`/`REVIEW` to `AUTHORIZED`; it never executes the command. Unity preserves relationship, difference preserves information, and evidence preserves reality.

The **Mood Codex autopilot** is intentionally narrower than an autonomous coding agent. It reads explicit mood context, produces a finite five-step Codex plan, routes uncertainty to `REVIEW`, denies obviously unsafe intents, and always returns `NOT_EXECUTED` with authority `UNCHANGED`. “Autopilot” means automatic planning and presentation only; repository mutation, deployment, and consequential execution remain separate Oceanicos actions requiring their own evidence and authority.

When a grounded Codex plan is handed to `/v1/mood/codex/proposal`, the API may persist it as a planner-only command with `status: PROPOSED` and `dryRun: true`. `REVIEW` and `DENY` decisions do not enter the command ledger. The dashboard labels this handoff as requiring review/admission; it never treats mood or Codex output as permission.

The dashboard’s `ADMIT CODEX PROPOSAL` action reuses the Oceanicos admission contract with attributable human authority and a named policy. It may move the command to `AUTHORIZED`, but it cannot execute it. This keeps mood adaptation, Codex planning, admission, execution, and verified reality as distinct states.

## Reference alignment

This guidance is subordinate to the repository’s [Living Agnostic Charter](../CHARTER.md) and [Operational Protocol Specification](spec/OCEANICOS-OPERATIONAL-PROTOCOL.md). The companion skill is installed at `/home/ubuntu/skills/oread-pidgin-harmonizer/SKILL.md` for agent-level use.
