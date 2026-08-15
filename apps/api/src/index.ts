import { randomUUID } from 'node:crypto';
import express, { Express, Request, Response } from 'express';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { Attestation, SuccessResponse, ErrorResponse, VerificationRule } from '@omega-v/types';
import { loadSnapshot, saveSnapshot } from './persistence';

/**
 * Ω∞v Oceanicos API Server
 * Exposes the verification loop via REST endpoints
 */
const app: Express = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(express.json());
app.use((req: Request, res: Response, next) => {
  const requestId = req.header('x-request-id') || `req-${randomUUID()}`;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const sendJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body && typeof body === 'object' && 'code' in body) {
      return sendJson({
        ...body,
        requestId: (body as { requestId?: string }).requestId ?? requestId,
      });
    }
    return sendJson(body);
  }) as Response['json'];
  next();
});

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
  requestId?: string;
  details?: Record<string, unknown>;
};

type CompletedRun = {
  correlationId: string;
  requestId: string;
  observation: ReturnType<Observer['observe']>;
  verification: ReturnType<VerificationEngine['verify']>;
  attestation: ReturnType<AttestationService['attest']>;
};
type RuntimeAction = {
  id: string;
  action: string;
  attestationId: string;
  status: 'authorized';
  timestamp: string;
};
type RuntimeLearning = {
  id: string;
  actionId: string;
  outcome: 'success' | 'failure' | 'uncertain';
  note: string;
  timestamp: string;
};
type RuntimeRecompilation = {
  id: string;
  learningId: string;
  version: string;
  status: 'proposed';
  rationale: string;
  timestamp: string;
};
type RuntimeSnapshot = {
  events: RuntimeEvent[];
  runs: CompletedRun[];
  actions: RuntimeAction[];
  learnings: RuntimeLearning[];
  recompilations: RuntimeRecompilation[];
};

const runtimeStorePath =
  process.env.OMEGA_RUNTIME_STORE_PATH || '/tmp/omega-v-oceanicos/runtime.json';

/**
 * Persistence defaults off under test and on everywhere else, but the
 * default is now explicitly overridable so the behaviour can be verified
 * rather than assumed.
 */
const persistenceEnabled = process.env.OMEGA_PERSISTENCE
  ? process.env.OMEGA_PERSISTENCE === 'on'
  : process.env.NODE_ENV !== 'test';

const {
  snapshot,
  source: persistenceSource,
  reason: persistenceReason,
} = loadSnapshot<RuntimeSnapshot>(runtimeStorePath, persistenceEnabled);

const runtimeEvents = snapshot.events;
const eventStreams = new Set<Response>();
const completedRuns = snapshot.runs;
const runtimeActions = snapshot.actions;
const runtimeLearnings = snapshot.learnings;
const runtimeRecompilations = snapshot.recompilations;

const persistRuntime = (): void => {
  saveSnapshot(
    runtimeStorePath,
    {
      events: runtimeEvents,
      runs: completedRuns,
      actions: runtimeActions,
      learnings: runtimeLearnings,
      recompilations: runtimeRecompilations,
    },
    persistenceEnabled
  );
};

