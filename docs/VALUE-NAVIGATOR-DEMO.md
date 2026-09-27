# OceanicOS Value Navigator — Demonstration

> **Reality → evidence → bounded action → observation → reconciliation → learning.**
>
> This guide demonstrates how the `oceanicos-value-navigator` skill turns an observed need into a small, ethical earning experiment. It is a worked example, not a promise of income or demand.

## What this demo teaches

The navigator keeps these states distinct:

```text
POSSIBLE ≠ KNOWN ≠ PROPOSED ≠ AUTHORIZED ≠ ATTEMPTED
≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ EARNED
```

A strong opportunity is not the most exciting idea. It is the **smallest credible transition** that can produce useful evidence without hiding uncertainty, spending prematurely, or acting without authority.

The examples below use the repository's verification-first language:

```text
Observe → Understand → Plan → Execute → Measure → Learn → Improve
```

Only the first three stages are demonstrated as proposals here. No outreach was sent, no customer data was collected, and no revenue is claimed.

---

## Example 1: An OSS verification-readiness service

### Current state

- **Observed fact:** This repository emphasizes evidence, verification, provenance, and explicit boundaries.
- **Source:** Repository README, Charter, and contribution guide (local source inspection, 2026-09-27).
- **Interpretation:** Teams building AI or automation systems may need help explaining what is actually verified before they expand their claims.
- **Unknown:** Whether a specific team will pay for a short verification-readiness review.
- **Status:** `UNKNOWN` — the need is plausible, not validated with buyers.

### Observe → Understand

| Field | Working statement |
|---|---|
| Beneficiary | A small software or AI team preparing a pilot, audit, or public release |
| Job to be done | Identify which trust and reliability claims have evidence, which are only proposed, and what to test next |
| Smallest useful outcome | A 2-page evidence map covering 5–10 important claims |
| Credible helper advantage | Familiarity with verification-first documentation and repository inspection |
| Alternatives | Internal review, generic QA checklist, security audit, or doing nothing |
| Dissenting evidence | The team may already have a mature audit process or may not value documentation |
| Falsifier | Three relevant teams decline because the artifact does not change a decision |

### Plan: service route

- **Offer:** A fixed-scope verification-readiness review.
- **Deliverable:** Claim inventory, evidence links, unknowns, one risk-ranked next experiment, and a handoff call.
- **Out of scope:** Certification, legal/security sign-off, penetration testing, production changes, and guarantees.
- **Price hypothesis:** A small paid pilot, quoted only after scope is confirmed. Price is a hypothesis; cash received must be recorded separately.
- **Channel:** Consent-aware conversations with founders or maintainers already discussing reliability, audits, or release readiness.
- **Timebox:** 7 days for discovery and one sample artifact.
- **Leading metric:** At least 3 qualified conversations and 1 request to review a sample.
- **Outcome metric:** One paid pilot or a clearly documented reason for no purchase.
- **Minimum success threshold:** One beneficiary agrees that the artifact would change a release or prioritization decision.
- **Stop condition:** No qualified response after a reasonable sample, or the review would require regulated or specialist assurance outside scope.

### One next action

Create a redacted sample evidence map from this repository using five claims:

1. “The MINI loop is implemented.”
2. “The verification rules are testable.”
3. “The append-only memory path is observable.”
4. “The web dashboard exposes runtime state.”
5. “Deployment health is verified.”

For each claim, mark `SUPPORTED`, `UNKNOWN`, or `NOT_EXECUTED`, add a source path, and record what evidence would change the status.

**Completion proof:** A versioned Markdown artifact with five rows and no unsupported production claims.

**Checkpoint:** Ask one potential beneficiary whether this artifact would help them make a real release or investment decision. Do not infer demand from praise.

---

## Example 2: A maintainer onboarding micro-product

### Current state

- **Observed fact:** The contribution guide asks contributors to document observations, verification steps, evidence, tests, and trade-offs.
- **Interpretation:** New contributors may benefit from a shorter, practice-led onboarding path.
- **Unknown:** Whether the friction is high enough for maintainers or teams to exchange money, sponsorship, referrals, or meaningful adoption for a reusable kit.
- **Status:** `DIVERGENT` — the repository describes a contribution process, but the user's actual onboarding friction has not been measured.

### Hypothesis

> If a maintainer gives 3 new contributors a 30-minute “first verified contribution” kit, then at least 2 will complete a small documentation or test change faster or with fewer clarification requests than their recent baseline.

This is a behavior hypothesis, not an income claim.

### Plan: product route

- **Offer:** A reusable onboarding kit: one orientation page, one issue template, one evidence checklist, and one worked example.
- **Beneficiary:** Small open-source maintainers and first-time contributors.
- **Smallest useful outcome:** A contributor can open a scoped, evidence-backed PR without needing a long private explanation.
- **Exchange hypothesis:** Free pilot first; later test sponsorship, team license, or paid workshop only if repeated demand appears.
- **Measure:** Time to first valid issue/PR, clarification count, completion rate, and contributor feedback.
- **Minimum success threshold:** 2 of 3 pilot contributors complete the intended path, and at least one maintainer asks to reuse it.
- **Risks:** Tracking contributor behavior without consent, confusing adoption with quality, and packaging a process before it works.
- **Stop condition:** No improvement over the existing guide, or contributors report that the kit increases rather than reduces cognitive load.

### One next action

Run a dry-run with three fictional personas before contacting anyone:

- **Beginner:** Can explain the problem but not the evidence needed.
- **Experienced engineer:** Can code quickly but skips provenance and scope boundaries.
- **Maintainer:** Needs a reviewable artifact, not a motivational tutorial.

