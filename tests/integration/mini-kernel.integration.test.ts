import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MiniKernel } from '@omega-v/mini';
import { Remember, FileMemoryStore } from '@omega-v/remember';
import { AttestationService } from '@omega-v/attestation';
import { VerificationRule } from '@omega-v/types';

/**
 * MINI Kernel as the primary runtime unit.
 *
 * This test demonstrates Ω∞v MINI running independently:
 *   💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
 *
 * MINI runs without API, Web, or cloud infrastructure.
 * It is the executable definition of the verification loop.
 *
 * Roadmap: Phase 2 completion
 *   - [x] Observe normalizes claims
 *   - [x] Verify produces evidence paths
 *   - [x] Remember stores append-only hash-chained memory
 *   - [x] MiniKernel runs one cycle without API/UI
 *   - [x] MINI is the documented default mental model everywhere (this test)
 *   - [x] Integration tests treat MINI as the primary runtime unit (this test)
 */
describe('MINI kernel: Observe → Verify → Remember', () => {
  let directory: string;
  let memoryPath: string;
  let mini: MiniKernel;
  let signingKey: string;

  // These are the rules the verification engine can actually execute. An
  // earlier version of this suite registered `health-check-passed` and
  // `health-check-degraded`, which the engine has no implementation for —
  // they were reported as passing without ever being evaluated, so the tests
  // below appeared to exercise rules that never ran.
  const responseTimeThreshold: VerificationRule = {
    name: 'response-time-threshold',
    version: '1.0.5',
    appliesTo: ['health-check'],
    definition: 'responseTime < 100',
    description: 'Response time must be below 100ms',
    createdAt: '2026-08-14T00:00:00.000Z',
    active: true,
  };

  const statusCodeCheck: VerificationRule = {
    name: 'status-code-check',
    version: '1.2.0',
    appliesTo: ['health-check'],
    definition: 'statusCode === 200',
    description: 'Status code must be 200',
    createdAt: '2026-08-14T00:00:00.000Z',
    active: true,
  };

  const unimplemented: VerificationRule = {
    name: 'health-check-degraded',
    version: '1.0.0',
    appliesTo: ['degraded-check'],
    definition: 'responseTime >= 100 && responseTime < 500',
    description: 'Declared but not executable by this engine',
    createdAt: '2026-08-14T00:00:00.000Z',
    active: true,
  };

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'omega-mini-'));
    memoryPath = join(directory, 'memory.jsonl');
    signingKey = 'mini-kernel-integration-key-not-for-production';

    mini = new MiniKernel({
      rules: [responseTimeThreshold, statusCodeCheck, unimplemented],
      memory: new Remember(new FileMemoryStore(memoryPath)),
    });
  });

  describe('Step 1: Observe (normalize claims)', () => {
    it('captures and normalizes a health-check claim', () => {
      const result = mini.cycle({
        claim: 'Service X returned HTTP 200',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'successful check',
      });

      expect(result.observation).toBeDefined();
      expect(result.observation.claim).toEqual({
        statement: 'Service X returned HTTP 200',
        category: 'health-check',
      });
      expect(result.observation.metadata).toEqual({
        statusCode: 200,
        responseTime: 45,
      });
      expect(result.observation.confidence).toBe(0.95);
    });
  });

  describe('Step 2: Verify (apply rules, produce evidence)', () => {
    it('produces evidence paths for passing rules', () => {
      const result = mini.cycle({
        claim: 'Service X returned HTTP 200',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'successful check',
      });

      expect(result.verification).toBeDefined();
      expect(result.verification.summary.passed).toBe(true);
      expect(result.verification.summary.rulesApplied).toBe(2);
      expect(result.verification.summary.rulesPassed).toBe(2);
      expect(result.verification.evidencePath).toBeDefined();
      expect(result.verification.evidencePath.length).toBe(2);
      // Every rule counted here was executed, not assumed.
      expect(
        result.verification.evidencePath.every((step) => step.condition !== 'rule-not-executable')
      ).toBe(true);
    });

    it('refuses to pass a rule the engine cannot execute', () => {
      const result = mini.cycle({
        claim: 'Service X is degraded',
        category: 'degraded-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 250 },
        confidence: 0.95,
        confidenceReason: 'declared rule with no implementation',
      });

      // This rule is registered and applies, but the engine has no
      // implementation for it. It must not reach a passing verdict, because
      // a passing verdict is what an attestation signs.
      expect(result.verification.summary.passed).toBe(false);
      expect(result.verification.evidencePath[0].condition).toBe('rule-not-executable');
    });

    it('produces evidence paths for failing rules', () => {
      const result = mini.cycle({
        claim: 'Service degraded',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 500, responseTime: 1200 },
        confidence: 0.85,
        confidenceReason: 'degraded check',
      });

      expect(result.verification).toBeDefined();
      expect(result.verification.summary.passed).toBe(false);
      expect(result.verification.summary.rulesFailed).toBeGreaterThan(0);
    });
  });

  describe('Step 3: Remember (append-only hash-chained memory)', () => {
    it('stores observations in append-only memory', () => {
      const result1 = mini.cycle({
        claim: 'First observation',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 30 },
        confidence: 0.95,
        confidenceReason: 'first check',
      });

      const result2 = mini.cycle({
        claim: 'Second observation',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'second check',
      });

      expect(result1.memory).toBeDefined();
      expect(result2.memory).toBeDefined();

      const reader = new Remember(new FileMemoryStore(memoryPath));
      expect(reader.size()).toBeGreaterThanOrEqual(6); // 3 entries per cycle
      expect(reader.verifyIntegrity()).toBe(true);
    });

    it('maintains hash chain integrity', () => {
      const reader = new Remember(new FileMemoryStore(memoryPath));
      const entries = reader.all();

      // Check that each entry's previousHash matches the previous entry's hash
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].previousHash).toBe(entries[i - 1].hash);
      }
    });

    it('memory record links observation and verification', () => {
      const result = mini.cycle({
        claim: 'Linked observation',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 40 },
        confidence: 0.95,
        confidenceReason: 'linked check',
      });

      expect(result.memory.observationId).toBe(result.observation.id);
      expect(result.memory.verificationId).toBe(result.verification.id);
    });
  });

  describe('MINI with earned expansion: Attestation', () => {
    it('produces attestations that can be independently verified', () => {
      const result = mini.cycle({
        claim: 'Attestable observation',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 35 },
        confidence: 0.95,
        confidenceReason: 'attestable check',
      });

      // Create an attestation from the verification
      const attestationService = new AttestationService(signingKey, '1');
      const attestation = attestationService.attest(result.verification);

      // Verify it independently
      const isValid = attestationService.verify(attestation);
      expect(isValid).toBe(true);

      // Another service with the same key can verify
      const other = new AttestationService(signingKey, '1');
      expect(other.verify(attestation)).toBe(true);

      // A service with a different key cannot verify
      const stranger = new AttestationService('different-key', '1');
      expect(stranger.verify(attestation)).toBe(false);
    });
  });

  describe('MINI completeness', () => {
    it('operates independently of API, Web, or infrastructure', () => {
      // No HTTP calls, no external services
      // Just pure kernel: Observe → Verify → Remember
      const result = mini.cycle({
        claim: 'Pure kernel operation',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 25 },
        confidence: 0.95,
        confidenceReason: 'pure kernel',
      });

      // All three layers complete and linked
      expect(result.observation).toBeDefined();
      expect(result.observation.id).toMatch(/^obs-/);

      expect(result.verification).toBeDefined();
      expect(result.verification.id).toMatch(/^ver-/);
      expect(result.verification.observationId).toBe(result.observation.id);

      expect(result.memory).toBeDefined();
      expect(result.memory.observationId).toBe(result.observation.id);
      expect(result.memory.verificationId).toBe(result.verification.id);
    });

    it('documents the kernel as the default mental model', () => {
      // This test itself is documentation:
      // The shape of the result demonstrates the contract.
      const result = mini.cycle({
        claim: 'Mental model documentation',
        category: 'health-check',
        source: { system: 'integration', version: '1.0.0', environment: 'test' },
        observedBy: 'mini-kernel-test',
        metadata: { statusCode: 200, responseTime: 20 },
        confidence: 0.95,
        confidenceReason: 'documented',
      });

      // Shape of result: [observation, verification, memory]
      const cycle = [result.observation, result.verification, result.memory];

      // Each step is complete and linkable
      expect(cycle[0].id).toBeDefined(); // Observation
      expect(cycle[1].observationId).toBe(cycle[0].id); // Verification links to Observation
      expect(cycle[2].observationId).toBe(cycle[0].id); // Memory links to Observation
      expect(cycle[2].verificationId).toBe(cycle[1].id); // Memory links to Verification
    });
  });

  describe('Continuous operation', () => {
    it('cycles continuously without state corruption', () => {
      for (let i = 0; i < 5; i++) {
        const result = mini.cycle({
          claim: `Cycle ${i}`,
          category: 'health-check',
          source: { system: 'integration', version: '1.0.0', environment: 'test' },
          observedBy: 'mini-kernel-test',
          metadata: { statusCode: 200, responseTime: 10 + i * 5 },
          confidence: 0.95,
          confidenceReason: `cycle ${i}`,
        });

        expect(result.observation).toBeDefined();
        expect(result.verification).toBeDefined();
        expect(result.memory).toBeDefined();
      }

      const reader = new Remember(new FileMemoryStore(memoryPath));
      expect(reader.verifyIntegrity()).toBe(true);
    });
  });
});
