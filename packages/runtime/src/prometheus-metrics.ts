/**
 * Prometheus metrics for Ω∞v verification loop monitoring
 * Tracks observations, verifications, attestations, and performance
 */

export interface PrometheusMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels?: string[];
  value?: number | Record<string, number>;
}

export class PrometheusMetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Counters
    this.counters.set('observations_total', 0);
    this.counters.set('verifications_total', 0);
    this.counters.set('verifications_passed_total', 0);
    this.counters.set('verifications_failed_total', 0);
    this.counters.set('attestations_total', 0);
    this.counters.set('attestations_verified_total', 0);

    // Gauges
    this.gauges.set('system_confidence', 0);
    this.gauges.set('success_rate', 0);
    this.gauges.set('event_log_size', 0);

    // Histograms
    this.histograms.set('loop_duration_ms', []);
    this.histograms.set('verification_duration_ms', []);
    this.histograms.set('attestation_duration_ms', []);
  }

  // Counter operations
  incrementObservations(count = 1): void {
    const current = this.counters.get('observations_total') || 0;
    this.counters.set('observations_total', current + count);
  }

  incrementVerifications(passed = true, count = 1): void {
    const total = this.counters.get('verifications_total') || 0;
    this.counters.set('verifications_total', total + count);

    if (passed) {
      const passedCount = this.counters.get('verifications_passed_total') || 0;
      this.counters.set('verifications_passed_total', passedCount + count);
    } else {
      const failedCount = this.counters.get('verifications_failed_total') || 0;
      this.counters.set('verifications_failed_total', failedCount + count);
    }
  }

  incrementAttestations(verified = true, count = 1): void {
    const total = this.counters.get('attestations_total') || 0;
    this.counters.set('attestations_total', total + count);

    if (verified) {
      const verifiedCount = this.counters.get('attestations_verified_total') || 0;
      this.counters.set('attestations_verified_total', verifiedCount + count);
    }
  }

  // Gauge operations
  setSystemConfidence(confidence: number): void {
    this.gauges.set('system_confidence', confidence);
  }

  setSuccessRate(rate: number): void {
    this.gauges.set('success_rate', rate);
  }

  setEventLogSize(size: number): void {
    this.gauges.set('event_log_size', size);
  }

  // Histogram operations
  recordLoopDuration(durationMs: number): void {
    const durations = this.histograms.get('loop_duration_ms') || [];
    durations.push(durationMs);
    this.histograms.set('loop_duration_ms', durations);
  }

  recordVerificationDuration(durationMs: number): void {
    const durations = this.histograms.get('verification_duration_ms') || [];
    durations.push(durationMs);
    this.histograms.set('verification_duration_ms', durations);
  }

  recordAttestationDuration(durationMs: number): void {
    const durations = this.histograms.get('attestation_duration_ms') || [];
    durations.push(durationMs);
    this.histograms.set('attestation_duration_ms', durations);
  }

  // Histogram statistics
  private calculateHistogramStats(durations: number[]): { count: number; sum: number; min: number; max: number; avg: number } {
    if (durations.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0 };
    }

    const sum = durations.reduce((a, b) => a + b, 0);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const avg = sum / durations.length;

    return { count: durations.length, sum, min, max, avg };
  }

  /**
   * Generate Prometheus-compatible metrics output
   */
  generatePrometheusMetrics(): string {
    let output = '';

    // Counter metrics
    output += this.formatCounter('omega_observations_total', this.counters.get('observations_total') || 0, 'Total observations recorded');
    output += this.formatCounter('omega_verifications_total', this.counters.get('verifications_total') || 0, 'Total verifications performed');
    output += this.formatCounter('omega_verifications_passed_total', this.counters.get('verifications_passed_total') || 0, 'Total passed verifications');
    output += this.formatCounter('omega_verifications_failed_total', this.counters.get('verifications_failed_total') || 0, 'Total failed verifications');
    output += this.formatCounter('omega_attestations_total', this.counters.get('attestations_total') || 0, 'Total attestations created');
    output += this.formatCounter('omega_attestations_verified_total', this.counters.get('attestations_verified_total') || 0, 'Total verified attestations');

    // Gauge metrics
    output += this.formatGauge('omega_system_confidence', this.gauges.get('system_confidence') || 0, 'Current system confidence (0-1)');
    output += this.formatGauge('omega_success_rate', this.gauges.get('success_rate') || 0, 'Current success rate (0-1)');
    output += this.formatGauge('omega_event_log_size', this.gauges.get('event_log_size') || 0, 'Current event log size');

    // Histogram metrics
    output += this.formatHistogram('omega_loop_duration_ms', this.histograms.get('loop_duration_ms') || [], 'Verification loop duration in milliseconds');
    output += this.formatHistogram('omega_verification_duration_ms', this.histograms.get('verification_duration_ms') || [], 'Verification duration in milliseconds');
    output += this.formatHistogram('omega_attestation_duration_ms', this.histograms.get('attestation_duration_ms') || [], 'Attestation duration in milliseconds');

    // System uptime
    const uptimeMs = Date.now() - this.startTime;
    output += `# HELP omega_uptime_ms System uptime in milliseconds\n`;
    output += `# TYPE omega_uptime_ms gauge\n`;
    output += `omega_uptime_ms ${uptimeMs}\n\n`;

    return output;
  }

  /**
   * Generate compact JSON metrics (alternative format)
   */
  generateMetricsJSON(): Record<string, unknown> {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: {
        loop_duration_ms: this.calculateHistogramStats(this.histograms.get('loop_duration_ms') || []),
        verification_duration_ms: this.calculateHistogramStats(this.histograms.get('verification_duration_ms') || []),
        attestation_duration_ms: this.calculateHistogramStats(this.histograms.get('attestation_duration_ms') || []),
      },
      uptime_ms: Date.now() - this.startTime,
    };
  }

  private formatCounter(name: string, value: number, help: string): string {
    return `# HELP ${name} ${help}\n# TYPE ${name} counter\n${name} ${value}\n\n`;
  }

  private formatGauge(name: string, value: number, help: string): string {
    return `# HELP ${name} ${help}\n# TYPE ${name} gauge\n${name} ${value}\n\n`;
  }

  private formatHistogram(name: string, durations: number[], help: string): string {
    const stats = this.calculateHistogramStats(durations);

    let output = `# HELP ${name} ${help}\n`;
    output += `# TYPE ${name} histogram\n`;

    // Histogram buckets (in milliseconds)
    const buckets = [1, 5, 10, 50, 100, 500, 1000, Infinity];
    for (const bucket of buckets) {
      const count = durations.filter(d => d <= bucket).length;
      if (bucket === Infinity) {
        output += `${name}_bucket{le="+Inf"} ${count}\n`;
      } else {
        output += `${name}_bucket{le="${bucket}"} ${count}\n`;
      }
    }

    output += `${name}_sum ${stats.sum}\n`;
    output += `${name}_count ${stats.count}\n\n`;

    return output;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = Date.now();
    this.initializeMetrics();
  }
}

export default PrometheusMetricsCollector;
