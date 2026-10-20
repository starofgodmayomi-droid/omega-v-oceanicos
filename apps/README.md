# Applications

The repository exposes two primary runnable applications. This page is the compressed entry point; each app guide owns its detailed configuration and route/component contract.

| App | Stack | Local development URL | Guide |
|---|---|---|---|
| `apps/api` | Fastify HTTP API | `http://localhost:5000` | [API README](api/README.md) |
| `apps/web` | React dashboard served by Vite | `http://localhost:3000` | [Web README](web/README.md) |

## Start both

Requirements: Node.js `>=22` and pnpm `10.34.5`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The root `dev` lifecycle builds the workspace before starting the development servers. Vite's `/api/*` proxy targets `http://localhost:5000` by default. Set `VITE_API_PROXY_TARGET` to override the proxy target for a local environment; check the Vite config and app guides before assuming a target is reachable.

## Useful checks

```bash
pnpm build
pnpm test
pnpm smoke:api
pnpm verify:full
```

Commands are defined by the root manifest. Check the current manifest and workflow before relying on a command or assuming a service is running.

## Evidence boundary

This index documents repository configuration, not current runtime health. A successful build, test, or container smoke test does not by itself prove deployment, availability, security posture, or production correctness.
