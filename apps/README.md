# Applications

The repository's two runnable applications are the Fastify API and the React/Vite web dashboard. Their per-app READMEs are the canonical references for route and feature details; this page summarizes how they fit together and how to start the local development stack.

## Applications

| App | Runtime | Default local URL | Canonical guide |
|---|---|---|---|
| `apps/api` | Fastify HTTP API | `http://localhost:5000` | [API README](api/README.md) |
| `apps/web` | React dashboard served by Vite | `http://localhost:3000` | [Web README](web/README.md) |

The API defaults to port `5000`; `PORT` or `API_PORT` can override it. Vite is configured for port `3000`. Browser-relative `/api/*` requests use the Vite development proxy, which targets `http://localhost:5000` by default; `VITE_API_PROXY_TARGET` can override that target.

## Start the local stack

Requirements: Node.js 22 or newer and pnpm 10 or newer, as declared by the root package manifest.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The root `pnpm dev` command builds the workspace, then starts the API and web development servers together. Press `Ctrl+C` to stop them. See the app-specific guides for per-app configuration details.

Useful root commands:

```bash
pnpm build       # Build workspace packages and apps
pnpm test        # Run the repository's registered integration checks
pnpm verify:full # Run the repository verification sequence
```

## Scope and evidence

This index describes repository configuration and supported commands; it does not establish that a local or deployed service is currently running, healthy, production-hardened, or deployed. Check runtime health with the relevant probes and reconcile their results with the environment being evaluated.

The API's route inventory and configuration belong in [the API README](api/README.md), and dashboard behavior and setup belong in [the web README](web/README.md). Keep this index brief rather than duplicating those contracts.
