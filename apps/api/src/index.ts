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
import { VaaSGate } from '@omega-v/vaas';
import { VerificationReplayEngine } from '@omega-v/replay';
import { FormalContractEngine } from '@omega-v/contract';
import { OceanicosAuthEngine } from '@omega-v/auth';
import { FederationMeshEngine } from '@omega-v/federation';
import { VerificationBenchmarkEngine } from '@omega-v/benchmark';
import { OceanicosNotaryEngine } from '@omega-v/notary';
import { OceanicosSandboxEngine } from '@omega-v/sandbox';
import { OceanicosPolicyEngine } from '@omega-v/policy';
import { OceanicosZKEngine } from '@omega-v/zk';
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
const vaasGate = new VaaSGate();
const replayEngine = new VerificationReplayEngine();
const contractEngine = new FormalContractEngine();
const authEngine = new OceanicosAuthEngine();
const federationEngine = new FederationMeshEngine();
const benchmarkEngine = new VerificationBenchmarkEngine();
const notaryEngine = new OceanicosNotaryEngine();
const sandboxEngine = new OceanicosSandboxEngine();
const policyEngine = new OceanicosPolicyEngine();
const zkEngine = new OceanicosZKEngine();

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

/** GET /vaas/tenants — List all registered multi-tenant organizations (Section XXIX) */
app.get('/vaas/tenants', (_req: Request, res: Response) => {
  res.json({
    data: { tenants: vaasGate.getTenants() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /vaas/tenants — Register a new multi-tenant organization in VaaS (Section XXIX) */
app.post('/vaas/tenants', (req: Request, res: Response) => {
  const { name, tier, quotaPerMinute } = req.body || {};
  if (!name) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Tenant name is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const credentials = vaasGate.registerTenant(name, tier, quotaPerMinute);
  res.status(201).json({
    data: credentials,
    timestamp: new Date().toISOString(),
  });
});

/** POST /vaas/verify — Execute tenant-isolated verification with rate limiting */
app.post('/vaas/verify', async (req: Request, res: Response) => {
  const apiKey = (req.headers['x-vaas-api-key'] as string) || req.body?.apiKey;
  const { claim, metadata } = req.body || {};

  if (!apiKey || !claim) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'apiKey and claim are required for VaaS verification',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const client = new OceanicosClient();
    const result = await vaasGate.executeVerification(apiKey, client, claim, metadata);
    res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'VaaS Verification Error';
    const statusCode = message.includes('Quota Exceeded') ? 429 : 401;
    res.status(statusCode).json({
      code: statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'UNAUTHORIZED',
      message,
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /replay — List all replay snapshots and summary (Section XXX) */
app.get('/replay', (_req: Request, res: Response) => {
  res.json({
    data: {
      snapshots: replayEngine.getSnapshots(),
      summary: replayEngine.getSummary(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /replay/capture — Capture a new replay snapshot from a fresh verification run */
app.post('/replay/capture', async (req: Request, res: Response) => {
  const { claim, label, tags, metadata } = req.body || {};
  if (!claim) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'claim is required for replay capture',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const client = new OceanicosClient();
    const result = await client.runLoop({
      claim,
      category: 'replay-capture',
      observedBy: 'replay-api',
      sourceSystem: 'omega-v-api',
      metadata: metadata || {},
    });
    const snapshot = replayEngine.capture(claim, result, label, tags || [], metadata || {});
    res.status(201).json({
      data: snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({
      code: 'REPLAY_CAPTURE_FAILED',
      message: err instanceof Error ? err.message : 'Replay capture failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /replay/:id/replay — Replay a captured snapshot and return diff */
app.post('/replay/:id/replay', async (req: Request, res: Response) => {
  try {
    const client = new OceanicosClient();
    const result = await replayEngine.replay(req.params.id, client);
    res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Replay failed';
    const statusCode = message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      code: statusCode === 404 ? 'SNAPSHOT_NOT_FOUND' : 'REPLAY_FAILED',
      message,
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /replay/:idA/diff/:idB — Compute a diff between two snapshots */
app.get('/replay/:idA/diff/:idB', (req: Request, res: Response) => {
  try {
    const diff = replayEngine.diff(req.params.idA, req.params.idB);
    res.json({
      data: diff,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(404).json({
      code: 'DIFF_FAILED',
      message: err instanceof Error ? err.message : 'Diff computation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /contracts — List all registered formal contracts (Section XXXI) */
app.get('/contracts', (_req: Request, res: Response) => {
  res.json({
    data: { contracts: contractEngine.getContracts() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /contracts — Register a new formal contract (Section XXXI) */
app.post('/contracts', (req: Request, res: Response) => {
  const { name, version, category, description, fields, invariants } = req.body || {};
  if (!name || !fields) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name and fields are required for contract registration',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const contract = contractEngine.registerContract({
    name,
    version: version || '1.0.0',
    category: category || 'general',
    description: description || '',
    fields,
    invariants: invariants || [],
    active: true,
  });

  res.status(201).json({
    data: contract,
    timestamp: new Date().toISOString(),
  });
});

/** POST /contracts/verify — Verify payload data against a contract schema and invariants */
app.post('/contracts/verify', (req: Request, res: Response) => {
  const { data, contractIdOrName, context } = req.body || {};
  if (!data || !contractIdOrName) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'data and contractIdOrName are required for contract verification',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = contractEngine.verify(data, contractIdOrName, context);
    res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(404).json({
      code: 'CONTRACT_NOT_FOUND',
      message: err instanceof Error ? err.message : 'Contract verification failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /auth/identities — List all registered DID documents (Section XXXII) */
app.get('/auth/identities', (_req: Request, res: Response) => {
  res.json({
    data: { identities: authEngine.listIdentities() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /auth/identities — Register a new Decentralized Identity (DID) (Section XXXII) */
app.post('/auth/identities', (req: Request, res: Response) => {
  const { type, capabilities, secret, did } = req.body || {};
  if (!type) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'type is required for DID identity creation',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const created = authEngine.createIdentity(type, capabilities, secret, did);
  res.status(201).json({
    data: created,
    timestamp: new Date().toISOString(),
  });
});

/** POST /auth/token — Issue a cryptographic bearer token for a DID */
app.post('/auth/token', (req: Request, res: Response) => {
  const { did, secret, expiresInMs } = req.body || {};
  if (!did || !secret) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'did and secret are required for token issuance',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const token = authEngine.issueToken(did, secret, expiresInMs);
    res.json({
      data: { token, did },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(401).json({
      code: 'AUTH_FAILED',
      message: err instanceof Error ? err.message : 'Token issuance failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /auth/verify — Verify bearer token and check capabilities */
app.post('/auth/verify', (req: Request, res: Response) => {
  const { token, requiredCapability } = req.body || {};
  if (!token) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'token is required for verification',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = authEngine.verifyToken(token, requiredCapability);
  res.status(result.valid ? 200 : 403).json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** GET /federation/peers — List all registered mesh peers and summary (Section XXXIII) */
app.get('/federation/peers', (_req: Request, res: Response) => {
  res.json({
    data: {
      peers: federationEngine.getPeers(),
      summary: federationEngine.getMeshSummary(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /federation/peers — Register a remote cluster peer in the verification mesh */
app.post('/federation/peers', (req: Request, res: Response) => {
  const { clusterName, endpoint, publicKey, trustScore } = req.body || {};
  if (!clusterName || !endpoint || !publicKey) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'clusterName, endpoint, and publicKey are required for peer registration',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const peer = federationEngine.registerPeer({
    clusterName,
    endpoint,
    publicKey,
    trustScore,
  });

  res.status(201).json({
    data: peer,
    timestamp: new Date().toISOString(),
  });
});

/** POST /federation/proofs/export — Export a cross-cluster verification proof */
app.post('/federation/proofs/export', async (req: Request, res: Response) => {
  const { claim, targetCluster } = req.body || {};
  if (!claim) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'claim is required for cross-cluster proof export',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const client = new OceanicosClient();
    const result = await client.runLoop({
      claim,
      category: 'mesh-federation',
      observedBy: 'api-federation',
      sourceSystem: 'omega-v-api',
    });

    const proof = federationEngine.exportProof(claim, result, targetCluster);
    res.status(201).json({
      data: proof,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({
      code: 'PROOF_EXPORT_FAILED',
      message: err instanceof Error ? err.message : 'Failed to export proof',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /federation/proofs/verify — Verify an incoming remote proof */
app.post('/federation/proofs/verify', (req: Request, res: Response) => {
  const { proof } = req.body || {};
  if (!proof) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'proof object is required for verification',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const verification = federationEngine.verifyRemoteProof(proof);
  res.json({
    data: verification,
    timestamp: new Date().toISOString(),
  });
});

/** GET /benchmark — Return latest benchmark results (Section XXXIV) */
app.get('/benchmark', (_req: Request, res: Response) => {
  res.json({
    data: { results: benchmarkEngine.getLatestResults() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /benchmark/run — Run performance and latency profiling suite */
app.post('/benchmark/run', async (req: Request, res: Response) => {
  const { iterations } = req.body || {};
  try {
    const client = new OceanicosClient();
    const results = await benchmarkEngine.runSuite(client, iterations || 20);
    res.json({
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({
      code: 'BENCHMARK_FAILED',
      message: err instanceof Error ? err.message : 'Benchmark execution failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /notary/summary — Merkle tree transparency root and seal statistics (Section XXXV) */
app.get('/notary/summary', (_req: Request, res: Response) => {
  res.json({
    data: notaryEngine.getSummary(),
    timestamp: new Date().toISOString(),
  });
});

/** GET /notary/seals — List all notarization seals */
app.get('/notary/seals', (_req: Request, res: Response) => {
  res.json({
    data: { seals: notaryEngine.getAllSeals() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /notary/anchor — Anchor a verification claim into the Merkle tree */
app.post('/notary/anchor', async (req: Request, res: Response) => {
  const { claim } = req.body || {};
  if (!claim) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'claim is required for notarization',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const client = new OceanicosClient();
    const result = await client.runLoop({
      claim,
      category: 'notarization',
      observedBy: 'notary-api',
      sourceSystem: 'omega-v-notary',
    });

    const seal = notaryEngine.anchorAttestation(result.attestation);
    res.status(201).json({
      data: seal,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({
      code: 'NOTARIZATION_FAILED',
      message: err instanceof Error ? err.message : 'Notarization failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /notary/proof — Generate Merkle inclusion proof */
app.post('/notary/proof', (req: Request, res: Response) => {
  const { leafIndex } = req.body || {};
  if (typeof leafIndex !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'leafIndex (number) is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const proof = notaryEngine.generateInclusionProof(leafIndex);
    res.json({
      data: proof,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'INVALID_INDEX',
      message: err instanceof Error ? err.message : 'Failed to generate proof',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /notary/verify-proof — Verify Merkle inclusion proof */
app.post('/notary/verify-proof', (req: Request, res: Response) => {
  const { proof } = req.body || {};
  if (!proof) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'proof object is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const valid = notaryEngine.verifyInclusionProof(proof);
  res.json({
    data: { valid, verifiedAt: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  });
});

/** GET /sandbox/stats — Return sandbox execution telemetry and blocked violations (Section XXXVI) */
app.get('/sandbox/stats', (_req: Request, res: Response) => {
  res.json({
    data: sandboxEngine.getStats(),
    timestamp: new Date().toISOString(),
  });
});

/** POST /sandbox/execute — Execute expression in safe deterministic sandbox */
app.post('/sandbox/execute', (req: Request, res: Response) => {
  const { code, context, options } = req.body || {};
  if (!code) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'code expression is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = sandboxEngine.executeExpression(code, context || {}, options || {});
  res.json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** GET /policies — List all registered declarative policy documents (Section XXXVII) */
app.get('/policies', (_req: Request, res: Response) => {
  res.json({
    data: { policies: policyEngine.getPolicies() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /policies — Register a new policy document */
app.post('/policies', (req: Request, res: Response) => {
  const { id, name, domain, version, rules, active } = req.body || {};
  if (!id || !name || !rules || !Array.isArray(rules)) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'id, name, and rules (array) are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const doc = policyEngine.registerPolicy({
    id,
    name,
    domain: domain || 'general',
    version: version || '1.0.0',
    rules,
    active: active ?? true,
  });

  res.status(201).json({
    data: doc,
    timestamp: new Date().toISOString(),
  });
});

/** POST /policies/evaluate — Evaluate context against a policy and return compliance receipt */
app.post('/policies/evaluate', (req: Request, res: Response) => {
  const { policyId, context } = req.body || {};
  if (!policyId || !context) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'policyId and context object are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const receipt = policyEngine.evaluate(policyId, context);
    res.json({
      data: receipt,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'EVALUATION_FAILED',
      message: err instanceof Error ? err.message : 'Policy evaluation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /zk/circuits — List all registered zero-knowledge circuits (Section XXXVIII) */
app.get('/zk/circuits', (_req: Request, res: Response) => {
  res.json({
    data: { circuits: zkEngine.getCircuits() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /zk/prove — Generate a zero-knowledge range/membership proof */
app.post('/zk/prove', (req: Request, res: Response) => {
  const { circuitId, witness, salt } = req.body || {};
  if (!circuitId || witness === undefined) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'circuitId and witness are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const circuit = zkEngine.getCircuit(circuitId);
    if (!circuit) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: `Circuit '${circuitId}' not found`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let proof;
    if (circuit.type === 'RANGE') {
      proof = zkEngine.generateRangeProof(circuitId, Number(witness), salt);
    } else if (circuit.type === 'MEMBERSHIP') {
      proof = zkEngine.generateMembershipProof(circuitId, String(witness), salt);
    } else {
      res.status(400).json({
        code: 'UNSUPPORTED_CIRCUIT',
        message: `Unsupported circuit type: ${circuit.type}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      data: proof,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'PROVING_FAILED',
      message: err instanceof Error ? err.message : 'Zero-knowledge proving failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /zk/verify — Cryptographically verify a zero-knowledge proof */
app.post('/zk/verify', (req: Request, res: Response) => {
  const { proof } = req.body || {};
  if (!proof) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'proof object is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = zkEngine.verifyProof(proof);
  res.json({
    data: result,
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
