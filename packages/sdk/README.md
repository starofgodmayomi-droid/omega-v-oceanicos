# Ω∞v SDK

`@omega-v/sdk` is the first typed client boundary for the existing Omega V Oceanicos runtime evidence API.

## Usage

```ts
import { OmegaClient } from '@omega-v/sdk';

const client = new OmegaClient('http://localhost:3000', fetch, {
  readToken: process.env.OMEGA_READ_TOKEN,
});
const observability = await client.getObservability();
const events = await client.getEvents();
const runs = await client.getRuns();
```

The SDK currently reads the real `/observability`, `/events`, and `/runs` contracts. It preserves API errors through `OmegaApiError`, does not fabricate values, and does not duplicate attestation or verification logic. Pass `{ readToken }` as the third constructor argument when the API has `OMEGA_READ_TOKEN` configured; omit it to preserve local development behavior. Mutation methods, evidence export, and mobile bindings remain future slices.
