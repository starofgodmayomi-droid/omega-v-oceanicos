import PrometheusMetricsCollector from '../prometheus-metrics';

describe('PrometheusMetricsCollector', () => {
  let collector: PrometheusMetricsCollector;

  beforeEach(() => {
    collector = new PrometheusMetricsCollector();
  });

  describe('Counter Operations', () => {
    it('should initialize observations counter to 0', () => {
      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.observations_total).toBe(0);
    });

    it('should increment observations counter', () => {
      collector.incrementObservations();
      collector.incrementObservations();

      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.observations_total).toBe(2);
    });

    it('should increment by custom amount', () => {
      collector.incrementObservations(5);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.observations_total).toBe(5);
    });

    it('should track verification metrics separately', () => {
      collector.incrementVerifications(true, 1);
      collector.incrementVerifications(false, 1);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.verifications_total).toBe(2);
      expect(metrics.counters.verifications_passed_total).toBe(1);
      expect(metrics.counters.verifications_failed_total).toBe(1);
    });

    it('should track attestation metrics separately', () => {
      collector.incrementAttestations(true, 1);
      collector.incrementAttestations(false, 1);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.attestations_total).toBe(2);
      expect(metrics.counters.attestations_verified_total).toBe(1);
    });

    it('should handle bulk increments', () => {
      collector.incrementObservations(10);
      collector.incrementVerifications(true, 8);
      collector.incrementVerifications(false, 2);
      collector.incrementAttestations(true, 8);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.observations_total).toBe(10);
      expect(metrics.counters.verifications_total).toBe(10);
      expect(metrics.counters.verifications_passed_total).toBe(8);
      expect(metrics.counters.verifications_failed_total).toBe(2);
      expect(metrics.counters.attestations_total).toBe(8);
      expect(metrics.counters.attestations_verified_total).toBe(8);
    });
  });

  describe('Gauge Operations', () => {
    it('should set system confidence gauge', () => {
      collector.setSystemConfidence(0.95);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.gauges.system_confidence).toBe(0.95);
    });

    it('should set success rate gauge', () => {
      collector.setSuccessRate(0.85);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.gauges.success_rate).toBe(0.85);
    });

    it('should set event log size gauge', () => {
      collector.setEventLogSize(1000);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.gauges.event_log_size).toBe(1000);
    });

    it('should update gauge values (not accumulate)', () => {
      collector.setSystemConfidence(0.5);
      collector.setSystemConfidence(0.75);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.gauges.system_confidence).toBe(0.75);
    });

    it('should handle boundary values', () => {
      collector.setSystemConfidence(0);
      collector.setSuccessRate(1);
      collector.setEventLogSize(0);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.gauges.system_confidence).toBe(0);
      expect(metrics.gauges.success_rate).toBe(1);
      expect(metrics.gauges.event_log_size).toBe(0);
    });
  });

  describe('Histogram Operations', () => {
    it('should record loop duration', () => {
      collector.recordLoopDuration(100);
      collector.recordLoopDuration(150);
      collector.recordLoopDuration(200);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.histograms.loop_duration_ms.count).toBe(3);
      expect(metrics.histograms.loop_duration_ms.sum).toBe(450);
      expect(metrics.histograms.loop_duration_ms.min).toBe(100);
      expect(metrics.histograms.loop_duration_ms.max).toBe(200);
      expect(metrics.histograms.loop_duration_ms.avg).toBe(150);
    });

    it('should record verification duration', () => {
      collector.recordVerificationDuration(50);
      collector.recordVerificationDuration(75);
      collector.recordVerificationDuration(100);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.histograms.verification_duration_ms.count).toBe(3);
      expect(metrics.histograms.verification_duration_ms.sum).toBe(225);
    });

    it('should record attestation duration', () => {
      collector.recordAttestationDuration(30);
      collector.recordAttestationDuration(40);

      const metrics = collector.generateMetricsJSON();
      expect(metrics.histograms.attestation_duration_ms.count).toBe(2);
      expect(metrics.histograms.attestation_duration_ms.sum).toBe(70);
    });

    it('should calculate histogram statistics correctly', () => {
      const durations = [10, 20, 30, 40, 50];
      durations.forEach((d) => collector.recordLoopDuration(d));

      const metrics = collector.generateMetricsJSON();
      expect(metrics.histograms.loop_duration_ms.count).toBe(5);
      expect(metrics.histograms.loop_duration_ms.sum).toBe(150);
      expect(metrics.histograms.loop_duration_ms.min).toBe(10);
      expect(metrics.histograms.loop_duration_ms.max).toBe(50);
      expect(metrics.histograms.loop_duration_ms.avg).toBe(30);
    });

    it('should handle empty histogram gracefully', () => {
      const metrics = collector.generateMetricsJSON();
      expect(metrics.histograms.loop_duration_ms.count).toBe(0);
      expect(metrics.histograms.loop_duration_ms.sum).toBe(0);
      expect(metrics.histograms.loop_duration_ms.avg).toBe(0);
    });
  });

  describe('Prometheus Format Output', () => {
    it('should generate valid Prometheus text format', () => {
      collector.incrementObservations(5);
      collector.incrementVerifications(true, 3);
      collector.setSystemConfidence(0.9);
      collector.recordLoopDuration(100);

      const output = collector.generatePrometheusMetrics();

      expect(output).toContain('# HELP omega_observations_total');
      expect(output).toContain('# TYPE omega_observations_total counter');
      expect(output).toContain('omega_observations_total 5');
      expect(output).toContain('omega_system_confidence 0.9');
      expect(output).toContain('# HELP omega_uptime_ms System uptime in milliseconds');
      expect(output).toContain('# TYPE omega_uptime_ms gauge');
    });

    it('should include all counter metrics', () => {
      collector.incrementObservations(1);
      collector.incrementVerifications(true, 1);
      collector.incrementAttestations(true, 1);

      const output = collector.generatePrometheusMetrics();

      expect(output).toContain('omega_observations_total 1');
      expect(output).toContain('omega_verifications_total 1');
      expect(output).toContain('omega_verifications_passed_total 1');
      expect(output).toContain('omega_attestations_total 1');
      expect(output).toContain('omega_attestations_verified_total 1');
    });

    it('should include all gauge metrics', () => {
      collector.setSystemConfidence(0.95);
      collector.setSuccessRate(0.92);
      collector.setEventLogSize(500);

      const output = collector.generatePrometheusMetrics();

      expect(output).toContain('omega_system_confidence 0.95');
      expect(output).toContain('omega_success_rate 0.92');
      expect(output).toContain('omega_event_log_size 500');
    });

    it('should include histogram metrics with buckets', () => {
      collector.recordLoopDuration(10);
      collector.recordLoopDuration(100);
      collector.recordLoopDuration(500);
      collector.recordLoopDuration(2000);

      const output = collector.generatePrometheusMetrics();

      expect(output).toContain('# TYPE omega_loop_duration_ms histogram');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="1"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="5"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="10"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="50"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="100"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="500"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="1000"}');
      expect(output).toContain('omega_loop_duration_ms_bucket{le="+Inf"}');
      expect(output).toContain('omega_loop_duration_ms_sum');
      expect(output).toContain('omega_loop_duration_ms_count 4');
    });

    it('should include system uptime metric', () => {
      const output = collector.generatePrometheusMetrics();

      expect(output).toContain('omega_uptime_ms');
      expect(output).toMatch(/omega_uptime_ms \d+/);
    });
  });

  describe('JSON Format Output', () => {
    it('should generate JSON with all metric types', () => {
      collector.incrementObservations(5);
      collector.setSystemConfidence(0.9);
      collector.recordLoopDuration(100);

      const json = collector.generateMetricsJSON();

      expect(json).toHaveProperty('counters');
      expect(json).toHaveProperty('gauges');
      expect(json).toHaveProperty('histograms');
      expect(json).toHaveProperty('uptime_ms');
    });

    it('should include histogram statistics in JSON', () => {
      collector.recordVerificationDuration(50);
      collector.recordVerificationDuration(100);
      collector.recordVerificationDuration(150);

      const json = collector.generateMetricsJSON();
      const stats = json.histograms.verification_duration_ms;

      expect(stats.count).toBe(3);
      expect(stats.sum).toBe(300);
      expect(stats.min).toBe(50);
      expect(stats.max).toBe(150);
      expect(stats.avg).toBe(100);
    });

    it('should return proper JSON structure', () => {
      const json = collector.generateMetricsJSON();

      expect(typeof json.counters).toBe('object');
      expect(typeof json.gauges).toBe('object');
      expect(typeof json.histograms).toBe('object');
      expect(typeof json.uptime_ms).toBe('number');
    });
  });

  describe('Reset Operations', () => {
    it('should reset all metrics', () => {
      collector.incrementObservations(10);
      collector.setSystemConfidence(0.9);
      collector.recordLoopDuration(100);

      collector.reset();

      const metrics = collector.generateMetricsJSON();
      expect(metrics.counters.observations_total).toBe(0);
      expect(metrics.gauges.system_confidence).toBe(0);
      expect(metrics.histograms.loop_duration_ms.count).toBe(0);
    });

    it('should reset uptime tracking on reset', () => {
      const json1 = collector.generateMetricsJSON();
      const uptime1 = json1.uptime_ms;

      collector.reset();

      const json2 = collector.generateMetricsJSON();
      const uptime2 = json2.uptime_ms;

      expect(uptime2).toBeLessThanOrEqual(uptime1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track a complete verification loop', () => {
      collector.incrementObservations();
      collector.incrementVerifications(true);
      collector.incrementAttestations(true);
      collector.recordLoopDuration(250);
      collector.recordVerificationDuration(100);
      collector.recordAttestationDuration(50);

      const metrics = collector.generateMetricsJSON();

      expect(metrics.counters.observations_total).toBe(1);
      expect(metrics.counters.verifications_total).toBe(1);
      expect(metrics.counters.verifications_passed_total).toBe(1);
      expect(metrics.counters.attestations_total).toBe(1);
      expect(metrics.counters.attestations_verified_total).toBe(1);
      expect(metrics.histograms.loop_duration_ms.count).toBe(1);
      expect(metrics.histograms.loop_duration_ms.sum).toBe(250);
    });

    it('should track multiple loop iterations', () => {
      for (let i = 0; i < 10; i++) {
        collector.incrementObservations();
        const passed = i % 2 === 0;
        collector.incrementVerifications(passed);
        collector.recordLoopDuration(100 + i * 10);
      }

      const metrics = collector.generateMetricsJSON();

      expect(metrics.counters.observations_total).toBe(10);
      expect(metrics.counters.verifications_total).toBe(10);
      expect(metrics.counters.verifications_passed_total).toBe(5);
      expect(metrics.counters.verifications_failed_total).toBe(5);
      expect(metrics.histograms.loop_duration_ms.count).toBe(10);
    });

    it('should maintain metric consistency across formats', () => {
      collector.incrementObservations(7);
      collector.incrementVerifications(true, 6);
      collector.incrementVerifications(false, 1);
      collector.setSuccessRate(0.857);

      const json = collector.generateMetricsJSON();
      const prometheus = collector.generatePrometheusMetrics();

      expect(json.counters.observations_total).toBe(7);
      expect(prometheus).toContain('omega_observations_total 7');
      expect(prometheus).toContain('omega_success_rate 0.857');
    });
  });

  describe('Histogram Bucket Distribution', () => {
    it('should correctly categorize durations into buckets', () => {
      const testDurations = [1, 5, 10, 50, 100, 500, 1000, 5000];
      testDurations.forEach((d) => collector.recordLoopDuration(d));

      const prometheus = collector.generatePrometheusMetrics();

      expect(prometheus).toContain('omega_loop_duration_ms_bucket{le="1"} 1');
      expect(prometheus).toContain('omega_loop_duration_ms_bucket{le="5"} 2');
      expect(prometheus).toContain('omega_loop_duration_ms_bucket{le="10"} 3');
      expect(prometheus).toContain('omega_loop_duration_ms_bucket{le="1000"} 7');
      expect(prometheus).toContain('omega_loop_duration_ms_bucket{le="+Inf"} 8');
    });

    it('should handle durations exceeding all buckets', () => {
      collector.recordLoopDuration(10000);
      collector.recordLoopDuration(100000);

      const prometheus = collector.generatePrometheusMetrics();

      expect(prometheus).toContain('omega_loop_duration_ms_bucket{le="+Inf"} 2');
    });
  });
});
