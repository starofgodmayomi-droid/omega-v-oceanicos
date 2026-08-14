import express, { Express, Request, Response } from 'express';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { SuccessResponse, ErrorResponse } from '@omega-v/types';

/**
 * Ω∞v Oceanicos API Server
 * Exposes the verification loop via REST endpoints
 */
const app: Express = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(express.json());

// Initialize services
const observer = new Observer();
const verificationEngine = new VerificationEngine();
const attestationService = new AttestationService();

type RuntimeEvent = {
  id: string;
  type: string;
  stage: string;
  message: string;
  status: 'active' | 'passed' | 'failed';
  timestamp: string;
  correlationId?: string;
  details?: Record<string, unknown>;
};

const runtimeEvents: RuntimeEvent[] = [];
const eventStreams = new Set<Response>();
const completedRuns: Array<{
  correlationId: string;
  observation: ReturnType<Observer['observe']>;
  verification: ReturnType<VerificationEngine['verify']>;
  attestation: ReturnType<AttestationService['attest']>;
}> = [];

const recordEvent = (event: Omit<RuntimeEvent, 'id' | 'timestamp'>): RuntimeEvent => {
  const recorded: RuntimeEvent = {
    ...event,
    id: `evt-${Date.now()}-${runtimeEvents.length + 1}`,
    timestamp: new Date().toISOString(),
  };
  runtimeEvents.unshift(recorded);
  runtimeEvents.splice(40);
  for (const stream of eventStreams) {
    stream.write(`data: ${JSON.stringify(recorded)}\n\n`);
  }
  return recorded;
};

// Register default rules
verificationEngine.registerRule({
  name: 'response-time-threshold',
  version: '1.0.5',
  appliesTo: ['health-check'],
  definition: 'responseTime < 100',
  description: 'Verify response time is below 100ms',
  createdAt: new Date().toISOString(),
  active: true,
});

