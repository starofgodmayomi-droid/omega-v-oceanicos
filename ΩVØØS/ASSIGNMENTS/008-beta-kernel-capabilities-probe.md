# ORDER 008 — Beta / Constitutional Kernel Capability Probe in VibeOS

| Field | Value |
| --- | --- |
| Assigned to | **Beta** — Builder (VibeOS UI & Kernel Capabilities) |
| Domain | `apps/web/src/` |
| Branch | `agent/gemini/vibeos-kernel-capabilities` |
| Status | **COMPLETED & VERIFIED** |
| Authority | Add a dedicated `⚙️ Kernel Capabilities` quick action probe in VibeOS that queries `GET /v1/kernel/capabilities` and displays the bounded constitutional capability snapshot of `@omega-v/kernel`. |

## Objective

1. Enable instant observation of the Oceanic Finite State Machine Kernel (`@omega-v/kernel`) directly from VibeOS via `⚙️ Kernel Capabilities`.
2. Present the constitutional capability snapshot: contract (`oceanicos-kernel.v1`), execution mode (`local-simulation-only`), deterministic evidence status, human authorization requirements, active capabilities (`observe`, `verify`, `remember`, `attest`, `reason`, `intend`, `build`, `test`), and strict boundaries (`local process only; cryptographic proofs attest simulated state, not physical reality`).
3. Preserve fail-closed epistemology: the kernel capability query records an `OBSERVED` snapshot without asserting external execution claims.

## Authorized Edits

- `apps/web/src/VibeOS.tsx` — `runKernelCheck` handler and `⚙️ Kernel Capabilities` button in `.vibe-actions`.
- `apps/web/src/__tests__/dom/VibeOS.test.tsx` — DOM test asserting kernel capability probe interaction.
- `ΩVØØS/ASSIGNMENTS/008-beta-kernel-capabilities-probe.md` — this assignment.
- Append receipt to `kai_ledger.json`.

## Acceptance Gate

- `pnpm --filter web test:current-dom`: 35/35 tests pass.
- `pnpm --filter web build`: clean TypeScript check and Vite bundle.
- `pnpm validate:swarm`: verified under `SWARM_PROTOCOL.md`.
