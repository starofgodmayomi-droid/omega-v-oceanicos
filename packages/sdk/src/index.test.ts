import { OmegaApiError, OmegaClient } from './index';

describe('OmegaClient', () => {
  it('reads typed health and readiness evidence', async () => {
    const client = new OmegaClient('http://api.test/', async (url, init) => {
      expect(url).toBe('http://api.test/health');
      expect(new Headers(init?.headers).get('authorization')).toBe(null);
      return new Response(
        JSON.stringify({
          data: {
            status: 'ok',
            readiness: 'ready',
            checks: {
              observer: 'ready',
              verifier: 'ready',
              attester: 'ready',
              memory: { status: 'ready', integrity: true, encryption: 'disabled' },
              persistence: { mode: 'memory', encryption: 'disabled' },
            },
            policy: {
              attestationAlgorithm: 'HMAC-SHA256',
              attestationTtlMs: null,
              readAuthConfigured: false,
              adminAuthConfigured: false,
              revocationEnabled: true,
            },
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(client.getHealth()).resolves.toMatchObject({
      data: { readiness: 'ready', checks: { memory: { integrity: true } } },
    });
  });

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

  it('reads the non-secret attestation policy contract', async () => {
    const client = new OmegaClient('http://api.test', async (url) => {
      expect(url).toBe('http://api.test/attest/policy');
      return new Response(
        JSON.stringify({
          data: {
            attestationAlgorithm: 'HMAC-SHA256',
            attestationTtlMs: 900000,
            readAuthConfigured: true,
            adminAuthConfigured: true,
            revocationEnabled: true,
            persistenceEncryption: 'aes-256-gcm',
            persistenceEncryptionKeySource: 'previous',
            persistencePreviousKeyConfigured: true,
            memoryEncryption: 'aes-256-gcm',
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(client.getAttestationPolicy()).resolves.toMatchObject({
      data: { attestationTtlMs: 900000, adminAuthConfigured: true, revocationEnabled: true },
    });
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
              meta: { integrity: 'intact', digest: 'sha256:test' },
              timestamp: '2026-08-16T00:00:00.000Z',
            })
          );
        }
        if (url.endsWith('/attest/verify')) {
          return new Response(
            JSON.stringify({
              data: {
                valid: false,
                revoked: false,
                expired: true,
                revocationIntegrity: 'intact',
              },
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
      meta: { integrity: 'intact', digest: 'sha256:test' },
    });
    await expect(client.verifyAttestation({ id: 'att-1' })).resolves.toMatchObject({
      data: { valid: false, revoked: false, expired: true, revocationIntegrity: 'intact' },
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

  it('wraps a network failure on a GET request as a status-0 API error', async () => {
    const client = new OmegaClient('http://api.test', async () => {
      throw new TypeError('fetch failed');
    });

    await expect(client.getObservability()).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'fetch failed',
        status: 0,
        endpoint: 'http://api.test/observability',
      })
    );
  });

  it('wraps a network failure on a POST request as a status-0 API error', async () => {
    const client = new OmegaClient('http://api.test', async () => {
      throw new TypeError('fetch failed');
    });

    await expect(client.verifyAttestation({})).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'fetch failed',
        status: 0,
        endpoint: 'http://api.test/attest/verify',
      })
    );
  });

  /**
   * The constructor's two default parameters (`baseUrl`, `fetchImpl`) had
   * never actually been left to default: every test in this file supplies
   * both explicitly. Nothing proved the client is usable out of the box, or
   * that it really falls back to the global `fetch` rather than silently
   * requiring one to be injected.
   */
  it('falls back to localhost when constructed without a base URL', async () => {
    const requests: string[] = [];
    const client = new OmegaClient(undefined, async (url) => {
      requests.push(url);
      return new Response(JSON.stringify({ data: [] }));
    });

    await client.getEvents();
    expect(requests).toEqual(['http://localhost:3000/events']);
  });

  it('falls back to the global fetch when no fetch implementation is injected', async () => {
    const originalFetch = globalThis.fetch;
    const globalFetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    globalThis.fetch = globalFetchMock as unknown as typeof fetch;

    try {
      const client = new OmegaClient('http://api.test');
      await client.getEvents();

      expect(globalFetchMock).toHaveBeenCalledWith(
        'http://api.test/events',
        expect.objectContaining({})
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  /**
   * `revokeAttestation`'s optional `operatorId` only ever gets exercised as
   * "omitted" elsewhere in this file, so the branch that actually attaches
   * the `x-omega-operator-id` header had zero coverage: a revocation
   * attributed to a specific operator looked, to the test suite, identical
   * to an anonymous one.
   */
  it('attaches the operator id header when a revocation names an operator', async () => {
    const headers: Array<string | null> = [];
    const client = new OmegaClient('http://api.test', async (_url, init) => {
      headers.push(new Headers(init?.headers).get('x-omega-operator-id'));
      return new Response(
        JSON.stringify({
          data: {
            id: 'rev-3',
            attestationId: 'att-3',
            reason: 'named operator review',
            revokedBy: 'operator-42',
            revokedAt: '2026-08-16T00:00:00.000Z',
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        }),
        { status: 201 }
      );
    });

    await client.revokeAttestation('att-3', 'named operator review', 'operator-42', 'operator-42');
    expect(headers).toEqual(['operator-42']);
  });

  /**
   * Both `get` and `post` build their thrown `OmegaApiError` message from
   * `error instanceof Error ? error.message : String(error)`. Every network
   * failure test so far threw a real `Error`, so the `String(error)`
   * fallback for a non-Error throw (a rejected fetch can reject with
   * anything) had never run.
   */
  it('stringifies a non-Error network failure on a GET request', async () => {
    const client = new OmegaClient('http://api.test', async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'connection reset';
    });

    await expect(client.getObservability()).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'connection reset',
        status: 0,
        endpoint: 'http://api.test/observability',
      })
    );
  });

  it('stringifies a non-Error network failure on a POST request', async () => {
    const client = new OmegaClient('http://api.test', async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'connection reset';
    });

    await expect(client.verifyAttestation({})).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'connection reset',
        status: 0,
        endpoint: 'http://api.test/attest/verify',
      })
    );
  });

  /**
   * The error-body handling in `get`/`post` has three layers nothing had
   * reached: an `error` field used when `message` is absent, and a generic
   * "Request failed with status N" fallback used when the body is not even
   * a JSON object (so neither field exists to read). Every existing
   * non-success test supplied `{ message }`, so only the first layer ever
   * ran.
   */
  it('falls back to the API error field on a GET response with no message', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () => new Response(JSON.stringify({ error: 'observer offline' }), { status: 503 })
    );

    await expect(client.getObservability()).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'observer offline',
        status: 503,
      })
    );
  });

  it('falls back to a generic status message on a GET response with a non-object body', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () => new Response(JSON.stringify(null), { status: 502 })
    );

    await expect(client.getObservability()).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'Request failed with status 502',
        status: 502,
      })
    );
  });

  it('falls back to the API error field on a POST response with no message', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () => new Response(JSON.stringify({ error: 'verifier offline' }), { status: 503 })
    );

    await expect(client.verifyAttestation({})).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'verifier offline',
        status: 503,
      })
    );
  });

  it('falls back to a generic status message on a POST response with a non-object body', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () => new Response(JSON.stringify(null), { status: 502 })
    );

    await expect(client.verifyAttestation({})).rejects.toEqual(
      expect.objectContaining<Partial<OmegaApiError>>({
        message: 'Request failed with status 502',
        status: 502,
      })
    );
  });
});
