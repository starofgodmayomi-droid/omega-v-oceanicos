# Ω∞v Ecosystem Body Equation — Compress, then Expand Outward

**Status:** `SUPPORTED` as a local fixpoint over a declared file ring. Not a claim that the repository was deployed, merged, or upgraded.

Source law: [`ECOSYSTEM_BODY.md`](../ECOSYSTEM_BODY.md).

```text
Ω∞v := Y(λf. λx.
  f(Σ ∪ Hash(x))            if O(E(x)) ≡ VERIFIED
  HALT ⊢ DIVERGENT          if K(x) ∈ SCAM
  HALT ⊢ UNKNOWN            if Evidence(x) = ∅
  HALT ⊢ NOT_EXECUTED       if Authority(x) < Required
) | Reality

M[t+1] = M[t] ∪ Δ    only when Expected ≡ Observed
```

Code removed from a change must still be explainable as a return to this equation. Code added must be one of its cases. This module does not delete the tree and it does not execute the upgrade it names.

## Contract

`packages/mini/src/ecosystem-body-equation.ts`

- `compressRepoEquation(surfaces)` folds a bounded list (at most 64) in order.
  - `VERIFIED` appends `Hash(x)` to memory.
  - `DIVERGENT`, `UNKNOWN`, and `NOT_EXECUTED` halt. The verified prefix is kept. Nothing after the halt is remembered.
  - Shape errors (`EMPTY_BODY`, `BODY_OVER_CAPACITY`, bad paths, duplicate ids) refuse the fold. They are not truncated.
- `compressRepoTowardUpgrade(body)` names one `review-verified-repo` candidate only for a fully `COMPRESSED` memory. `execution` is always `NOT_EXECUTED`. Compression is not permission.
- `expandRepoEquation(body)` restores the remembered paths. A tampered field or digest is `DIGEST_MISMATCH`.
- `observeOutwardFiles(root, ring)` reads the declared ring. Missing, empty, escaping, or oversized files are `Evidence = ∅`.
- `reconcileOutwardExpansion(root, expansion)` re-reads those paths. A hash change is `DIVERGENT`.

`VERIFIED` on a filesystem fold means this process read each path and the file was non-empty, then a second read matched the stored hash. It does not mean the bytes are the right product, and it does not mean an external system observed them.

## Outward ring

`REPO_OUTWARD_RING` is the declared expansion: contract, kernel, API, web, CLI, docs, and the verified-upgrade skill. The list is not evidence. `pnpm compress:repo` is the observation.

## API

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/v1/ecosystem/equation` | Compresses the in-process law constant only. Disk is not read. The outward ring is listed as `NOT_OBSERVED`. |
| `POST` | `/v1/ecosystem/equation` | Compresses `{ "surfaces": [ ... ] }`. Caller-supplied `expected` / `observed` are not an independent observation. |
| `POST` | `/v1/ecosystem/equation/expand` | Restores a body. A bad digest is `400`. |

The upgrade object on each response stays `NOT_EXECUTED`.

## Boundary

A matching digest proves one local round trip. It does not authorize a merge, a deploy, or a write. `UNKNOWN` stays `UNKNOWN`.
