import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { VerificationRuntime, createVerificationSchema, getSchemaIntrospection } from '@omega-v/runtime';
import { SuccessResponse, ErrorResponse } from '@omega-v/types';
import {
  securityHeaders,
  validateJSON,
  requestSizeLimits,
  createRateLimitMiddleware,
  requestLogging,
  errorHandler,
} from './middleware';
import { initializeWebSocketServer } from './websocket';
import { loadOpenAPISpec, swaggerUIOptions } from './openapi';
import {
  initializeLogging,
  getLoggingContext,
  requestLoggingMiddleware,
  auditLoggingMiddleware,
} from './logging-middleware';

/**
 * Ω∞v Oceanicos API Server
 * Exposes the complete verification loop via REST endpoints
 *
 * Implements: Observe → Verify → Attest → Record → Query → Learn
 */
const app: Express = express();
const port = process.env.API_PORT || 3000;
const persistenceEnabled = process.env.PERSISTENCE_ENABLED === 'true';
const dbPath = process.env.DB_PATH || './events.db';

// Initialize logging system
initializeLogging();

// Security and validation middleware
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(validateJSON);
app.use(requestSizeLimits('1mb'));
app.use(requestLogging);
app.use(createRateLimitMiddleware(200, 60000));

// Logging middleware
app.use(requestLoggingMiddleware);
app.use(auditLoggingMiddleware);

// Setup API documentation (OpenAPI/Swagger)
const openAPISpec = loadOpenAPISpec();
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(openAPISpec, swaggerUIOptions));
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openAPISpec);
});

// Initialize unified runtime with optional persistent storage
const runtime = new VerificationRuntime();
const graphqlSchema = createVerificationSchema();

// Persistent storage is available via:
// const eventLog = new SQLiteEventLog({ dbPath });
// Future: integrate with VerificationRuntime for full persistence
if (persistenceEnabled) {
  console.log(`[Ω∞v API] Persistent storage configured at ${dbPath} (coming in next phase)`);
}

// Register default verification rules
runtime.registerRule({
  name: 'response-time-threshold',
  version: '1.0.5',
  appliesTo: ['health-check'],
  definition: 'responseTime < 100',
  description: 'Verify response time is below 100ms',
  createdAt: new Date().toISOString(),
  active: true,
});

runtime.registerRule({
  name: 'status-code-check',
  version: '1.2.0',
  appliesTo: ['health-check'],
  definition: 'statusCode == 200',
  description: 'Verify HTTP status code is 200 OK',
  createdAt: new Date().toISOString(),
  active: true,
});

/**
 * Quick health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  const response: SuccessResponse<{ status: string }> = {
    data: { status: 'ok' },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

/**
 * Detailed health check endpoint with component status
 */
app.get('/health/detailed', async (_req: Request, res: Response) => {
  try {
    const healthStatus = await runtime.checkHealth();

    const response: SuccessResponse<typeof healthStatus> = {
      data: healthStatus,
      timestamp: new Date().toISOString(),
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : healthStatus.status === 'degraded' ? 206 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'HEALTH_CHECK_FAILED',
      message: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString(),
    };
    res.status(503).json(errorResponse);
  }
});

/**
 * POST /complete-loop - Execute the complete verification loop with recording
 * Observe → Verify → Attest → Record in one request
 */
