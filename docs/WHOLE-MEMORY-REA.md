# Whole memory → REA

Source-only addition. These paths are **on disk** and **not** workspace members.

```text
PRESENT ON DISK
  ≠ WORKSPACE MEMBER
  ≠ DECLARED API DEPENDENCY
  ≠ DEPLOYED
```

| Path | Role |
|---|---|
| `packages/validation-rules` | Epistemic schemas: KNOWN, REMEMBERED, PLANNED, VERIFIED |
| `apps/attestation-node` | 10-phase `VerifiedEvolution` engine and historical snapshot |

They are intentionally absent from `pnpm-workspace.yaml`. Promoting them would also require `docs/REPO_INVENTORY.md` to change, and that contract test is the gate.

## Invariant

`W_{t+1} = VerifiedEvolution(W_t)`

A cycle may promote at most one `PLANNED` node, and only when all of the following hold:

- the snapshot parses
- `systemInvariantsPassed` is true
- confidence is **strictly greater** than `0.90`
- `blockers` is empty
- `targetModulePath` is set
- the injected REA bridge returns no unknowns and no injection findings

## Fail closed, including a missing bridge

The draft that returned `true` from a `catch` around `npx rea-agents` treated a missing tool as proof. This engine does not spawn a shell. The bridge is a function. If it throws, or if the module path was never registered, the cycle refuses and `W_t` is left unchanged.

## Run the loop

From a checkout that can resolve `zod`:

```bash
node --experimental-strip-types --test apps/attestation-node/src/memory-engine.test.ts
```

`zod` is declared on the source-only package. It is not installed by the root workspace until this package is earned.
