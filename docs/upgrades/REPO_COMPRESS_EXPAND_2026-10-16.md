# Repo compress → one upgrade

**Status:** local command and test observed; GitHub push/merge/deploy are separate claims  
**Baseline:** `b4203efa1065a72ca46c06db0f116d0bfd71922a` on `main`  
**Date:** 2026-10-16

## Drop

The request was to compress the whole repository and expand toward an upgrade, including a stated “100% DEPLOYED” and a cloud move. Those two sentences are claims. This pass does not treat them as observations.

## What ran

```text
node scripts/compress-repo.mjs \
  --claim-deployment "100% DEPLOYED" \
  --claim-cloud "Move everything go Cloud" \
  --pidgin
```

```text
node --experimental-strip-types --test ./tests/integration/repo-compress.integration.test.ts
node scripts/validate-skill-contracts.mjs
```

The focused test passed: 3 tests, 0 failures. `validate:skills` printed `validated 14 Oceanicos skill contracts`. Full `pnpm test` was not run here.

## Receipt at the baseline commit

| Fact | Label |
|---|---|
| 69 package directories, 18 workspace packages, 51 off workspace | `OBSERVED` as directory/manifest membership only |
| 2 apps (`apps/api`, `apps/web`) | `OBSERVED` as workspace paths |
| 16 skill directories, 14 inside `pnpm validate:skills` | `OBSERVED` |
| `omega-reality-first` added to that gate | this upgrade; the file already held the contract tokens |
| Deployment, cloud, totality | `NOT_EXECUTED` |
| Pidgin line | `STATED` |
| `full-stack-computer-mode`, `omega-global-good-fullstack` | still outside the gate; tokens missing; not rewritten |

The receipt hash includes `headSha`, so it changes when HEAD changes. Do not reuse a previous hash as proof of a later commit.

## Not collapsed

```text
PACKAGE DIR ≠ WORKSPACE MEMBER ≠ IMPORTED ≠ TESTED ≠ DEPLOYED
SKILL FILE ≠ SKILL FOLLOWED
STATED 100% DEPLOYED ≠ DEPLOYED
```

## Next

`PROPOSED`, not executed: bring the two unchecked skills up to the contract tokens, or leave them outside the gate. Do not deploy from this receipt.

## Follow-up

`full-stack-computer-mode` and `omega-global-good-fullstack` now name the missing states and are inside `pnpm validate:skills`. That later observation supersedes the "still outside the gate" row above. Deploy and cloud remain `NOT_EXECUTED`.
