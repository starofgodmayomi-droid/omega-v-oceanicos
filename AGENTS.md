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
- **Transient `[vite] http proxy error: /v1/... ECONNREFUSED 172.18.0.x:5000` lines in the `web` log are expected while the API is restarting.** `tsc --watch` + `node --watch` in the `api` service leave a few seconds (longer if a compile errors mid-edit) where nothing listens on 5000, and the WORKERS panel polls every 10 s. The target is still correct: once the rebuild finishes the same lines stop and `curl http://localhost:3000/api/v1/omega/workers` returns 200. Only a *persistent* stream of them means a real misconfiguration (wrong `VITE_API_PROXY_TARGET`, or an API that never turns healthy).
- **Workspace packages must be built** before the API can start — their `main` points to `dist/index.js`. The setup service builds them in dependency order.
- **SSE through the preview proxy**: with the CORS header fix described above, `/v1/stream` does connect from the browser through the preview proxy (status bar reads "Connected", runtime stream marked VERIFIED). If the proxy drops a long-lived connection the UI shows "Reconnecting…" and retries; REST endpoints are unaffected either way.

## Invisible Online Computer (KAI → ELION → OMEGA → KAI)
- `POST /api/execute` (alias `POST /execute`, which is the Vite proxy's rewritten target) runs the four-step loop from `apps/api/src/execute-route.ts`:
  1. **KAI observe** — `scanIntent` matches known scam patterns; a match halts with `status: "DIVERGENT"`, `reason: "KAI Shield blocked this intent."` and writes nothing.
  2. **ELION execute** — `executeElion` calls an OpenAI-compatible `chat/completions` endpoint when `OMEGA_LLM_API_KEY` is set (`OMEGA_LLM_BASE_URL`, `OMEGA_LLM_MODEL` optional). Without a key it returns the clearly labelled `local-deterministic` composer. A failed model call returns empty text, not an invented answer.
  3. **OMEGA verify** — `verifyOmega` recomputes the SHA-256 evidence hash and checks the text against the `OmegaIR_Contracts` row; empty text, a broken digest, or a fabricated completion collapses to `UNKNOWN`.
  4. **KAI remember** — only `VERIFIED` outcomes are appended to `KaiMemory`.
- `GET /api/kai/memory?limit=n` (alias `GET /kai/memory`) returns the most recent memory rows.
- Storage is the same SQLite file family as the other API stores: `<dbPath>.kai.db`, tables `KaiMemory` (id, timestamp, intent, evidence_hash, status) and `OmegaIR_Contracts` (id, intent, authority_level, expected_outcome). `openDatabase` lives in `apps/api/src/sqlite.ts` and is shared with `omega-persistence.ts`.
- UI: `apps/web/src/InvisibleComputer.tsx` is the hero surface in `App.tsx` — one input ("WHAT SHALL WE MAKE REAL?"), a terminal that reveals the API's recorded steps, and the `VERIFIED` / `DIVERGENT` / `UNKNOWN` / `NOT_EXECUTED` badge.
- `authorityLevel` in the request body may be `AUTONOMOUS`; the endpoint still only answers (CAPABILITY != AUTHORITY), and the contract records a bounded plan.
- Tests: `node --experimental-strip-types --test ./tests/integration/execute-route.integration.test.ts` (needs `apps/api/dist` built, like the route-contract test).

## Single body compression (4×4×4×4)
`GET /v1/ecosystem/body` carries a `compression` block: the seven runtime layers projected onto four axes of four coordinates (256 cells) with a local compress→expand proof. `POST /v1/ecosystem/body/expand` takes `{ compression }` and returns the records; a tampered digest is `400 DIGEST_MISMATCH`. Contract: `packages/mini/src/single-body.ts`; doc: `docs/SINGLE-BODY-4X4X4X4.md`; UI: `apps/web/src/SingleBodyPanel.tsx`. Coordinates are a declared projection (`body.layers.v1`), not inferred truth.

## Fixed bug
`apps/api/src/index.ts` line 204: `persistenceEncryptionKey` was undefined → changed to `encryptionEnabled(persistenceKey)` to match the pattern used at lines 163/165.

## Continuum verdict (Reality////Ω∞v)
`POST /v1/omega/continuum` (`apps/api/src/continuum-route.ts`, registered in its own rate-limited scope after the auth hook) exposes the operator from `packages/mini/src/continuum.ts`:

- Body `{ drops: [...], memory?: string[] }`; each drop is `{ delta, expected, observed?, evidence[], authority, requiredAuthority?, scam? }` (1..64 drops, ≤16 evidence refs).
- Reply `{ status, halted, memory, steps[], contract, scope }` — `status` is the halt verdict (`VERIFIED` when the drops ran out).
- **It judges the supplied fields only**: nothing is executed, observed, or persisted, so it is safe for a dashboard to poll. Do not read a `VERIFIED` reply as an independent verification of reality.
- Omega commands can never become `VERIFIED` over HTTP (`/observe` is caller-supplied and `/verify-reality` requires an independent observation), so do not derive the dashboard's drops from command history — send the drops you want judged.
- Verified in this environment: 200 with `status: "VERIFIED"` and `memory: ["S1","S2"]` both directly on 5000 and through `/api/v1/omega/continuum` on 3000; tests `continuum-fixed-point.integration.test.ts` and `continuum_api.integration.test.ts`.
- Dashboard panel: `apps/web/src/ContinuumVerdictPanel.tsx`, mounted in `WholeEcosystemDashboard` after the single-body panel. It derives its drops from state the screen already holds (SSE stream, ledger integrity, ecosystem body) and **only posts when RUN VERDICT is clicked** — no mount-time fetch, so it never adds network calls to a page load and `CurrentAppShell`'s "no POST" assertion stays true. Where the screen holds no value the drop carries empty evidence and no observation, so the operator answers UNKNOWN rather than the panel inventing one. DOM test `ContinuumVerdictPanel.test.tsx` is part of `test:current-dom` (and therefore `test:web`).

## No external credentials needed
All secrets (signing key, tokens) are local dev values in `.env.base44-defaults`. No external service credentials are required for the app to run.

## Verify
- API health: `curl http://localhost:5000/health` → `{"status":"ok",...}`
- Web: `curl http://localhost:3000` → Vite-served HTML with `/@vite/client` and `/src/main.tsx`.
- Proxy through the web dev server: `curl http://localhost:3000/api/v1/omega/workers` → `{"success":true,...}` (this is the path the WORKERS panel uses).
- `docker compose -f docker-compose.base44.yml ps` → api healthy, web healthy.
- Full build: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'corepack enable && pnpm build'` → every workspace package builds.
- Relevant tests: `docker compose -f docker-compose.base44.yml exec -T api sh -c 'node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/web-api-proxy.integration.test.ts'`.

## E2E tests
The whole gate, in the sandbox, from the `api` container (pnpm is not on the image, so activate it first):

```bash
docker compose -f docker-compose.base44.yml exec -T api sh -c \
  'cd /app && corepack enable && corepack prepare pnpm@10.34.5 --activate && pnpm test:e2e'
```

- `test:e2e` = `pnpm build` → `pnpm test:web` (6 jest DOM suites in `apps/web`) → one `node --experimental-strip-types --test` run over an **explicit** file list. Node's `--test` discovers nothing here and accepts no path filter, so the list in `package.json` is the gate. `test` and `test:e2e` run the same 62 files.
- `tests/integration/e2e-suite-contract.integration.test.ts` guards that list: every `tests/integration/*.test.ts`, every `tests/__tests__/*.test.ts`, and every `apps/web/src/__tests__/**` suite is either run by a gate or named in `KNOWN_UNRUN` with its reason, every `*.e2e.test.ts` is run by both scripts, and `test`/`test:e2e` cannot drift apart.
- Verified 2026-10-31 in this environment: build clean, **1234 node tests / 0 failures** over the 62-file gate, plus the DOM gate (6 suites / 11 tests).

### Jest → node:test migration (2026-10-31)
The root `jest.config.js` was dead config: no script ran jest, jest was not a
root dependency, and the config could not start (`ts-jest` uninstalled,
`jest.setup.ts` fails to typecheck). The suites it named ran nowhere — the
same failure the gate was built to stop, in a second location. Fixes:

- `tests/harness/jest-compat.ts` implements exactly the matchers those suites
  use on top of `node:assert/strict` (`toBe`, `toEqual`, `toContain`,
  `toMatch`, `toHaveLength`, the comparisons, the null/defined/truthy pair, and
  `.not`), plus `it.each`. Anything else throws. The suites keep their
  assertions; only the import line changed.
- 15 `tests/__tests__` suites and 6 `apps/web/src/__tests__` model suites now
  run in the node gate. `tests/harness/api-routes.ts` reads routes from every
  `apps/api/src` module (they moved into `register*Route` files), which is what
  the web/API contract test now compares against.
- Moving the suites surfaced real drift, fixed here rather than papered over:
  `docs/BRAND.md` still published the pre-oceanic palette (and omitted four
  tokens `tokens.css` defines); the App.css literal-colour claim had grown from
  109/146 to 124/198 and now lives next to the tokens; `packages/README.md`
  never named `@omega-v/oreade`; `apps/api/README.md` never stated the kernel
  unit; `apps/data` (an untracked scratch dir) was treated as an app;
  `scripts/smoke-api.cjs` spawns `dist/index.js`, not `dist/server.js`;
  `test:coverage` used `rm -rf`/`mkdir -p` in a repo whose scripts must be
  portable; and `node-support.test.ts` still asserted `--runInBand` jest
  scripts and a CI ledger-smoke that has since been rewritten.
- Parked with reasons in the suite contract (not deleted): `governance.test.ts`
  (its document inventories the pre-`/v1` surface — rewriting a security doc is
  a governance decision), `asymmetric-attestation.test.ts` (a root-level suite
  cannot resolve `@oceanicos/*`; pnpm links workspace packages per package),
  and the two DOM suites that drive the removed Builder-kernel shell
  (`App.test.tsx`, `runtime-health-panel.test.tsx`). `agent-safety-boundary`
  and `act-async-wrapper` moved into the DOM gate, where they actually run.
- Still parked and not yet in any gate: `apps/api/src/__tests__/` and most
  `packages/*/src/__tests__/` remain Jest-global suites. Some packages run
  them per package (`pnpm --filter @omega-v/mood test` passes, 12 tests);
  others declare `test: jest` with no jest linked, so the script fails. The
  root `jest.config.js` is kept only as their alias map.
- Running a suite **by hand** needs the workspace built first. `pnpm build` covers every workspace package; without it `evolve-recompile.e2e.test.ts` and `omega_distributed_coordination.test.ts` die with `ERR_MODULE_NOT_FOUND` for `packages/evolution/dist` and `packages/coordination/dist`, because the compose `setup` service only builds the API's dependency tree.
- Five `tests/integration` files stay outside the gate because they cannot run: `full-loop` and `broken-current` drive the removed `/complete-loop` and `/log` routes, `mini-kernel` and `verification_loop` import pre-rename `@omega-v/*` names under jest globals, and `fullstack_e2e` imports 60+ names that are not workspace members. They are listed in `KNOWN_UNRUN` with those reasons.
- Four suites passed while nothing ran them, and are now in the gate: `omega_pipeline.e2e.test.ts` (called "the executable proof" in `docs/OMEGA_STATUS_VECTOR.md`), `omega_change_boundary.test.ts`, `omega_transition_boundary.test.ts`, and `navigator_contract.integration.test.ts` (previously reachable only through `test:contract`).

## Start-failure investigation (2026-10-28)
`main` was at `1dc8e69b` (PR #536, "do not verify reality from a caller-supplied echo", all CI checks green) when a preview start was reported as failing; this branch already contains that commit, so nothing had to be brought in. A clean `docker compose -f docker-compose.base44.yml down` + `up -d` starts the stack here — `setup` exits 0, `api` turns healthy, `web` serves port 3000 — and the container event history shows no failed attempt, so the reported start failure could not be reproduced in this sandbox. What the running logs did show was the `/api` proxy defect documented above (the WORKERS panel's request returned 502 through Vite); that is fixed, and both the monorepo build and the proxy contract test pass.
