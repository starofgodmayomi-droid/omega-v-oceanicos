# C7 → C8 causal memory

The Ω pipeline now has an explicit durable boundary for the complete C6/C7 result. When configured, `FileCausalMemory` stores an append-only JSONL record containing the `OmegaChangeRecord`, the complete `RealityVerification`, the signed `RealityAttestation`, the execution attestation identifier, authority, policy, evidence, timestamps, lineage, previous hash, and entry hash.

The durable store is intentionally separate from the legacy MINI memory format. A record-only append is rejected because `NOT_EXECUTED` is not attestable as reality. The pipeline suppresses intermediate C5-only writes for this store and commits one causal record only after a C6 result has been produced and signed.

## Configuration

The API pipeline route enables this boundary only when both variables are present:

```sh
OMEGA_CAUSAL_MEMORY_PATH=/var/lib/omega/causal-memory.jsonl
OMEGA_REALITY_ATTESTATION_KEY=<operator-provided-secret>
```

Optional metadata variables are:

```sh
OMEGA_REALITY_ATTESTATION_SIGNER=api-reality-attestor
OMEGA_REALITY_ATTESTATION_KEY_VERSION=1
```

A configured path without a signing key returns `503 CAUSAL_MEMORY_KEY_REQUIRED`; the API does not silently persist unverifiable provenance. Without both variables, the route retains its request-scoped compatibility adapter and reports `durableMemory: false` rather than implying persistence.

## Invariants

`FileCausalMemory` verifies every loaded line for sequence, previous hash, entry hash, attestation signature, and attestation/change identity. Any malformed, tampered, or unverifiable line degrades the store to `verifyIntegrity() === false`; replay returns no entry for an unverifiable record. `VERIFIED`, `DIVERGENT`, and `UNKNOWN` remain distinct. An observation failure is signed as `UNKNOWN`, never upgraded to `VERIFIED`.

The store supports `reload()` and exact `replay(changeId)`. Replay is local reconstruction of the persisted record; it is not a claim that an external system is currently healthy or deployed.

## Evidence

The executable proof is `tests/integration/causal-memory.integration.test.ts`. It covers verified persistence and reload, divergent and unknown preservation, signature tampering, hash-chain tampering, record-only/NOT_EXECUTED rejection, and authorization separation. The API route exposes the attestation and local memory-integrity result when durable mode is enabled.

