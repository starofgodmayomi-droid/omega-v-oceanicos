import { run } from '../index';

/**
 * `operatingSystem()` (the `os` command, index.ts:350-382) had exactly one
 * existing test — a single all-fields-present happy path — leaving every
 * failure and fallback branch unexercised:
 *
 *  - the non-ok-response and missing-`data` branches on line 369 (every
 *    sibling command like `health`/`status`/`runs`/`jobs` has both cases
 *    covered; `os` had neither),
 *  - the `body.message ?? 'unknown error'` fallback on line 371,
 *  - every `?? fallback` on lines 376-378 for a response that is well-formed
 *    but omits `state`/`tasks`/`events`/`snapshotVersion`/`limits` (a
 *    legitimate degraded/legacy payload shape),
 *  - the four capability ternaries on line 379, whose 'UNKNOWN' side never
 *    printed because the one existing fixture always supplied all four
 *    capability fields, and
 *  - the fact that `operatingSystem`, unlike every other command in this
 *    file, has no try/catch around its fetch/JSON-parse: a transport
 *    failure propagates as a rejected promise out of `run()` rather than a
 *    clean exit-1 message, which is exactly the asymmetry an operator
 *    running `omega os` against a flaky backend would hit.
 */
describe('omega os CLI', () => {
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

  it('exits 1 and prints the API message when the /os endpoint returns a non-ok status with a message', async () => {
    const exitCode = await run(
      ['os'],
      async () => new Response(JSON.stringify({ message: 'os module disabled' }), { status: 503 })
    );

    expect(exitCode).toBe(1);
    expect(err.join('')).toBe('OS snapshot unavailable (503): os module disabled\n');
    expect(out.join('')).toBe('');
  });

  it('exits 1 and prints "unknown error" when the /os endpoint returns a non-ok status with no message field', async () => {
    const exitCode = await run(
      ['os'],
      async () => new Response(JSON.stringify({}), { status: 500 })
    );

    expect(exitCode).toBe(1);
    expect(err.join('')).toBe('OS snapshot unavailable (500): unknown error\n');
  });

  it('exits 1 when the response is 200 but the body has no data field at all', async () => {
    // response.ok is true, but there is no `data` key — a distinct failure
    // mode from `data` being present with fields missing, and one that
    // must still fail closed rather than crash rendering `body.data.*`.
    const exitCode = await run(
      ['os'],
      async () => new Response(JSON.stringify({ timestamp: '2026-08-16T00:00:00.000Z' }))
    );

    expect(exitCode).toBe(1);
    expect(err.join('')).toContain('OS snapshot unavailable (200): unknown error');
  });

  it('renders unknown/zeroed placeholders when a successful response omits state, tasks, events, snapshotVersion, and limits', async () => {
    const exitCode = await run(['os'], async () => new Response(JSON.stringify({ data: {} })));

    expect(exitCode).toBe(0);
    const text = out.join('');
    expect(text).toContain('OS            state=unknown tasks=0 events=0');
    expect(text).toContain('SCHEMA UNKNOWN');
    expect(text).toContain('LIMITS maxTasks=UNKNOWN maxEvents=UNKNOWN');
  });

  it('renders CAPABILITIES as UNKNOWN when the response omits capabilities entirely, distinct from an explicitly reported false/true', async () => {
    const exitCode = await run(
      ['os'],
      async () => new Response(JSON.stringify({ data: { state: 'ready', tasks: [], events: [] } }))
    );

    expect(exitCode).toBe(0);
    expect(out.join('')).toContain(
      'CAPABILITIES shell=UNKNOWN remote=UNKNOWN credentials=UNKNOWN human_gate=UNKNOWN'
    );
  });

  it('renders CAPABILITIES as UNKNOWN when capability booleans are the "wrong" polarity (true where DISABLED needs false, false where REQUIRED needs true)', async () => {
    const exitCode = await run(
      ['os'],
      async () =>
        new Response(
          JSON.stringify({
            data: {
              capabilities: {
                shellExecution: true,
                remoteMutation: true,
                credentialHandling: true,
                humanAuthorizationRequired: false,
              },
            },
          })
        )
    );

    expect(exitCode).toBe(0);
    // shellExecution/remoteMutation/credentialHandling only read DISABLED
    // for an explicit `false`; humanAuthorizationRequired only reads
    // REQUIRED for an explicit `true`. Every other value, including the
    // "opposite" boolean, must read UNKNOWN rather than silently
    // asserting a capability posture the server never reported.
    expect(out.join('')).toContain(
      'CAPABILITIES shell=UNKNOWN remote=UNKNOWN credentials=UNKNOWN human_gate=UNKNOWN'
    );
  });

  it('propagates a transport failure as a rejected promise instead of failing closed with a printed message, unlike every sibling command', async () => {
    const refuse = async (): Promise<Response> => {
      throw new Error('ECONNREFUSED');
    };

    // Every other data-fetching command in this file (health, status, runs,
    // jobs, policy, verify, rules, revocations, export, audit, scene,
    // revoke, acknowledge, reencrypt) wraps its fetch in try/catch and
    // resolves with exit code 1 plus a "<X> unavailable: <reason>" message.
    // `operatingSystem` has no such guard, and `cli.ts` calls
    // `run(...).then(...)` with no `.catch`, so this rejection is exactly
    // what would surface as an unhandled promise rejection in the real
    // binary rather than a clean CLI error. This test documents that real,
    // currently-uncovered asymmetry rather than asserting it is desirable.
    await expect(run(['os'], refuse)).rejects.toThrow('ECONNREFUSED');
    expect(err.join('')).toBe('');
    expect(out.join('')).toBe('');
  });
});
