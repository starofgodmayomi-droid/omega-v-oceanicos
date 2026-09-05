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
        name: 'sdk-mini-rule',
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
});
