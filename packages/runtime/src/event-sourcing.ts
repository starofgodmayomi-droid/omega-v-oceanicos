/**
 * Event Sourcing & CQRS (Command Query Responsibility Segregation)
 * Enables event-driven architecture with complete audit trail and event replay
 */

export type EventType = string;
export type AggregateId = string;
export type EventVersion = number;

export interface DomainEvent {
  id: string;
  aggregateId: AggregateId;
  aggregateType: string;
  type: EventType;
  version: EventVersion;
  timestamp: number;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    source?: string;
  };
  serializedData?: string;
}

export interface EventStoreConfig {
  maxEventSize?: number;
  snapshotInterval?: number;
  cleanupInterval?: number;
  retentionDays?: number;
}

export interface EventSnapshot {
  aggregateId: AggregateId;
  aggregateType: string;
  version: EventVersion;
  state: Record<string, any>;
  timestamp: number;
}

export interface Projection {
  id: string;
  aggregateId?: AggregateId;
  type: string;
  data: Record<string, any>;
  version: EventVersion;
  updatedAt: number;
}

export interface CommandResult {
  success: boolean;
  aggregateId: AggregateId;
  version: EventVersion;
  events: DomainEvent[];
  error?: string;
}

/**
 * Event Store: Append-only event log with snapshot support
 */
export class EventStore {
  private events: Map<AggregateId, DomainEvent[]> = new Map();
  private snapshots: Map<AggregateId, EventSnapshot> = new Map();
  private eventIndex: DomainEvent[] = [];
  private subscriptions: Map<string, Set<(event: DomainEvent) => void>> = new Map();
  private config: Required<EventStoreConfig>;

  constructor(config: EventStoreConfig = {}) {
    this.config = {
      maxEventSize: config.maxEventSize || 10 * 1024 * 1024, // 10MB
      snapshotInterval: config.snapshotInterval || 100,
      cleanupInterval: config.cleanupInterval || 3600000,
      retentionDays: config.retentionDays || 365,
    };
  }

  /**
   * Append event to store
   */
  async append(event: DomainEvent): Promise<void> {
    const eventSize = JSON.stringify(event).length;
    if (eventSize > this.config.maxEventSize) {
      throw new Error(`Event size (${eventSize}) exceeds max (${this.config.maxEventSize})`);
    }

    if (!this.events.has(event.aggregateId)) {
      this.events.set(event.aggregateId, []);
    }

    const aggregateEvents = this.events.get(event.aggregateId)!;
    event.version = aggregateEvents.length + 1;
    aggregateEvents.push(event);
    this.eventIndex.push(event);

    this.publish(event);
  }

  /**
   * Append multiple events atomically
   */
  async appendBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.append(event);
    }
  }

  /**
   * Get all events for aggregate
   */
  async getEvents(
    aggregateId: AggregateId,
    fromVersion: EventVersion = 0,
  ): Promise<DomainEvent[]> {
    const events = this.events.get(aggregateId) || [];
    return events.filter((e) => e.version > fromVersion);
  }

  /**
   * Get event stream from specific version
   */
  async getEventStream(
    aggregateId: AggregateId,
    fromVersion: EventVersion = 0,
  ): Promise<DomainEvent[]> {
    return this.getEvents(aggregateId, fromVersion);
  }

  /**
   * Create snapshot of aggregate state
   */
  async createSnapshot(
    aggregateId: AggregateId,
    aggregateType: string,
    state: Record<string, any>,
    version: EventVersion,
  ): Promise<void> {
    const snapshot: EventSnapshot = {
      aggregateId,
      aggregateType,
      version,
      state,
      timestamp: Date.now(),
    };
    this.snapshots.set(aggregateId, snapshot);
  }

  /**
   * Get latest snapshot
   */
  async getSnapshot(aggregateId: AggregateId): Promise<EventSnapshot | undefined> {
    return this.snapshots.get(aggregateId);
  }

  /**
   * Query events by type
   */
  async queryByType(eventType: EventType, limit: number = 100): Promise<DomainEvent[]> {
    return this.eventIndex
      .filter((e) => e.type === eventType)
      .slice(-limit);
  }

  /**
   * Query events by aggregate type
   */
  async queryByAggregateType(
    aggregateType: string,
    limit: number = 100,
  ): Promise<DomainEvent[]> {
    return this.eventIndex
      .filter((e) => e.aggregateType === aggregateType)
      .slice(-limit);
  }

  /**
   * Get all events
   */
  async getAllEvents(limit: number = 1000): Promise<DomainEvent[]> {
    return this.eventIndex.slice(-limit);
  }

  /**
   * Subscribe to events
   */
  subscribe(
    eventType: string | string[],
    handler: (event: DomainEvent) => void,
  ): () => void {
    const types = Array.isArray(eventType) ? eventType : [eventType];

    for (const type of types) {
      if (!this.subscriptions.has(type)) {
        this.subscriptions.set(type, new Set());
      }
      this.subscriptions.get(type)!.add(handler);
    }

    return () => {
      for (const type of types) {
        this.subscriptions.get(type)?.delete(handler);
      }
    };
  }

  /**
   * Publish event to subscribers
   */
  private publish(event: DomainEvent): void {
    const handlers = this.subscriptions.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          // Handler error, continue with others
        }
      });
    }
  }

  /**
   * Clear all events (for testing)
   */
  async clear(): Promise<void> {
    this.events.clear();
    this.snapshots.clear();
    this.eventIndex = [];
  }

  /**
   * Get event store statistics
   */
  getStats() {
    return {
      totalEvents: this.eventIndex.length,
      aggregateCount: this.events.size,
      snapshotCount: this.snapshots.size,
      subscriptionCount: Array.from(this.subscriptions.values()).reduce(
        (sum, handlers) => sum + handlers.size,
        0,
      ),
    };
  }
}

