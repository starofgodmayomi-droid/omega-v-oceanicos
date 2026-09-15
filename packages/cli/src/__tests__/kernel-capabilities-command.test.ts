import { run } from '../index';

describe('omega kernel-capabilities CLI', () => {
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

  it('renders the bounded capability boundary and forwards the read token', async () => {
    const exitCode = await run(
      ['kernel-capabilities', '--url', 'http://api.test', '--token', 'read-token'],
      async (url, init) => {
        expect(url).toBe('http://api.test/v1/kernel/capabilities');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer read-token');
        return new Response(
          JSON.stringify({
            success: true,
            capability: {
              contract: 'oceanicos-kernel.v1',
              execution: 'local-simulation-only',
              humanAuthorizationRequired: true,
              capabilities: {
                remoteMutation: false,
                arbitraryShellExecution: false,
                credentialHandling: false,
              },
            },
          })
        );
      }
    );

    expect(exitCode).toBe(0);
    expect(out.join('')).toBe(
      'CONTRACT   oceanicos-kernel.v1\n' +
        'EXECUTION  local-simulation-only\n' +
        'REMOTE     DISABLED\n' +
        'SHELL      DISABLED\n' +
        'CREDENTIALS DISABLED\n' +
        'HUMAN_GATE REQUIRED\n'
    );
    expect(err.join('')).toBe('');
  });

  it('fails closed when the capability response is unavailable', async () => {
    const exitCode = await run(
      ['kernel-capabilities'],
      async () => new Response(JSON.stringify({ message: 'kernel unavailable' }), { status: 503 })
    );

    expect(exitCode).toBe(1);
    expect(out.join('')).toBe('');
    expect(err.join('')).toBe('Kernel capabilities unavailable (503): kernel unavailable\n');
  });
});
