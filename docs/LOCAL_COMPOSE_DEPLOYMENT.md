# Local Compose Deployment

This document defines the finite local deployment gate for the Oceanicos API and built web dashboard, plus optional Ollama and Qdrant services. It is a local validation profile, not proof of a satellite, space-edge, or production deployment.

## Configuration

Copy `.env.compose.example` to `.env` and replace every credential placeholder with unique local-only values. The Compose profile requires a signing key, a read token, and a distinct admin token. Do not commit `.env` or paste its values into logs, issues, or pull requests.

```bash
cp .env.compose.example .env
pnpm install
pnpm build
docker compose config
```

The API container runs with `OMEGA_AUTH_MODE=required` and serves the built React dashboard and API from one origin. Compose maps host port 3000 to the API's container port 5000; its healthcheck uses unauthenticated `/health`, while API reads require a verified Auth0 access token and mutations require the configured approver subject. Compose needs the Auth0 issuer, API audience, JWKS URI, verified approver subject, and public SPA domain/client ID/audience from `.env`. Keep server bearer tokens out of Vite settings.

## Start and validate

```bash
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:3000
curl -fsS http://localhost:3000/health
curl -fsS -H "Authorization: Bearer $AUTH0_ACCESS_TOKEN" http://localhost:3000/v1/block/tip
curl -fsS -H "Authorization: Bearer $AUTH0_ACCESS_TOKEN" http://localhost:3000/v1/stream
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
