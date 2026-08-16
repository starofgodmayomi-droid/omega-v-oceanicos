# Ω∞v SDK

`@omega-v/sdk` is the first typed client boundary for the existing Omega V Oceanicos runtime evidence API.

## Usage

```ts
import { OmegaClient } from '@omega-v/sdk';

const client = new OmegaClient('http://localhost:3000');
const observability = await client.getObservability();
const events = await client.getEvents();
const runs = await client.getRuns();
```

The SDK currently reads the real `/observability`, `/events`, and `/runs` contracts. It preserves API errors through `OmegaApiError`, does not fabricate values, and does not duplicate attestation or verification logic. Mutation methods, evidence export, authentication, and mobile bindings remain future slices.
