# Local Compose Deployment

This is a **local-first** deployment profile for the Oceanicos API, web dashboard, Ollama, and Qdrant. It is a finite local validation gate—not proof of a production deployment or runtime health.

## Safe defaults and network boundaries

- API and web host ports bind to `127.0.0.1` by default. This keeps the default stack reachable from the host but not directly exposed on LAN/public interfaces.
- Qdrant (`6333/6334`) and Ollama (`11434`) are pinned to loopback host bindings. API-to-service traffic uses the private Compose network via `qdrant:6333` and `ollama:11434`.
- Qdrant and Ollama are supporting services and are not currently required by the main API code path; do not expose their unauthenticated service ports to an untrusted network.
- Qdrant is pinned to `qdrant/qdrant:v1.19.2`; Ollama to `ollama/ollama:0.40.3`. Re-evaluate and explicitly update versions when planning upgrades.
- To expose the API/web intentionally behind a reviewed firewall or TLS reverse proxy, set `API_BIND_ADDRESS` and/or `WEB_BIND_ADDRESS` to the required host interface, set `VITE_API_URL` to the actual browser-reachable API origin, and set `OMEGA_CORS_ORIGINS` to the exact allowed web origin. Do not set these to `0.0.0.0` casually. Keep Qdrant and Ollama loopback-only; use an authenticated tunnel for maintenance access.

## Configuration

Copy `.env.compose.example` to `.env` and replace every credential placeholder with unique local-only secrets. The Compose profile requires a signing key, a read token, and a distinct admin token. Do not commit `.env` or paste secret values into logs, issues, or pull requests.

```bash
cp .env.compose.example .env
pnpm install
pnpm build
docker compose config
```

The API runs with `OMEGA_AUTH_MODE=required`; protected ledger and telemetry routes need the configured read token. The Compose healthcheck uses the unprotected `/health` endpoint. `OMEGA_CORS_ORIGINS` defaults to `http://localhost:3000` for the local web origin.

## Start and validate

Only after replacing the placeholders in `.env`:

```bash
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:5000/health
curl -fsS -H "Authorization: Bearer $OMEGA_READ_TOKEN" http://localhost:5000/v1/block/tip
curl -fsS -H "Authorization: Bearer $OMEGA_READ_TOKEN" http://localhost:5000/v1/stream
curl -fsS http://localhost:3000
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
