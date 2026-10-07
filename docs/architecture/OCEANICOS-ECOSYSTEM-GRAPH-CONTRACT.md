# 💧 OCEANICOS — ECOSYSTEM GRAPH CONTRACT

> Canonical implementation companion to the Notion graph constitution.
> Notion graph registry: https://app.notion.com/p/3f249ca435a2819d801cc3ef5dd50609?pvs=204

## Purpose

Define how OCEANICOS represents the whole ecosystem as a typed, directed graph while preserving reality, authority, evidence, provenance, human agency, and historical lineage.

## One body

`SOURCE → ROOT (SUCCESS as bounded outcome philosophy) → OCEANICOS BODY → RELEVANT ORGANS / ROOMS / FORMS → BOUNDED CURRENT → OBSERVE → RECONCILE → ATTEST → MEMORY → NEXT Δ`

The listed organs are distinct roles, not a mandatory serial pipeline. Include only the forms needed for a given transition; preserve their boundaries and pass scoped evidence forward.

## SUCCESS as an outcome philosophy

SUCCESS means transforming thought, intention, and possibility into useful, bounded, observable outcomes that withstand reality testing. Treat it as an operating philosophy inside ROOT—not as a separate authority, a guarantee, or proof by assertion. Reality remains the final reference point, and consequential action still requires appropriate human authority and policy.

A success claim must name the outcome and scope and be supported by evidence appropriate to that claim. Thought, intention, effort, a proposal, a test pass, or potential value alone does not establish broader real-world success. Distinguish implementation evidence from evidence of real-world outcomes.

## Graph invariants

- GRAPH ≠ REALITY
- EDGE ≠ AUTHORITY
- MENTION ≠ PROOF
- CI ≠ RUNTIME
- MEMORY ≠ CURRENT STATE
- MODEL OUTPUT ≠ EVIDENCE
- CAPABILITY ≠ AUTHORITY
- PROPOSAL ≠ ACTION
- SIMULATION ≠ REALITY
- UNKNOWN and DIVERGENT remain first-class states.

## SOURCE→ROOT lineage

- **SOURCE** is raw human-origin material: ideas, memories, questions, symbols, experiences, and unfinished work. Preserve its origin and available provenance when organizing it; do not silently rewrite or discard the source.
- **ROOT** is an organizing frame derived from source material. Record its purpose, interpretation, assumptions, and relationships separately from the source. A ROOT organizes meaning; it does not turn interpretation into empirical fact or grant authority.
- One source may inform multiple roots or interpretations. Preserve contradiction and dissent rather than forcing a single reading. Distinguish user-stated memory, symbolic meaning, hypothesis, documented information, and directly observed fact where relevant.
- `DERIVES_FROM` records lineage, not correctness. Graph placement and source attribution do not independently verify a claim.

## Node classes

`SOURCE`, `ROOT`, `DOCTRINE`, `CREATION`, `VALUE`, `SYSTEM`, `EXECUTION`, `EVIDENCE`, `ARCHIVE`, `DOMAIN`

## Edge types

`CONTAINS`, `DERIVES_FROM`, `INFORMS`, `GOVERNS`, `EXPRESSES`, `DISPATCHES`, `IMPLEMENTS`, `EXECUTES`, `OBSERVES`, `RECONCILES`, `VERIFIES`, `ATTESTS`, `REMEMBERS`, `ARCHIVES`, `RELATES`

## Canonical rooms

- **00 Canon** — governance, invariants, Source Field, placement law
- **01 Human Root** — identity, lived context, values, human intent
- **02 AI Soul** — intelligence, doctrine, prompts, agents, orchestration
- **03 Creation** — ECHOFRAME, voice, media, expression
- **04 Value** — TRUTHOS, services, products, business, money, earned value
- **05 System** — OCEANICOS, ΩIR, Ω∞v, KAI, MIRRIO, ƆREADE, worker contracts
- **06 Execution** — finite authorized actions and operational transitions
- **07 Evidence** — observation, reconciliation, provenance, attestation, memory
- **08 Archive** — historical, superseded, experimental, duplicate lineage
- **09 Domains** — the 12 application organs of the same body