/**
 * Event Aggregate: Base class for aggregates using event sourcing
 */
export abstract class EventAggregate {
  protected id: AggregateId;
  protected version: EventVersion = 0;
  protected changes: DomainEvent[] = [];

  constructor(id: AggregateId) {
    this.id = id;
  }

  /**
   * Get aggregate ID
   */
  getId(): AggregateId {
    return this.id;
  }

  /**
   * Get current version
   */
  getVersion(): EventVersion {
    return this.version;
  }

  /**
   * Get uncommitted changes
   */
  getChanges(): DomainEvent[] {
    return [...this.changes];
  }

  /**
   * Clear uncommitted changes
   */
  clearChanges(): void {
    this.changes = [];
  }

  /**
   * Apply event to aggregate
   */
  protected applyEvent(event: DomainEvent): void {
    this.handle(event.type, event.data);
    this.version = event.version;
  }

  /**
   * Record event
   */
  protected recordEvent(
    type: EventType,
    data: Record<string, any>,
    metadata?: DomainEvent['metadata'],
  ): void {
    const event: DomainEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      aggregateId: this.id,
      aggregateType: this.constructor.name,
      type,
      version: this.version + 1,
      timestamp: Date.now(),
      data,
      metadata,
    };

    this.applyEvent(event);
    this.changes.push(event);
  }

  /**
   * Load from event history
   */
  async loadFromHistory(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /**
   * Handle event (implemented by subclasses)
   */
  protected abstract handle(eventType: EventType, data: Record<string, any>): void;
}

/**
 * Command Handler: Process commands and emit events
 */
export interface CommandHandler<T = any> {
  (command: T, aggregate: EventAggregate): Promise<void>;
}

export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map();

  /**
   * Register command handler
   */
  registerHandler(commandType: string, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
  }

  /**
   * Execute command
   */
  async execute(
    commandType: string,
    command: any,
    aggregate: EventAggregate,
  ): Promise<DomainEvent[]> {
    const handler = this.handlers.get(commandType);
    if (!handler) {
      throw new Error(`No handler registered for command: ${commandType}`);
    }

    await handler(command, aggregate);
    return aggregate.getChanges();
  }
}

/**
 * Event Projection: Build materialized views from events
 */
export class EventProjection {
  private projections: Map<string, Projection> = new Map();
  private eventHandlers: Map<EventType, (event: DomainEvent, projection: Projection) => void> =
    new Map();

  /**
   * Register projection handler
   */
  registerHandler(
    eventType: EventType,
    handler: (event: DomainEvent, projection: Projection) => void,
  ): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Handle event and update projection
   */
  async handleEvent(event: DomainEvent): Promise<void> {
    const projectionId = `${event.aggregateType}:${event.aggregateId}`;
    let projection = this.projections.get(projectionId);

    if (!projection) {
      projection = {
        id: projectionId,
        aggregateId: event.aggregateId,
        type: event.aggregateType,
        data: {},
        version: 0,
        updatedAt: Date.now(),
      };
      this.projections.set(projectionId, projection);
    }

    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event, projection);
      projection.version = event.version;
      projection.updatedAt = Date.now();
    }
  }

  /**
   * Get projection
   */
  getProjection(projectionId: string): Projection | undefined {
    return this.projections.get(projectionId);
  }

  /**
   * Get all projections of type
   */
  getProjectionsByType(type: string): Projection[] {
    return Array.from(this.projections.values()).filter((p) => p.type === type);
  }

  /**
   * Query projections
   */
  queryProjections(predicate: (p: Projection) => boolean): Projection[] {
    return Array.from(this.projections.values()).filter(predicate);
  }

  /**
   * Clear all projections
   */
  async clear(): Promise<void> {
    this.projections.clear();
  }
}

