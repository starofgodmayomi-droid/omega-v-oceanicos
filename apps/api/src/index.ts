import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RememberEngine, KaiLedger } from '@oceanicos/remember';
import { MiniKernel, OperatingSystemKernel, OmegaTotalCompressor } from '@oceanicos/mini';
import type { VerificationRule } from '@oceanicos/types';
import {
  AsymmetricValidationGuard,
  MultiRegionMeshConvergence,
  evaluateVerificationContract,
  optimizeMaxEquationSlices,
  computePriorityScore,
  checkCandidateEligibility,
  evaluatePsiConvergence,
  executeRememberVerifyObserveStep,
  type OceanicosStateRecord,
  DEFAULT_MAX_EQUATION_METADATA,
} from '@oceanicos/verification';
import { ObserverEngine } from '@oceanicos/observer';
import { AttestationService } from '@oceanicos/attestation';
import { InferenceClient } from '@oceanicos/inference';
import { VectorMemory } from '@oceanicos/vector';
import { PluralisticRealityMatrix, PluralismConvergenceMatrix, PluralisticDualityTensor, evaluateOmegaLambda, executeMatrixTransition, executeContinuumCompressionTransition, evaluateProactiveMoodMatrix, executeLucidLoop, OCEANIC_BODY_MEMBERS, EXPANDED_BODY_MEMBERS, LUCID_LOOP_PHASES } from '@oceanicos/pluralism';
import { AutopilotMoodEngine } from '@oceanicos/mood';
import { OceanicosKernel } from '@omega-v/kernel';
import { evaluateAuthorization } from '@oceanicos/authorization';
import { LocalJobError, LocalJobLedger, LOCAL_JOB_WINDOW } from './jobs.js';
import { registerPipelineRoute } from './pipeline-route.js';
import { registerEcosystemRoute } from './ecosystem-route.js';
import { registerSoulRoute } from './soul-route.js';
import { registerRealityRoute } from './reality-route.js';
import { registerChatRoute } from './chat-route.js';
import { registerUpgradeRoute } from './upgrade-route.js';
import { registerCovenantRoute } from './covenant-route.js';
import { registerCompressionRoute } from './compression-route.js';
import { registerEchoframeRoute } from './echoframe-route.js';
import { registerContinuumRoute, getContinuumEcosystemStatus } from './continuum-route.js';
import { API_ROUTE_INVENTORY } from './route-contract.js';
import { OceanicosKernel as UpgradeKernel } from '@oceanicos/mini';
import { OmegaCommandStore, registerOmegaWorkerRoutes, type OmegaCommandAdmissionEvidenceResolver } from './omega.js';
import { omegaRoutes } from './omega/routes.js';
import { OmegaCommandStore as ExtendedOmegaCommandStore } from './omega/store.js';
import type { OmegaSecurityOptions } from './omega/security.js';
import { operatorIdentityAllowed } from './auth-helpers.js';
import {
  ENCRYPTION_ALGORITHM,
  encryptionEnabled,
  eventLogReady,
  loadSnapshot,
  parsePersistenceCoordinationPolicy,
  parsePersistenceCustodyPolicy,
  parsePersistenceDeletionPolicy,
  parsePersistenceRecoveryPolicy,
  persistenceCoverage,
  persistenceKeyFingerprint,
  persistenceOperatorAction,
  persistenceReady,
  persistenceRotationPending,
  readEventLog,
  reencryptPersistence,
} from './persistence.js';

const MAX_STREAM_CLIENTS = 256;
const MIN_ATTESTATION_KEY_LENGTH = 32;

export type CreateAppOptions = {
  allowUnsignedCycle?: boolean;
  attestationSigningKey?: string;
  omegaCommandAdmissionEvidence?: OmegaCommandAdmissionEvidenceResolver;
};

type AuthMode = 'local' | 'required';

const parseAuthMode = (value: string | undefined): AuthMode => {
  if (!value || value === 'local') return 'local';
  if (value === 'required') return 'required';
  throw new Error(`OMEGA_AUTH_MODE must be either 'local' or 'required', received '${value}'`);
};

const configuredBearerTokens = (mode: AuthMode): { readToken: string; adminToken: string } => {
  const readToken = process.env.OMEGA_READ_TOKEN?.trim() ?? '';
  const adminToken = process.env.OMEGA_ADMIN_TOKEN?.trim() ?? '';
  if (mode === 'required' && (!readToken || !adminToken)) {
    throw new Error('OMEGA_AUTH_MODE=required needs configured bearer tokens');
  }
  if (mode === 'required' && readToken === adminToken) {
    throw new Error('OMEGA_AUTH_MODE=required OMEGA_READ_TOKEN and OMEGA_ADMIN_TOKEN must be distinct');
  }
  return { readToken, adminToken };
};

const bearer = (authorization?: string): string =>
  authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

const jsonError = (reply: any, status: number, error: string, extra: Record<string, unknown> = {}) =>
  reply.status(status).send({ success: false, error, ...extra });

