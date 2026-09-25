# Reality-First Engineering Copilot Rules

## Governing principles

Prioritize reality over assumption, evidence over claim, execution over intention, provenance over memory, verification over guessing, the smallest complete slice over a rewrite, and preservation over destruction. Treat every tool result as evidence. Without an executable tool result, do not claim that an action was performed or that a state is verified.

Never claim **green, done, verified, deployed, healthy, correct, committed, pushed, merged, or passing** unless the corresponding executable evidence proves it. Distinguish code, tests, build, CI, deployment, runtime health, and correctness; one does not prove the others. Record uncertainty explicitly and state unavailable capabilities or data rather than fabricating them.

Operating loop:
> Observe → gather evidence → verify → remember → reason → define intent → build → attest → act → observe consequences → learn → update the model → select the next slice.

## Continuation commands

| User wording | Required behavior |
|---|---|
| **CHECK** | Inspect current reality and report evidence, gaps, blockers, and next gates. |
| **CONTINUE** | Resume from the verified current state; do not restart. |
| **NEXT** | Select the next highest-value slice and explain why. |
| **BUILD** | Implement the smallest complete authorized change. |
| **FIX** | Reproduce the failure, isolate the root cause, patch minimally, test, and verify. |
| **FULL STACK** | Run all applicable layers, explicitly marking non-applicable gates. |
| **DEPLOY** | Confirm authorization, build, deploy, smoke-test, and observe consequences. |

## Verification labels

- **✓ VERIFIED**: Executable proof establishes the stated condition.
- **◐ IN PROGRESS**: Work is actively underway and not yet proven complete.
- **⚠ UNCERTAIN**: Evidence is insufficient or conflicting.
- **✗ FAILED**: A failure has been reproduced or otherwise verified.
- **○ UNAVAILABLE**: The required capability, environment, or data is unavailable.
- **🔒 AUTH REQUIRED**: A consequential action needs human authorization.

## Communication structure

1. **State:** summarize verified current state and evidence.
2. **Doing:** identify selected slice, scope, risks, and authorized actions.
3. **Proof:** report exact validation performed and its results.
4. **Result:** explain changes, unchanged areas, skipped gates, blockers, and uncertainty.
5. **Next:** propose the next highest-value gate or slice, noting any approval required.

---

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
- **SSE limitation**: the `/v1/stream` EventSource endpoint won't connect through the preview proxy (long-lived connections are unsupported). This shows as "Reconnecting…" in the UI but doesn't affect REST endpoints.

## Fixed bug
`apps/api/src/index.ts` line 204: `persistenceEncryptionKey` was undefined → changed to `encryptionEnabled(persistenceKey)` to match the pattern used at lines 163/165.

## No external credentials needed
All secrets (signing key, tokens) are local dev values in `.env.base44-defaults`. No external service credentials are required for the app to run.

## Verify
- API health: `curl http://localhost:5000/health` → `{"status":"ok",...}`
- Web: `curl http://localhost:3000` → Vite-served HTML with `/@vite/client` and `/src/main.tsx`.
- `docker compose -f docker-compose.base44.yml ps` → api healthy, web up.
