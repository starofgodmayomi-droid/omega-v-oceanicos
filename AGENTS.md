# Base44 Dev Environment — Ω∞v Oceanicos

## Overview
pnpm monorepo: Fastify API (`apps/api`) + Vite/React web (`apps/web`), with TypeScript workspace packages in `packages/`.

## Running
```bash
docker compose -f docker-compose.base44.yml up -d
```
- **setup** (one-shot): installs deps + builds workspace packages + builds API
- **api**: runs `tsc --watch` + `node --watch dist/index.js` on port 8000 (→5000 internal)
- **web**: runs `vite --host 0.0.0.0` on port 3000

## Key details
- **Node 22 required** — the `@omega-v/kernel` package is ESM (`"type": "module"`) and the API (CommonJS) uses `require()` of it, which only works in Node 22+.
- **ts-node doesn't work** for the API dev command because imports use `.js` extensions (e.g. `./jobs.js`) that ts-node can't resolve to `.ts`. Instead, `tsc --watch` compiles to `dist/` and `node --watch` runs the output with live restart.
- **Workspace packages must be built** before the API can start — their `main` points to `dist/index.js`. The setup service builds them in dependency order.
- **Auth mode**: `OMEGA_AUTH_MODE=local` (set in compose) — no bearer tokens needed for dev. The signing key is a local dev placeholder in `.env.base44-defaults`.
- **CORS**: API uses `origin: '*'` — works with separate origins.
- **VITE_API_URL**: set to `https://8000-${BASE44_PUBLIC_HOST_SUFFIX}` so the browser can reach the API.
- **SSE limitation**: the `/v1/stream` EventSource endpoint won't connect through the preview proxy (long-lived connections are unsupported). This shows as "Reconnecting…" in the UI but doesn't affect REST endpoints.

## Fixed bug
`apps/api/src/index.ts` line 204: `persistenceEncryptionKey` was undefined → changed to `encryptionEnabled(persistenceKey)` to match the pattern used at lines 163/165.

## No external credentials needed
All secrets (signing key, tokens) are local dev values in `.env.base44-defaults`. No external service credentials are required for the app to run.
