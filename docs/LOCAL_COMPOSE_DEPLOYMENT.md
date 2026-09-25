# Local Compose Deployment

This document defines the finite local deployment gate for the Oceanicos API, web dashboard, Ollama, and Qdrant services. It is a local validation profile, not proof of a satellite, space-edge, or production deployment.

## Configuration

Copy `.env.compose.example` to `.env` and replace every credential placeholder with unique local-only values. The Compose profile requires a signing key, a read token, and a distinct admin token. Do not commit `.env` or paste its values into logs, issues, or pull requests.

```bash
cp .env.compose.example .env
pnpm install
pnpm build
docker compose config
```

The API container runs with `OMEGA_AUTH_MODE=required`. Its healthcheck uses unauthenticated `/health`; protected ledger and telemetry routes require the configured read token. The Compose file also supplies the runtime’s `API_PORT` variable and waits for API health before starting the web service.

## Start and validate

```bash
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:5000/health
curl -fsS -H "Authorization: Bearer $OMEGA_READ_TOKEN" http://localhost:5000/v1/block/tip
curl -fsS -H "Authorization: Bearer $OMEGA_READ_TOKEN" http://localhost:5000/v1/stream
curl -fsS http://localhost:3000
```

For a compiled API contract, including health, ledger, mood, and SSE `TIP`/`BLOCK_MINTED` delivery, run:

```bash
pnpm run smoke:api
pnpm run totality
```

Stop the local stack when finished:

```bash
docker compose down
```

The stream endpoint is the existing `/v1/stream` SSE contract. A local deployment can verify that it emits the initial `TIP` frame and later `BLOCK_MINTED` frames after an authorized cycle. No Ollama model pull is performed by this repository gate, and no external satellite matrix is contacted.
