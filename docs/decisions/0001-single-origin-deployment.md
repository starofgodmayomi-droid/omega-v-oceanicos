# 1. Serve the web client from the API's origin

- **Status:** accepted
- **Date:** 2026-08-16
- **Supersedes:** nothing
- **Alternative preserved at:** `copilot/vscode-msuuu2nd-rgqb`

## Context

The client addresses the API as `/api/...`. For a while that prefix existed
only as a rewrite rule in the Vite dev server, which meant a production build
called `/api/*` and nothing answered: the routes worked on the development
path and not the one that ships. `apps/web` was also absent from the image
entirely, so the client had no production origin at all.

Two answers to that were written independently.

## Decision

One origin. The API strips the `/api` prefix itself, so every route answers
identically at `/health` and `/api/health`, and serves the built client from
the same origin when a bundle is present. `OMEGA_WEB_DIST` selects the bundle
and the API runs without one, so the client is optional rather than required.

A single image is built and smoke tested on every pull request, and published
to `ghcr.io` with signed build provenance on every merge to `main`.

## Consequences

**What this buys.** No CORS surface, no reverse proxy to configure, no second
image to version, and one artifact whose provenance can be verified with a
single `gh attestation verify`. The smoke test can assert the whole system —
`/api/health`, `/api/rules`, and the client at `/` — against one running
container.

**What it costs.** The client and the API scale together and are versioned
together. Serving static files from Node is less efficient than nginx. A
deployment wanting the client on a CDN has to bypass this rather than
configure it.

## The alternative, and why it is preserved rather than deleted

`copilot/vscode-msuuu2nd-rgqb` carries the other answer: `Dockerfile.api`,
`Dockerfile.web`, and a compose file running the API on 3000 and nginx on
3001, with `depends_on` gated on the API's health check.

Its instincts are sound. nginx is the right thing to serve static assets, the
health gate is correct, and separating the images allows the two halves to be
scaled and released independently. If this repository ever outgrows one
origin, that shape is where to start, and the branch is kept so that starting
point is not lost.

**It must not be adopted as written.** The compose file contains:

```yaml
OMEGA_SIGNING_KEY: ${OMEGA_SIGNING_KEY:-key-2026-08-container-dev}
```

A default signing key. `AttestationService` refuses to construct without a key
precisely so that no key ships with the artifact — a key baked into an image
is a key held by everyone who pulls it, and every attestation it produces is
forgeable by them. That guard was added deliberately and this default defeats
it at the orchestration layer, where the code cannot see it.

Any revival of the two-container topology must drop the default and let
`docker compose up` fail loudly when `OMEGA_SIGNING_KEY` is unset. Failing to
start is the correct behaviour; starting with a public key is not.

The branch is 95 commits behind `main` and cannot be merged as it stands. It
is preserved as a record that a different answer existed and was considered,
not as work waiting to land.
