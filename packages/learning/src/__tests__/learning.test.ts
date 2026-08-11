import { LearningEngine } from '../index';
import { VerificationResult } from '@omega-v/types';

describe('LearningEngine (Section XXVI Learning)', () => {
  let engine: LearningEngine;

  beforeEach(() => {
    engine = new LearningEngine();
  });

  const createMockResult = (passed: boolean): VerificationResult => ({
    id: 'ver-123',
    observationId: 'obs-123',
    timestamp: new Date().toISOString(),
    summary: { passed, confidence: 1.0, rulesApplied: 1, rulesPassed: passed ? 1 : 0, rulesFailed: passed ? 0 : 1 },
    rules: [{ name: 'test-rule', passed, confidence: 1.0 }],
    evidencePath: [],
    ruleVersions: { 'test-rule': '1.0.0' },
    status: 'completed',
  });

  it('should generate a prediction', () => {
    const prediction = engine.makePrediction('PASS', 0.9, 'test-rule');
    expect(prediction.id).toContain('pred-');
    expect(prediction.expectedOutcome).toBe('PASS');
    expect(prediction.confidence).toBe(0.9);
  });

  it('should evaluate a correct prediction with 0 error', () => {
    const prediction = engine.makePrediction('PASS', 0.9, 'test-rule');
    const result = createMockResult(true);

    const learningEvent = engine.evaluatePrediction(prediction.id, result);

    expect(learningEvent.actualOutcome).toBe('PASS');
    expect(learningEvent.error).toBe(0);
    expect(learningEvent.insight.recommendation).toBe('MAINTAIN');
  });

  it('should evaluate a failed prediction with high error and recommend revision', () => {
    const prediction = engine.makePrediction('PASS', 0.9, 'test-rule'); // High confidence
    const result = createMockResult(false); // Reality contradicts

    const learningEvent = engine.evaluatePrediction(prediction.id, result);

    expect(learningEvent.actualOutcome).toBe('FAIL');
    expect(learningEvent.error).toBe(0.9); // Error matches confidence of failed prediction
    expect(learningEvent.insight.recommendation).toBe('IMMEDIATE_REVISION_REQUIRED');
  });

  it('should throw an error if prediction does not exist', () => {
    const result = createMockResult(true);
    expect(() => engine.evaluatePrediction('nonexistent', result)).toThrow();
  });
});
