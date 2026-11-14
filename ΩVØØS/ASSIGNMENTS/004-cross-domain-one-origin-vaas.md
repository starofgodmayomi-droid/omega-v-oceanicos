# ORDER 004 — Cross-domain one-origin VaaS integration

| Field | Value |
| --- | --- |
| Assigned to | Copilot worker on `agent/copilot/self-hosted-oidc-identity` |
| Domain | One-origin API, web/Auth0 access, worker observation, deployment configuration, directly related documentation, and the CI/ledger validation fixes authorized below |
| Status | Authorized by the human in this session for the listed current worktree changes. |
| Publication | Update existing PR #602 by pushing to `agent/copilot/self-hosted-oidc-identity`. Do not create a duplicate PR. |
| Authority | Commit and push the listed changes to PR #602 after local verification. Do not merge or deploy. `kai_ledger.json` may receive append-only receipts only; do not rewrite or reformat existing entries. |

## Objective

Deliver the bounded one-origin Verification-as-a-Service experience: the API serves the UI, browser API calls use the shared Auth0-aware client, OIDC access remains fail-closed and human-gated, and worker observations reflect the actual API contract without overstating evidence. Also fix observed CI failures in Compose placeholder validation and append-only baseline comparison without weakening receipt validation.

## Authorized files

- `.env.compose.example`
- `.github/workflows/verify.yml`
- `scripts/validate-swarm-ledger.mjs`
- `scripts/validate-swarm-ledger.test.mjs`
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
node --test scripts/validate-swarm-ledger.test.mjs
SWARM_LEDGER_BASELINE_REF=origin/main pnpm validate:swarm
docker compose --env-file .env.compose.example config --quiet
git diff --check
```

These checks cover the one-origin integration and the authorized CI/ledger
repairs. They do not prove live Auth0 configuration or deployment.

## Stop conditions

- Keep live Auth0 tenant verification UNKNOWN until tested with a real non-production tenant.
- Preserve every historical ledger receipt exactly; any new receipt must be appended without rewriting or formatting existing entries.
- Do not merge PR #602 or deploy.
