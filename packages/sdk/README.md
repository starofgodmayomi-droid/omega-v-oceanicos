# Ω∞v SDK

`@omega-v/sdk` is the first typed client boundary for the existing Omega V Oceanicos runtime evidence API.

## Usage

```ts
import { OmegaClient } from '@omega-v/sdk';

const client = new OmegaClient('http://localhost:3000', fetch, {
  readToken: process.env.OMEGA_READ_TOKEN,
  adminToken: process.env.OMEGA_ADMIN_TOKEN,
});
const health = await client.getHealth();
const policy = await client.getAttestationPolicy();
const observability = await client.getObservability();
const events = await client.getEvents();
const runs = await client.getRuns();
const evidence = await client.getEvidenceExport();
const audit = await client.getAuditEvents({
  status: 'passed',
  from: '2026-08-16T00:00:00.000Z',
  limit: 40,
});
const revocations = await client.getRevocations();
const verification = await client.verifyAttestation(attestation);
const revoked = await client.revokeAttestation('attestation-id', 'operator review');
```

The SDK reads the real unauthenticated `/health` liveness/readiness contract plus `/attest/policy`, `/observability`, `/events`, `/runs`, `/attest/revocations`, bounded `/evidence/export`, and bounded `/audit/events` contracts. `getAuditEvents()` accepts exact type/stage/status filters, inclusive ISO-8601 `from`/`to` timestamps, and a limit from 1 through 500; the API rejects invalid queries rather than silently widening them. Its response preserves `bounded`, `total`, `skipped`, `source`, `keySource`, and normalized filter metadata. This is local evidence over the runtime event log, not a distributed audit index or completeness proof for unpersisted history.
`getHealth()` preserves the API’s `ready` or `degraded` readiness and memory-integrity evidence; it does not infer health locally. `AttestationPolicy` also carries non-secret persistence key-source fields (`none`, `current`, `previous`, or `mixed`) and previous-key configuration presence; these describe local fallback reads only and do not claim custody, secure deletion, automated re-encryption, or recovery. `revokeAttestation()` is an explicit mutation that sends the attestation ID, human-readable reason, and optional operator identity header to `/attest/revoke`; it does not sign, verify, or silently authorize anything. API errors remain typed through `OmegaApiError`, and no values are fabricated. Pass `{ readToken, adminToken }` as the third constructor argument when the API boundaries are enabled. `readToken` is used for reads and attestation verification, while only `adminToken` is sent on revocation mutations. Verification preserves the API’s `valid`, `revoked`, `expired`, `revocationIntegrity`, and `revocationRevision` fields; the SDK does not reimplement signature, expiry, or registry-integrity policy. `getRevocations()` preserves the API’s integrity metadata, digest, and local `revision` without exposing persistence secrets. The revision is a local registry freshness signal, not distributed consistency. The optional operator identity is checked only when the API configures `OMEGA_ADMIN_OPERATOR_ALLOWLIST`; an unlisted identity fails closed. Administrative policy beyond this local bearer-plus-identity boundary, stronger operator authentication, and mobile bindings remain future slices.


## Ω command lifecycle

`OmegaClient` exposes `listOmegaWorkers()`, `proposeCommand()`, `inspectCommand()`, `admitCommand()`, `approveCommand()`, `executeCommand()`, `observeCommand()`, `verifyReality()`, and `getOmegaEvents()`. These methods call the same `/v1/omega/` API boundary and preserve the server’s lifecycle status; the SDK does not infer authorization, execution success, or external reality locally.


## Governance surfaces (C6 / C7 / authority)

`OmegaClient` also covers the constitutional governance boundary the dashboard renders:

```ts
const verdict = await client.reconcile({ changeId, expectedState, observedState });
const batch = await client.reconcileBatch([{ changeId, expectedState, observedState }]);
const lineage = await client.appendProvenance({ changeId, source: 'sdk-client', lineage: [] });
const integrity = await client.verifyProvenance();
const tip = await client.getProvenanceTip();
const ancestry = await client.getProvenanceLineage(changeId);
const grant = await client.grantAuthorization({ subject, scope, grantedBy, policyRefs: [] });
const decision = await client.evaluateAuthorization({ subject, scope, evidence: [] });
await client.revokeAuthorization(grant.grant.id, operatorId);
const grants = await client.getAuthorizationGrants();
```

Verdicts come back exactly as the API produced them: `VERIFIED`, `DIVERGENT`, `UNKNOWN`, or `NOT_EXECUTED`. The SDK never promotes `UNKNOWN` to a passing state and never evaluates authority locally — `evaluateAuthorization()` returns `authorized`, `authorityVerified`, and `policySatisfied` from the fail-closed authority engine, and a self-grant is refused by the API. `tests/integration/sdk_client_contract.test.ts` pins these methods to the routes in `API_ROUTE_INVENTORY`.

**Status (C9):** the client is built and tested as a workspace package, but some older read methods (`getState`, `getObservability`, `getEvents`, `getRuns`, `getAuditEvents`, `getRules`, `getSubsystems`, `getEvidenceExport`, `getOperatingSystem`, `simulateScene`, `verifyAttestation`) still target endpoints from the earlier evidence-API generation that `apps/api` does not register — they fail with `OmegaApiError` rather than inventing data.
