import VerificationRuntime from '../index';

describe('VerificationRuntime Metrics Integration', () => {
  let runtime: VerificationRuntime;

  beforeEach(() => {
    runtime = new VerificationRuntime();
    runtime.registerRule({
      name: 'test-rule',
      version: '1.0.0',
      appliesTo: ['test'],
      definition: 'true',
      description: 'Test rule',
      createdAt: new Date().toISOString(),
      active: true,
    });
  });

  describe('Metrics Collection During Loop Execution', () => {
    it('should collect metrics for single loop execution', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const metrics = runtime.getMetricsJSON();

      expect(metrics.counters.observations_total).toBe(1);
      expect(metrics.counters.verifications_total).toBe(1);
      expect(metrics.counters.attestations_total).toBe(1);
      expect(metrics.histograms.loop_duration_ms.count).toBe(1);
      expect(metrics.histograms.verification_duration_ms.count).toBe(1);
      expect(metrics.histograms.attestation_duration_ms.count).toBe(1);
    });

    it('should accumulate metrics across multiple executions', () => {
      for (let i = 0; i < 5; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const metrics = runtime.getMetricsJSON();

      expect(metrics.counters.observations_total).toBe(5);
      expect(metrics.counters.verifications_total).toBe(5);
      expect(metrics.counters.attestations_total).toBe(5);
      expect(metrics.histograms.loop_duration_ms.count).toBe(5);
    });

    it('should track verification pass/fail separately', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const metrics = runtime.getMetricsJSON();

      expect(metrics.counters.verifications_total).toBe(3);
      expect(
        metrics.counters.verifications_passed_total + metrics.counters.verifications_failed_total
      ).toBe(3);
    });

    it('should measure timing for each component', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const metrics = runtime.getMetricsJSON();

      expect(metrics.histograms.loop_duration_ms.count).toBeGreaterThan(0);
      expect(metrics.histograms.verification_duration_ms.count).toBeGreaterThan(0);
      expect(metrics.histograms.attestation_duration_ms.count).toBeGreaterThan(0);

      expect(metrics.histograms.loop_duration_ms.sum).toBeGreaterThanOrEqual(0);
      expect(metrics.histograms.verification_duration_ms.sum).toBeGreaterThanOrEqual(0);
      expect(metrics.histograms.attestation_duration_ms.sum).toBeGreaterThanOrEqual(0);
    });

    it('should update gauge metrics after execution', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const metrics = runtime.getMetricsJSON();

      expect(metrics.gauges.system_confidence).toBeGreaterThan(0);
      expect(metrics.gauges.success_rate).toBeGreaterThanOrEqual(0);
      expect(metrics.gauges.success_rate).toBeLessThanOrEqual(1);
      expect(metrics.gauges.event_log_size).toBeGreaterThan(0);
    });
  });

  describe('SystemMetrics Interface', () => {
    it('should populate SystemMetrics with accurate data', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const metrics = runtime.getMetrics();

      expect(metrics.totalObservations).toBe(1);
      expect(metrics.totalVerifications).toBe(1);
      expect(metrics.totalAttestations).toBe(1);
      expect(metrics.avgVerificationTime).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.systemConfidence).toBeGreaterThan(0);
      expect(metrics.lastUpdated).toBeDefined();
    });

    it('should calculate average verification time correctly', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const metrics = runtime.getMetrics();

      expect(metrics.avgVerificationTime).toBeGreaterThanOrEqual(0);
      expect(metrics.totalVerifications).toBe(3);
    });

    it('should calculate success rate correctly', () => {
      for (let i = 0; i < 10; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const metrics = runtime.getMetrics();

      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Prometheus Format Integration', () => {
    it('should generate valid Prometheus output', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const prometheus = runtime.getPrometheusMetrics();

      expect(typeof prometheus).toBe('string');
      expect(prometheus.length).toBeGreaterThan(0);
      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('omega_');
    });

    it('should include all executed loop metrics in Prometheus format', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const prometheus = runtime.getPrometheusMetrics();

      expect(prometheus).toContain('omega_observations_total');
      expect(prometheus).toContain('omega_verifications_total');
      expect(prometheus).toContain('omega_attestations_total');
      expect(prometheus).toContain('omega_loop_duration_ms');
      expect(prometheus).toContain('omega_system_confidence');
    });

    it('should format counters with correct values', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const prometheus = runtime.getPrometheusMetrics();

      expect(prometheus).toContain('omega_observations_total 3');
      expect(prometheus).toContain('omega_verifications_total 3');
      expect(prometheus).toContain('omega_attestations_total 3');
    });

    it('should include histogram buckets in Prometheus format', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const prometheus = runtime.getPrometheusMetrics();

      expect(prometheus).toContain('omega_loop_duration_ms_bucket');
      expect(prometheus).toContain('omega_loop_duration_ms_sum');
      expect(prometheus).toContain('omega_loop_duration_ms_count');
    });
  });

  describe('Execution Statistics Tracking', () => {
    it('should track execution stats alongside metrics', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const stats = runtime.getExecutionStats();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.observations).toBe(1);
      expect(stats.verifications).toBe(1);
      expect(stats.attestations).toBe(1);
      expect(stats.totalVerificationTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalAttestationTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalLoopTime).toBeGreaterThanOrEqual(0);
    });

    it('should accumulate timing stats correctly', () => {
      for (let i = 0; i < 5; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const stats = runtime.getExecutionStats();
      const metrics = runtime.getMetricsJSON();

      expect(stats.totalVerificationTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalLoopTime).toBeGreaterThanOrEqual(0);
      expect(metrics.histograms.verification_duration_ms.count).toBe(5);
      expect(metrics.histograms.loop_duration_ms.count).toBe(5);
    });
  });

  describe('Metrics Consistency', () => {
    it('should maintain consistency between JSON and Prometheus formats', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const json = runtime.getMetricsJSON();
      const prometheus = runtime.getPrometheusMetrics();

      expect(prometheus).toContain(`omega_observations_total ${json.counters.observations_total}`);
      expect(prometheus).toContain(
        `omega_verifications_total ${json.counters.verifications_total}`
      );
      expect(prometheus).toContain(`omega_attestations_total ${json.counters.attestations_total}`);
    });

    it('should reflect updated gauge metrics in both formats', () => {
      runtime.executeLoop({
        claim: 'Test claim',
        category: 'test',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.95,
        confidenceReason: 'Test',
      });

      const json = runtime.getMetricsJSON();
      const metrics = runtime.getMetrics();

      expect(metrics.systemConfidence).toBe(json.gauges.system_confidence);
      expect(metrics.successRate).toBe(json.gauges.success_rate);
    });
  });

  describe('Event Log Size Tracking', () => {
    it('should update event log size gauge after each execution', () => {
      for (let i = 0; i < 3; i++) {
        runtime.executeLoop({
          claim: `Claim ${i}`,
          category: 'test',
          source: { system: 'test', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.95,
          confidenceReason: 'Test',
        });
      }

      const metrics = runtime.getMetricsJSON();
      expect(metrics.gauges.event_log_size).toBe(9);
    });
  });
});
