# @omega-v/friction

Friction & Dissent Tracker for Ω∞v Oceanicos (Pillars 20-21).

## Role in OCEANICOS

This package is one bounded module in the Ω∞v workspace. Its declared scope describes the problem area it is intended to address; the exported source and tests define the actual behavior available at this revision.

## Source and contract

- Entry point: [`src/index.ts`](src/index.ts)
- Focused tests: [`src/__tests__/friction.test.ts`](src/__tests__/friction.test.ts)
- Manifest: [`package.json`](package.json)

Read the public exports before depending on a type or method. Keep input validation, errors, state changes, and evidence outputs explicit. Do not infer a distributed service, external integration, cryptographic guarantee, or production deployment from the package name or description alone.

## Local checks

Run the scripts that this package actually declares:

```bash
pnpm --filter @omega-v/friction build
pnpm --filter @omega-v/friction test
```

From the repository root, `pnpm build` builds the declared workspace packages. A test result applies only to the tests executed against the revision and environment reported by the runner.

## Evidence boundary

`DECLARED ≠ IMPLEMENTED ≠ TESTED ≠ OBSERVED ≠ VERIFIED ≠ DEPLOYED`. This README is navigation and usage guidance, not a runtime attestation. For consequential claims, record the revision, command, result, environment, and known limitations.
