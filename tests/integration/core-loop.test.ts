import { VerificationRuntime } from '@omega-v/runtime';

/**
 * Integration tests for the complete Ω∞v Oceanicos verification loop
 * Tests real-world scenarios: Observe → Verify → Attest → Record → Query
 */
describe('Core Verification Loop Integration', () => {
  let runtime: VerificationRuntime;

  beforeEach(() => {
    runtime = new VerificationRuntime();

    // Register rules for health-check observations
    runtime.registerRule({
      name: 'response-time-threshold',
      version: '1.0.0',
      appliesTo: ['health-check'],
      definition: 'responseTime < 100',
      description: 'Response time < 100ms',
      createdAt: new Date().toISOString(),
      active: true,
    });

    runtime.registerRule({
      name: 'status-code-check',
      version: '1.0.0',
      appliesTo: ['health-check'],
      definition: 'statusCode == 200',
      description: 'Status code is 200',
      createdAt: new Date().toISOString(),
      active: true,
    });
  });

  describe('Complete Workflow: Healthy Service', () => {
    it('should execute full loop for healthy service with all verifications passing', () => {
      const result = runtime.executeLoop({
        claim: 'API service is healthy and responsive',
        category: 'health-check',
        source: { system: 'health-monitor', version: '1.0.0', environment: 'production' },
        observedBy: 'automated-health-check',
        metadata: {
          statusCode: 200,
          responseTime: 45,
          endpoint: '/health',
          timestamp: new Date().toISOString(),
        },
        confidence: 0.95,
        confidenceReason: 'Multiple consecutive healthy checks from primary monitor',
      });

      // Verify observation was created
      expect(result.observation).toBeDefined();
      expect(result.observation.id).toMatch(/^obs-/);
      expect(result.observation.status).toBe('normalized');
      expect(result.observation.confidence).toBe(0.95);

      // Verify all checks passed
      expect(result.verification).toBeDefined();
      expect(result.verification.summary.passed).toBe(true);
      expect(result.verification.summary.rulesApplied).toBe(2);
      expect(result.verification.summary.rulesPassed).toBe(2);

      // Verify attestation was created
      expect(result.attestation).toBeDefined();
      expect(result.attestation.id).toMatch(/^att-/);
      expect(result.attestation.verified).toBe(true);
      expect(result.attestation.status).toBe('signed');

      // Verify linkage
      expect(result.verification.observationId).toBe(result.observation.id);
      expect(result.attestation.verificationId).toBe(result.verification.id);
      expect(result.attestation.observationId).toBe(result.observation.id);
    });
  });

  describe('Complete Workflow: Unhealthy Service', () => {
    it('should execute full loop when service is unhealthy', () => {
      const result = runtime.executeLoop({
        claim: 'API service is responding with errors',
        category: 'health-check',
        source: { system: 'health-monitor', version: '1.0.0', environment: 'production' },
        observedBy: 'automated-health-check',
        metadata: {
          statusCode: 500,
          responseTime: 5000,
          endpoint: '/health',
          errorMessage: 'Internal server error',
        },
        confidence: 0.9,
        confidenceReason: 'Multiple error responses observed',
      });

      // Verification should fail
      expect(result.verification.summary.passed).toBe(false);
      expect(result.verification.summary.rulesFailed).toBeGreaterThan(0);

      // Attestation still created even with failure
      expect(result.attestation.verified).toBe(false);
      expect(result.attestation.status).toBe('signed');
    });
  });

  describe('Event Recording and Querying', () => {
    it('should record all events and allow querying', () => {
      // Execute multiple verifications
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Health check iteration ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 + i * 5 },
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      // Query observations
      const obsResult = runtime.queryObservations();
      expect(obsResult.totalCount).toBe(3);
      expect(obsResult.events.length).toBe(3);

      // Query verifications
      const verResult = runtime.queryVerifications();
      expect(verResult.totalCount).toBe(3);

      // Query attestations
      const attResult = runtime.queryAttestations();
      expect(attResult.totalCount).toBe(3);

      // Verify pagination
      const page1 = runtime.queryObservations({ limit: 2, offset: 0 });
      expect(page1.events.length).toBe(2);
      expect(page1.pagination.hasMore).toBe(true);
    });

    it('should retrieve complete trace for observation', () => {
      const result = runtime.executeLoop({
        claim: 'Test service',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const trace = runtime.getTrace(result.observation.id);

      // Verify trace contains all related events
      expect(trace.observation).toBeDefined();
      expect((trace.observation?.data as any).id).toBe(result.observation.id);
      expect(trace.verifications.length).toBe(1);
      expect(trace.attestations.length).toBe(1);

      // Verify IDs match
      const verFromTrace = trace.verifications[0];
      const attFromTrace = trace.attestations[0];

      expect((verFromTrace.data as any).id).toBe(result.verification.id);
      expect((attFromTrace.data as any).id).toBe(result.attestation.id);
    });
  });

  describe('Integrity Verification', () => {
    it('should verify event log integrity after recordings', () => {
      // Execute several loops
      for (let i = 0; i < 5; i++) {
        runtime.executeLoop({
          claim: `Service check ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 },
          confidence: 0.9,
          confidenceReason: 'Test',
        });
      }

      // Verify integrity
      const integrity = runtime.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.brokenAt).toBeUndefined();
    });
  });

  describe('Monitoring Workflow: Multi-Service', () => {
    it('should handle observations from multiple services', () => {
      // Monitor Service A
      const resultA = runtime.executeLoop({
        claim: 'Service A is healthy',
        category: 'health-check',
        source: { system: 'service-a', version: '1.0.0', environment: 'prod' },
        observedBy: 'health-monitor',
        metadata: { statusCode: 200, responseTime: 40 },
        confidence: 0.95,
        confidenceReason: 'Healthy response',
      });

      // Monitor Service B
      const resultB = runtime.executeLoop({
        claim: 'Service B is healthy',
        category: 'health-check',
        source: { system: 'service-b', version: '2.0.0', environment: 'prod' },
        observedBy: 'health-monitor',
        metadata: { statusCode: 200, responseTime: 60 },
        confidence: 0.9,
        confidenceReason: 'Healthy response',
      });

      // Verify both observations recorded
      const observations = runtime.queryObservations();
      expect(observations.totalCount).toBe(2);

      // Verify both verifications passed
      const verifications = runtime.queryVerifications();
      expect(verifications.totalCount).toBe(2);
      for (const event of verifications.events) {
        expect((event.data as any).summary.passed).toBe(true);
      }
    });
  });

  describe('Metrics and Statistics', () => {
    it('should track execution metrics accurately', () => {
      // Execute some successful checks
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Healthy check ${i}`,
          category: 'health-check',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: { statusCode: 200, responseTime: 50 },
          confidence: 0.95,
          confidenceReason: 'Healthy',
        });
      }

      // Execute a failing check
      runtime.executeLoop({
        claim: 'Unhealthy check',
        category: 'health-check',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: { statusCode: 500, responseTime: 200 },
        confidence: 0.5,
        confidenceReason: 'Failed',
      });

      // Check metrics
      const metrics = runtime.getMetrics();

      expect(metrics.totalObservations).toBe(4);
      expect(metrics.totalVerifications).toBe(4);
      expect(metrics.totalAttestations).toBe(4);

      // Success rate should be 3/4 = 0.75
      expect(metrics.successRate).toBeCloseTo(0.75, 1);

      // System confidence should be average of confidences
      expect(metrics.systemConfidence).toBeGreaterThan(0.5);
      expect(metrics.systemConfidence).toBeLessThanOrEqual(1);
    });

    it('should provide execution statistics', () => {
      for (let i = 0; i < 5; i++) {
        runtime.executeLoop({
          claim: `Test ${i}`,
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
      expect(stats.observations).toBe(5);
      expect(stats.verifications).toBe(5);
      expect(stats.attestations).toBe(5);
      expect(stats.successCount).toBe(5);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('Event Export and Audit Trail', () => {
    it('should export complete event log for audit', () => {
      // Create some events
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

      // Should contain observation, verification, and attestation
      expect(exported.length).toBeGreaterThanOrEqual(3);

      // Verify event types
      const types = exported.map((e) => e.type);
      expect(types).toContain('OBSERVATION');
      expect(types).toContain('VERIFICATION');
      expect(types).toContain('ATTESTATION');

      // Verify hash chain integrity
      for (let i = 1; i < exported.length; i++) {
        expect(exported[i].previousHash).toBe(exported[i - 1].hash);
      }
    });
  });
});