const recordEvent = (event: Omit<RuntimeEvent, 'id' | 'timestamp'>): RuntimeEvent => {
  const recorded: RuntimeEvent = {
    ...event,
    id: `evt-${Date.now()}-${runtimeEvents.length + 1}`,
    timestamp: new Date().toISOString(),
  };
  runtimeEvents.unshift(recorded);
  runtimeEvents.splice(40);
  persistRuntime();
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
  const latestRun = completedRuns[0];
  const recentFailures = runtimeEvents.filter((event) => event.status === 'failed').length;
  const verificationCoverage = latestRun ? (latestRun.verification.summary.passed ? 1 : 0) : null;
  const attestationValidity = latestRun
    ? attestationService.verify(latestRun.attestation)
      ? 1
      : 0
    : null;
  res.json({
    data: {
      status: 'active',
      persistence: persistenceEnabled ? 'file' : 'memory',
      persistenceSource,
      persistenceReason: persistenceReason ?? null,
      mode: latest?.stage || 'observing',
      trust: latest ? (latest.status === 'failed' ? 0 : 1) : null,
      trustBasis: {
        evidenceQuality: latestRun ? latestRun.verification.summary.confidence : null,
        verificationCoverage,
        attestationValidity,
        serviceReadiness: 1,
        recentFailures,
      },
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

app.get('/actions', (_req: Request, res: Response) => {
  res.json({ data: runtimeActions, timestamp: new Date().toISOString() });
});

app.get('/learning', (_req: Request, res: Response) => {
  res.json({ data: runtimeLearnings, timestamp: new Date().toISOString() });
});

app.get('/recompilations', (_req: Request, res: Response) => {
  res.json({ data: runtimeRecompilations, timestamp: new Date().toISOString() });
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

app.post('/act', (req: Request, res: Response) => {
  try {
    const { attestation, action = 'record-verified-result' } = req.body as {
      attestation?: Attestation;
      action?: string;
    };
    if (!attestation) {
      res.status(400).json({
        code: 'MISSING_ATTESTATION',
        message: 'Attestation is required to authorize an action',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }
    if (!attestationService.verify(attestation)) {
      res.status(403).json({
        code: 'INVALID_ATTESTATION',
        message: 'Action denied because the attestation signature is invalid',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }
    if (!completedRuns.some((run) => run.attestation.id === attestation.id)) {
      res.status(404).json({
        code: 'ATTESTATION_NOT_RECORDED',
        message: 'Action denied because the attestation has no recorded runtime lineage',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }
    if (!attestation.verified) {
      res.status(409).json({
        code: 'UNVERIFIED_ATTESTATION',
        message: 'Action denied because verification did not pass',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }

    const recordedAction = {
      id: `act-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`,
      action,
      attestationId: attestation.id,
      status: 'authorized' as const,
      timestamp: new Date().toISOString(),
    };
    runtimeActions.unshift(recordedAction);
    runtimeActions.splice(20);
    persistRuntime();
    recordEvent({
      type: 'action.authorized',
      stage: 'act',
      message: `Action authorized: ${action}`,
      status: 'passed',
      details: { actionId: recordedAction.id, attestationId: attestation.id },
      requestId: res.locals.requestId,
    });
    res.status(201).json({ data: recordedAction, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({
      code: 'ACTION_FAILED',
      message: error instanceof Error ? error.message : 'Action authorization failed',
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
  }
});

app.post('/learn', (req: Request, res: Response) => {
  try {
    const {
      actionId,
      outcome,
      note = '',
    } = req.body as {
      actionId?: string;
      outcome?: 'success' | 'failure' | 'uncertain';
      note?: string;
    };
    if (!actionId || !outcome || !['success', 'failure', 'uncertain'].includes(outcome)) {
      res.status(400).json({
        code: 'INVALID_LEARNING',
        message: 'actionId and a success, failure, or uncertain outcome are required',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }
    if (!runtimeActions.some((action) => action.id === actionId)) {
      res.status(404).json({
        code: 'ACTION_NOT_FOUND',
        message: 'Learning must reference an authorized action',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }

    const learning = {
      id: `learn-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`,
      actionId,
      outcome,
      note,
      timestamp: new Date().toISOString(),
    };
    runtimeLearnings.unshift(learning);
    runtimeLearnings.splice(20);
    persistRuntime();
    recordEvent({
      type: 'learning.recorded',
      stage: 'learn',
      message: `Learning recorded: ${outcome}`,
      status: outcome === 'failure' ? 'failed' : 'passed',
      details: { learningId: learning.id, actionId },
      requestId: res.locals.requestId,
    });
    res.status(201).json({ data: learning, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({
      code: 'LEARNING_FAILED',
      message: error instanceof Error ? error.message : 'Learning recording failed',
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
  }
});

app.post('/recompile', (req: Request, res: Response) => {
  try {
    const { learningId } = req.body as { learningId?: string };
    const learning = runtimeLearnings.find((record) => record.id === learningId);
    if (!learning) {
      res.status(404).json({
        code: 'LEARNING_NOT_FOUND',
        message: 'Recompile proposals must reference a recorded learning',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }

    const proposal = {
      id: `recompile-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`,
      learningId: learning.id,
      version: `proposal-${runtimeRecompilations.length + 1}`,
      status: 'proposed' as const,
      rationale: `Review ${learning.outcome} feedback from action ${learning.actionId}`,
      timestamp: new Date().toISOString(),
    };
    runtimeRecompilations.unshift(proposal);
    runtimeRecompilations.splice(20);
    persistRuntime();
    recordEvent({
      type: 'recompile.proposed',
      stage: 'recompile',
      message: `Recompile proposal created: ${proposal.version}`,
      status: 'active',
      details: { proposalId: proposal.id, learningId: learning.id },
      requestId: res.locals.requestId,
    });
    res.status(201).json({ data: proposal, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({
      code: 'RECOMPILE_FAILED',
      message: error instanceof Error ? error.message : 'Recompile proposal failed',
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
  const requestId = res.locals.requestId as string;
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
      requestId,
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
      requestId,
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
      requestId,
      details: { rulesApplied: verificationResult.summary.rulesApplied },
    });

    // Step 3: Attest
    const attestation = attestationService.attest(verificationResult);
    completedRuns.unshift({
      correlationId,
      requestId,
      observation,
      verification: verificationResult,
      attestation,
    });
    completedRuns.splice(20);
    persistRuntime();
    recordEvent({
      type: 'attestation.created',
      stage: 'attest',
      message: 'Verification result signed and recorded',
      status: attestation.verified ? 'passed' : 'failed',
      correlationId,
      requestId,
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

  const response: SuccessResponse<{ count: number; rules: VerificationRule[] }> = {
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

const startServer = () =>
  app.listen(port, () => {
    process.stdout.write(
      [
        `[Ω∞v API] Verification loop server running on http://localhost:${port}`,
        'Available endpoints:',
        '  POST   /observe          - Create an observation',
        '  POST   /verify           - Verify an observation',
        '  POST   /attest           - Attest a verification',
        '  POST   /complete-loop    - Execute full loop in one request',
        '  GET    /state            - Runtime state',
        '  GET    /events           - Recent lifecycle events',
        '  GET    /events/stream    - Live lifecycle events',
        '  GET    /runs             - Completed runs',
        '  POST   /act              - Authorize an action',
        '  POST   /learn            - Record learning',
        '  POST   /recompile        - Propose a recompile',
        '  GET    /rules            - List verification rules',
        '  GET    /health           - Health check',
        '',
      ].join('\n')
    );
  });

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
export default app;
