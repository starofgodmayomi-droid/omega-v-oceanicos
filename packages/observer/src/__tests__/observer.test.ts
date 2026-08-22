import { Observer } from '@omega-v/observer';

describe('Observer', () => {
  let observer: Observer;

  beforeEach(() => {
    observer = new Observer(5000); // 5 second deduplication window
  });

  describe('Basic Observation', () => {
    it('should create a normalized observation from a claim', () => {
      const observation = observer.observe({
        claim: 'Service X returned HTTP 200',
        category: 'health-check',
        source: {
          system: 'health-check-api',
          version: '1.2.3',
          environment: 'production',
        },
        observedBy: 'monitoring-system',
        metadata: {
          statusCode: 200,
          responseTime: 45,
        },
        confidence: 0.95,
        confidenceReason: '3 consecutive successful checks',
      });

      expect(observation).toBeDefined();
      expect(observation.id).toMatch(/^obs-/);
      expect(observation.status).toBe('normalized');
      expect(observation.claim.statement).toBe('Service X returned HTTP 200');
      expect(observation.confidence).toBe(0.95);
    });

    it('preserves bounded parent and lineage provenance', () => {
      const observation = observer.observe({
        claim: 'Child state follows parent state',
        source: { system: 'lineage-test', version: '1.0.0', environment: 'test' },
        observedBy: 'test-observer',
        metadata: {},
        confidence: 0.8,
        confidenceReason: 'Lineage fixture',
        parentId: 'obs-parent-1',
        lineage: ['obs-root-1', 'obs-parent-1'],
      });
      expect(observation.parentId).toBe('obs-parent-1');
      expect(observation.lineage).toEqual(['obs-root-1', 'obs-parent-1']);
    });

    it('rejects invalid or oversized lineage provenance', () => {
      expect(() =>
        observer.observe({
          claim: 'Invalid lineage',
          source: { system: 'lineage-test', version: '1.0.0', environment: 'test' },
          observedBy: 'test-observer',
          metadata: {},
          confidence: 0.8,
          confidenceReason: 'Invalid fixture',
          lineage: Array.from({ length: 33 }, (_, index) => `obs-${index}`),
        })
      ).toThrow('lineage must contain at most 32');
    });

    it('should include timestamp in ISO format', () => {
      const before = new Date();
      const observation = observer.observe({
        claim: 'Test claim',
        source: {
          system: 'test-system',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test-observer',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });
      const after = new Date();

      const obsTime = new Date(observation.timestamp);
      expect(obsTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(obsTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Input Validation', () => {
    it('should reject missing claim', () => {
      expect(() => {
        observer.observe({
          claim: '',
          source: {
            system: 'test',
            version: '1.0.0',
            environment: 'test',
          },
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: 'Test',
        });
      }).toThrow('Observation validation failed');
    });

    it('should reject missing confidenceReason', () => {
      expect(() => {
        observer.observe({
          claim: 'Test',
          source: {
            system: 'test',
            version: '1.0.0',
            environment: 'test',
          },
          observedBy: 'test',
          metadata: {},
          confidence: 0.9,
          confidenceReason: '',
        });
      }).toThrow('Observation validation failed');
    });
  });

  describe('Confidence Clamping', () => {
    it('should clamp confidence to 1.0 if exceeds', () => {
      const observation = observer.observe({
        claim: 'Test',
        source: {
          system: 'test',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test',
        metadata: {},
        confidence: 1.5,
        confidenceReason: 'Test',
      });

      expect(observation.confidence).toBe(1.0);
    });

    it('should clamp confidence to 0.0 if negative', () => {
      const observation = observer.observe({
        claim: 'Test',
        source: {
          system: 'test',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test',
        metadata: {},
        confidence: -0.5,
        confidenceReason: 'Test',
      });

      expect(observation.confidence).toBe(0.0);
    });
  });

  describe('Deduplication', () => {
    it('should identify duplicate observations', () => {
      const claim = 'Service is healthy';
      const source = {
        system: 'health-check-api',
        version: '1.2.3',
        environment: 'production',
      };

      const obs1 = observer.observe({
        claim,
        source,
        observedBy: 'test',
        metadata: { attempt: 1 },
        confidence: 0.95,
        confidenceReason: 'First check',
      });

      const obs2 = observer.observe({
        claim,
        source,
        observedBy: 'test',
        metadata: { attempt: 2 },
        confidence: 0.96,
        confidenceReason: 'Second check',
      });

      // Should have same ID (deduplicated)
      expect(obs2.id).toBe(obs1.id);
      expect(obs2.metadata.deduplicated).toBe(true);
    });

    it('should not deduplicate different claims', () => {
      const source = {
        system: 'test',
        version: '1.0.0',
        environment: 'test',
      };

      const obs1 = observer.observe({
        claim: 'Claim A',
        source,
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const obs2 = observer.observe({
        claim: 'Claim B',
        source,
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      expect(obs1.id).not.toBe(obs2.id);
    });

    it('should not deduplicate from different systems', () => {
      const claim = 'Test claim';

      const obs1 = observer.observe({
        claim,
        source: {
          system: 'system-a',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const obs2 = observer.observe({
        claim,
        source: {
          system: 'system-b',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      expect(obs1.id).not.toBe(obs2.id);
    });
  });

  describe('Cache Statistics', () => {
    it('should report cache size', () => {
      observer.observe({
        claim: 'Test 1',
        source: {
          system: 'test',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      observer.observe({
        claim: 'Test 2',
        source: {
          system: 'test',
          version: '1.0.0',
          environment: 'test',
        },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      const stats = observer.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.windowMs).toBe(5000);
    });
  });

  describe('Default Construction', () => {
    it('falls back to a 60 second deduplication window when none is given', () => {
      // Every other Observer in this file is constructed with an explicit
      // window (5000 or 50 ms), so the constructor's own default value had
      // never actually been the one supplying the window.
      const defaultObserver = new Observer();

      expect(defaultObserver.getCacheStats().windowMs).toBe(60000);
    });
  });

  describe('Deduplication Window Expiry', () => {
    const base = {
      source: { system: 'expiry-test', version: '1.0.0', environment: 'test' },
      observedBy: 'test',
      metadata: {},
      confidence: 0.9,
      confidenceReason: 'Test',
    };

    it('stops deduplicating once the window has elapsed', async () => {
      const shortWindow = new Observer(50);

      const first = shortWindow.observe({ claim: 'will expire', ...base });
      await new Promise((resolve) => setTimeout(resolve, 120));
      const second = shortWindow.observe({ claim: 'will expire', ...base });

      expect(second.id).not.toBe(first.id);
      expect(second.metadata.deduplicated).not.toBe(true);
    });

    it('evicts expired entries so the cache does not grow unbounded', async () => {
      const shortWindow = new Observer(50);

      shortWindow.observe({ claim: 'entry one', ...base });
      shortWindow.observe({ claim: 'entry two', ...base });
      expect(shortWindow.getCacheStats().size).toBe(2);

      await new Promise((resolve) => setTimeout(resolve, 120));
      shortWindow.observe({ claim: 'entry three', ...base });

      expect(shortWindow.getCacheStats().size).toBeLessThan(3);
      expect(shortWindow.getCacheStats().windowMs).toBe(50);
    });
  });

  describe('Validation Error Detail', () => {
    const valid = {
      claim: 'Test claim',
      source: { system: 'test', version: '1.0.0', environment: 'test' },
      observedBy: 'test',
      metadata: {},
      confidence: 0.9,
      confidenceReason: 'Test',
    };

    it('names source.system when it is missing', () => {
      expect(() =>
        observer.observe({
          ...valid,
          source: { system: '', version: '1.0.0', environment: 'test' },
        })
      ).toThrow('source.system is required');
    });

    it('names confidence when it is not a number', () => {
      expect(() =>
        observer.observe({ ...valid, confidence: undefined as unknown as number })
      ).toThrow('confidence is required and must be a number');
    });

    it('rejects a blank parentId rather than recording a broken lineage link', () => {
      // The lineage fixture above always supplies a real parentId. A
      // caller-supplied but empty parentId is a distinct, reachable case:
      // the field was named but points at nothing, which would break the
      // provenance chain silently if it were accepted.
      expect(() =>
        observer.observe({
          ...valid,
          parentId: '   ',
        })
      ).toThrow('parentId must be a non-empty string when provided');
    });

    it('reports every failing field at once, not just the first', () => {
      expect(() =>
        observer.observe({
          claim: '',
          source: { system: '', version: '1.0.0', environment: 'test' },
          observedBy: 'test',
          metadata: {},
          confidence: undefined as unknown as number,
          confidenceReason: '',
        })
      ).toThrow(
        /claim is required.*source\.system is required.*confidence is required.*confidenceReason is required/s
      );
    });
  });

  describe('Category Defaulting', () => {
    it('defaults an omitted category to unknown', () => {
      const result = observer.observe({
        claim: 'no category given',
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
      });

      expect(result.claim.category).toBe('unknown');
    });
  });
});
