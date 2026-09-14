import { run } from '../index';

/**
 * Five branches in index.ts share a pattern: they read an optional field off
 * a parsed API response and fall back to a generic placeholder ('unknown',
 * 'unknown error') when the field is missing, or they rely on a default
 * parameter never actually taking effect. Every existing test supplies the
 * "happy" value for these fields, or always passes an explicit `fetchImpl`,
 * so the fallback/default side of each branch had never run:
 *
 *  - status(): `'data' in stateBody ? stateBody.data : undefined` (index.ts:363),
 *    which then feeds `stateData?.readiness ?? 'unknown'` and
 *    `stateData?.trustBasis?.serviceReadiness ?? 'unknown'` (index.ts:364-365).
 *    `status()`'s ok-check only requires `!stateResponse.ok` to be false —
 *    it never checks that the `/state` body actually contains `data`, unlike
 *    the sibling check it does for the observability body on the same line.
 *    Every existing `/state` fixture includes `data`, so a 200 response
 *    whose body is missing that field (a legacy or truncated payload) took
 *    an untested path: `stateData` silently becomes `undefined` instead of
 *    throwing, and the state line prints 'unknown' rather than crashing.
 *  - policy(): `body.message ?? 'unknown error'` (index.ts:483) — every
 *    non-ok policy fixture includes a `message`.
 *  - verify(): `body.message ?? 'unknown error'` (index.ts:531) — same
 *    shape, the `verify` command's own error path.
 *  - revocations(): `body.meta?.integrity ?? 'unknown'` (index.ts:619) —
 *    every revocations fixture includes `meta`, but `meta` is typed
 *    optional; a backend that has not computed a digest yet omits it.
 *  - run(): `fetchImpl: FetchLike = globalThis.fetch` (index.ts:890) — every
 *    call site in the suite passes a stub explicitly, so the CLI's actual
 *    default (the real global fetch) was never the thing exercised.
 *
 * Each test below exercises the missing side directly: a fixture that is
 * well-formed except for the one optional field, so the assertion is on the
 * CLI's rendered fallback text and (for status) its exit code, not merely on
 * the function returning without throwing.
 */
describe('CLI response fallbacks for missing optional fields', () => {
  const originalWrite = process.stdout.write;
  const originalError = process.stderr.write;

  afterEach(() => {
    process.stdout.write = originalWrite;
    process.stderr.write = originalError;
  });

  it('reports state readiness as unknown, and fails closed, when a 200 /state response has no data field', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['status', '--url', 'http://api.test/'], async (url) => {
      if (url.endsWith('/state')) {
        // response.ok is true, but the body has no `data` key at all —
        // distinct from `data` being present with fields missing.
        return new Response(JSON.stringify({ timestamp: '2026-08-16T00:00:00.000Z' }));
      }
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

    // Not knowing readiness is not the same as being ready: the CLI must
    // not report success just because it could not determine the state.
    expect(exitCode).toBe(1);
    expect(output.join('')).toContain('STATE         unknown service=unknown');
  });

  it('reports "unknown error" for a non-ok policy response that omits a message', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    const exitCode = await run(
      ['policy'],
      async () => new Response(JSON.stringify({}), { status: 403 })
    );

    expect(exitCode).toBe(1);
    expect(errors.join('')).toContain('Policy unavailable (403): unknown error');
  });

  it('reports "unknown error" for a non-ok verify response that omits a message', async () => {
    const errors: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errors.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;

    const exitCode = await run(
      ['verify', '--attestation-json', '{"id":"att-1"}'],
      async () => new Response(JSON.stringify({}), { status: 400 })
    );

    expect(exitCode).toBe(1);
    expect(errors.join('')).toContain('Verification failed (400): unknown error');
  });

  it('reports revocation integrity as unknown when the response omits meta', async () => {
    const output: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    const exitCode = await run(['revocations'], async () => {
      // `meta` is genuinely optional on the wire — a backend that has not
      // computed an integrity digest yet, or an older server version,
      // returns the revocation list without it.
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
    expect(output.join('')).toContain('REVOCATIONS   1 integrity=unknown');
  });

  it('falls back to the real global fetch when run() is called without an explicit fetchImpl', async () => {
    const originalFetch = globalThis.fetch;
    const calledUrls: string[] = [];
    globalThis.fetch = (async (input: string) => {
      calledUrls.push(String(input));
      return new Response(
        JSON.stringify({ data: { attestationAlgorithm: 'HMAC-SHA256', revocationEnabled: true } })
      );
    }) as typeof globalThis.fetch;

    try {
      // Route through a command that must call fetchImpl (unlike '--help',
      // which returns before ever touching it), so a passing test proves
      // `run()` actually wired up the real global fetch as its default
      // rather than merely tolerating the missing argument.
      const exitCode = await run(['policy', '--url', 'http://api.test/']);
      expect(calledUrls).toEqual(['http://api.test/attest/policy']);
      expect(exitCode).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
