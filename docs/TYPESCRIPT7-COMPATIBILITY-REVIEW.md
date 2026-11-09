# TypeScript 7 Compatibility Review

**Review date:** 2026-11-09
**Review branch:** `agent/manus/typescript7-compat-review`
**Decision:** Do not upgrade the application branch yet.

## Scope

The latest KAI ledger delta requested a TypeScript 7 compatibility review in an isolated branch. This review temporarily changed the root development dependency from TypeScript `6.0.3` to `7.0.2`, ran the repository gates, and then restored the supported TypeScript 6 baseline.

No TypeScript 7 dependency change remains in the application branch.

## Results

| Gate | TypeScript 7.0.2 | TypeScript 6.0.3 baseline |
| --- | --- | --- |
| `pnpm build` | Passed | Restored baseline |
| Authorized-next selector tests | 7 passed | Previously verified |
| `pnpm test:web` | Failed | 4 suites / 8 tests passed |
| `ts-jest` peer contract | Failed: requires `>=4.3 <7` | Satisfied |

The failing web gate reported:

```text
The TypeScript compiler "typescript" (version 7.0.2) does not expose the JavaScript compiler API required by ts-jest.
To use TypeScript 7 for project type-checking, install it as "@typescript/native" and alias "@typescript/typescript6" as "typescript" for ts-jest.
```

The package manager also reported the direct peer mismatch:

```text
ts-jest 29.4.14 requires typescript >=4.3 <7; found 7.0.2
```

## Decision

TypeScript 7 is **not ready for the main application branch**. A green compile alone is insufficient because the web test gate fails before the test suites can execute. The current TypeScript `6.0.3` baseline was restored, and the existing web gate passed:

- `CurrentAppShell.test.tsx`
- `ConnectorPanel.test.tsx`
- `SingleBodyPanel.test.tsx`
- `InvisibleComputer.test.tsx`
- 4 suites passed
- 8 tests passed

## Safe next step

Keep TypeScript `6.0.3` until one of these is completed in a new isolated compatibility change:

1. Upgrade or replace `ts-jest` with a TypeScript 7-compatible release and rerun the full web gate; or
2. Adopt the TypeScript 7 native compiler/alias arrangement recommended by the failing adapter, with explicit Jest configuration and reproducible lockfile evidence.

Do not merge a TypeScript 7 dependency update based on `pnpm build` alone.
