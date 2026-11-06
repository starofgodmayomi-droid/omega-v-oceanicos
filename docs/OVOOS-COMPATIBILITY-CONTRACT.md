# ΩVØØS Compatibility Contract

**Contract ID:** `omega.ovoos.compatibility.v1`  
**Status:** reviewed compatibility mapping  
**Scope:** interpretation and bounded local validation of ΩVØØS-style artifact fields inside `omega-v-oceanicos`

## Purpose and boundary

This document defines how an ΩVØØS artifact may be read by this repository without creating a second authority system. The artifact is treated as a source design document. Its symbols, checksums, phases, and claims do not acquire security, financial, execution, or authorization meaning merely by being present.

The repository remains evidence-first and fail-closed:

```text
capability != authority
memory != proof
plan != execution
hash != truth
symbol != authorization
```

A compatibility mapping is not an import of the artifact's worldview, an attestation of external reality, or permission to contact an external system.

## Field mapping

| ΩVØØS artifact field | Repository contract | Compatibility rule |
| --- | --- | --- |
| `status` | `VERIFIED \| DIVERGENT \| UNKNOWN \| NOT_EXECUTED` in `packages/mini/src/ecosystem-fixpoint.ts` and the KAI/ELION/OMEGA route | Preserve the status exactly. `VERIFIED` requires the repository's checks to pass; it is never accepted from caller input. |
| `phase_t` | Bounded phase metadata such as `OBSERVE`, `EXECUTE`, `VERIFY`, `REMEMBER`, or `COMPRESS` | Treat as descriptive metadata only. It must not authorize a transition, imply elapsed reality, or create an unbounded loop. |
| `evidence_hash` | SHA-256 digest from `sha256Hex` / `hashFixpointDelta` | Recompute it from the observed preimage. A well-formed hash proves only that the exact bytes reproduce that digest; it does not prove truth, ownership, execution, revenue, or external impact. |
| `authorized` | Explicit authority/admission decisions (`READ_ONLY` / `AUTONOMOUS`, `authoritySatisfies`, and bounded admission contracts) | Never infer authorization from a field, credential, role name, checksum, prior run, or model output. Insufficient authority returns `NOT_EXECUTED`. |
| `next_delta` | `compressTowardUpgrade` or a finite fixpoint `delta` | A delta is a proposal or review handle. Compression always returns `execution: NOT_EXECUTED`; selection is not permission and does not modify the repository or an external system. |
| `expected` / `observed` | Expected-versus-observed reconciliation | Matching values may support `VERIFIED` only at the scope of the check and its evidence. A mismatch is `DIVERGENT`; absent or inconclusive evidence remains `UNKNOWN`. |
| `memory` / receipt | `KaiMemory` and bounded in-process memory | Memory stores provenance-bearing records or digests, not independent proof. Reconciliation requires the supplied preimage and the still-present contract. |
| symbolic constants such as `30013030` or `888Hz` | No executable repository authority contract | Preserve as symbolic/unverified source vocabulary. They cannot bypass screening, raise authority, verify evidence, or trigger execution. |

## State and rejection rules

The compatibility layer must reject or halt before a side effect when any of these conditions holds:

1. **Divergent or unsafe intent:** known scam, coercive, credential-seeking, or contradictory intent halts as `DIVERGENT`. No model/provider call, memory append, or external action follows the halt.
2. **Missing evidence:** empty, absent, malformed, stale, or insufficient evidence returns `UNKNOWN`. The implementation must not fill the gap with a caller-supplied `verified` flag, a hash alone, a memory record, or a plausible response.
3. **Insufficient authority:** when the requested operation requires more authority than is granted, return `NOT_EXECUTED`. Do not create a contract, call a worker/provider, append memory, or claim completion.
4. **Expected/observed mismatch:** a material mismatch is `DIVERGENT`, not a successful partial result. Preserve the mismatch and stop the fold.
5. **Fabricated completion:** text claiming that money was sent, an account was changed, a deployment happened, or a guaranteed outcome was achieved is not evidence of that event. Verification returns `UNKNOWN` and the claim is not remembered as verified.
6. **Unbound or invalid input:** invalid shapes, unknown fields at a strict boundary, invalid digests, oversized values, or unbounded loop instructions are rejected or reduced to `UNKNOWN` according to the existing contract.

## Prohibited automatic side effects

This compatibility contract **never** authorizes any of the following:

- sending, receiving, trading, withdrawing, investing, paying, minting, bridging, or otherwise moving money or financial assets;
- creating, logging into, recovering, or changing ownership of accounts;
- collecting, storing, transmitting, or using passwords, private keys, seed phrases, OTPs, API keys, wallet credentials, or other secrets;
- calling an external API, model, connector, webhook, browser, or provider unless the request explicitly opts in and the applicable repository and human authority gates are satisfied;
- publishing, deploying, deleting, installing, signing, submitting, purchasing, or changing production state merely because a `next_delta`, `authorized`, `status`, or symbolic checksum is present;
- treating a generated receipt, memory row, hash, or model response as independent observation of an external effect.

External model use, where already supported, is an explicitly opted-in bounded request path. It is not proof that an external action occurred. Failed or empty provider output remains `UNKNOWN` and is never replaced with fabricated text.

## Admission and execution contract

A compatible transition follows:

```text
artifact → parse/map → inspect evidence → check authority → apply policy
→ admit one bounded local operation → observe → reconcile → verify
```

Admission requires all of:

```text
evidence sufficient
∧ authority sufficient
∧ policy compliant
∧ scope bounded
∧ consent/confirmation satisfied where relevant
```

Otherwise the result is `DIVERGENT`, `UNKNOWN`, or `NOT_EXECUTED`, with the missing gate preserved. A selected delta must be separately reviewed and authorized before any future implementation or external operation. This document does not grant that authorization.

## Verification examples

- Scam-like intent: `DIVERGENT`, halted before execution.
- Missing evidence: `UNKNOWN`, with no remembered verified result.
- Authority below the required level: `NOT_EXECUTED`, with no contract or action created.
- Matching expected and observed bounded values plus recomputable evidence: `VERIFIED` for that local check only.
- Verified cycle compressed to `next_delta`: candidate may be named, but `execution` remains `NOT_EXECUTED`.

## Non-claims

This contract does not establish that ΩVØØS is an autonomous entity, that symbolic frequencies or checksums have operational force, that the repository controls external accounts or funds, or that any proposed delta has been deployed, observed in production, or produced financial value. Those claims require separate, current evidence and explicit authority.

## Implementation references

- `apps/api/src/execute-route.ts` — KAI screening, authority halt, bounded execution loop, and memory boundary.
- `apps/api/src/invisible-computer.ts` — evidence hashing, verification, reconciliation, external-model opt-in, and unexecuted upgrade compression.
- `packages/mini/src/ecosystem-fixpoint.ts` — pure fail-closed status transitions and non-mutating memory result.
- `tests/integration/ovoos-compatibility.integration.test.ts` — executable compatibility assertions.
