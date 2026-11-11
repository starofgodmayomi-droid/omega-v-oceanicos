# ORDER 002 — Beta / Invisible Computer workspace

| Field | Value |
| --- | --- |
| Assigned to | Beta — Builder (web UI) |
| Domain | `apps/web/src/` |
| Branch | `agent/copilot/invisible-computer-workspace-ui` |
| Status | Authorized by the human in this session; local implementation in progress. |
| Authority | Implement the responsive chat surface, prompt drawer, local-action UI, and JSON inspector. Do not push, merge, or deploy. |

## Objective

Polish the Invisible Computer input surface into a responsive workspace with prompt starters, an explicit required-auth credential form, fixed local-action chips, bounded run output, and a collapsible JSON state inspector. Preserve the existing chat execution contract; only the Alpha allowlist may run local processes.

## Authorized edits

- `apps/web/src/InvisibleComputer.tsx`
- `apps/web/src/InvisibleComputer.css`
- `apps/web/src/__tests__/dom/InvisibleComputer.test.tsx`
- This assignment record.

## Out of scope

REA or remote target inspection, arbitrary command execution, persistence/ledger changes, API authorization, deployment, pushes, merges, and unrelated application panels.

## Acceptance gate

```bash
pnpm --filter web test --runTestsByPath src/__tests__/dom/InvisibleComputer.test.tsx
pnpm --filter web build
pnpm validate:swarm
```

## Stop conditions

Keep commands as prompt starters only. Any real local action belongs to a separately authorized Alpha slice with a fixed allowlist, bounded resources, and independent tests.
