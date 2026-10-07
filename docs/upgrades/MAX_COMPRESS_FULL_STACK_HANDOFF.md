# 💧 Ω∞v MAX COMPRESS — FULL STACK HANDOFF SPECIFICATION

## Overview
This document specifies the canonical handoff contract for the Ω∞v Max Compress change pipeline, unifying the execution pipeline across Kernel, API, Web, CLI, and Verification gates.

## Architectural Flow
```text
COMPILE (C1) → VALIDATE (C2) → ADMIT (C4) → EXECUTE (C5) → OBSERVE (C6)
                                   ↓
                     VERIFIED | DIVERGENT | HALTED
```

## Surface Invocations

### 1. Kernel Layer (`@oceanicos/mini`)
- Function: `runOmegaChangePipeline`
- Module: `packages/mini/src/pipeline.ts`
- Deterministic evaluation of change intents, authority admission, execution handlers, and observation reconciliation.

### 2. API Control Plane (`apps/api`)
- Endpoint: `POST /v1/pipeline`
- Module: `apps/api/src/pipeline-route.ts`
- Replay-verifiable execution of C0-C6 pipeline with causal memory attestation.

### 3. Web Dashboard (`apps/web`)
- Component: `PipelinePanel`
- Module: `apps/web/src/IntentFlow.tsx` / `OmegaWorkspace.tsx`
- Live inspection of pipeline state transitions and proof records.

### 4. CLI (`bin/oceanicos.mjs`)
- Command: `node bin/oceanicos.mjs pipeline`
- Terminal entrypoint executing deterministic self-verification.

### 5. Verification Gate
- Test Suite: `tests/integration/api-pipeline-causal.integration.test.ts`
- Guarantees fail-closed admission and provenance hash integrity.
