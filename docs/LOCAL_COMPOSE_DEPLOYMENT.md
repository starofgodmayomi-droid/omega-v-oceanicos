# Local Compose Deployment

This is a **local-first** deployment profile for the Oceanicos API, web dashboard, Ollama, and Qdrant. It is a finite local validation gate—not proof of a production deployment or runtime health.

## Safe defaults and network boundaries

- API and web host ports bind to `127.0.0.1` by default. This keeps the default stack reachable from the host but not directly exposed on LAN/public interfaces.
- Qdrant (`6333/6334`) and Ollama (`11434`) are pinned to loopback host bindings. API-to-service traffic uses the private Compose network via `qdrant:6333` and `ollama:11434`.
- Qdrant and Ollama are supporting services and are not currently required by the main API code path; do not expose their unauthenticated service ports to an untrusted network.
- Qdrant is pinned to `ghcr.io/qdrant/qdrant/qdrant:v1.19.2@sha256:86cdc262da7105228d8d42a9733ee95981b3abc3af891b49a0f89bdcb8bf3e0d`, the official GitHub Container Registry package for release `v1.19.2` ([package and digest](https://github.com/qdrant/qdrant/pkgs/container/qdrant%2Fqdrant)). Ollama is pinned to `ollama/ollama:0.35.1@sha256:292ee7945dfc3d5840a181f3ab86fedb1e66703e02c8af98b50f4da56b7e278c`, matching the stable `0.35.1` image index listed on Docker Hub ([image details](https://hub.docker.com/layers/ollama/ollama/0.35.1/images/sha256-17e945f1aa6e505707eeb621e3f36847d0a4a063d4778f7007645acccfb8bd4f)). The version tag improves readability; the digest locks the pulled artifact. Re-evaluate upstream release provenance, architecture support, and digests before any intentional upgrade.
- The browser build defaults to same-origin `VITE_API_URL=/api`. The production web container owns that path and talks to `http://api:5000` on the private Compose network. Keep the direct API host binding local unless a reviewed external API boundary is explicitly required. To expose the web intentionally, set `WEB_BIND_ADDRESS` behind a reviewed firewall/TLS boundary. Do not set host bindings to `0.0.0.0` casually. Keep Qdrant and Ollama loopback-only; use an authenticated tunnel for maintenance access.

## Configuration

Copy `.env.compose.example` to `.env` and replace every credential placeholder with unique local-only secrets. The Compose profile requires a signing key, a read token, and a distinct admin token. Do not commit `.env` or paste secret values into logs, issues, or pull requests.

```bash
cp .env.compose.example .env
pnpm install
pnpm build
docker compose config
```

The API runs with `OMEGA_AUTH_MODE=required`; protected ledger and telemetry routes need the configured read token. The Compose healthcheck uses the unprotected `/health` endpoint. `OMEGA_CORS_ORIGINS` defaults to `http://localhost:3000` for the local web origin.

## Browser/API authentication boundary — bounded read path

The production web image runs a same-origin **read-only gateway**. Browser requests to `/api/*` never receive the API bearer credential; the gateway injects `OMEGA_READ_TOKEN` only on the server-to-server hop to `http://api:5000`. Browser-supplied `Authorization` and cookies are not forwarded upstream. GET/HEAD requests, including the SSE stream, can therefore use the protected read API without putting service tokens in generated JavaScript.

The gateway deliberately does **not** receive `OMEGA_ADMIN_TOKEN`. POST/PUT/PATCH/DELETE requests to `/api/*` fail closed with `403 WEB_SESSION_REQUIRED` until an authenticated user/session plus CSRF boundary is implemented under [issue #459](https://github.com/starofgodmayomi-droid/omega-v-oceanicos/issues/459). This is a read-path improvement, not completion of browser authentication or authorization.

Do **not** expose `OMEGA_READ_TOKEN` or `OMEGA_ADMIN_TOKEN` with `VITE_*`, embed them in generated JavaScript, pass the admin token into the web container, or switch a production deployment to `OMEGA_AUTH_MODE=local` as a workaround. Mutation controls in the current dashboard can visibly fail with `WEB_SESSION_REQUIRED`; that is the intended fail-closed state until the session layer exists.

## Start and validate

Only after replacing the placeholders in `.env`:

```bash
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:5000/health
curl -fsS -H "Authorization: Bearer $OMEGA_READ_TOKEN" http://localhost:5000/v1/block/tip
curl -fsS -H "Authorization: Bearer $OMEGA_READ_TOKEN" http://localhost:5000/v1/stream
curl -fsS http://localhost:3000
curl -fsS http://localhost:3000/web-health
curl -fsS http://localhost:3000/api/v1/block/tip
# Must fail closed until authenticated browser sessions exist:
curl -i -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/v1/omega/commands
```

For compiled API contracts, including health, ledger, mood, and SSE `TIP`/`BLOCK_MINTED` delivery, run:

```bash
pnpm run smoke:api
pnpm run totality
```

Stop the local stack when finished:

```bash
docker compose down
```

The stream endpoint is the existing `/v1/stream` SSE contract. No Ollama model pull is performed by the repository CI gate, and no external satellite matrix is contacted. Starting Compose pulls the pinned images if they are not present locally, but does not automatically download a language model.
