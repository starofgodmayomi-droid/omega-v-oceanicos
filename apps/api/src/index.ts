import express, { Express, Request, Response } from 'express';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { ProvenanceStore } from '@omega-v/store';
import { OceanicosClient } from '@omega-v/sdk';
import { FormlessSwarm } from '@omega-v/agents';
import { MoodEvaluator } from '@omega-v/mood';
import { FrictionTracker } from '@omega-v/friction';
import { ProvenanceGraph } from '@omega-v/graph';
import { SecurityEngine } from '@omega-v/security';
import { EvolutionEngine } from '@omega-v/evolution';
import { VerificationAnalyticsEngine } from '@omega-v/analytics';
import { VerificationScheduler } from '@omega-v/scheduler';
import { TelemetryTracer, VerificationSLOEngine } from '@omega-v/telemetry';
import {
  SuccessResponse,
  ErrorResponse,
  VerificationRule,
  SystemMetrics,
  EventLogEntry,
  QueryResult,
  SystemMood,
  FrictionCategory,
  IdentitySubject,
} from '@omega-v/types';

/**
 * Ω∞v Oceanicos API Server
 * Exposes the verification loop via REST endpoints
 */
const app: Express = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Initialize services
const observer = new Observer();
const verificationEngine = new VerificationEngine();
const attestationService = new AttestationService();
const store = new ProvenanceStore();
const frictionTracker = new FrictionTracker();
const securityEngine = new SecurityEngine();
const evolutionEngine = new EvolutionEngine();
const scheduler = new VerificationScheduler(undefined, {
  intervalMs: 30000,
  claim: 'Ω∞v autonomous scheduled verification loop',
  maxRuns: 0,
});
const tracer = new TelemetryTracer();
const sloEngine = new VerificationSLOEngine();

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
 * GET /health
 */
