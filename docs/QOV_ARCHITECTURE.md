# Qov Architecture Brief

## Conclusion

**Qov is the repository-level name for a living intelligence ecosystem that continuously observes, verifies, attests, and evolves reality without losing provenance.** In the current Omega V implementation, Qov is not a new runtime or a claim of autonomous control over reality. It is a precise framing for the existing verification-first loop and its bounded expansion surfaces.

The current repository already contains the minimum executable Qov cycle:

```text
Observe → Verify → Remember → Attest → Display → Learn → Return
```

The first three stages are the required kernel. The remaining stages are earned expansions that must preserve evidence, cryptographic provenance, human authority, and finite resource boundaries.

## Qov Meaning in Omega V

| Qov capability | Omega V implementation | Provenance preserved by |
| --- | --- | --- |
| Observe | `@oceanicos/observer` and `ObserverEngine` | UUID-backed telemetry, timestamps, and normalized observation contracts |
| Verify | `@oceanicos/verification` and `AsymmetricValidationGuard` | Explicit `PASS`, `FAIL`, or `DIVERGENT` results, rule versions, and signature checks |
| Remember | `@oceanicos/remember` and the MiniKernel memory layer | Append-only SQLite persistence, hash-linked blocks, and integrity checks |
| Attest | `@oceanicos/attestation` and `POST /v1/attest` | HMAC-SHA256 or Ed25519 signatures, verification identifiers, and key metadata |
| Display | Fastify API, React dashboard, SSE stream, and CLI | Readable status surfaces that distinguish verified state from unavailable services |
| Learn | Evolution and drift surfaces | Bounded policy changes and explicit verification before evolution |
| Return | MiniKernel cycles, API cycles, and CLI cycles | A new observed state linked to the prior remembered state |

## Operating Contract

Qov follows the repository invariant **attest, do not assert**. A component may report a state only when it can provide an observation, a verification result, or an explicitly bounded unavailable or degraded status. A successful user-interface response does not prove API health. A passing local test does not prove production deployment. A configured integration does not prove that the integration is active.

Every Qov cycle should therefore preserve the following evidence chain:

```text
source state
  → observation identifier and timestamp
  → verification receipt and rule versions
  → remembered block and previous-hash link
  → cryptographic attestation
  → surfaced result with status and limitations
  → human-authorized evolution
```

## Runtime Boundaries

Qov is intentionally bounded. The current repository supports local observation, verification, hash-chained memory, API and web surfaces, SSE telemetry, CLI evidence, and cryptographic attestation. It does not claim HSM or KMS custody, distributed revocation consistency, production availability, or unsupervised authority over high-impact decisions.

| Boundary | Current policy |
| --- | --- |
| Secrets | Signing keys come from environment configuration and must not appear in logs, dashboards, or evidence artifacts. |
| Authentication | Missing, weak, partial, or invalid credentials fail closed where the route requires them. |
| Evolution | Rule or behavior changes require verification and remain subject to human judgment for ambiguous or consequential actions. |
| Deployment | Docker and CI prove build and smoke-test contracts; they do not by themselves prove production health. |
| Memory | The local ledger is append-only and hash-linked; external persistence is an earned expansion. |
| Dissent | `DIVERGENT` outcomes remain explicit rather than being collapsed into false consensus. |

## Minimal Qov Cycle

The smallest reusable cycle is the MiniKernel flow:

1. **Observe.** Generate or accept a normalized observation with identity and timestamp metadata.
2. **Verify.** Apply explicit rules and produce evidence, including dissent or failure when applicable.
3. **Remember.** Append the result to hash-linked memory and verify chain integrity.
4. **Attest.** Sign the verification result only after the memory step exists and a valid signing key is available.
5. **Surface.** Expose the result through API, web, SSE, or CLI interfaces without overstating its scope.
6. **Evolve.** Change rules or behavior only after the current state and provenance are understood.

This order prevents an attestation from becoming an unsupported assertion. It also makes each stage testable independently.

## Verification Evidence

The canonical full-stack proof command is:

```bash
pnpm install --frozen-lockfile
pnpm run totality
```

The current synchronized `origin/main` state was locally verified with the following evidence:

| Check | Result |
| --- | --- |
| Production build | Passed across the current workspace |
| Strict typecheck | Passed |
| Integration suite | 21 tests passed, 0 failed |
| Compiled API smoke contract | Passed health, ledger, mood, and SSE checks |
| Totality contract | `TOTALITY STATUS: VERIFIED` |
| Repository hygiene | Clean working tree and passing `git diff --check` |

These results establish a verified local repository state. They do not establish deployment availability.

## Next Finite Evolution

The next Qov-oriented engineering slice should be a focused provenance contract test that asserts each completed cycle carries an observation identifier, verification status, previous-hash link, and attestation reference. The test should cover the success path and at least one failure or divergent path. It should not introduce a new service or dependency.

That slice would strengthen the existing architecture by making the phrase **without losing provenance** an executable invariant rather than documentation alone.

## References

[1]: https://github.com/starofgodmayomi-droid/omega-v-oceanicos "Canonical Omega V Oceanicos repository"
[2]: https://github.com/starofgodmayomi-droid/omega-v-oceanicos/blob/main/docs/MINI.md "Omega V MINI kernel documentation"
[3]: https://github.com/starofgodmayomi-droid/omega-v-oceanicos/blob/main/docs/OMEGA_TOTALITY_CONTRACT.md "Omega V Totality Contract"
[4]: https://github.com/starofgodmayomi-droid/omega-v-oceanicos/blob/main/packages/types/src/index.ts "Omega V shared provenance and attestation types"
