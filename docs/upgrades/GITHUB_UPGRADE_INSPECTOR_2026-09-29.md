# GitHub upgrade inspector

**Status:** Implemented as a fail-closed classifier in `@oceanicos/mini`  
**Date:** 2026-09-29  
**Source:** `skills/omega-reality-first/references/github-upgrade.md`  
**Repository:** `starofgodmayomi-droid/omega-v-oceanicos`

## Intent

Compile the GitHub upgrade workflow into an executable classification gate that inspects an observed repository snapshot and refuses to infer unobserved layers.

## Boundary

`inspectGithubUpgrade()`:

- does **not** clone, push, merge, deploy, authenticate, or contact GitHub
- does **not** treat CI success as runtime health
- does **not** treat a deployment receipt as healthy behavior
- does **not** guess working-tree cleanliness
- returns `executed: false` on every path

Admission (`ALLOW`) means the snapshot was classifiable. It is not an execution receipt and not a deployment.

## Evidence

| Claim | Status |
|---|---|
| Source SHA can be classified when observed | unit + integration tests |
| Missing authority is `DENIED` | unit + integration tests |
| CI ↛ runtime | unit + integration tests |
| Mutating upgrades with dirty/unknown trees are `REVIEW` | unit tests |
| Live GitHub mutation | `NOT_EXECUTED` |
| Production runtime | `UNVERIFIED` |
