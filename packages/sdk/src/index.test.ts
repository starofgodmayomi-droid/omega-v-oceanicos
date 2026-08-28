import { OmegaApiError, OmegaClient } from './index';

describe('OmegaClient', () => {
  it('reads which rules the engine can actually execute', async () => {
    // The flag is the reason this method exists. A rule the engine holds
    // but cannot run fails verification rather than passing quietly, and
    // without this an SDK consumer only learns that from a failed verdict.
    const client = new OmegaClient('http://api.test/', async (url) => {
      expect(url).toBe('http://api.test/rules');
      return new Response(
        JSON.stringify({
          data: {
            count: 2,
            registered: 2,
            executable: 1,
            category: null,
            rules: [
              {
                name: 'status-code-check',
                version: '1.0.0',
                appliesTo: ['health-check'],
                definition: 'statusCode === 200',
                description: 'Status code is 200',
                createdAt: '2026-08-16T00:00:00.000Z',
                active: true,
                executable: true,
              },
              {
                name: 'declared-only',
                version: '1.0.0',
                appliesTo: ['health-check'],
                definition: 'something the engine does not interpret',
                description: 'Declared but not implemented',
                createdAt: '2026-08-16T00:00:00.000Z',
                active: true,
                executable: false,
              },
            ],
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    const response = await client.getRules();

    expect(response.data.executable).toBe(1);
    expect(response.data.registered).toBe(2);
    expect(response.data.rules.map((rule) => rule.executable)).toEqual([true, false]);
  });

  it('passes a category filter through as a query parameter', async () => {
    // registered stays at the engine total while count reflects the
    // filter, so a caller can tell "no matching rules" from "no rules".
    const client = new OmegaClient('http://api.test/', async (url) => {
      expect(url).toBe('http://api.test/rules?category=health-check');
      return new Response(
        JSON.stringify({
          data: { count: 0, registered: 2, executable: 0, category: 'health-check', rules: [] },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    const response = await client.getRules({ category: 'health-check' });

    expect(response.data.count).toBe(0);
    expect(response.data.registered).toBe(2);
  });

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

  it('reads typed persistence key identity evidence from health', async () => {
    const client = new OmegaClient('http://api.test/', async (url) => {
      expect(url).toBe('http://api.test/health');
      return new Response(
        JSON.stringify({
          data: {
            status: 'ok',
            readiness: 'ready',
            checks: {
              observer: 'ready',
              verifier: 'ready',
              attester: 'ready',
              memory: { status: 'ready', integrity: true, encryption: 'aes-256-gcm' },
              persistence: {
                mode: 'file',
                encryption: 'aes-256-gcm',
                currentKeyFingerprint: 'current-fingerprint',
                previousKeyFingerprint: 'previous-fingerprint',
              },
            },
            policy: {
              attestationAlgorithm: 'Ed25519',
              attestationTtlMs: 900000,
              readAuthConfigured: true,
              adminAuthConfigured: true,
              revocationEnabled: true,
            },
          },
          timestamp: '2026-08-19T00:00:00.000Z',
        })
      );
    });

    await expect(client.getHealth()).resolves.toMatchObject({
      data: {
        checks: {
          persistence: {
            currentKeyFingerprint: 'current-fingerprint',
            previousKeyFingerprint: 'previous-fingerprint',
          },
        },
      },
    });
  });

  it('reads the bounded OS snapshot with the read bearer', async () => {
    const client = new OmegaClient(
      'http://api.test/',
      async (url, init) => {
        expect(url).toBe('http://api.test/os');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer read-token');
        return new Response(
          JSON.stringify({
            data: {
              state: 'ready',
              tasks: [],
              events: [
                { sequence: 1, type: 'boot', state: 'booting' },
                { sequence: 2, type: 'boot', state: 'ready' },
              ],
            },
            timestamp: '2026-08-28T00:00:00.000Z',
          })
        );
      },
      { readToken: 'read-token' }
    );
    await expect(client.getOperatingSystem()).resolves.toMatchObject({
      data: { state: 'ready', tasks: [], events: [{ sequence: 1 }, { sequence: 2 }] },
    });
  });

  it('reads typed explicit state readiness evidence', async () => {
    const client = new OmegaClient('http://api.test/', async (url) => {
      expect(url).toBe('http://api.test/state');
      return new Response(
        JSON.stringify({
          data: {
            status: 'active',
            readiness: 'degraded',
            persistence: 'file',
            eventLogSource: 'partial',
            eventLogReason: '1 line(s) could not be parsed',
            eventLogKeySource: 'none',
            skippedLogEntries: 1,
            trustBasis: { serviceReadiness: 0 },
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(client.getState()).resolves.toMatchObject({
      data: {
        readiness: 'degraded',
        eventLogSource: 'partial',
        eventLogReason: '1 line(s) could not be parsed',
        eventLogKeySource: 'none',
        skippedLogEntries: 1,
        trustBasis: { serviceReadiness: 0 },
      },
    });
  });

  it('reads typed persistence key identity evidence from state', async () => {
    const client = new OmegaClient('http://api.test/', async (url) => {
      expect(url).toBe('http://api.test/state');
      return new Response(
        JSON.stringify({
          data: {
            status: 'active',
            readiness: 'ready',
            persistence: 'file',
            eventLogSource: 'restored',
            eventLogReason: null,
            eventLogKeySource: 'current',
            persistenceCurrentKeyFingerprint: 'current-fingerprint',
            persistencePreviousKeyFingerprint: 'previous-fingerprint',
            trustBasis: { serviceReadiness: 1 },
          },
          timestamp: '2026-08-19T00:00:00.000Z',
        })
      );
    });

    await expect(client.getState()).resolves.toMatchObject({
      data: {
        persistenceCurrentKeyFingerprint: 'current-fingerprint',
        persistencePreviousKeyFingerprint: 'previous-fingerprint',
      },
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
              eventLogSource: 'restored',
              skippedLogEntries: 0,
              eventLogReason: null,
              eventLogEncryptionKeySource: 'current',
              persistenceRotationPending: false,
              operatorAction: 'none',
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
    expect(result.data.runtime.persistenceRotationPending).toBe(false);
    expect(result.data.runtime.operatorAction).toBe('none');
  });

  it('acknowledges persistence review with admin provenance', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        expect(url).toBe('http://api.test/persistence/acknowledge');
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin-token');
        expect(new Headers(init?.headers).get('x-omega-operator-id')).toBe('operator-7');
        expect(JSON.parse(String(init?.body))).toEqual({
          reason: 'Review malformed local log before repair',
          operatorId: 'operator-7',
        });
        return new Response(
          JSON.stringify({
            data: {
              acknowledgement: {
                operatorId: 'operator-7',
                reason: 'Review malformed local log before repair',
                action: 'review-partial-recovery',
                acknowledgedAt: '2026-08-19T00:00:00.000Z',
                requestId: 'req-ack-1',
              },
              eventId: 'evt-ack-1',
            },
            timestamp: '2026-08-19T00:00:00.000Z',
          })
        );
      },
      { adminToken: 'admin-token' }
    );

    await expect(
      client.acknowledgePersistenceReview('Review malformed local log before repair', 'operator-7')
    ).resolves.toMatchObject({
      data: {
        eventId: 'evt-ack-1',
        acknowledgement: { operatorId: 'operator-7', action: 'review-partial-recovery' },
      },
    });
  });

  it('acknowledges persistence review without an operator id header when none is given', async () => {
    // The test above always names an operator, so the operator-id header
    // has only ever been attached, never omitted. operatorId is optional;
    // this exercises the branch where the caller does not supply one.
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        expect(url).toBe('http://api.test/persistence/acknowledge');
        expect(new Headers(init?.headers).has('x-omega-operator-id')).toBe(false);
        expect(JSON.parse(String(init?.body))).toEqual({
          reason: 'Review malformed local log before repair',
          operatorId: undefined,
        });
        return new Response(
          JSON.stringify({
            data: {
              acknowledgement: {
                operatorId: null,
                reason: 'Review malformed local log before repair',
                action: 'review-partial-recovery',
                acknowledgedAt: '2026-08-19T00:00:00.000Z',
                requestId: 'req-ack-2',
              },
              eventId: 'evt-ack-2',
            },
            timestamp: '2026-08-19T00:00:00.000Z',
          })
        );
      },
      { adminToken: 'admin-token' }
    );

    await expect(
      client.acknowledgePersistenceReview('Review malformed local log before repair')
    ).resolves.toMatchObject({ data: { eventId: 'evt-ack-2' } });
  });

  it('re-encrypts persistence with admin provenance and record counts', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        expect(url).toBe('http://api.test/persistence/reencrypt');
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin-token');
        expect(new Headers(init?.headers).get('x-omega-operator-id')).toBe('operator-7');
        expect(JSON.parse(String(init?.body))).toEqual({
          reason: 'Rotate local ciphertext to the current key',
          operatorId: 'operator-7',
        });
        return new Response(
          JSON.stringify({
            data: {
              reencrypted: {
                operatorId: 'operator-7',
                reason: 'Rotate local ciphertext to the current key',
                action: 'review-key-rotation',
                reencryptedAt: '2026-08-19T00:00:00.000Z',
                requestId: 'req-reencrypt-1',
                snapshotRecords: 4,
                eventRecords: 9,
                snapshotKeySource: 'previous',
                eventLogKeySource: 'mixed',
              },
              eventId: 'evt-reencrypt-1',
            },
            timestamp: '2026-08-19T00:00:00.000Z',
          })
        );
      },
      { adminToken: 'admin-token' }
    );

    await expect(
      client.reencryptPersistence('Rotate local ciphertext to the current key', 'operator-7')
    ).resolves.toMatchObject({
      data: {
        eventId: 'evt-reencrypt-1',
        reencrypted: {
          operatorId: 'operator-7',
          action: 'review-key-rotation',
          snapshotRecords: 4,
          eventRecords: 9,
          snapshotKeySource: 'previous',
          eventLogKeySource: 'mixed',
        },
      },
    });
  });

  it('re-encrypts persistence without an operator id header when none is given', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        expect(url).toBe('http://api.test/persistence/reencrypt');
        expect(new Headers(init?.headers).has('x-omega-operator-id')).toBe(false);
        expect(JSON.parse(String(init?.body))).toEqual({
          reason: 'Rotate local ciphertext to the current key',
          operatorId: undefined,
        });
        return new Response(
          JSON.stringify({
            data: {
              reencrypted: {
                operatorId: null,
                reason: 'Rotate local ciphertext to the current key',
                action: 'review-key-rotation',
                reencryptedAt: '2026-08-19T00:00:00.000Z',
                requestId: 'req-reencrypt-2',
                snapshotRecords: 1,
                eventRecords: 2,
                snapshotKeySource: 'current',
                eventLogKeySource: 'current',
              },
              eventId: 'evt-reencrypt-2',
            },
            timestamp: '2026-08-19T00:00:00.000Z',
          })
        );
      },
      { adminToken: 'admin-token' }
    );

    await expect(
      client.reencryptPersistence('Rotate local ciphertext to the current key')
    ).resolves.toMatchObject({ data: { eventId: 'evt-reencrypt-2' } });
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

  it('queries bounded audit events with encoded filters and preserves provenance', async () => {
    const client = new OmegaClient('http://api.test', async (url, init) => {
      expect(url).toBe(
        'http://api.test/audit/events?type=attestation.created&status=passed&limit=2'
      );
      expect(new Headers(init?.headers).get('authorization')).toBe(null);
      return new Response(
        JSON.stringify({
          data: [{ id: 'evt-1', type: 'attestation.created', stage: 'attest', status: 'passed' }],
          meta: {
            bounded: true,
            limit: 2,
            total: 1,
            source: 'memory',
            skipped: 0,
            keySource: 'none',
            filters: {
              type: 'attestation.created',
              stage: null,
              status: 'passed',
              from: null,
              to: null,
            },
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(
      client.getAuditEvents({ type: 'attestation.created', status: 'passed', limit: 2 })
    ).resolves.toMatchObject({ meta: { bounded: true, source: 'memory', total: 1 } });
  });

  /**
   * `getAuditEvents` takes an optional query and only appends a `?` suffix
   * when at least one filter is present; the one existing test always
   * supplied three filters, so neither the default `query = {}` parameter
   * nor the unfiltered request path had ever run.
   */
  it('queries audit events with no filters and requests the bare endpoint', async () => {
    const client = new OmegaClient('http://api.test', async (url) => {
      expect(url).toBe('http://api.test/audit/events');
      return new Response(
        JSON.stringify({
          data: [],
          meta: {
            bounded: true,
            limit: 100,
            total: 0,
            source: 'memory',
            skipped: 0,
            keySource: 'none',
            filters: { type: null, stage: null, status: null, from: null, to: null },
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(client.getAuditEvents()).resolves.toMatchObject({
      meta: { bounded: true, total: 0 },
    });
  });

  it('skips a query field that is explicitly undefined rather than stringifying it', async () => {
    // Every filtered call above supplies a real value for every field it
    // names. Naming a field but leaving its value undefined is a distinct
    // case: the loop that builds the query string has to notice and skip
    // it, rather than serializing the literal string "undefined".
    const client = new OmegaClient('http://api.test', async (url) => {
      expect(url).toBe('http://api.test/audit/events?status=passed');
      return new Response(
        JSON.stringify({
          data: [],
          meta: {
            bounded: true,
            limit: 100,
            total: 0,
            source: 'memory',
            skipped: 0,
            keySource: 'none',
            filters: { type: null, stage: null, status: 'passed', from: null, to: null },
          },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    await expect(
      client.getAuditEvents({ type: undefined, status: 'passed' })
    ).resolves.toMatchObject({ meta: { total: 0 } });
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

  it('simulates a scene with no input, exercising the default empty request body', async () => {
    // Every scene-related call elsewhere in this repo passes an explicit
    // input object. Omitting the argument entirely is what actually
    // exercises simulateScene's default parameter, and it had never run.
    const client = new OmegaClient(
      'http://api.test',
      async (url, init) => {
        expect(url).toBe('http://api.test/scene/simulate');
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer read-token');
        expect(JSON.parse(String(init?.body))).toEqual({});
        return new Response(
          JSON.stringify({
            data: {
              id: 'scene-1',
              seed: 'auto',
              equation: 'x',
              states: ['start'],
              terminalState: 'start',
              trace: [],
              branches: [
                {
                  id: 'scene-branch-1',
                  index: 0,
                  perspective: 'point-of-view-1',
                  states: ['start'],
                  terminalState: 'start',
                  trace: [],
                  divergenceEvidence: 'fixture',
                },
              ],
              branchCount: 1,
              continuation: 'bounded-sample-of-infinite-potential',
              provenance: {
                source: 'local-simulation',
                ruleVersion: 'scene-equation.v2',
                deterministic: true,
                verified: false,
                note: 'fixture',
              },
            },
            timestamp: '2026-08-22T00:00:00.000Z',
          })
        );
      },
      { readToken: 'read-token' }
    );

    await expect(client.simulateScene()).resolves.toMatchObject({
      data: { id: 'scene-1', terminalState: 'start' },
    });
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

describe('OmegaClient local job evidence', () => {
  const status = {
    enabled: true,
    durable: false as const,
    source: 'memory' as const,
    counts: { queued: 1, running: 0, succeeded: 0, failed: 0, unknown: 0 },
    recentWindow: 40,
  };

  it('reads bounded jobs with query and bearer token', async () => {
    const client = new OmegaClient(
      'http://api.test/',
      async (url, init) => {
        expect(url).toBe('http://api.test/jobs?limit=2&state=running');
        const headers = new Headers(init?.headers);
        expect(headers.get('authorization')).toBe('Bearer read-token');
        expect(headers.get('x-omega-local-job-token')).toBe('job-token');
        expect(init?.method).toBeUndefined();
        return new Response(
          JSON.stringify({ data: { jobs: [], status }, timestamp: '2026-08-20T00:00:00.000Z' })
        );
      },
      { readToken: 'read-token', localJobToken: 'job-token' }
    );
    await expect(client.getJobs({ limit: 2, state: 'running' })).resolves.toMatchObject({
      data: { status: { durable: false, source: 'memory', recentWindow: 40 } },
    });
  });

  it('encodes job identifiers and preserves event sequence/provenance', async () => {
    const client = new OmegaClient('http://api.test', async (url) => {
      expect(url).toBe('http://api.test/jobs/job%2Fwith%20space');
      return new Response(
        JSON.stringify({
          data: {
            job: { id: 'job/with space', state: 'succeeded', provenance: { source: 'api' } },
            events: [{ id: 'event-1', jobId: 'job/with space', sequence: 1, type: 'created' }],
            status,
          },
          timestamp: '2026-08-20T00:00:00.000Z',
        })
      );
    });
    await expect(client.getJob('job/with space')).resolves.toMatchObject({
      data: { events: [{ sequence: 1, type: 'created' }], status: { durable: false } },
    });
  });

  it('refuses to look up a job by a blank id without making a request', async () => {
    const fetchImpl = jest.fn();
    const client = new OmegaClient('http://api.test', fetchImpl);

    await expect(client.getJob('   ')).rejects.toEqual(
      expect.objectContaining({
        message: 'jobId is required',
        status: 400,
        code: 'JOB_INVALID',
        endpoint: 'http://api.test/jobs',
      })
    );
    // The validation has to happen before any network call, not after a
    // failed one: an empty id is a caller mistake, not a server rejection.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('preserves structured disabled errors', async () => {
    const client = new OmegaClient(
      'http://api.test',
      async () =>
        new Response(
          JSON.stringify({
            code: 'LOCAL_JOB_DISABLED',
            message: 'The local job ledger is disabled',
            timestamp: '2026-08-20T00:00:00.000Z',
          }),
          { status: 404 }
        )
    );
    await expect(client.getJobs()).rejects.toEqual(
      expect.objectContaining({
        code: 'LOCAL_JOB_DISABLED',
        status: 404,
        timestamp: '2026-08-20T00:00:00.000Z',
      })
    );
  });
});
