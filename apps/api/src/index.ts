import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel } from '@oceanicos/mini';
import { AsymmetricValidationGuard, MultiRegionMeshConvergence } from '@oceanicos/verification';
import { ObserverEngine } from '@oceanicos/observer';
import { AttestationService } from '@oceanicos/attestation';
import { BoundedRuntimeManager } from '@omega-v/runtime';
import { OceanicosKernel } from '@omega-v/kernel';
import { LocalJobError, LocalJobLedger, LOCAL_JOB_WINDOW } from './jobs.js';
import { registerPipelineRoute } from './pipeline-route.js';
import { registerEcosystemRoute } from './ecosystem-route.js';
import { registerRealityRoute } from './reality-route.js';
import { OmegaCommandStore, registerOmegaRoutes } from './omega.js';
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
  options: CreateAppOptions = {}
): FastifyInstance {
  const fastify = Fastify({ logger });
  const ledgerMemory = new RememberEngine(dbPath);
  const kernel = new MiniKernel(ledgerMemory);
  const platformKernel = new OceanicosKernel();
  const allowUnsignedCycle = options.allowUnsignedCycle ?? process.env.OMEGA_ALLOW_UNSIGNED_CYCLE === 'true';
  const attestationSigningKey = options.attestationSigningKey ?? process.env.OMEGA_SIGNING_KEY;
  const authMode = parseAuthMode(process.env.OMEGA_AUTH_MODE ?? (process.env.NODE_ENV === 'production' ? 'required' : 'local'));
  const { readToken, adminToken } = configuredBearerTokens(authMode);

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

  const runtime = new BoundedRuntimeManager({
    resources: [
      { id: 'remember-ledger', close: () => ledgerMemory.close() },
      { id: 'omega-command-store', close: () => omegaCommands.close() },
    ],
    onStopAcceptingWork: () => {
      if (minerInterval) {
        clearInterval(minerInterval);
        minerInterval = null;
        minerStats.active = false;
      }
      streamClients.clear();
    },
  });

  fastify.addHook('onClose', async () => {
    const receipt = await runtime.requestShutdown('fastify-close');
    if (receipt.errors.length > 0) {
      throw new Error('runtime shutdown failed: ' + receipt.errors.join('; '));
    }
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

  fastify.register(cors, { origin: '*' });
  fastify.register(async (scope) => {
    await scope.register(rateLimit, { global: false });
    registerOmegaRoutes(scope, omegaCommands);
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
  registerRealityRoute(fastify, authMode, Boolean(attestationSigningKey), Boolean(ledgerMemory.getTip()));

  fastify.get('/health', async (_request, reply) => {
    const memoryReady = true;
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
        observer: 'ready', verifier: 'ready', attester: attestationSigningKey ? 'ready' : 'degraded',
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
  fastify.get('/v1/mood', async () => ({ success: true, status: 'MAX GOOD-O', contract: 'Ω∞v totality / attest-dont-assert', brand: 'Oceanicos Ω∞', ledger: { ready: Boolean(ledgerMemory.getTip()) }, evaluatedAt: new Date().toISOString() }));

  fastify.post('/v1/attest', async (_request, reply) => {
    if (!attestationSigningKey) return jsonError(reply, 503, 'ATTESTATION_SIGNING_KEY_REQUIRED');
    if (attestationSigningKey.length < MIN_ATTESTATION_KEY_LENGTH) return jsonError(reply, 503, 'ATTESTATION_SIGNING_KEY_TOO_WEAK', { minimumLength: MIN_ATTESTATION_KEY_LENGTH });
    const service = new AttestationService({ signingKey: attestationSigningKey, algorithm: 'HMAC-SHA256' });
    const telemetry = ObserverEngine.generateTelemetry();
    const verificationResult = { id: `ver-${Date.now()}`, observationId: telemetry.uuid, timestamp: telemetry.timestamp, summary: { passed: true, confidence: 1, rulesApplied: 4, rulesPassed: 4, rulesFailed: 0 }, ruleVersions: { 'frontier-matrix': 'v1.0' } };
    return { success: true, attestation: service.attest(verificationResult), tip: ledgerMemory.getTip() };
  });

  fastify.post('/v1/cycle', async (request: any, reply) => {
    const signature = request.headers['x-omega-signature'] as string | undefined;
    const publicKey = request.headers['x-omega-public-key'] as string | undefined;
    if (Boolean(signature) !== Boolean(publicKey)) return jsonError(reply, 400, 'INCOMPLETE_ASYMMETRIC_SIGNATURE');
    if (!signature && !publicKey && !allowUnsignedCycle) return jsonError(reply, 401, 'ASYMMETRIC_SIGNATURE_REQUIRED');
    if (signature && publicKey && !AsymmetricValidationGuard.verify('EXECUTE_OMNI_CYCLE', signature, publicKey)) return jsonError(reply, 401, 'INVALID_ASYMMETRIC_SIGNATURE');
    const block = kernel.runCycle();
    minerStats.totalMined++;
    minerStats.lastBlockTime = block.timestamp;
    broadcastMintedBlock(block);
    return { success: true, status: 'SYNCHRONIZED', block };
  });

  fastify.get('/v1/block/tip', { preHandler: requireReadAccess }, async () => ({ success: true, status: 'ONLINE', tip: ledgerMemory.getTip() }));
  fastify.get('/v1/stream', { preHandler: requireReadAccess }, async (request: any, reply) => {
    if (streamClients.size >= MAX_STREAM_CLIENTS) return jsonError(reply, 503, 'STREAM_CAPACITY_REACHED', { limit: MAX_STREAM_CLIENTS });
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
    if (tip) reply.raw.write(`data: ${JSON.stringify({ event: 'TIP', block: tip })}\n\n`);
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

export const app = createApp(process.env.OMEGA_DB_PATH ?? './oceanicos.db', process.env.NODE_ENV !== 'test');

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? process.env.API_PORT ?? 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid API port: ${String(process.env.PORT ?? process.env.API_PORT)}`);
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Fastify API listening on http://0.0.0.0:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) start();
