import { run } from '../index';

/**
 * Governance commands (C9): reconcile, provenance, grants, authorize.
 *
 * These are the CLI half of the C6/C7/authority surface the dashboard reads.
 * They are evidence readers, so the assertions are about what they print and
 * which exit code they return — a VERIFIED verdict is the only success, and
 * an UNKNOWN/NOT_EXECUTED verdict is never promoted to one.
 */
describe('omega governance CLI', () => {
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

  it('reconciles an observed transition and exits zero only for VERIFIED', async () => {
    const exitCode = await run(
      ['reconcile', '--change-id', 'c1', '--expected', 'S1', '--observed', 'S1', '--url', 'http://api.test', '--admin-token', 'admin'],
      async (url, init) => {
        expect(url).toBe('http://api.test/v1/reconciliation/reconcile');
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer admin');
        expect(JSON.parse(String(init?.body))).toEqual({
          changeId: 'c1',
          expectedState: 'S1',
          observedState: 'S1',
        });
        return new Response(
          JSON.stringify({
            success: true,
            reconciliation: {
              status: 'VERIFIED',
              changeId: 'c1',
              expectedState: 'S1',
              observedState: 'S1',
              evidence: 'sha256:abc',
              reconciledAt: '2026-10-30T00:00:00.000Z',
            },
          })
        );
      }
    );

    expect(exitCode).toBe(0);
    expect(out.join('')).toContain('RECONCILE     VERIFIED change=c1');
    expect(out.join('')).toContain('EVIDENCE      sha256:abc');
    expect(err.join('')).toBe('');
  });

  it('reports NOT_EXECUTED without an observed state and exits non-zero', async () => {
    const exitCode = await run(['reconcile', '--change-id', 'c2', '--expected', 'S1'], async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ changeId: 'c2', expectedState: 'S1' });
      return new Response(
        JSON.stringify({
          success: true,
          reconciliation: {
            status: 'NOT_EXECUTED',
            changeId: 'c2',
            expectedState: 'S1',
            evidence: 'sha256:def',
            reconciledAt: '2026-10-30T00:00:00.000Z',
          },
        })
      );
    });

    expect(exitCode).toBe(1);
    expect(out.join('')).toContain('RECONCILE     NOT_EXECUTED change=c2');
    expect(out.join('')).toContain('OBSERVED      NOT EXECUTED');
  });

  it('refuses to reconcile without the required flags', async () => {
    const exitCode = await run(['reconcile'], async () => new Response('{}'));

    expect(exitCode).toBe(2);
    expect(err.join('')).toContain('Usage: omega reconcile');
  });

  it('reports provenance integrity and fails closed when the chain is broken', async () => {
    const exitCode = await run(['provenance', '--url', 'http://api.test'], async (url) => {
      if (url.endsWith('/v1/provenance/tip')) {
        return new Response(JSON.stringify({ success: true, tip: { hash: 'h1', sequence: 2 }, length: 2 }));
      }
      return new Response(JSON.stringify({ success: true, integrity: false, length: 2 }));
    });

    expect(exitCode).toBe(1);
    expect(out.join('')).toContain('PROVENANCE    entries=2');
    expect(out.join('')).toContain('INTEGRITY     BROKEN');
    expect(out.join('')).toContain('TIP           h1 sequence=2');
  });

  it('lists grants with their active count', async () => {
    const exitCode = await run(['grants', '--url', 'http://api.test'], async () =>
      new Response(
        JSON.stringify({
          success: true,
          activeCount: 1,
          grants: [
            { id: 'g1', subject: 'alice', scope: 'oceanicos:test', grantedBy: 'bob', revoked: false },
            { id: 'g2', subject: 'carol', scope: 'oceanicos:test', grantedBy: 'bob', revoked: true },
          ],
        })
      )
    );

    expect(exitCode).toBe(0);
    expect(out.join('')).toContain('GRANTS        1 active / 2 total');
    expect(out.join('')).toContain('g2 subject=carol scope=oceanicos:test by=bob revoked=true');
  });

  it('exits zero only when the API authorizes the request', async () => {
    const denied = await run(['authorize', '--subject', 'alice', '--scope', 'oceanicos:test'], async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ subject: 'alice', scope: 'oceanicos:test' });
      return new Response(
        JSON.stringify({
          success: true,
          authorization: {
            authorized: false,
            authorityVerified: false,
            policySatisfied: false,
            reason: 'no grant covers this scope',
            evaluatedAt: '2026-10-30T00:00:00.000Z',
          },
        })
      );
    });

    expect(denied).toBe(1);
    expect(out.join('')).toContain('AUTHORIZED    false');
    expect(out.join('')).toContain('REASON        no grant covers this scope');
  });
});