verificationEngine.registerRule({
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

app.get('/state', (_req: Request, res: Response) => {
  const latest = runtimeEvents[0];
  res.json({
    data: {
      status: 'active',
      mode: latest?.stage || 'observing',
      trust: latest ? (latest.status === 'failed' ? 0 : 1) : null,
      events: runtimeEvents.length,
      lastActivity: latest?.timestamp || null,
      services: [
        { name: 'observer', status: 'ready' },
        { name: 'verifier', status: 'ready' },
        { name: 'attester', status: 'ready' },
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/events', (_req: Request, res: Response) => {
  res.json({ data: runtimeEvents, timestamp: new Date().toISOString() });
});

app.get('/events/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  eventStreams.add(res);
  res.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    eventStreams.delete(res);
  });
});

app.get('/runs', (_req: Request, res: Response) => {
  res.json({ data: completedRuns, timestamp: new Date().toISOString() });
});

/**
 * POST /observe - Submit an observation
 * Step 1 of the verification loop
 */
app.post('/observe', (req: Request, res: Response) => {
  try {
    const { claim, category, source, observedBy, metadata, confidence, confidenceReason } =
      req.body;

    const observation = observer.observe({
      claim,
      category,
      source,
      observedBy,
      metadata,
      confidence,
      confidenceReason,
    });

    const response: SuccessResponse<typeof observation> = {
      data: observation,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'OBSERVATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create observation',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * POST /verify - Verify an observation
 * Step 2 of the verification loop
 */
app.post('/verify', (req: Request, res: Response) => {
  try {
    const { observation } = req.body;

    if (!observation) {
      const errorResponse: ErrorResponse = {
        code: 'MISSING_OBSERVATION',
        message: 'Observation is required',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(errorResponse);
      return;
    }

    const verificationResult = verificationEngine.verify(observation);

    const response: SuccessResponse<typeof verificationResult> = {
      data: verificationResult,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'VERIFICATION_FAILED',
      message: error instanceof Error ? error.message : 'Verification failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

/**
 * POST /attest - Attest a verification result
 * Step 3 of the verification loop
 */
app.post('/attest', (req: Request, res: Response) => {
  try {
    const { verificationResult } = req.body;

    if (!verificationResult) {
      const errorResponse: ErrorResponse = {
        code: 'MISSING_VERIFICATION',
        message: 'Verification result is required',
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(errorResponse);
      return;
    }

    const attestation = attestationService.attest(verificationResult);

    const response: SuccessResponse<typeof attestation> = {
      data: attestation,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      code: 'ATTESTATION_FAILED',
      message: error instanceof Error ? error.message : 'Attestation failed',
      timestamp: new Date().toISOString(),
    };
    res.status(400).json(errorResponse);
  }
});

app.post('/attest/verify', (req: Request, res: Response) => {
  try {
    const { attestation } = req.body;
    if (!attestation) {
      res.status(400).json({
        code: 'MISSING_ATTESTATION',
        message: 'Attestation is required',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }

    res.json({
      data: { valid: attestationService.verify(attestation) },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      code: 'ATTESTATION_VERIFICATION_FAILED',
      message: error instanceof Error ? error.message : 'Attestation verification failed',
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
  }
});

/**
 * POST /complete-loop - Execute the complete verification loop
 * Observe → Verify → Attest in one request
 */
app.post('/complete-loop', (req: Request, res: Response) => {
  const correlationId = `loop-${Date.now()}`;
  try {
    const { claim, category, source, observedBy, metadata, confidence, confidenceReason } =
      req.body;

    // Step 1: Observe
    recordEvent({
      type: 'observation.received',
      stage: 'observe',
      message: 'Observation received from the workspace',
      status: 'active',
      correlationId,
    });
    const observation = observer.observe({
      claim,
      category,
      source,
      observedBy,
      metadata,
      confidence,
      confidenceReason,
    });

    // Step 2: Verify
    recordEvent({
      type: 'verification.started',
      stage: 'verify',
      message: 'Evidence checks started',
      status: 'active',
      correlationId,
      details: { claim },
    });
    const verificationResult = verificationEngine.verify(observation);

    recordEvent({
      type: verificationResult.summary.passed ? 'verification.passed' : 'verification.failed',
      stage: 'verify',
      message: verificationResult.summary.passed
        ? 'All applicable rules passed'
        : 'Verification found a failed rule',
      status: verificationResult.summary.passed ? 'passed' : 'failed',
      correlationId,
      details: { rulesApplied: verificationResult.summary.rulesApplied },
    });

    // Step 3: Attest
    const attestation = attestationService.attest(verificationResult);
    completedRuns.unshift({
      correlationId,
      observation,
      verification: verificationResult,
      attestation,
    });
    completedRuns.splice(20);
    recordEvent({
      type: 'attestation.created',
      stage: 'attest',
      message: 'Verification result signed and recorded',
      status: attestation.verified ? 'passed' : 'failed',
      correlationId,
      details: { attestationId: attestation.id },
    });

    const response: SuccessResponse<{
      observation: typeof observation;
      verification: typeof verificationResult;
      attestation: typeof attestation;
    }> = {
      data: {
        observation,
        verification: verificationResult,
        attestation,
      },
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
 * GET /rules - List all registered verification rules
 */
app.get('/rules', (_req: Request, res: Response) => {
  const applicableRules = verificationEngine.getApplicableRules({
    claim: { statement: '', category: '' },
    source: { system: '', version: '', environment: '' },
    timestamp: '',
    observedBy: '',
    metadata: {},
    confidence: 0,
    confidenceReason: '',
    status: 'normalized',
    id: '',
  });

  const response: SuccessResponse<{ count: number; rules: any[] }> = {
    data: {
      count: applicableRules.length,
      rules: applicableRules,
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
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
  console.log(`  POST   /observe          - Create an observation`);
  console.log(`  POST   /verify           - Verify an observation`);
  console.log(`  POST   /attest           - Attest a verification`);
  console.log(`  POST   /complete-loop    - Execute full loop in one request`);
  console.log(`  GET    /rules            - List verification rules`);
  console.log(`  GET    /health           - Health check`);
});

export default app;
