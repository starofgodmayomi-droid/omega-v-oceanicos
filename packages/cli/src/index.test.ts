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
      if (url.endsWith('/state')) {
        return new Response(
          JSON.stringify({
            data: { readiness: 'ready', trustBasis: { serviceReadiness: 1 } },
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        );
      }
      expect(url).toBe('http://api.test/observability');
      return new Response(
        JSON.stringify({
          data: {
            runtime: {
              mode: 'attest',
              persistence: 'file',
              services: ['observer'],
              lastActivity: null,
              eventLogSource: 'restored',
              skippedLogEntries: 0,
              eventLogReason: null,
              eventLogEncryptionKeySource: 'current',
              persistenceRotationPending: false,
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
    expect(output.join('')).toContain('STATE         ready service=1');
    expect(output.join('')).toContain(
      'EVENT LOG     restored skipped=0 key=current rotation=false'
    );
    expect(output.join('')).toContain('LOG REASON    none');
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

  it('queries bounded audit events and prints local provenance', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(
      ['audit', '--url', 'http://api.test/', '--status', 'passed', '--limit', '2'],
      async (url, init) => {
        expect(url).toBe('http://api.test/audit/events?status=passed&limit=2');
        expect(init).toBeUndefined();
        return new Response(
          JSON.stringify({
            data: [{ id: 'event-1', status: 'passed' }],
            meta: {
              bounded: true,
              limit: 2,
              total: 1,
              source: 'memory',
              skipped: 0,
              keySource: 'none',
              filters: { type: null, stage: null, status: 'passed', from: null, to: null },
            },
            timestamp: '2026-08-16T00:00:00.000Z',
          })
        );
      }
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('AUDIT         1/1 source=memory key=none');
    expect(output.join('')).toContain('event-1');
  });

  it('returns non-zero when audit evidence is unavailable', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    await expect(
      run(
        ['audit'],
        async () => new Response(JSON.stringify({ message: 'bad query' }), { status: 400 })
      )
    ).resolves.toBe(1);
    expect(errors.join('')).toContain('Audit unavailable (400)');
  });

  /**
   * `audit`'s try/catch mirrors every other command's: a rejected fetch (a
   * dropped connection, DNS failure, timeout) is a distinct failure mode
   * from a non-ok HTTP response, handled by its own branch. Only the non-ok
   * response case had a test; the catch block itself had never run.
   */
  it('reports a network failure while reading audit evidence', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['audit'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Audit unavailable: fetch failed');
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
          meta: { integrity: 'intact', digest: 'sha256:test' },
          timestamp: '2026-08-16T00:00:00.000Z',
        })
      );
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('REVOCATIONS   1 integrity=intact');
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
            adminOperatorAllowlistConfigured: true,
            revocationEnabled: true,
            revocationIntegrity: 'intact',
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
          JSON.stringify({
            data: {
              valid: false,
              revoked: false,
              expired: true,
              revocationIntegrity: 'intact',
            },
          })
        );
      }
    );

    expect(exitCode).toBe(1);
    expect(output.join('')).toContain(
      'VERIFICATION valid=false revoked=false expired=true registry=intact'
    );
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

  /**
   * Every command's network-failure catch branch, and several of the
   * non-ok-response branches, ran zero times under test. `packages/cli`
   * was the second-lowest-coverage package in the repo (66.44% branch).
   * A CLI operator relies on these error paths to fail closed with a
   * readable message when the API is unreachable or rejects a request;
   * they deserve the same evidence as the success paths above.
   */
  it('reports an unknown command and shows usage', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(await run(['bogus'], async () => new Response())).toBe(2);
    expect(errors.join('')).toContain('Unknown command: bogus');
    expect(errors.join('')).toContain('omega health [--url URL]');
  });

  it('reports a non-ok health response with the API message', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(
        ['health'],
        async () =>
          new Response(JSON.stringify({ message: 'service unavailable' }), { status: 503 })
      )
    ).toBe(1);
    expect(errors.join('')).toContain('Health unavailable (503): service unavailable');
  });

  it('reports a network failure while checking health', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['health'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Health unavailable: fetch failed');
  });

  it('reports a non-ok observability response', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['status'], async () => new Response(JSON.stringify({}), { status: 500 }))
    ).toBe(1);
    expect(errors.join('')).toContain('Observability unavailable (500)');
  });

  it('reports a network failure while checking status', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['status'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Observability unavailable: fetch failed');
  });

  it('reports a non-ok runs response', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(await run(['runs'], async () => new Response(JSON.stringify({}), { status: 500 }))).toBe(
      1
    );
    expect(errors.join('')).toContain('Runs unavailable (500)');
  });

  it('reports a network failure while reading runs', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['runs'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Runs unavailable: fetch failed');
  });

  it('reports a non-ok policy response with the API message', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(
        ['policy'],
        async () => new Response(JSON.stringify({ message: 'read denied' }), { status: 403 })
      )
    ).toBe(1);
    expect(errors.join('')).toContain('Policy unavailable (403): read denied');
  });

  it('reports a network failure while reading policy', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['policy'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Policy unavailable: fetch failed');
  });

  it('fails closed when verify is called without --attestation-json', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(await run(['verify'], async () => new Response())).toBe(2);
    expect(errors.join('')).toContain('Usage: omega verify --attestation-json JSON');
  });

  it('fails closed when --attestation-json is not valid JSON', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['verify', '--attestation-json', '{not json'], async () => new Response())
    ).toBe(2);
    expect(errors.join('')).toContain('Invalid JSON supplied to --attestation-json');
  });

  it('reports a non-ok verify response with the API message', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(
        ['verify', '--attestation-json', '{"id":"att-1"}'],
        async () =>
          new Response(JSON.stringify({ message: 'malformed attestation' }), { status: 400 })
      )
    ).toBe(1);
    expect(errors.join('')).toContain('Verification failed (400): malformed attestation');
  });

  it('reports a network failure while verifying an attestation', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['verify', '--attestation-json', '{"id":"att-1"}'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Verification failed: fetch failed');
  });

  it('reports a network failure while listing revocations', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['revocations'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Revocations unavailable: fetch failed');
  });

  it('reports a network failure while revoking an attestation', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['revoke', 'att-2', '--reason', 'manual review'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Revocation failed: fetch failed');
  });

  it('reports a non-ok evidence export response', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['export'], async () => new Response(JSON.stringify({}), { status: 500 }))
    ).toBe(1);
    expect(errors.join('')).toContain('Evidence export unavailable (500)');
  });

  it('reports a network failure while exporting evidence', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['export'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Evidence export unavailable: fetch failed');
  });

  it('reports a non-ok events response', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['events'], async () => new Response(JSON.stringify({}), { status: 500 }))
    ).toBe(1);
    expect(errors.join('')).toContain('Events unavailable (500)');
  });

  it('reports a network failure while reading events', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    expect(
      await run(['events'], async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe(1);
    expect(errors.join('')).toContain('Events unavailable: fetch failed');
  });
});

