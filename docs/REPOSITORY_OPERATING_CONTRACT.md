# OCEANICOS Repository Operating Contract

**Purpose:** keep repository work reviewable, bounded, and reconciled with observed reality. This contract governs how changes move through the repository; it does not itself prove runtime or production state.

## Authority boundaries

- Human intent defines the requested outcome and constraints.
- This repository defines versioned implementation and automated checks.
- CI results are evidence about the exact commit and checks that ran.
- Runtime observations are evidence about the environment and time observed.
- Reconciliation compares an explicit expectation with accepted observations.
- No plan, issue, PR description, test, CI result, signature, memory, or dashboard is reality itself.

## Required change record

Every material change should identify:

1. **Intent** — the user-visible or system-level outcome sought.
2. **Scope** — files, packages, services, and boundaries affected.
3. **Authority** — who or what permits the transition; missing authority means stop.
4. **Evidence** — source refs, test results, workflow URLs, runtime observations, and timestamps where available.
5. **Boundaries** — finite steps, permissions, data/network limits, stop conditions, and rollback path.
6. **Outcome** — what actually changed, what checks ran, and what did not run.
7. **Next Δ** — one finite follow-up that closes the most important verified gap.

For traceability, reuse concrete identifiers when available: `project_id`, `change_id`, `evidence_id`, `commit_sha`, `run_id`, and `observation_id`. Do not invent identifiers or imply unavailable integrations.

## Transition protocol

```text
INTENT → DISTINGUISH → MAP → EVIDENCE → VERIFY
       → AUTHORIZE → BOUND → EXECUTE → OBSERVE
       → RECONCILE → ATTEST → REMEMBER → NEXT FINITE Δ
```

- **Propose** before mutating; reviewable branch/PR is the default for repository changes.
- **Verify** inputs and current refs before writing; do not trust a stale handoff as live state.
- **Bound** work by scope, authority, finite steps, and explicit stop conditions.
- **Observe** actual outputs after execution; report failed, skipped, or unavailable checks.
- **Reconcile** expected versus observed state before describing a transition as complete.
- **Remember** provenance and correction lineage; supersede stale statements rather than silently erasing history.

## State vocabulary

Preserve these distinctions in code, documentation, tests, and UI:

`POSSIBLE ≠ KNOWN ≠ REPRESENTABLE ≠ PERMITTED ≠ PROPOSED ≠ ATTEMPTED ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ ATTESTED ≠ DEPLOYED ≠ HEALTHY`

- `UNKNOWN`: evidence is absent, insufficient, or unavailable.
- `DIVERGENT`: accepted observation conflicts with an explicit expectation.
- `NOT_EXECUTED`: no execution is evidenced.
- `MODEL_ONLY`: model output or symbolic representation, not external observation.
- `VERIFIED`: only within a stated scope, with accepted evidence and an explicit comparison.

Never promote a state merely because a plan exists, a workflow is green, a signature validates, or a dashboard renders.

## Pull request acceptance gate

Before merge, record and check:

- [ ] Target/base and current head SHAs are freshly observed.
- [ ] Branch ancestry is reconciled; behind/diverged branches are not treated as current.
- [ ] Diff scope and relevant review threads are inspected.
- [ ] Required checks pass on the exact candidate head (not merely an earlier code commit).
- [ ] Security, compatibility, and regression implications are considered.
- [ ] Browser/accessibility checks are marked `UNKNOWN` until actually observed where relevant.
- [ ] Runtime, deployment, external integration, and production health are not claimed without their own evidence.
- [ ] Remaining risks and the next finite step are stated.

A green CI run does not waive review, authorize a merge, or prove deployment health. A PR being mergeable is metadata, not approval.

## Runtime and external action gate

External side effects require explicit authority, least privilege, bounded scope, provenance, and a defined stop/rollback condition. Admission is not execution; execution is not an observed outcome; observation is not verification until reconciled with an explicit expectation. If a required trust adapter or observation is missing, fail closed and preserve `UNKNOWN` or `UNCONFIRMED`.

## Continuity and freshness

- Treat handoffs, snapshots, PR descriptions, and memory as navigation aids, not live truth.
- Re-read live refs and checks before acting on older state.
- Record the exact commit and workflow/run URL for CI claims.
- Separate completed work from proposed work and from work not executed.
- Preserve raw human meaning in its source layer; do not turn symbolic meaning into empirical proof or execution authority.

## Definition of done for one finite change

A change is ready for review when its intent and scope are clear, implementation is on a reviewable branch, relevant tests/contracts are updated, available checks are run or honestly marked pending, evidence is linked to the exact head, and unresolved risks remain visible. Merge, deployment, and production health are separate transitions with separate evidence.
