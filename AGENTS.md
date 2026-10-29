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
- **Jest is not installed in this sandbox** — the `apps/**/__tests__` jest suites and `pnpm test:web` cannot run here (only `ts-node`/`typescript` are installed at the root). Write API coverage as a `tests/integration/*.integration.test.ts` file with `node --test`, and add it to the root `test` script's explicit list; that is the harness that actually runs in CI.
- **SSE through the preview proxy**: with the CORS header fix described above, `/v1/stream` does connect from the browser through the preview proxy (status bar reads "Connected", runtime stream marked VERIFIED). If the proxy drops a long-lived connection the UI shows "Reconnecting…" and retries; REST endpoints are unaffected either way.

## Single body compression (4×4×4×4)
`GET /v1/ecosystem/body` carries a `compression` block: the seven runtime layers projected onto four axes of four coordinates (256 cells) with a local compress→expand proof. `POST /v1/ecosystem/body/expand` takes `{ compression }` and returns the records; a tampered digest is `400 DIGEST_MISMATCH`. Contract: `packages/mini/src/single-body.ts`; doc: `docs/SINGLE-BODY-4X4X4X4.md`; UI: `apps/web/src/SingleBodyPanel.tsx`. Coordinates are a declared projection (`body.layers.v1`), not inferred truth.

## KAI/ELION execute loop
`POST /v1/execute` (the browser calls `/api/v1/execute` — Vite strips the `/api` prefix) is
the one bounded end-to-end slice: KAI OBSERVE → ELION BOUND → ELION EXECUTE → OMEGA VERIFY
→ KAI REMEMBER.
- Shield rules, contract, verification and the step log live in `apps/api/src/execute-route.ts`;
  the hash-chained journal is `apps/api/src/kai-memory.ts`.
- The journal is a JSONL file at `OMEGA_KAI_MEMORY_PATH` (default `${OMEGA_DB_PATH}.kai-memory.jsonl`).
  Read it back with `GET /v1/execute/memory?limit=20`.
- The bounded executor only reports state this process already observed (ledger height/integrity,
  worker contracts, KAI memory height). No model connector is configured, so a generative intent
  returns `NOT_EXECUTED` / `ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT` — that is the
  design, not a missing feature. Do not add a fallback that invents an answer.
- UI: `apps/web/src/ExecuteLoopPanel.tsx`, mounted directly under `WaterFlowPanel` in `App.tsx`.
- Test: `node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/execute-loop.integration.test.ts`
  (listed in the root `test` and `test:e2e` scripts). `api-route-contract.integration.test.ts`
  asserts the exact size of `API_ROUTE_INVENTORY`, so adding a route means updating that number,
  the inventory, and `apps/api/README.md` together.

## Ω∞v reality fixed point (Y)
`packages/mini/src/reality-fixed-point.ts` (exported from `@oceanicos/mini`) is the loop
written as one law: `Y(λf.λx. f(Σ ∪ Hash(x)) | O(E(x)) ≡ VERIFIED)` with `HALT ⊢ DIVERGENT`
(`K(x) ∈ SCAM`), `HALT ⊢ UNKNOWN` (`Evidence(x) = ∅`), `HALT ⊢ NOT_EXECUTED`
(`Authority(x) < Required`), and `M(t+1) = M(t) ∪ Δ` only when `V(Δ) = ⊤`.
- `POST /v1/execute` calls `judgeDrop` for its `OMEGA_VERIFY` step (match mode `CONTAINS`,
  because there the declared expectation is a fragment of a live report); the shield already
  returns `DIVERGENT` and a missing capability is passed as `held: 0, required: 1` → `NOT_EXECUTED`.
- Precedence when several halts hold at once is SCAM → AUTHORITY → EVIDENCE → VERIFICATION.
  That precedence is a kernel decision, not something the law's listing settles.
- `Σ` (verified-only memory) is deliberately NOT the KAI journal: the journal keeps every
  verdict including `DIVERGENT`/`UNKNOWN`. Do not "fix" the journal to drop failures.
- Test: `node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/reality-fixed-point.integration.test.ts`
  (listed in `test` and `test:e2e`). Doc: `docs/REALITY-FIXED-POINT.md`.
- The kernel is pure: it never reads the world, so `VERIFIED` there means "expected equalled
  observed *as supplied*". Do not surface it as an observation.

## Fixed bug
`apps/api/src/index.ts` line 204: `persistenceEncryptionKey` was undefined → changed to `encryptionEnabled(persistenceKey)` to match the pattern used at lines 163/165.

## No external credentials needed
All secrets (signing key, tokens) are local dev values in `.env.base44-defaults`. No external service credentials are required for the app to run.

## Verify
- API health: `curl http://localhost:5000/health` → `{"status":"ok",...}`
- Web: `curl http://localhost:3000` → Vite-served HTML with `/@vite/client` and `/src/main.tsx`.
- Proxy through the web dev server: `curl http://localhost:3000/api/v1/omega/workers` → `{"success":true,...}` (this is the path the WORKERS panel uses).
- `docker compose -f docker-compose.base44.yml ps` → api healthy, web healthy.
- Full build: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'corepack enable && pnpm build'` → every workspace package builds.
- Relevant tests: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/web-api-proxy.integration.test.ts'`.

## Start-failure investigation (2026-10-28)
`main` was at `1dc8e69b` (PR #536, "do not verify reality from a caller-supplied echo", all CI checks green) when a preview start was reported as failing; this branch already contains that commit, so nothing had to be brought in. A clean `docker compose -f docker-compose.base44.yml down` + `up -d` starts the stack here — `setup` exits 0, `api` turns healthy, `web` serves port 3000 — and the container event history shows no failed attempt, so the reported start failure could not be reproduced in this sandbox. What the running logs did show was the `/api` proxy defect documented above (the WORKERS panel's request returned 502 through Vite); that is fixed, and both the monorepo build and the proxy contract test pass.
