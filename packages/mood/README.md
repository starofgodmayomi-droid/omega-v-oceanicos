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

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