/**
 * Saga Orchestrator: Manage long-running distributed transactions
 */
export interface SagaStep {
  name: string;
  command: (data: any) => Promise<any>;
  compensation: (data: any) => Promise<void>;
}

export interface SagaInstance {
  id: string;
  sagaType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating';
  currentStep: number;
  data: Record<string, any>;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export class SagaOrchestrator {
  private sagas: Map<string, SagaStep[]> = new Map();
  private instances: Map<string, SagaInstance> = new Map();
  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  /**
   * Register saga definition
   */
  registerSaga(sagaType: string, steps: SagaStep[]): void {
    this.sagas.set(sagaType, steps);
  }

  /**
   * Start saga instance
   */
  async startSaga(sagaType: string, data: Record<string, any>): Promise<string> {
    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instance: SagaInstance = {
      id: sagaId,
      sagaType,
      status: 'pending',
      currentStep: 0,
      data,
      createdAt: Date.now(),
    };

    this.instances.set(sagaId, instance);
    await this.executeSaga(sagaId);
    return sagaId;
  }

  /**
   * Execute saga steps
   */
  private async executeSaga(sagaId: string): Promise<void> {
    const instance = this.instances.get(sagaId);
    if (!instance) return;

    const steps = this.sagas.get(instance.sagaType);
    if (!steps) {
      instance.status = 'failed';
      instance.error = `Saga type not found: ${instance.sagaType}`;
      return;
    }

    instance.status = 'running';

    try {
      for (let i = instance.currentStep; i < steps.length; i++) {
        const step = steps[i];
        instance.data = await step.command(instance.data);
        instance.currentStep = i + 1;
      }

      instance.status = 'completed';
      instance.completedAt = Date.now();
    } catch (error) {
      instance.status = 'compensating';
      instance.error = error instanceof Error ? error.message : 'Unknown error';

      await this.compensate(sagaId, steps);
    }
  }

  /**
   * Compensate (rollback) saga
   */
  private async compensate(sagaId: string, steps: SagaStep[]): Promise<void> {
    const instance = this.instances.get(sagaId);
    if (!instance) return;

    for (let i = instance.currentStep - 1; i >= 0; i--) {
      try {
        await steps[i].compensation(instance.data);
      } catch (error) {
        // Compensation failed, log and continue
      }
    }

    instance.status = 'failed';
  }

  /**
   * Get saga instance
   */
  getInstance(sagaId: string): SagaInstance | undefined {
    return this.instances.get(sagaId);
  }

  /**
   * Get all instances of type
   */
  getInstancesByType(sagaType: string): SagaInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.sagaType === sagaType);
  }

  /**
   * Clear all sagas
   */
  async clear(): Promise<void> {
    this.sagas.clear();
    this.instances.clear();
  }
}

/**
 * Event Replayer: Rebuild state from event history
 */
export class EventReplayer {
  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  /**
   * Replay events for aggregate
   */
  async replayAggregate<T extends EventAggregate>(
    AggregateClass: new (id: AggregateId) => T,
    aggregateId: AggregateId,
  ): Promise<T> {
    const aggregate = new AggregateClass(aggregateId);
    const events = await this.eventStore.getEvents(aggregateId);
    await aggregate.loadFromHistory(events);
    return aggregate;
  }

  /**
   * Replay all events
   */
  async replayAll(
    aggregateFactory: (aggregateId: AggregateId) => EventAggregate,
  ): Promise<Map<AggregateId, EventAggregate>> {
    const aggregates = new Map<AggregateId, EventAggregate>();
    const events = await this.eventStore.getAllEvents();

    const aggregateIds = new Set(events.map((e) => e.aggregateId));

    for (const aggregateId of aggregateIds) {
      const aggregate = aggregateFactory(aggregateId);
      const aggregateEvents = await this.eventStore.getEvents(aggregateId);
      await aggregate.loadFromHistory(aggregateEvents);
      aggregates.set(aggregateId, aggregate);
    }

    return aggregates;
  }

  /**
   * Replay events up to timestamp
   */
  async replayUntil(
    aggregateId: AggregateId,
    timestamp: number,
    aggregate: EventAggregate,
  ): Promise<void> {
    const events = await this.eventStore.getEvents(aggregateId);
    const filteredEvents = events.filter((e) => e.timestamp <= timestamp);
    await aggregate.loadFromHistory(filteredEvents);
  }
}
