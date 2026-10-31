# Retired jest suites

These suites were written against the API as it existed before the Fastify rewrite. They are
kept for their assertions, not for their plumbing: `jest.config.js` ignores this directory, and
`pnpm test:legacy` runs only what remains in `apps/api/src/__tests__/`.

## Why none of these run

They load the API entry point the pre-rewrite way — `import app from '../index'` (a default
export) or `import app from '../server'` — and drive it through `node:http` `createServer(app)`.
The entry point is now a Fastify instance exported by name, so there is no default export and no
request listener to hand to `createServer`.

Loading the current entry point from jest fails in **both** module modes, which is why this is a
rewrite rather than a configuration fix:

| jest mode | what breaks |
| --- | --- |
| CommonJS (`tsconfig.jest.json`) | `apps/api/src/index.ts` uses `import.meta.url` in its run-if-main guard; a CommonJS require of the file cannot parse it. |
| ESM (`extensionsToTreatAsEsm` + `--experimental-vm-modules`) | `apps/api/src/sqlite.ts` calls `require('node:sqlite')` inside its fallback branch; ESM has no `require`. |

Three more suites are retired for their own reasons:

- `documentation.test.ts` scrapes `/app\.(get|post)\('/` out of `index.ts` to find the routes.
  Fastify registers routes through `fastify.get(...)`, so the scrape now finds zero routes.
- `route-inventory.test.ts` checks every route in `API_ROUTE_INVENTORY` is registered. That intent
  is covered by `tests/integration/api-route-contract.integration.test.ts`, which runs.
- `api.memory-integrity-degraded.test.ts` builds `new FileMemoryStore(...)` and imports a type from
  `express`; `FileMemoryStore` is no longer constructible that way.

## Where the same intent is covered today

The runnable coverage of the current API is the `node --test` files under `tests/integration/`:
`api-route-contract`, `api-cors-auth`, `web-api-proxy`, `execute-route`, `repo-access-control`,
`reality-gate`, `one-body-ecosystem` (`/v1/ecosystem/body`), and `mesh-validation`
(`/v1/mesh/validate`, ported from the retired `mesh-validation.test.ts`).

## Reviving one of these

Do it on the runner that works: port the assertions to `tests/integration/<name>.integration.test.ts`
with `node:test` + `node:assert/strict`, importing `createApp` from `../../apps/api/dist/index.js`
and driving it with `app.inject(...)`. `tests/integration/mesh-validation.integration.test.ts` is
the worked example of that port.
