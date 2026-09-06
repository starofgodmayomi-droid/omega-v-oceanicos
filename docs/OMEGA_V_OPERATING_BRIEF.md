# Ω∞v OCEANICOS Operating Brief

> **One root. One current. Infinite forms.**
>
> Reality → Observation → Evidence → Verification → Attestation → Action → Learning → Recompilation → Reality.

This brief compresses the attached Ω∞v constitution into an executable operating contract for the `omega-v-oceanicos` repository. It is a coordination model, not a claim that every envisioned layer already exists.

## Operating law

The system must prefer evidence over assertion, preserve dissent, expose uncertainty, and treat every failure as information. **ATTEST ≠ ASSERT.** A green status is valid only when required checks pass, evidence artifacts exist, lineage is attributable, no hidden critical failure remains, and any required attestation is independently observable. Human accountability remains at consequential authorization and publication gates.

Every component follows the same local loop:

```text
INPUT → OBSERVE → VERIFY → ACT → EVIDENCE → RETURN
```

Every full-stack change follows:

```text
MAP → EVIDENCE → ACCEPTANCE → BUILD → INTEGRATE → TEST → SECURITY → ATTEST → PUBLISH → OBSERVE → LEARN → RECOMPILE
```

Agents are temporary forms—observer, researcher, builder, tester, security reviewer, governance reviewer, documentation worker, or deployment worker. No agent is an autonomous authority. Consequential work must remain observable, attributable, auditable, reversible where possible, and routed through human approval when required.

## Cross-layer contract

| Layer                        | Required evidence boundary                                                                              | Current repository evidence                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Experience                   | Web, CLI, SDK, and future mobile surfaces expose state without upgrading unsupported claims to truth.   | API, SDK, CLI, and Web are active; Mobile remains planned.                                                                                  |
| API/protocol                 | Typed contracts preserve status, provenance, readiness, dissent, and failure states.                    | Express API exposes health, state, events, runs, audit, persistence, attestation, and mutation boundaries.                                  |
| Observation and verification | Observation records what occurred; verification explains rules and evidence.                            | MINI kernel and API loop are implemented and tested.                                                                                        |
| Attestation                  | Sign only the exact verified state and preserve algorithm/key metadata without exposing secrets.        | HMAC-SHA256 and Ed25519 paths exist; attestation remains bounded by configured local keys.                                                  |
| Provenance and memory        | State transitions remain attributable and history is not silently erased.                               | Append-only memory and durable local event-log evidence exist; recovery and distribution remain bounded.                                    |
| Security and authorization   | Separate identity, permission, and recorded action; fail closed on invalid policy.                      | Bearer boundaries, operator allowlists, revocation integrity, re-encryption controls, and declaration-only custody/deletion policies exist. |
| Runtime and observability    | Health, events, metrics, traces, verification, attestation, and lineage remain inspectable.             | Health/readiness, state readiness, observability, events, audit, and coverage inventory are exposed.                                        |
| CI and reproducibility       | Format, lint, type-check, tests, security, build, compatibility, and provenance gates produce evidence. | Required repository gates and Node 18/20, Windows, package, report, and CodeQL checks are active.                                           |
| Human governance             | Publication, merge, deployment, and consequential authorization remain human-routed.                    | PR #148 is green but intentionally draft pending explicit merge confirmation.                                                               |

## Verified current state

The repository’s current main baseline is `19975a6`, with the secure-deletion capability merged as PR #146 (`e53b359`). The custody-evidence declaration is implemented on PR #148 at corrected head `c74ee18`. Local verification observed **38 suites and 809 tests**, with lint, type-check, build, format, and diff checks passing. Authoritative PR checks passed on Node 18, Node 20, Windows compatibility, package/smoke, report, CodeQL, and Security Analysis; attested-artifact publication was skipped by design.

The custody modes are `unverified-local`, `operator-managed`, `hsm-kms`, and `external-reference`. Invalid or reference-less declarations degrade readiness. Every mode reports `verified:false`. This is configuration and capability evidence only; it does not prove an HSM/KMS, custodian, operator identity, recovery material, external service, secure erasure, distributed consistency, or deployment authorization.

## Explicit uncertainty

The following remain open and must not be represented as complete: real HSM/KMS custody, verified secure deletion, complete data-at-rest coverage, key recovery, distributed coordination, distributed revocation consistency, clock coordination, identity proofing, stronger administrative authorization, mobile surface, production deployment hardening, and ecosystem-wide causal knowledge graph semantics.

## Next executable action

The immediate gate is human review of PR #148. If approved, squash-merge it into `main`, observe the merged head and checks, then reconcile `WORKING_STATE.md` and `CONVERSATION_STATE.md`. Only after that merge is evidenced should the next bounded vector be selected. The next candidate should be the smallest complete slice that reduces a listed gap without pretending to provide the external system it cannot verify.

## Max-compression rule

```text
ONE ROOT
→ ONE CURRENT
→ MANY TEMPORARY FORMS
→ OBSERVE
→ PRESERVE EVIDENCE
→ VERIFY
→ ATTEST ONLY WHAT SURVIVES
→ ACT WITH AUTHORITY
→ MEASURE REALITY
→ LEARN
→ RECOMPILE
→ RETURN
```

Every claim requires a boundary. Every action produces evidence. Every failure remains visible. Every evolution preserves lineage. Every end becomes the next beginning.

## Source

This brief is derived from the user-provided attachment `pasted_content.txt` and reconciled against the repository state and PR evidence recorded in `docs/WORKING_STATE.md`, `docs/CONVERSATION_STATE.md`, `docs/ROADMAP.md`, and PR #148.
