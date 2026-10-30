import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OmegaApiError, OmegaClient } from '../../packages/sdk/dist/index.js';
import { API_ROUTE_INVENTORY } from '../../apps/api/src/route-contract.ts';

/**
 * Contract test for the client SDK (C9).
 *
 * The SDK is a transport, so what has to stay true is its route surface: every
 * governance method must address a route the API actually publishes, with the
 * verb the API registers, and must return the parsed body rather than a
 * reshaped one. Drift here is invisible at runtime until a dashboard or CLI
 * call fails, so it is pinned against API_ROUTE_INVENTORY instead.
 *
 * What this does NOT decide: that the API process is reachable, that its
 * in-memory chains are durable, or that a grant is authoritative.
 */
type Recorded = { method: string; path: string; body?: unknown };

function recordingClient(payload: unknown = { success: true }) {
  const calls: Recorded[] = [];
  const client = new OmegaClient('http://api.test', async (input, init) => {
    const url = new URL(input);
    calls.push({
      method: init?.method ?? 'GET',
      path: url.pathname + url.search,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  return { client, calls };
}

const GOVERNANCE_ROUTES = [
  'POST /v1/reconciliation/reconcile',
  'POST /v1/reconciliation/batch',
  'POST /v1/provenance/append',
  'GET /v1/provenance/verify',
  'GET /v1/provenance/lineage/:changeId',
  'GET /v1/provenance/tip',
  'POST /v1/authorization/grant',
  'POST /v1/authorization/evaluate',
  'POST /v1/authorization/revoke',
  'GET /v1/authorization/grants',
] as const;

describe('SDK client contract (C9)', () => {
  it('targets only routes the API publishes in its contract inventory', () => {
    for (const route of GOVERNANCE_ROUTES) {
      assert.ok(
        (API_ROUTE_INVENTORY as readonly string[]).includes(route),
        `${route} is used by the SDK but missing from API_ROUTE_INVENTORY`,
      );
    }
  });

  it('addresses each governance route with the registered verb', async () => {
    const { client, calls } = recordingClient();

    await client.reconcile({ changeId: 'c1', expectedState: 'S1', observedState: 'S1' });
    await client.reconcileBatch([{ changeId: 'c1', expectedState: 'S1' }]);
    await client.appendProvenance({ changeId: 'c1', source: 'test' });
    await client.verifyProvenance();
    await client.getProvenanceLineage('c 1/2');
    await client.getProvenanceTip();
    await client.grantAuthorization({ subject: 'a', scope: 's', grantedBy: 'b' });
    await client.evaluateAuthorization({ subject: 'a', scope: 's' });
    await client.revokeAuthorization('g1', 'operator');
    await client.getAuthorizationGrants();

    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'POST /v1/reconciliation/reconcile',
        'POST /v1/reconciliation/batch',
        'POST /v1/provenance/append',
        'GET /v1/provenance/verify',
        // Path parameters are encoded, never interpolated raw.
        'GET /v1/provenance/lineage/c%201%2F2',
        'GET /v1/provenance/tip',
        'POST /v1/authorization/grant',
        'POST /v1/authorization/evaluate',
        'POST /v1/authorization/revoke',
        'GET /v1/authorization/grants',
      ],
    );
  });

  it('returns the API payload unreshaped, including UNKNOWN verdicts', async () => {
    const payload = {
      success: true,
      reconciliation: {
        status: 'UNKNOWN',
        changeId: 'c1',
        expectedState: 'S1',
        evidence: 'sha256:abc',
        reconciledAt: '2026-10-30T00:00:00.000Z',
      },
    };
    const { client } = recordingClient(payload);
    const result = await client.reconcile({ changeId: 'c1', expectedState: 'S1' });

    assert.deepEqual(result, payload);
    assert.equal(result.reconciliation.status, 'UNKNOWN');
  });

  it('surfaces a refused governance call as OmegaApiError with the API code', async () => {
    const client = new OmegaClient('http://api.test', async () =>
      new Response(JSON.stringify({ error: 'SUBJECT_REQUIRED', message: 'subject is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await assert.rejects(
      () => client.grantAuthorization({ subject: '', scope: 's', grantedBy: 'b' }),
      (error: unknown) => {
        assert.ok(error instanceof OmegaApiError);
        assert.equal(error.status, 400);
        assert.equal(error.message, 'subject is required');
        return true;
      },
    );
  });
});
