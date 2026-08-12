import express, { Express, Request, Response } from 'express';
import { VerificationRuntime } from '@omega-v/runtime';
import { SuccessResponse, ErrorResponse } from '@omega-v/types';

/**
 * Ω∞v Oceanicos API Server
 * Exposes the complete verification loop via REST endpoints
 *
 * Implements: Observe → Verify → Attest → Record → Query → Learn
 */
const app: Express = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(express.json());

// Initialize unified runtime
const runtime = new VerificationRuntime();

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
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  const response: SuccessResponse<{ status: string }> = {
    data: { status: 'ok' },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

/**
 * POST /complete-loop - Execute the complete verification loop with recording
 * Observe → Verify → Attest → Record in one request
 */
app.post('/complete-loop', (req: Request, res: Response) => {
  try {
    const { claim, category, source, observedBy, metadata, confidence, confidenceReason } =
      req.body;

    const result = runtime.executeLoop({
      claim,
      category,
      source,
      observedBy,
      metadata,
      confidence,
      confidenceReason,
    });

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
 * GET /metrics - Get system metrics and statistics
 */
app.get('/metrics', (_req: Request, res: Response) => {
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
 * Start the server
 */
app.listen(port, () => {
  console.log(`[Ω∞v API] Verification loop server running on http://localhost:${port}`);
  console.log(`Available endpoints:`);
  console.log(`  POST   /complete-loop          - Execute full loop in one request`);
  console.log(`  GET    /query/observations     - Query observations with pagination`);
  console.log(`  GET    /query/verifications    - Query verifications with pagination`);
  console.log(`  GET    /query/attestations     - Query attestations with pagination`);
  console.log(`  GET    /query/trace/:id        - Get complete trace for observation`);
  console.log(`  GET    /integrity              - Verify event log integrity`);
  console.log(`  GET    /metrics                - Get system metrics`);
  console.log(`  GET    /health                 - Health check`);
});

export default app;