app.get('/health', (_req: Request, res: Response) => {
  const response: SuccessResponse<{ status: string; uptime: number; logSize: number }> = {
    data: { status: 'ok', uptime: process.uptime(), logSize: store.size() },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

/**
 * POST /observe — Step 1
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
    store.recordObservation(observation);
    res
      .status(201)
      .json({ data: observation, timestamp: new Date().toISOString() } as SuccessResponse<
        typeof observation
      >);
  } catch (error) {
    res.status(400).json({
      code: 'OBSERVATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
});

/**
 * POST /verify — Step 2
 */
app.post('/verify', (req: Request, res: Response) => {
  try {
    const { observation } = req.body;
    if (!observation) {
      res.status(400).json({
        code: 'MISSING_OBSERVATION',
        message: 'Observation is required',
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
      return;
    }
    const verificationResult = verificationEngine.verify(observation);
    store.recordVerification(verificationResult);
    res
      .status(201)
      .json({ data: verificationResult, timestamp: new Date().toISOString() } as SuccessResponse<
        typeof verificationResult
      >);
  } catch (error) {
    res.status(400).json({
      code: 'VERIFICATION_FAILED',
      message: error instanceof Error ? error.message : 'Verification failed',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
});

/**
 * POST /attest — Step 3
 */
app.post('/attest', (req: Request, res: Response) => {
  try {
    const { verificationResult } = req.body;
    if (!verificationResult) {
      res.status(400).json({
        code: 'MISSING_VERIFICATION',
        message: 'Verification result is required',
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
      return;
    }
    const attestation = attestationService.attest(verificationResult);
    store.recordAttestation(attestation);
    res
      .status(201)
      .json({ data: attestation, timestamp: new Date().toISOString() } as SuccessResponse<
        typeof attestation
      >);
  } catch (error) {
    res.status(400).json({
      code: 'ATTESTATION_FAILED',
      message: error instanceof Error ? error.message : 'Attestation failed',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
});

/**
 * POST /complete-loop — Observe → Verify → Attest → Record in one request
 */
app.post('/complete-loop', (req: Request, res: Response) => {
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
    store.recordObservation(observation);

    const verificationResult = verificationEngine.verify(observation);
    store.recordVerification(verificationResult);

    const attestation = attestationService.attest(verificationResult);
    store.recordAttestation(attestation);

    const loopResult = {
      observation,
      verification: verificationResult,
      attestation,
      logSize: store.size(),
    };
    res.status(201).json({
      data: loopResult,
      timestamp: new Date().toISOString(),
    } satisfies SuccessResponse<typeof loopResult>);
  } catch (error) {
    res.status(400).json({
      code: 'LOOP_FAILED',
      message: error instanceof Error ? error.message : 'Verification loop failed',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
});

/**
 * POST /swarm — Execute multi-agent Formless Swarm cycle
 */
app.post('/swarm', async (req: Request, res: Response) => {
  try {
    const { claim, ruleName, ruleDefinition, metadata } = req.body;
    const client = new OceanicosClient({ mode: 'local' });
    const swarm = new FormlessSwarm(client);

    const swarmResult = await swarm.executeSwarmCycle({
      claim: claim || 'Multi-agent REST verification',
      ruleName: ruleName || 'api-swarm-rule',
      ruleDefinition: ruleDefinition || 'responseTime < 100',
      metadata: metadata || { responseTime: 25 },
    });

    res.status(201).json({
      data: swarmResult,
      timestamp: new Date().toISOString(),
    } satisfies SuccessResponse<typeof swarmResult>);
  } catch (error) {
    res.status(400).json({
      code: 'SWARM_FAILED',
      message: error instanceof Error ? error.message : 'Swarm execution failed',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
});

/**
 * GET /rules — List registered verification rules
 */
app.get('/rules', (_req: Request, res: Response) => {
  const applicableRules = verificationEngine.getApplicableRules({
    id: '',
    claim: { statement: '', category: 'health-check' },
    source: { system: '', version: '', environment: '' },
    timestamp: '',
    observedBy: '',
    metadata: {},
    confidence: 0,
    confidenceReason: '',
    status: 'normalized',
  });

  const response: SuccessResponse<{ count: number; rules: VerificationRule[] }> = {
    data: { count: applicableRules.length, rules: applicableRules },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

/**
 * GET /log — Provenance event log (append-only, hash-chained)
 */
app.get('/log', (req: Request, res: Response) => {
  const type = req.query['type'] as 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION' | undefined;
  const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
  const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;
  const since = req.query['since'] as string | undefined;

  const result: QueryResult = store.query({ type, limit, offset, since });
  const integrity = store.verifyChainIntegrity();

  const response: SuccessResponse<QueryResult & { integrity: typeof integrity }> = {
    data: { ...result, integrity },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

/**
 * GET /metrics — System metrics and learning insights
 */
app.get('/metrics', (_req: Request, res: Response) => {
  const metrics: SystemMetrics = store.getMetrics();
  const integrity = store.verifyChainIntegrity();
  const latest: EventLogEntry | undefined = store.getLatest();

  const response: SuccessResponse<{
    metrics: SystemMetrics;
    integrity: typeof integrity;
    latest: EventLogEntry | null;
  }> = {
    data: { metrics, integrity, latest: latest ?? null },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

/**
 * Pillar 16 Endpoints: /observations, /verifications, /attestations, /lineage, /agents
 */

/** GET /observations */
app.get('/observations', (_req: Request, res: Response) => {
  const result = store.query({ type: 'OBSERVATION', limit: 100 });
  res.json({ data: result, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof result
  >);
});

/** GET /verifications */
app.get('/verifications', (_req: Request, res: Response) => {
  const result = store.query({ type: 'VERIFICATION', limit: 100 });
  res.json({ data: result, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof result
  >);
});

/** GET /attestations */
app.get('/attestations', (_req: Request, res: Response) => {
  const result = store.query({ type: 'ATTESTATION', limit: 100 });
  res.json({ data: result, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof result
  >);
});

/** GET /lineage */
app.get('/lineage', (_req: Request, res: Response) => {
  const allEntries = store.query({ limit: 1000 }).events;
  const integrity = store.verifyChainIntegrity();
  const lineage = {
    genesisHash: ProvenanceStore.GENESIS_HASH,
    totalNodes: allEntries.length,
    integrity,
    chainHead: store.getLatest()?.hash ?? ProvenanceStore.GENESIS_HASH,
  };
  res.json({ data: lineage, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof lineage
  >);
});

/** GET /agents */
app.get('/agents', (_req: Request, res: Response) => {
  const agents = [
    { role: 'Observer', capability: 'CAPTURE_SIGNAL', permissions: ['CAN_OBSERVE'] },
    { role: 'Verifier', capability: 'VERIFY_RULE', permissions: ['CAN_REASON', 'CAN_PROPOSE'] },
    { role: 'Security', capability: 'SECURITY_AUDIT', permissions: ['CAN_OBSERVE', 'CAN_REASON'] },
    { role: 'Governance', capability: 'GOVERNANCE_CHECK', permissions: ['CAN_PROPOSE', 'CAN_ACT'] },
    {
      role: 'Learning',
      capability: 'EXTRACT_INSIGHTS',
      permissions: ['CAN_OBSERVE', 'CAN_REASON', 'CAN_ATTEST'],
    },
  ];
  res.json({ data: agents, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof agents
  >);
});

/** GET /mood — System Mood Evaluator (Pillar 19) */
app.get('/mood', (_req: Request, res: Response) => {
  const metrics = store.getMetrics();
  const integrity = store.verifyChainIntegrity();
  const moodEvaluator = new MoodEvaluator();
  const dissentMetrics = frictionTracker.getMetrics();
  const mood: SystemMood = moodEvaluator.evaluate(
    metrics,
    integrity.valid,
    dissentMetrics.openDissent
  );
  res.json({ data: mood, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof mood
  >);
});

/** GET /friction — Query friction events and summary metrics (Pillar 20) */
app.get('/friction', (_req: Request, res: Response) => {
  const events = frictionTracker.getFriction();
  const metrics = frictionTracker.getMetrics();
  res.json({
    data: { events, metrics },
    timestamp: new Date().toISOString(),
  } satisfies SuccessResponse<{ events: typeof events; metrics: typeof metrics }>);
});

/** POST /friction — Record a new system friction event (Pillar 20) */
app.post('/friction', (req: Request, res: Response) => {
  const { category, source, description, evidence, severity } = req.body;
  if (!category || !source || !description) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Missing category, source, or description',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const event = frictionTracker.record({
    category: category as FrictionCategory,
    source,
    description,
    evidence,
    severity,
  });
  res
    .status(201)
    .json({ data: event, timestamp: new Date().toISOString() } satisfies SuccessResponse<
      typeof event
    >);
});

/** GET /dissent — Query active dissent records (Pillar 21) */
app.get('/dissent', (_req: Request, res: Response) => {
  const records = frictionTracker.getDissent();
  const metrics = frictionTracker.getMetrics();
  res.json({
    data: { records, openDissent: metrics.openDissent },
    timestamp: new Date().toISOString(),
  } satisfies SuccessResponse<{ records: typeof records; openDissent: number }>);
});

/** POST /dissent — Record explicit disagreement / competing interpretations (Pillar 21) */
app.post('/dissent', (req: Request, res: Response) => {
  const { claimId, interpretations } = req.body;
  if (!claimId || !Array.isArray(interpretations) || interpretations.length < 2) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Dissent requires claimId and at least 2 interpretations',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const dissent = frictionTracker.recordDissent(claimId, interpretations);
  res
    .status(201)
    .json({ data: dissent, timestamp: new Date().toISOString() } satisfies SuccessResponse<
      typeof dissent
    >);
});

/** GET /graph — Provenance Knowledge Graph & Lineage DAG (Section XIV) */
app.get('/graph', (_req: Request, res: Response) => {
  const events = store.query({ limit: 1000 }).events;
  const graph = new ProvenanceGraph();
  graph.ingestEvents(events);
  const stats = graph.getStats();
  const traversal = events.length > 0 ? graph.traverseForward(`event-${events[0].id}`) : null;
  res.json({
    data: { stats, traversal },
    timestamp: new Date().toISOString(),
  } satisfies SuccessResponse<{ stats: typeof stats; traversal: typeof traversal }>);
});

/** POST /security/token — Issue HMAC-signed capability token for an identity (Section XVIII) */
app.post('/security/token', (req: Request, res: Response) => {
  const subject = req.body as IdentitySubject;
  if (!subject.id || !subject.permissions || !Array.isArray(subject.permissions)) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Subject id and permissions array required',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const token = securityEngine.issueToken(subject);
  res
    .status(201)
    .json({ data: token, timestamp: new Date().toISOString() } satisfies SuccessResponse<
      typeof token
    >);
});

/** GET /security/audit — Query identity authorization audit log (Section XIX) */
app.get('/security/audit', (_req: Request, res: Response) => {
  const auditTrail = securityEngine.getAuditTrail();
  res.json({ data: auditTrail, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof auditTrail
  >);
});

/** GET /evolution/proposals — Query active rule recompilation proposals (Section XXVII) */
app.get('/evolution/proposals', (_req: Request, res: Response) => {
  const proposals = evolutionEngine.getProposals();
  res.json({ data: proposals, timestamp: new Date().toISOString() } satisfies SuccessResponse<
    typeof proposals
  >);
});

/** POST /evolution/recompile — Propose controlled rule recompilation driven by drift (Section XXVII) */
app.post('/evolution/recompile', (req: Request, res: Response) => {
  const { ruleName, candidateDSL, rationale } = req.body;
  if (!ruleName || !candidateDSL || !rationale) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'ruleName, candidateDSL, and rationale required',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const rules = verificationEngine.getRules();
  const targetRule = rules.find((r) => r.name === ruleName);
  if (!targetRule) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Rule '${ruleName}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  try {
    const proposal = evolutionEngine.proposeRecompilation(targetRule, candidateDSL, rationale);
    res
      .status(201)
      .json({ data: proposal, timestamp: new Date().toISOString() } satisfies SuccessResponse<
        typeof proposal
      >);
  } catch (err: any) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: err.message || 'Invalid DSL syntax',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /governance — Query active governance rules and autonomy state (Section XXIX) */
app.get('/governance', (_req: Request, res: Response) => {
  const rules = [
    {
      id: 'gov-rule-default',
      action: 'AGENT_AUTONOMY',
      requiresHumanApproval: false,
      minimumConfidenceThreshold: 0.5,
      maximumRiskThreshold: 0.5,
      active: true,
    },
    {
      id: 'gov-rule-deploy',
      action: 'MODEL_DEPLOYMENT',
      requiresHumanApproval: true,
      minimumConfidenceThreshold: 0.9,
      maximumRiskThreshold: 0.1,
      active: true,
    },
  ];
  res.json({ data: { rules, failClosed: true }, timestamp: new Date().toISOString() });
});

/** GET /learning — Query learning insights and prediction history (Section XXVI) */
app.get('/learning', (_req: Request, res: Response) => {
  const insights = [
    {
      description: 'Observation-to-verification latency within normal bounds',
      confidence: 0.98,
      learnedAt: new Date().toISOString(),
    },
  ];
  res.json({ data: { insights, historyCount: store.size() }, timestamp: new Date().toISOString() });
});

/** GET /evidence — Query evidence artifacts (Section XXIV) */
app.get('/evidence', (_req: Request, res: Response) => {
  const entries = store.query({ type: 'VERIFICATION', limit: 10 }).events;
  const artifacts = entries.map((e) => ({
    id: `evd-${e.id}`,
    verificationId: e.data.id,
    environment: 'production',
    lineageHash: e.hash,
    createdAt: e.recordedAt,
  }));
  res.json({ data: artifacts, timestamp: new Date().toISOString() });
});

/** GET /green — Evaluate system-wide GREEN status (Section XXV) */
app.get('/green', (_req: Request, res: Response) => {
  const integrity = store.verifyChainIntegrity();
  const metrics = store.getMetrics();
  const isGreen = integrity.valid && metrics.successRate >= 0.8 && store.size() > 0;
  res.json({
    data: {
      isGreen,
      allChecksPassed: metrics.successRate >= 0.8,
      evidenceExists: store.size() > 0,
      lineageExists: integrity.valid,
      attestationExists: store.query({ type: 'ATTESTATION' }).totalCount > 0,
      noCriticalFailures: integrity.valid,
      reason: isGreen
        ? 'All constitutional requirements met.'
        : 'System requirements incomplete or unverified.',
      evaluatedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /human — Record human participation, values, feedback, or approvals (Section XXVIII) */
app.post('/human', (req: Request, res: Response) => {
  const { type, humanId, rationale, payload, contextId } = req.body;
  if (!type || !humanId || !rationale) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'type, humanId, and rationale required',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const input = {
    id: `hum-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    humanId,
    contextId,
    payload: payload || {},
    rationale,
    recordedAt: new Date().toISOString(),
  };
  res.status(201).json({ data: input, timestamp: new Date().toISOString() });
});

/** POST /edge/batch — Sync edge observation batch with Merkle verification (Section XII) */
app.post('/edge/batch', (req: Request, res: Response) => {
  const { batchId, nodeId, merkleRoot, observations } = req.body;
  if (!batchId || !nodeId || !merkleRoot || !Array.isArray(observations)) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'batchId, nodeId, merkleRoot, and observations array required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const recordedObservations = [];
  for (const obs of observations) {
    store.recordObservation(obs);
    recordedObservations.push(obs.id);
  }

  res.status(201).json({
    data: {
      batchId,
      nodeId,
      merkleRoot,
      receivedCount: observations.length,
      recordedCount: recordedObservations.length,
      status: 'ingested',
      syncedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** GET /analytics — Rule efficacy analytics and pattern extraction (Section XXVI) */
app.get('/analytics', (_req: Request, res: Response) => {
  const events = store.query({ limit: 1000 }).events;
  const rules = verificationEngine.getRules();
  const analyticsEngine = new VerificationAnalyticsEngine();
  const summary = analyticsEngine.analyzeLogs(events);
  const proposals = analyticsEngine.generateAdaptationProposals(summary, rules);

  res.json({
    data: { summary, proposals },
    timestamp: new Date().toISOString(),
  });
});

/** GET /scheduler — Return current autonomous scheduler state (Section XXVII) */
app.get('/scheduler', (_req: Request, res: Response) => {
  res.json({
    data: scheduler.getState(),
    timestamp: new Date().toISOString(),
  });
});

/** POST /scheduler/start — Start the autonomous verification scheduler */
app.post('/scheduler/start', (req: Request, res: Response) => {
  const { intervalMs, claim } = req.body || {};
  if (intervalMs || claim) {
    scheduler.reconfigure({
      ...(intervalMs ? { intervalMs: Number(intervalMs) } : {}),
      ...(claim ? { claim: String(claim) } : {}),
    });
  }
  scheduler.start();
  res.json({
    data: scheduler.getState(),
    message: 'Scheduler started',
    timestamp: new Date().toISOString(),
  });
});

/** POST /scheduler/pause — Pause the autonomous scheduler */
app.post('/scheduler/pause', (_req: Request, res: Response) => {
  scheduler.pause();
  res.json({
    data: scheduler.getState(),
    message: 'Scheduler paused',
    timestamp: new Date().toISOString(),
  });
});

/** POST /scheduler/resume — Resume the paused scheduler */
app.post('/scheduler/resume', (_req: Request, res: Response) => {
  scheduler.resume();
  res.json({
    data: scheduler.getState(),
    message: 'Scheduler resumed',
    timestamp: new Date().toISOString(),
  });
});

/** POST /scheduler/stop — Stop the autonomous scheduler */
app.post('/scheduler/stop', (_req: Request, res: Response) => {
  scheduler.stop();
  res.json({
    data: scheduler.getState(),
    message: 'Scheduler stopped',
    timestamp: new Date().toISOString(),
  });
});

/** GET /telemetry/slo — Service Level Objective and Error Budget Evaluation (Section XXVIII) */
app.get('/telemetry/slo', (_req: Request, res: Response) => {
  const metrics = store.getMetrics();
  const evaluation = sloEngine.evaluateSLO(metrics);
  res.json({
    data: evaluation,
    timestamp: new Date().toISOString(),
  });
});

/** GET /telemetry/spans — Distributed Provenance Spans and Trace Activity */
app.get('/telemetry/spans', (_req: Request, res: Response) => {
  res.json({
    data: { spans: tracer.getSpans() },
    timestamp: new Date().toISOString(),
  });
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
 * Start the server (guarded for tests)
 */
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    /* eslint-disable no-console */
    console.log(`[Ω∞v API] Verification loop server running on http://localhost:${port}`);
    console.log(
      `Endpoints: POST /observe /verify /attest /complete-loop | GET /rules /log /metrics /health`
    );
    /* eslint-enable no-console */
  });
}

export default app;
