# Base44 Dev Environment — Ω∞v Oceanicos

## Stack
- **pnpm monorepo** (Node 22, pnpm 10). Workspace packages in `packages/*`, apps in `apps/api` and `apps/web`.
- **API** (`apps/api`): Fastify, CommonJS, port 5000. Depends on built workspace packages (`@oceanicos/*`, `@omega-v/kernel`).
- **Web** (`apps/web`): Vite 6 + React 18, port 3000. No workspace package dependencies; Vite transpiles TSX on the fly.
- **No external DB required.** Persistence is file-based SQLite (`node:sqlite` fallback when `better-sqlite3` isn't installed for the api package). Qdrant/Ollama are referenced in the original `docker-compose.yml` but are NOT used by the API code.

## Running
```bash
docker compose -f docker-compose.base44.yml up -d
```
- `setup` (one-shot): `pnpm install --frozen-lockfile` + `pnpm --filter api... run build` (builds the API and its workspace dependency tree; skips web).
- `api`: runs `tsc --watch` (rebuilds `apps/api/dist` on source change) + `node --watch apps/api/dist/index.js` (restarts on dist change). Live reload for API source edits.
- `web`: `npx vite --host 0.0.0.0` from `apps/web`. Vite HMR for frontend edits.

## Key config
- **Node 22 required** — the `@omega-v/kernel` package is ESM (`"type": "module"`) and the API (CommonJS) uses `require()` of it, which only works in Node 22+.
- **Auth**: `OMEGA_AUTH_MODE=local` (no bearer tokens needed for dev). Set to `required` + provide `OMEGA_READ_TOKEN`/`OMEGA_ADMIN_TOKEN` for auth-protected deployments.
- **Signing key**: `OMEGA_SIGNING_KEY` is a dev placeholder in `.env.base44-defaults` (listed first in `env_file`). Only needed for `/v1/attest`; the API boots without it (attester = degraded). Replace via dashboard secret for real attestations.
- **Secret precedence**: `.env.base44-defaults` (placeholders) → `/run/base44/app.env` (dashboard, always wins).
- **CORS**: API has `origin: '*'` (already in code). Web talks to the API via `VITE_API_URL=https://5000-${BASE44_PUBLIC_HOST_SUFFIX}` (separate origins).
- **Vite hosts**: `apps/web/vite.config.ts` sets `server.host: true` + `server.allowedHosts: true` so the preview proxy is accepted.

## Quirks
- The API uses `.js` extension imports (`import { X } from './jobs.js'`) — an ESM-style pattern compiled to CommonJS. ts-node cannot resolve these from source, so the API runs from `dist` (built by tsc) rather than via ts-node.
- `apps/api/src/runtime-globals.d.ts` declares a global `persistenceEncryptionKey` var; only `tsc` picks it up, not ts-node's type-checker.
- `apps/api/tsconfig.json` `include` lists only `src/index.ts` + the `.d.ts`, but tsc follows imports so all src files compile.
- **Workspace packages must be built** before the API can start — their `main` points to `dist/index.js`. The setup service builds them in dependency order.
- **SSE + CORS**: `/v1/stream` writes straight to the raw response, so the `@fastify/cors` hook headers never reach the client. The handler sets `Access-Control-Allow-Origin` itself before flushing; without it the browser blocks the EventSource with a CORS error. The UI also polls `/v1/block/tip` every 5s while the stream is disconnected.

## New roadmap packages (C6/C7/Authorization)
- **`@omega-v/reconciliation`** (C6): expected↔actual comparison → VERIFIED/DIVERGENT/UNKNOWN/NOT_EXECUTED with SHA-256 evidence. API: `POST /v1/reconciliation/reconcile`, `POST /v1/reconciliation/batch`.
- **`@omega-v/provenance`** (C7): append-only hash-chained lineage ledger with `verifyIntegrity()`. API: `POST /v1/provenance/append`, `GET /v1/provenance/verify`, `GET /v1/provenance/lineage/:changeId`, `GET /v1/provenance/tip`.
- **`@omega-v/authorization`**: fail-closed authority/permission engine producing `authorityVerified`+`policySatisfied` for the C4 admission gate. No self-authorization, grants expire/revocable/scoped. API: `POST /v1/authorization/grant`, `POST /v1/authorization/evaluate`, `POST /v1/authorization/revoke`, `GET /v1/authorization/grants`.
- All three are ESM (`"type": "module"`, `module: NodeNext` in tsconfig) and built via `pnpm --filter @omega-v/reconciliation... run build`.
- Route contract in `apps/api/src/route-contract.ts` and `apps/api/src/governance-route.ts`.
- **Web surface**: `apps/web/src/GovernancePanel.tsx` is rendered inside the `Verify` lifecycle stage. It reads `/v1/provenance/verify`, `/v1/provenance/tip`, `/v1/authorization/grants` and runs `POST /v1/reconciliation/reconcile` (pure comparison — no persisted writes from the UI).
- **Contract test**: `tests/integration/governance_surfaces.test.ts` runs against the compiled `dist` of the three packages and is wired into `pnpm test` (node test runner). It covers VERIFIED/DIVERGENT/NOT_EXECUTED, hash-linked lineage, fail-closed denial, self-grant refusal, and revocation.
- **API state is in-memory**: the provenance chain and authorization grants are process singletons in `governance-route.ts`. They reset on API restart and are not shared across processes; do not present them as durable.
## C9 — SDK and CLI (migrated into the workspace)
- **`packages/sdk` (`@omega-v/sdk`)** and **`packages/cli` (`@omega-v/cli`)** are real workspace projects (18 in `pnpm-workspace.yaml`). They are not API dependencies, so the `setup` service does not build them: use `pnpm --filter @omega-v/sdk --filter @omega-v/cli run build`, or root `pnpm build` (recursive).
- The legacy in-process facades were deleted: `packages/sdk/src/oceanicos.ts` (`OceanicosClient`, `OperatingSystemKernel`, `OmegaTotalCompressor`) and `packages/cli/src/oceanicos-cli.ts` + `bin.ts` imported packages that no longer exist. The survivors are the HTTP client (`sdk/src/index.ts`) and the fetch-based CLI (`cli/src/index.ts`, published bin `dist/cli.js`).
- The SDK now covers the governance surface: `reconcile`, `reconcileBatch`, `appendProvenance`, `verifyProvenance`, `getProvenanceLineage`, `getProvenanceTip`, `grantAuthorization`, `evaluateAuthorization`, `revokeAuthorization`, `getAuthorizationGrants`.
- The CLI now exposes `omega-v reconcile|provenance|grants|authorize` (exit 0 only for VERIFIED / intact chain / authorized).
- **Contract tests**: `tests/integration/sdk_client_contract.test.ts` pins the SDK's governance routes against `API_ROUTE_INVENTORY`; `apps/api/src/__tests__/route-inventory.test.ts` parses `printRoutes()` into full `METHOD /path` entries and now covers the `/v1/omega/*`, `/v1/ecosystem/status`, `/v1/reality/status` and `/v1/dependencies` routes too.
- **Known drift**: several SDK/CLI reads still target the earlier evidence-API generation (`/state`, `/observability`, `/events`, `/audit/events`, `/rules`, `/subsystems`, `/runs`, `/evidence/export`, `/os`, `/scene/simulate`, `/attest/verify`). Those routes are not registered by `apps/api` — the commands return "unavailable" (exit 1) rather than inventing data. `omega-v health` and `omega-v policy` also expect the older `{ data }` envelope, so they report "unavailable" against the flat `/health` body the API serves; aligning them is the next slice.
- **Test env caveat**: the CLI suites assert "no Authorization header" and read `OMEGA_READ_TOKEN` from the environment, so run them with the tokens unset inside the dev container (`env -u OMEGA_READ_TOKEN -u OMEGA_ADMIN_TOKEN ...`) or those assertions fail for the wrong reason.

## Fixed bug
`apps/api/src/index.ts` line 204: `persistenceEncryptionKey` was undefined → changed to `encryptionEnabled(persistenceKey)` to match the pattern used at lines 163/165.

## No external credentials needed
All secrets (signing key, tokens) are local dev values in `.env.base44-defaults`. No external service credentials are required for the app to run.

## Verify
- API health: `curl http://localhost:5000/health` → `{"status":"ok",...}`
- Web: `curl http://localhost:3000` → Vite-served HTML with `/@vite/client` and `/src/main.tsx`.
- `docker compose -f docker-compose.base44.yml ps` → api healthy, web up.
