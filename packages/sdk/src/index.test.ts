import { OmegaApiError, OmegaClient } from './index';

describe('OmegaClient', () => {
  it('reads typed observability evidence from the existing contract', async () => {
    const client = new OmegaClient('http://api.test/', async (url) => {
      expect(url).toBe('http://api.test/observability');
      return new Response(
        JSON.stringify({
          data: {
            runtime: {
              mode: 'attest',
              persistence: 'file',
              services: ['attester'],
              lastActivity: null,
            },
            provenance: {
              recentEvents: 4,
              durableEvents: 4,
              skippedLogEntries: 0,
              completedRuns: 1,
              lastRequestId: 'req-1',
              lastCorrelationId: 'corr-1',
            },
            trust: { verificationCoverage: 1, attestationValidity: true },
            memory: { entries: 3, intact: true, appendOnly: true },
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    const result = await client.getObservability();
    expect(result.data.trust.attestationValidity).toBe(true);
    expect(result.data.memory.intact).toBe(true);
  });

  it('sends the optional read token as a bearer header', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        expect(url).toBe('http://api.test/observability');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sdk-read-token');
        return new Response(
          JSON.stringify({
            data: {
              runtime: { mode: 'observe', persistence: 'memory', services: [], lastActivity: null },
              provenance: {
                recentEvents: 0,
                durableEvents: 0,
                skippedLogEntries: 0,
                completedRuns: 0,
                lastRequestId: null,
                lastCorrelationId: null,
              },
              trust: { verificationCoverage: null, attestationValidity: null },
              memory: { entries: 0, intact: true, appendOnly: true },
            },
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        );
      },
      { readToken: 'sdk-read-token' }
    );

    await expect(client.getObservability()).resolves.toBeDefined();
  });

  it('lists and creates attestation revocations through the typed client', async () => {
    const requests: Array<{
      url: string;
      method?: string;
      body?: string;
      authorization?: string;
    }> = [];
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        requests.push({
          url,
          method: init?.method,
          body: init?.body?.toString(),
          authorization: new Headers(init?.headers).get('authorization') ?? undefined,
        });
        if (url.endsWith('/attest/revocations')) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: 'rev-1',
                  attestationId: 'att-1',
                  reason: 'stale evidence',
                  revokedBy: 'operator',
                  revokedAt: '2026-08-16T00:00:00.000Z',
                },
              ],
              timestamp: '2026-08-16T00:00:00.000Z',
            })
          );
        }
        if (url.endsWith('/attest/verify')) {
          return new Response(
            JSON.stringify({
              data: { valid: false, revoked: false, expired: true },
              timestamp: '2026-08-16T00:00:00.000Z',
            })
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              id: 'rev-2',
              attestationId: 'att-2',
              reason: 'manual review',
              revokedBy: 'sdk-test',
              revokedAt: '2026-08-16T00:00:00.000Z',
            },
            timestamp: '2026-08-16T00:00:00.000Z',
          }),
          { status: 201 }
        );
      },
      { readToken: 'sdk-token', adminToken: 'sdk-admin-token' }
    );

    await expect(client.getRevocations()).resolves.toMatchObject({
      data: [{ attestationId: 'att-1' }],
    });
    await expect(client.verifyAttestation({ id: 'att-1' })).resolves.toMatchObject({
      data: { valid: false, revoked: false, expired: true },
    });
    await expect(
      client.revokeAttestation('att-2', 'manual review', 'sdk-test')
    ).resolves.toMatchObject({
      data: { attestationId: 'att-2' },
    });
    expect(requests).toEqual([
      {
        url: 'http://api.test/attest/revocations',
        method: undefined,
        body: undefined,
        authorization: 'Bearer sdk-token',
      },
      {
        url: 'http://api.test/attest/verify',
        method: 'POST',
        body: JSON.stringify({ attestation: { id: 'att-1' } }),
        authorization: 'Bearer sdk-token',
      },
      {
        url: 'http://api.test/attest/revoke',
        method: 'POST',
        body: JSON.stringify({
          attestationId: 'att-2',
          reason: 'manual review',
          revokedBy: 'sdk-test',
        }),
        authorization: 'Bearer sdk-admin-token',
      },
    ]);
  });

  it('preserves API errors from revocation mutations', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () =>
        new Response(JSON.stringify({ message: 'operator policy denied' }), { status: 403 })
    );

    await expect(client.revokeAttestation('att-1', 'policy review')).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        status: 403,
        endpoint: 'http://api.test/attest/revoke',
        message: 'operator policy denied',
      })
    );
  });

  it('exposes bounded evidence export through the typed client', async () => {
    const client = new OmegaClient('http://api.test', async (url) => {
      expect(url).toBe('http://api.test/evidence/export');
      return new Response(
        JSON.stringify({
          data: {
            observability: {
              runtime: { mode: 'observe', persistence: 'memory', services: [], lastActivity: null },
              provenance: {
                recentEvents: 0,
                durableEvents: 0,
                skippedLogEntries: 0,
                completedRuns: 0,
                lastRequestId: null,
                lastCorrelationId: null,
              },
              trust: { verificationCoverage: null, attestationValidity: null },
              memory: { entries: 0, intact: true, appendOnly: true },
            },
            events: [],
            runs: [],
          },
          meta: { bounded: true, eventWindow: 40, runWindow: 10 },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(client.getEvidenceExport()).resolves.toMatchObject({
      meta: { bounded: true, runWindow: 10 },
    });
  });

  it('exposes events and runs through the same client contract', async () => {
    const paths: string[] = [];
    const client = new OmegaClient('http://api.test', async (url) => {
      paths.push(url);
      return new Response(JSON.stringify({ data: [] }));
    });

    await client.getEvents();
    await client.getRuns();
    expect(paths).toEqual(['http://api.test/events', 'http://api.test/runs']);
  });

  it('returns an explicit API error for non-success responses', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () =>
        new Response(JSON.stringify({ message: 'memory integrity failed' }), { status: 409 })
    );

    await expect(client.getObservability()).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        status: 409,
        endpoint: 'http://api.test/observability',
      })
    );
  });
});
