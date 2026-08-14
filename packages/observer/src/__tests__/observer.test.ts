import { Observer } from '../index';
import { Observation } from '@omega-v/types';

describe('Observer', () => {
  let observer: Observer;

  beforeEach(() => {
    observer = new Observer(60000);
  });

  describe('observe()', () => {
    it('creates a normalized observation from a claim', () => {
      const result = observer.observe({
        claim: 'Service is healthy',
        category: 'health-check',
        source: {
          system: 'test-system',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test-observer',
        metadata: { responseTime: 100, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Test observation',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^obs-/);
      expect(result.claim.statement).toBe('Service is healthy');
      expect(result.claim.category).toBe('health-check');
      expect(result.status).toBe('normalized');
      expect(result.confidence).toBe(0.95);
      expect(result.timestamp).toBeDefined();
    });

    it('validates required fields', () => {
      expect(() => {
        observer.observe({
          claim: '',
          source: { system: 'test', version: '1.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'test',
        });
      }).toThrow();

      expect(() => {
        observer.observe({
          claim: 'test',
          source: { system: '', version: '1.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'test',
        });
      }).toThrow();

      expect(() => {
        observer.observe({
          claim: 'test',
          source: { system: 'test', version: '1.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: '',
        });
      }).toThrow();
    });

    it('clamps confidence to 0-1 range', () => {
      const highConfidence = observer.observe({
        claim: 'test',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 1.5,
        confidenceReason: 'test',
      });
      expect(highConfidence.confidence).toBe(1);

      const lowConfidence = observer.observe({
        claim: 'test 2',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: -0.5,
        confidenceReason: 'test',
      });
      expect(lowConfidence.confidence).toBe(0);
    });

    it('generates unique IDs for each observation', () => {
      const obs1 = observer.observe({
        claim: 'claim 1',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      const obs2 = observer.observe({
        claim: 'claim 2',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      expect(obs1.id).not.toBe(obs2.id);
    });

    it('detects duplicate observations within deduplication window', () => {
      const obs1 = observer.observe({
        claim: 'duplicate test',
        source: { system: 'test-sys', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: { value: 1 },
        confidence: 0.9,
        confidenceReason: 'test',
      });

      const obs2 = observer.observe({
        claim: 'duplicate test',
        source: { system: 'test-sys', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: { value: 2 },
        confidence: 0.8,
        confidenceReason: 'test',
      });

      expect(obs2.metadata.deduplicated).toBe(true);
      expect(obs2.metadata.originalId).toBe(obs1.id);
      expect(obs2.id).toBe(obs1.id);
    });

    it('does not deduplicate observations from different systems', () => {
      const obs1 = observer.observe({
        claim: 'same claim',
        source: { system: 'system-a', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      const obs2 = observer.observe({
        claim: 'same claim',
        source: { system: 'system-b', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      expect(obs1.id).not.toBe(obs2.id);
      expect(obs2.metadata.deduplicated).not.toBe(true);
    });

    it('uses provided category or defaults to unknown', () => {
      const withCategory = observer.observe({
        claim: 'test',
        category: 'custom-category',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });
      expect(withCategory.claim.category).toBe('custom-category');

      const withoutCategory = observer.observe({
        claim: 'test 2',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });
      expect(withoutCategory.claim.category).toBe('unknown');
    });

    it('preserves metadata through observation', () => {
      const metadata = {
        responseTime: 42,
        statusCode: 200,
        customField: 'custom-value',
      };

      const result = observer.observe({
        claim: 'test',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata,
        confidence: 0.9,
        confidenceReason: 'test',
      });

      expect(result.metadata).toEqual(metadata);
    });

    it('sets timestamp to current time', () => {
      const before = new Date().toISOString();
      const result = observer.observe({
        claim: 'test',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });
      const after = new Date().toISOString();

      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  describe('getCacheStats()', () => {
    it('returns cache statistics', () => {
      observer.observe({
        claim: 'test',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      const stats = observer.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.windowMs).toBe(60000);
    });

    it('tracks multiple cache entries', () => {
      observer.observe({
        claim: 'claim 1',
        source: { system: 'sys1', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      observer.observe({
        claim: 'claim 2',
        source: { system: 'sys2', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      const stats = observer.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('deduplication window expiry', () => {
    it('expires old cache entries after deduplication window', async () => {
      const shortWindowObserver = new Observer(100);

      const obs1 = shortWindowObserver.observe({
        claim: 'will expire',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const obs2 = shortWindowObserver.observe({
        claim: 'will expire',
        source: { system: 'test', version: '1.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'test',
      });

      expect(obs1.id).not.toBe(obs2.id);
      expect(obs2.metadata.deduplicated).not.toBe(true);
    });
  });
});
