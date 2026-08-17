# Ω∞v Attestation Envelope, version 1

- **Status:** stable
- **Applies to:** `signingAlgorithm: "Ed25519"`
- **Reference verifier:** [`verify_attestation.py`](./verify_attestation.py)

## Why this document exists

An attestation that can only be checked by running this repository is not a
public good. It is a claim you have to trust us about.

This describes the envelope precisely enough that a Python script, a Go
service, or a browser can verify one **without importing any code from this
project**. That is the whole point of asymmetric signing: a holder of the
public key can check a signature without being able to produce one.

`ATTEST ≠ ASSERT` only means something if the checking is available to the
person who doubts you.

## The signed payload

Exactly eight fields are covered by the signature:

```json
{
  "verificationId": "ver-...",
  "observationId": "obs-...",
  "verified": true,
  "confidence": 0.95,
  "ruleVersions": { "status-code-check": "1.0.0" },
  "attestedAt": "2026-08-17T03:00:00.000Z",
  "attestedBy": "attestation-service",
  "keyVersion": "1"
}
```

**Key order is part of the format.** The signer serialises with
JavaScript's `JSON.stringify`, which emits keys in insertion order, not
sorted order. A verifier that sorts keys will compute different bytes and
reject valid attestations.

Serialise these eight keys in the order listed above, with no whitespace,
and no other fields. `ruleVersions` is serialised in its own insertion
order.

Fields **outside** the payload — `id`, `signature`, `signingKey`,
`signingAlgorithm`, `status` — are not signed. Do not rely on them for
trust decisions beyond the explicit checks below.

## Verification

1. `status` MUST equal `"signed"`.
2. `signingAlgorithm` MUST equal `"Ed25519"`. **Take the algorithm from
   your own configuration, not from the attestation.** Selecting a
   primitive using a field the attacker controls is the `alg`-confusion
   mistake; this format requires the verifier to decide first and reject a
   mismatch.
3. `signature`, `verificationId` and `observationId` MUST be non-empty.
4. Strip the `0x` prefix from `signature` and decode the remainder as hex
   (64 bytes).
5. Rebuild the payload above, serialise it, encode as UTF-8.
6. Verify with Ed25519 (RFC 8032, PureEdDSA) using the public key.

Any failure is a rejection. There is no partial pass.

## What a valid signature does and does not prove

**Proves:** these eight fields were signed by the holder of the private key
matching this public key, and have not been altered since.

**Does not prove:** that the verification was correct, that the rules were
appropriate, that the observation was true, or that the attestation has not
been _revoked_ or _expired_ since signing. Revocation and expiry are runtime
state and cannot live inside a static signature. Check
`GET /attest/revocations` and the policy TTL separately.

A signature is evidence of origin and integrity. It is not evidence of
correctness, and treating it as such is the assertion this format exists to
prevent.

## Obtaining the public key

```
GET /attest/public-key
```

Returns the public half only. The private key never leaves the signer, and
no default key ships with any artifact — the service refuses to start
without one, because a key baked into an image is a key held by everyone who
pulls it.

## Versioning

This is version 1. Any change to the payload field set or their order is a
new version, because it invalidates every signature made under this one.
Additive, non-breaking changes go outside the signed payload.
