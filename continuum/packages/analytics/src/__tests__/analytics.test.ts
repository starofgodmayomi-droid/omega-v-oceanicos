import { VerificationAnalyticsEngine } from '../index';
import { EventLogEntry, VerificationRule } from '@omega-v/types';

describe('VerificationAnalyticsEngine (@omega-v/analytics)', () => {
  let analytics: VerificationAnalyticsEngine;

  beforeEach(() => {
    analytics = new VerificationAnalyticsEngine();
  });

  it('should analyze log entries and compute overall pass rate and rule efficacy', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 1,
        type: 'OBSERVATION',
        recordedAt: new Date().toISOString(),
        hash: '0x111',
        previousHash: '0x000',
        data: {},
      },
      {
        id: 2,
        type: 'VERIFICATION',
        recordedAt: new Date().toISOString(),
        hash: '0x222',
        previousHash: '0x111',
        data: {
          summary: {
            passed: true,
            confidence: 0.95,
            rulesApplied: 2,
            rulesPassed: 2,
            rulesFailed: 0,
          },
          evidencePath: [
            { step: 1, rule: 'response-time-check', passed: true, reasoning: 'Fast response' },
            { step: 2, rule: 'status-check', passed: true, reasoning: 'Status 200' },
          ],
        },
      },
      {
        id: 3,
        type: 'VERIFICATION',
        recordedAt: new Date().toISOString(),
        hash: '0x333',
        previousHash: '0x222',
        data: {
          summary: {
            passed: false,
            confidence: 0.4,
            rulesApplied: 2,
            rulesPassed: 1,
            rulesFailed: 1,
          },
          evidencePath: [
            { step: 1, rule: 'response-time-check', passed: false, reasoning: 'Slow response' },
            { step: 2, rule: 'status-check', passed: true, reasoning: 'Status 200' },
          ],
        },
      },
    ];

    const summary = analytics.analyzeLogs(mockEvents);

    expect(summary.totalEvents).toBe(3);
    expect(summary.totalVerifications).toBe(2);
    expect(summary.overallPassRate).toBe(0.5);
    expect(summary.ruleEfficacyMap['response-time-check'].efficacyScore).toBe(0.5);
    expect(summary.ruleEfficacyMap['status-check'].efficacyScore).toBe(1.0);
  });

  it('should generate adaptation proposals for failing rules', () => {
    const mockEvents: EventLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      type: 'VERIFICATION' as const,
      recordedAt: new Date().toISOString(),
      hash: `0x${i}`,
      previousHash: `0x${i - 1}`,
      data: {
        summary: {
          passed: false,
          confidence: 0.3,
          rulesApplied: 1,
          rulesPassed: 0,
          rulesFailed: 1,
        },
        evidencePath: [
          { step: 1, rule: 'strict-latency-rule', passed: false, reasoning: 'Exceeded' },
        ],
      },
    }));

    const summary = analytics.analyzeLogs(mockEvents);
    const rules: VerificationRule[] = [
      {
        name: 'strict-latency-rule',
        version: '1.0.0',
        appliesTo: ['api'],
        definition: 'latency < 10',
        description: 'Strict latency check',
        createdAt: new Date().toISOString(),
        active: true,
      },
    ];

    const proposals = analytics.generateAdaptationProposals(summary, rules);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].recommendedAction).toBe('REDUCE_STRICTNESS');
    expect(proposals[0].rationale).toContain('High failure rate');
  });
});
