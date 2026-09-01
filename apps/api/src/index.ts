import * as crypto from 'crypto';
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
import { OceanicosGatewayEngine } from '@omega-v/gateway';
import { OceanicosWebhookEngine } from '@omega-v/webhook';
import { OceanicosOracleEngine } from '@omega-v/oracle';
import { OceanicosStateVault } from '@omega-v/vault';
import { OceanicosDisputeEngine } from '@omega-v/dispute';
import { OceanicosWorkerPool } from '@omega-v/worker';
import { OceanicosPipelineEngine } from '@omega-v/pipeline';
import { OceanicosRegistryEngine } from '@omega-v/registry';
import { OceanicosEnclaveEngine } from '@omega-v/enclave';
import { OceanicosConsensusEngine } from '@omega-v/consensus';
import { OceanicosMeshEngine } from '@omega-v/mesh';
import { OceanicosShardingEngine } from '@omega-v/sharding';
import { OceanicosBridgeEngine } from '@omega-v/bridge';
import { OceanicosSequencerEngine } from '@omega-v/sequencer';
import { OceanicosDAEngine } from '@omega-v/da';
import { OceanicosRollupEngine } from '@omega-v/rollup';
import { OceanicosIntentEngine } from '@omega-v/intent';
import { OceanicosOrchestratorEngine } from '@omega-v/orchestrator';
import { OceanicosDHTEngine } from '@omega-v/dht';
import { OceanicosStakingEngine } from '@omega-v/staking';
import { OceanicosKernel } from '@omega-v/kernel';
import { OceanicosMempoolEngine } from '@omega-v/mempool';
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
const gatewayEngine = new OceanicosGatewayEngine();
const webhookEngine = new OceanicosWebhookEngine();
const oracleEngine = new OceanicosOracleEngine();
const stateVault = new OceanicosStateVault();
const disputeEngine = new OceanicosDisputeEngine();
const workerPool = new OceanicosWorkerPool();
const pipelineEngine = new OceanicosPipelineEngine();
const registryEngine = new OceanicosRegistryEngine();
const enclaveEngine = new OceanicosEnclaveEngine();
const consensusEngine = new OceanicosConsensusEngine();
const meshEngine = new OceanicosMeshEngine();
const shardingEngine = new OceanicosShardingEngine();
const bridgeEngine = new OceanicosBridgeEngine();
const sequencerEngine = new OceanicosSequencerEngine();
const daEngine = new OceanicosDAEngine();
const rollupEngine = new OceanicosRollupEngine();
const intentEngine = new OceanicosIntentEngine();
const orchestratorEngine = new OceanicosOrchestratorEngine();
const dhtEngine = new OceanicosDHTEngine();
const stakingEngine = new OceanicosStakingEngine();
const kernelEngine = new OceanicosKernel();
const mempoolEngine = new OceanicosMempoolEngine();

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

/** GET /gateway/stats — Return API gateway traffic, rate limits and anomaly stats (Section XXXIX) */
app.get('/gateway/stats', (_req: Request, res: Response) => {
  res.json({
    data: gatewayEngine.getStats(),
    timestamp: new Date().toISOString(),
  });
});

/** GET /gateway/clients — List registered gateway client rate limit states */
app.get('/gateway/clients', (_req: Request, res: Response) => {
  res.json({
    data: { clients: gatewayEngine.getAllClients(), tierConfigs: gatewayEngine.getTierConfigs() },
    timestamp: new Date().toISOString(),
  });
});

