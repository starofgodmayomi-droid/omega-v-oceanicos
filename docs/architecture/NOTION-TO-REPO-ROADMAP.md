# Notion-to-Repository Expansion Roadmap

This roadmap translates the connected Notion universe into a reviewable, evidence-first full-stack platform. It is deliberately incremental: it does not bulk-copy private Notion pages into a public GitHub repository.

## Source domains discovered

The accessible source inventory contains standalone pages and databases across multiple connected Notion accounts. The compressed corpus consistently describes these domains:

- human intent, identity, principles, and context;
- canonical knowledge, memory, provenance, and reconciliation;
- governance, policy, authority, privacy, and safety;
- intelligence, planning, typed orchestration, and bounded workers;
- OceanicOS / Ω∞v architecture, graph and change contracts;
- user experience, creative expression, content, and distribution;
- business hypotheses, offers, customer outcomes, costs, revenue, and profit;
- operations, integrations, tests, runtime observation, and evidence.

Names such as AI SOUL, KAI, MIRRIO, Truth Weaver, ECHOFRAME, TruthOS, Autopus, OMEGA, and Ω∞v are treated as domain labels or proposed component roles unless repository/runtime evidence establishes a concrete implementation. Similar names with overlapping roles should be reconciled through an explicit capability registry rather than multiplied into duplicate services.

## Delivery phases

### Phase 0 — Source inventory and privacy boundary

- Enumerate pages and databases in each authorized workspace.
- Persist coverage metadata, pagination cursors, errors, and timestamps.
- Keep source bodies and personal memory records in the private processing boundary.
- Produce only reviewed summaries, schemas, source hashes, and sanitized lineage for public GitHub.

**Exit:** inventory coverage is explainable; missing/unavailable pages are reported rather than assumed empty.

### Phase 1 — Canonical knowledge contract

- Validate `docs/schemas/knowledge-envelope.schema.json`.
- Define typed claim classes, lifecycle states, source lineage, visibility, and evidence references.
- Add fixtures containing synthetic examples only.
- Add duplicate and conflict links without erasing source history.

**Exit:** invalid or sensitive exports are rejected before commit.

### Phase 2 — Repository reconciliation

- Map each summarized requirement to existing packages, API routes, CLI commands, tests, and docs.
- Reuse existing verification, memory, orchestration, and admission mechanisms wherever possible.
- Create a gap ledger with priority, acceptance criteria, dependencies, risk, and owner.
- Avoid a second platform skeleton or a second source of truth.

**Exit:** each gap points to concrete evidence and an implementable bounded change.

### Phase 3 — Read-only synchronization

- Start with a dry-run exporter and report-only diff.
- Use stable source IDs and content hashes; never log raw sensitive content.
- Make sync idempotent and resumable; cap page size and retry budget.
- Classify deletions, permissions changes, conflicts, and missing pages as review items, not automatic destructive actions.

**Exit:** repeated dry runs produce stable output and do not mutate source systems.

### Phase 4 — Governed implementation bridge

- Require an explicit allowlist of Notion sources and GitHub paths.
- Generate a patch proposal with source references, acceptance criteria, and tests.
- Require human approval before public-facing changes, secrets/configuration changes, destructive actions, or deployment.
- Write to a feature branch; never bypass review or branch protections.

**Exit:** every change is scoped, auditable, reversible, and verified against the target revision.

### Phase 5 — Full-stack expansion

- Experience: show task state, source citations, approvals, errors, and evidence.
- API: validate typed envelopes, authorization, tenancy, rate limits, and idempotency.
- Orchestration: use bounded queues, retries, cancellation, dead-letter handling, and explicit state transitions.
- Data: preserve lineage, hash/version records, and implement retention/access controls.
- Verification: combine unit, contract, integration, security, and runtime checks.
- Operations: add health checks, observability, backup/recovery, and incident response.
- Value: measure user outcomes, costs, risk, and real demand before scaling.

**Exit:** capabilities have evidence-backed maturity labels, not merely architecture names.

## Prioritization rule

For each candidate change, score user impact, evidence strength, risk reduction, implementation cost, dependency load, and reversibility. Security/privacy and authorization gates are hard constraints—not tradeable points. Prefer the smallest high-value change that can be tested now.

## Handoff record

Every execution cycle must report:

1. Source pages/databases covered and what could not be read.
2. Sanitized requirements and source lineage used.
3. Repository files/commit/branch changed.
4. Tests actually run and exact outcomes.
5. Status per claim: IDEA, SPECIFIED, IMPLEMENTED, TESTED, OBSERVED, VERIFIED, DEPLOYED, or UNKNOWN.
6. Privacy/security checks and unresolved conflicts.
7. Measured or hypothesized value, clearly distinguished.
8. Next smallest authorized change.
