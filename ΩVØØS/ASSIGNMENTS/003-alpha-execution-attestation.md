# ORDER 003 — Alpha / execution-bound attestation

| Field | Value |
| --- | --- |
| Assigned to | Alpha — Architect (API verification and attestation) |
| Domain | `apps/api/src/` |
| Branch | `agent/copilot/invisible-computer-workspace-ui` |
| Status | Authorized by the human in this session for this bounded API slice. |
| Authority | Sign only the API's own `VERIFIED` execution result when its response digest is present. Do not sign caller-supplied results or alter auth policy. |

## Objective

Return an HMAC-SHA256 attestation alongside a verified `/api/execute` result. Bind
the signature's `observationId` to the server-computed response SHA-256 digest and
its `verificationId` to the execution contract. Preserve existing execution
responses and fail closed for absent/weak keys and non-verified outcomes.

## Authorized edits

- `apps/api/src/execute-route.ts`
- `apps/api/src/index.ts`
- `apps/api/src/__tests__/api.execute-attestation.test.ts`
- This assignment record.
- Append this slice's receipt to `kai_ledger.json`.

## Out of scope

Signing caller-supplied results, changing key policy, persistence or revocation,
UI integration, deployment, pushes, and merges.

## Acceptance gate

```bash
pnpm --filter api exec jest --config ./jest.config.js --runInBand --runTestsByPath src/__tests__/api.execute-attestation.test.ts
pnpm --filter api build
pnpm validate:swarm
```

## Stop conditions

Issue no attestation for missing evidence, non-`VERIFIED` status, or a missing
or weak key. Never imply that signing authorizes execution or proves deployment.