Use the dry-run to remove every instruction that does not help the next transition.

**Completion proof:** A one-page kit with one explicit success condition, one stop condition, and one “unknowns” section.

**Checkpoint:** Test the kit with a consenting contributor and compare the observed path with the hypothesis. Record failures as evidence.

---

## Example 3: A local reliability evidence audit

### Current state

- **Observed fact:** The repository distinguishes local/runtime evidence from deployment and production health claims.
- **Interpretation:** A small team may need a bounded audit that separates “the test passed locally” from “the deployed system is healthy.”
- **Unknown:** Whether teams will share enough information for a useful audit, and whether the result is more valuable than their existing CI dashboard.
- **Status:** `UNKNOWN`.

### Plan: open-source/portfolio route first

- **Artifact:** A public, redacted “evidence boundary” checklist showing what can and cannot be concluded from local tests, CI, and deployment observations.
- **Beneficiary:** Engineers and reviewers who need to avoid accidental overclaiming.
- **Why this route first:** It creates portfolio proof and tests whether people reuse the method before offering a paid service.
- **Leading metric:** 5 technically relevant readers use or comment on the checklist.
- **Outcome metric:** One team requests a tailored review or contributes a counterexample.
- **Minimum success threshold:** At least one reader reports that the checklist changed a release decision or caught an unsupported claim.
- **Ethical boundary:** No access to private repositories, credentials, logs, customer data, or production systems is needed for the first experiment.
- **Stop condition:** The checklist becomes generic advice with no observable decision value.

### One next action

Publish a draft locally—not to a public channel yet—with three columns:

| Claim | Evidence currently available | What remains unknown |
|---|---|---|
| “The test suite passes” | Local test output with timestamp and commit | Whether the same result holds in hosted CI |
| “The service is deployed” | Deployment record, if available | Whether the deployed target is healthy now |
| “Users benefit” | User feedback or outcome data, if collected | Causality, representativeness, and durability |

**Completion proof:** Every row has a provenance path and an explicit unknown. No row says `VERIFIED` without authorization, execution, observation, reconciliation, and intact provenance.

**Checkpoint:** Ask for review from one technically qualified person before any public publication. Publication remains a separate authorized action.

---

## Evidence ledger template used by all three examples

| Type | Record |
|---|---|
| Fact | What was directly observed? |
| Source | Where did it come from? Include path, URL, or record ID. |
| Timestamp | When was it observed? |
| Interpretation | What might it mean? Keep it separate from fact. |
| Assumption | What must be true for the hypothesis to hold? |
| Unknown | What is not yet known, and how could it be tested? |
| Dissent | What evidence points the other way? |
| Decision | `ALLOW`, `DENY`, or `REVIEW` |
| Status | `VERIFIED`, `DIVERGENT`, `UNKNOWN`, or `NOT_EXECUTED` |
| Next transition | Exactly one bounded next step |

## Bounded change record example

```json
{
  "subject": "verification-readiness sample artifact",
  "intent": "Test whether a claim-to-evidence map helps a prospective beneficiary make a release decision",
  "state_before": "UNKNOWN: no beneficiary demand observed",
  "evidence": [
    {
      "source": "README.md and CHARTER.md",
      "timestamp": "2026-09-27",
      "observation": "The repository presents verification and provenance as core operating principles"
    }
  ],
  "authority": "Artifact author may create a local draft; no external publication or outreach authorized",
  "policy_constraints": [
    "Do not claim revenue or customer demand",
    "Do not access private systems or data",
    "Keep regulated assurance and production changes out of scope"
  ],
  "decision": "ALLOW",
  "transition": "Create one redacted local sample with five claim/evidence/unknown rows",
  "state_after": "PROPOSED: sample artifact exists locally; beneficiary value remains untested",
  "expected_consequence": "A reviewer can judge whether the artifact is decision-useful",
  "observed_consequence": "NOT_EXECUTED: no external review yet",
  "reconciliation": "UNKNOWN: expected usefulness has not been compared with observed beneficiary behavior",
  "status": "NOT_EXECUTED",
  "provenance": ["docs/VALUE-NAVIGATOR-DEMO.md"],
  "next_transition": "Obtain consent for one review and record the response"
}
```

## The demo's guardrails

- **Capability is not authority:** having GitHub access does not authorize outreach, publication, deletion, or access to private data.
- **Proposal is not action:** the examples stop at drafts and dry-runs unless a separate authorization is recorded.
- **Unknown is not false:** missing evidence is preserved as an unknown, not silently converted into a negative claim.
- **Positive sentiment is not revenue:** interest, likes, or compliments do not equal payment or impact.
- **No guaranteed returns:** every price, conversion, and outcome is a testable hypothesis.
- **Regulated boundaries remain outside scope:** legal, medical, tax, investment, security certification, and other specialist claims require qualified review.

## Suggested seven-day checkpoint

1. **Day 1:** Choose one example and complete its evidence ledger.
2. **Day 2:** Create the smallest artifact.
3. **Day 3:** Run a dry-run with one consenting reviewer.
4. **Days 4–5:** Make one authorized, consent-aware test—not a broad campaign.
5. **Day 6:** Record attempts, responses, time, cost, and quality.
6. **Day 7:** Reconcile expected vs. actual and choose exactly one: narrow, change the offer, improve delivery, adjust price, switch channel, stop, or scale.

The correct outcome may be **stop**. Stopping with preserved evidence is a verified learning transition, not a failure of the person or the idea.
