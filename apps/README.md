# Applications

The repository exposes two primary runnable applications. This page is the compressed entry point; each app guide owns its detailed configuration and route/component contract.

| App | Stack | Local development URL | Guide |
|---|---|---|---|
| API | Fastify / Node.js | `http://localhost:5000` by default | [apps/api](api/README.md) |
| Web | React / Vite | `http://localhost:3000` | [apps/web](web/README.md) |

## Start both

Requirements: Node.js `>=22` and pnpm `10.34.5`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The root `dev` lifecycle builds the workspace before starting the development servers. The Vite `/api/*` proxy targets `http://localhost:5000` by default; app guides document overrides and runtime details.

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
