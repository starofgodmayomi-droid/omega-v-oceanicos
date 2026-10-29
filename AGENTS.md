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
- **SSE CORS**: `/v1/stream` writes straight to `reply.raw` and calls `flushHeaders()`, which commits the response before Fastify applies its own header map — so the `access-control-allow-origin` that `@fastify/cors` resolved in `onRequest` was dropped and the browser EventSource was blocked (ambient bar stuck on "REST mode"). The handler now copies the resolved CORS headers onto the raw response before flushing; `max_compress_stack.e2e.test.ts` test 20 asserts an `Origin` request keeps that header.
- **Browser-relative `/api/*` calls**: most panels read `VITE_API_URL`, but `WorkerCoordinationPanel` calls `/api/v1/omega/workers`, which the Vite dev server proxies. Inside the `web` container the API is the `api` service — not localhost — so compose sets `VITE_API_PROXY_TARGET=http://api:5000` (the config's own default, `http://localhost:5000`, is only right when both run on one host). Without it every `/api/*` call fails `ECONNREFUSED 127.0.0.1:5000` and the panel logs a proxy error every 10 s.
- **Restart and health**: `api` and `web` carry `restart: on-failure` plus healthchecks (api `GET /health`, web `GET /` on 3000) so a crashed process or a stuck cold boot is visible and recoverable. The one-shot `setup` service deliberately has no restart policy.
- **Editor labels**: `web` (`base44.kind: web`, port 3000) and `api` (`base44.kind: worker`) — the labels the sandbox editor reads to map services to projects.
- **Vite hosts**: `apps/web/vite.config.ts` sets `server.host: true` + `server.allowedHosts: true` so the preview proxy is accepted.

## Quirks
- The API uses `.js` extension imports (`import { X } from './jobs.js'`) — an ESM-style pattern compiled to CommonJS. ts-node cannot resolve these from source, so the API runs from `dist` (built by tsc) rather than via ts-node.
- `apps/api/src/runtime-globals.d.ts` declares a global `persistenceEncryptionKey` var; only `tsc` picks it up, not ts-node's type-checker.
- `apps/api/tsconfig.json` `include` lists only `src/index.ts` + the `.d.ts`, but tsc follows imports so all src files compile.
- **Workspace packages must be built** before the API can start — their `main` points to `dist/index.js`. The setup service builds them in dependency order.
- **SSE through the preview proxy**: with the CORS header fix described above, `/v1/stream` does connect from the browser through the preview proxy (status bar reads "Connected", runtime stream marked VERIFIED). If the proxy drops a long-lived connection the UI shows "Reconnecting…" and retries; REST endpoints are unaffected either way.

## Fixed bug
`apps/api/src/index.ts` line 204: `persistenceEncryptionKey` was undefined → changed to `encryptionEnabled(persistenceKey)` to match the pattern used at lines 163/165.

## No external credentials needed
All secrets (signing key, tokens) are local dev values in `.env.base44-defaults`. No external service credentials are required for the app to run.

## Organ packages (KAI / ELION / OMEGA)
`packages/kai` (`@oceanicos/kai`), `packages/elion` (`@oceanicos/elion`), and `packages/omega` (`@oceanicos/omega`) are workspace members declared in `ECOSYSTEM_BODY.md`. They are plain CommonJS-targeted TypeScript (no `"type": "module"`, like `packages/mini`), so `ts-jest` can run their tests without ESM flags. They build with the rest of the workspace and are declared dependencies of `apps/api`, which runs all three in `apps/api/src/organs.ts` on every `GET /v1/ecosystem/body` (`layers.organs`). KAI remembers/recalls, ELION refuses (no human authority on a read), OMEGA reconciles expected vs observed.
- After adding or removing a workspace package, run `pnpm install` once (inside the `api` container) and commit the updated `pnpm-lock.yaml`; the `setup` service uses `--frozen-lockfile` and fails otherwise.
- `docs/REPO_INVENTORY.md` has two tables the inventory contract test compares to `pnpm-workspace.yaml` and `apps/api/package.json`, plus counts. Adding a workspace package requires updating the table and the summary counts together.
- `packages/README.md` must name every directory in `packages/`; `apps/README.md` must name every directory in `apps/`, and each of those directories needs a README (documents-claims test).
- Per-package tests: `docker compose -f docker-compose.base44.yml exec -T api sh -c "cd /app/packages/kai && ./node_modules/.bin/jest --config jest.config.cjs --no-cache"` (same for `elion`, `omega`). Use `--no-cache` after changing a package's `type` field; a stale haste map otherwise reports an ESM error that no longer applies.

## Verify
- API health: `curl http://localhost:5000/health` → `{"status":"ok",...}`
- Web: `curl http://localhost:3000` → Vite-served HTML with `/@vite/client` and `/src/main.tsx`.
- Proxy through the web dev server: `curl http://localhost:3000/api/v1/omega/workers` → `{"success":true,...}` (this is the path the WORKERS panel uses).
- `docker compose -f docker-compose.base44.yml ps` → api healthy, web healthy.
- Full build: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'corepack enable && pnpm build'` → every workspace package builds.
- Relevant tests: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/web-api-proxy.integration.test.ts'`.
- Pipeline CLI: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'node bin/oceanicos.mjs pipeline "advance the bounded state" --observe S1'` (flags: `--state-before`, `--state-after`, `--observe`, `--authority`, `--policy`, `--json`). It must run inside the `api` container so its default `http://127.0.0.1:5000` reaches the API. It prints the live `POST /v1/pipeline` verdict and exits `0` only on `realityStatus: VERIFIED`. The running server configures no admission-evidence resolver, so the honest default is `ADMIT / DENY` with exit `1`; the CLI never sends admission gates (the route rejects caller-supplied ones).

## Start-failure investigation (2026-10-28)
`main` was at `1dc8e69b` (PR #536, "do not verify reality from a caller-supplied echo", all CI checks green) when a preview start was reported as failing; this branch already contains that commit, so nothing had to be brought in. A clean `docker compose -f docker-compose.base44.yml down` + `up -d` starts the stack here — `setup` exits 0, `api` turns healthy, `web` serves port 3000 — and the container event history shows no failed attempt, so the reported start failure could not be reproduced in this sandbox. What the running logs did show was the `/api` proxy defect documented above (the WORKERS panel's request returned 502 through Vite); that is fixed, and both the monorepo build and the proxy contract test pass.
