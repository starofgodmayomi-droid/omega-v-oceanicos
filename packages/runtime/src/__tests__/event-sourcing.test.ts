import {
  EventStore,
  EventAggregate,
  CommandBus,
  EventProjection,
  SagaOrchestrator,
  EventReplayer,
  DomainEvent,
} from '../event-sourcing';

describe('Event Sourcing & CQRS', () => {
  describe('EventStore', () => {
    let eventStore: EventStore;

    beforeEach(() => {
      eventStore = new EventStore();
    });

    afterEach(async () => {
      await eventStore.clear();
    });

    it('should append event to store', async () => {
      const event: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: { name: 'test' },
      };

      await eventStore.append(event);
      const events = await eventStore.getEvents('agg1');

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('Created');
    });

    it('should retrieve events by aggregate ID', async () => {
      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: { name: 'test1' },
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Updated',
        version: 0,
        timestamp: Date.now(),
        data: { name: 'test2' },
      };

      await eventStore.append(event1);
      await eventStore.append(event2);

      const events = await eventStore.getEvents('agg1');
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('Created');
      expect(events[1].type).toBe('Updated');
    });

    it('should retrieve events from specific version', async () => {
      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Updated',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      await eventStore.append(event1);
      await eventStore.append(event2);

      const events = await eventStore.getEvents('agg1', 1);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('Updated');
    });

    it('should create and retrieve snapshots', async () => {
      await eventStore.createSnapshot('agg1', 'TestAggregate', { state: 'active' }, 5);
      const snapshot = await eventStore.getSnapshot('agg1');

      expect(snapshot).toBeDefined();
      expect(snapshot?.version).toBe(5);
      expect(snapshot?.state.state).toBe('active');
    });

    it('should query events by type', async () => {
      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg2',
        aggregateType: 'TestAggregate',
        type: 'Updated',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      await eventStore.append(event1);
      await eventStore.append(event2);

      const createdEvents = await eventStore.queryByType('Created');
      expect(createdEvents.length).toBeGreaterThan(0);
      expect(createdEvents.every((e) => e.type === 'Created')).toBe(true);
    });

    it('should query events by aggregate type', async () => {
      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg2',
        aggregateType: 'OtherAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      await eventStore.append(event1);
      await eventStore.append(event2);

      const testAggEvents = await eventStore.queryByAggregateType('TestAggregate');
      expect(testAggEvents.every((e) => e.aggregateType === 'TestAggregate')).toBe(true);
    });

    it('should subscribe to events', (done) => {
      const unsubscribe = eventStore.subscribe('Created', (event) => {
        expect(event.type).toBe('Created');
        unsubscribe();
        done();
      });

      const event: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      eventStore.append(event).catch(done);
    });

    it('should support multiple subscribers', (done) => {
      let count = 0;

      eventStore.subscribe('Created', () => {
        count++;
        if (count === 2) done();
      });

      eventStore.subscribe('Created', () => {
        count++;
        if (count === 2) done();
      });

      const event: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      eventStore.append(event).catch(done);
    });

    it('should get all events', async () => {
      for (let i = 0; i < 5; i++) {
        const event: DomainEvent = {
          id: `evt${i}`,
          aggregateId: `agg${i}`,
          aggregateType: 'TestAggregate',
          type: 'Created',
          version: 0,
          timestamp: Date.now(),
          data: {},
        };
        await eventStore.append(event);
      }

      const allEvents = await eventStore.getAllEvents();
      expect(allEvents.length).toBeGreaterThanOrEqual(5);
    });

    it('should track event store statistics', async () => {
      const event: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: {},
      };

      await eventStore.append(event);
      const stats = eventStore.getStats();

      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.aggregateCount).toBeGreaterThan(0);
    });
  });

  describe('EventAggregate', () => {
    class TestAggregate extends EventAggregate {
      name: string = '';
      status: string = 'initial';

      protected handle(eventType: string, data: Record<string, any>): void {
        switch (eventType) {
          case 'Created':
            this.name = data.name;
            this.status = 'created';
            break;
          case 'Updated':
            this.name = data.name;
            break;
          case 'Archived':
            this.status = 'archived';
            break;
        }
      }

      create(name: string): void {
        this.recordEvent('Created', { name });
      }

      update(name: string): void {
        this.recordEvent('Updated', { name });
      }

      archive(): void {
        this.recordEvent('Archived', {});
      }
    }

    it('should create aggregate and record events', () => {
      const aggregate = new TestAggregate('agg1');
      aggregate.create('test');

      expect(aggregate.name).toBe('test');
      expect(aggregate.status).toBe('created');
      expect(aggregate.getChanges().length).toBe(1);
    });

    it('should apply multiple events', () => {
      const aggregate = new TestAggregate('agg1');
      aggregate.create('test');
      aggregate.update('updated');

      expect(aggregate.name).toBe('updated');
      expect(aggregate.getChanges().length).toBe(2);
    });

    it('should load from event history', async () => {
      const events = [
        {
          id: 'evt1',
          aggregateId: 'agg1',
          aggregateType: 'TestAggregate',
          type: 'Created',
          version: 1,
          timestamp: Date.now(),
          data: { name: 'test' },
        },
        {
          id: 'evt2',
          aggregateId: 'agg1',
          aggregateType: 'TestAggregate',
          type: 'Updated',
          version: 2,
          timestamp: Date.now(),
          data: { name: 'updated' },
        },
      ];

      const aggregate = new TestAggregate('agg1');
      await aggregate.loadFromHistory(events);

      expect(aggregate.name).toBe('updated');
      expect(aggregate.getVersion()).toBe(2);
    });

    it('should clear changes after commit', () => {
      const aggregate = new TestAggregate('agg1');
      aggregate.create('test');
      expect(aggregate.getChanges().length).toBe(1);

      aggregate.clearChanges();
      expect(aggregate.getChanges().length).toBe(0);
    });
  });

  describe('CommandBus', () => {
    class TestAggregate extends EventAggregate {
      data: string = '';

      protected handle(eventType: string, data: Record<string, any>): void {
        if (eventType === 'DataSet') {
          this.data = data.value;
        }
      }
    }

    let commandBus: CommandBus;

    beforeEach(() => {
      commandBus = new CommandBus();
    });

    it('should register and execute command handler', async () => {
      const aggregate = new TestAggregate('agg1');

      commandBus.registerHandler('SetData', async (command, agg) => {
        (agg as TestAggregate).recordEvent('DataSet', { value: command.value });
      });

      const events = await commandBus.execute('SetData', { value: 'test' }, aggregate);

      expect(events.length).toBe(1);
      expect(aggregate.data).toBe('test');
    });

    it('should throw error for unregistered command', async () => {
      const aggregate = new TestAggregate('agg1');

      await expect(commandBus.execute('UnknownCommand', {}, aggregate)).rejects.toThrow();
    });
  });

  describe('EventProjection', () => {
    let projection: EventProjection;

    beforeEach(() => {
      projection = new EventProjection();
    });

    afterEach(async () => {
      await projection.clear();
    });

    it('should handle event and update projection', async () => {
      projection.registerHandler('Created', (event, proj) => {
        proj.data.name = event.data.name;
        proj.data.status = 'created';
      });

      const event: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 1,
        timestamp: Date.now(),
        data: { name: 'test' },
      };

      await projection.handleEvent(event);
      const proj = projection.getProjection('TestAggregate:agg1');

      expect(proj?.data.name).toBe('test');
      expect(proj?.data.status).toBe('created');
    });

    it('should query projections by type', async () => {
      projection.registerHandler('Created', (event, proj) => {
        proj.data.created = true;
      });

      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 1,
        timestamp: Date.now(),
        data: {},
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg2',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 1,
        timestamp: Date.now(),
        data: {},
      };

      await projection.handleEvent(event1);
      await projection.handleEvent(event2);

      const projections = projection.getProjectionsByType('TestAggregate');
      expect(projections.length).toBe(2);
    });

    it('should query projections with predicate', async () => {
      projection.registerHandler('Created', (event, proj) => {
        proj.data.status = event.data.status;
      });

      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 1,
        timestamp: Date.now(),
        data: { status: 'active' },
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg2',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 1,
        timestamp: Date.now(),
        data: { status: 'inactive' },
      };

      await projection.handleEvent(event1);
      await projection.handleEvent(event2);

      const activeProjections = projection.queryProjections((p) => p.data.status === 'active');
      expect(activeProjections.length).toBe(1);
    });
  });

  describe('SagaOrchestrator', () => {
    let eventStore: EventStore;
    let orchestrator: SagaOrchestrator;

    beforeEach(() => {
      eventStore = new EventStore();
      orchestrator = new SagaOrchestrator(eventStore);
    });

    afterEach(async () => {
      await orchestrator.clear();
      await eventStore.clear();
    });

    it('should register and execute saga', async () => {
      const results: string[] = [];

      orchestrator.registerSaga('TestSaga', [
        {
          name: 'Step1',
          command: async (data) => {
            results.push('step1');
            return { ...data, step1: 'done' };
          },
          compensation: async () => {
            results.push('rollback1');
          },
        },
        {
          name: 'Step2',
          command: async (data) => {
            results.push('step2');
            return { ...data, step2: 'done' };
          },
          compensation: async () => {
            results.push('rollback2');
          },
        },
      ]);

      const sagaId = await orchestrator.startSaga('TestSaga', {});
      const instance = orchestrator.getInstance(sagaId);

      expect(results).toContain('step1');
      expect(results).toContain('step2');
      expect(instance?.status).toBe('completed');
    });

    it('should compensate on failure', async () => {
      const results: string[] = [];

      orchestrator.registerSaga('TestSaga', [
        {
          name: 'Step1',
          command: async (data) => {
            results.push('step1');
            return { ...data, step1: 'done' };
          },
          compensation: async () => {
            results.push('rollback1');
          },
        },
        {
          name: 'Step2',
          command: async () => {
            throw new Error('Step2 failed');
          },
          compensation: async () => {
            results.push('rollback2');
          },
        },
      ]);

      const sagaId = await orchestrator.startSaga('TestSaga', {});
      const instance = orchestrator.getInstance(sagaId);

      expect(results).toContain('step1');
      expect(results).toContain('rollback1');
      expect(instance?.status).toBe('failed');
    });

    it('should get instances by type', async () => {
      orchestrator.registerSaga('SagaA', [
        {
          name: 'Step1',
          command: async (data) => data,
          compensation: async () => {},
        },
      ]);

      orchestrator.registerSaga('SagaB', [
        {
          name: 'Step1',
          command: async (data) => data,
          compensation: async () => {},
        },
      ]);

      await orchestrator.startSaga('SagaA', {});
      await orchestrator.startSaga('SagaB', {});
      await orchestrator.startSaga('SagaA', {});

      const sagaAInstances = orchestrator.getInstancesByType('SagaA');
      expect(sagaAInstances.length).toBe(2);
    });
  });

  describe('EventReplayer', () => {
    let eventStore: EventStore;
    let replayer: EventReplayer;

    class TestAggregate extends EventAggregate {
      name: string = '';

      protected handle(eventType: string, data: Record<string, any>): void {
        if (eventType === 'Created') {
          this.name = data.name;
        }
      }
    }

    beforeEach(async () => {
      eventStore = new EventStore();
      replayer = new EventReplayer(eventStore);
    });

    afterEach(async () => {
      await eventStore.clear();
    });

    it('should replay aggregate from event history', async () => {
      const event: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: { name: 'test' },
      };

      await eventStore.append(event);

      const aggregate = await replayer.replayAggregate(TestAggregate, 'agg1');
      expect(aggregate.name).toBe('test');
    });

    it('should replay all aggregates', async () => {
      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: { name: 'test1' },
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg2',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: Date.now(),
        data: { name: 'test2' },
      };

      await eventStore.append(event1);
      await eventStore.append(event2);

      const aggregates = await replayer.replayAll((id) => new TestAggregate(id));

      expect(aggregates.size).toBeGreaterThanOrEqual(2);
    });

    it('should replay events until timestamp', async () => {
      const now = Date.now();

      const event1: DomainEvent = {
        id: 'evt1',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: now - 1000,
        data: { name: 'original' },
      };

      const event2: DomainEvent = {
        id: 'evt2',
        aggregateId: 'agg1',
        aggregateType: 'TestAggregate',
        type: 'Created',
        version: 0,
        timestamp: now + 1000,
        data: { name: 'updated' },
      };

      await eventStore.append(event1);
      await eventStore.append(event2);

      const aggregate = new TestAggregate('agg1');
      await replayer.replayUntil('agg1', now, aggregate);

      expect(aggregate.name).toBe('original');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete event sourcing workflow', async () => {
      const eventStore = new EventStore();
      const replayer = new EventReplayer(eventStore);
      const projection = new EventProjection();

      class Account extends EventAggregate {
        balance: number = 0;

        protected handle(eventType: string, data: Record<string, any>): void {
          if (eventType === 'Deposited') {
            this.balance += data.amount;
          }
          if (eventType === 'Withdrawn') {
            this.balance -= data.amount;
          }
        }

        deposit(amount: number): void {
          this.recordEvent('Deposited', { amount });
        }

        withdraw(amount: number): void {
          this.recordEvent('Withdrawn', { amount });
        }
      }

      projection.registerHandler('Deposited', (event, proj) => {
        proj.data.balance = (proj.data.balance || 0) + event.data.amount;
      });

      projection.registerHandler('Withdrawn', (event, proj) => {
        proj.data.balance = (proj.data.balance || 0) - event.data.amount;
      });

      const account = new Account('account1');
      account.deposit(100);
      account.withdraw(30);

      for (const event of account.getChanges()) {
        await eventStore.append(event);
        await projection.handleEvent(event);
      }

      const proj = projection.getProjection('Account:account1');
      expect(proj?.data.balance).toBe(70);

      const replayedAccount = await replayer.replayAggregate(Account, 'account1');
      expect(replayedAccount.balance).toBe(70);
    });
  });
});
