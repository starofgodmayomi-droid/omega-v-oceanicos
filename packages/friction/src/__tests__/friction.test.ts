import { FrictionTracker } from '../index';

describe('FrictionTracker (Pillars 20-21)', () => {
  let tracker: FrictionTracker;

  beforeEach(() => {
    tracker = new FrictionTracker();
  });

  describe('Friction Lifecycle (Pillar 20)', () => {
    it('should record friction events with OPEN status', () => {
      const event = tracker.record({
        category: 'LATENCY',
        source: 'api-gateway',
        description: 'Response time exceeded 500ms threshold',
        evidence: ['log-entry-442', 'metric-snapshot-88'],
        severity: 'warning',
      });

      expect(event.id).toMatch(/^friction-/);
      expect(event.status).toBe('OPEN');
      expect(event.category).toBe('LATENCY');
      expect(event.evidence).toHaveLength(2);
    });

    it('should transition OPEN → DIAGNOSED → RESOLVED → LEARNING', () => {
      const event = tracker.record({
        category: 'ERROR',
        source: 'verification-engine',
        description: 'Rule compilation failed for malformed expression',
      });

      expect(event.status).toBe('OPEN');

      const diagnosed = tracker.diagnose(event.id, 'Missing operator between field and value');
      expect(diagnosed?.status).toBe('DIAGNOSED');
      expect(diagnosed?.diagnosis).toBe('Missing operator between field and value');

      const resolved = tracker.resolve(event.id, 'Added syntax validation in compiler tokenizer');
      expect(resolved?.status).toBe('RESOLVED');

      const learning = tracker.learn(event.id);
      expect(learning?.status).toBe('LEARNING');
    });

    it('should query friction by status and category', () => {
      tracker.record({ category: 'LATENCY', source: 'a', description: 'slow' });
      tracker.record({ category: 'ERROR', source: 'b', description: 'crash' });
      tracker.record({ category: 'LATENCY', source: 'c', description: 'timeout' });

      expect(tracker.getFriction({ category: 'LATENCY' })).toHaveLength(2);
      expect(tracker.getFriction({ status: 'OPEN' })).toHaveLength(3);
    });
  });

  describe('Dissent (Pillar 21)', () => {
    it('should record dissent with multiple interpretations', () => {
      const dissent = tracker.recordDissent('claim-42', [
        {
          position: 'System latency is within acceptable range',
          source: 'monitoring-agent',
          evidence: ['metric-p99-42ms'],
          confidence: 0.85,
        },
        {
          position: 'System latency is degraded and trending upward',
          source: 'anomaly-detector',
          evidence: ['trend-analysis-7d', 'alert-threshold-breach'],
          confidence: 0.72,
        },
      ]);

      expect(dissent.id).toMatch(/^dissent-/);
      expect(dissent.status).toBe('OPEN');
      expect(dissent.interpretations).toHaveLength(2);
      expect(dissent.interpretations[0].confidence).toBe(0.85);
      expect(dissent.interpretations[1].confidence).toBe(0.72);
    });

    it('should resolve dissent without suppressing minority positions', () => {
      const dissent = tracker.recordDissent('claim-99', [
        { position: 'A', source: 's1', evidence: [], confidence: 0.9 },
        { position: 'B', source: 's2', evidence: [], confidence: 0.3 },
      ]);

      const resolved = tracker.resolveDissent(dissent.id);
      expect(resolved?.status).toBe('RESOLVED');
      // Both interpretations preserved — minority not suppressed
      expect(resolved?.interpretations).toHaveLength(2);
    });
  });

  describe('Metrics', () => {
    it('should compute friction and dissent metrics', () => {
      tracker.record({ category: 'ERROR', source: 'a', description: 'err' });
      tracker.record({ category: 'LATENCY', source: 'b', description: 'slow' });
      const e3 = tracker.record({
        category: 'CONTRADICTION',
        source: 'c',
        description: 'conflict',
      });
      tracker.diagnose(e3.id, 'conflicting evidence');
      tracker.recordDissent('claim-1', [
        { position: 'X', source: 's', evidence: [], confidence: 0.8 },
        { position: 'Y', source: 's', evidence: [], confidence: 0.5 },
      ]);

      const m = tracker.getMetrics();
      expect(m.totalFriction).toBe(3);
      expect(m.open).toBe(2);
      expect(m.diagnosed).toBe(1);
      expect(m.totalDissent).toBe(1);
      expect(m.openDissent).toBe(1);
    });
  });
});
