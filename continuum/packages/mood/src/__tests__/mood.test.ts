import { MoodEvaluator } from '../index';

describe('MoodEvaluator (Pillar 19)', () => {
  let evaluator: MoodEvaluator;

  beforeEach(() => {
    evaluator = new MoodEvaluator();
  });

  it('should evaluate HIGH_INTEGRITY state when metrics are strong and chain is valid', () => {
    const mood = evaluator.evaluate(
      {
        totalObservations: 10,
        totalVerifications: 10,
        avgVerificationTime: 20,
        successRate: 1.0,
        totalAttestations: 10,
        systemConfidence: 0.95,
        lastUpdated: new Date().toISOString(),
      },
      true
    );

    expect(mood.state).toBe('HIGH_INTEGRITY');
    expect(mood.confidence).toBe(0.95);
    expect(mood.uncertainty).toBe(0.05);
    expect(mood.verificationHealth).toBe(1.0);
  });

  it('should evaluate FRICTION_DETECTED state when hash chain integrity is broken', () => {
    const mood = evaluator.evaluate(
      {
        totalObservations: 5,
        totalVerifications: 5,
        avgVerificationTime: 20,
        successRate: 1.0,
        totalAttestations: 5,
        systemConfidence: 0.9,
        lastUpdated: new Date().toISOString(),
      },
      false
    );

    expect(mood.state).toBe('FRICTION_DETECTED');
    expect(mood.description).toContain('Friction detected');
  });

  it('should evaluate RECOMPILING state when dissent count is elevated', () => {
    const mood = evaluator.evaluate(
      {
        totalObservations: 5,
        totalVerifications: 5,
        avgVerificationTime: 20,
        successRate: 0.9,
        totalAttestations: 5,
        systemConfidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      true,
      3
    );

    expect(mood.state).toBe('RECOMPILING');
  });
});