describe('omega CLI argument parsing', () => {
  const originalWrite = process.stdout.write;
  const originalError = process.stderr.write;
  const originalUrl = process.env.OMEGA_API_URL;
  const originalToken = process.env.OMEGA_READ_TOKEN;

  const capture = (): string[] => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    return output;
  };

  afterEach(() => {
    process.stdout.write = originalWrite;
    process.stderr.write = originalError;
    if (originalUrl === undefined) delete process.env.OMEGA_API_URL;
    else process.env.OMEGA_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.OMEGA_READ_TOKEN;
    else process.env.OMEGA_READ_TOKEN = originalToken;
  });

  const runsPayload = (count: number): string =>
    JSON.stringify({
      data: Array.from({ length: count }, (_unused, index) => ({
        observation: { id: `obs-${index}` },
        verification: { summary: { passed: true } },
        attestation: { verified: true },
      })),
      timestamp: '2026-08-17T00:00:00.000Z',
    });

  it('applies --limit when it is a positive integer', async () => {
    const output = capture();
    const exitCode = await run(
      ['runs', '--url', 'http://api.test', '--limit', '2'],
      async () => new Response(runsPayload(5))
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('RUNS          2/5');
  });

  // A limit the parser cannot use is ignored rather than rejected, so the
  // command returns everything. Pinning that: silently returning more rows
  // than asked for is surprising, and it should not change by accident.
  it.each([
    ['a non-numeric value', 'abc'],
    ['zero', '0'],
    ['a negative value', '-3'],
    ['a fractional value', '2.5'],
  ])('ignores --limit given %s and returns every entry', async (_label, value) => {
    const output = capture();
    const exitCode = await run(
      ['runs', '--url', 'http://api.test', '--limit', value],
      async () => new Response(runsPayload(5))
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('RUNS          5/5');
  });

  it('ignores a trailing --limit with no value', async () => {
    const output = capture();
    const exitCode = await run(
      ['runs', '--url', 'http://api.test', '--limit'],
      async () => new Response(runsPayload(3))
    );

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('RUNS          3/3');
  });

  it('falls back to OMEGA_API_URL when --url has no value', async () => {
    process.env.OMEGA_API_URL = 'http://from-env.test';
    capture();

    const exitCode = await run(['runs', '--url'], async (url) => {
      expect(url).toBe('http://from-env.test/runs');
      return new Response(runsPayload(1));
    });

    expect(exitCode).toBe(0);
  });

  it('falls back to OMEGA_READ_TOKEN when --token has no value', async () => {
    process.env.OMEGA_READ_TOKEN = 'token-from-env';
    capture();

    const exitCode = await run(
      ['runs', '--url', 'http://api.test', '--token'],
      async (_url, init) => {
        expect((init?.headers as Record<string, string>)?.Authorization).toBe(
          'Bearer token-from-env'
        );
        return new Response(runsPayload(1));
      }
    );

    expect(exitCode).toBe(0);
  });

  it('falls back to localhost when neither flag nor environment is set', async () => {
    delete process.env.OMEGA_API_URL;
    capture();

    const exitCode = await run(['runs'], async (url) => {
      expect(url).toBe('http://localhost:3000/runs');
      return new Response(runsPayload(1));
    });

    expect(exitCode).toBe(0);
  });

  it('strips a trailing slash rather than producing a doubled path', async () => {
    capture();

    const exitCode = await run(['runs', '--url', 'http://api.test/'], async (url) => {
      expect(url).toBe('http://api.test/runs');
      return new Response(runsPayload(1));
    });

    expect(exitCode).toBe(0);
  });

  it('renders failed verification and invalid attestation without softening them', async () => {
    const output = capture();
    const exitCode = await run(['runs', '--url', 'http://api.test'], async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              observation: { id: 'obs-bad' },
              verification: { summary: { passed: false } },
              attestation: { verified: false },
            },
          ],
          timestamp: '2026-08-17T00:00:00.000Z',
        })
      );
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('obs-bad verification=FAILED attestation=INVALID');
  });
});
