import { run } from './index';

describe('omega status CLI', () => {
  const originalWrite = process.stdout.write;
  const originalError = process.stderr.write;

  afterEach(() => {
    process.stdout.write = originalWrite;
    process.stderr.write = originalError;
  });

  it('prints help without contacting the API', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    expect(await run(['--help'], async () => new Response())).toBe(0);
    expect(output.join('')).toContain('omega events [--url URL] [--limit N]');
  });

  it('renders live health readiness and returns success when memory integrity is valid', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['health', '--url', 'http://api.test/'], async (url, init) => {
      expect(url).toBe('http://api.test/health');
      expect(init).toBeUndefined();
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

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('HEALTH        ok / ready');
    expect(output.join('')).toContain('MEMORY        ready integrity=true encryption=disabled');
  });

  it('returns a non-zero exit code when health readiness is degraded', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(
      ['health'],
      async () =>
        new Response(
          JSON.stringify({
            data: {
              status: 'ok',
              readiness: 'degraded',
              checks: {
                observer: 'ready',
                verifier: 'ready',
                attester: 'ready',
                memory: { status: 'degraded', integrity: false, encryption: 'aes-256-gcm' },
                persistence: { mode: 'file', encryption: 'aes-256-gcm' },
              },
              policy: {
                attestationAlgorithm: 'Ed25519',
                attestationTtlMs: 900000,
                readAuthConfigured: true,
                adminAuthConfigured: true,
                revocationEnabled: true,
              },
            },
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        )
    );

    expect(exitCode).toBe(1);
    expect(output.join('')).toContain('HEALTH        ok / degraded');
  });

  it('renders live observability evidence and returns success when trust is valid', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['status', '--url', 'http://api.test/'], async (url) => {
      expect(url).toBe('http://api.test/observability');
      return new Response(
        JSON.stringify({
          data: {
            runtime: {
              mode: 'attest',
              persistence: 'file',
              services: ['observer'],
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

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('attestation=VALID');
    expect(output.join('')).toContain('request=req-1');
  });

  it('reads recent runtime events and honors the evidence limit', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(
      ['events', '--url', 'http://api.test/', '--limit', '1'],
      async (url) => {
        expect(url).toBe('http://api.test/events');
        return new Response(
          JSON.stringify({
            data: [
              { id: 'event-1', stage: 'observe', status: 'verified' },
              { id: 'event-2', stage: 'verify', status: 'verified' },
            ],
            meta: { window: 100 },
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        );
      }
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('EVENTS        1/2');
    expect(output.join('')).toContain('event-1');
    expect(output.join('')).not.toContain('event-2');
  });

  it('lists revocations with readable operator evidence', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['revocations', '--url', 'http://api.test'], async (url) => {
      expect(url).toBe('http://api.test/attest/revocations');
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
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('REVOCATIONS   1');
    expect(output.join('')).toContain('att-1 revokedBy=operator reason=stale evidence');
  });

  it('prints the non-secret backend policy with the read token', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['policy', '--token', 'cli-token'], async (url, init) => {
      expect(url).toBe('http://localhost:3000/attest/policy');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer cli-token');
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
        })
      );
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('"attestationTtlMs":900000');
    expect(output.join('')).toContain('"persistenceEncryptionKeySource":"previous"');
    expect(output.join('')).not.toMatch(/correct-secret|previous-secret/i);
    expect(output.join('')).not.toMatch(/token|secret|private/i);
  });

  it('prints expired verification status and fails closed', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(
      ['verify', '--attestation-json', '{"id":"att-1"}', '--token', 'cli-token'],
      async (url, init) => {
        expect(url).toBe('http://localhost:3000/attest/verify');
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer cli-token');
        expect(JSON.parse(String(init?.body))).toEqual({ attestation: { id: 'att-1' } });
        return new Response(
          JSON.stringify({ data: { valid: false, revoked: false, expired: true } })
        );
      }
    );

    expect(exitCode).toBe(1);
    expect(output.join('')).toContain('VERIFICATION valid=false revoked=false expired=true');
  });

  it('reports unavailable revocations without claiming an empty result', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(
        ['revocations'],
        async () => new Response(JSON.stringify({ message: 'read denied' }), { status: 403 })
      )
    ).toBe(1);
    expect(errors.join('')).toContain('Revocations unavailable (403)');
  });

  it('reports a rejected revocation mutation and preserves the API message', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(
        ['revoke', 'att-2', '--reason', 'manual review'],
        async () => new Response(JSON.stringify({ message: 'policy denied' }), { status: 403 })
      )
    ).toBe(1);
    expect(errors.join('')).toContain('Revocation failed (403): policy denied');
  });

  it('revokes an attestation with the required reason and token', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(
      [
        'revoke',
        'att-2',
        '--reason',
        'manual review',
        '--token',
        'cli-token',
        '--admin-token',
        'cli-admin-token',
      ],
      async (url, init) => {
        expect(url).toBe('http://localhost:3000/attest/revoke');
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer cli-admin-token');
        expect(JSON.parse(String(init?.body))).toEqual({
          attestationId: 'att-2',
          reason: 'manual review',
          revokedBy: 'omega-cli',
        });
        return new Response(
          JSON.stringify({
            data: {
              id: 'rev-2',
              attestationId: 'att-2',
              reason: 'manual review',
              revokedBy: 'omega-cli',
              revokedAt: '2026-08-16T00:00:00.000Z',
            },
          }),
          { status: 201 }
        );
      }
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('REVOKED       att-2');
  });

  it('fails closed when revoke has no reason', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(await run(['revoke', 'att-2'], async () => new Response())).toBe(2);
    expect(errors.join('')).toContain('--reason REASON');
  });

  it('exports bounded evidence with the bearer token', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['export', '--token', 'cli-token'], async (url, init) => {
      expect(url).toBe('http://localhost:3000/evidence/export');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer cli-token');
      return new Response(
        JSON.stringify({
          data: {
            observability: { memory: { intact: true, appendOnly: true } },
            events: [],
            runs: [],
          },
          meta: { bounded: true, eventWindow: 40, runWindow: 10 },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('"bounded":true');
  });

  it('reads recent runs and displays verification and attestation status', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(
      ['runs', '--url', 'http://api.test/', '--limit', '1'],
      async (url) => {
        expect(url).toBe('http://api.test/runs');
        return new Response(
          JSON.stringify({
            data: [
              {
                observation: { id: 'obs-1' },
                verification: { id: 'ver-1', summary: { passed: true } },
                attestation: { id: 'att-1', verified: true },
              },
              {
                observation: { id: 'obs-2' },
                verification: { id: 'ver-2', summary: { passed: false } },
                attestation: { id: 'att-2', verified: false },
              },
            ],
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        );
      }
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('RUNS          1/2');
    expect(output.join('')).toContain('obs-1 verification=PASSED attestation=VALID');
    expect(output.join('')).not.toContain('obs-2');
  });

  it('fails closed when memory integrity is false', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    const exitCode = await run(
      ['status'],
      async () =>
        new Response(
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
              memory: { entries: 0, intact: false, appendOnly: true },
            },
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        )
    );

    expect(exitCode).toBe(1);
    expect(errors).toHaveLength(0);
  });
});
