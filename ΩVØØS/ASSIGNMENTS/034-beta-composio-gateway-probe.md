# ΩVØØS Swarm Assignment 034-beta: Composio Gateway Probe

**Domain**: Frontend Quick Action Probes / External Tool Connectors  
**Target Route**: `POST /v1/omega/composio/read`  
**Worker**: `agent/gemini/vibeos-composio-gateway`  
**Status**: IN_PROGRESS  

---

## 1. Objective
Add a dedicated quick action probe `🔌 Composio Gateway` to the VibeOS desktop surface (`apps/web/src/VibeOS.tsx`) that inspects read-only external tool connector admission and journal hashes from `POST /v1/omega/composio/read`.

## 2. Invariants & Guardrails
- **Law 1 / Principle**: A Composio response is an observation only; this route does not independently verify provider data or authorize write actions.
- **Fail-closed**: Any failure or malformed payload collapses to `status: 'UNKNOWN'`, `verified: false`.
- **Observation status**: Live successful query emits `status: 'OBSERVED'`, `verified: false`.
- **Journal Integrity**: Every connector admission and attempt is hashed into the append-only connector observation store.

## 3. Verification
- `pnpm --filter web test:current-dom` (63 tests passed across 6 test suites)
- `pnpm --filter web build`
- Append Receipt #84 to `kai_ledger.json`.