app.post('/complete-loop', (req: Request, res: Response) => {
  try {
    const { claim, category, source, observedBy, metadata, confidence, confidenceReason } =
      req.body;

    const auditLogger = (req as any).locals?.auditLogger;
    const correlationId = (req as any).locals?.correlationId;

    const result = runtime.executeLoop({
      claim,
      category,
      source,
      observedBy,
      metadata,
      confidence,
      confidenceReason,
    });

    if (auditLogger) {
      auditLogger.auditObservation(
        result.observation.id,
        observedBy,
        'success',
        {
          claim,
          category,
          confidence,
          correlationId,
        },
      );

      auditLogger.auditVerification(
        result.verification.id,
        result.observation.id,
        result.verification.summary.passed,
        observedBy,
        {
          confidence: result.verification.summary.confidence,
          rulesApplied: result.verification.rules.length,
          correlationId,
        },
      );

      auditLogger.auditAttestation(
        result.attestation.id,
        result.verification.id,
        result.attestation.verified,
        observedBy,
        {
          algorithm: result.attestation.signingAlgorithm,
          correlationId,
        },
      );
    }

    const response: SuccessResponse<typeof result> = {
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'LOOP_FAILED',
      message: error instanceof Error ? error.message : 'Verification loop failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /query/observations - Query observations from event log
 */
app.get('/query/observations', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = runtime.queryObservations({ limit, offset });

    const response: SuccessResponse<typeof result> = {
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /query/verifications - Query verification results from event log
 */
app.get('/query/verifications', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = runtime.queryVerifications({ limit, offset });

    const response: SuccessResponse<typeof result> = {
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /query/attestations - Query attestations from event log
 */
app.get('/query/attestations', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = runtime.queryAttestations({ limit, offset });

    const response: SuccessResponse<typeof result> = {
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /query/trace/:id - Get complete trace for an observation
 */
app.get('/query/trace/:id', (req: Request, res: Response) => {
  try {
    const trace = runtime.getTrace(req.params.id);

    if (!trace.observation) {
      const errorResponse: ErrorResponse = {
        code: 'NOT_FOUND',
        message: 'Observation not found',
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(errorResponse);
      return;
    }

    const response: SuccessResponse<typeof trace> = {
      data: trace,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /integrity - Verify event log integrity
 */
app.get('/integrity', (_req: Request, res: Response) => {
  try {
    const integrity = runtime.verifyIntegrity();

    const response: SuccessResponse<typeof integrity> = {
      data: integrity,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'VERIFICATION_FAILED',
      message: error instanceof Error ? error.message : 'Integrity check failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /audit - Query audit trail
 */
app.get('/audit', (req: Request, res: Response) => {
  try {
    const { type, actor, limit } = req.query;
    const auditLogger = getLoggingContext().auditLogger;

    let entries: any[] = [];

    if (type) {
      entries = auditLogger.getEntriesByType(type as any, limit ? parseInt(limit as string) : 50);
    } else {
      entries = auditLogger.getEntries(limit ? parseInt(limit as string) : 50);
    }

    if (actor) {
      entries = entries.filter(e => e.actor === actor);
    }

    const response: SuccessResponse<typeof entries> = {
      data: entries,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'AUDIT_QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Audit query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /metrics - Get system metrics (Prometheus format)
 */
app.get('/metrics', (_req: Request, res: Response) => {
  try {
    const prometheusMetrics = runtime.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusMetrics);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Metrics query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /metrics/json - Get system metrics as JSON
 */
app.get('/metrics/json', (_req: Request, res: Response) => {
  try {
    const metrics = runtime.getMetrics();

    const response: SuccessResponse<typeof metrics> = {
      data: metrics,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'QUERY_FAILED',
      message: error instanceof Error ? error.message : 'Metrics query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * POST /graphql - GraphQL query endpoint
 */
app.post('/graphql', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        code: 'INVALID_QUERY',
        message: 'Query must be a string',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = await graphqlSchema.execute(query);

    const response: SuccessResponse<typeof result> = {
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'GRAPHQL_ERROR',
      message: error instanceof Error ? error.message : 'GraphQL query failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * GET /graphql/schema - GraphQL schema introspection
 */
app.get('/graphql/schema', (_req: Request, res: Response) => {
  try {
    const introspection = getSchemaIntrospection(graphqlSchema);

    const response: SuccessResponse<typeof introspection> = {
      data: introspection,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'INTROSPECTION_FAILED',
      message: error instanceof Error ? error.message : 'Schema introspection failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * 404 Handler
 */
app.use((_req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(errorResponse);
});

/**
 * Error handling middleware (must be last)
 */
app.use(errorHandler);

/**
 * Start the server with WebSocket support
 */
const httpServer = createServer(app);
const broadcaster = runtime.getEventBroadcaster();
initializeWebSocketServer(httpServer, broadcaster);

httpServer.listen(port, () => {
  console.log(`[Ω∞v API] Verification loop server running on http://localhost:${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api-docs`);
  console.log(`🔌 WebSocket endpoint available at ws://localhost:${port}/ws`);
  console.log(`Available REST endpoints:`);
  console.log(`  POST   /complete-loop          - Execute full loop in one request`);
  console.log(`  GET    /query/observations     - Query observations with pagination`);
  console.log(`  GET    /query/verifications    - Query verifications with pagination`);
  console.log(`  GET    /query/attestations     - Query attestations with pagination`);
  console.log(`  GET    /query/trace/:id        - Get complete trace for observation`);
  console.log(`  GET    /integrity              - Verify event log integrity`);
  console.log(`  GET    /audit                  - Query audit trail (type/actor filters)`);
  console.log(`  GET    /metrics                - Get system metrics (Prometheus format)`);
  console.log(`  GET    /metrics/json           - Get system metrics (JSON format)`);
  console.log(`  POST   /graphql                - GraphQL query endpoint`);
  console.log(`  GET    /graphql/schema         - GraphQL schema introspection`);
  console.log(`  GET    /health                 - Quick health check`);
  console.log(`  GET    /health/detailed        - Detailed component health status`);
  console.log(`\n📋 Logging:`);
  console.log(`  - Correlation ID tracking via X-Correlation-ID header`);
  console.log(`  - Request/response logging with duration and size metrics`);
  console.log(`  - Audit trail for observation/verification/attestation events`);
});

export default app;
