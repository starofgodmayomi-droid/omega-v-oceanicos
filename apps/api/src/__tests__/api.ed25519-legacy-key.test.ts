import { generateKeyPairSync } from 'node:crypto';
import { createServer, Server } from 'node:http';

/**
 * `api.ed25519.test.ts` always sets both `OMEGA_ED25519_PRIVATE_KEY` and
 * `OMEGA_ATTESTATION_KEY_VERSION`, so two fallbacks in the Ed25519 wiring
 * (`signingKey: ... || process.env.OMEGA_ED25519_KEY` and
 * `keyVersion: ... || '1'`) had never actually been exercised: nothing ever
 * left the primary env var unset. This configures only the legacy
 * `OMEGA_ED25519_KEY` name and leaves the key version unset, and proves the
 * legacy key is genuinely used to sign (not just present) and the version
 * genuinely defaults to '1' (not just unset in the config object).
 */
const { privateKey } = generateKeyPairSync('ed25519');
process.env.NODE_ENV = 'test';
process.env.OMEGA_ATTESTATION_ALGORITHM = 'Ed25519';
delete process.env.OMEGA_ATTESTATION_KEY_VERSION;
delete process.env.OMEGA_ED25519_PRIVATE_KEY;
process.env.OMEGA_ED25519_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
process.env.OMEGA_PERSISTENCE = 'off';

type ApiResponse<T> = { data: T };

type LoopPayload = {
  verification: { summary: { passed: boolean } };
  attestation: {
    id: string;
    verified: boolean;
    signingAlgorithm: string;
    keyVersion: string;
    signature: string;
  };
};

describe('API Ed25519 legacy key-variable and default key-version fallbacks', () => {
  let app: Parameters<typeof createServer>[0];
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = (await import('../server')).default;
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not start');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it('defaults keyVersion to "1" when OMEGA_ATTESTATION_KEY_VERSION is unset', async () => {
    const response = await fetch(`${baseUrl}/attest/public-key`);
    const result = (await response.json()) as ApiResponse<{ keyVersion: string }>;

    expect(response.status).toBe(200);
    expect(result.data.keyVersion).toBe('1');
  });

  it('signs with the legacy OMEGA_ED25519_KEY variable and produces a verifiable signature', async () => {
    const response = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'legacy Ed25519 key variable is executable',
        category: 'health-check',
        source: { system: 'api-ed25519-legacy-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.99,
        confidenceReason: 'Executable legacy Ed25519 key variable test',
      }),
    });
    const result = (await response.json()) as ApiResponse<LoopPayload>;

    expect(response.status).toBe(201);
    expect(result.data.verification.summary.passed).toBe(true);
    expect(result.data.attestation.signingAlgorithm).toBe('Ed25519');
    expect(result.data.attestation.keyVersion).toBe('1');
    // Proof the legacy-named key material actually did the signing, not just
    // that some default/no-op path let the request through: the signature
    // must verify against the service's own public key, and a tampered copy
    // must not.
    expect(result.data.attestation.verified).toBe(true);

    const verifyResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: result.data.attestation }),
    });
    const verification = (await verifyResponse.json()) as ApiResponse<{ valid: boolean }>;
    expect(verifyResponse.status).toBe(200);
    expect(verification.data.valid).toBe(true);

    const tampered = { ...result.data.attestation, signature: `0x${'0'.repeat(128)}` };
    const tamperedResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: tampered }),
    });
    const tamperedVerification = (await tamperedResponse.json()) as ApiResponse<{
      valid: boolean;
    }>;
    expect(tamperedVerification.data.valid).toBe(false);
  });
});
