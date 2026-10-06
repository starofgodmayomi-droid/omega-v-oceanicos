# Oceanicos Mobile

A local Expo / React Native companion surface for the Oceanicos API, built inside this monorepo so GitHub remains the source of truth. It uses a self-contained `package-lock.json` and does not alter the existing root pnpm workspace or lockfile.

## Scope

- **Current:** read API health and the redacted Omega command list; distinguish verified, divergent, unknown, not-executed, and other/open states.
- **Drop:** submit a bounded ƆREADE proposal with requester, target scope, stop condition, expected observation, mode, and a stable in-session retry idempotency key.
- **Mirror:** use a KAI-aligned prompt worksheet to separate a user-labelled experience, interpretation, stated knowledge, assumptions, and one optional next action. It does not call an AI model or create a persisted KAI Drop; its status remains `UNKNOWN`.
- **Evidence:** filter commands and inspect returned provenance events.
- **Settings:** choose the API origin; only that origin is called. No API token or secret is collected or stored.

Creating a proposal only persists a `PROPOSED` command through `POST /v1/omega/oreade/proposal`. The mobile UI does not admit, authorize, execute, attest, or claim external truth. API authorization policy remains authoritative.

The Mirror screen keeps its draft only in the current app memory. It sends no reflection text to the API and provides no save/sync function; closing the app or clearing the visible draft discards the worksheet. This is a data-flow boundary, not a claim of encrypted storage or device-level privacy.

This screen follows the repository's [KAI boundary](../../docs/KAI.md) and [whole-ecosystem constitution](../../docs/WHOLE-ECOSYSTEM-CONSTITUTION.md): continuity is not proof, reflection is not authorization, and one optional action requires an expected observation and stop condition.

## Development

```bash
cd apps/mobile
npm install
npm run start
```

To run the browser preview, use `npm run web`. Expo web dependencies are included in the app package.

Configure an API origin in **Settings**. For a physical device, use the API host's reachable LAN address; emulator loopback values differ by platform. For a publicly reachable API, use HTTPS. The app's network calls time out after 12 seconds.

Optional build-time default: `EXPO_PUBLIC_API_BASE_URL`. It must be a bare HTTP(S) origin with no credentials, path, query, or fragment. The Settings value is saved on the device through AsyncStorage.

## Checks

From `apps/mobile`:

```bash
npm test
npm run typecheck
npm run export:android
npm run export:web
```

Expo web preview, if used, is not native-device verification. No Android/iOS release build, app-store submission, merge, or deployment is included in this change.
