import { run } from './index';

/**
 * The CLI's failure paths sat uncovered at 81.32% branches: every catch
 * block, every non-ok response, and the argument parsers that silently
 * fall back when given nonsense.
 *
 * These matter more than the success paths. A CLI that prints a stack
 * trace, or exits 0 when the API refused it, is worse than one that does
 * not run at all — the exit code is what a script or pipeline reads.
 *
 * `run` takes an injected fetch, so none of this touches the network.
 */
describe('omega CLI failure paths', () => {
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

  const refuse = async (): Promise<Response> => {
    throw new Error('ECONNREFUSED');
  };
  const nonOk =
    (status: number, payload: unknown = {}): (() => Promise<Response>) =>
    async () =>
      new Response(JSON.stringify(payload), { status });

  describe('transport failure', () => {
    const commands = ['health', 'status', 'events', 'audit', 'runs', 'revocations', 'policy'];

    it.each(commands)(
      '%s reports the reason and exits 1 when the API is unreachable',
      async (command) => {
        expect(await run([command], refuse)).toBe(1);
        expect(err.join('')).toContain('ECONNREFUSED');
        // A thrown Error must be reported, never re-thrown at the user.
        expect(err.join('')).not.toContain('at Object');
      }
    );

    it('export reports the reason and exits 1', async () => {
      expect(await run(['export'], refuse)).toBe(1);
      expect(err.join('')).toContain('ECONNREFUSED');
    });

    it('verify reports the reason and exits 1', async () => {
      expect(await run(['verify', '--attestation-json', '{"id":"att-1"}'], refuse)).toBe(1);
      expect(err.join('')).toContain('ECONNREFUSED');
    });

    it('reports a non-Error rejection without printing undefined', async () => {
      const rejectString = async (): Promise<Response> => {
        throw 'socket closed';
      };
      expect(await run(['health'], rejectString)).toBe(1);
      expect(err.join('')).toContain('socket closed');
      expect(err.join('')).not.toContain('undefined');
    });
  });

  describe('refused responses', () => {
    it('health exits 1 and surfaces the server message', async () => {
      expect(await run(['health'], nonOk(503, { message: 'not ready' }))).toBe(1);
      expect(err.join('')).toContain('Health unavailable (503)');
      expect(err.join('')).toContain('not ready');
    });

    it('health says unknown error when the server sends no message', async () => {
      expect(await run(['health'], nonOk(500))).toBe(1);
      expect(err.join('')).toContain('unknown error');
    });

    it('policy exits 1 and surfaces the status', async () => {
      expect(await run(['policy'], nonOk(401, { message: 'unauthorized' }))).toBe(1);
      expect(err.join('')).toContain('Policy unavailable (401)');
      expect(err.join('')).toContain('unauthorized');
    });

    it('runs exits 1 when the payload is not an array', async () => {
      expect(await run(['runs'], nonOk(200, { data: 'not-an-array' }))).toBe(1);
      expect(err.join('')).toContain('Runs unavailable');
    });

    it('revocations exits 1 when the payload is not an array', async () => {
      expect(await run(['revocations'], nonOk(200, { data: { nope: true } }))).toBe(1);
      expect(err.join('')).toContain('Revocations unavailable');
    });

    it('verify exits 1 and surfaces the status', async () => {
      const code = await run(
        ['verify', '--attestation-json', '{"id":"att-1"}'],
        nonOk(422, { message: 'malformed attestation' })
      );
      expect(code).toBe(1);
      expect(err.join('')).toContain('Verification failed (422)');
      expect(err.join('')).toContain('malformed attestation');
    });
  });

  describe('argument handling', () => {
    it('rejects an unknown command with exit 2 and prints the commands', async () => {
      expect(await run(['not-a-command'], refuse)).toBe(2);
      expect(err.join('')).toContain('Unknown command: not-a-command');
      expect(err.join('')).toContain('omega health');
    });

    it('verify without --attestation-json exits 2 rather than calling the API', async () => {
      let called = false;
      const spy = async (): Promise<Response> => {
        called = true;
        return new Response('{}');
      };
      expect(await run(['verify'], spy)).toBe(2);
      expect(called).toBe(false);
      expect(err.join('')).toContain('Usage: omega verify');
    });

    it('verify with malformed JSON exits 2 rather than calling the API', async () => {
      let called = false;
      const spy = async (): Promise<Response> => {
        called = true;
        return new Response('{}');
      };
      expect(await run(['verify', '--attestation-json', '{not json'], spy)).toBe(2);
      expect(called).toBe(false);
      expect(err.join('')).toContain('Invalid JSON');
    });

    it('ignores a --limit with no value, a zero, a negative and a fraction', async () => {
      const three = {
        data: [
          {
            observation: { id: 'o1' },
            verification: { summary: { passed: true } },
            attestation: { verified: true },
          },
          {
            observation: { id: 'o2' },
            verification: { summary: { passed: true } },
            attestation: { verified: true },
          },
          {
            observation: { id: 'o3' },
            verification: { summary: { passed: false } },
            attestation: { verified: false },
          },
        ],
      };

      for (const argv of [
        ['runs', '--limit'],
        ['runs', '--limit', '0'],
        ['runs', '--limit', '-2'],
        ['runs', '--limit', '1.5'],
        ['runs', '--limit', 'abc'],
      ]) {
        out = [];
        expect(await run(argv, nonOk(200, three))).toBe(0);
        // An unusable limit falls back to the whole list rather than
        // silently truncating to nothing.
        expect(out.join('')).toContain('RUNS          3/3');
      }
    });

    it('applies a valid --limit', async () => {
      const three = {
        data: [
          {
            observation: { id: 'o1' },
            verification: { summary: { passed: true } },
            attestation: { verified: true },
          },
          {
            observation: { id: 'o2' },
            verification: { summary: { passed: true } },
            attestation: { verified: true },
          },
          {
            observation: { id: 'o3' },
            verification: { summary: { passed: false } },
            attestation: { verified: false },
          },
        ],
      };
      expect(await run(['runs', '--limit', '2'], nonOk(200, three))).toBe(0);
      expect(out.join('')).toContain('RUNS          2/3');
      expect(out.join('')).not.toContain('o3');
    });

    it('ignores an option flag with no following value', async () => {
      let seen = '';
      const capture = async (url: string): Promise<Response> => {
        seen = url;
        return new Response(JSON.stringify({ data: {} }));
      };
      await run(['policy', '--url'], capture);
      // --url with nothing after it must not produce "undefined" in the URL.
      expect(seen).not.toContain('undefined');
      expect(seen).toContain('/attest/policy');
    });
  });
});
