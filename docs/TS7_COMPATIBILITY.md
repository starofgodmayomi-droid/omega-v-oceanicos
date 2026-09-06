# TypeScript 7.0.2 Compatibility Boundary

**Status:** blocked by upstream toolchain support; no local workaround is asserted.

The rebased TypeScript toolchain update in PR #125 resolves to **TypeScript 7.0.2**. Earlier references to TypeScript 6 in the migration commits are incorrect labels and remain visible in history as a correction record. The observed compiler version is not in dispute.

## Evidence matrix

| Surface                        | Observed dependency                                            | Evidence                                                   | Result                                                                                                       |
| ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Node 22 lint                   | `@typescript-eslint/parser@8.67.0` with TypeScript `7.0.2`     | Authoritative Verification Pipeline log for PR #125        | Parser exits before linting and reports that typescript-eslint does not support TS 7.0.                      |
| Windows tests                  | `ts-jest@29.4.12` with TypeScript `7.0.2`                      | Authoritative Windows compatibility log for PR #125        | Transformer exits before tests and reports that TS 7.0 does not expose the compiler API required by ts-jest. |
| Published parser metadata      | `@typescript-eslint/parser@8.67.0` peer range `>=4.8.4 <6.1.0` | Current package registry metadata observed during this run | TS 7.0.2 is outside the declared peer range.                                                                 |
| Published transformer metadata | `ts-jest@29.4.12` peer range `>=4.3 <7`                        | Current package registry metadata observed during this run | TS 7.0.2 is outside the declared peer range.                                                                 |

The upstream tracking issue [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) is open. Its existence is supporting context, not proof that a future release will resolve this repository’s complete lint and test matrix.

## Decision boundary

The repository must not force a green result by suppressing the parser, skipping the test transformer, weakening typed linting, or changing the CI verdict semantics. A valid repair requires either an upstream release that supports the observed compiler APIs or an explicitly designed dual-compiler arrangement in which project type-checking and Jest transformation use compatible, independently verified compiler interfaces.

Until that repair is implemented and verified on Node 22 and Windows, PR #125 remains **not green** and TypeScript 7 support remains **unverified**. The current `main` baseline and unrelated local slices must not be described as TypeScript 7-compatible merely because TypeScript 7 installs successfully.

## Reproducibility note

The evidence above comes from the rebased PR’s authoritative GitHub workflow at commit `f01a8c8426e531cfda5e86b8f94ab9d21c1c5d36`, not from a local substitute. Local repository verification on the separate feature worktree uses the existing TypeScript 5 toolchain and therefore does not attest to TypeScript 7 compatibility.
