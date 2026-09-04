import { VerificationRuntime } from '@omega-v/runtime';
import { VerificationRule } from '@omega-v/types';

describe('VerificationRuntime', () => {
  let runtime: VerificationRuntime;

  beforeEach(() => {
    runtime = new VerificationRuntime();

    const responseTimeRule: VerificationRule = {
      name: 'response-time-threshold',
      version: '1.0.0',
      appliesTo: ['health-check'],
      definition: 'responseTime < 100',
      description: 'Response time < 100ms',
      createdAt: new Date().toISOString(),
      active: true,
    };

    const statusCodeRule: VerificationRule = {
      name: 'status-code-check',
      version: '1.0.0',
      appliesTo: ['health-check'],
      definition: 'statusCode == 200',
      description: 'Status code is 200',
      createdAt: new Date().toISOString(),
      active: true,
    };

    runtime.registerRule(responseTimeRule);
    runtime.registerRule(statusCodeRule);
  });

  describe('Complete Loop Execution', () => {
    it('should execute complete verification loop', () => {
      const result = runtime.executeLoop({
        claim: 'Service is healthy',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'All checks passed',
      });

      expect(result.observation).toBeDefined();
      expect(result.verification).toBeDefined();
      expect(result.attestation).toBeDefined();
      expect(result.observation.id).toMatch(/^obs-/);
      expect(result.verification.observationId).toBe(result.observation.id);
      expect(result.attestation.verificationId).toBe(result.verification.id);
    });

    it('should record events in event log', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const observations = runtime.queryObservations();
      expect(observations.totalCount).toBe(1);

      const verifications = runtime.queryVerifications();
      expect(verifications.totalCount).toBe(1);

      const attestations = runtime.queryAttestations();
      expect(attestations.totalCount).toBe(1);
    });

    it('should handle multiple executions', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 },
          confidence: 0.9,
          confidenceReason: 'Test',
        });
      }

      const stats = runtime.getExecutionStats();
      expect(stats.totalExecutions).toBe(3);
      expect(stats.observations).toBe(3);
      expect(stats.verifications).toBe(3);
      expect(stats.attestations).toBe(3);
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 + i * 10 },
          confidence: 0.9,
          confidenceReason: 'Test',
        });
      }
    });

    it('should query observations', () => {
      const result = runtime.queryObservations();
      expect(result.totalCount).toBe(5);
      expect(result.events.length).toBe(5);
    });

    it('should query with pagination', () => {
      const page1 = runtime.queryObservations({ limit: 2, offset: 0 });
      const page2 = runtime.queryObservations({ limit: 2, offset: 2 });

      expect(page1.events.length).toBe(2);
      expect(page2.events.length).toBe(2);
      expect(page1.pagination.hasMore).toBe(true);
    });

    it('should get event by ID', () => {
      const obs = runtime.queryObservations();
      const obsId = (obs.events[0].data as any).id;

      const event = runtime.getEvent(obsId);
      expect(event).toBeDefined();
      expect((event?.data as any).id).toBe(obsId);
    });

    it('should get complete trace', () => {
      const obs = runtime.queryObservations();
      const obsId = (obs.events[0].data as any).id;

      const trace = runtime.getTrace(obsId);
      expect(trace.observation).toBeDefined();
      expect(trace.verifications.length).toBe(1);
      expect(trace.attestations.length).toBe(1);
    });
  });

  describe('Integrity', () => {
    it('should verify event log integrity', () => {
      runtime.executeLoop({
        claim: 'Test',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const integrity = runtime.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });

  describe('Metrics', () => {
    it('should report empty metrics', () => {
      const metrics = runtime.getMetrics();
      expect(metrics.totalObservations).toBe(0);
      expect(metrics.totalVerifications).toBe(0);
    });

    it('should report metrics after execution', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 },
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const metrics = runtime.getMetrics();
      expect(metrics.totalObservations).toBe(3);
      expect(metrics.totalVerifications).toBe(3);
      expect(metrics.totalAttestations).toBe(3);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.systemConfidence).toBeGreaterThan(0);
    });

    it('should track success and failure rates', () => {
      runtime.executeLoop({
        claim: 'Passing claim',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'Should pass',
      });

      runtime.executeLoop({
        claim: 'Failing claim',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 500, responseTime: 200 },
        confidence: 0.5,
        confidenceReason: 'Should fail',
      });

      const stats = runtime.getExecutionStats();
      expect(stats.successCount).toBeGreaterThan(0);
      expect(stats.failureCount).toBeGreaterThan(0);
    });
  });

  describe('Export', () => {
    it('should export event log', () => {
      runtime.executeLoop({
        claim: 'Test',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const exported = runtime.exportEventLog();
      expect(exported.length).toBe(3); // observation, verification, attestation
      expect(exported[0].type).toBe('OBSERVATION');
      expect(exported[1].type).toBe('VERIFICATION');
      expect(exported[2].type).toBe('ATTESTATION');
    });
  });

  describe('Rule Registration', () => {
    it('should register multiple rules', () => {
      const rule: VerificationRule = {
        name: 'custom-rule',
        version: '1.0.0',
        appliesTo: ['custom-category'],
        definition: 'custom == true',
        description: 'Custom rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      runtime.registerRule(rule);

      // Verify it was registered by executing with that category
      const result = runtime.executeLoop({
        claim: 'Custom test',
        category: 'custom-category',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { custom: true },
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      expect(result.verification).toBeDefined();
      expect(result.verification.summary.rulesApplied).toBeGreaterThan(0);
    });
  });

  describe('Execution Statistics', () => {
    it('should track total executions', () => {
      for (let i = 0; i < 5; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 },
          confidence: 0.9,
          confidenceReason: 'Test',
        });
      }

      const stats = runtime.getExecutionStats();
      expect(stats.totalExecutions).toBe(5);
    });

    it('should track observation, verification, and attestation counts', () => {
      runtime.executeLoop({
        claim: 'Test',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const stats = runtime.getExecutionStats();
      expect(stats.observations).toBe(1);
      expect(stats.verifications).toBe(1);
      expect(stats.attestations).toBe(1);
    });

    it('should track average confidence', () => {
      runtime.executeLoop({
        claim: 'High confidence',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.9,
        confidenceReason: 'High',
      });

      runtime.executeLoop({
        claim: 'Low confidence',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 500, responseTime: 200 },
        confidence: 0.5,
        confidenceReason: 'Low',
      });

      const stats = runtime.getExecutionStats();
      expect(stats.totalConfidence).toBeGreaterThan(0);
    });
  });
});
