import { createServer, Server } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type ApiApp = { app: import('express').Express };
type ApiResponse<T> = { data: T };

/**
 * `GET /state`'s `trustBasis.attestationValidity` is
 * `attestationService.verify(latestRun.attestation) ? 1 : 0`. Every existing
 * test that reaches `/state` with a completed run leaves that attestation
 * genuinely valid, so the `0` branch -- an invalid/tampered attestation on
 * the *latest* completed run -- had never been observed.
 *
 * A live process cannot be made to sign an invalid attestation (the signing
 * path always produces a valid one), so this records one genuine, correctly
 * signed run through a first boot, flips a single character of its
 * persisted signature on disk (exactly as an external tamper or bit-rot
 * would), and boots a second process against that store. `completedRuns` is
 * seeded straight from the persisted snapshot at boot, so the second
 * process's "latest run" now carries a real, structurally valid attestation
 * whose signature simply does not match -- the same failure mode
 * `attestationService.verify` is meant to catch.
 */
describe('GET /state attestation validity on a tampered latest run', () => {
  let dir: string;
  let storePath: string;
  let logPath: string;

  const boot = async (): Promise<{ server: Server; baseUrl: string }> => {
    jest.resetModules();
    const isolated = require('../index') as ApiApp;
    const server = createServer(isolated.app);
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    return { server, baseUrl: `http://127.0.0.1:${address.port}` };
  };

  const close = (server: Server): Promise<void> =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'omega-api-attestation-tamper-'));
    storePath = join(dir, 'runtime.json');
    logPath = join(dir, 'runtime.log.jsonl');
    process.env.NODE_ENV = 'test';
    process.env.OMEGA_PERSISTENCE = 'on';
    process.env.OMEGA_RUNTIME_STORE_PATH = storePath;
    process.env.OMEGA_EVENT_LOG_PATH = logPath;
    delete process.env.OMEGA_ATTESTATION_ALGORITHM;
    delete process.env.OMEGA_ATTESTATION_KEY_VERSION;

    // First boot: record one genuinely-signed, genuinely-verified run and
    // let it persist to storePath.
    const first = await boot();
    const loopResponse = await fetch(`${first.baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'attestation tamper fixture',
        category: 'health-check',
        source: { system: 'attestation-tamper-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { statusCode: 200, responseTime: 10 },
        confidence: 0.95,
        confidenceReason: 'attestation tamper fixture',
      }),
    });
    expect(loopResponse.status).toBe(201);
    const loopBody = (await loopResponse.json()) as ApiResponse<{
      verification: { summary: { passed: boolean } };
      attestation: { verified: boolean };
    }>;
    expect(loopBody.data.verification.summary.passed).toBe(true);
    expect(loopBody.data.attestation.verified).toBe(true);
    await close(first.server);

    // Flip one hex digit of the persisted signature -- same length, same
    // shape, genuinely wrong. Everything else about the run (observation,
    // verification, keyVersion, algorithm, status) is untouched.
    const persisted = JSON.parse(readFileSync(storePath, 'utf8')) as {
      runs: Array<{ attestation: { signature: string } }>;
    };
    expect(persisted.runs).toHaveLength(1);
    const original = persisted.runs[0].attestation.signature;
    const hexStart = original.startsWith('0x') ? 2 : 0;
    const flippedDigit = original[hexStart] === '0' ? '1' : '0';
    const tampered = original.slice(0, hexStart) + flippedDigit + original.slice(hexStart + 1);
    expect(tampered).not.toBe(original);
    persisted.runs[0].attestation.signature = tampered;
    writeFileSync(storePath, JSON.stringify(persisted, null, 2));
  });

  afterAll(() => {
    delete process.env.OMEGA_PERSISTENCE;
    delete process.env.OMEGA_RUNTIME_STORE_PATH;
    delete process.env.OMEGA_EVENT_LOG_PATH;
    rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('reports attestationValidity 0 for a tampered latest-run signature, without marking verification or readiness as failed', async () => {
    const second = await boot();
    try {
      const stateResponse = await fetch(`${second.baseUrl}/state`);
      const state = (await stateResponse.json()) as ApiResponse<{
        readiness: 'ready' | 'degraded';
        trustBasis: {
          verificationCoverage: number | null;
          attestationValidity: number | null;
          serviceReadiness: number;
        };
      }>;

      expect(stateResponse.status).toBe(200);
      expect(state.data.trustBasis.attestationValidity).toBe(0);
      // The tamper only touched the attestation signature: the underlying
      // verification result is untouched, and overall service readiness is
      // a distinct signal that must not be dragged down by this.
      expect(state.data.trustBasis.verificationCoverage).toBe(1);
      expect(state.data.readiness).toBe('ready');
      expect(state.data.trustBasis.serviceReadiness).toBe(1);

      // Cross-check against /attest/verify directly with the same tampered
      // attestation, confirming /state's 0 reflects a real verification
      // failure rather than a bug local to the /state handler.
      const persisted = JSON.parse(readFileSync(storePath, 'utf8')) as {
        runs: Array<{ attestation: unknown }>;
      };
      const verifyResponse = await fetch(`${second.baseUrl}/attest/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attestation: persisted.runs[0].attestation }),
      });
      const verification = (await verifyResponse.json()) as ApiResponse<{ valid: boolean }>;
      expect(verification.data.valid).toBe(false);
    } finally {
      await close(second.server);
    }
  });
});
