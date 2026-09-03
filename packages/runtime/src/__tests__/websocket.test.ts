import {
  EventBroadcaster,
  VerificationEvent,
  createMessage,
  parseFilter,
  generateEventId,
} from '../websocket';

describe('WebSocket Event Broadcasting', () => {
  describe('EventBroadcaster', () => {
    let broadcaster: EventBroadcaster;

    beforeEach(() => {
      broadcaster = new EventBroadcaster();
    });

    it('should create broadcaster instance', () => {
      expect(broadcaster).toBeDefined();
      expect(broadcaster.getMetrics().activeSubscribers).toBe(0);
    });

    it('should subscribe and unsubscribe', () => {
      let called = false;
      const unsubscribe = broadcaster.subscribe('test-1', () => {
        called = true;
      });

      expect(broadcaster.getMetrics().activeSubscribers).toBe(1);

      unsubscribe();
      expect(broadcaster.getMetrics().activeSubscribers).toBe(0);
    });

    it('should publish events to subscribers', async () => {
      const events: VerificationEvent[] = [];
      broadcaster.subscribe('test-1', (event) => {
        events.push(event);
      });

      const testEvent: VerificationEvent = {
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-123',
        data: { claim: 'test' },
      };

      broadcaster.publish(testEvent);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('obs-123');
    });

    it('should publish to multiple subscribers', () => {
      const events1: VerificationEvent[] = [];
      const events2: VerificationEvent[] = [];

      broadcaster.subscribe('test-1', (event) => events1.push(event));
      broadcaster.subscribe('test-2', (event) => events2.push(event));

      const testEvent: VerificationEvent = {
        type: 'verification',
        timestamp: new Date().toISOString(),
        id: 'ver-123',
        data: { passed: true },
      };

      broadcaster.publish(testEvent);

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });

    it('should filter events based on subscriber filter', () => {
      const events: VerificationEvent[] = [];

      broadcaster.subscribe(
        'test-1',
        (event) => events.push(event),
        (event) => event.type === 'observation'
      );

      const obsEvent: VerificationEvent = {
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-123',
        data: {},
      };

      const verEvent: VerificationEvent = {
        type: 'verification',
        timestamp: new Date().toISOString(),
        id: 'ver-123',
        data: {},
      };

      broadcaster.publish(obsEvent);
      broadcaster.publish(verEvent);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('observation');
    });

    it('should maintain event history', () => {
      for (let i = 0; i < 5; i++) {
        broadcaster.publish({
          type: 'observation',
          timestamp: new Date().toISOString(),
          id: `obs-${i}`,
          data: {},
        });
      }

      const history = broadcaster.getHistory();
      expect(history.length).toBe(5);
    });

    it('should limit history size', () => {
      const smallBroadcaster = new EventBroadcaster(3);

      for (let i = 0; i < 5; i++) {
        smallBroadcaster.publish({
          type: 'observation',
          timestamp: new Date().toISOString(),
          id: `obs-${i}`,
          data: {},
        });
      }

      const history = smallBroadcaster.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].id).toBe('obs-2');
    });

    it('should get history by type', () => {
      broadcaster.publish({
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
      });
      broadcaster.publish({
        type: 'verification',
        timestamp: new Date().toISOString(),
        id: 'ver-1',
        data: {},
      });
      broadcaster.publish({
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-2',
        data: {},
      });

      const obsHistory = broadcaster.getHistoryByType('observation');
      expect(obsHistory).toHaveLength(2);
      expect(obsHistory.every((e) => e.type === 'observation')).toBe(true);
    });

    it('should track metrics', () => {
      broadcaster.subscribe('test-1', () => {});
      broadcaster.publish({
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
      });

      const metrics = broadcaster.getMetrics();
      expect(metrics.eventsPublished).toBe(1);
      expect(metrics.activeSubscribers).toBe(1);
      expect(metrics.historySize).toBe(1);
    });

    it('should clear history', () => {
      broadcaster.publish({
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
      });

      expect(broadcaster.getHistory()).toHaveLength(1);

      broadcaster.clear();

      expect(broadcaster.getHistory()).toHaveLength(0);
    });

    it('should handle subscriber errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      broadcaster.subscribe('test-1', () => {
        throw new Error('Subscriber error');
      });

      expect(() => {
        broadcaster.publish({
          type: 'observation',
          timestamp: new Date().toISOString(),
          id: 'obs-1',
          data: {},
        });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Message Creation', () => {
    it('should create message with type and payload', () => {
      const msg = createMessage('subscribe', { filter: 'type:observation' });

      expect(msg.type).toBe('subscribe');
      expect(msg.payload.filter).toBe('type:observation');
      expect(msg.timestamp).toBeDefined();
    });

    it('should create message without payload', () => {
      const msg = createMessage('metrics');

      expect(msg.type).toBe('metrics');
      expect(msg.payload).toBeUndefined();
      expect(msg.timestamp).toBeDefined();
    });
  });

  describe('Filter Parsing', () => {
    it('should parse type filter', () => {
      const filter = parseFilter('type:observation');

      const obsEvent: VerificationEvent = {
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
      };

      const verEvent: VerificationEvent = {
        type: 'verification',
        timestamp: new Date().toISOString(),
        id: 'ver-1',
        data: {},
      };

      expect(filter!(obsEvent)).toBe(true);
      expect(filter!(verEvent)).toBe(false);
    });

    it('should parse source filter', () => {
      const filter = parseFilter('source:api');

      const apiEvent: VerificationEvent = {
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
        source: 'api',
      };

      const runtimeEvent: VerificationEvent = {
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-2',
        data: {},
        source: 'runtime',
      };

      expect(filter!(apiEvent)).toBe(true);
      expect(filter!(runtimeEvent)).toBe(false);
    });

    it('should parse multiple filters (OR logic)', () => {
      const filter = parseFilter('type:observation,type:verification');

      const obsEvent: VerificationEvent = {
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
      };

      const verEvent: VerificationEvent = {
        type: 'verification',
        timestamp: new Date().toISOString(),
        id: 'ver-1',
        data: {},
      };

      const errEvent: VerificationEvent = {
        type: 'error',
        timestamp: new Date().toISOString(),
        id: 'err-1',
        data: {},
      };

      expect(filter!(obsEvent)).toBe(true);
      expect(filter!(verEvent)).toBe(true);
      expect(filter!(errEvent)).toBe(false);
    });

    it('should return undefined for no filter', () => {
      const filter = parseFilter();

      expect(filter).toBeUndefined();
    });

    it('should return undefined for empty filter string', () => {
      const filter = parseFilter('');

      expect(filter).toBeUndefined();
    });
  });

  describe('Event ID Generation', () => {
    it('should generate event IDs', () => {
      const id = generateEventId();

      expect(id).toBeDefined();
      expect(id.startsWith('evt-')).toBe(true);
    });

    it('should generate unique event IDs', () => {
      const ids = new Set();

      for (let i = 0; i < 10; i++) {
        ids.add(generateEventId());
      }

      expect(ids.size).toBe(10);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid event publishing', () => {
      const broadcaster = new EventBroadcaster();
      const events: VerificationEvent[] = [];

      broadcaster.subscribe('test-1', (event) => events.push(event));

      for (let i = 0; i < 100; i++) {
        broadcaster.publish({
          type: 'observation',
          timestamp: new Date().toISOString(),
          id: `obs-${i}`,
          data: { index: i },
        });
      }

      expect(events).toHaveLength(100);
      expect(broadcaster.getMetrics().eventsPublished).toBe(100);
    });

    it('should handle selective filtering in multi-subscriber scenario', () => {
      const broadcaster = new EventBroadcaster();
      const obsEvents: VerificationEvent[] = [];
      const verEvents: VerificationEvent[] = [];

      broadcaster.subscribe(
        'obs-sub',
        (event) => obsEvents.push(event),
        (event) => event.type === 'observation'
      );
      broadcaster.subscribe(
        'ver-sub',
        (event) => verEvents.push(event),
        (event) => event.type === 'verification'
      );

      broadcaster.publish({
        type: 'observation',
        timestamp: new Date().toISOString(),
        id: 'obs-1',
        data: {},
      });

      broadcaster.publish({
        type: 'verification',
        timestamp: new Date().toISOString(),
        id: 'ver-1',
        data: {},
      });

      expect(obsEvents).toHaveLength(1);
      expect(verEvents).toHaveLength(1);
    });
  });
});
