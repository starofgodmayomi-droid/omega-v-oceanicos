import { randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { Express, Request, Response } from 'express';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { Remember, FileMemoryStore } from '@omega-v/remember';
import { Attestation, SuccessResponse, ErrorResponse, VerificationRule } from '@omega-v/types';
import {
  appendEvent,
  ENCRYPTION_ALGORITHM,
  encryptionEnabled,
  loadSnapshot,
  readEventLog,
  saveSnapshot,
} from './persistence.js';

/**
 * Ω∞v Oceanicos API Server
 * Exposes the verification loop via REST endpoints
 */
export const constantTimeTokenMatch = (supplied: string, expected: string): boolean => {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)
  );
};

const bearerToken = (authorization: string): string =>
  authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';

const app: Express = express();
const port = process.env.API_PORT || 3000;

/**
 * The web client addresses the API under /api. In development that prefix
 * is stripped by the Vite dev server's rewrite rule, which does not exist
 * in a production build: the built bundle called /api/* and nothing served
 * it. Stripping the prefix here means one origin serves both, and the
 * client works identically built or not.
 */
app.use((req: Request, _res: Response, next) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    req.url = req.url.slice(4) || '/';
  }
  next();
});

// Middleware
app.use(express.json());
app.use((req: Request, res: Response, next) => {
  const suppliedRequestId = req.header('x-request-id')?.trim();
  const requestId =
    suppliedRequestId && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(suppliedRequestId)
      ? suppliedRequestId
      : `req-${randomUUID()}`;
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const configuredReadToken = process.env.OMEGA_READ_TOKEN?.trim();
  const configuredAdminToken = process.env[ADMIN_TOKEN_ENV]?.trim();
  const isReadOnlyRequest = req.method === 'GET' && req.path !== '/health';
  const isRevocationRequest = req.method === 'POST' && req.path === '/attest/revoke';
  if (configuredReadToken && isReadOnlyRequest) {
    const authorization = req.header('authorization') || '';
    if (!constantTimeTokenMatch(bearerToken(authorization), configuredReadToken)) {
      res.status(401).json({
        code: 'READ_ACCESS_REQUIRED',
        message: 'A valid bearer token is required for read-only evidence access',
        requestId,
      });
      return;
    }
  }
  if (configuredAdminToken && isRevocationRequest) {
    const authorization = req.header('authorization') || '';
    if (!constantTimeTokenMatch(bearerToken(authorization), configuredAdminToken)) {
      res.status(401).json({
        code: 'ADMIN_ACCESS_REQUIRED',
        message: 'A valid admin bearer token is required to revoke attestations',
        requestId,
      });
      return;
    }
  }
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

// Initialize services. HMAC remains the default; Ed25519 is opt-in and must
// receive explicit private-key material so the API never silently changes its
// signing contract or signs with a public key.
const observer = new Observer();
const verificationEngine = new VerificationEngine();
const configuredAttestationAlgorithm = process.env.OMEGA_ATTESTATION_ALGORITHM;
const attestationService =
  configuredAttestationAlgorithm === 'Ed25519'
    ? new AttestationService({
        algorithm: 'Ed25519',
        signingKey: process.env.OMEGA_ED25519_PRIVATE_KEY || process.env.OMEGA_ED25519_KEY,
        publicKey: process.env.OMEGA_ED25519_PUBLIC_KEY,
        keyVersion: process.env.OMEGA_ATTESTATION_KEY_VERSION || '1',
      })
    : new AttestationService();

/**
 * The MINI kernel's memory, wired into the API.
 *
 * packages/remember was fully verified and imported by nothing: the
 * kernel was an island beside the API's own runtime arrays. This makes
 * the API a consumer of it, so completed loops enter a hash-chained,
 * append-only record whose integrity can be checked rather than assumed.
 */
const memoryPath = process.env.OMEGA_MEMORY_PATH || '/tmp/omega-v-oceanicos/memory.jsonl';

/**
 * Durability is decided by one flag, not two.
 *
 * The runtime store already honoured OMEGA_PERSISTENCE; this checked
 * NODE_ENV directly, so the kernel's chain was the one piece of state that
 * could not be switched on the documented way. Anything that cannot be
 * turned on cannot be verified in the state it ships in.
 */
const persistenceEnabled = process.env.OMEGA_PERSISTENCE
  ? process.env.OMEGA_PERSISTENCE === 'on'
  : process.env.NODE_ENV !== 'test';
const persistenceEncryptionKey = process.env.OMEGA_PERSISTENCE_KEY;
const persistenceEncryptionEnabled =
  persistenceEnabled && encryptionEnabled(persistenceEncryptionKey);
const memoryEncryptionKey = process.env.OMEGA_MEMORY_KEY;
const memoryEncryptionEnabled = persistenceEnabled && Boolean(memoryEncryptionKey?.trim());

const kernelMemoryStore = persistenceEnabled
  ? new FileMemoryStore(memoryPath, memoryEncryptionKey)
  : undefined;
const kernelMemory = new Remember(kernelMemoryStore);
const memoryEncryptionKeySource = kernelMemoryStore?.encryptionKeySource() ?? 'none';

type SigningAuditDetails = {
  attestationId: string;
  verificationId: string;
  algorithm: string;
  keyVersion: string;
  keyFingerprint: string;
  verified: boolean;
  confidence: number;
  ruleVersions: Record<string, string>;
};

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
type RuntimeRevocation = {
  id: string;
  attestationId: string;
  reason: string;
  revokedBy: string;
  revokedAt: string;
};
type RuntimeSnapshot = {
  events: RuntimeEvent[];
  runs: CompletedRun[];
  actions: RuntimeAction[];
  learnings: RuntimeLearning[];
  recompilations: RuntimeRecompilation[];
  revocations?: RuntimeRevocation[];
};

export const ADMIN_TOKEN_ENV = 'OMEGA_ADMIN_TOKEN';

const runtimeStorePath =
  process.env.OMEGA_RUNTIME_STORE_PATH || '/tmp/omega-v-oceanicos/runtime.json';

/**
 * Durable append-only event log. The runtime arrays below are a bounded
 * recent window; this file is the history invariant 4 promises.
 */
const eventLogPath =
  process.env.OMEGA_EVENT_LOG_PATH || `${runtimeStorePath.replace(/\.json$/, '')}.log.jsonl`;

const {
  snapshot,
  source: persistenceSource,
  reason: persistenceReason,
} = loadSnapshot<RuntimeSnapshot>(runtimeStorePath, persistenceEnabled, persistenceEncryptionKey);

const runtimeEvents = snapshot.events;
const eventStreams = new Set<Response>();
const completedRuns = snapshot.runs;
const runtimeActions = snapshot.actions;
const runtimeLearnings = snapshot.learnings;
const runtimeRecompilations = snapshot.recompilations;
const runtimeRevocations = snapshot.revocations ?? [];
const configuredAttestationTtlMs = (): number | null => {
  const raw = process.env.OMEGA_ATTESTATION_TTL_MS?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const isAttestationExpired = (
  attestation: Attestation,
  now = Date.now(),
  ttlMs = configuredAttestationTtlMs()
): boolean => {
  if (ttlMs === null) return false;
  const attestedAt = Date.parse(attestation.attestedAt);
  return !Number.isFinite(attestedAt) || now - attestedAt >= ttlMs;
};

const isRevoked = (attestationId: string): boolean =>
  runtimeRevocations.some((revocation) => revocation.attestationId === attestationId);

const persistRuntime = (): void => {
  saveSnapshot(
    runtimeStorePath,
    {
      events: runtimeEvents,
      runs: completedRuns,
      actions: runtimeActions,
      learnings: runtimeLearnings,
      recompilations: runtimeRecompilations,
      revocations: runtimeRevocations,
    } as RuntimeSnapshot,
    persistenceEnabled,
    persistenceEncryptionKey
  );
};

/** How many recent events the in-memory runtime keeps. Not a history limit. */
const RECENT_EVENT_WINDOW = 40;

const recordEvent = (event: Omit<RuntimeEvent, 'id' | 'timestamp'>): RuntimeEvent => {
  const recorded: RuntimeEvent = {
    ...event,
    id: `evt-${Date.now()}-${runtimeEvents.length + 1}`,
    timestamp: new Date().toISOString(),
  };
  // Durable history first: the log is append-only and never truncated.
  appendEvent(eventLogPath, recorded, persistenceEnabled, persistenceEncryptionKey);

  // The in-memory array is a bounded recent window, not the log itself.
  runtimeEvents.unshift(recorded);
  runtimeEvents.splice(RECENT_EVENT_WINDOW);
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
 * Health check endpoint. This remains unauthenticated and exposes only
 * non-secret liveness/readiness evidence for probes and operators.
 */
app.get('/health', (_req: Request, res: Response) => {
  const memoryIntact = kernelMemory.verifyIntegrity();
  const response: SuccessResponse<{
    status: 'ok';
    readiness: 'ready' | 'degraded';
    checks: {
      observer: 'ready';
      verifier: 'ready';
      attester: 'ready';
      memory: { status: 'ready' | 'degraded'; integrity: boolean; encryption: string };
      persistence: { mode: 'file' | 'memory'; encryption: string };
    };
    policy: {
      attestationAlgorithm: string;
      attestationTtlMs: number | null;
      readAuthConfigured: boolean;
      adminAuthConfigured: boolean;
      revocationEnabled: true;
    };
  }> = {
    data: {
      status: 'ok',
      readiness: memoryIntact ? 'ready' : 'degraded',
      checks: {
        observer: 'ready',
        verifier: 'ready',
        attester: 'ready',
        memory: {
          status: memoryIntact ? 'ready' : 'degraded',
          integrity: memoryIntact,
          encryption: memoryEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
        },
        persistence: {
          mode: persistenceEnabled ? 'file' : 'memory',
          encryption: persistenceEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
        },
      },
      policy: {
        attestationAlgorithm: attestationService.getKeyInfo().algorithm,
        attestationTtlMs: configuredAttestationTtlMs(),
        readAuthConfigured: Boolean(process.env.OMEGA_READ_TOKEN?.trim()),
        adminAuthConfigured: Boolean(process.env[ADMIN_TOKEN_ENV]?.trim()),
        revocationEnabled: true,
      },
    },
    timestamp: new Date().toISOString(),
  };
  res.status(memoryIntact ? 200 : 503).json(response);
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
      persistenceEncryption: persistenceEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
      memoryEncryption: memoryEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
      attestationTtlMs: configuredAttestationTtlMs(),
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

/**
 * GET /observability - Read-only operational evidence for runtime inspection.
 * This composes existing state sources and exposes no signing material.
 */
app.get('/observability', (_req: Request, res: Response) => {
  const latestRun = completedRuns[0];
  const latestEvent = runtimeEvents[0];
  const durableLog = readEventLog<RuntimeEvent>(
    eventLogPath,
    persistenceEnabled,
    persistenceEncryptionKey
  );
  const attestationValidity = latestRun ? attestationService.verify(latestRun.attestation) : null;

  res.json({
    data: {
      runtime: {
        mode: latestEvent?.stage || 'observing',
        persistence: persistenceEnabled ? 'file' : 'memory',
        persistenceEncryption: persistenceEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
        memoryEncryption: memoryEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
        memoryEncryptionKeySource,
        attestationTtlMs: configuredAttestationTtlMs(),
        services: ['observer', 'verifier', 'attester'],
        lastActivity: latestEvent?.timestamp || null,
      },
      provenance: {
        recentEvents: runtimeEvents.length,
        durableEvents: durableLog.entries.length,
        skippedLogEntries: durableLog.skipped,
        completedRuns: completedRuns.length,
        lastRequestId: latestEvent?.requestId || null,
        lastCorrelationId: latestEvent?.correlationId || null,
      },
      trust: {
        verificationCoverage: latestRun ? (latestRun.verification.summary.passed ? 1 : 0) : null,
        attestationValidity,
      },
      memory: {
        entries: kernelMemory.size(),
        intact: kernelMemory.verifyIntegrity(),
        appendOnly: true,
        encryption: memoryEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
        encryptionKeySource: memoryEncryptionKeySource,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/evidence/export', (_req: Request, res: Response) => {
  const durableLog = readEventLog<RuntimeEvent>(
    eventLogPath,
    persistenceEnabled,
    persistenceEncryptionKey
  );
  const latestRun = completedRuns[0];
  const latestEvent = runtimeEvents[0];
  const attestationValidity = latestRun ? attestationService.verify(latestRun.attestation) : null;

  res.json({
    data: {
      observability: {
        runtime: {
          mode: latestEvent?.stage || 'observing',
          persistence: persistenceEnabled ? 'file' : 'memory',
          services: ['observer', 'verifier', 'attester'],
          lastActivity: latestEvent?.timestamp || null,
        },
        provenance: {
          recentEvents: runtimeEvents.length,
          durableEvents: durableLog.entries.length,
          skippedLogEntries: durableLog.skipped,
          completedRuns: completedRuns.length,
          lastRequestId: latestEvent?.requestId || null,
          lastCorrelationId: latestEvent?.correlationId || null,
        },
        trust: {
          verificationCoverage: latestRun ? (latestRun.verification.summary.passed ? 1 : 0) : null,
          attestationValidity,
        },
        memory: {
          entries: kernelMemory.size(),
          intact: kernelMemory.verifyIntegrity(),
          appendOnly: true,
        },
      },
      events: runtimeEvents.slice(0, RECENT_EVENT_WINDOW),
      runs: completedRuns.slice(0, 10),
    },
    meta: { bounded: true, eventWindow: RECENT_EVENT_WINDOW, runWindow: 10 },
    timestamp: new Date().toISOString(),
  });
});

app.get('/events', (_req: Request, res: Response) => {
  res.json({
    data: runtimeEvents,
    meta: { window: RECENT_EVENT_WINDOW, note: 'recent window; see /log for full history' },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /log - The append-only event history
 */
app.get('/log', (_req: Request, res: Response) => {
  const log = readEventLog<RuntimeEvent>(
    eventLogPath,
    persistenceEnabled,
    persistenceEncryptionKey
  );
  res.json({
    data: log.entries,
    meta: {
      source: log.source,
      skipped: log.skipped,
      reason: log.reason ?? null,
      appendOnly: true,
    },
    timestamp: new Date().toISOString(),
  });
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

    const revoked = isRevoked(attestation.id);
    const expired = isAttestationExpired(attestation);
    res.json({
      data: {
        valid: attestationService.verify(attestation) && !revoked && !expired,
        revoked,
        expired,
      },
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

/** Public, non-secret attestation verification metadata. */
app.post('/attest/revoke', (req: Request, res: Response) => {
  const {
    attestationId,
    reason,
    revokedBy = 'operator',
  } = req.body as {
    attestationId?: string;
    reason?: string;
    revokedBy?: string;
  };
  if (!attestationId || !reason) {
    res.status(400).json({
      code: 'MISSING_REVOCATION_DETAILS',
      message: 'attestationId and reason are required to revoke an attestation',
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }
  if (!completedRuns.some((run) => run.attestation.id === attestationId)) {
    res.status(404).json({
      code: 'ATTESTATION_NOT_RECORDED',
      message: 'Cannot revoke an attestation with no recorded runtime lineage',
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }
  if (isRevoked(attestationId)) {
    res.status(409).json({
      code: 'ATTESTATION_ALREADY_REVOKED',
      message: 'The attestation has already been revoked',
      timestamp: new Date().toISOString(),
    } satisfies ErrorResponse);
    return;
  }

  const revocation: RuntimeRevocation = {
    id: `rev-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`,
    attestationId,
    reason,
    revokedBy,
    revokedAt: new Date().toISOString(),
  };
  runtimeRevocations.unshift(revocation);
  persistRuntime();
  recordEvent({
    type: 'attestation.revoked',
    stage: 'attest',
    message: 'Attestation revoked',
    status: 'failed',
    details: revocation,
  });
  res.status(201).json({ data: revocation, timestamp: new Date().toISOString() });
});

app.get('/attest/revocations', (_req: Request, res: Response) => {
  res.json({ data: runtimeRevocations, timestamp: new Date().toISOString() });
});

app.get('/attest/policy', (_req: Request, res: Response) => {
  res.json({
    data: {
      attestationAlgorithm: attestationService.getKeyInfo().algorithm,
      attestationTtlMs: configuredAttestationTtlMs(),
      readAuthConfigured: Boolean(process.env.OMEGA_READ_TOKEN?.trim()),
      adminAuthConfigured: Boolean(process.env[ADMIN_TOKEN_ENV]?.trim()),
      revocationEnabled: true,
      persistenceEncryption: persistenceEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
      memoryEncryption: memoryEncryptionEnabled ? ENCRYPTION_ALGORITHM : 'disabled',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/attest/public-key', (_req: Request, res: Response) => {
  const info = attestationService.getKeyInfo();
  if (info.algorithm !== 'Ed25519' || !info.publicKey) {
    res.status(503).json({
      code: 'ED25519_TRUST_UNAVAILABLE',
      message:
        'Ed25519 public-key discovery is unavailable while the configured algorithm is not Ed25519',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({
    data: {
      algorithm: info.algorithm,
      keyId: info.fingerprint,
      fingerprint: info.fingerprint,
      keyVersion: info.version,
      publicKey: info.publicKey,
    },
    timestamp: new Date().toISOString(),
  });
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
    if (isRevoked(attestation.id)) {
      res.status(409).json({
        code: 'REVOKED_ATTESTATION',
        message: 'Action denied because the attestation has been revoked',
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse);
      return;
    }
    if (isAttestationExpired(attestation)) {
      res.status(409).json({
        code: 'EXPIRED_ATTESTATION',
        message: 'Action denied because the attestation has expired',
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

    // Step 4: Remember (MINI kernel's hash chain)
    // Unlike completedRuns, which is a bounded window, this is append-only
    // and integrity-checkable. Remember completes the MINI cycle: Observe → Verify → Remember
    recordEvent({
      type: 'memory.entering',
      stage: 'remember',
      message: 'Storing in MINI kernel memory (append-only hash chain)',
      status: 'active',
      correlationId,
      requestId,
    });
    const remembered = kernelMemory.remember(observation, verificationResult);

    persistRuntime();
    recordEvent({
      type: 'memory.recorded',
      stage: 'remember',
      message: 'Verification result stored in MINI kernel',
      status: 'passed',
      correlationId,
      requestId,
      details: { memoryId: remembered.id },
    });
    recordEvent({
      type: 'attestation.created',
      stage: 'attest',
      message: 'Verification result signed and recorded',
      status: attestation.verified ? 'passed' : 'failed',
      correlationId,
      requestId,
      details: {
        attestationId: attestation.id,
        memoryId: remembered.id,
        signing: {
          attestationId: attestation.id,
          verificationId: attestation.verificationId,
          algorithm: attestation.signingAlgorithm || 'HMAC-SHA256',
          keyVersion: attestation.keyVersion,
          keyFingerprint: attestation.signingKey,
          verified: attestation.verified,
          confidence: attestation.confidence,
          ruleVersions: attestation.ruleVersions,
        } satisfies SigningAuditDetails,
      },
    });

    const response: SuccessResponse<{
      observation: typeof observation;
      verification: typeof verificationResult;
      memory: typeof remembered;
      attestation: typeof attestation;
    }> = {
      data: {
        observation,
        verification: verificationResult,
        memory: remembered,
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
 * GET /memory - The kernel's hash-chained memory
 */
app.get('/memory', (_req: Request, res: Response) => {
  res.json({
    data: kernelMemory.all(),
    meta: {
      size: kernelMemory.size(),
      appendOnly: true,
      durable: persistenceEnabled,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /memory/integrity - Recompute the chain and report whether it holds
 */
app.get('/memory/integrity', (_req: Request, res: Response) => {
  const intact = kernelMemory.verifyIntegrity();
  res.status(intact ? 200 : 409).json({
    data: { intact, entries: kernelMemory.size() },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /rules - List registered verification rules
 *
 * Without a category, returns every registered rule. With ?category=x,
 * returns the rules that would apply to an observation in that category.
 */
app.get('/rules', (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : null;

  const rules = category
    ? verificationEngine.getApplicableRules({
        claim: { statement: '', category },
        source: { system: '', version: '', environment: '' },
        timestamp: '',
        observedBy: '',
        metadata: {},
        confidence: 0,
        confidenceReason: '',
        status: 'normalized',
        id: '',
      })
    : verificationEngine.getRules();

  /**
   * `executable` distinguishes a rule the engine will actually evaluate from
   * one it merely holds. A rule's `definition` string is a declaration, not
   * something this engine interprets, so publishing the rule list without
   * that flag implies every definition runs. Rules that are not executable
   * fail verification rather than passing quietly, and a caller is better
   * off learning that here than from a failed verdict.
   */
  const response: SuccessResponse<{
    count: number;
    registered: number;
    executable: number;
    category: string | null;
    rules: Array<VerificationRule & { executable: boolean }>;
  }> = {
    data: {
      count: rules.length,
      registered: verificationEngine.getRuleCount(),
      executable: rules.filter((rule) => verificationEngine.canExecute(rule.name)).length,
      category,
      rules: rules.map((rule) => ({
        ...rule,
        executable: verificationEngine.canExecute(rule.name),
      })),
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Static web client, when a build is present.
 *
 * apps/web was not in the image at all and had no production origin. The
 * bundle is optional: if it has not been built, the API behaves exactly as
 * before and this is a no-op.
 */
const webDistPath = process.env.OMEGA_WEB_DIST || join(process.cwd(), 'apps/web/dist');
const webBuildPresent = existsSync(join(webDistPath, 'index.html'));

if (webBuildPresent) {
  app.use(express.static(webDistPath));
}

/**
 * 404 Handler
 *
 * A single-page client owns its own routes, so an unmatched GET that is not
 * an API call falls back to index.html. Anything else is a genuine 404 and
 * still says so in the structured error shape.
 */
app.use((req: Request, res: Response) => {
  if (webBuildPresent && req.method === 'GET' && !req.accepts('json')) {
    res.sendFile(join(webDistPath, 'index.html'));
    return;
  }

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
        '  GET    /log              - Append-only event history',
        '  GET    /memory           - Kernel hash-chained memory',
        '  GET    /memory/integrity - Verify the memory chain',
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

export { app, startServer, attestationService };
export default app;
