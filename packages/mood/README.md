# @omega-v/mood

System mood and interaction-context contracts for Ω∞v Oceanicos.

## Overview

The package contains two deliberately separate surfaces:

- `MoodEvaluator` evaluates system telemetry such as confidence, verification health, dissent, and error rate.
- The autopilot mood contract (`createMoodContext`, `normalizeMoodSignal`, and `proposeMoodAdaptation`) represents human/context signals with provenance and uncertainty.

Autopilot mood is an **interaction input**, not a truth engine or authority model:

```text
MOOD → CONTEXT → PROPOSAL → ΩIR → POLICY → AUTHORITY → ADMISSION → BOUNDED ACTION
```

The contract preserves `USER_STATED`, `OBSERVED`, `DOCUMENTED`, `INFERRED`, `SIMULATED`, and `UNKNOWN` statuses. It never upgrades an inference into an observation, grants permission, or authorizes a consequential action. Consequential requests return `REVIEW`; unsafe adaptation requests return `DENY`. Normal Ω∞v admission remains the only execution gate.

## Safety invariants

- Mood does not equal truth, consent, proof, or authority.
- Explicit user signals retain their source, timestamp, confidence, uncertainty, and provenance.
- Empty or weak context defaults to `UNKNOWN` and preserves uncertainty.
- Low-risk adaptation may change wording or pacing only.
- Consequential or unsafe actions do not execute through this package.
