# Production deployment contract

This document is the release boundary for the Ω∞v Oceanicos full stack. It separates build evidence from deployment and runtime evidence.

## Required runtime shape

- **API:** Fastify compiled runtime from `apps/api/dist/index.js`.
- **Web:** Vite production build from `apps/web/dist`.
- **Persistence:** durable volume for the SQLite ledger, runtime snapshot, and append-only event log.
- **Transport:** HTTPS for both origins; SSE must be reachable through the API origin.
- **Frontend binding:** build with `VITE_API_URL` set to the public HTTPS API origin.

## Fail-closed production environment

Start from [.env.production.example](../.env.production.example) and inject values through the host's secret manager. Never commit real secrets.

Required values:

- `OMEGA_AUTH_MODE=required`
- `OMEGA_SIGNING_KEY` with at least 32 secret characters
- Distinct `OMEGA_READ_TOKEN` and `OMEGA_ADMIN_TOKEN`
- `OMEGA_PERSISTENCE=on`
- Durable paths for `OMEGA_DB_PATH`, `OMEGA_RUNTIME_STORE_PATH`, and `OMEGA_EVENT_LOG_PATH`
- `VITE_API_URL=https://...` at web build time

Only `GET /health` is intended to be unauthenticated for a load balancer probe. Read routes require the read token in required mode; mutations require the admin token.

## Release sequence

1. Run `pnpm format:check`.
2. Run `pnpm audit`.
3. Run `pnpm verify:full` with no development server occupying the smoke port.
4. Build the image or services with the production API origin.
5. Start with the secret-managed environment and durable volume.
6. Observe `GET /health` and record readiness.
7. Observe `GET /v1/ecosystem/body` with a read token and record `bodyVersion`, layer statuses, and `expansion` invariants.
8. Observe the web UI and SSE stream through the public HTTPS origin.
9. Record revision, timestamps, health response, rollback reference, and unresolved `UNKNOWN` states.

## Evidence boundary

A green local build or CI run proves source and compiled-runtime behavior only. It does **not** prove public availability, distributed consistency, key custody, backup recovery, identity proofing, or production health. Those claims require separate runtime observations and must remain `UNKNOWN` until observed.
