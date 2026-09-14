import { SystemMetrics, SystemMood, MoodState } from '@omega-v/types';

export class MoodEvaluator {
  /**
   * Evaluate the current system mood from measurable telemetry (Pillar 19)
   */
  public evaluate(
    metrics: Partial<SystemMetrics> & { averageLatencyMs?: number },
    integrityValid: boolean,
    dissentCount: number = 0
  ): SystemMood {
    const confidence = metrics.systemConfidence || 0.87;
    const successRate = metrics.successRate ?? 1.0;
    const verificationHealth = integrityValid ? successRate : 0.0;
    const errorRate = 1.0 - successRate;
    const uncertainty = Number((1.0 - confidence).toFixed(2));
    const evidenceQuality = Number(((confidence + verificationHealth) / 2).toFixed(2));

    let state: MoodState = 'OPTIMAL_FLOW';
    let description = 'System operating at optimal confidence and verification health';

    if (!integrityValid || errorRate > 0.3) {
      state = 'FRICTION_DETECTED';
      description = 'Friction detected: ledger integrity or high verification failure rate';
    } else if (dissentCount > 2) {
      state = 'RECOMPILING';
      description = 'Active dissent detected: system recompiling verification rules';
    } else if (confidence < 0.8) {
      state = 'EVIDENCE_SEARCH';
      description = 'Low confidence: searching for additional observation evidence';
    } else if (verificationHealth >= 0.95) {
      state = 'HIGH_INTEGRITY';
      description = 'High integrity: 100% hash chain validity and 95%+ success rate';
    }

    return {
      state,
      confidence: Number(confidence.toFixed(2)),
      uncertainty,
      verificationHealth: Number(verificationHealth.toFixed(2)),
      evidenceQuality,
      errorRate: Number(errorRate.toFixed(2)),
      dissentCount,
      description,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export default MoodEvaluator;
