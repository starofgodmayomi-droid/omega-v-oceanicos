# @omega-v/dissensus

Reconciliation of plural verifier opinions for Ω∞v Oceanicos.

**An earned expansion (+ DISSENT) on the MINI kernel.** MINI (Observe → Verify
→ Remember) is complete with one verifier and one answer. Dissensus is what you
need once there is more than one, and it exists to stop them being flattened
into a false agreement.

`DISSENT ≠ ERROR`. Two verifiers reaching different conclusions is not a
malfunction; it is the most informative thing the system can report.

## Usage

```typescript
import { reconcile } from '@omega-v/dissensus';

const result = reconcile([
  { verifierId: 'rules', verifierVersion: '1.0.0', passed: true, confidence: 0.9, reason: 'ok' },
  { verifierId: 'model', verifierVersion: '2026-08', passed: false, confidence: 0.6, reason: 'x' },
]);

result.verdict; // 'SPLIT'
result.routing; // 'HUMAN'
result.confidence; // 0.6 — the minimum, never the mean
result.dissenting; // the model's opinion, kept
```

Pure by design: no I/O, no clock, no network. Whether a verifier is a rule
engine, a model, or a person is not this module's concern.

## What it refuses to do

**It never takes a majority vote.** Three verifiers at 2–1 is a disagreement,
not a decision. Reporting `AGREED` would discard the one signal worth having,
so the minority is carried in `dissenting` and the verdict stays `SPLIT`.

**It never averages confidence.** The mean lets a confident verifier carry a
doubtful one over a threshold — the direction that overstates trust. The
reported figure is the minimum.

**It treats "could not determine" as dissent**, not agreement, so a verifier
that reached no answer cannot be counted as consenting.

**It refuses a confidence outside `0..1` rather than clamping.** Clamping would
invent a number nobody produced and then route on it.

**It refuses to count one verifier answering twice as consensus.** That is a
configuration mistake; treating it as two votes manufactures agreement from a
bug.

## Verdicts

| Verdict   | Meaning                                          |
| --------- | ------------------------------------------------ |
| `AGREED`  | Every determined opinion reached the same answer |
| `SPLIT`   | Determined opinions disagree; both sides kept    |
| `UNKNOWN` | No quorum, nothing determined, or unusable input |

`routing` is `AUTO` or `HUMAN`. It is **advice to operators, not a gate** — the
API records it rather than enforcing it, because enforcement would be blocking
under another name.

## Policy provenance

- **`default`** — chosen by an author. The built-in `minimumConfidence` of
  `0.7` is one of these. It was **not measured**, and reporting it without
  saying so would let a chosen number read as evidence.
- **`configured`** — an operator set it and is answerable for it.
- **`derived`** — computed from recorded outcomes. **Nothing produces this
  yet**, because no outcome data has been collected.

`policyFromEnvironment` reads `OMEGA_DISSENSUS_MIN_CONFIDENCE`,
`OMEGA_DISSENSUS_QUORUM` and `OMEGA_DISSENSUS_HUMAN_ON_SPLIT`. Values are
refused rather than clamped, and an empty value is a mistake rather than a
setting — `Number('')` is `0`, which would otherwise install the most
permissive threshold there is.

## Where it is used

`apps/api` exposes `POST /dissensus` and `GET /dissensus`, and `/act` accepts a
`dissensusId`. A split does **not** block the action; it is recorded against
it. See `apps/api/README.md`.
