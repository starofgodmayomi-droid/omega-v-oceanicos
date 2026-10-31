# MAX COMPRESS — full stack handoff

```text
VERIFY(ΔREALITY)
SOURCE → RUNTIME → REALITY
```

MAX COMPRESS is one bounded pipeline exposed on every surface, not five
separate implementations. This page is the handoff pointer: it names where the
pipeline lives and where its evidence comes from.

## Surfaces

| Surface | Entry                                                                 |
| ------- | --------------------------------------------------------------------- |
| Kernel  | `runOmegaChangePipeline` in `packages/mini/src/pipeline.ts`           |
| API     | `POST /v1/pipeline` (`apps/api/src/pipeline-route.ts`)                |
| Web     | Pipeline panel on the OCEANICOS view                                  |
| CLI     | `node bin/oceanicos.mjs pipeline`                                     |
| Tests   | `tests/integration/omega_pipeline.e2e.test.ts`, `max_compress_stack.e2e.test.ts` |
| CI      | `.github/workflows/verify.yml` — pipeline smoke against the container |

## The pipeline

```text
COMPILE → VALIDATE → ADMIT → EXECUTE → OBSERVE
→ VERIFIED | DIVERGENT | HALTED
```

Each stage is fail-closed. `ADMIT` refuses a change without authority and
policy evidence; `EXECUTE` only runs an already-`ALLOW`ed record; `OBSERVE`
compares the observed state with the expected one and never promotes an
unobserved change to `VERIFIED`.

## What this does not claim

- A `VERIFIED` pipeline run is evidence about the states it was given. It is
  not proof that an external system reached that state.
- Durable memory is reported only when `OMEGA_CAUSAL_MEMORY_PATH` and
  `OMEGA_REALITY_ATTESTATION_KEY` are both configured; otherwise the run is
  in-memory and says so (`durableMemory: false`).
- `DIVERGENT` and `HALTED` are legitimate terminal states. They are not
  errors to be retried into `VERIFIED`.

Canonical calculus: [`docs/OMEGA_CHANGE_CALCULUS.md`](../OMEGA_CHANGE_CALCULUS.md).
