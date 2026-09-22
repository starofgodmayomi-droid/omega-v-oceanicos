# AGENTS.md — Base44 dev environment notes for Ω∞v Oceanicos

## Stack
- pnpm monorepo (Node >=22, pnpm >=10). Workspace packages live in `packages/*`, apps in `apps/api` (Fastify, TS→`dist`) and `apps/web` (Vite + React).

## Running here
- `docker compose -f docker-compose.base44.yml up -d` brings up the stack.
- A one-shot `setup` service runs `pnpm install --frozen-lockfile` + `pnpm --recursive run build` (workspace packages resolve via built `dist/`, so they MUST be built before the API can start). `api` and `web` depend on it completing successfully.
- `api`: runs the built API (`node apps/api/dist/index.js`) under `nodemon` watching `apps/api/src` — it rebuilds the `api` package and restarts on source edits. Edits to a `packages/*` package require a rebuild (`pnpm --filter <pkg> run build` or rerun `setup`).
- `web`: `vite` dev server on port 3000 (live reload). API is on port 5000 (separate origin); the web reaches it via `VITE_API_URL=https://5000-$BASE44_PUBLIC_HOST_SUFFIX`. API CORS is `origin: '*'`.

## Auth / secrets
- The app boots in **local dev mode** (`NODE_ENV=development`, `OMEGA_AUTH_MODE=local`) — no bearer tokens required. No external-service credentials are needed to run.
- `OMEGA_SIGNING_KEY` (for `/v1/attest`) is a generated dev placeholder in `.env.base44-defaults`. `OMEGA_AUTH_MASTER_SECRET` / `OMEGA_SECURITY_KEY` / `OMEGA_GATEWAY_SIGNING_KEY` are only required if those specific engines are constructed (not at boot).
- Ollama/Qdrant from the original compose are NOT required to boot (optional inference/vector infra); omitted from the dev compose.

## Verify it works
- `curl -s localhost:5000/health` → 200; `curl -s localhost:5000/v1/mood` → JSON.
- `curl -s localhost:3000` → Vite dev HTML with `/@vite/client` (confirms live source, not a prebuilt bundle).

## Gotchas
- The repo's own `docker-compose.yml` builds prebuilt production images — do NOT use it for editing; use `docker-compose.base44.yml`.
- `pnpm exec vite` must be run from `apps/web` (vite is a devDependency of the web package, not hoisted to the workspace root).
