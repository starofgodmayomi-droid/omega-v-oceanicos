# @omega-v/attestation

Cryptographic attestation service for Ω∞v Oceanicos.

**Step 3 of the verification loop**: Sign verification results and create unforgeable proof.

## Installation

```bash
npm install @omega-v/attestation
```

## Usage

```typescript
import { AttestationService } from '@omega-v/attestation';

const attestationService = new AttestationService();

// Attest a verification result
const attestation = attestationService.attest(verificationResult);

console.log(attestation.id); // att-2026-08-07-abc123
console.log(attestation.signature); // 0x1a2b3c4d5e6f...
console.log(attestation.attestedAt); // 2026-08-07T10:30:02Z

// Verify the attestation
const isValid = attestationService.verify(attestation);
console.log(isValid); // true/false
```

## Features

### Attestation Signing

Creates a cryptographic signature proving:

- Which verification was performed
- When it was performed
- Which rule versions were applied
- Who performed the attestation

### Signature Verification

Verify that an attestation is authentic:

```typescript
const isValid = attestationService.verify(attestation);
// Checks signature, key version, and status
```

### Key Management

Support for key versioning and rotation:

```typescript
// Get current key info
const keyInfo = attestationService.getKeyInfo();
console.log(keyInfo.key); // key-2026-08-production-v1
console.log(keyInfo.version); // 1

// Rotate to a new key
attestationService.rotateKey('key-2026-08-production-v2', '2');
```

## API

### Constructor

```typescript
new AttestationService(signingKey?: string, keyVersion?: string)
```

- `signingKey` — Signing key identifier (default: 'key-2026-08-production-v1')
- `keyVersion` — Key version string (default: '1')

### Methods

#### `attest(verificationResult, options?)`

Create a signed attestation for a verification result.

**Parameters:**

```typescript
verificationResult: VerificationResult
options?: {
  attestedBy?: string;        // Identity of attestor (default: 'attestation-service')
  algorithm?: string;          // Signing algorithm (default: 'HMAC-SHA256')
}
```

**Returns:** `Attestation`

**Attestation includes:**

- `id` — Unique attestation ID
- `signature` — Cryptographic signature
- `signingKey` — Which key was used
- `attestedAt` — When it was signed
- All fields from the verification result

#### `verify(attestation)`

Verify that an attestation is authentic.

**Parameters:** `Attestation`  
**Returns:** `boolean`

**Checks:**

- Required fields are present
- Signature is not empty
- Status is 'signed'
- Key version matches

#### `getKeyInfo()`

Get information about the current signing key.

**Returns:**

```typescript
{
  key: string; // Key identifier
  version: string; // Key version
}
```

#### `rotateKey(newKey, newVersion)`

Rotate to a new signing key.

**Parameters:**

- `newKey` — New key identifier
- `newVersion` — New key version

## Security Considerations

### Current Implementation (v0.1.0)

- Simplified HMAC-like signature generation
- Not cryptographically secure for production use

### Production Requirements

Future versions will implement:

- Proper HMAC-SHA256 or ECDSA signatures
- Hardware Security Module (HSM) integration
- Key derivation and rotation policies
- Audit logging for all signing operations

### Best Practices

- Never expose private keys
- Store keys encrypted at rest
- Rotate keys regularly
- Maintain audit logs of all attestations

## Testing

```bash
npm test
```

---

**Package Status:** Alpha (v0.1.0)  
**Part of:** Ω∞v Oceanicos verification loop  
**Next:** Production-grade cryptography  
**Security:** Not suitable for production use yet  
**Last Updated:** 2026-08-07