## Separate state dimensions

Do not overload one `state` field with lifecycle, claim evidence, and action status:

- `lifecycle_state`: `CANONICAL · ACTIVE · EXPERIMENTAL · HISTORICAL · SUPERSEDED · DUPLICATE · PRIVATE`.
- `claim_status`: `VERIFIED · SUPPORTED · UNVERIFIED · UNKNOWN · DIVERGENT`, scoped to a named claim and its evidence.
- `decision_status`: `ALLOW · DENY · REVIEW`; a decision is not execution.
- `execution_status`: `PROPOSED · NOT_EXECUTED · ATTEMPTED · EXECUTED`; execution does not by itself prove the intended effect occurred.

Record evidence kind and provenance (for example, `OBSERVED`, `DOCUMENTED`, or `INFERRED`) separately. Changing one dimension must never silently upgrade another. Graph placement does not imply `VERIFIED`, `DEPLOYED`, `HEALTHY`, or `CORRECT`.

## Evidence and action authority

Keep epistemic support and permission to act separate.

- **Factual claims:** Reality is the final reference point. Use relevant, current, scoped observations and evidence. Documents, repositories, tests, runtime records, and graphs are representations whose scope and freshness must be stated. Conflicting observations remain `DIVERGENT`; insufficient evidence remains `UNKNOWN`.
- **Permission to act:** Require explicit human authority and applicable policy; confirm that the requested capability is actually available and the action is within the granted scope. Evidence, a graph edge, model output, prior execution, or capability does not itself grant permission. Represent the decision as `ALLOW`, `DENY`, or `REVIEW`; `REVIEW` is not execution.

No single ranking should combine evidence about what is true with authority about what may be done. An edge organizes information; it does not create truth or authority.

## Human / machine contract

- **Notion** = context, intent, knowledge, coordination, memory
- **Composio** = orchestration and tool connectivity
- **GitHub** = implementation and CI provenance
- **Runtime** = execution and observation
- **Ω∞v** = verification boundary
- **Reality** = final court

## Admission contract

Every important node should expose:

`identity · type · purpose · origin · parent · related_nodes · lifecycle_state · claim_status · decision_status · execution_status · authority · policy · evidence · dependencies · change · execution · observation · verification · attestation · provenance · memory · next_Δ`

Every material edge should be attributable to:

`from · to · edge_type · reason · authority_context · evidence_ref · state`

## Safety routing

`SCAM / FRAUD / PHISHING / SOCIAL ENGINEERING / IMPERSONATION / FRAUD SIMULATION`

→ **CYBERSECURITY**  
→ **SOCIAL ENGINEERING**  
→ **FRAUD / SCAM SIMULATION**

Simulation is defensive, disclosed, authorized, and bounded. This contract does not authorize real-world victim targeting, credential theft, financial deception, covert impersonation, or unauthorized outreach.

## Full-stack transition

`CHECK → MAP → CLASSIFY → CONNECT → AUTHORIZE → BOUND → EXECUTE → OBSERVE → RECONCILE → VERIFY → ATTEST → REMEMBER → NEXT Δ`

## Repository boundary

This document is an implementation companion, not a runtime attestation. Current Git state, CI state, deployment state, and runtime state must be independently observed.

The repository and the Notion graph are two representations of one operating body; neither representation becomes Reality merely by agreeing with the other.

## Related live candidates at the 2026-10-07 observation point

- PR #381 — Notion ↔ repository full-stack unification; open candidate, not merged truth.
- PR #406 — ΩIR source-line provenance; open candidate, not merged truth.

## Non-collapse law

`POSSIBLE ≠ KNOWN ≠ REPRESENTABLE ≠ PERMITTED ≠ PROPOSED ≠ ATTEMPTED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ ATTESTED ≠ DEPLOYED ≠ HEALTHY ≠ CORRECT`

**ONE ROOT → ONE GRAPH → MANY NODES → MANY EDGES → MANY BOUNDED FORMS.**
