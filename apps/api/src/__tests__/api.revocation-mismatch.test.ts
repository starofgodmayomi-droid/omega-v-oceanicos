import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, Server } from 'node:http';

/**
 * A revocation registry integrity mismatch means the persisted digest of the
 * revocation list no longer matches the list itself — the kind of tamper or
 * corruption invariant 4 exists to catch. `/attest/revoke` and `/act` both
 * have a dedicated branch that fails closed (503) rather than trusting a
 * revocation registry it cannot authenticate, but neither branch had ever
 * run under test: nothing in the suite ever produced a genuinely mismatched
 * registry to exercise it against. This does, by writing a snapshot whose
 * `revocationIntegrity` digest deliberately does not match its own
 * `revocations` array before the server module is loaded.
 */
describe('API revocation registry integrity mismatch', () => {
  let app: Parameters<typeof createServer>[0];
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'omega-revocation-mismatch-'));
    const storePath = join(dir, 'runtime.json');
    writeFileSync(
      storePath,
      JSON.stringify({
        events: [],
        runs: [],
        actions: [],
        learnings: [],
        recompilations: [],
        revocations: [
          {
            id: 'rev-seed-1',
            attestationId: 'att-seed-1',
            reason: 'seeded for the mismatch fixture',
            revokedBy: 'fixture',
            revokedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        // Deliberately not the digest of the revocations array above.
        revocationIntegrity:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      })
    );

    process.env.NODE_ENV = 'test';
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_RUNTIME_STORE_PATH = storePath;
    process.env.OMEGA_EVENT_LOG_PATH = join(dir, 'runtime.log.jsonl');
    delete process.env.OMEGA_PERSISTENCE_KEY;
    delete process.env.OMEGA_ADMIN_TOKEN;
    delete process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;

    app = (await import('../server')).default;
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  const post = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('reports the mismatch in the public policy contract', async () => {
    const response = await fetch(`${baseUrl}/attest/policy`);
    const body = (await response.json()) as { data: { revocationIntegrity: string } };

    expect(response.status).toBe(200);
    expect(body.data.revocationIntegrity).toBe('mismatch');
  });

  it('refuses to revoke an attestation while the registry is unverifiable', async () => {
    const response = await post('/attest/revoke', {
      attestationId: 'att-seed-1',
      reason: 'attempted revocation against a mismatched registry',
    });
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(503);
    expect(body.code).toBe('REVOCATION_REGISTRY_INTEGRITY');
  });

  it('refuses to authorize an action while the registry is unverifiable', async () => {
    const response = await post('/act', {
      attestation: { id: 'att-seed-1', status: 'signed' },
    });
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(503);
    expect(body.code).toBe('REVOCATION_REGISTRY_INTEGRITY');
  });
});
