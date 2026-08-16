# Ω∞v SDK

`@omega-v/sdk` is the first typed client boundary for the existing Omega V Oceanicos runtime evidence API.

## Usage

```ts
import { OmegaClient } from '@omega-v/sdk';

const client = new OmegaClient('http://localhost:3000', fetch, {
  readToken: process.env.OMEGA_READ_TOKEN,
  adminToken: process.env.OMEGA_ADMIN_TOKEN,
});
const observability = await client.getObservability();
const events = await client.getEvents();
const runs = await client.getRuns();
const evidence = await client.getEvidenceExport();
const revocations = await client.getRevocations();
const revoked = await client.revokeAttestation('attestation-id', 'operator review');
```

The SDK reads the real `/observability`, `/events`, `/runs`, `/attest/revocations`, and bounded `/evidence/export` contracts. `revokeAttestation()` is an explicit mutation that sends the attestation ID, human-readable reason, and operator identity to `/attest/revoke`; it does not sign, verify, or silently authorize anything. API errors remain typed through `OmegaApiError`, and no values are fabricated. Pass `{ readToken, adminToken }` as the third constructor argument when the API boundaries are enabled. `readToken` is used for reads, while only `adminToken` is sent on revocation mutations. Administrative policy beyond the configured bearer boundary, stronger operator authentication, and mobile bindings remain future slices.