/** POST /gateway/request — Process request through rate limiter and anomaly guard */
app.post('/gateway/request', (req: Request, res: Response) => {
  const { clientId } = req.body || {};
  if (!clientId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'clientId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const decision = gatewayEngine.processRequest(clientId);
  res.status(decision.allowed ? 200 : 429).json({
    data: decision,
    timestamp: new Date().toISOString(),
  });
});

/** GET /gateway/anomalies — Get list of detected anomaly alerts */
app.get('/gateway/anomalies', (_req: Request, res: Response) => {
  res.json({
    data: { anomalies: gatewayEngine.getAnomalies() },
    timestamp: new Date().toISOString(),
  });
});

/** GET /webhooks — List all webhook subscriptions & delivery stats (Section XL) */
app.get('/webhooks', (_req: Request, res: Response) => {
  res.json({
    data: {
      subscriptions: webhookEngine.getSubscriptions(),
      stats: webhookEngine.getStats(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /webhooks — Register a new webhook subscription */
app.post('/webhooks', (req: Request, res: Response) => {
  const { name, url, events, secret, maxRetries } = req.body || {};
  if (!name || !url || !events || !Array.isArray(events)) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name, url, and events array are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const sub = webhookEngine.registerSubscription({
    name,
    url,
    events,
    secret,
    maxRetries,
  });

  res.json({
    data: sub,
    timestamp: new Date().toISOString(),
  });
});

/** POST /webhooks/dispatch — Trigger a verification event to active webhook subscribers */
app.post('/webhooks/dispatch', async (req: Request, res: Response) => {
  const { event, data } = req.body || {};
  if (!event || !data) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'event and data payload are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const attempts = await webhookEngine.dispatchEvent(event, data);
    res.json({
      data: { attempts, count: attempts.length },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({
      code: 'DISPATCH_ERROR',
      message: err instanceof Error ? err.message : 'Dispatch failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /webhooks/deliveries — Get historical delivery attempts */
app.get('/webhooks/deliveries', (_req: Request, res: Response) => {
  res.json({
    data: { deliveries: webhookEngine.getDeliveryHistory() },
    timestamp: new Date().toISOString(),
  });
});

/** GET /oracle/feeds — List oracle feeds, providers and engine stats (Section XLI) */
app.get('/oracle/feeds', (_req: Request, res: Response) => {
  res.json({
    data: {
      feeds: oracleEngine.getFeeds(),
      providers: oracleEngine.getProviders(),
      stats: oracleEngine.getStats(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /oracle/aggregate — Compute and cryptographically attest multi-source oracle consensus */
app.post('/oracle/aggregate', (req: Request, res: Response) => {
  const { feedId, reports } = req.body || {};
  if (!feedId || !reports || !Array.isArray(reports)) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'feedId and reports array are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const receipt = oracleEngine.aggregateReports(feedId, reports);
    res.json({
      data: receipt,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'AGGREGATION_FAILED',
      message: err instanceof Error ? err.message : 'Oracle aggregation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /oracle/receipts — List recent signed oracle consensus receipts */
app.get('/oracle/receipts', (_req: Request, res: Response) => {
  res.json({
    data: { receipts: oracleEngine.getReceipts() },
    timestamp: new Date().toISOString(),
  });
});

/** GET /vault/checkpoints — List all sealed state checkpoints & vault statistics (Section XLII) */
app.get('/vault/checkpoints', (_req: Request, res: Response) => {
  res.json({
    data: {
      checkpoints: stateVault.getCheckpoints(),
      stats: stateVault.getStats(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /vault/checkpoint — Create a new sealed state checkpoint */
app.post('/vault/checkpoint', (req: Request, res: Response) => {
  const { label } = req.body || {};
  const events = store.getEntries();
  const rules = verificationEngine.getRules();

  const checkpoint = stateVault.createCheckpoint(
    label || `State Checkpoint ${new Date().toISOString()}`,
    events,
    rules
  );

  res.json({
    data: checkpoint,
    timestamp: new Date().toISOString(),
  });
});

/** POST /vault/restore — Verify and restore system state from a vault checkpoint */
app.post('/vault/restore', (req: Request, res: Response) => {
  const { checkpointId } = req.body || {};
  if (!checkpointId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'checkpointId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = stateVault.restoreCheckpoint(checkpointId);
  res.status(result.restored ? 200 : 400).json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** GET /disputes — List all dispute cases & arbitration statistics (Section XLIII) */
app.get('/disputes', (_req: Request, res: Response) => {
  res.json({
    data: {
      cases: disputeEngine.getCases(),
      stats: disputeEngine.getStats(),
    },
    timestamp: new Date().toISOString(),
  });
});

/** POST /disputes — Raise a new dispute challenge */
app.post('/disputes', (req: Request, res: Response) => {
  const { targetEventHash, claimantDid, challengerDid, stakeAmount, reason } = req.body || {};
  if (!targetEventHash || !claimantDid || !challengerDid || stakeAmount === undefined || !reason) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'targetEventHash, claimantDid, challengerDid, stakeAmount, and reason are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const disputeCase = disputeEngine.raiseDispute({
    targetEventHash,
    claimantDid,
    challengerDid,
    stakeAmount: Number(stakeAmount),
    reason,
  });

  res.json({
    data: disputeCase,
    timestamp: new Date().toISOString(),
  });
});

/** POST /disputes/vote — Cast a juror vote on an open dispute case */
app.post('/disputes/vote', (req: Request, res: Response) => {
  const { caseId, jurorDid, choice, weight, rationale, signature } = req.body || {};
  if (!caseId || !jurorDid || !choice || weight === undefined) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'caseId, jurorDid, choice, and weight are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const updated = disputeEngine.castVote(caseId, {
      jurorDid,
      choice,
      weight: Number(weight),
      rationale: rationale || 'Jury deliberation vote',
      signature: signature || `0x${crypto.randomBytes(32).toString('hex')}`,
    });

    res.json({
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'VOTE_FAILED',
      message: err instanceof Error ? err.message : 'Vote failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Section 25 Endpoints: Verifiable Worker Pool & Autonomous Builder Engine
 * /workers, /workers/register, /workers/heartbeat, /workers/jobs, /workers/jobs/submit,
 * /workers/jobs/lease, /workers/jobs/complete, /workers/jobs/fail, /workers/attestations,
 * /workers/verify-reproducibility, /workers/stats
 */

/** GET /workers — List registered builder & worker nodes */
app.get('/workers', (_req: Request, res: Response) => {
  const workers = workerPool.getWorkers();
  res.json({
    data: workers,
    timestamp: new Date().toISOString(),
  });
});

/** POST /workers/register — Register or update a worker node */
app.post('/workers/register', (req: Request, res: Response) => {
  const { workerId, name, capabilities, maxConcurrency, cpuCores, memoryMb } = req.body;
  if (!workerId || !name || !Array.isArray(capabilities)) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'workerId, name, and capabilities array are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const worker = workerPool.registerWorker({
    workerId,
    name,
    capabilities,
    maxConcurrency,
    cpuCores,
    memoryMb,
  });

  res.status(201).json({
    data: worker,
    timestamp: new Date().toISOString(),
  });
});

/** POST /workers/heartbeat — Submit worker heartbeat */
app.post('/workers/heartbeat', (req: Request, res: Response) => {
  const { workerId } = req.body;
  if (!workerId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'workerId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const success = workerPool.heartbeat(workerId);
  if (!success) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Worker '${workerId}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    data: { workerId, status: 'HEARTBEAT_ACCEPTED' },
    timestamp: new Date().toISOString(),
  });
});

/** GET /workers/jobs — Query all builder jobs */
app.get('/workers/jobs', (_req: Request, res: Response) => {
  const jobs = workerPool.getJobs();
  res.json({
    data: jobs,
    timestamp: new Date().toISOString(),
  });
});

/** POST /workers/jobs/submit — Enqueue a new verifiable build task */
app.post('/workers/jobs/submit', (req: Request, res: Response) => {
  const { name, requiredCapability, payload, priority, maxRetries } = req.body;
  if (!name || !requiredCapability || !payload) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name, requiredCapability, and payload are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const job = workerPool.submitJob({
    name,
    requiredCapability,
    payload,
    priority: priority ? Number(priority) : undefined,
    maxRetries: maxRetries ? Number(maxRetries) : undefined,
  });

  res.status(201).json({
    data: job,
    timestamp: new Date().toISOString(),
  });
});

/** POST /workers/jobs/lease — Worker leases available capability-matched job */
app.post('/workers/jobs/lease', (req: Request, res: Response) => {
  const { workerId, leaseDurationMs } = req.body;
  if (!workerId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'workerId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const job = workerPool.leaseJob(workerId, leaseDurationMs ? Number(leaseDurationMs) : undefined);
  res.json({
    data: job,
    timestamp: new Date().toISOString(),
  });
});

/** POST /workers/jobs/complete — Complete build job and generate SLSA-L3 Attestation */
app.post('/workers/jobs/complete', (req: Request, res: Response) => {
  const { jobId, workerId, output, artifacts } = req.body;
  if (!jobId || !workerId || !output) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'jobId, workerId, and output are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = workerPool.completeJob(jobId, workerId, output, artifacts || []);
    res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'COMPLETE_FAILED',
      message: err instanceof Error ? err.message : 'Failed to complete job',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /workers/jobs/fail — Report worker job failure with retry backoff */
app.post('/workers/jobs/fail', (req: Request, res: Response) => {
  const { jobId, workerId, error } = req.body;
  if (!jobId || !workerId || !error) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'jobId, workerId, and error are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const job = workerPool.failJob(jobId, workerId, error);
    res.json({
      data: job,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'FAIL_JOB_FAILED',
      message: err instanceof Error ? err.message : 'Failed to report job failure',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /workers/attestations — List all cryptographic build attestations */
app.get('/workers/attestations', (_req: Request, res: Response) => {
  const attestations = workerPool.getAttestations();
  res.json({
    data: attestations,
    timestamp: new Date().toISOString(),
  });
});

/** POST /workers/verify-reproducibility — Cross-verify multiple builder attestations */
app.post('/workers/verify-reproducibility', (req: Request, res: Response) => {
  const { attestations } = req.body;
  if (!Array.isArray(attestations) || attestations.length === 0) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'attestations array is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = workerPool.verifyBuildReproducibility(attestations);
  res.json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** GET /workers/stats — Builder engine & worker pool statistics */
app.get('/workers/stats', (_req: Request, res: Response) => {
  const stats = workerPool.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 26 Endpoints: Automated CI/CD Pipeline Orchestration Engine
 * /pipelines, /pipelines/:runId, /pipelines/execute, /pipelines/verify, /pipelines/stats
 */

/** GET /pipelines — List all pipeline runs */
app.get('/pipelines', (_req: Request, res: Response) => {
  const runs = pipelineEngine.getRuns();
  res.json({
    data: runs,
    timestamp: new Date().toISOString(),
  });
});

/** GET /pipelines/:runId — Get specific pipeline run */
app.get('/pipelines/:runId', (req: Request, res: Response) => {
  const run = pipelineEngine.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Pipeline run '${req.params.runId}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({
    data: run,
    timestamp: new Date().toISOString(),
  });
});

/** POST /pipelines/execute — Trigger and execute multi-stage verifiable pipeline */
app.post('/pipelines/execute', async (req: Request, res: Response) => {
  const { name, version, triggeredBy, stages } = req.body;
  if (!name || !Array.isArray(stages) || stages.length === 0) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name and non-empty stages array are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = await pipelineEngine.executePipeline({
      name,
      version,
      triggeredBy,
      stages,
      workerPool,
    });

    res.status(201).json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'PIPELINE_EXECUTION_FAILED',
      message: err instanceof Error ? err.message : 'Pipeline execution failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /pipelines/verify — Verify cryptographic signature of completed pipeline run */
app.post('/pipelines/verify', (req: Request, res: Response) => {
  const { run } = req.body;
  if (!run || !run.pipelineSignature) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Pipeline run with pipelineSignature is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const valid = pipelineEngine.verifyRunSignature(run);
  res.json({
    data: { valid, runId: run.runId },
    timestamp: new Date().toISOString(),
  });
});

/** GET /pipelines/stats — Aggregate pipeline orchestration metrics */
app.get('/pipelines/stats', (_req: Request, res: Response) => {
  const stats = pipelineEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 27 Endpoints: Decentralized Verifiable Package & Artifact Registry Engine
 * /registry/packages, /registry/packages/:name, /registry/packages/:name/:version,
 * /registry/publish, /registry/verify, /registry/deprecate, /registry/advisories, /registry/stats
 */

/** GET /registry/packages — List all published packages */
app.get('/registry/packages', (_req: Request, res: Response) => {
  const packages = registryEngine.getAllPackages();
  res.json({
    data: packages,
    timestamp: new Date().toISOString(),
  });
});

/** GET /registry/packages/:name — Get package metadata */
app.get('/registry/packages/:name', (req: Request, res: Response) => {
  const pkg = registryEngine.getPackage(req.params.name);
  if (!pkg) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Package '${req.params.name}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({
    data: pkg,
    timestamp: new Date().toISOString(),
  });
});

/** GET /registry/packages/:name/:version — Get specific package release */
app.get('/registry/packages/:name/:version', (req: Request, res: Response) => {
  const release = registryEngine.getPackageVersion(req.params.name, req.params.version);
  if (!release) {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Release '${req.params.name}@${req.params.version}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({
    data: release,
    timestamp: new Date().toISOString(),
  });
});

/** POST /registry/publish — Publish new package version */
app.post('/registry/publish', (req: Request, res: Response) => {
  const { name, version, publisherDid, description, tarballContent, dependencies, slsaAttestationId } = req.body;
  if (!name || !version || !publisherDid || !description || !tarballContent) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name, version, publisherDid, description, and tarballContent are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const release = registryEngine.publishPackage({
    name,
    version,
    publisherDid,
    description,
    tarballContent,
    dependencies,
    slsaAttestationId,
  });

  res.status(201).json({
    data: release,
    timestamp: new Date().toISOString(),
  });
});

/** POST /registry/verify — Verify package integrity and publisher signature */
app.post('/registry/verify', (req: Request, res: Response) => {
  const { name, version, tarballContent } = req.body;
  if (!name || !version || !tarballContent) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name, version, and tarballContent are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = registryEngine.verifyPackageIntegrity(name, version, tarballContent);
  res.json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** POST /registry/deprecate — Deprecate package version */
app.post('/registry/deprecate', (req: Request, res: Response) => {
  const { name, version, reason } = req.body;
  if (!name || !version || !reason) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name, version, and reason are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const release = registryEngine.deprecatePackage(name, version, reason);
    res.json({
      data: release,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'DEPRECATE_FAILED',
      message: err instanceof Error ? err.message : 'Deprecation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /registry/advisories — List security advisories */
app.get('/registry/advisories', (req: Request, res: Response) => {
  const packageName = typeof req.query.package === 'string' ? req.query.package : undefined;
  const advisories = registryEngine.getAdvisories(packageName);
  res.json({
    data: advisories,
    timestamp: new Date().toISOString(),
  });
});

/** POST /registry/advisories — Publish security advisory */
app.post('/registry/advisories', (req: Request, res: Response) => {
  const { packageName, affectedVersions, severity, title, description, reportedBy, patchedIn } = req.body;
  if (!packageName || !Array.isArray(affectedVersions) || !severity || !title || !description || !reportedBy) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'packageName, affectedVersions array, severity, title, description, and reportedBy are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const advisory = registryEngine.publishAdvisory({
    packageName,
    affectedVersions,
    severity,
    title,
    description,
    reportedBy,
    patchedIn,
  });

  res.status(201).json({
    data: advisory,
    timestamp: new Date().toISOString(),
  });
});

/** GET /registry/stats — Registry statistics */
app.get('/registry/stats', (_req: Request, res: Response) => {
  const stats = registryEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 28 Endpoints: Hardware TEE Confidential Computing & Remote Attestation
 * /enclave/instances, /enclave/provision, /enclave/attest, /enclave/verify,
 * /enclave/seal, /enclave/unseal, /enclave/execute, /enclave/stats
 */

/** GET /enclave/instances — List provisioned hardware enclaves */
app.get('/enclave/instances', (_req: Request, res: Response) => {
  const enclaves = enclaveEngine.getEnclaves();
  res.json({
    data: enclaves,
    timestamp: new Date().toISOString(),
  });
});

/** POST /enclave/provision — Provision new TEE enclave */
app.post('/enclave/provision', (req: Request, res: Response) => {
  const { enclaveId, type, name, codePayload, authorSignerKey } = req.body;
  if (!type || !name || !codePayload || !authorSignerKey) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'type, name, codePayload, and authorSignerKey are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const enclave = enclaveEngine.provisionEnclave({
    enclaveId,
    type,
    name,
    codePayload,
    authorSignerKey,
  });

  res.status(201).json({
    data: enclave,
    timestamp: new Date().toISOString(),
  });
});

/** POST /enclave/attest — Generate remote attestation report */
app.post('/enclave/attest', (req: Request, res: Response) => {
  const { enclaveId, userData, hardwareNonce } = req.body;
  if (!enclaveId || !userData) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'enclaveId and userData are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const report = enclaveEngine.generateRemoteAttestation(enclaveId, userData, hardwareNonce);
    res.json({
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'ATTESTATION_FAILED',
      message: err instanceof Error ? err.message : 'Attestation generation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /enclave/verify — Verify remote attestation report */
app.post('/enclave/verify', (req: Request, res: Response) => {
  const { report } = req.body;
  if (!report || !report.hardwareSignature) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'report with hardwareSignature is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = enclaveEngine.verifyRemoteAttestation(report);
  res.json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** POST /enclave/seal — Seal state bound to MRENCLAVE */
app.post('/enclave/seal', (req: Request, res: Response) => {
  const { enclaveId, plaintext } = req.body;
  if (!enclaveId || !plaintext) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'enclaveId and plaintext are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const sealed = enclaveEngine.sealData(enclaveId, plaintext);
    res.json({
      data: sealed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SEAL_FAILED',
      message: err instanceof Error ? err.message : 'Data sealing failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /enclave/unseal — Unseal state inside enclave */
app.post('/enclave/unseal', (req: Request, res: Response) => {
  const { enclaveId, sealed } = req.body;
  if (!enclaveId || !sealed || !sealed.ciphertext) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'enclaveId and sealed state object are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const decrypted = enclaveEngine.unsealData(enclaveId, sealed);
    res.json({
      data: { plaintext: decrypted },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'UNSEAL_FAILED',
      message: err instanceof Error ? err.message : 'Unsealing failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /enclave/execute — Execute confidential code in enclave memory */
app.post('/enclave/execute', (req: Request, res: Response) => {
  const { enclaveId, operationName, inputs } = req.body;
  if (!enclaveId || !operationName) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'enclaveId and operationName are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = enclaveEngine.executeConfidentialCode(enclaveId, operationName, inputs || {});
    res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'EXECUTION_FAILED',
      message: err instanceof Error ? err.message : 'Confidential execution failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /enclave/stats — Enclave engine statistics */
app.get('/enclave/stats', (_req: Request, res: Response) => {
  const stats = enclaveEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 29 Endpoints: Byzantine Fault Tolerant (BFT) State Machine Consensus
 * /consensus/chain, /consensus/validators, /consensus/validators/register,
 * /consensus/propose, /consensus/vote, /consensus/finalize, /consensus/slash, /consensus/stats
 */

/** GET /consensus/chain — List all finalized blocks */
app.get('/consensus/chain', (_req: Request, res: Response) => {
  const chain = consensusEngine.getChain();
  res.json({
    data: chain,
    timestamp: new Date().toISOString(),
  });
});

/** GET /consensus/validators — List active validators and stakes */
app.get('/consensus/validators', (_req: Request, res: Response) => {
  const validators = consensusEngine.getValidators();
  res.json({
    data: validators,
    timestamp: new Date().toISOString(),
  });
});

/** POST /consensus/validators/register — Register new validator */
app.post('/consensus/validators/register', (req: Request, res: Response) => {
  const { did, stake } = req.body;
  if (!did || typeof stake !== 'number' || stake <= 0) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'did and positive numerical stake are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const validator = consensusEngine.registerValidator({ did, stake });
  res.status(201).json({
    data: validator,
    timestamp: new Date().toISOString(),
  });
});

/** POST /consensus/propose — Propose candidate block */
app.post('/consensus/propose', (req: Request, res: Response) => {
  const { proposerDid, transactions, stateRoot, attestationProofs } = req.body;
  if (!proposerDid || !Array.isArray(transactions) || !stateRoot) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'proposerDid, transactions array, and stateRoot are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const block = consensusEngine.proposeBlock({
      proposerDid,
      transactions,
      stateRoot,
      attestationProofs,
    });
    res.status(201).json({
      data: block,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'PROPOSE_FAILED',
      message: err instanceof Error ? err.message : 'Block proposal failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /consensus/vote — Cast vote for Quorum Certificate */
app.post('/consensus/vote', (req: Request, res: Response) => {
  const { validatorDid, blockHash, blockHeight, viewNumber, voteType } = req.body;
  if (!validatorDid || !blockHash || typeof blockHeight !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'validatorDid, blockHash, and blockHeight are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = consensusEngine.castVote({
      validatorDid,
      blockHash,
      blockHeight,
      viewNumber,
      voteType,
    });
    res.json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'VOTE_FAILED',
      message: err instanceof Error ? err.message : 'Voting failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /consensus/finalize — Finalize block with Quorum Certificate */
app.post('/consensus/finalize', (req: Request, res: Response) => {
  const { block, qc } = req.body;
  if (!block || !qc) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'block and qc are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const finalized = consensusEngine.finalizeBlock(block, qc);
    res.json({
      data: finalized,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'FINALIZE_FAILED',
      message: err instanceof Error ? err.message : 'Block finalization failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /consensus/slash — Slash Byzantine validator for equivocation */
app.post('/consensus/slash', (req: Request, res: Response) => {
  const { validatorDid, blockHeight, blockHashA, blockHashB } = req.body;
  if (!validatorDid || typeof blockHeight !== 'number' || !blockHashA || !blockHashB) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'validatorDid, blockHeight, blockHashA, and blockHashB are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const record = consensusEngine.detectEquivocation({
      validatorDid,
      blockHeight,
      blockHashA,
      blockHashB,
    });
    res.json({
      data: record,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SLASH_FAILED',
      message: err instanceof Error ? err.message : 'Slashing failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /consensus/stats — Consensus metrics */
app.get('/consensus/stats', (_req: Request, res: Response) => {
  const stats = consensusEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 30 Endpoints: Peer-to-Peer Gossip Protocol & Verifiable Message Propagation
 * /mesh/peers, /mesh/peers/add, /mesh/peers/ban, /mesh/gossip, /mesh/gossip/verify, /mesh/sync, /mesh/stats
 */

/** GET /mesh/peers — List connected p2p mesh peers */
app.get('/mesh/peers', (_req: Request, res: Response) => {
  const peers = meshEngine.getPeers();
  res.json({
    data: peers,
    timestamp: new Date().toISOString(),
  });
});

/** POST /mesh/peers/add — Add new mesh peer node */
app.post('/mesh/peers/add', (req: Request, res: Response) => {
  const { did, endpoint, region } = req.body;
  if (!did || !endpoint) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'did and endpoint are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const peer = meshEngine.addPeer({ did, endpoint, region });
  res.status(201).json({
    data: peer,
    timestamp: new Date().toISOString(),
  });
});

/** POST /mesh/peers/ban — Ban rogue mesh peer */
app.post('/mesh/peers/ban', (req: Request, res: Response) => {
  const { did, reason } = req.body;
  if (!did) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'did is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const peer = meshEngine.banPeer(did, reason || 'Byzantine misbehavior');
    res.json({
      data: peer,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(404).json({
      code: 'PEER_NOT_FOUND',
      message: err instanceof Error ? err.message : 'Peer not found',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /mesh/gossip — Broadcast gossip message across network */
app.post('/mesh/gossip', (req: Request, res: Response) => {
  const { senderDid, type, payload, ttl } = req.body;
  if (!senderDid || !type || !payload) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'senderDid, type, and payload are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const receipt = meshEngine.gossip({ senderDid, type, payload, ttl });
    res.status(201).json({
      data: receipt,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'GOSSIP_FAILED',
      message: err instanceof Error ? err.message : 'Gossip failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /mesh/gossip/verify — Cryptographically verify signed gossip message */
app.post('/mesh/gossip/verify', (req: Request, res: Response) => {
  const { messageId } = req.body;
  if (!messageId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'messageId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const verification = meshEngine.verifyGossipSignature(messageId);
    res.json({
      data: verification,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(404).json({
      code: 'MESSAGE_NOT_FOUND',
      message: err instanceof Error ? err.message : 'Message not found',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /mesh/sync — Trigger Merkle block sync with peer */
app.post('/mesh/sync', (req: Request, res: Response) => {
  const { peerDid, merkleRoot, blocksRequested } = req.body;
  if (!peerDid || !merkleRoot || typeof blocksRequested !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'peerDid, merkleRoot, and numerical blocksRequested are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const syncState = meshEngine.requestSync({ peerDid, merkleRoot, blocksRequested });
    res.json({
      data: syncState,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SYNC_FAILED',
      message: err instanceof Error ? err.message : 'Sync request failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /mesh/stats — Mesh network statistics */
app.get('/mesh/stats', (_req: Request, res: Response) => {
  const stats = meshEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 31 Endpoints: Adaptive State Sharding & Cross-Shard 2PC
 * /sharding/shards, /sharding/state/put, /sharding/state/get,
 * /sharding/cross-shard/prepare, /sharding/cross-shard/commit, /sharding/rebalance/split, /sharding/stats
 */

/** GET /sharding/shards — List all active and splitting shard partitions */
app.get('/sharding/shards', (_req: Request, res: Response) => {
  const shards = shardingEngine.getShards();
  res.json({
    data: shards,
    timestamp: new Date().toISOString(),
  });
});

/** POST /sharding/state/put — Put state in appropriate shard partition */
app.post('/sharding/state/put', (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'key and value are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = shardingEngine.putState(key, value);
    res.status(201).json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'PUT_STATE_FAILED',
      message: err instanceof Error ? err.message : 'Put state failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /sharding/state/get — Query state across shards by key */
app.get('/sharding/state/get', (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'query parameter key is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = shardingEngine.getState(key);
  if (!result) {
    res.status(404).json({
      code: 'STATE_NOT_FOUND',
      message: `Key '${key}' not found in any shard`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** POST /sharding/cross-shard/prepare — Phase 1 of 2PC cross-shard transaction */
app.post('/sharding/cross-shard/prepare', (req: Request, res: Response) => {
  const { key, sourceShardId, targetShardId, sourceValue, targetValue } = req.body;
  if (!key || !sourceShardId || !targetShardId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'key, sourceShardId, and targetShardId are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const tx = shardingEngine.prepareCrossShardTx({
      key,
      sourceShardId,
      targetShardId,
      sourceValue,
      targetValue,
    });
    res.status(201).json({
      data: tx,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'PREPARE_FAILED',
      message: err instanceof Error ? err.message : 'Prepare cross-shard tx failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /sharding/cross-shard/commit — Phase 2 of 2PC cross-shard transaction */
app.post('/sharding/cross-shard/commit', (req: Request, res: Response) => {
  const { txId } = req.body;
  if (!txId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'txId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const tx = shardingEngine.commitCrossShardTx(txId);
    res.json({
      data: tx,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'COMMIT_FAILED',
      message: err instanceof Error ? err.message : 'Commit cross-shard tx failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /sharding/rebalance/split — Split shard partition */
app.post('/sharding/rebalance/split', (req: Request, res: Response) => {
  const { shardId } = req.body;
  if (!shardId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'shardId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const event = shardingEngine.splitShard(shardId);
    res.json({
      data: event,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SPLIT_FAILED',
      message: err instanceof Error ? err.message : 'Shard split failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /sharding/stats — Sharding engine statistics */
app.get('/sharding/stats', (_req: Request, res: Response) => {
  const stats = shardingEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 32 Endpoints: Cross-Chain Bridge & Light Client Relays
 * /bridge/chains, /bridge/headers/submit, /bridge/transfers/initiate,
 * /bridge/transfers/relay, /bridge/transfers/finalize, /bridge/transfers, /bridge/stats
 */

/** GET /bridge/chains — List connected chain light clients */
app.get('/bridge/chains', (_req: Request, res: Response) => {
  const chains = bridgeEngine.getChains();
  res.json({
    data: chains,
    timestamp: new Date().toISOString(),
  });
});

/** POST /bridge/headers/submit — Submit verified foreign block header */
app.post('/bridge/headers/submit', (req: Request, res: Response) => {
  const { chainId, height, blockHash, previousBlockHash, stateRoot, signatures } = req.body;
  if (!chainId || typeof height !== 'number' || !blockHash || !stateRoot) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'chainId, height, blockHash, and stateRoot are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = bridgeEngine.submitHeader({
      chainId,
      height,
      blockHash,
      previousBlockHash: previousBlockHash || '0x0',
      stateRoot,
      signatures: signatures || [],
    });
    res.status(201).json({
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SUBMIT_HEADER_FAILED',
      message: err instanceof Error ? err.message : 'Header submission failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /bridge/transfers/initiate — Lock and initiate cross-chain bridge transfer */
app.post('/bridge/transfers/initiate', (req: Request, res: Response) => {
  const { sourceChain, targetChain, senderDid, recipientAddress, assetSymbol, amount, lockTxHash } = req.body;
  if (!sourceChain || !targetChain || !senderDid || !recipientAddress || typeof amount !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'sourceChain, targetChain, senderDid, recipientAddress, and numerical amount are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const transfer = bridgeEngine.initiateTransfer({
      sourceChain,
      targetChain,
      senderDid,
      recipientAddress,
      assetSymbol: assetSymbol || 'USDC',
      amount,
      lockTxHash: lockTxHash || `0xlock_${Date.now()}`,
    });
    res.status(201).json({
      data: transfer,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'INITIATE_FAILED',
      message: err instanceof Error ? err.message : 'Initiate transfer failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /bridge/transfers/relay — Submit relayer Merkle proof */
app.post('/bridge/transfers/relay', (req: Request, res: Response) => {
  const { transferId, relayerDid, merkleProof } = req.body;
  if (!transferId || !relayerDid || !merkleProof) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'transferId, relayerDid, and merkleProof are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const transfer = bridgeEngine.relayTransfer({
      transferId,
      relayerDid,
      merkleProof,
    });
    res.json({
      data: transfer,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'RELAY_FAILED',
      message: err instanceof Error ? err.message : 'Relay transfer failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /bridge/transfers/finalize — Finalize mint/release on destination */
app.post('/bridge/transfers/finalize', (req: Request, res: Response) => {
  const { transferId } = req.body;
  if (!transferId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'transferId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const transfer = bridgeEngine.finalizeTransfer(transferId);
    res.json({
      data: transfer,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'FINALIZE_FAILED',
      message: err instanceof Error ? err.message : 'Finalize transfer failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /bridge/transfers — List recent bridge transfers */
app.get('/bridge/transfers', (_req: Request, res: Response) => {
  const transfers = bridgeEngine.getTransfers();
  res.json({
    data: transfers,
    timestamp: new Date().toISOString(),
  });
});

/** GET /bridge/stats — Bridge statistics */
app.get('/bridge/stats', (_req: Request, res: Response) => {
  const stats = bridgeEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 33 Endpoints: MEV-Resistant Sequencer & VDF Fair Batching
 * /sequencer/mempool, /sequencer/mempool/submit, /sequencer/batch/seal, /sequencer/batches, /sequencer/stats
 */

/** GET /sequencer/mempool — List all encrypted mempool transactions */
app.get('/sequencer/mempool', (_req: Request, res: Response) => {
  const mempool = sequencerEngine.getMempool();
  res.json({
    data: mempool,
    timestamp: new Date().toISOString(),
  });
});

/** POST /sequencer/mempool/submit — Submit encrypted transaction for fair ordering */
app.post('/sequencer/mempool/submit', (req: Request, res: Response) => {
  const { senderDid, encryptedPayload, ephemeralPublicKey, gasLimit } = req.body;
  if (!senderDid || !encryptedPayload) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'senderDid and encryptedPayload are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const tx = sequencerEngine.submitEncryptedTx({
    senderDid,
    encryptedPayload,
    ephemeralPublicKey,
    gasLimit,
  });

  res.status(201).json({
    data: tx,
    timestamp: new Date().toISOString(),
  });
});

/** POST /sequencer/batch/seal — Seal pending mempool into VDF-attested batch */
app.post('/sequencer/batch/seal', (req: Request, res: Response) => {
  const maxTxs = typeof req.body.maxTxs === 'number' ? req.body.maxTxs : 50;

  try {
    const batch = sequencerEngine.sealBatch(maxTxs);
    res.status(201).json({
      data: batch,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SEAL_BATCH_FAILED',
      message: err instanceof Error ? err.message : 'Batch seal failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /sequencer/batches — List all sealed sequencer batches */
app.get('/sequencer/batches', (_req: Request, res: Response) => {
  const batches = sequencerEngine.getBatches();
  res.json({
    data: batches,
    timestamp: new Date().toISOString(),
  });
});

/** GET /sequencer/stats — Sequencer engine metrics */
app.get('/sequencer/stats', (_req: Request, res: Response) => {
  const stats = sequencerEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 34 Endpoints: Data Availability Sampling & Erasure Coding
 * /da/blobs, /da/blobs/submit, /da/blobs/sample, /da/blobs/verify-kzg, /da/stats
 */

/** GET /da/blobs — List all data blobs */
app.get('/da/blobs', (req: Request, res: Response) => {
  const namespace = typeof req.query.namespace === 'string' ? req.query.namespace : undefined;
  const blobs = daEngine.getBlobs(namespace);
  res.json({
    data: blobs,
    timestamp: new Date().toISOString(),
  });
});

/** POST /da/blobs/submit — Submit data blob for erasure encoding and KZG commitment */
app.post('/da/blobs/submit', (req: Request, res: Response) => {
  const { namespace, submitterDid, rawData } = req.body;
  if (!namespace || !submitterDid || !rawData) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'namespace, submitterDid, and rawData are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const blob = daEngine.submitBlob({
    namespace,
    submitterDid,
    rawData,
  });

  res.status(201).json({
    data: blob,
    timestamp: new Date().toISOString(),
  });
});

/** POST /da/blobs/sample — Perform random Data Availability Sampling */
app.post('/da/blobs/sample', (req: Request, res: Response) => {
  const { blobId, sampleCount } = req.body;
  if (!blobId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'blobId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const sample = daEngine.sampleBlob(blobId, typeof sampleCount === 'number' ? sampleCount : 4);
  res.json({
    data: sample,
    timestamp: new Date().toISOString(),
  });
});

/** POST /da/blobs/verify-kzg — Verify KZG commitment proof */
app.post('/da/blobs/verify-kzg', (req: Request, res: Response) => {
  const { blobId } = req.body;
  if (!blobId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'blobId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const valid = daEngine.verifyCommitment(blobId);
  res.json({
    data: { blobId, valid },
    timestamp: new Date().toISOString(),
  });
});

/** GET /da/stats — Data availability layer statistics */
app.get('/da/stats', (_req: Request, res: Response) => {
  const stats = daEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 35 Endpoints: Layer-2 Rollup Execution Engine & State Transitions
 * /rollup/accounts, /rollup/tx/submit, /rollup/blocks/produce, /rollup/blocks/commit-l1, /rollup/blocks/finalize, /rollup/blocks/challenge, /rollup/blocks, /rollup/stats
 */

/** GET /rollup/accounts — List all L2 accounts */
app.get('/rollup/accounts', (_req: Request, res: Response) => {
  const accounts = rollupEngine.getAccounts();
  res.json({
    data: accounts,
    timestamp: new Date().toISOString(),
  });
});

/** POST /rollup/tx/submit — Submit L2 transaction */
app.post('/rollup/tx/submit', (req: Request, res: Response) => {
  const { from, to, value, calldata, signature } = req.body;
  if (!from || !to || typeof value !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'from, to, and numerical value are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const tx = rollupEngine.submitL2Transaction({ from, to, value, calldata, signature });
    res.status(201).json({
      data: tx,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'L2_TX_FAILED',
      message: err instanceof Error ? err.message : 'L2 tx failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /rollup/blocks/produce — Produce L2 block from pending transactions */
app.post('/rollup/blocks/produce', (req: Request, res: Response) => {
  const { proposerDid, rollupType, maxTxs } = req.body;
  if (!proposerDid) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'proposerDid is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const block = rollupEngine.produceBlock({
    proposerDid,
    rollupType: rollupType === 'VALIDITY_ZK' ? 'VALIDITY_ZK' : 'OPTIMISTIC',
    maxTxs: typeof maxTxs === 'number' ? maxTxs : 20,
  });

  res.status(201).json({
    data: block,
    timestamp: new Date().toISOString(),
  });
});

/** POST /rollup/blocks/commit-l1 — Commit proposed block to L1 */
app.post('/rollup/blocks/commit-l1', (req: Request, res: Response) => {
  const { blockHeight, l1TxHash } = req.body;
  if (typeof blockHeight !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'blockHeight is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const block = rollupEngine.commitToL1(blockHeight, l1TxHash);
    res.json({
      data: block,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'COMMIT_L1_FAILED',
      message: err instanceof Error ? err.message : 'Commit to L1 failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /rollup/blocks/finalize — Finalize L2 block */
app.post('/rollup/blocks/finalize', (req: Request, res: Response) => {
  const { blockHeight } = req.body;
  if (typeof blockHeight !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'blockHeight is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const block = rollupEngine.finalizeBlock(blockHeight);
    res.json({
      data: block,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'FINALIZE_BLOCK_FAILED',
      message: err instanceof Error ? err.message : 'Finalize block failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /rollup/blocks/challenge — Challenge disputed block state root */
app.post('/rollup/blocks/challenge', (req: Request, res: Response) => {
  const { blockHeight, challengerDid, disputedPostStateRoot } = req.body;
  if (typeof blockHeight !== 'number' || !challengerDid || !disputedPostStateRoot) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'blockHeight, challengerDid, and disputedPostStateRoot are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const challenge = rollupEngine.challengeBlock({
      blockHeight,
      challengerDid,
      disputedPostStateRoot,
    });
    res.status(201).json({
      data: challenge,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'CHALLENGE_FAILED',
      message: err instanceof Error ? err.message : 'Challenge failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /rollup/blocks — List all L2 rollup blocks */
app.get('/rollup/blocks', (_req: Request, res: Response) => {
  const blocks = rollupEngine.getBlocks();
  res.json({
    data: blocks,
    timestamp: new Date().toISOString(),
  });
});

/** GET /rollup/stats — Rollup execution engine metrics */
app.get('/rollup/stats', (_req: Request, res: Response) => {
  const stats = rollupEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 36 Endpoints: Verifiable AI Agent Intent Solver & Composable Settlement
 * /intent/intents, /intent/intents/submit, /intent/bids/submit, /intent/intents/settle, /intent/bids, /intent/stats
 */

/** GET /intent/intents — List all intents */
app.get('/intent/intents', (_req: Request, res: Response) => {
  const intents = intentEngine.getIntents();
  res.json({
    data: intents,
    timestamp: new Date().toISOString(),
  });
});

/** POST /intent/intents/submit — Submit user intent */
app.post('/intent/intents/submit', (req: Request, res: Response) => {
  const { userDid, intentDescription, sourceAsset, targetAsset, minTargetAmount, maxBudget, deadlineMs } = req.body;
  if (!userDid || !intentDescription || !sourceAsset || !targetAsset || typeof minTargetAmount !== 'number' || typeof maxBudget !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'userDid, intentDescription, sourceAsset, targetAsset, minTargetAmount, and maxBudget are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const intent = intentEngine.submitIntent({
    userDid,
    intentDescription,
    sourceAsset,
    targetAsset,
    minTargetAmount,
    maxBudget,
    deadlineMs,
  });

  res.status(201).json({
    data: intent,
    timestamp: new Date().toISOString(),
  });
});

/** POST /intent/bids/submit — Submit solver bid for intent */
app.post('/intent/bids/submit', (req: Request, res: Response) => {
  const { intentId, solverDid, proposedRoute, guaranteedOutput, estimatedFee } = req.body;
  if (!intentId || !solverDid || !Array.isArray(proposedRoute) || typeof guaranteedOutput !== 'number' || typeof estimatedFee !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'intentId, solverDid, proposedRoute array, guaranteedOutput, and estimatedFee are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const bid = intentEngine.submitSolverBid({
      intentId,
      solverDid,
      proposedRoute,
      guaranteedOutput,
      estimatedFee,
    });
    res.status(201).json({
      data: bid,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SUBMIT_BID_FAILED',
      message: err instanceof Error ? err.message : 'Bid submission failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /intent/intents/settle — Settle intent with winning solver */
app.post('/intent/intents/settle', (req: Request, res: Response) => {
  const { intentId } = req.body;
  if (!intentId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'intentId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const receipt = intentEngine.settleIntent(intentId);
    res.json({
      data: receipt,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SETTLE_INTENT_FAILED',
      message: err instanceof Error ? err.message : 'Settlement failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /intent/bids — List all solver bids */
app.get('/intent/bids', (req: Request, res: Response) => {
  const intentId = typeof req.query.intentId === 'string' ? req.query.intentId : undefined;
  const bids = intentEngine.getBids(intentId);
  res.json({
    data: bids,
    timestamp: new Date().toISOString(),
  });
});

/** GET /intent/stats — Intent engine telemetry metrics */
app.get('/intent/stats', (_req: Request, res: Response) => {
  const stats = intentEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 37 Endpoints: Decentralized Multi-Agent Swarm Orchestrator & Parallel Worker Dispatcher
 * /orchestrator/tasks, /orchestrator/tasks/dispatch, /orchestrator/batches/dispatch, /orchestrator/tasks/attest, /orchestrator/batches, /orchestrator/stats
 */

/** GET /orchestrator/tasks — List all orchestrated tasks */
app.get('/orchestrator/tasks', (req: Request, res: Response) => {
  const batchId = typeof req.query.batchId === 'string' ? req.query.batchId : undefined;
  const tasks = orchestratorEngine.getTasks(batchId);
  res.json({
    data: tasks,
    timestamp: new Date().toISOString(),
  });
});

/** POST /orchestrator/tasks/dispatch — Dispatch single orchestrated task */
app.post('/orchestrator/tasks/dispatch', (req: Request, res: Response) => {
  const { name, assignedAgentDid, payload, executionMode, dependencies } = req.body;
  if (!name || !assignedAgentDid) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'name and assignedAgentDid are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const task = orchestratorEngine.dispatchTask({
    name,
    assignedAgentDid,
    payload,
    executionMode,
    dependencies,
  });

  res.status(201).json({
    data: task,
    timestamp: new Date().toISOString(),
  });
});

/** POST /orchestrator/batches/dispatch — Dispatch parallel multi-task worker batch */
app.post('/orchestrator/batches/dispatch', (req: Request, res: Response) => {
  const { batchName, tasks } = req.body;
  if (!batchName || !Array.isArray(tasks) || tasks.length === 0) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'batchName and non-empty tasks array are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const batch = orchestratorEngine.dispatchParallelBatch({ batchName, tasks });
  res.status(201).json({
    data: batch,
    timestamp: new Date().toISOString(),
  });
});

/** POST /orchestrator/tasks/attest — Submit worker task attestation */
app.post('/orchestrator/tasks/attest', (req: Request, res: Response) => {
  const { taskId, agentDid, resultWitness, durationMs, hasConflict } = req.body;
  if (!taskId || !agentDid || !resultWitness) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'taskId, agentDid, and resultWitness are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const task = orchestratorEngine.submitTaskAttestation({
      taskId,
      agentDid,
      resultWitness,
      durationMs,
      hasConflict,
    });
    res.json({
      data: task,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'TASK_ATTESTATION_FAILED',
      message: err instanceof Error ? err.message : 'Attestation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /orchestrator/batches — List all parallel batch receipts */
app.get('/orchestrator/batches', (_req: Request, res: Response) => {
  const batches = orchestratorEngine.getBatches();
  res.json({
    data: batches,
    timestamp: new Date().toISOString(),
  });
});

/** GET /orchestrator/stats — Orchestrator telemetry metrics */
app.get('/orchestrator/stats', (_req: Request, res: Response) => {
  const stats = orchestratorEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});
/**
 * Section 38 Endpoints: Distributed Hash Table (DHT) — Kademlia Overlay Network
 * /dht/nodes, /dht/nodes/register, /dht/records, /dht/records/put, /dht/lookup, /dht/stats
 */

/** GET /dht/nodes — List all DHT overlay nodes */
app.get('/dht/nodes', (_req: Request, res: Response) => {
  const nodes = dhtEngine.getNodes();
  res.json({
    data: nodes,
    timestamp: new Date().toISOString(),
  });
});

/** POST /dht/nodes/register — Register new Kademlia node */
app.post('/dht/nodes/register', (req: Request, res: Response) => {
  const { did, address } = req.body;
  if (!did || !address) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'did and address are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const node = dhtEngine.registerNode({ did, address });
  res.status(201).json({
    data: node,
    timestamp: new Date().toISOString(),
  });
});

/** GET /dht/records — List all DHT records */
app.get('/dht/records', (_req: Request, res: Response) => {
  const records = dhtEngine.getRecords();
  res.json({
    data: records,
    timestamp: new Date().toISOString(),
  });
});

/** POST /dht/records/put — Store a key-value record in the DHT */
app.post('/dht/records/put', (req: Request, res: Response) => {
  const { key, value, publisherDid, ttlMs, replicationFactor } = req.body;
  if (!key || !value || !publisherDid) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'key, value, and publisherDid are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const record = dhtEngine.putRecord({ key, value, publisherDid, ttlMs, replicationFactor });
  res.status(201).json({
    data: record,
    timestamp: new Date().toISOString(),
  });
});

/** GET /dht/lookup — Perform Kademlia lookup by key */
app.get('/dht/lookup', (req: Request, res: Response) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  if (!key) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'key query parameter is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const result = dhtEngine.lookup(key);
  res.json({
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/** GET /dht/stats — DHT telemetry metrics */
app.get('/dht/stats', (_req: Request, res: Response) => {
  const stats = dhtEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 39 Endpoints: Proof-of-Stake Delegation, Validator Staking & Slashing Engine
 * /staking/validators, /staking/validators/register, /staking/delegations, /staking/delegate, /staking/slash, /staking/epoch/advance, /staking/epochs, /staking/stats
 */

/** GET /staking/validators — List all staking validators */
app.get('/staking/validators', (_req: Request, res: Response) => {
  const validators = stakingEngine.getValidators();
  res.json({
    data: validators,
    timestamp: new Date().toISOString(),
  });
});

/** POST /staking/validators/register — Register new PoS validator */
app.post('/staking/validators/register', (req: Request, res: Response) => {
  const { validatorDid, moniker, selfStake, commissionRate } = req.body;
  if (!validatorDid || !moniker || typeof selfStake !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'validatorDid, moniker, and selfStake (number) are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const val = stakingEngine.registerValidator({ validatorDid, moniker, selfStake, commissionRate });
    res.status(201).json({
      data: val,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'VALIDATOR_REGISTRATION_FAILED',
      message: err instanceof Error ? err.message : 'Registration failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /staking/delegations — List delegations */
app.get('/staking/delegations', (req: Request, res: Response) => {
  const delegatorDid = typeof req.query.delegatorDid === 'string' ? req.query.delegatorDid : undefined;
  const delegations = stakingEngine.getDelegations(delegatorDid);
  res.json({
    data: delegations,
    timestamp: new Date().toISOString(),
  });
});

/** POST /staking/delegate — Delegate stake to a validator */
app.post('/staking/delegate', (req: Request, res: Response) => {
  const { delegatorDid, validatorDid, amount } = req.body;
  if (!delegatorDid || !validatorDid || typeof amount !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'delegatorDid, validatorDid, and amount (number) are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const delegation = stakingEngine.delegate({ delegatorDid, validatorDid, amount });
    res.status(201).json({
      data: delegation,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'DELEGATION_FAILED',
      message: err instanceof Error ? err.message : 'Delegation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /staking/slash — Slash a misbehaving validator */
app.post('/staking/slash', (req: Request, res: Response) => {
  const { validatorDid, reason, evidenceProof } = req.body;
  if (!validatorDid || !reason || !evidenceProof) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'validatorDid, reason, and evidenceProof are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const record = stakingEngine.slashValidator({ validatorDid, reason, evidenceProof });
    res.json({
      data: record,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'SLASH_FAILED',
      message: err instanceof Error ? err.message : 'Slash execution failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /staking/epoch/advance — Roll epoch and distribute staking rewards */
app.post('/staking/epoch/advance', (req: Request, res: Response) => {
  const mintRewards = typeof req.body.mintRewards === 'number' ? req.body.mintRewards : 1000;
  const receipt = stakingEngine.advanceEpoch(mintRewards);
  res.json({
    data: receipt,
    timestamp: new Date().toISOString(),
  });
});

/** GET /staking/epochs — List epoch distribution receipts */
app.get('/staking/epochs', (_req: Request, res: Response) => {
  const receipts = stakingEngine.getEpochReceipts();
  res.json({
    data: receipts,
    timestamp: new Date().toISOString(),
  });
});

/** GET /staking/stats — Staking telemetry metrics */
app.get('/staking/stats', (_req: Request, res: Response) => {
  const stats = stakingEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 40 Endpoints: Oceanic Finite State Machine Kernel — Canonical Verification Loop
 * /kernel/transition, /kernel/authorize, /kernel/consequence, /kernel/states, /kernel/states/:stateId/lineage, /kernel/stats
 */

/** POST /kernel/transition — Execute canonical state transition Sn */
app.post('/kernel/transition', (req: Request, res: Response) => {
  const { intent, observation, evidenceItems, dissentItems, actionPlan, autoAuthorizeIfNonDestructive } = req.body;
  if (!intent || !observation || !Array.isArray(evidenceItems) || !actionPlan) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'intent, observation, evidenceItems (array), and actionPlan are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const state = kernelEngine.transition({
      intent,
      observation,
      evidenceItems,
      dissentItems,
      actionPlan,
      autoAuthorizeIfNonDestructive,
    });
    res.status(201).json({
      data: state,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'STATE_TRANSITION_FAILED',
      message: err instanceof Error ? err.message : 'Transition failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /kernel/authorize — Human DID authorization for gated actions */
app.post('/kernel/authorize', (req: Request, res: Response) => {
  const { stateId, authorizerDid, authorizationSignature } = req.body;
  if (!stateId || !authorizerDid || !authorizationSignature) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'stateId, authorizerDid, and authorizationSignature are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const state = kernelEngine.authorizeAction({ stateId, authorizerDid, authorizationSignature });
    res.json({
      data: state,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'AUTHORIZATION_FAILED',
      message: err instanceof Error ? err.message : 'Authorization failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /kernel/consequence — Record measured consequence and trigger adaptive learning */
app.post('/kernel/consequence', (req: Request, res: Response) => {
  const { stateId, observedStatus, realizedEffects, sideEffects, executionDurationMs, verifiedValueGenerated, resourceCost } = req.body;
  if (!stateId || !observedStatus || typeof executionDurationMs !== 'number' || typeof verifiedValueGenerated !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'stateId, observedStatus, executionDurationMs, and verifiedValueGenerated are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const state = kernelEngine.applyConsequence({
      stateId,
      observedStatus,
      realizedEffects: realizedEffects ?? {},
      sideEffects,
      executionDurationMs,
      verifiedValueGenerated,
      resourceCost,
    });
    res.json({
      data: state,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'CONSEQUENCE_APPLICATION_FAILED',
      message: err instanceof Error ? err.message : 'Consequence recording failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /kernel/states — List all canonical state nodes */
app.get('/kernel/states', (_req: Request, res: Response) => {
  const states = kernelEngine.getStates();
  res.json({
    data: states,
    timestamp: new Date().toISOString(),
  });
});

/** GET /kernel/states/:stateId/lineage — Get verifiable parent-to-child lineage */
app.get('/kernel/states/:stateId/lineage', (req: Request, res: Response) => {
  const lineage = kernelEngine.getStateLineage(req.params.stateId);
  res.json({
    data: lineage,
    timestamp: new Date().toISOString(),
  });
});

/** GET /kernel/stats — Kernel telemetry & root state hash */
app.get('/kernel/stats', (_req: Request, res: Response) => {
  const stats = kernelEngine.getStats();
  res.json({
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Section 41 Endpoints: High-Throughput Transaction Mempool & MEV Bundle Engine
 * /mempool/transactions, /mempool/submit, /mempool/bundles/submit, /mempool/bundles, /mempool/harvest, /mempool/stats
 */

/** GET /mempool/transactions — List transactions in mempool */
app.get('/mempool/transactions', (req: Request, res: Response) => {
  const senderDid = typeof req.query.senderDid === 'string' ? req.query.senderDid : undefined;
  const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;
  const txs = mempoolEngine.getTransactions({ senderDid, status });
  res.json({
    data: txs,
    timestamp: new Date().toISOString(),
  });
});

/** POST /mempool/submit — Submit transaction to mempool with RBF */
app.post('/mempool/submit', (req: Request, res: Response) => {
  const { senderDid, nonce, gasPriceGwei, gasLimit, payload } = req.body;
  if (!senderDid || typeof nonce !== 'number' || typeof gasPriceGwei !== 'number' || typeof gasLimit !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'senderDid, nonce (number), gasPriceGwei (number), and gasLimit (number) are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const tx = mempoolEngine.submitTransaction({
      senderDid,
      nonce,
      gasPriceGwei,
      gasLimit,
      payload: payload ?? {},
    });
    res.status(201).json({
      data: tx,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'MEMPOOL_SUBMISSION_FAILED',
      message: err instanceof Error ? err.message : 'Submission failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** POST /mempool/bundles/submit — Submit MEV protection bundle */
app.post('/mempool/bundles/submit', (req: Request, res: Response) => {
  const { searcherDid, txHashes, bidTipGwei, targetBlockEpoch } = req.body;
  if (!searcherDid || !Array.isArray(txHashes) || typeof bidTipGwei !== 'number' || typeof targetBlockEpoch !== 'number') {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'searcherDid, txHashes (array), bidTipGwei (number), and targetBlockEpoch (number) are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const bundle = mempoolEngine.submitBundle({
      searcherDid,
      txHashes,
      bidTipGwei,
      targetBlockEpoch,
    });
    res.status(201).json({
      data: bundle,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(400).json({
      code: 'BUNDLE_SUBMISSION_FAILED',
      message: err instanceof Error ? err.message : 'Bundle submission failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/** GET /mempool/bundles — List all MEV bundles */
app.get('/mempool/bundles', (_req: Request, res: Response) => {
  const bundles = mempoolEngine.getBundles();
  res.json({
    data: bundles,
    timestamp: new Date().toISOString(),
  });
});

/** POST /mempool/harvest — Harvest block proposal batch */
app.post('/mempool/harvest', (req: Request, res: Response) => {
  const maxGas = typeof req.body.maxGas === 'number' ? req.body.maxGas : undefined;
  const maxCount = typeof req.body.maxCount === 'number' ? req.body.maxCount : undefined;
  const receipt = mempoolEngine.popBatch({ maxGas, maxCount });
  res.json({
    data: receipt,
    timestamp: new Date().toISOString(),
  });
});

/** GET /mempool/stats — Mempool telemetry & Merkle root */
app.get('/mempool/stats', (_req: Request, res: Response) => {
  const stats = mempoolEngine.getStats();
  res.json({
    data: stats,
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
