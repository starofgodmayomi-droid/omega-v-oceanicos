# Qov Crosswalk

## Mission

**Qov** is the repository identity for a bounded living-intelligence architecture that continuously observes, verifies, attests, and evolves reality without losing provenance.

This is a product and systems-design statement. It is not a claim of omniscience, consciousness, literal infinity, or authority over external reality.

## Current grounded loop

```text
observe → verify → remember → attest → evolve
```

Each transition must preserve the evidence lineage of the preceding transition. An attestation records integrity and origin; it does not, by itself, prove that the underlying observation or verification rule was correct.

## Repository crosswalk

| Qov concept | Existing repository surface | Evidence | Status |
|---|---|---|---|
| Observe | `@oceanicos/observer` | Observer package tests | Implemented |
| Verify | `@oceanicos/verification` | Verification package tests | Implemented |
| Remember | `@oceanicos/remember` | Hash-chain and store tests | Implemented |
| Attest | `@oceanicos/attestation` | Envelope, signing, and tamper tests | Implemented |
| Evolve | API loop and verification-loop documentation | Integration and API tests | Bounded proposal |
| Qov boundary | `@oceanicos/qov` | Adapter and proposal tests | Implemented |

## Provenance requirements

Every future Qov evolution slice should retain, at minimum:

- the claim or observation being discussed;
- source identity and source timestamp;
- the observation, verification, and attestation identifiers;
- the rule version and verification evidence path;
- confidence, uncertainty, dissent, and limitations;
- the actor or process that created the record;
- the authorization required for any external side effect;
- a reversible rollback or revocation path.

## Authority boundaries

Qov remains fail-closed by default:

- external connectors are read-only until a named scope is explicitly approved;
- signed provenance is not authorization to act;
- local tests prove local behavior only;
- a green build is not proof of production deployment or real-world impact;
- evolution proposals must be reviewable, bounded, replayable, and reversible;
- unresolved disagreement remains visible rather than being collapsed into certainty.

## Next finite slice

The current adapter implements a **provenance-aware evolution proposal** that links one OceanicOS MINI block to one proposed change, while keeping the proposal unexecuted until human authorization. The next implementation candidate is persistence and replay for these records. Acceptance requires stable lineage identifiers, visible uncertainty, a local replay test, and no external writes.

## Evidence status

This crosswalk is a local repository artifact created from the checked-out `main` branch. It is `source-backed` for the listed package paths and tests, `proposed` for the evolution record, and does not claim hosted CI, publication, deployment, or real-world effects.
