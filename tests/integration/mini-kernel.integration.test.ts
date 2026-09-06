import { createServer, Server } from 'node:http';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { Remember } from '@omega-v/remember';
import { MiniKernel, OperatingSystemKernel, OmegaTotalCompressor } from '@omega-v/mini';
import { OceanicosClient } from '@omega-v/sdk';
import { OceanicosCLI } from '@omega-v/cli';
import { VerificationRule } from '@omega-v/types';

describe('Ω∞v Oceanicos Integration — Foundational MINI Kernel & Totality', () => {
  const healthRule: VerificationRule = {
    name: 'response-time-threshold',
    version: '1.0.0',
    appliesTo: ['mini-integration'],
    definition: 'responseTime < 100',
    description: 'Verify latency is bounded under 100ms',
    createdAt: new Date().toISOString(),
    active: true,
  };

  const statusRule: VerificationRule = {
    name: 'status-code-check',
    version: '1.0.0',
    appliesTo: ['mini-integration'],
    definition: 'statusCode == 200',
    description: 'Verify status is 200 OK',
    createdAt: new Date().toISOString(),
    active: true,
  };

  describe('MiniKernel Composition Layer', () => {
    it('executes a full cycle delegating cleanly across Observer, Verification, and Remember', () => {
      const observer = new Observer();
      const verification = new VerificationEngine();
      verification.registerRule(healthRule);
      verification.registerRule(statusRule);
      const remember = new Remember();

      const kernel = new MiniKernel({
        observer,
        verificationEngine: verification,
        memory: remember,
      });

      const cycle = kernel.cycle({
        claim: 'Production gateway latency nominal',
        category: 'mini-integration',
        source: {
          system: 'integration-gateway',
          version: '1.0.0',
          environment: 'production',
        },
        metadata: { responseTime: 28, statusCode: 200 },
        confidence: 0.99,
        confidenceReason: 'Verified telemetry burst',
      });

      expect(cycle.passed).toBe(true);
      expect(cycle.observation.status).toBe('normalized');
      expect(cycle.verification.summary.rulesPassed).toBe(2);
      expect(cycle.memory.verified).toBe(true);

      // Verify hash chain
      expect(kernel.verifyMemoryIntegrity()).toBe(true);
      expect(kernel.getMemorySize()).toBe(3); // OBS + VER + MEMORY

      // Verify recall
      const recalled = kernel.recallMemory(cycle.memory.id);
      expect(recalled).toBeDefined();
      expect(recalled!.id).toBe(cycle.memory.id);
    });

    it('rejects unverified claims while preserving audit memory and unbroken chain', () => {
      const kernel = new MiniKernel({ rules: [healthRule] });

      const cycle = kernel.cycle({
        claim: 'Degraded latency claim',
        category: 'mini-integration',
        metadata: { responseTime: 250 }, // exceeds 100ms
      });

      expect(cycle.passed).toBe(false);
      expect(cycle.verification.summary.rulesFailed).toBe(1);
      expect(cycle.memory.verified).toBe(false);
      expect(kernel.verifyMemoryIntegrity()).toBe(true);
      expect(kernel.getMemorySize()).toBe(3);
    });

    it('preserves dissent and cryptographically links entries in MiniCycleResult', () => {
      const kernel = new MiniKernel({ rules: [healthRule, statusRule] });

      const cycle = kernel.cycle({
        claim: 'Mixed service telemetry',
        category: 'mini-integration',
        metadata: { responseTime: 30, statusCode: 500 }, // health passes (30 < 100), status fails (500 != 200)
      });

      expect(cycle.passed).toBe(false);
      expect(cycle.verification.summary.rulesPassed).toBe(1);
      expect(cycle.verification.summary.rulesFailed).toBe(1);
      expect(cycle.verification.dissent).toBeDefined();
      expect(cycle.verification.dissent!.status).toBe('OPEN');
      expect(cycle.verification.dissent!.interpretations).toHaveLength(2);

      // Verify entries in result
      expect(cycle.entries).toBeDefined();
      expect(cycle.entries).toHaveLength(3);
      expect(cycle.entries![1].previousHash).toBe(cycle.entries![0].hash);
      expect(cycle.entries![2].previousHash).toBe(cycle.entries![1].hash);
      expect(kernel.verifyMemoryIntegrity()).toBe(true);
    });
  });

  describe('OperatingSystemKernel Control Plane', () => {
    it('manages deterministic state lifecycle and rejects out-of-order admissions', () => {
      const kernel = new MiniKernel({ rules: [healthRule] });
      const os = new OperatingSystemKernel(kernel);

      expect(os.getState()).toBe('COLD');
      expect(() => os.admit({ claim: 'Premature' })).toThrow(/Cannot admit/);

      os.boot();
      expect(os.getState()).toBe('BOOTED');

      const r1 = os.admit({
        claim: 'First admitted claim',
        category: 'mini-integration',
        metadata: { responseTime: 20 },
      });
      expect(r1.passed).toBe(true);
      expect(os.getState()).toBe('BOOTED');

      const r2 = os.complete({
        claim: 'Second completed claim',
        category: 'mini-integration',
        metadata: { responseTime: 30 },
      });
      expect(r2.passed).toBe(true);

      const snapshot = os.snapshot();
      expect(snapshot.state).toBe('BOOTED');
      expect(snapshot.totalCycles).toBe(2);
      expect(snapshot.passedCycles).toBe(2);
      expect(snapshot.memoryIntegrity).toBe(true);

      os.stop();
      expect(os.getState()).toBe('STOPPED');
      expect(() => os.admit({ claim: 'After stop' })).toThrow(/Cannot admit/);
    });
  });

  describe('OmegaTotalCompressor Non-Negotiable Gates', () => {
    it('locks totality manifest with state root Ø and stewardship axiom on verified cycle', () => {
      const kernel = new MiniKernel({ rules: [healthRule, statusRule] });
      const compressor = new OmegaTotalCompressor(kernel);

      const manifest = compressor.lockTotalityIntoNow({
        claim: 'Universal verified equilibrium',
        category: 'mini-integration',
        metadata: { responseTime: 15, statusCode: 200 },
      });

      expect(manifest.stateRoot).toBe('Ø');
      expect(manifest.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
      expect(manifest.cycleResult.passed).toBe(true);
      expect(manifest.cycleResult.verification.summary.rulesPassed).toBe(2);
      expect(manifest.memoryIntegrityValid).toBe(true);
      expect(manifest.lockedAt).toBeDefined();
    });

    it('fails closed when verification fails or no rules applied', () => {
      const kernel = new MiniKernel({ rules: [healthRule] });
      const compressor = new OmegaTotalCompressor(kernel);

      expect(() =>
        compressor.lockTotalityIntoNow({
          claim: 'Violation claim',
          category: 'mini-integration',
          metadata: { responseTime: 500 },
        })
      ).toThrow(/verification did not pass/);
    });
  });

  describe('End-to-End SDK & CLI Integration', () => {
    it('executes MINI cycle and Totality Lock through OceanicosClient', () => {
      const client = new OceanicosClient();
      client.registerRule({
        name: 'response-time-threshold',
        version: '1.0.0',
        appliesTo: ['e2e-check'],
        definition: 'responseTime < 50',
        description: 'E2E latency gate',
        createdAt: new Date().toISOString(),
        active: true,
      });

      const miniRes = client.runMiniCycle({
        claim: 'SDK integrated mini cycle',
        category: 'e2e-check',
        metadata: { responseTime: 20 },
      });

      expect(miniRes.passed).toBe(true);
      expect(client.getRemember().verifyIntegrity()).toBe(true);

      const totalManifest = client.lockTotality({
        claim: 'SDK totality lock',
        category: 'e2e-check',
        metadata: { responseTime: 18 },
      });

      expect(totalManifest.stateRoot).toBe('Ø');
      expect(totalManifest.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
      expect(totalManifest.memoryIntegrityValid).toBe(true);
    });

    it('executes omega-v mini and omega-v total via CLI', async () => {
      const cli = new OceanicosCLI();

      const miniCli = await cli.run(['mini', 'Integration CLI mini test']);
      expect(miniCli.success).toBe(true);
      expect(miniCli.message).toContain('MINI Cycle: PASSED');

      const totalCli = await cli.run(['total', 'Integration CLI totality test']);
      expect(totalCli.success).toBe(true);
      expect(totalCli.message).toContain('Omega Total Manifest Locked');
      expect(totalCli.message).toContain('Root: Ø');
    });
  });

  describe('REST API Server MINI & Totality Endpoints', () => {
    let server: Server;
    let baseUrl: string;

    beforeAll(async () => {
      process.env.OMEGA_SIGNING_KEY = 'mini-api-integration-key';
      jest.resetModules();
      const module = await import('../../apps/api/src/index');
      const app = module.default as { (...args: unknown[]): unknown };

      server = createServer(app as never);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server did not start');
      baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
      delete process.env.OMEGA_SIGNING_KEY;
    });

    it('POST /mini/cycle executes cycle and returns data with verification and memory', async () => {
      const res = await fetch(`${baseUrl}/mini/cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: 'API mini cycle check',
          category: 'health-check',
          metadata: { statusCode: 200, responseTime: 25 },
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: { passed: boolean; memory: { id: string } };
      };
      expect(json.data.passed).toBe(true);
      expect(json.data.memory.id).toBeDefined();
    });

    it('POST /mini/cycle rejects invalid input with 400', async () => {
      const res = await fetch(`${baseUrl}/mini/cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: '' }),
      });

      expect(res.status).toBe(400);
    });

    it('POST /mini/total locks totality into now', async () => {
      const res = await fetch(`${baseUrl}/mini/total`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: 'API totality lock check',
          category: 'health-check',
          metadata: { statusCode: 200, responseTime: 10 },
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: { stateRoot: string; stewardshipAxiom: string };
      };
      expect(json.data.stateRoot).toBe('Ø');
      expect(json.data.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
    });

    it('GET /mini/integrity verifies memory integrity', async () => {
      const res = await fetch(`${baseUrl}/mini/integrity`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: { intact: boolean; size: number } };
      expect(json.data.intact).toBe(true);
      expect(json.data.size).toBeGreaterThan(0);
    });

    it('POST /os/admit admits task and cycle into OperatingSystemKernel', async () => {
      // Admit task
      const taskRes = await fetch(`${baseUrl}/os/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'observe',
          input: { key: 'val' },
          requestedBy: 'operator-1',
        }),
      });
      expect(taskRes.status).toBe(200);
      const taskJson = (await taskRes.json()) as { data: { id: string; kind: string } };
      expect(taskJson.data.kind).toBe('observe');

      // Admit cycle
      const cycleRes = await fetch(`${baseUrl}/os/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle: {
            claim: 'Admitted cycle claim',
            category: 'health-check',
            metadata: { statusCode: 200, responseTime: 30 },
          },
        }),
      });
      expect(cycleRes.status).toBe(200);
      const cycleJson = (await cycleRes.json()) as { data: { passed: boolean } };
      expect(cycleJson.data.passed).toBe(true);
    });
  });
});
