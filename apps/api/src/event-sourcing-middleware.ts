/**
 * Express middleware for event sourcing and CQRS integration
 * Provides endpoints for event stream management, saga orchestration, and projections
 */

import { Request, Response, NextFunction } from 'express';
import {
  EventStore,
  CommandBus,
  EventProjection,
  SagaOrchestrator,
  EventReplayer,
  DomainEvent,
} from '@omega-v/runtime';

export interface EventSourcingMiddlewareOptions {
  eventStore: EventStore;
  commandBus: CommandBus;
  projection: EventProjection;
  orchestrator: SagaOrchestrator;
  replayer: EventReplayer;
}

declare global {
  namespace Express {
    interface Request {
      eventStore?: EventStore;
      commandBus?: CommandBus;
      projection?: EventProjection;
      orchestrator?: SagaOrchestrator;
      replayer?: EventReplayer;
    }
  }
}

/**
 * Attach event sourcing to request
 */
export function attachEventSourcingMiddleware(options: EventSourcingMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.eventStore = options.eventStore;
    req.commandBus = options.commandBus;
    req.projection = options.projection;
    req.orchestrator = options.orchestrator;
    req.replayer = options.replayer;
    next();
  };
}

/**
 * Append event endpoint
 */
export function appendEventEndpoint(eventStore: EventStore) {
  return async (req: Request, res: Response) => {
    const { aggregateId, aggregateType, type, data, metadata } = req.body;

    if (!aggregateId || !type || !aggregateType) {
      return res.status(400).json({
        error: 'Missing required fields: aggregateId, aggregateType, type',
      });
    }

    try {
      const event: DomainEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        aggregateId,
        aggregateType,
        type,
        version: 0,
        timestamp: Date.now(),
        data,
        metadata,
      };

      await eventStore.append(event);

      res.status(201).json({
        eventId: event.id,
        version: event.version,
        message: 'Event appended successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to append event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get aggregate events endpoint
 */
export function getAggregateEventsEndpoint(eventStore: EventStore) {
  return async (req: Request, res: Response) => {
    const { aggregateId } = req.params;
    const { fromVersion = '0' } = req.query;

    try {
      const events = await eventStore.getEvents(aggregateId, parseInt(fromVersion as string));

      res.json({
        aggregateId,
        eventCount: events.length,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          version: e.version,
          timestamp: e.timestamp,
          data: e.data,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Query events by type endpoint
 */
export function queryEventsByTypeEndpoint(eventStore: EventStore) {
  return async (req: Request, res: Response) => {
    const { eventType } = req.params;
    const { limit = '100' } = req.query;

    try {
      const events = await eventStore.queryByType(eventType, parseInt(limit as string));

      res.json({
        eventType,
        count: events.length,
        events: events.map((e) => ({
          id: e.id,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          version: e.version,
          timestamp: e.timestamp,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to query events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get projection endpoint
 */
export function getProjectionEndpoint(projection: EventProjection) {
  return (req: Request, res: Response) => {
    const { projectionId } = req.params;

    const proj = projection.getProjection(projectionId);

    if (!proj) {
      return res.status(404).json({
        error: 'Projection not found',
        projectionId,
      });
    }

    res.json({
      id: proj.id,
      type: proj.type,
      aggregateId: proj.aggregateId,
      version: proj.version,
      data: proj.data,
      updatedAt: new Date(proj.updatedAt).toISOString(),
    });
  };
}

/**
 * Query projections endpoint
 */
export function queryProjectionsEndpoint(projection: EventProjection) {
  return (req: Request, res: Response) => {
    const { aggregateType } = req.params;

    const projections = projection.getProjectionsByType(aggregateType);

    res.json({
      aggregateType,
      count: projections.length,
      projections: projections.map((p) => ({
        id: p.id,
        version: p.version,
        data: p.data,
        updatedAt: new Date(p.updatedAt).toISOString(),
      })),
    });
  };
}

/**
 * Start saga endpoint
 */
export function startSagaEndpoint(orchestrator: SagaOrchestrator) {
  return async (req: Request, res: Response) => {
    const { sagaType, data } = req.body;

    if (!sagaType) {
      return res.status(400).json({
        error: 'Missing required field: sagaType',
      });
    }

    try {
      const sagaId = await orchestrator.startSaga(sagaType, data || {});

      res.status(202).json({
        sagaId,
        sagaType,
        status: 'started',
        statusUrl: `/api/sagas/${sagaId}`,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start saga',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get saga status endpoint
 */
export function getSagaStatusEndpoint(orchestrator: SagaOrchestrator) {
  return (req: Request, res: Response) => {
    const { sagaId } = req.params;

    const instance = orchestrator.getInstance(sagaId);

    if (!instance) {
      return res.status(404).json({
        error: 'Saga not found',
        sagaId,
      });
    }

    res.json({
      id: instance.id,
      sagaType: instance.sagaType,
      status: instance.status,
      currentStep: instance.currentStep,
      data: instance.data,
      createdAt: new Date(instance.createdAt).toISOString(),
      completedAt: instance.completedAt ? new Date(instance.completedAt).toISOString() : null,
      error: instance.error,
    });
  };
}

/**
 * List sagas by type endpoint
 */
export function listSagasByTypeEndpoint(orchestrator: SagaOrchestrator) {
  return (req: Request, res: Response) => {
    const { sagaType } = req.params;

    const instances = orchestrator.getInstancesByType(sagaType);

    res.json({
      sagaType,
      count: instances.length,
      sagas: instances.map((i) => ({
        id: i.id,
        status: i.status,
        currentStep: i.currentStep,
        createdAt: new Date(i.createdAt).toISOString(),
        completedAt: i.completedAt ? new Date(i.completedAt).toISOString() : null,
      })),
    });
  };
}

/**
 * Replay aggregate endpoint
 */
export function replayAggregateEndpoint(replayer: EventReplayer) {
  return async (req: Request, res: Response) => {
    const { aggregateId } = req.params;

    try {
      // This endpoint returns event history that can be used to replay
      // The actual replay is done on the client side with the aggregate class
      const eventStore = (replayer as any).eventStore;
      const events = await eventStore.getEvents(aggregateId);

      res.json({
        aggregateId,
        eventCount: events.length,
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          version: e.version,
          timestamp: e.timestamp,
          data: e.data,
        })),
        message: 'Aggregate can be replayed using these events',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve events for replay',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Event store statistics endpoint
 */
export function eventStoreStatsEndpoint(eventStore: EventStore) {
  return (req: Request, res: Response) => {
    const stats = eventStore.getStats();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      eventStore: {
        totalEvents: stats.totalEvents,
        aggregateCount: stats.aggregateCount,
        snapshotCount: stats.snapshotCount,
        subscriptionCount: stats.subscriptionCount,
      },
      health: {
        isHealthy: stats.totalEvents > 0 || true,
        eventRate: stats.totalEvents,
      },
    });
  };
}

/**
 * Initialize event sourcing middleware stack
 */
export function initializeEventSourcingMiddleware(
  options: EventSourcingMiddlewareOptions,
  enableEndpoints?: boolean,
) {
  const endpoints = [];

  if (enableEndpoints !== false) {
    endpoints.push((req: Request, res: Response, next: NextFunction) => {
      // Event endpoints
      if (req.method === 'POST' && req.path === '/api/events') {
        return appendEventEndpoint(options.eventStore)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/aggregates\/[^\/]+\/events$/)) {
        const aggregateId = req.path.split('/')[3];
        req.params.aggregateId = aggregateId;
        return getAggregateEventsEndpoint(options.eventStore)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/events\/type\/[^\/]+$/)) {
        const eventType = req.path.split('/')[4];
        req.params.eventType = eventType;
        return queryEventsByTypeEndpoint(options.eventStore)(req, res);
      }

      // Projection endpoints
      if (req.method === 'GET' && req.path.match(/^\/api\/projections\/[^\/]+$/)) {
        const projectionId = req.path.split('/')[3];
        req.params.projectionId = projectionId;
        return getProjectionEndpoint(options.projection)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/projections\/type\/[^\/]+$/)) {
        const aggregateType = req.path.split('/')[4];
        req.params.aggregateType = aggregateType;
        return queryProjectionsEndpoint(options.projection)(req, res);
      }

      // Saga endpoints
      if (req.method === 'POST' && req.path === '/api/sagas') {
        return startSagaEndpoint(options.orchestrator)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/sagas\/[^\/]+$/)) {
        const sagaId = req.path.split('/')[3];
        req.params.sagaId = sagaId;
        return getSagaStatusEndpoint(options.orchestrator)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/sagas\/type\/[^\/]+$/)) {
        const sagaType = req.path.split('/')[4];
        req.params.sagaType = sagaType;
        return listSagasByTypeEndpoint(options.orchestrator)(req, res);
      }

      // Replay endpoint
      if (req.method === 'GET' && req.path.match(/^\/api\/aggregates\/[^\/]+\/replay$/)) {
        const aggregateId = req.path.split('/')[3];
        req.params.aggregateId = aggregateId;
        return replayAggregateEndpoint(options.replayer)(req, res);
      }

      // Stats endpoint
      if (req.method === 'GET' && req.path === '/api/event-store/stats') {
        return eventStoreStatsEndpoint(options.eventStore)(req, res);
      }

      next();
    });
  }

  return [attachEventSourcingMiddleware(options), ...endpoints];
}
