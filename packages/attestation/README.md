# @omega-v/attestation

Cryptographic attestation for Ω∞v Oceanicos.

**An earned expansion (+ ATTEST) on the MINI kernel.** MINI (Observe → Verify →
Remember) is complete without it. Attestation adds one thing: proof that a
particular verification happened, at a particular time, under particular rule
versions — in a form that survives leaving this process.

`ATTEST ≠ ASSERT`. A service reporting that it verified something is an
assertion. A signature someone else can check is not.

## Installation

```bash
npm install @omega-v/attestation
```

## Choosing an algorithm

Two algorithms are supported, and the choice is not cosmetic.

|                | HMAC-SHA256                            | Ed25519                                |
| -------------- | -------------------------------------- | -------------------------------------- |
| Key material   | one shared secret                      | private key signs, public key verifies |
| Who can verify | anyone holding the signing secret      | anyone, from the public key alone      |
| Who can forge  | anyone holding the signing secret      | only the private key holder            |
| Use it for     | verification inside one trust boundary | attestations that leave this system    |

HMAC is the default because it is what the existing runtime uses. It is
genuine HMAC-SHA256 over a canonical payload, compared in constant time — not
a placeholder. But every HMAC verifier is also an HMAC forger, because both
operations need the same secret. If an attestation is meant to convince
someone outside this system, that property defeats the purpose, and Ed25519
is the correct choice.

## Usage

### HMAC-SHA256

```typescript
import { AttestationService } from '@omega-v/attestation';

// Reads OMEGA_SIGNING_KEY when no key is passed.
const service = new AttestationService();

const attestation = service.attest(verificationResult);
service.verify(attestation); // true
```

### Ed25519

```typescript
import { generateKeyPairSync } from 'node:crypto';
import { AttestationService, verifyEd25519 } from '@omega-v/attestation';

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const service = new AttestationService({
  algorithm: 'Ed25519',
  signingKey: privateKey,
  publicKey,
  keyVersion: '1',
});

const attestation = service.attest(verificationResult);

// Verified by someone holding only the public key — no signing capability.
verifyEd25519(attestation, publicKey); // true
```

`verifyEd25519` is a standalone function precisely because it needs nothing
but the attestation and a public key. It has no access to a signing key and
cannot produce a signature.

## API

### `new AttestationService(config?, keyVersion?)`

Accepts either a config object or, for compatibility, `(signingKey, keyVersion)`.

```typescript
interface AttestationConfig {
  algorithm?: 'HMAC-SHA256' | 'Ed25519'; // default: 'HMAC-SHA256'
  signingKey?: string; // HMAC secret, or Ed25519 private key (PEM)
  publicKey?: string; // Ed25519 public key (PEM), required to verify
  keyVersion?: string; // default: '1'
}
```

When `signingKey` is omitted it falls back to `OMEGA_SIGNING_KEY` for HMAC or
`OMEGA_ED25519_KEY` for Ed25519.

There is no default key. Construction throws `MissingSigningKeyError` when no
key is available, because a key shipped in source makes every signature
reproducible by anyone holding the repository.

### `attest(verificationResult, options?)`

Signs a verification result. `options.attestedBy` sets the attestor identity;
`options.algorithm` overrides the instance algorithm for one call.

The signature covers exactly: `verificationId`, `observationId`, `verified`,
`confidence`, `ruleVersions`, `attestedAt`, `attestedBy`, `keyVersion`.
Changing any of these invalidates the signature.

### `verify(attestation)`

Verifies an attestation, selecting the algorithm from
`attestation.signingAlgorithm`. Returns `false` — never throws — when the
signature is absent, IDs are missing, status is not `signed`, the key version
does not match, or the signature does not check out.

For Ed25519 this requires the service to hold the public key; without it,
verification returns `false` rather than silently passing.

### `verifyEd25519(attestation, publicKey)`

Standalone Ed25519 verification from a public key alone. Returns `false` for
non-Ed25519 attestations rather than falling back to a weaker check.

### `getKeyInfo()`

```typescript
{
  fingerprint: string;   // sha256:xxxxxxxxxxxxxxxx — never the key itself
  version: string;
  algorithm: 'HMAC-SHA256' | 'Ed25519';
  publicKey?: string;    // Ed25519 only; safe to publish
}
```

The fingerprint is a non-reversible identifier recorded on every attestation,
so a signature can be traced to a key without publishing the key.

### `rotateKey(newKey, newVersion, newPublicKey?)`

Rotates the signing key. Attestations signed under the previous version stop
verifying against this instance — key version is part of the signed payload,
so a rotation is a visible break rather than a silent one. Retain the old key
if old attestations must remain verifiable.

## Security

**What holds.** HMAC-SHA256 and Ed25519 are both real implementations over
`node:crypto`. HMAC comparison is constant-time (`timingSafeEqual`). The
signed payload is explicit and canonical. No key is ever returned by
`getKeyInfo`, and no default key exists.

**What does not.** Keys are handled as process-local strings: there is no HSM
integration, no encryption at rest, and no audit log of signing operations.
Key rotation is a method call, not a policy. Nothing here revokes an
attestation once issued.

**Operationally.** Keep private keys out of source and out of images. Prefer
Ed25519 for anything a third party is meant to check. Treat a `keyVersion`
change as a migration, not a config tweak.

## Testing

```bash
npm test
```

---

**Package Status:** Beta (v0.1.0)
**Part of:** Ω∞v Oceanicos — an earned expansion on the MINI kernel
**Next:** Key custody (HSM/KMS), revocation, signing audit log
**Last Updated:** 2026-08-15
