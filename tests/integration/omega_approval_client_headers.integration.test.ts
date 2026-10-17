import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { omegaApprovalRequest, omegaOperatorHeaders } from '../../apps/web/src/omega-approval-request.ts';
import { sdkOmegaAdmissionRequest, sdkOmegaApprovalRequest } from '../../packages/sdk/src/omega-approval-request.ts';

const environmentKeys = [
  'OMEGA_AUTH_MODE',
  'OMEGA_ADMIN_OPERATOR_ALLOWLIST',
  'OMEGA_ADMIN_REQUIRE_ALLOWLIST',
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

function restoreEnvironment(): void {
  for (const key of environmentKeys) {
    const originalValue = originalEnvironment.get(key);
    if (originalValue === undefined) delete process.env[key];
    else process.env[key] = originalValue;
  }
}

test('dashboard and SDK command admission and approval honor allowlisted operator identity', async () => {
  process.env.OMEGA_AUTH_MODE = 'local';
  process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'dashboard-operator,sdk-operator';
  process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = 'on';

  const app = createApp(':memory:', false);
  const createProposal = async (idempotencyKey: string): Promise<string> => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        intent: 'approve a bounded integration-test proposal',
        requestedBy: 'integration-test',
        workers: ['planner'],
        idempotencyKey,
      },
    });
    assert.equal(response.statusCode, 201, response.body);
    return response.json().command.commandId as string;
  };
  const readCommandEvents = async (commandId: string): Promise<Array<{ type?: string; operator?: string }>> => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/omega/events?commandId=${encodeURIComponent(commandId)}`,
    });
    assert.equal(response.statusCode, 200, response.body);
    return response.json().events as Array<{ type?: string; operator?: string }>;
  };

  try {
    await app.ready();

    const bodyOnlyCommandId = await createProposal('approval-header-body-only');
    const bodyOnly = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${encodeURIComponent(bodyOnlyCommandId)}/approve`,
      payload: { operator: 'dashboard-operator' },
    });
    assert.equal(bodyOnly.statusCode, 403);
    assert.equal(bodyOnly.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');
    const unchanged = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${encodeURIComponent(bodyOnlyCommandId)}`,
    });
    assert.equal(unchanged.json().command.status, 'PROPOSED');

    const bodyOnlyAdmitCommandId = await createProposal('admission-header-body-only');
    const bodyOnlyAdmit = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${encodeURIComponent(bodyOnlyAdmitCommandId)}/admit`,
      payload: {
        authority: 'human:dashboard-operator',
        policy: 'mood-codex-boundary.v1',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(bodyOnlyAdmit.statusCode, 403);
    assert.equal(bodyOnlyAdmit.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');
    const bodyOnlyAdmitUnchanged = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${encodeURIComponent(bodyOnlyAdmitCommandId)}`,
    });
    assert.equal(bodyOnlyAdmitUnchanged.json().command.status, 'PROPOSED');
    assert.equal(
      (await readCommandEvents(bodyOnlyAdmitCommandId)).some((event) => event.type === 'command.admitted'),
      false,
    );

    const unlistedAdmitCommandId = await createProposal('admission-header-unlisted');
    const unlistedAdmit = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${encodeURIComponent(unlistedAdmitCommandId)}/admit`,
      headers: { 'x-omega-operator-id': 'untrusted-operator' },
      payload: {
        authority: 'human:untrusted-operator',
        policy: 'mood-codex-boundary.v1',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(unlistedAdmit.statusCode, 403);
    const unlistedAdmitUnchanged = await app.inject({
      method: 'GET',
      url: `/v1/omega/commands/${encodeURIComponent(unlistedAdmitCommandId)}`,
    });
    assert.equal(unlistedAdmitUnchanged.json().command.status, 'PROPOSED');
    assert.equal(
      (await readCommandEvents(unlistedAdmitCommandId)).some((event) => event.type === 'command.admitted'),
      false,
    );

    const dashboardAdmitCommandId = await createProposal('admission-header-dashboard');
    const dashboardHeadersForAdmit = omegaOperatorHeaders();
    assert.equal(dashboardHeadersForAdmit['x-omega-operator-id'], 'dashboard-operator');
    const dashboardAdmit = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${encodeURIComponent(dashboardAdmitCommandId)}/admit`,
      headers: dashboardHeadersForAdmit,
      payload: {
        authority: 'human:body-spoofed-operator',
        policy: 'mood-codex-boundary.v1',
        authorityVerified: true,
        policySatisfied: true,
      },
    });
    assert.equal(dashboardAdmit.statusCode, 200, dashboardAdmit.body);
    assert.equal(dashboardAdmit.json().command.status, 'AUTHORIZED');
    assert.equal(dashboardAdmit.json().command.change.authority, 'human:dashboard-operator');
    const dashboardAdmitEvent = (await readCommandEvents(dashboardAdmitCommandId)).find((event) => event.type === 'command.admitted');
    assert.equal(dashboardAdmitEvent?.operator, 'dashboard-operator');

    const dashboardCommandId = await createProposal('approval-header-dashboard');
    const dashboardRequest = omegaApprovalRequest();
    const dashboardHeaders = new Headers(dashboardRequest.headers);
    assert.equal(dashboardRequest.method, 'POST');
    assert.equal(dashboardHeaders.get('x-omega-operator-id'), 'dashboard-operator');
    const dashboardApproval = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${encodeURIComponent(dashboardCommandId)}/approve`,
      headers: Object.fromEntries(dashboardHeaders.entries()),
      payload: dashboardRequest.body as string,
    });
    assert.equal(dashboardApproval.statusCode, 200, dashboardApproval.body);
    assert.equal(dashboardApproval.json().command.change.authority, 'human:dashboard-operator');

    const headerWinsCommandId = await createProposal('approval-header-source-of-truth');
    const headerWins = await app.inject({
      method: 'POST',
      url: `/v1/omega/commands/${encodeURIComponent(headerWinsCommandId)}/approve`,
      headers: Object.fromEntries(dashboardHeaders.entries()),
      payload: JSON.stringify({ operator: 'body-spoofed-operator', policy: 'human-review' }),
    });
    assert.equal(headerWins.statusCode, 200, headerWins.body);
    assert.equal(headerWins.json().command.change.authority, 'human:dashboard-operator');

    const sdkCommandId = await createProposal('approval-header-sdk');
    const sdkRequest = sdkOmegaApprovalRequest(sdkCommandId, 'sdk-operator');
    assert.equal(sdkRequest.headers['x-omega-operator-id'], 'sdk-operator');
    const sdkApproval = await app.inject({
      method: 'POST',
      url: sdkRequest.path,
      headers: { 'content-type': 'application/json', ...sdkRequest.headers },
      payload: JSON.stringify(sdkRequest.payload),
    });
    assert.equal(sdkApproval.statusCode, 200, sdkApproval.body);
    assert.equal(sdkApproval.json().command.change.authority, 'human:sdk-operator');

    const sdkAdmitCommandId = await createProposal('admission-header-sdk');
    const sdkAdmitRequest = sdkOmegaAdmissionRequest(sdkAdmitCommandId, {
      authority: 'human:body-spoofed-operator',
      policy: 'mood-codex-boundary.v1',
      authorityVerified: true,
      policySatisfied: true,
    });
    assert.equal(sdkAdmitRequest.headers['x-omega-operator-id'], 'sdk-operator');
    const sdkAdmit = await app.inject({
      method: 'POST',
      url: sdkAdmitRequest.path,
      headers: { 'content-type': 'application/json', ...sdkAdmitRequest.headers },
      payload: JSON.stringify(sdkAdmitRequest.payload),
    });
    assert.equal(sdkAdmit.statusCode, 200, sdkAdmit.body);
    assert.equal(sdkAdmit.json().command.change.authority, 'human:sdk-operator');
    const sdkAdmitEvent = (await readCommandEvents(sdkAdmitCommandId)).find((event) => event.type === 'command.admitted');
    assert.equal(sdkAdmitEvent?.operator, 'sdk-operator');

    const defaultSdkRequest = sdkOmegaApprovalRequest('command-default-operator');
    assert.equal(defaultSdkRequest.headers['x-omega-operator-id'], 'sdk-operator');
  } finally {
    await app.close();
    restoreEnvironment();
  }
});