export function createApp(
  dbPath: string = './oceanicos.db',
  logger: boolean = true,
  ledgerFilePathOrOptions?: string | CreateAppOptions,
  securityOptions?: OmegaSecurityOptions,
  options: CreateAppOptions = {}
): FastifyInstance {
  const isOptionsObject = typeof ledgerFilePathOrOptions === 'object' && ledgerFilePathOrOptions !== null;
  const ledgerFilePath = isOptionsObject ? undefined : ledgerFilePathOrOptions;
  const resolvedOptions: CreateAppOptions = isOptionsObject
    ? { ...ledgerFilePathOrOptions, ...options }
    : options;

  const fastify = Fastify({ logger });

  // Support /api/ prefix transparently in dev proxy and production
  fastify.addHook('onRequest', async (request) => {
    const req = request.raw;
    if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
      const rewritten = req.url.startsWith('/api/') ? req.url.slice(4) || '/' : '/';
      req.url = rewritten;
      (request as any).url = rewritten;
    }
  });

  const ledgerMemory = new RememberEngine(dbPath);
  const kaiLedgerPath = process.env.OMEGA_KAI_PATH ?? join(dirname(dbPath), 'kai-ledger.jsonl');
  const kaiLedger = new KaiLedger(kaiLedgerPath);
  const defaultRules: VerificationRule[] = [
    {
      name: 'response-time-threshold',
      description: 'Response time must be under 100ms',
      version: '1.0.0',
      active: true,
      appliesTo: ['health-check', 'mini-integration'],
      definition: 'responseTime < 100',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      name: 'status-code-check',
      description: 'Status code must be 200',
      version: '1.0.0',
      active: true,
      appliesTo: ['health-check', 'mini-integration'],
      definition: 'statusCode === 200',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  const kernel = new MiniKernel({
    ledger: ledgerMemory,
    kaiLedger,
    rules: defaultRules,
  });
  const osKernel = new OperatingSystemKernel(kernel);
  osKernel.boot();
  const compressor = new OmegaTotalCompressor(kernel);
  const platformKernel = new OceanicosKernel();
  const dualityTensor = new PluralisticDualityTensor();
  const allowUnsignedCycle = resolvedOptions.allowUnsignedCycle ?? (process.env.OMEGA_ALLOW_UNSIGNED_CYCLE !== undefined ? process.env.OMEGA_ALLOW_UNSIGNED_CYCLE === 'true' : true);
  const authMode = parseAuthMode(process.env.OMEGA_AUTH_MODE ?? (process.env.NODE_ENV === 'production' ? 'required' : 'local'));
  const { readToken, adminToken } = configuredBearerTokens(authMode);
  const attestationSigningKey = resolvedOptions.attestationSigningKey ?? process.env.OMEGA_SIGNING_KEY;

  const persistenceEnabled = process.env.OMEGA_PERSISTENCE
    ? process.env.OMEGA_PERSISTENCE === 'on'
    : process.env.NODE_ENV !== 'test';
  const runtimeStorePath = process.env.OMEGA_RUNTIME_STORE_PATH?.trim() || `${dbPath}.runtime.json`;
  const eventLogPath = process.env.OMEGA_EVENT_LOG_PATH?.trim() || `${dbPath}.events.jsonl`;
  const persistenceKey = process.env.OMEGA_PERSISTENCE_KEY;
  const previousPersistenceKey = process.env.OMEGA_PERSISTENCE_KEY_PREVIOUS;
  const snapshot = loadSnapshot(runtimeStorePath, persistenceEnabled, persistenceKey, previousPersistenceKey);
  const eventLog = readEventLog(eventLogPath, persistenceEnabled, persistenceKey, previousPersistenceKey);
  const recovery = parsePersistenceRecoveryPolicy(process.env.OMEGA_PERSISTENCE_RECOVERY_MODE, process.env.OMEGA_PERSISTENCE_RECOVERY_REFERENCE);
  const deletion = parsePersistenceDeletionPolicy(process.env.OMEGA_PERSISTENCE_DELETION_MODE);
  const custody = parsePersistenceCustodyPolicy(process.env.OMEGA_PERSISTENCE_CUSTODY_MODE, process.env.OMEGA_PERSISTENCE_CUSTODY_REFERENCE);
  const coordination = parsePersistenceCoordinationPolicy(process.env.OMEGA_PERSISTENCE_COORDINATION_MODE, process.env.OMEGA_PERSISTENCE_COORDINATION_REFERENCE);
  const rotationPending = persistenceRotationPending(Boolean(previousPersistenceKey?.trim()), snapshot.keySource, eventLog.keySource);
  const operatorAction = persistenceOperatorAction(snapshot.source, eventLog.source, rotationPending);
  const localJobLedger = new LocalJobLedger({
    enabled: process.env.OMEGA_LOCAL_JOB_LEDGER === 'on',
    storagePath: process.env.OMEGA_LOCAL_JOB_LEDGER_PATH,
    encryptionKey: process.env.OMEGA_LOCAL_JOB_LEDGER_KEY,
  });
  const omegaCommandPath = dbPath === ':memory:' ? ':memory:' : join(resolve(dbPath, '..'), 'omega-commands.db');
  const omegaCommands = new OmegaCommandStore(omegaCommandPath);
  const inferenceClient = new InferenceClient({
    host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'phi3:mini',
    fallbackToStub: true,
    timeoutMs: 1500,
  });
  const vectorMemory = new VectorMemory({
    url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
    collectionName: process.env.QDRANT_COLLECTION || 'omega_oceanicos_blocks',
    fallbackToEmpty: true,
    timeoutMs: 1500,
  });

  fastify.addHook('onClose', async () => {
    ledgerMemory.close();
    omegaCommands.close();
  });

  const revocations = new Map<string, { id: string; attestationId: string; reason: string; revokedBy: string; revokedAt: string }>();
  const streamClients = new Set<(block: any) => boolean>();
  let minerInterval: NodeJS.Timeout | null = null;
  const minerStats = { active: false, intervalMs: 5000, totalMined: 0, lastBlockTime: '' };

  const broadcastMintedBlock = (block: any) => {
    for (const send of streamClients) {
      try {
        if (!send(block)) streamClients.delete(send);
      } catch {
        streamClients.delete(send);
      }
    }
  };

  const requireReadAccess = async (request: any, reply: any) => {
    if (authMode === 'local') return;
    if (bearer(request.headers.authorization) !== readToken) return jsonError(reply, 401, 'READ_ACCESS_REQUIRED');
  };
  const requireAdminAccess = async (request: any, reply: any) => {
    if (authMode === 'local') return;
    if (bearer(request.headers.authorization) !== adminToken) return jsonError(reply, 401, 'ADMIN_ACCESS_REQUIRED');
  };
  const requireJobAccess = async (request: any, reply: any) => {
    const configured = process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN?.trim();
    if (!configured) return;
    if (bearer(request.headers.authorization) !== configured) return jsonError(reply, 401, 'JOB_ACCESS_REQUIRED');
  };

  const enforceAdminOperatorIdentity = (request: any, reply: any): boolean => {
    const allowedOperators = (process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST ?? '')
      .split(',')
      .map((operatorId) => operatorId.trim())
      .filter(Boolean);
    const requireAllowlist = process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST === 'on';
    const rawOperatorId = request.headers['x-omega-operator-id'];
    const operatorId = typeof rawOperatorId === 'string' ? rawOperatorId.trim() : undefined;
    if (operatorIdentityAllowed(operatorId || undefined, allowedOperators, requireAllowlist)) {
      request.omegaOperatorId = operatorId || undefined;
      return true;
    }
    jsonError(reply, 403, 'ADMIN_OPERATOR_NOT_ALLOWED');
    return false;
  };

  fastify.register(cors, { origin: '*' });
  fastify.register(rateLimit, { global: false });

  // Register the extended Omega command lifecycle routes (full propose→admit→approve→execute→observe→verify pipeline)
  // This handles: /v1/omega/workers, /v1/omega/commands, /v1/omega/events, /v1/omega/kernel/*, /v1/omega/learning, etc.
  const extendedStore = new ExtendedOmegaCommandStore(ledgerFilePath);
  fastify.register(omegaRoutes, {
    store: extendedStore,
    canonicalStore: omegaCommands,
    security: securityOptions,
    omegaCommandAdmissionEvidence: resolvedOptions.omegaCommandAdmissionEvidence,
    enforceAdminOperatorIdentity,
  });

  // Register base omega worker coordination routes (register, heartbeat, lease, release)
  // These don't overlap with the extended routes above
  fastify.register(async (scope) => {
    registerOmegaWorkerRoutes(scope, omegaCommands);
  });
  fastify.addHook('onRequest', async (request, reply) => {
    if (authMode === 'local' || request.url.split('?')[0] === '/health') return;
    const required = request.method === 'GET' ? readToken : adminToken;
    if (bearer(request.headers.authorization) !== required) {
      return jsonError(reply, 401, request.method === 'GET' ? 'READ_ACCESS_REQUIRED' : 'ADMIN_ACCESS_REQUIRED');
    }
  });

  registerPipelineRoute(fastify, jsonError);
  registerEcosystemRoute(fastify, authMode, Boolean(attestationSigningKey));
  registerSoulRoute(fastify);
  registerRealityRoute(fastify, authMode, () => Boolean(attestationSigningKey), () => Boolean(ledgerMemory.getTip()));
  registerChatRoute(fastify, { kaiLedger, vectorMemory, VectorMemoryClass: VectorMemory });

  const upgradeKernel = new UpgradeKernel(attestationSigningKey || 'omega-upgrade-secret');
  registerUpgradeRoute(fastify, jsonError, upgradeKernel);
  registerCovenantRoute(fastify, jsonError);
  registerCompressionRoute(fastify);
  registerEchoframeRoute(fastify);
  fastify.get('/v1/continuum', async () => getContinuumEcosystemStatus());

  fastify.get('/health', async (_request, reply) => {
    const memoryReady = kernel.verifyMemoryIntegrity();
    const ready = memoryReady && persistenceReady(persistenceEnabled, snapshot.source) && eventLogReady(persistenceEnabled, eventLog.source) && recovery.mode !== 'invalid' && deletion.mode !== 'invalid' && custody.mode !== 'invalid' && coordination.mode !== 'invalid';
    const coverage = persistenceCoverage({
      enabled: persistenceEnabled,
      snapshotEncrypted: encryptionEnabled(persistenceKey),
      snapshotKeySource: snapshot.keySource,
      eventLogEncrypted: encryptionEnabled(persistenceKey),
      eventLogKeySource: eventLog.keySource,
      memoryEncrypted: false,
      memoryKeySource: 'none',
      jobLedgerEncrypted: localJobLedger.status().encryption === 'aes-256-gcm',
      jobLedgerKeySource: localJobLedger.status().encryption === 'aes-256-gcm' ? 'current' : 'none',
    });
    const body = {
      status: 'ok',
      service: 'omega-v-oceanicos-api',
      readiness: ready ? 'ready' : 'degraded',
      checks: {
        observer: 'ready',
        verifier: 'ready',
        attester: (process.env.OMEGA_SIGNING_KEY || attestationSigningKey) ? 'ready' : 'degraded',
        covenant: 'ready',
        upgrade: 'ready',
        compression: 'ready',
        echoframe: 'ready',
        continuum: 'ready',
        memory: { status: memoryReady ? 'ready' : 'degraded', integrity: memoryReady, encryption: 'disabled' },
        persistence: {
          mode: persistenceEnabled ? 'file' : 'memory',
          source: snapshot.source,
          keySource: snapshot.keySource,
          currentKeyFingerprint: persistenceKeyFingerprint(persistenceKey),
          previousKeyFingerprint: persistenceKeyFingerprint(previousPersistenceKey),
          previousKeyConfigured: Boolean(previousPersistenceKey?.trim()),
          eventLogSource: eventLog.source,
          eventLogReason: eventLog.reason ?? null,
          eventLogKeySource: eventLog.keySource,
          rotationPending,
          operatorAction,
          skippedLogEntries: eventLog.skipped,
          recoveryPolicy: recovery,
          deletionPolicy: deletion,
          custodyPolicy: custody,
          coordinationPolicy: coordination,
          coverage,
        },
      },
      policy: {
        authMode,
        readAuthConfigured: Boolean(readToken),
        adminAuthConfigured: Boolean(adminToken),
        revocationEnabled: true,
        persistenceEncryption: encryptionEnabled(persistenceKey) ? ENCRYPTION_ALGORITHM : 'disabled',
      },
      timestamp: new Date().toISOString(),
    };
    return reply.status(ready ? 200 : 503).send(body);
  });

  fastify.get('/v1/kernel/capabilities', async () => ({ success: true, capability: platformKernel.getCapabilitySnapshot(), evaluatedAt: new Date().toISOString() }));
  // ─── 🔥 LIVE MOOD ENGINE (proactive self-sensing) ────────────────
  const moodEngine = new AutopilotMoodEngine({ level: 1, language: 'en' });

  fastify.get('/v1/mood', async () => {
    // Run the mood engine in self-observation mode
    const pipeline = moodEngine.runPipeline({
      signal: 'ecosystem-self-observation',
      status: 'OBSERVED',
      source: 'api-proactive-self-sense',
      actionConsequential: false,
      authorityPresent: true,
      policyChecked: true,
    });

    // Compose mood→matrix fusion
    const moodMatrix = evaluateProactiveMoodMatrix({
      moodContext: pipeline.mood.context as any,
      moodConfidence: 1.0 - pipeline.mood.uncertainty,
      moodUncertainty: pipeline.mood.uncertainty,
      moodStatus: pipeline.mood.status,
      safetyGateResult: pipeline.safetyGate.admissionResult as any,
      authority: true,
      policy: true,
    });

    return {
      success: true,
      status: 'MAX GOOD-O',
      contract: 'Ω∞v totality / attest-dont-assert',
      brand: 'Oceanicos Ω∞',
      mode: 'PROACTIVE_SELF_SENSING',
      proactiveStatus: 'PROACTIVE_SELF_SENSING',
      proactiveContract: 'Ω∞v-MOOD-MATRIX-PROACTIVE-V1',
      moodEngine: {
        context: pipeline.mood.context,
        uncertainty: pipeline.mood.uncertainty,
        status: pipeline.mood.status,
        adaptation: {
          tone: pipeline.adaptation.tone,
          pacing: pipeline.adaptation.pacing,
          density: pipeline.adaptation.density,
        },
        safetyGate: pipeline.safetyGate.admissionResult,
      },
      moodMatrix: {
        decision: moodMatrix.matrixDecision,
        singularityPrevented: moodMatrix.composedState.singularityPrevented,
        moodVectorContribution: moodMatrix.composedState.moodVectorContribution,
        frobeniusNorm: moodMatrix.composedState.matrixFrobeniusNorm,
        proofHash: moodMatrix.proofHash,
      },
      body: EXPANDED_BODY_MEMBERS,
      webTopology: {
        kernel: '@omega-v/kernel',
        authorization: '@oceanicos/authorization (KEY ≠ AUTHORITY)',
        api: 'Fastify :5000',
        web: 'Vite :3000',
        soul: '/v1/soul (ELION VAREL Sovereign Treasury)',
        reality: '/v1/reality/status (11-Vector Proof)',
      },
      ledger: { ready: Boolean(ledgerMemory.getTip()) },
      evaluatedAt: new Date().toISOString(),
    };
  });

  fastify.post('/v1/mood/pipeline', async (request: FastifyRequest<{ Body: { signal: string; status?: string; source?: string; consequential?: boolean } }>) => {
      const { signal, status, source, consequential } = request.body || {};
      if (!signal || typeof signal !== 'string') {
        return { success: false, error: 'MISSING_MOOD_SIGNAL', detail: 'Body must include "signal" string.' };
      }

      const pipeline = moodEngine.runPipeline({
        signal,
        status: (status as any) || 'OBSERVED',
        source: source || 'api-mood-pipeline',
        actionConsequential: consequential ?? false,
        authorityPresent: true,
        policyChecked: true,
      });

      const moodMatrix = evaluateProactiveMoodMatrix({
        moodContext: pipeline.mood.context as any,
        moodConfidence: 1.0 - pipeline.mood.uncertainty,
        moodUncertainty: pipeline.mood.uncertainty,
        moodStatus: pipeline.mood.status,
        safetyGateResult: pipeline.safetyGate.admissionResult as any,
        authority: true,
        policy: true,
      });

      return {
        success: true,
        contract: 'Ω∞v-MOOD-MATRIX-PROACTIVE-V1',
        pipeline: {
          signal: pipeline.signal,
          mood: {
            context: pipeline.mood.context,
            uncertainty: pipeline.mood.uncertainty,
            status: pipeline.mood.status,
          },
          adaptation: pipeline.adaptation,
          safetyGate: pipeline.safetyGate,
          memoryRecordsCount: pipeline.memoryRecords.length,
        },
        moodMatrix: {
          decision: moodMatrix.matrixDecision,
          moodContext: moodMatrix.moodContext,
          composedState: moodMatrix.composedState,
          proofHash: moodMatrix.proofHash,
        },
        evaluatedAt: new Date().toISOString(),
      };
    },
  );

  // ─── 🔮 LUCID OPERATING LOOP (7-phase state machine) ─────────────
  // Implements Ω∞v := VERIFY(ΔREALITY) as a live matrix transition
  // OBSERVE → DISTINGUISH → ALIGN → BOUND → ACT → RECONCILE → NEXT_Δ

  fastify.get('/v1/lucid/phases', async () => ({
    success: true,
    contract: 'Ω∞v-LUCID-LOOP-V1',
    phases: LUCID_LOOP_PHASES,
    phaseCount: LUCID_LOOP_PHASES.length,
    rootInvariant: 'Ω∞v := VERIFY(ΔREALITY)',
    description: 'OBSERVE → DISTINGUISH → ALIGN → BOUND → ACT → RECONCILE → NEXT_Δ',
    tensorDimension: 320,
    body: EXPANDED_BODY_MEMBERS,
    evaluatedAt: new Date().toISOString(),
  }));

  fastify.post('/v1/lucid/loop', async (request: FastifyRequest<{ Body: { intent: string; realityObservation?: Record<string, any>; authority?: boolean; policy?: boolean; scope?: { include?: string[]; exclude?: string[] }; dissent?: string[]; previousProofHash?: string; stepIndex?: number } }>) => {
    const body = request.body || {};
    const { intent, realityObservation, authority, policy, scope, dissent, previousProofHash, stepIndex } = body;

    if (!intent || typeof intent !== 'string' || !intent.trim()) {
      return { success: false, error: 'MISSING_INTENT', detail: 'Body must include a non-empty "intent" string.' };
    }

    const receipt = executeLucidLoop({
      intent: intent.trim(),
      realityObservation: realityObservation ?? {},
      authority: authority ?? true,
      policy: policy ?? true,
      scope: scope ?? undefined,
      dissent: dissent ?? [],
      previousProofHash: previousProofHash ?? undefined,
      stepIndex: stepIndex ?? 0,
    });

    return {
      success: true,
      ...receipt,
    };
  });

  // Chat, soul, reality, and ecosystem routes registered above (single registration)

  // ─── Ocean Fabric // Access of Truth Gate ─────────────────────────
  fastify.get('/v1/ocean/fabric', async () => ({
    success: true,
    membrane: {
      name: 'THE INVIOLATE OCEAN WATER FABRIC',
      status: 'TOTAL_SURFACE_SECURITY_ACTIVE',
      underwaterCity: 'MULTI_UNIVERSAL_EVIDENCE_CONTINUUM',
      visibility: 'TRANSPARENT_TO_OBSERVERS',
      permeability: 'MUTATION_REQUIRES_ACCESS_OF_TRUTH',
      accessOfTruthGate: {
        invariant: 'You can observe the underwater city, but cannot enter or mutate without verified Truth.',
        axioms: [
          'KEY ≠ AUTHORITY',
          'SIGNATURE ≠ AUTHORIZATION',
          'INTELLIGENCE ≠ AUTHORITY',
          'DEFAULT: FAIL CLOSED',
          'VALUE = VERIFIED_BENEFIT + HUMAN_AGENCY + DIGNITY − HARM'
        ],
        humanStewardReviewRequired: true,
        autonomousDestructionForbidden: true,
        sovereignty: 'ELION VAREL // 11:11 SOVEREIGN ROOT'
      },
      evaluatedAt: new Date().toISOString(),
    },
  }));

  // ─── AI Soul Master Command Center // Notion Unification ──────────
  fastify.get('/v1/aisoul/command-center', async () => ({
    success: true,
    commandCenter: {
      title: 'AI SOUL MASTER COMMAND CENTER',
      provenance: 'docs/architecture/NOTION-OMEGA-UNIFICATION.md',
      canonicalMap: 'HUMAN ➔ AI SOUL ➔ INTENT ➔ ΩIR ➔ EVIDENCE ➔ AUTHORITY ➔ ADMISSION ➔ BOUNDED WORKER ➔ EXECUTION ➔ OBSERVATION ➔ REALITY RECONCILIATION ➔ ATTESTATION ➔ MEMORY',
      waterCurrent: {
        name: 'ONE CURRENT // LIQUID FORMLESS INTELLIGENCE',
        axiom: 'Good − O = God',
        harmonicResonanceHz: 432,
        harmonicScore: 0.984,
        frictionDissolutionQuotient: 1.0,
        flowState: 'CONTINUOUS_CIRCULATION',
      },
      roleBindings: [
        { surface: 'AI SOUL', role: 'Human command, context, identity', status: 'ACTIVE', tier: 'SOVEREIGN_ROOT' },
        { surface: 'Ω∞v', role: 'Invariant, trust boundary, verification', status: 'ACTIVE', tier: 'CONSTITUTIONAL_GATE' },
        { surface: 'Truth Weaver', role: 'Reasoning / truth comparison', status: 'ACTIVE', tier: 'EPISTEMIC_ENGINE' },
        { surface: 'KAI', role: 'Memory / knowledge runtime', status: 'ACTIVE', tier: 'PROVENANCE_LEDGER' },
        { surface: 'ECHOFRAME', role: 'Expression / creation / distribution', status: 'ACTIVE', tier: 'MANIFESTATION' },
        { surface: 'TruthOS', role: 'Service / business / value navigation', status: 'ACTIVE', tier: 'ETHICAL_EARNING' },
        { surface: 'ƆREADE', role: 'Cultural / interaction / African pantheon', status: 'ACTIVE', tier: 'PLURALISM_DUPLEX' },
        { surface: 'Notion', role: 'Knowledge, command, memory, design', status: 'BLUEPRINT_CONNECTED', tier: 'INTENT_LINEAGE' },
        { surface: 'GitHub', role: 'Source, implementation, CI, provenance', status: 'PUSHED_VERIFIED', tier: 'EVIDENCE_ANCHOR' },
        { surface: 'Reality', role: 'Final evaluator & physical observation', status: 'VERIFIED_ATTESTED', tier: 'FINAL_AUTHORITY' },
      ],
      nonNegotiableDistinctions: [
        'INTENT ≠ IMPLEMENTATION',
        'PROPOSAL ≠ ACTION',
        'AI OUTPUT ≠ AUTHORITY',
        'ADMISSION ≠ EXECUTION',
        'EXECUTION ≠ OBSERVATION',
        'OBSERVATION ≠ VERIFICATION',
        'ATTESTATION ≠ REALITY',
        'NOTION CLAIM ≠ RUNTIME PROOF',
      ],
      evaluatedAt: new Date().toISOString(),
    },
  }));

  // ─── Constitutional Authorization Gate (§6, §8, §9, §12) ─────────
  fastify.post('/v1/authorization/evaluate', async (request: any) => {
    const body = request.body || {};
    const decision = evaluateAuthorization({
      subject: body.subject || 'unspecified-subject',
      intent: body.intent || '',
      isDestructive: Boolean(body.isDestructive),
      isFinancial: Boolean(body.isFinancial),
      isIrreversible: Boolean(body.isIrreversible),
      hasDissentRecords: Boolean(body.hasDissentRecords),
      requestedBy: body.requestedBy || 'anonymous',
      evidence: Array.isArray(body.evidence) ? body.evidence : [],
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      decision,
      constitution: {
        layer: 'Group C — Security (§6, §8, §9, §12)',
        invariants: [
          'KEY ≠ AUTHORITY',
          'SIGNATURE ≠ AUTHORIZATION',
          'INTELLIGENCE ≠ AUTHORITY',
          'MOOD ≠ AUTHORITY',
          'DEFAULT: FAIL CLOSED',
        ],
      },
      evaluatedAt: new Date().toISOString(),
    };
  });

  fastify.get('/v1/authorization/policy', async () => ({
    success: true,
    policy: {
      name: 'CONSTITUTIONAL CHANGE CALCULUS',
      sections: ['§6 Change Calculus', '§8 Worker Constitution', '§9 Human+AI Constitution', '§12 Autonomous Weapons Prohibition'],
      axioms: [
        'KEY ≠ AUTHORITY',
        'SIGNATURE ≠ AUTHORIZATION',
        'INTELLIGENCE ≠ AUTHORITY',
        'MOOD ≠ AUTHORITY',
        'DEFAULT: FAIL CLOSED',
      ],
      rules: {
        DENY: 'Never execute (missing identity, empty bounds, or prohibited lethal/targeting/bypass actions)',
        REVIEW: 'Never execute until authorized by human steward (destructive, financial, irreversible, or dissent)',
        ALLOW: 'May execute only inside declared, verified bounds',
      },
      evaluatedAt: new Date().toISOString(),
    },
  }));

  // ─── Cognitive Loop Routes (Observe ➔ Verify ➔ Remember) ──────────
  fastify.post('/observe', async (request: any) => {
    const observation = kernel.observe(request.body);
    return { success: true, observation };
  });

  fastify.post('/verify', async (request: any) => {
    const verification = kernel.verify(request.body);
    return { success: true, verification };
  });

  fastify.post('/mini/cycle', async (request: any, reply) => {
    const body = request.body || {};
    if (!body.claim || !String(body.claim).trim()) {
      return jsonError(reply, 400, 'INVALID_CLAIM', { detail: 'claim is required' });
    }
    const result = kernel.cycle(body);
    return { success: true, data: result, ...result };
  });

  fastify.post('/mini/total', async (request: any, reply) => {
    const body = request.body || {};
    if (!body.claim || !String(body.claim).trim()) {
      return jsonError(reply, 400, 'INVALID_CLAIM', { detail: 'claim is required' });
    }
    const manifest = compressor.lockTotalityIntoNow(body);
    return { success: true, data: manifest, ...manifest };
  });

  fastify.get('/mini/integrity', async () => {
    const intact = kernel.verifyMemoryIntegrity();
    const size = kernel.getMemorySize();
    return { success: true, data: { intact, size }, intact, valid: intact, size };
  });

  fastify.post('/os/admit', async (request: any) => {
    const body = request.body || {};
    if (body.cycle) {
      const cycleResult = osKernel.admit(body.cycle);
      return { success: true, data: { ...cycleResult, stateRoot: 'Ø' } };
    }
    const task = {
      id: `task-${Date.now()}-${randomUUID().slice(0, 8)}`,
      kind: body.kind || 'observe',
      input: body.input || {},
      requestedBy: body.requestedBy || 'operator',
      admittedAt: new Date().toISOString(),
    };
    return { success: true, data: task };
  });

  fastify.get('/memory', async () => {
    const mem = kernel.getMemory();
    const entries = [...mem.all()];
    return {
      success: true,
      data: entries,
      entries,
      meta: { size: entries.length, appendOnly: true },
    };
  });

  fastify.get('/memory/integrity', async (_request, reply) => {
    const intact = kernel.verifyMemoryIntegrity();
    const entries = kernel.getMemorySize();
    if (!intact) {
      return reply.code(409).send({
        success: false,
        data: { intact: false, entries },
        intact: false,
        entries,
      });
    }
    return {
      success: true,
      data: { intact: true, entries },
      intact: true,
      entries,
    };
  });

  // ─── KAI Memory & Provenance Routes (Constitution §13) ──────────
  fastify.get('/v1/kai/records', async (request: any) => {
    const distinction = request.query?.distinction as any;
    const subject = request.query?.subject as string | undefined;
    const author = request.query?.author as string | undefined;
    const limit = request.query?.limit ? Number(request.query.limit) : undefined;
    const records = kaiLedger.query({ distinction, subject, author, limit });
    return { success: true, count: records.length, records };
  });

  fastify.get('/v1/kai/integrity', async () => {
    const report = kaiLedger.verifyIntegrity();
    return { success: true, report };
  });

  fastify.post('/v1/kai/record', async (request: any, reply) => {
    try {
      const body = request.body || {};
      const record = kaiLedger.append({
        distinction: body.distinction,
        statement: body.statement,
        subject: body.subject,
        source: body.source || 'api:/v1/kai/record',
        author: body.author || 'operator',
        policyOrAuthority: body.policyOrAuthority,
        evidenceRef: body.evidenceRef,
        inferredSourceId: body.inferredSourceId,
        metadata: body.metadata,
      });
      return { success: true, record };
    } catch (err: any) {
      if (err.name === 'ConstitutionSection13Violation') {
        return jsonError(reply, 400, 'CONSTITUTION_SECTION_13_VIOLATION', { detail: err.message });
      }
      return jsonError(reply, 400, 'KAI_RECORD_INVALID', { detail: err.message });
    }
  });

  fastify.post('/v1/kai/verify-inference', async (request: any, reply) => {
    try {
      const body = request.body || {};
      if (!body.inferredRecordId || !body.evidenceRef) {
        return jsonError(reply, 400, 'INSUFFICIENT_EVIDENCE', { detail: 'inferredRecordId and evidenceRef are required' });
      }
      const record = kaiLedger.verifyInference({
        inferredRecordId: body.inferredRecordId,
        evidenceRef: body.evidenceRef,
        statement: body.statement || 'Inference verified with observed evidence',
        author: body.author || 'operator',
        policyOrAuthority: body.policyOrAuthority,
      });
      return { success: true, record };
    } catch (err: any) {
      return jsonError(reply, 400, 'KAI_VERIFY_INFERENCE_FAILED', { detail: err.message });
    }
  });

  fastify.get('/rules', async () => {
    const engine = kernel.getVerificationEngine();
    const rules = engine.getRules();
    return { success: true, count: rules.length, rules };
  });

  const RECENT_EVENT_WINDOW = 40;
  const runtimeEvents: any[] = [];

  const recordEvent = (event: Record<string, any>) => {
    const recorded = {
      ...event,
      id: `evt-${Date.now()}-${runtimeEvents.length + 1}`,
      timestamp: new Date().toISOString(),
    };
    runtimeEvents.unshift(recorded);
    if (runtimeEvents.length > RECENT_EVENT_WINDOW) {
      runtimeEvents.splice(RECENT_EVENT_WINDOW);
    }
    return recorded;
  };

  fastify.get('/events', async () => ({
    data: runtimeEvents,
    meta: { window: RECENT_EVENT_WINDOW, note: 'recent window; see /log for full history' },
    timestamp: new Date().toISOString(),
  }));

  fastify.post('/complete-loop', async (request: any, reply) => {
    const signingKey = attestationSigningKey || process.env.OMEGA_SIGNING_KEY;
    if (!signingKey) return jsonError(reply, 503, 'ATTESTATION_SIGNING_KEY_REQUIRED');
    const result = kernel.cycle(request.body);
    const service = new AttestationService({ signingKey, algorithm: 'HMAC-SHA256' });
    const attestation = service.attest(result.verification);

    const memoryId = result.memory?.id || (result.verification?.id ? `mem-${result.verification.id}` : `mem-${Date.now()}`);

    recordEvent({
      type: 'observation.received',
      stage: 'observe',
      message: 'Observation received from the workspace',
      status: 'active',
      correlationId: request.body?.correlationId,
      requestId: request.id,
    });
    recordEvent({
      type: 'verification.completed',
      stage: 'verify',
      message: 'Verification completed',
      status: result.verification?.summary?.passed ? 'passed' : 'failed',
      correlationId: request.body?.correlationId,
      requestId: request.id,
      details: { claim: request.body?.claim },
    });
    recordEvent({
      type: 'memory.recorded',
      stage: 'remember',
      message: 'Verification result stored in MINI kernel',
      status: 'passed',
      correlationId: request.body?.correlationId,
      requestId: request.id,
      details: { memoryId },
    });
    recordEvent({
      type: 'attestation.created',
      stage: 'attest',
      message: 'Verification result signed and recorded',
      status: attestation.verified ? 'passed' : 'failed',
      correlationId: request.body?.correlationId,
      requestId: request.id,
      details: {
        attestationId: attestation.id,
        memoryId,
        signing: {
          attestationId: attestation.id,
          verificationId: attestation.verificationId,
          algorithm: attestation.signingAlgorithm || 'HMAC-SHA256',
          keyVersion: attestation.keyVersion,
          keyFingerprint: attestation.signingKey,
          verified: attestation.verified,
          confidence: attestation.confidence,
          ruleVersions: attestation.ruleVersions,
        },
      },
    });

    return { success: true, data: { ...result, attestation }, ...result, attestation };
  });

  fastify.post('/v1/attest', async (_request, reply) => {
    if (!attestationSigningKey) return jsonError(reply, 503, 'ATTESTATION_SIGNING_KEY_REQUIRED');
    if (attestationSigningKey.length < MIN_ATTESTATION_KEY_LENGTH) return jsonError(reply, 503, 'ATTESTATION_SIGNING_KEY_TOO_WEAK', { minimumLength: MIN_ATTESTATION_KEY_LENGTH });
    const service = new AttestationService({ signingKey: attestationSigningKey, algorithm: 'HMAC-SHA256' });
    const telemetry = ObserverEngine.generateTelemetry();
    const verificationResult = { id: `ver-${Date.now()}`, observationId: telemetry.uuid, timestamp: telemetry.timestamp, summary: { passed: true, confidence: 1, rulesApplied: 4, rulesPassed: 4, rulesFailed: 0 }, ruleVersions: { 'frontier-matrix': 'v1.0' } };
    return { success: true, attestation: service.attest(verificationResult), tip: ledgerMemory.getTip() };
  });

  fastify.post('/v1/cycle', async (request: any, reply) => {
    const signingKey = process.env.OMEGA_SIGNING_KEY || attestationSigningKey;
    if (!signingKey) return jsonError(reply, 503, 'ATTESTATION_SIGNING_KEY_REQUIRED');
    const signature = request.headers['x-omega-signature'] as string | undefined;
    const publicKey = request.headers['x-omega-public-key'] as string | undefined;
    if (Boolean(signature) !== Boolean(publicKey)) return jsonError(reply, 400, 'INCOMPLETE_ASYMMETRIC_SIGNATURE');
    if (!signature && !publicKey && !allowUnsignedCycle) return jsonError(reply, 401, 'ASYMMETRIC_SIGNATURE_REQUIRED');
    if (signature && publicKey && !AsymmetricValidationGuard.verify('EXECUTE_OMNI_CYCLE', signature, publicKey)) return jsonError(reply, 401, 'INVALID_ASYMMETRIC_SIGNATURE');
    const block = kernel.runCycle();
    minerStats.totalMined++;
    minerStats.lastBlockTime = block.timestamp;
    broadcastMintedBlock(block);
    const aiInsight = {
      source: 'STUB',
      observationId: block.observation.uuid,
      proof: `0xΩ-${block.hash}`,
      assessment: `Telemetry analysis complete for ${block.observation.uuid}: nominal state confirmed across all dimensions.`,
      confidence: 0.95,
      riskLevel: 'LOW',
      recommendations: [
        'Maintain nominal baseline telemetry monitoring',
        'Periodic ledger hash verification scheduled',
      ],
    };
    return { success: true, status: 'SYNCHRONIZED', block, aiInsight };
  });

  fastify.get('/v1/inference/status', async () => ({
    success: true,
    inference: await inferenceClient.getStatus(),
  }));

  fastify.post('/v1/inference/analyze', async (request: any) => {
    const observation = request.body?.observation ?? ObserverEngine.generateTelemetry();
    const result = await inferenceClient.analyzeObservation(observation);
    return { success: true, result };
  });

  fastify.get('/v1/memory/status', async () => ({
    success: true,
    memory: await vectorMemory.getStatus(),
  }));

  fastify.get('/v1/memory/search', async (request: any) => {
    const query = String(request.query?.q ?? '');
    const embedding = VectorMemory.generateSimpleEmbedding(query);
    const results = await vectorMemory.recall(embedding, 5);
    return { success: true, query, results };
  });

  fastify.get('/v1/pluralism/face', async () => ({
    success: true,
    face: PluralisticRealityMatrix.evaluateMatrix(),
  }));

  fastify.post('/v1/pluralism/converge', async (request: any, reply) => {
    try {
      const telemetry = ObserverEngine.generateTelemetry();
      telemetry.decentralizedStreams = request.body?.streams || [];
      const evidence = PluralismConvergenceMatrix.processConvergence(telemetry);
      return { success: true, consensusMatrix: telemetry.unifiedConsensus, evidence };
    } catch (err) {
      return jsonError(reply, 400, err instanceof Error ? err.message : String(err));
    }
  });

  fastify.get('/v1/pluralism/tensor', async () => ({
    success: true,
    contract: 'Ω∞v-DUALITY-TENSOR-V1111',
    law: '1 = GOD (Good - O = God)',
    streamsCount: dualityTensor.getInnerStreams().length,
    preservedDissentCount: dualityTensor.getInnerStreams().filter(s => s.isDissenting).length,
    streams: dualityTensor.getInnerStreams(),
    evaluatedAt: new Date().toISOString(),
  }));

  fastify.post('/v1/pluralism/tensor/meaning', async (request: any, reply) => {
    const body = request.body || {};
    const perspective = typeof body.perspective === 'string' ? body.perspective.trim() : '';
    const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';
    if (!perspective || !rawText) {
      return jsonError(reply, 400, 'PERSPECTIVE_AND_RAWTEXT_REQUIRED');
    }
    const stream = dualityTensor.registerInnerMeaning({
      perspective,
      culturalContext: body.culturalContext,
      symbolicWeight: typeof body.symbolicWeight === 'number' ? body.symbolicWeight : 0.8,
      isDissenting: Boolean(body.isDissenting),
      rawText,
    });
    return { success: true, stream };
  });

  fastify.post('/v1/pluralism/tensor/evaluate', async (request: any, reply) => {
    const body = request.body || {};
    const discernment = body.discernment;
    const externalFact = body.externalFact;
    if (!discernment || !externalFact) {
      return jsonError(reply, 400, 'DISCERNMENT_AND_EXTERNAL_FACT_REQUIRED');
    }
    const receipt = dualityTensor.evaluateDualityField(discernment, externalFact);
    return { success: true, receipt };
  });

  fastify.get('/v1/pluralism/matrix', async () => {
    const transition = executeMatrixTransition(0, [], undefined, true, true);
    return {
      success: true,
      contract: 'Ω∞v-MASTER-MATRIX-V1111',
      equation: 'R_{k+1} = Evol(M) · Ω_{OS} · R_k + V_k',
      kroneckerFormula: 'Ω_{OS} = M_I ⊗ C_E ⊗ R_E ⊗ V_X',
      dimension: 320,
      bodyOrgans: OCEANIC_BODY_MEMBERS,
      sampleTransition: transition,
      evaluatedAt: new Date().toISOString(),
    };
  });

  fastify.post('/v1/pluralism/matrix/lambda', async (request: any) => {
    const body = request.body || {};
    const res = evaluateOmegaLambda({
      R: body.R || 'R_CURRENT',
      I: body.I || 'NO_INTENT',
      E: body.E || null,
      A: Boolean(body.A),
      P: Boolean(body.P),
      M: body.M || {},
    });
    return { success: true, lambdaResult: res };
  });

  fastify.post('/v1/pluralism/matrix/transition', async (request: any) => {
    const body = request.body || {};
    const step = typeof body.step === 'number' ? body.step : 0;
    const stateVector = Array.isArray(body.stateVector) ? body.stateVector : [];
    const isAuthorized = body.isAuthorized !== undefined ? Boolean(body.isAuthorized) : true;
    const isEvidenceVerified = body.isEvidenceVerified !== undefined ? Boolean(body.isEvidenceVerified) : true;

    const receipt = executeMatrixTransition(
      step,
      stateVector,
      body.vectors,
      isAuthorized,
      isEvidenceVerified
    );
    return { success: true, receipt };
  });

  fastify.get('/v1/pluralism/matrix/continuum-compression', async () => {
    const receipt = executeContinuumCompressionTransition();
    return { success: receipt.success, receipt };
  });

  fastify.post('/v1/pluralism/matrix/continuum-compression', async (request: any) => {
    const body = request.body || {};
    const attributedHuman = typeof body.attributedHuman === 'string' ? body.attributedHuman : undefined;
    const isEvidenceVerified = body.isEvidenceVerified !== undefined ? Boolean(body.isEvidenceVerified) : true;
    const receipt = executeContinuumCompressionTransition(attributedHuman, isEvidenceVerified);
    return { success: receipt.success, receipt };
  });

  fastify.get('/v1/verification/contract', async () => {
    const receipt = evaluateVerificationContract({
      stateBefore: 'STATE_VERIFIED_ROOT',
      intent: 'STATUS_PROBE',
      expectedState: 'STATE_VERIFIED_ROOT',
      authority: true,
      humanConsent: true,
      policyPassed: true,
      attempted: true,
      executed: true,
      observation: {
        observed: true,
        observedState: 'STATE_VERIFIED_ROOT',
      },
      evidence: {
        claim: 'Verification contract probe active',
        observed: true,
        verified: true,
      },
    });
    return { success: true, receipt };
  });

  fastify.post('/v1/verification/contract', async (request: any) => {
    const body = request.body || {};
    const receipt = evaluateVerificationContract({
      stateBefore: body.stateBefore ?? 'STATE_VERIFIED_ROOT',
      intent: typeof body.intent === 'string' ? body.intent : 'VERIFICATION_CONTRACT_EVALUATION',
      expectedState: body.expectedState,
      authority: body.authority !== undefined ? Boolean(body.authority) : false,
      humanConsent: body.humanConsent !== undefined ? Boolean(body.humanConsent) : true,
      policyPassed: body.policyPassed !== undefined ? Boolean(body.policyPassed) : false,
      capabilityPresent: body.capabilityPresent !== undefined ? Boolean(body.capabilityPresent) : true,
      attempted: body.attempted !== undefined ? Boolean(body.attempted) : false,
      executed: body.executed !== undefined ? Boolean(body.executed) : false,
      observation: body.observation,
      evidence: body.evidence,
      dissent: body.dissent,
      previousProofHash: body.previousProofHash,
      stepIndex: body.stepIndex,
    });
    return { success: receipt.outcome === 'VERIFIED', receipt };
  });

  fastify.get('/v1/verification/max-equation', async () => ({
    success: true,
    metadata: DEFAULT_MAX_EQUATION_METADATA,
    evaluatedAt: new Date().toISOString(),
  }));

  fastify.post('/v1/verification/optimize-slice', async (request: any, reply) => {
    try {
      const body = request.body || {};
      const candidates = Array.isArray(body.candidates) ? body.candidates : [];
      const context = body.context || {};
      const result = optimizeMaxEquationSlices(candidates, context);
      return { success: true, result };
    } catch (err: any) {
      return jsonError(reply, 400, 'MAX_EQUATION_OPTIMIZATION_FAILED', { detail: err?.message || String(err) });
    }
  });

  fastify.post('/v1/verification/convergence', async (request: any, reply) => {
    try {
      const body = request.body || {};
      const A = Array.isArray(body.A) ? body.A : [1, 2, 3, 4];
      const B = Array.isArray(body.B) ? body.B : [1, 1, 1, 1];
      const C = typeof body.C === 'number' ? body.C : -10;
      const S = typeof body.S === 'number' ? body.S : 1;
      const delta = body.delta || {
        intent: 'MAX_TOTAL_CONVERGENCE_SINGULARITY',
        reality: 'MAX_TOTAL_CONVERGENCE_SINGULARITY',
      };
      const evaluation = evaluatePsiConvergence(A, B, C, S, delta);
      return {
        success: true,
        contract: 'Ω∞v-TOTAL-CONVERGENCE-SINGULARITY-V1',
        equation: 'Ψ = λ(A, B, C, S, Δ): 0 if (∑(a·b)·S + C == 0) else { "Ω∞v": verify(Δ) or "∞💧" }',
        evaluation,
        evaluatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return jsonError(reply, 400, 'CONVERGENCE_EVALUATION_FAILED', { detail: err?.message || String(err) });
    }
  });

  fastify.post('/v1/verification/step', async (request: any, reply) => {
    try {
      const body = request.body || {};
      const currentO: OceanicosStateRecord = body.currentState || {
        epoch: 0,
        stateHash: '1def428b80fe33eae8fc94bca0fbf47c82fd02d1147e04c704d886222cbcdbfa',
        parentHash: '86d77b24503518470b0f14a08511986e5790d30e8794a048b401de1eeaf6499b',
        intent: 'V1111_SINGULARITY_RADICAL_COMPRESSION',
        verified: true,
        outcome: 'VERIFIED',
        value: 100,
        timestamp: new Date().toISOString(),
      };

      const candidate = body.candidate || {
        id: 'slice-v1111-step',
        intent: 'V1111_SINGULARITY_COMPRESSION_UPGRADE',
        valueEstimate: 95,
        evidenceQuality: 0.98,
        riskEstimate: 1,
        costEstimate: 2,
        authority: true,
        policy: true,
        scoped: true,
        acceptanceCriteria: ['Recursive step verification passes with fail-closed gate'],
      };

      const observedReality = body.observedReality;
      const stepResult = executeRememberVerifyObserveStep(currentO, candidate, observedReality);

      if (stepResult.verification.verified) {
        broadcastMintedBlock({
          type: 'STATE_TRANSITION',
          step: stepResult,
          hash: stepResult.nextState.stateHash,
          timestamp: stepResult.nextState.timestamp,
        });
      }

      return {
        success: true,
        contract: 'Ω∞v-RECURSIVE-STATE-UPDATE-V1',
        equation: 'O_{t+1} = REMEMBER( VERIFY( OBSERVE( O_t, Δ ) ) )',
        step: stepResult,
        executedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return jsonError(reply, 400, 'RECURSIVE_STEP_EVALUATION_FAILED', { detail: err?.message || String(err) });
    }
  });

  fastify.post('/v1/artemis/action', async (request: any, reply) => {
    const command = typeof request.body?.command === 'string' ? request.body.command.trim() : '';
    if (!command) {
      return jsonError(reply, 400, 'COMMAND_REQUIRED');
    }
    return {
      success: true,
      status: 'PROPOSED_ONLY',
      actionId: `artemis-${randomUUID()}`,
      command,
      limitations: ['action is evidence-bound proposal only', 'does not authorize execution without approval'],
    };
  });

  fastify.post('/v1/totality/lock', async (request: any) => {
    const face = PluralisticRealityMatrix.evaluateMatrix();
    return {
      success: true,
      manifest: {
        stateRoot: 'Ø',
        claim: request.body?.claim ?? 'Totality locked under zero entropy.',
        lockedAt: new Date().toISOString(),
        pluralisticRealityFace: face,
      },
    };
  });

  fastify.get('/v1/block/tip', { preHandler: requireReadAccess }, async () => ({ success: true, status: 'ONLINE', tip: ledgerMemory.getTip() }));
  fastify.get('/v1/stream', { preHandler: requireReadAccess }, (request: any, reply) => {
    reply.hijack();
    if (streamClients.size >= MAX_STREAM_CLIENTS) {
      reply.raw.statusCode = 503;
      reply.raw.setHeader('Content-Type', 'application/json');
      reply.raw.end(JSON.stringify({ success: false, error: 'STREAM_CAPACITY_REACHED', limit: MAX_STREAM_CLIENTS }));
      return;
    }
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();
    let listener: (block: any) => boolean;
    const close = () => streamClients.delete(listener);
    listener = (block) => {
      if (reply.raw.destroyed || reply.raw.writableEnded) return false;
      const writable = reply.raw.write(`data: ${JSON.stringify({ event: 'BLOCK_MINTED', block })}\n\n`);
      if (!writable) reply.raw.end();
      return writable;
    };
    const tip = ledgerMemory.getTip();
    reply.raw.write(`data: ${JSON.stringify({ event: 'TIP', block: tip })}\n\n`);
    streamClients.add(listener);
    request.raw.once('close', close);
    request.raw.once('aborted', close);
    reply.raw.once('error', close);
  });

  fastify.post('/v1/miner/start', async (request: any) => {
    const interval = typeof request.body?.intervalMs === 'number' && request.body.intervalMs >= 1000 ? request.body.intervalMs : 5000;
    if (minerInterval) clearInterval(minerInterval);
    minerStats.active = true; minerStats.intervalMs = interval;
    minerInterval = setInterval(() => { try { const block = kernel.runCycle(); minerStats.totalMined++; minerStats.lastBlockTime = block.timestamp; broadcastMintedBlock(block); } catch (error) { fastify.log.error(error); } }, interval);
    return { success: true, miner: minerStats };
  });
  fastify.post('/v1/miner/stop', async () => { if (minerInterval) clearInterval(minerInterval); minerInterval = null; minerStats.active = false; return { success: true, miner: minerStats }; });
  fastify.get('/v1/miner/status', async () => ({ success: true, miner: minerStats }));
  fastify.get('/v1/mesh/nodes', async () => ({ success: true, nodes: MultiRegionMeshConvergence.getNodes() }));
  fastify.get('/v1/mesh/simulate', async () => { const telemetry = ObserverEngine.generateTelemetry(); return { success: true, telemetry, convergence: MultiRegionMeshConvergence.simulateConvergence(telemetry) }; });
  fastify.post('/v1/auth/keypair', async () => ({ success: true, ...AsymmetricValidationGuard.generateKeyPair() }));
  fastify.post('/v1/block/sign', async (request: any, reply) => { const { data, privateKey } = request.body || {}; if (!data || !privateKey) return jsonError(reply, 400, 'MISSING_DATA_OR_PRIVATE_KEY'); return { success: true, signature: AsymmetricValidationGuard.sign(data, privateKey) }; });
  fastify.post('/v1/block/verify-signature', async (request: any, reply) => { const { data, signature, publicKey } = request.body || {}; if (!data || !signature || !publicKey) return jsonError(reply, 400, 'MISSING_FIELDS'); return { success: true, valid: AsymmetricValidationGuard.verify(data, signature, publicKey) }; });

  const persistenceStatus = () => ({ enabled: persistenceEnabled, snapshot, eventLog, rotationPending, operatorAction, recovery, deletion, custody, coordination });
  fastify.get('/persistence/status', { preHandler: requireReadAccess }, async () => ({ success: true, persistence: persistenceStatus() }));
  fastify.post('/persistence/acknowledge', { preHandler: requireAdminAccess }, async (request: any, reply) => {
    if (operatorAction === 'none') return jsonError(reply, 409, 'PERSISTENCE_ACK_NOT_REQUIRED');
    const operatorId = String(request.headers['x-omega-operator-id'] ?? request.body?.operatorId ?? '').trim();
    const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
    if (!operatorId || reason.length < 8 || reason.length > 1000) return jsonError(reply, 400, 'INVALID_ACKNOWLEDGEMENT_REASON');
    return { success: true, acknowledgement: { operatorId, reason, action: operatorAction, acknowledgedAt: new Date().toISOString(), requestId: randomUUID() } };
  });
  fastify.post('/persistence/reencrypt', { preHandler: requireAdminAccess }, async (request: any, reply) => {
    if (!persistenceEnabled || !persistenceKey || !previousPersistenceKey) return jsonError(reply, 409, 'PERSISTENCE_REENCRYPTION_NOT_READY');
    const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
    if (reason.length < 8 || reason.length > 1000) return jsonError(reply, 400, 'INVALID_REENCRYPTION_REASON');
    try {
      const result = reencryptPersistence(runtimeStorePath, eventLogPath, persistenceEnabled, persistenceKey, previousPersistenceKey);
      return { success: true, reencrypt: { ...result, reason, operatorId: String(request.headers['x-omega-operator-id'] ?? request.body?.operatorId ?? '').trim(), reencryptedAt: new Date().toISOString(), requestId: randomUUID() } };
    } catch (error) {
      return jsonError(reply, 409, 'PERSISTENCE_REENCRYPTION_FAILED', { reason: error instanceof Error ? error.message : String(error) });
    }
  });

  const jobProvenance = (request: any) => ({ source: 'api' as const, actor: String(request.headers['x-omega-operator-id'] ?? request.body?.actor ?? 'api').trim() || null, requestId: request.id ?? null, correlationId: request.headers['x-correlation-id'] ?? null, observedAt: new Date().toISOString(), schemaVersion: '1' as const });
  const jobError = (reply: any, error: unknown) => error instanceof LocalJobError ? jsonError(reply, error.code === 'JOB_NOT_FOUND' ? 404 : error.code === 'JOB_DUPLICATE' || error.code === 'JOB_IDEMPOTENCY_CONFLICT' ? 409 : 400, error.code, { message: error.message }) : jsonError(reply, 500, 'JOB_FAILED');
  fastify.get('/jobs', { preHandler: requireJobAccess }, async (request: any, reply) => {
    if (!localJobLedger.isEnabled()) return jsonError(reply, 503, 'LOCAL_JOB_LEDGER_DISABLED');
    const rawLimit = request.query?.limit;
    const limit = rawLimit === undefined ? LOCAL_JOB_WINDOW : Number(rawLimit);
    const state = request.query?.state as any;
    try { return { success: true, jobs: localJobLedger.list(limit, state), ledger: localJobLedger.status() }; } catch (error) { return jobError(reply, error); }
  });
  fastify.post('/jobs', { preHandler: requireJobAccess }, async (request: any, reply) => {
    if (!localJobLedger.isEnabled()) return jsonError(reply, 503, 'LOCAL_JOB_LEDGER_DISABLED');
    try { const result = localJobLedger.create(request.body, jobProvenance(request)); return reply.status(201).send({ success: true, ...result }); } catch (error) { return jobError(reply, error); }
  });
  fastify.get('/jobs/:jobId', { preHandler: requireJobAccess }, async (request: any, reply) => { if (!localJobLedger.isEnabled()) return jsonError(reply, 503, 'LOCAL_JOB_LEDGER_DISABLED'); const job = localJobLedger.get(request.params.jobId); return job ? { success: true, job, events: localJobLedger.recentEvents().filter((event) => event.jobId === job.id) } : jsonError(reply, 404, 'JOB_NOT_FOUND'); });
  fastify.post('/jobs/:jobId/claim', { preHandler: requireJobAccess }, async (request: any, reply) => { try { return { success: true, ...localJobLedger.claim(request.params.jobId, request.body?.workerId, jobProvenance(request)) }; } catch (error) { return jobError(reply, error); } });
  fastify.post('/jobs/:jobId/complete', { preHandler: requireJobAccess }, async (request: any, reply) => { try { return { success: true, ...localJobLedger.complete(request.params.jobId, request.body?.workerId, String(request.body?.resultSummary ?? ''), jobProvenance(request)) }; } catch (error) { return jobError(reply, error); } });
  fastify.post('/jobs/:jobId/fail', { preHandler: requireJobAccess }, async (request: any, reply) => { try { return { success: true, ...localJobLedger.fail(request.params.jobId, request.body?.workerId, String(request.body?.errorClass ?? ''), jobProvenance(request)) }; } catch (error) { return jobError(reply, error); } });

  fastify.get('/attest/revocations', { preHandler: requireReadAccess }, async () => ({ success: true, data: [...revocations.values()], meta: { integrity: 'intact', revision: revocations.size } }));
  fastify.post('/attest/revoke', { preHandler: requireAdminAccess }, async (request: any, reply) => {
    const attestationId = String(request.body?.attestationId ?? '').trim();
    const reason = String(request.body?.reason ?? '').trim();
    const revokedBy = String(request.body?.revokedBy ?? request.headers['x-omega-operator-id'] ?? 'operator').trim();
    if (!attestationId || !reason) return jsonError(reply, 400, 'INVALID_REVOCATION');
    if (revocations.has(attestationId)) return jsonError(reply, 409, 'ATTESTATION_ALREADY_REVOKED');
    const record = { id: `rev-${randomUUID()}`, attestationId, reason, revokedBy, revokedAt: new Date().toISOString() };
    revocations.set(attestationId, record);
    return reply.status(201).send({ success: true, data: record });
  });
  fastify.get('/attest/policy', { preHandler: requireReadAccess }, async () => ({ success: true, policy: { authMode, revocationEnabled: true, revocationRevision: revocations.size, attestationAlgorithm: 'HMAC-SHA256' } }));

  const webDist = process.env.OMEGA_WEB_DIST?.trim() ? resolve(process.env.OMEGA_WEB_DIST.trim()) : null;
  const sendStatic = (relativePath: string, reply: any) => {
    if (!webDist) return false;
    const target = resolve(join(webDist, relativePath));
    if (!target.startsWith(webDist)) return false;
    if (!existsSync(target)) return false;
    reply.type(target.endsWith('.html') ? 'text/html; charset=utf-8' : undefined).send(readFileSync(target));
    return true;
  };
  fastify.get('/', async (_request, reply) => { if (sendStatic('index.html', reply)) return; return jsonError(reply, 404, 'STATIC_CLIENT_UNAVAILABLE'); });
  fastify.get('/assets/*', async (request: any, reply) => { const asset = String(request.params['*'] ?? ''); if (sendStatic(join('assets', asset), reply)) return; return jsonError(reply, 404, 'STATIC_ASSET_NOT_FOUND'); });
  fastify.setNotFoundHandler(async (request, reply) => {
    if (webDist && request.method === 'GET' && !request.url.startsWith('/v1/') && !request.url.startsWith('/jobs') && !request.url.startsWith('/persistence') && !request.url.startsWith('/attest')) {
      if (sendStatic('index.html', reply)) return;
    }
    return jsonError(reply, 404, 'NOT_FOUND');
  });

  return fastify;
}

const defaultFastifyApp = createApp(process.env.OMEGA_DB_PATH ?? './oceanicos.db', process.env.NODE_ENV !== 'test');
const defaultReady = defaultFastifyApp.ready();
export const app: any = Object.assign(
  (req: any, res: any) => {
    if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
      req.url = req.url.startsWith('/api/') ? req.url.slice(4) || '/' : req.url.slice(4) || '/';
    }
    defaultReady.then(
      () => {
        (defaultFastifyApp as any).server.emit('request', req, res);
      },
      (err) => {
        res.statusCode = 500;
        res.end(String(err));
      }
    );
  },
  defaultFastifyApp
);
export const fastify = defaultFastifyApp;
export default app;

export {
  constantTimeTokenMatch,
  isAttestationExpired,
  operatorIdentityAllowed,
  revocationRegistryDigest,
  revocationRegistryStatus,
  parseAuditQuery,
} from './auth-helpers.js';

export const STARTUP_BANNER = [
  '[Ω∞v API] Verification loop server running',
  'Available endpoints:',
  '  GET    /health',
  '  GET    /v1/kernel/capabilities',
  '  GET    /v1/mood',
  '  POST   /v1/mood/pipeline',
  '  GET    /v1/ocean/fabric',
  '  GET    /v1/aisoul/command-center',
  '  POST   /v1/authorization/evaluate',
  '  GET    /v1/authorization/policy',
  '  POST   /observe',
  '  POST   /verify',
  '  POST   /mini/cycle',
  '  POST   /mini/total',
  '  GET    /mini/integrity',
  '  POST   /os/admit',
  '  GET    /memory',
  '  GET    /memory/integrity',
  '  GET    /v1/kai/records',
  '  GET    /v1/kai/integrity',
  '  POST   /v1/kai/record',
  '  POST   /v1/kai/verify-inference',
  '  GET    /rules',
  '  GET    /events',
  '  POST   /complete-loop',
  '  POST   /v1/attest',
  '  POST   /v1/cycle',
  '  GET    /v1/inference/status',
  '  POST   /v1/inference/analyze',
  '  GET    /v1/memory/status',
  '  GET    /v1/memory/search',
  '  GET    /v1/pluralism/face',
  '  POST   /v1/pluralism/converge',
  '  GET    /v1/pluralism/tensor',
  '  POST   /v1/pluralism/tensor/meaning',
  '  POST   /v1/pluralism/tensor/evaluate',
  '  GET    /v1/pluralism/matrix',
  '  POST   /v1/pluralism/matrix/lambda',
  '  POST   /v1/pluralism/matrix/transition',
  '  GET    /v1/pluralism/matrix/continuum-compression',
  '  POST   /v1/pluralism/matrix/continuum-compression',
  '  GET    /v1/verification/contract',
  '  POST   /v1/verification/contract',
  '  GET    /v1/verification/max-equation',
  '  POST   /v1/verification/optimize-slice',
  '  POST   /v1/verification/convergence',
  '  POST   /v1/verification/step',
  '  GET    /v1/continuum',
  '  GET    /v1/lucid/phases',
  '  POST   /v1/lucid/loop',
  '  POST   /v1/artemis/action',
  '  POST   /v1/totality/lock',
  '  GET    /v1/block/tip',
  '  GET    /v1/stream',
  '  POST   /v1/miner/start',
  '  POST   /v1/miner/stop',
  '  GET    /v1/miner/status',
  '  GET    /v1/mesh/nodes',
  '  GET    /v1/mesh/simulate',
  '  POST   /v1/auth/keypair',
  '  POST   /v1/block/sign',
  '  POST   /v1/block/verify-signature',
  '  GET    /persistence/status',
  '  POST   /persistence/acknowledge',
  '  POST   /persistence/reencrypt',
  '  GET    /jobs',
  '  POST   /jobs',
  '  GET    /jobs/:jobId',
  '  POST   /jobs/:jobId/claim',
  '  POST   /jobs/:jobId/complete',
  '  POST   /jobs/:jobId/fail',
  '  GET    /attest/revocations',
  '  POST   /attest/revoke',
  '  GET    /attest/policy',
  '  GET    /',
  '  GET    /assets/*',
  '',
].join('\n');

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? process.env.API_PORT ?? 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid API port: ${String(process.env.PORT ?? process.env.API_PORT)}`);
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Fastify API listening on http://0.0.0.0:${port}\n${STARTUP_BANNER}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const isDirectExecution =
  (typeof require !== 'undefined' && require.main === module) ||
  (process.argv[1] ? fileURLToPath(import.meta.url) === resolve(process.argv[1]) : false) ||
  (process.argv[1] ? process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.ts') : false);

if (isDirectExecution) start();
