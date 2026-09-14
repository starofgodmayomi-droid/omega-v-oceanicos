import { run } from './index';

/**
 * Two clusters of branches sat uncovered here:
 *
 * 1. `acknowledge-persistence` and `reencrypt-persistence` only ever had a
 *    single happy-path test each (admin token present, server accepts the
 *    request). Every failure edge — a missing --reason/--operator-id, no
 *    admin token configured, a rejected request with or without a
 *    server-provided code/message, and a dropped connection thrown as
 *    either a real Error or a bare string — had never run.
 *
 * 2. `scene` had *no* test at all. The whole function, including which
 *    optional flags flow into the request body and headers, the failure
 *    branch when the API rejects the simulation, and its catch block, was
 *    dead as far as the suite was concerned.
 *
 * These are operator-facing mutation and diagnostic commands: silently
 * mis-reporting a rejected key rotation, or crediting an admin token that
 * was never sent, is exactly the kind of bug that should fail a test
 * before it fails an operator.
 */
describe('omega CLI persistence mutation failure paths', () => {
  const originalWrite = process.stdout.write;
  const originalError = process.stderr.write;
  let out: string[];
  let err: string[];

  beforeEach(() => {
    out = [];
    err = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      err.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    process.stderr.write = originalError;
  });

  describe('acknowledge-persistence', () => {
    it('fails closed and never calls the API when --reason or --operator-id is missing', async () => {
      let called = false;
      const spy = async (): Promise<Response> => {
        called = true;
        return new Response('{}');
      };

      expect(await run(['acknowledge-persistence', '--operator-id', 'operator-7'], spy)).toBe(2);
      expect(called).toBe(false);
      expect(err.join('')).toContain('Usage: omega acknowledge-persistence');

      err = [];
      expect(await run(['acknowledge-persistence', '--reason', 'review malformed log'], spy)).toBe(
        2
      );
      expect(called).toBe(false);
      expect(err.join('')).toContain('Usage: omega acknowledge-persistence');
    });

    it('omits the Authorization header when no admin token is configured', async () => {
      const exitCode = await run(
        [
          'acknowledge-persistence',
          '--reason',
          'review malformed log',
          '--operator-id',
          'operator-7',
        ],
        async (_url, init) => {
          expect(new Headers(init?.headers).has('authorization')).toBe(false);
          expect(new Headers(init?.headers).get('x-omega-operator-id')).toBe('operator-7');
          return new Response(
            JSON.stringify({
              data: {
                acknowledgement: { action: 'review-partial-recovery', operatorId: 'operator-7' },
                eventId: 'evt-ack-2',
              },
            })
          );
        }
      );

      expect(exitCode).toBe(0);
    });

    it('reports a rejected acknowledgement using the server-provided code and message', async () => {
      const exitCode = await run(
        [
          'acknowledge-persistence',
          '--reason',
          'review malformed log',
          '--operator-id',
          'operator-7',
        ],
        async () =>
          new Response(
            JSON.stringify({ code: 'PERSISTENCE_STATE_STALE', message: 'log rotated since read' }),
            { status: 409 }
          )
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('PERSISTENCE_STATE_STALE: log rotated since read');
    });

    it('defaults the code and message when the server sends neither', async () => {
      const exitCode = await run(
        [
          'acknowledge-persistence',
          '--reason',
          'review malformed log',
          '--operator-id',
          'operator-7',
        ],
        async () => new Response(JSON.stringify({}), { status: 500 })
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('PERSISTENCE_ACKNOWLEDGEMENT_FAILED: request failed');
    });
  });

  describe('reencrypt-persistence', () => {
    it('fails closed and never calls the API when --reason or --operator-id is missing', async () => {
      let called = false;
      const spy = async (): Promise<Response> => {
        called = true;
        return new Response('{}');
      };

      expect(await run(['reencrypt-persistence', '--operator-id', 'operator-7'], spy)).toBe(2);
      expect(called).toBe(false);
      expect(err.join('')).toContain('Usage: omega reencrypt-persistence');

      err = [];
      expect(await run(['reencrypt-persistence', '--reason', 'rotate to current key'], spy)).toBe(
        2
      );
      expect(called).toBe(false);
      expect(err.join('')).toContain('Usage: omega reencrypt-persistence');
    });

    it('omits the Authorization header when no admin token is configured', async () => {
      const exitCode = await run(
        [
          'reencrypt-persistence',
          '--reason',
          'rotate to current key',
          '--operator-id',
          'operator-7',
        ],
        async (_url, init) => {
          expect(new Headers(init?.headers).has('authorization')).toBe(false);
          return new Response(
            JSON.stringify({
              data: {
                reencrypted: {
                  action: 'review-key-rotation',
                  operatorId: 'operator-7',
                  snapshotRecords: 1,
                  eventRecords: 2,
                },
                eventId: 'evt-reencrypt-2',
              },
            })
          );
        }
      );

      expect(exitCode).toBe(0);
    });

    it('reports a rejected re-encryption using the server-provided code and message', async () => {
      const exitCode = await run(
        [
          'reencrypt-persistence',
          '--reason',
          'rotate to current key',
          '--operator-id',
          'operator-7',
        ],
        async () =>
          new Response(
            JSON.stringify({
              code: 'PERSISTENCE_KEY_MISSING',
              message: 'no current key configured',
            }),
            { status: 409 }
          )
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('PERSISTENCE_KEY_MISSING: no current key configured');
    });

    it('defaults the code and message when the server sends neither', async () => {
      const exitCode = await run(
        [
          'reencrypt-persistence',
          '--reason',
          'rotate to current key',
          '--operator-id',
          'operator-7',
        ],
        async () => new Response(JSON.stringify({}), { status: 500 })
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('PERSISTENCE_REENCRYPTION_FAILED: request failed');
    });

    it('reports a dropped connection', async () => {
      const exitCode = await run(
        [
          'reencrypt-persistence',
          '--reason',
          'rotate to current key',
          '--operator-id',
          'operator-7',
        ],
        async () => {
          throw new TypeError('fetch failed');
        }
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Persistence re-encryption failed: fetch failed');
    });

    it('reports a non-Error rejection without printing undefined', async () => {
      const exitCode = await run(
        [
          'reencrypt-persistence',
          '--reason',
          'rotate to current key',
          '--operator-id',
          'operator-7',
        ],
        async () => {
          throw 'socket closed';
        }
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Persistence re-encryption failed: socket closed');
      expect(err.join('')).not.toContain('undefined');
    });
  });

  describe('revoke', () => {
    it('defaults to "unknown error" when the server rejects without a message', async () => {
      const exitCode = await run(
        ['revoke', 'att-9', '--reason', 'manual review'],
        async () => new Response(JSON.stringify({}), { status: 500 })
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Revocation failed (500): unknown error');
    });

    it('reports a non-Error rejection without printing undefined', async () => {
      const exitCode = await run(['revoke', 'att-9', '--reason', 'manual review'], async () => {
        throw 'socket closed';
      });

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Revocation failed: socket closed');
      expect(err.join('')).not.toContain('undefined');
    });
  });

  describe('export', () => {
    it('reports a non-Error rejection without printing undefined', async () => {
      const exitCode = await run(['export'], async () => {
        throw 'socket closed';
      });

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Evidence export unavailable: socket closed');
      expect(err.join('')).not.toContain('undefined');
    });
  });

  describe('audit', () => {
    it('defaults to "unknown error" when the rejection carries no message field at all', async () => {
      const exitCode = await run(
        ['audit'],
        async () => new Response(JSON.stringify({}), { status: 400 })
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Audit unavailable (400): unknown error');
    });

    it('defaults to "unknown error" when the message field is present but null', async () => {
      const exitCode = await run(
        ['audit'],
        async () => new Response(JSON.stringify({ message: null }), { status: 400 })
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Audit unavailable (400): unknown error');
    });

    it('reports a non-Error rejection without printing undefined', async () => {
      const exitCode = await run(['audit'], async () => {
        throw 'socket closed';
      });

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Audit unavailable: socket closed');
      expect(err.join('')).not.toContain('undefined');
    });
  });

  describe('scene', () => {
    it('sends seed, steps, branches and a bearer token, and renders the trace', async () => {
      const exitCode = await run(
        [
          'scene',
          '--seed',
          'omega-seed-1',
          '--steps',
          '5',
          '--branches',
          '3',
          '--token',
          'cli-token',
          '--url',
          'http://api.test/',
        ],
        async (url, init) => {
          expect(url).toBe('http://api.test/scene/simulate');
          expect(init?.method).toBe('POST');
          const headers = new Headers(init?.headers);
          expect(headers.get('content-type')).toBe('application/json');
          expect(headers.get('authorization')).toBe('Bearer cli-token');
          expect(JSON.parse(String(init?.body))).toEqual({
            seed: 'omega-seed-1',
            steps: 5,
            branches: 3,
          });
          return new Response(
            JSON.stringify({
              data: {
                equation: 'Ω(t+1) = f(Ω(t))',
                states: ['s0', 's1'],
                terminalState: 's1',
                branches: [{ perspective: 'observer', terminalState: 's1' }],
                branchCount: 1,
                continuation: 'continue',
                provenance: { ruleVersion: '1.0.0', verified: true, deterministic: true },
              },
            })
          );
        }
      );

      expect(exitCode).toBe(0);
      expect(out.join('')).toContain('SCENE         s1 states=2 branches=1');
      expect(out.join('')).toContain('EQUATION      Ω(t+1) = f(Ω(t))');
    });

    it('omits seed, steps, branches and the Authorization header when none are given', async () => {
      const exitCode = await run(['scene'], async (_url, init) => {
        const headers = new Headers(init?.headers);
        expect(headers.get('content-type')).toBe('application/json');
        expect(headers.has('authorization')).toBe(false);
        expect(JSON.parse(String(init?.body))).toEqual({});
        return new Response(
          JSON.stringify({
            data: {
              equation: 'Ω(t+1) = f(Ω(t))',
              states: ['s0'],
              terminalState: 's0',
              branches: [],
              branchCount: 0,
              continuation: 'halt',
              provenance: { ruleVersion: '1.0.0', verified: true, deterministic: true },
            },
          })
        );
      });

      expect(exitCode).toBe(0);
    });

    it('reports a rejected simulation with the server message', async () => {
      const exitCode = await run(
        ['scene'],
        async () => new Response(JSON.stringify({ message: 'invalid seed' }), { status: 422 })
      );

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Scene unavailable (422): invalid seed');
    });

    it('reports a 200 response that carries no data as a failure, defaulting the message', async () => {
      const exitCode = await run(['scene'], async () => new Response(JSON.stringify({})));

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Scene unavailable (200): unknown error');
    });

    it('reports a dropped connection', async () => {
      const exitCode = await run(['scene'], async () => {
        throw new TypeError('fetch failed');
      });

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Scene unavailable: fetch failed');
    });

    it('reports a non-Error rejection without printing undefined', async () => {
      const exitCode = await run(['scene'], async () => {
        throw 'socket closed';
      });

      expect(exitCode).toBe(1);
      expect(err.join('')).toContain('Scene unavailable: socket closed');
      expect(err.join('')).not.toContain('undefined');
    });
  });
});
