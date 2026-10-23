# Ω∞v OceanicOS repository guide

These notes describe the checked-in workspace. If they conflict with a manifest, source file, or workflow, inspect the live source and update this guide rather than following stale instructions.

## Workspace and runtime

- This is a pnpm 10.34.5 TypeScript monorepo. The root manifest requires Node.js 22 or newer.
- Workspace packages live in `packages/*`; the Fastify API is in `apps/api`; the React/Vite web app is in `apps/web`.
- The API package is ESM (`type: module`), not CommonJS. Build workspace dependencies before starting the compiled API.
- The web app uses React 19 and Vite 8. Its development server is on port 3000; the API listens on port 5000.
- `pnpm dev` runs the root `predev` build, then starts both apps through `bin/dev-server.mjs`. Stop that orchestrator with Ctrl+C. Do not kill unrelated Node processes.
- The web app uses browser-relative `/api` requests. Vite proxies `/api` to `http://localhost:5000` by default and strips the `/api` prefix. `VITE_API_PROXY_TARGET` overrides the proxy target.

## Development and deployment profiles

- `docker-compose.base44.yml` is a tracked development profile. It bind-mounts the workspace, runs with `NODE_ENV=development` and `OMEGA_AUTH_MODE=local`, and sets `OMEGA_ALLOW_UNSIGNED_CYCLE=true`. Do not use that profile for production or real unsigned attestations.
- The Base44 profile loads `.env.base44-defaults` followed by `/run/base44/app.env`; keep real credentials out of the tracked defaults file and never print environment-file values. Runtime injection is intended to override development defaults.
- `docker-compose.yml` is the production-oriented local Compose profile. It requires `OMEGA_SIGNING_KEY`, `OMEGA_READ_TOKEN`, and `OMEGA_ADMIN_TOKEN` through environment substitution, runs auth-required mode, and mounts `oceanicos-data` at `/app/data`.
- Local Compose volumes are not evidence of Cloudflare-managed durability, backups, replication, or restore readiness.
- `.github/workflows/deploy.yml` verifies and stages a release bundle; its manifest says `STAGED_ONLY`. It has no provider-specific publish step. Do not claim a deployment from CI staging.

## Persistence and authentication

- Runtime state is not a single file: the API uses SQLite-backed ledger and command/revocation stores, plus file-backed runtime snapshots, event logs, and other journals.
- Before changing persistence, inventory every store and preserve hash-chain integrity, command idempotency, lease/revocation atomicity, and recovery behavior. Do not assume an object-store FUSE mount has the semantics required by live SQLite.
- `OMEGA_AUTH_MODE` defaults to `local` outside production and `required` in production. Required mode needs distinct `OMEGA_READ_TOKEN` and `OMEGA_ADMIN_TOKEN` values.
- The API can boot without an attestation signing key, but attestation is degraded and attestation requests fail closed. Interpret `/health` capability checks, not only its HTTP status; overall readiness and individual capability status are reported separately.
- Configure production CORS with explicit origins through `OMEGA_CORS_ORIGINS`; do not widen CORS to make a broken client work.

## Verification commands

- `pnpm install --frozen-lockfile` installs the locked workspace.
- `pnpm build` builds all workspace packages and apps.
- `pnpm test` runs the configured build, focused web DOM tests, and Node integration tests. It is not a deployment or production-runtime test.
- `pnpm validate:ci` checks workflow contracts and verifies tracked Base44 credential defaults are explicit placeholders without printing their values.
- `pnpm run smoke:api` runs the repository's bounded local API/SSE smoke.
- `pnpm format:check` is `git diff --check`; it is a whitespace check, not a formatter.
- For local full-stack checks, use `pnpm dev`, verify the web and API independently, use temporary persistence when existing local data is present, and stop only the orchestrator started for the check.

Reconfirm repository identity, branch, worktree, package manifests, ports, and relevant tests before each code change. Keep source changes bounded, preserve user work, and report build, test, CI, deployment, and runtime evidence separately.
