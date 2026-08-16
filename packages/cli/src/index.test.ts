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

    const exitCode = await run(['events', '--url', 'http://api.test/', '--limit', '1'], async (url) => {
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
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('EVENTS        1/2');
    expect(output.join('')).toContain('event-1');
    expect(output.join('')).not.toContain('event-2');
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
