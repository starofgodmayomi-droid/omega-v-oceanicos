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
