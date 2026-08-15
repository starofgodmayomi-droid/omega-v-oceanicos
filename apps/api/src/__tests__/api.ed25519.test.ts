import { generateKeyPairSync } from 'node:crypto';
import { createServer, Server } from 'node:http';

const { privateKey } = generateKeyPairSync('ed25519');
process.env.NODE_ENV = 'test';
process.env.OMEGA_ATTESTATION_ALGORITHM = 'Ed25519';
process.env.OMEGA_ATTESTATION_KEY_VERSION = 'test-ed25519-v1';
process.env.OMEGA_ED25519_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
process.env.OMEGA_PERSISTENCE = 'off';

const { default: app } = await import('../index');

type ApiResponse<T> = { data: T };

type LoopPayload = {
  observation: { id: string };
  verification: { summary: { passed: boolean } };
  attestation: {
    id: string;
    verified: boolean;
    signingAlgorithm: string;
    keyVersion: string;
    signingKey: string;
    verifyingPublicKey?: string;
    signature: string;
  };
};

describe('API Ed25519 integration', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
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

  it('signs, verifies, and preserves Ed25519 provenance through the full API loop', async () => {
    const response = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'ed25519-api-1' },
      body: JSON.stringify({
        claim: 'API Ed25519 integration is executable',
        category: 'health-check',
        source: { system: 'api-ed25519-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.99,
        confidenceReason: 'Executable Ed25519 API integration test',
      }),
    });
    const result = (await response.json()) as ApiResponse<LoopPayload>;

    expect(response.status).toBe(201);
    expect(result.data.verification.summary.passed).toBe(true);
    expect(result.data.attestation.verified).toBe(true);
    expect(result.data.attestation.signingAlgorithm).toBe('Ed25519');
    expect(result.data.attestation.keyVersion).toBe('test-ed25519-v1');
    expect(result.data.attestation.signature).toMatch(/^0x[0-9a-f]+$/);
    expect(result.data.attestation.verifyingPublicKey).toContain('BEGIN PUBLIC KEY');
    expect(result.data.attestation.signingKey).toMatch(/^sha256:/);
    expect(JSON.stringify(result.data.attestation)).not.toContain(process.env.OMEGA_ED25519_PRIVATE_KEY!);

    const verificationResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: result.data.attestation }),
    });
    const verification = (await verificationResponse.json()) as ApiResponse<{ valid: boolean }>;

    expect(verificationResponse.status).toBe(200);
    expect(verification.data.valid).toBe(true);
  });

  it('rejects a tampered Ed25519 attestation at the API boundary', async () => {
    const response = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'tamper test',
        category: 'health-check',
        source: { system: 'api-ed25519-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
      }),
    });
    const result = (await response.json()) as ApiResponse<LoopPayload>;
    const tampered = {
      ...result.data.attestation,
      confidence: result.data.attestation.verified ? 0.01 : 0.99,
    };

    const verificationResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: tampered }),
    });
    const verification = (await verificationResponse.json()) as ApiResponse<{ valid: boolean }>;

    expect(verificationResponse.status).toBe(200);
    expect(verification.data.valid).toBe(false);
  });
});
