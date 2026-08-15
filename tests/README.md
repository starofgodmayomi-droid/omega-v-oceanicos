# Tests

## Where the tests are

Beside the code they test, in `src/__tests__/` within each package and app.
Beside them, this directory holds the cross-package integration suite and the
guards that check the documentation against the code.

`tests/integration/full-loop.integration.test.ts` runs the API with durability
switched on, drives it over HTTP, then reads what it wrote back out using
`packages/remember` and `packages/attestation` directly rather than the API's
own accessors. A system can agree with itself and still be wrong; here the
writer and the reader are different code paths.

| Suite | Covers |
| --- | --- |
| `packages/observer/src/__tests__/` | capture, normalization, deduplication, validation |
| `packages/verification/src/__tests__/` | rule registry, applicability, evidence paths, caching |
| `packages/attestation/src/__tests__/` | HMAC signing, verification, key handling, rotation |
| `packages/remember/src/__tests__/` | hash chain, durable store, tamper and deletion detection |
| `packages/mini/src/__tests__/` | the kernel cycle, component injection, restart resumption |
| `apps/api/src/__tests__/` | endpoints, validation guards, persistence, prefix parity, documentation |
| `apps/web/src/__tests__/` | the client/API contract |

## Running them

```bash
pnpm test              # everything
pnpm test:coverage     # with the 70% threshold enforced
pnpm test:watch        # watch mode
```

## What is verified beyond the suite

The CI `docker` job builds the image and exercises a running container: it
must refuse to start without `OMEGA_SIGNING_KEY`, then serve `/health`,
`/rules`, `/complete-loop`, `/log`, the same routes under `/api`, and the web
client at `/`. Passing tests proved the code runs under a test runner; that
job is what proves the artifact runs.

## Known gaps

- `apps/web/src/App.tsx` is excluded from the coverage denominator. Covering it
  needs jsdom and a component testing setup that does not exist here. The
  exclusion is explicit in `jest.config.js` so the reported percentage is not
  read as covering more than it does.
- `pnpm test:integration` matches no tests, because this directory is empty.
  It passes rather than failing on an empty match, which is honest only for as
  long as this note stays next to it.
