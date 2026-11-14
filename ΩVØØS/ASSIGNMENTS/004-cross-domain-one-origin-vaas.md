# ORDER 004 — Cross-domain one-origin VaaS integration

| Field | Value |
| --- | --- |
| Assigned to | Copilot worker on `agent/copilot/api-served-ui` |
| Domain | One-origin API, web/Auth0 access, worker observation, deployment configuration, focused tests, and directly related documentation |
| Status | Authorized by the human in this session for the listed current worktree changes. |
| Publication | Update existing PR #602 by pushing to `agent/copilot/self-hosted-oidc-identity`, whose current head matches local `HEAD` (`fe5d3988345d5bb7c35e213410ab7fa3ce0a1759`). Do not create a duplicate PR. |
| Authority | Commit and push only the listed non-ledger changes and this order to PR #602. Do not merge or deploy. `kai_ledger.json` is excluded pending separate append-only reconciliation and receipt authorization. |

## Objective

Deliver the bounded one-origin Verification-as-a-Service experience: the API serves the UI, browser API calls use the shared Auth0-aware client, OIDC access remains fail-closed and human-gated, and worker observations reflect the actual API contract without overstating evidence.

## Authorized files

- `.env.compose.example`
- `.github/workflows/verify.yml`
- `AGENTS.md`
- `Dockerfile`
- `README.md`
- `apps/api/Dockerfile`
- `apps/api/README.md`
- `apps/api/src/__tests__/api.test.ts`
- `apps/api/src/__tests__/oidc-identity.integration.test.mjs`
- `apps/api/src/index.ts`
- `apps/api/src/omega-persistence.ts`
- `apps/api/src/omega.ts`
- `apps/api/src/runtime-globals.d.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/ConnectorPanel.tsx`
- `apps/web/src/DependencyMapPanel.tsx`
- `apps/web/src/DivergenceAlertsPanel.tsx`
- `apps/web/src/EcosystemPanel.tsx`
- `apps/web/src/InvisibleComputer.tsx`
- `apps/web/src/MoodCodexPanel.tsx`
- `apps/web/src/OreadConsole.tsx`
- `apps/web/src/RealityPanel.tsx`
- `apps/web/src/SingleBodyPanel.tsx`
- `apps/web/src/SystemHealthPanel.tsx`
- `apps/web/src/TransitionProvenancePanel.tsx`
- `apps/web/src/ValueNavigatorPanel.tsx`
- `apps/web/src/WorkerCoordinationPanel.tsx`
- `apps/web/src/api-client.ts`
- `apps/web/src/__tests__/dom/ConnectorPanel.test.tsx`
- `apps/web/src/__tests__/dom/CurrentAppShell.test.tsx`
- `apps/web/src/__tests__/dom/InvisibleComputer.test.tsx`
- `apps/web/src/main.tsx`
- `docker-compose.yml`
- `docs/GOVERNANCE.md`
- `docs/LOCAL_COMPOSE_DEPLOYMENT.md`
- `package.json`
- `tests/integration/omega_distributed_coordination.test.ts`
- `tests/integration/web-api-proxy.integration.test.ts`
- This assignment file.

## Acceptance gate

```bash
pnpm elion:veral
git diff --check
```

The full gate passed before this assignment was added. Re-run the focused swarm
validation and whitespace check after the assignment change.

## Stop conditions

- Keep live Auth0 tenant verification UNKNOWN until tested with a real non-production tenant.
- Do not include or reformat `kai_ledger.json` in this publication; reconcile it separately and append any required receipt only after that reconciliation.
- Do not merge PR #602 or deploy.
