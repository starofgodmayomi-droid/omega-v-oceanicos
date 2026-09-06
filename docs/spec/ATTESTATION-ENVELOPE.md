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

**Non-ASCII characters are encoded, not escaped.** `JSON.stringify` emits
`Ω` as the character itself and the signer encodes the result as UTF-8. A
verifier that escapes it to `\u03a9` — which is the default in several
JSON libraries, Python's included — computes different bytes and rejects
valid attestations. The reference verifier shipped alongside this document
did exactly that until an `attestedBy` of `"Ω∞v-attestation-service"`
produced 219 bytes against the signer's 212. It reported the genuine
attestation as `signature does not match this public key`, which is the
same sentence it uses for a forgery.

**Numbers are serialised as JavaScript serialises them.** JSON has one
number type; `JSON.stringify` writes `1` for a value of one whether the
source text said `1` or `1.0`, while several libraries preserve the float
form and write `1.0`. Those are different bytes and the signature covers
only one of them. A producer that emits `"confidence": 1.0` will not agree
with a verifier that reads it into an integer, so emit the JavaScript form.
This signer always does; the hazard is for third-party producers and for
tools that re-serialise an attestation in transit.

**Unpaired surrogates are escaped, not encoded.** `JSON.stringify` has been
well-formed since ES2019: it emits a lone surrogate as `\uXXXX` rather than
raw. A verifier that encodes it directly will produce different bytes, or
fail outright — UTF-8 cannot represent one.

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

## A worked example

Everything below is real. The attestation was signed by the key printed
beside it, and a test in this repository verifies this exact pair on every
run — so if the document ever drifts from the format, the pipeline fails
rather than the reader.

The private key was generated for this example and then discarded. It signs
nothing else and protects nothing.

**Attestation**

```json
{
  "id": "att-2026-08-17-example",
  "verificationId": "ver-2026-08-17-example",
  "observationId": "obs-2026-08-17-example",
  "verified": true,
  "confidence": 0.95,
  "ruleVersions": {
    "status-code-check": "1.0.0",
    "response-time-threshold": "1.0.0"
  },
  "attestedAt": "2026-08-17T00:00:00.000Z",
  "attestedBy": "attestation-service",
  "keyVersion": "1",
  "signingAlgorithm": "Ed25519",
  "signingKey": "sha256:example0000000000",
  "status": "signed",
  "signature": "0x0d263fe7998aa98d7c6d6160ed71327602032c797daa769cf8547a24b7ffbc5883825d1c41748e584fd60726275ab74d4c7793bb5757458ad37a95cac1619705"
}
```

**Public key**

```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAz/+EZ7jBqA5Vfh+iyjVZcKRebbnc3f1s5HSYThBEjEo=
-----END PUBLIC KEY-----
```

**Check it three ways.**

In a browser, with no install: open the dashboard and paste both into the
independent verification panel.

With the reference implementation:

```
pip install cryptography
python docs/spec/verify_attestation.py attestation.json public_key.pem
```

With nothing but OpenSSL, to prove the format needs no special tooling:

```
# the signed payload is the eight fields, in the order published above,
# serialised with no whitespace
printf '%s' "$PAYLOAD" > payload.bin
printf '%s' "$SIGNATURE_HEX" | xxd -r -p > sig.bin
openssl pkeyutl -verify -pubin -inkey public_key.pem \
  -rawin -in payload.bin -sigfile sig.bin
```

**Now break it.** Change `"verified": true` to `false` and check again. The
signature fails, because `verified` is one of the eight signed fields.

Then change `"id"` to anything you like. The signature still passes —
`id` is not signed. That is not a flaw, it is the reason this document
lists exactly which fields the signature covers, and the reason no trust
decision should rest on the others.
