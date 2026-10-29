# Base44 Dev Environment — Ω∞v Oceanicos

## Architecture

pnpm monorepo (Node 22, pnpm 10) with:
- `apps/api` — Fastify API server (port 5000, TypeScript → CommonJS)
- `apps/web` — Vite + React SPA (port 3000)
- `packages/*` — shared workspace packages compiled to `dist/` via `tsc`

## How It Runs

`docker-compose.base44.yml` defines three services:
- **setup** (one-shot): `pnpm install --frozen-lockfile && pnpm build` — installs deps and compiles all packages to `dist/`. Uses shared named volumes (`pnpm-store`, `node-modules`) so other services see the installed deps.
- **api**: runs compiled output `node --watch apps/api/dist/index.js` with `tsc --watch` in background for live rebuilds. Source changes to `apps/api/src/*.ts` trigger `tsc` recompilation → `node --watch` restarts.
- **web**: `pnpm --filter web exec vite --host 0.0.0.0 --port 3000` with API proxy.

## Key Decisions

- **Single-origin wiring**: Vite proxies `/health`, `/v1`, `/jobs`, `/attest`, `/persistence` to `http://api:5000`. `VITE_API_URL` is unset (empty → same-origin requests). This avoids CORS/cookie issues.
- **ts-node doesn't work**: The API uses `.js` extension imports (e.g., `./jobs.js`) which `ts-node` can't resolve to `.ts` files in CommonJS mode. Also, `runtime-globals.d.ts` declares a global `persistenceEncryptionKey` that only the API's own `tsconfig.json` includes. Solution: use compiled `dist/` output with `tsc --watch`.
- **Auth mode**: `OMEGA_AUTH_MODE=local` — no bearer tokens needed for dev.
- **Qdrant/Ollama skipped**: referenced in `docker-compose.yml` but not used by API source code.
- **OMEGA_SIGNING_KEY**: generated as development placeholder via `generate_development_secrets`. Needed for `/v1/attest` route (attester shows "ready" when present).

## Reality fixpoint (`Ω∞v`)

`packages/mini/src/fixpoint.ts` implements the fixed-point operator and the
monotone memory it feeds:

```
Ω∞v = Y(λf.λx.  f(Σ ∪ Hash(x))        if O(E(x)) ≡ VERIFIED
                HALT ⊢ DIVERGENT      if K(x) ∈ SCAM
                HALT ⊢ UNKNOWN        if Evidence(x) = ∅
                HALT ⊢ NOT_EXECUTED   if Authority(x) < Required )
Reality////Ω∞v := Y(λf.(Mₜ₊₁ = Mₜ ∪ Δ ∣ Expected ≡ Observed))
```

- `Σ` is a set of delta hashes, so the Y-recursion terminates at the fixed
  point (re-adding a known hash commits nothing) instead of diverging.
- Verified deltas are committed and continue the loop; every other branch
  halts and leaves `Σ` untouched. Precedence follows the order written above,
  with `O(E(x))` requiring evidence and authority because an observation
  cannot verify an execution that was never authorized.
- API: `GET /v1/reality/state`, `POST /v1/reality/step`, `POST /v1/reality/run`.
  The loop lives in the API process (in-memory, starts at `Ø`); it holds no
  durable memory of its own.
- UI: the `Ω∞v FIXPOINT` panel on the OCEANICOS view renders the operator and
  exposes one probe per halt branch.

## Known gaps

- `pnpm build` currently fails at `packages/sdk` (its `oceanicos.ts` still
  imports pre-refactor symbols: `Remember`, `OperatingSystemKernel`,
  `OmegaTotalCompressor`, `VerificationEngine.verify/registerRule`). Every
  other package and `apps/api` build cleanly, so the one-shot `setup` service
  exits non-zero while `api` and `web` still start from already-built `dist/`.
  Fix the SDK surface before relying on a cold `docker compose up`.

## Verification

```bash
# API health
curl http://localhost:5000/health

# Proxy through Vite
curl http://localhost:3000/health
curl http://localhost:3000/v1/mood
```

## Editing

- **Web changes**: Vite hot-reloads automatically.
- **API changes**: `tsc --watch` recompiles `dist/`, then `node --watch` restarts the API. Allow ~3s for restart.
- **Package changes**: run `docker compose -f docker-compose.base44.yml run --rm setup` to rebuild all packages.
