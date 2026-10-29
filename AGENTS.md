# Base44 Dev Environment — Ω∞v Oceanicos

## Read first
`ECOSYSTEM_BODY.md` is the master context: the organ map (KAI / ELION / OMEGA → the real file paths they live at), the golden rules and where each is enforced, and the commands that verify the body. Its claims are held by `tests/integration/ecosystem-body.integration.test.ts`; a renamed organ or dropped law fails that test, so update the body in the same change. The loop's logic lives in `packages/kai`, `packages/elion` and `packages/omega` — if one stops being imported, the body is `DIVERGENT`.

## Stack
- **pnpm monorepo** (Node 22, pnpm 10). Workspace packages in `packages/*`, apps in `apps/api` and `apps/web`.
- **API** (`apps/api`): Fastify, CommonJS, port 5000. Depends on built workspace packages (`@oceanicos/*`, `@omega-v/kernel`).
- **Loop packages** (CommonJS, built like the rest): `@oceanicos/kai` = shield patterns, `KAI_SYSTEM_PROMPT`, memory/contract types; `@oceanicos/elion` = authority bounding, `executeElion`, local composer; `@oceanicos/omega` = `sha256Hex`, `verifyOmega`, `replayVerdict`. The API imports them by name; root `package.json` links them so the integration tests can too.
- **Web** (`apps/web`): Vite 6 + React 18, port 3000. No workspace package dependencies; Vite transpiles TSX on the fly.
- **No external DB required.** Persistence is file-based SQLite (`node:sqlite` fallback when `better-sqlite3` isn't installed for the api package). Qdrant/Ollama are referenced in the original `docker-compose.yml` but are NOT used by the API code.

## Running
```bash
docker compose -f docker-compose.base44.yml up -d
```
- `setup` (one-shot): `pnpm install --frozen-lockfile` + `pnpm --filter api... run build` (builds the API and its workspace dependency tree; skips web).
- `api`: runs `tsc --watch` for `packages/kai`, `packages/elion`, `packages/omega` **and** `apps/api` (the loop's organs are workspace packages, so their sources need rebuilding too) + `node --watch apps/api/dist/index.js`, which follows the symlinked packages and restarts on dist change. Live reload for both API and loop-package edits.
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
- **Transient `[vite] http proxy error: /v1/... ECONNREFUSED 172.18.0.x:5000` lines in the `web` log are expected while the API is restarting.** `tsc --watch` + `node --watch` in the `api` service leave a few seconds (longer if a compile errors mid-edit) where nothing listens on 5000, and the WORKERS panel polls every 10 s. The target is still correct: once the rebuild finishes the same lines stop and `curl http://localhost:3000/api/v1/omega/workers` returns 200. Only a *persistent* stream of them means a real misconfiguration (wrong `VITE_API_PROXY_TARGET`, or an API that never turns healthy).
- **Workspace packages must be built** before the API can start — their `main` points to `dist/index.js`. The setup service builds them in dependency order.
- **SSE through the preview proxy**: with the CORS header fix described above, `/v1/stream` does connect from the browser through the preview proxy (status bar reads "Connected", runtime stream marked VERIFIED). If the proxy drops a long-lived connection the UI shows "Reconnecting…" and retries; REST endpoints are unaffected either way.

## Invisible Online Computer (KAI → ELION → OMEGA → KAI)
- `POST /api/execute` (alias `POST /execute`, which is the Vite proxy's rewritten target) runs the four-step loop from `apps/api/src/execute-route.ts`:
  1. **KAI observe** — `scanIntent` (`@oceanicos/kai`) matches known scam patterns; a match halts with `status: "DIVERGENT"`, `reason: "KAI Shield blocked this intent."` and writes nothing.
  2. **ELION execute** — `executeElion` (`@oceanicos/elion`) calls an OpenAI-compatible `chat/completions` endpoint when `OMEGA_LLM_API_KEY` is set (`OMEGA_LLM_BASE_URL`, `OMEGA_LLM_MODEL` optional). Without a key it returns the clearly labelled `local-deterministic` composer. A failed model call returns empty text, not an invented answer.
  3. **OMEGA verify** — `verifyOmega` (`@oceanicos/omega`) recomputes the SHA-256 evidence hash and checks the text against the `OmegaIR_Contracts` row; empty text, a broken digest, or a fabricated completion collapses to `UNKNOWN`.
  4. **KAI remember** — only `VERIFIED` outcomes are appended to `KaiMemory`.
- `GET /api/kai/memory?limit=n` (alias `GET /kai/memory`) returns the most recent memory rows.
- `GET /api/kai/memory/:id/replay` (alias `GET /kai/memory/:id/replay`) replays one remembered record: it recomputes SHA-256 over the retained `evidence_text` and answers `VERIFIED` (digest recomputes), `DIVERGENT` (`EVIDENCE_HASH_MISMATCH`, the row is preserved and reported, never served as good memory), or `UNKNOWN` (`EVIDENCE_TEXT_NOT_RETAINED`, a row written before evidence was retained). Unknown id → `404 MEMORY_NOT_FOUND`.
- `GET /api/kai/memory/audit` (alias `GET /kai/memory/audit`) replays the remembered ledger in one call. `status` is `NOT_EXECUTED` when nothing is remembered, else the worst row audited: `DIVERGENT` (any mismatch) → `UNKNOWN` (any row without retained evidence) → `VERIFIED` (every audited row recomputes). It also returns `total`, `audited`, `not_audited` (rows beyond the bound are counted, never assumed good) and `verified`/`divergent`/`unknown` counts. Both replay endpoints answer from one shared rule (`replayVerdict` in `@oceanicos/omega`), so a row is never judged one way singly and another way in the ledger. UI: the `VERIFY LEDGER` control in the `KAI MEMORY` header (`data-ledger-audit`).
- **The loop law (fixpoint).** `packages/omega/src/fixpoint.ts` carries `Ω∞v = Y(λf. M_{t+1} = M_t ∪ { Hash(x) | V(x) = ⊤ })` with `V ≡ (Expected ≡ Observed)`: `gateDrop` answers `VERIFIED` or halts on `DIVERGENT` (`KAI_SHIELD_SCAM`, `EXPECTED_NOT_OBSERVED`), `UNKNOWN` (`EVIDENCE_EMPTY`, `EXPECTED_NOT_DECLARED`), `NOT_EXECUTED` (`AUTHORITY_BELOW_REQUIRED`); `omegaFixpoint` folds drops into a set of hashes, so memory is monotone and idempotent and `fixed` is the second-pass proof. The audit endpoint returns this as its `fixpoint` block over the stored rows. `sha256Hex` moved to `packages/omega/src/digest.ts` and is re-exported from the package root. Tests: `node --experimental-strip-types --test ./tests/integration/omega-fixpoint.integration.test.ts`.
- Storage is the same SQLite file family as the other API stores: `<dbPath>.kai.db`, tables `KaiMemory` (id, timestamp, intent, evidence_hash, status, evidence_text) and `OmegaIR_Contracts` (id, intent, authority_level, expected_outcome). `evidence_text` is additive and nullable; `KaiMemoryStore` adds it with a guarded `ALTER TABLE` so an existing database keeps its rows and verdicts. `openDatabase` lives in `apps/api/src/sqlite.ts` and is shared with `omega-persistence.ts`.
- UI: `apps/web/src/InvisibleComputer.tsx` is the hero surface in `App.tsx` — one input ("WHAT SHALL WE MAKE REAL?"), a terminal that reveals the API's recorded steps, and the `VERIFIED` / `DIVERGENT` / `UNKNOWN` / `NOT_EXECUTED` badge. Each row in the `KAI MEMORY` list carries a `REPLAY` control that calls the replay endpoint and renders `→ VERIFIED`, or `→ UNKNOWN|DIVERGENT · <reason code>` inline (`data-replay-state`); a record is never shown as re-verified until the digest recomputes.
- `authorityLevel` in the request body may be `AUTONOMOUS`; the endpoint still only answers (CAPABILITY != AUTHORITY), and the contract records a bounded plan.
- Tests: `node --experimental-strip-types --test ./tests/integration/execute-route.integration.test.ts` (needs `apps/api/dist` built, like the route-contract test).

## Single body compression (4×4×4×4)
`GET /v1/ecosystem/body` carries a `compression` block: the seven runtime layers projected onto four axes of four coordinates (256 cells) with a local compress→expand proof. `POST /v1/ecosystem/body/expand` takes `{ compression }` and returns the records; a tampered digest is `400 DIGEST_MISMATCH`. Contract: `packages/mini/src/single-body.ts`; doc: `docs/SINGLE-BODY-4X4X4X4.md`; UI: `apps/web/src/SingleBodyPanel.tsx`. Coordinates are a declared projection (`body.layers.v1`), not inferred truth.

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
