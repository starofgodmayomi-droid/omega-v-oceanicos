import { EventLogEntry, VerificationRule } from '@omega-v/types';

export interface RuleEfficacy {
  ruleName: string;
  totalExecutions: number;
  passCount: number;
  failCount: number;
  efficacyScore: number; // 0.0 - 1.0
  avgConfidence: number;
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalVerifications: number;
  overallPassRate: number;
  avgConfidence: number;
  ruleEfficacyMap: Record<string, RuleEfficacy>;
  anomaliesDetected: number;
  analyzedAt: string;
}

export interface RuleAdaptationProposal {
  ruleName: string;
  currentEfficacy: number;
  recommendedAction:
    'REDUCE_STRICTNESS' | 'INCREASE_CONFIDENCE_THRESHOLD' | 'MAINTAIN' | 'DEPRECATE';
  rationale: string;
}

/**
 * VerificationAnalyticsEngine: Pattern extraction, rule efficacy calculation,
 * and adaptive optimization recommendations for Ω∞v Oceanicos.
 */
export class VerificationAnalyticsEngine {
  /**
   * Analyze log entries to extract verification patterns and calculate rule efficacy metrics
   */
  public analyzeLogs(events: EventLogEntry[]): AnalyticsSummary {
    const verificationEvents = events.filter((e) => e.type === 'VERIFICATION');
    let totalPass = 0;
    let totalConfidenceSum = 0;
    let anomalies = 0;

    const ruleEfficacyMap: Record<string, RuleEfficacy> = {};

    for (const entry of verificationEvents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = entry.data as any;
      const summary = data.summary;
      const evidencePath = data.evidencePath || [];

      if (summary) {
        if (summary.passed) totalPass++;
        totalConfidenceSum += summary.confidence || 0;

        if (summary.confidence < 0.5 && summary.passed) {
          anomalies++;
        }
      }

      for (const step of evidencePath) {
        if (!ruleEfficacyMap[step.rule]) {
          ruleEfficacyMap[step.rule] = {
            ruleName: step.rule,
            totalExecutions: 0,
            passCount: 0,
            failCount: 0,
            efficacyScore: 1.0,
            avgConfidence: summary?.confidence || 0.9,
          };
        }

        const eff = ruleEfficacyMap[step.rule];
        eff.totalExecutions++;
        if (step.passed) {
          eff.passCount++;
        } else {
          eff.failCount++;
        }
        eff.efficacyScore = eff.passCount / eff.totalExecutions;
      }
    }

    const totalVerifications = verificationEvents.length;
    const overallPassRate = totalVerifications > 0 ? totalPass / totalVerifications : 1.0;
    const avgConfidence = totalVerifications > 0 ? totalConfidenceSum / totalVerifications : 1.0;

    return {
      totalEvents: events.length,
      totalVerifications,
      overallPassRate,
      avgConfidence,
      ruleEfficacyMap,
      anomaliesDetected: anomalies,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate rule adaptation recommendations based on evidence analytics
   */
  public generateAdaptationProposals(
    summary: AnalyticsSummary,
    rules: VerificationRule[]
  ): RuleAdaptationProposal[] {
    const proposals: RuleAdaptationProposal[] = [];

    for (const rule of rules) {
      const efficacy = summary.ruleEfficacyMap[rule.name];

      if (!efficacy || efficacy.totalExecutions === 0) {
        proposals.push({
          ruleName: rule.name,
          currentEfficacy: 0,
          recommendedAction: 'MAINTAIN',
          rationale: 'Insufficient verification evidence to evaluate rule efficacy',
        });
        continue;
      }

      if (efficacy.efficacyScore < 0.3) {
        proposals.push({
          ruleName: rule.name,
          currentEfficacy: efficacy.efficacyScore,
          recommendedAction: 'REDUCE_STRICTNESS',
          rationale: `High failure rate (${((1 - efficacy.efficacyScore) * 100).toFixed(0)}%). Consider relaxing rule definition or parameters.`,
        });
      } else if (efficacy.efficacyScore > 0.95 && efficacy.totalExecutions > 20) {
        proposals.push({
          ruleName: rule.name,
          currentEfficacy: efficacy.efficacyScore,
          recommendedAction: 'INCREASE_CONFIDENCE_THRESHOLD',
          rationale: 'Consistently high pass rate across ample verification evidence.',
        });
      } else {
        proposals.push({
          ruleName: rule.name,
          currentEfficacy: efficacy.efficacyScore,
          recommendedAction: 'MAINTAIN',
          rationale: 'Rule operating within healthy efficacy bounds.',
        });
      }
    }

    return proposals;
  }
}

export default VerificationAnalyticsEngine;
