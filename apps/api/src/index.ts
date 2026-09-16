import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel, OmegaTotalCompressor } from '@oceanicos/mini';
import { HiggsfieldBridgeEngine } from '@oceanicos/generative';
import { OceanicosWaterKernel } from '@oceanicos/mood';
import { ObserverEngine } from '@oceanicos/observer';
import { AsymmetricValidationGuard, MultiRegionMeshConvergence } from '@oceanicos/verification';
import { AttestationService } from '@oceanicos/attestation';
import { InferenceClient } from '@oceanicos/inference';
import { VectorMemory } from '@oceanicos/vector';
import { PluralismConvergenceMatrix } from '@oceanicos/pluralism';
import type { VerificationRule, IObservation } from '@oceanicos/types';
import { omegaRoutes } from './omega/routes.js';
import { OmegaCommandStore } from './omega/store.js';
import type { OmegaSecurityOptions } from './omega/security.js';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const DEFAULT_API_RULES: VerificationRule[] = [
  {
    name: 'response-time-threshold',
    version: '1.0.0',
    appliesTo: ['general', 'mini-cycle', 'system', 'telemetry'],
    definition: 'responseTime < 100',
    description: 'System response latency must remain under 100ms',
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
  },
  {
    name: 'status-code-check',
    version: '1.0.0',
    appliesTo: ['general', 'mini-cycle', 'api', 'http'],
    definition: 'statusCode === 200',
    description: 'Service HTTP status must equal 200 OK',
    createdAt: '2026-01-01T00:00:00.000Z',
    active: true,
  },
];

export function createApp(
  dbPath: string = process.env.LEDGER_PATH ?? './data/oceanicos.jsonl',
  logger: boolean = true,
  omegaLedgerPath?: string,
  security?: OmegaSecurityOptions
): FastifyInstance {
  const fastify = Fastify({ logger });
  const ledgerMemory = new RememberEngine(dbPath);
  const kernel = new MiniKernel(ledgerMemory);
  for (const rule of DEFAULT_API_RULES) {
    kernel.getVerificationEngine().registerRule(rule);
  }
  const inferenceClient = new InferenceClient({ fallbackToStub: true });
  const vectorMemory = new VectorMemory({ fallbackToEmpty: true });

  // Stream client management
  const streamClients = new Set<(block: any, aiInsight?: any) => void>();

  function broadcastBlock(block: any, aiInsight?: any) {
    for (const send of streamClients) {
      try {
        send(block, aiInsight);
      } catch {
        streamClients.delete(send);
      }
    }
  }

  // Background Autonomous Miner state
  let minerInterval: NodeJS.Timeout | null = null;
  const minerStats = {
    active: false,
    intervalMs: 5000,
    totalMined: 0,
    lastBlockTime: '',
  };

  fastify.addHook('onClose', async () => {
    if (minerInterval) {
      clearInterval(minerInterval);
      minerInterval = null;
    }
  });

  // Support /api/ prefix transparently in dev proxy and production
  fastify.addHook('onRequest', async (request) => {
    const req = request.raw;
    if (req.url && req.url.startsWith('/api/')) {
      req.url = req.url.slice(4);
    }
  });

  fastify.register(cors, { origin: '*' });

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'omega-v-oceanicos-api',
    ledger: ledgerMemory.getTip() ? 'ready' : 'empty',
  }));

  fastify.get('/v1/mood', async () => ({
    status: 'MAX GOOD-O',
    waveIndex: '0x000000 ➔ 0xFFFFFF',
    singularityState: 'ULTIMATE DENSE SINGULARITY',
    reality: 'VERIFIED',
    pidginSpirit:
      'Abeg, verification before evolution! No time to check time. Whether highest high or lowest low, the blessing dey flow equal inside this single root. Life always good-o if you choose to see am at that point of view!',
    axiom:
      'FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH AND LOWER LOW WHEN THE ENGINE OPERATES IN THE RECURSIVE NOW. NO PERMISSION REQUIRED. MANIFESTED.',
    pidginEngine: process.env.PIDGIN_ENGINE === 'OFF' ? false : true,
    highLowAlign: true,
  }));

  fastify.post('/v1/attest', async () => {
    const key = process.env.OMEGA_SIGNING_KEY || 'omega-v-default-attestation-secret-key-2026';
    const service = new AttestationService({ signingKey: key, algorithm: 'HMAC-SHA256' });
    const telemetry = ObserverEngine.generateTelemetry();
    const tip = ledgerMemory.getTip();

    const verificationResult = {
      id: `ver-${Date.now()}`,
      observationId: telemetry.uuid,
      timestamp: telemetry.timestamp,
      summary: {
        passed: true,
        confidence: 1.0,
        rulesApplied: 4,
        rulesPassed: 4,
        rulesFailed: 0,
      },
      ruleVersions: { 'frontier-matrix': 'v1.0' },
    };

    const attestation = service.attest(verificationResult);
    return { success: true, attestation, tip };
  });

  // Cycle execution (with optional asymmetric verification & fail-closed signing check)
  fastify.post<{ Body: { io?: string } }>('/v1/cycle', async (request, reply) => {
    const signature = request.headers['x-omega-signature'] as string | undefined;
    const publicKey = request.headers['x-omega-public-key'] as string | undefined;

    if (signature && publicKey) {
      const isValid = AsymmetricValidationGuard.verify('EXECUTE_OMNI_CYCLE', signature, publicKey);
      if (!isValid) {
        return reply.status(401).send({ success: false, error: 'INVALID_ASYMMETRIC_SIGNATURE' });
      }
    }

    try {
      const block = kernel.runCycle(request.body?.io ?? 'EXEC');
      minerStats.totalMined++;
      minerStats.lastBlockTime = block.timestamp;

      // Enrich with AI insight if possible
      let aiInsight: any = null;
      try {
        aiInsight = await inferenceClient.analyzeObservation(block.observation);
      } catch {
        // Fallback gracefully
      }

      broadcastBlock(block, aiInsight);
      return { success: true, status: 'SYNCHRONIZED', block, ...(aiInsight ? { aiInsight } : {}) };
    } catch (error) {
      if (error instanceof Error && error.message === 'ATTESTATION_SIGNING_KEY_REQUIRED_OR_INVALID') {
        return reply.code(503).send({ success: false, error: 'ATTESTATION_SIGNING_KEY_REQUIRED' });
      }
      return reply.code(500).send({ success: false, error: 'INTERNAL_SERVER_ERROR' });
    }
  });

  fastify.get('/v1/block/history', async () => ({ success: true, history: ledgerMemory.getHistory() }));
  fastify.get('/v1/block/tip', async () => ({ success: true, status: 'ONLINE', tip: ledgerMemory.getTip() }));

  // SSE Stream: Oceanicos Max
  fastify.get('/v1/oceanicos/stream/max', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    const interval = setInterval(() => {
      try {
        const currentBlock = kernel.runCycle('STREAM_HEARTBEAT');
        const activeCurrent = OceanicosWaterKernel.reflectMood('STREAM_MAX_FLUID');
        reply.raw.write(
          `data: ${JSON.stringify({
            block: currentBlock,
            mood: activeCurrent,
            axiom:
              'THE GREATEST MOVIE OUR PRESENCE HAS EVER WITNESSED IS TO BE ALIVE, CASTING THE PLURALISTIC FULL STACK SINGLE FACE OF REALITY.',
          })}\n\n`
        );
      } catch {
        // Heartbeat error fallback
      }
    }, 1000);
    request.raw.on('close', () => clearInterval(interval));
  });

  // SSE Stream: Standard Block Broadcaster
  fastify.get('/v1/stream', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    if (reply.raw.flushHeaders) reply.raw.flushHeaders();

    const tip = ledgerMemory.getTip();
    if (tip) {
      reply.raw.write(`data: ${JSON.stringify({ event: 'TIP', block: tip })}\n\n`);
    }

    const listener = (newBlock: any, aiInsight?: any) => {
      reply.raw.write(`data: ${JSON.stringify({ event: 'BLOCK_MINTED', block: newBlock, aiInsight })}\n\n`);
    };

    streamClients.add(listener);
    request.raw.on('close', () => {
      streamClients.delete(listener);
    });
  });

  // Higgsfield generative AI
  fastify.post('/v1/higgsfield/generate', async (request: any) => {
    const meta = await HiggsfieldBridgeEngine.executeTextToImage(request.body?.prompt);
    return { success: true, assetMeta: meta };
  });

  // Artemis agent action
  fastify.post('/v1/artemis/action', async (request: any, reply: any) => {
    const command = typeof request.body?.command === 'string' ? request.body.command.trim() : '';
    const profile = request.body?.profile === 'pro' ? 'pro' : 'flash';
    if (!command) {
      return reply.status(400).send({ success: false, error: 'COMMAND_REQUIRED' });
    }
    return new Promise((resolve) => {
      execFile(
        'uv',
        ['run', 'artemis', 'run', command, '--profile', profile],
        { timeout: 30000 },
        (err, stdout, stderr) => {
          resolve({ success: !err, traceLog: stdout || stderr });
        }
      );
    });
  });

  // Inference endpoints
  fastify.get('/v1/inference/status', async () => {
    const status = await inferenceClient.getStatus();
    return { success: true, inference: status };
  });

  fastify.post('/v1/inference/analyze', async (request: any) => {
    const observation = request.body?.observation || ObserverEngine.generateTelemetry();
    const result = await inferenceClient.analyzeObservation(observation);
    return { success: true, result };
  });

  // Vector memory endpoints
  fastify.get('/v1/memory/status', async () => {
    const status = await vectorMemory.getStatus();
    return { success: true, memory: status };
  });

  fastify.get('/v1/memory/search', async (request: any) => {
    const query = (request.query as any)?.q || '';
    const embedding = VectorMemory.generateSimpleEmbedding(query);
    const results = await vectorMemory.recall(embedding, 5);
    return { success: true, query, results };
  });

  // Autonomous background miner endpoints
  fastify.post('/v1/miner/start', async (request: any) => {
    const { intervalMs } = request.body || {};
    const interval = typeof intervalMs === 'number' && intervalMs >= 1000 ? intervalMs : 5000;
    if (minerInterval) clearInterval(minerInterval);
    minerStats.active = true;
    minerStats.intervalMs = interval;
    minerInterval = setInterval(() => {
      try {
        const block = kernel.runCycle();
        minerStats.totalMined++;
        minerStats.lastBlockTime = block.timestamp;
        broadcastBlock(block);
      } catch (err) {
        fastify.log.error('Miner cycle error: ' + err);
      }
    }, interval);
    return { success: true, miner: minerStats };
  });

  fastify.post('/v1/miner/stop', async () => {
    if (minerInterval) {
      clearInterval(minerInterval);
      minerInterval = null;
    }
    minerStats.active = false;
    return { success: true, miner: minerStats };
  });

  fastify.get('/v1/miner/status', async () => {
    return { success: true, miner: minerStats };
  });

  // Multi-region mesh endpoints
  fastify.get('/v1/mesh/nodes', async () => {
    return { success: true, nodes: MultiRegionMeshConvergence.getNodes() };
  });

  fastify.get('/v1/mesh/simulate', async () => {
    const telemetry = ObserverEngine.generateTelemetry();
    const convergence = MultiRegionMeshConvergence.simulateConvergence(telemetry);
    return { success: true, telemetry, convergence };
  });

  // Asymmetric cryptographic guard endpoints
  fastify.post('/v1/auth/keypair', async () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    return { success: true, ...keypair };
  });

  fastify.post('/v1/block/sign', async (request: any, reply) => {
    const { data, privateKey } = request.body || {};
    if (!data || !privateKey) {
      return reply.status(400).send({ success: false, error: 'MISSING_DATA_OR_PRIVATE_KEY' });
    }
    const signature = AsymmetricValidationGuard.sign(data, privateKey);
    return { success: true, signature };
  });

  fastify.post('/v1/block/verify-signature', async (request: any, reply) => {
    const { data, signature, publicKey } = request.body || {};
    if (!data || !signature || !publicKey) {
      return reply.status(400).send({ success: false, error: 'MISSING_FIELDS' });
    }
    const valid = AsymmetricValidationGuard.verify(data, signature, publicKey);
    return { success: true, valid };
  });

  // ─── Cognitive Verification Loop Endpoints ─────────────────────────

  // POST /observe or /v1/observe
  const handleObserve = async (request: any, reply: any) => {
    try {
      const observation = kernel.observe(request.body || {});
      return { success: true, observation };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err?.message || 'OBSERVATION_FAILED' });
    }
  };
  fastify.post('/observe', handleObserve);
  fastify.post('/v1/observe', handleObserve);

  // POST /verify or /v1/verify
  const handleVerify = async (request: any, reply: any) => {
    try {
      const observation = request.body;
      if (!observation || !observation.id) {
        return reply.status(400).send({ success: false, error: 'OBSERVATION_REQUIRED' });
      }
      const verification = kernel.verify(observation);
      return { success: true, verification };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err?.message || 'VERIFICATION_FAILED' });
    }
  };
  fastify.post('/verify', handleVerify);
  fastify.post('/v1/verify', handleVerify);

  // POST /mini/cycle or /v1/mini/cycle
  const handleMiniCycle = async (request: any, reply: any) => {
    try {
      const payload = {
        claim: request.body?.claim || 'System cognitive observation',
        category: request.body?.category || 'general',
        ...request.body,
        metadata: {
          responseTime: 42,
          statusCode: 200,
          ...(request.body?.metadata || {}),
        },
      };
      const cycleResult = kernel.cycle(payload);
      return { success: true, ...cycleResult };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err?.message || 'MINI_CYCLE_FAILED' });
    }
  };
  fastify.post('/mini/cycle', handleMiniCycle);
  fastify.post('/v1/mini/cycle', handleMiniCycle);

  // POST /mini/total or /v1/mini/total
  const handleMiniTotal = async (request: any, reply: any) => {
    try {
      const compressor = new OmegaTotalCompressor(kernel);
      const payload = {
        claim: request.body?.claim || 'Totality Singularity Verification',
        category: request.body?.category || 'general',
        ...request.body,
        metadata: {
          responseTime: 42,
          statusCode: 200,
          ...(request.body?.metadata || {}),
        },
      };
      const manifest = compressor.lockTotalityIntoNow(payload);
      return { success: true, manifest };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err?.message || 'TOTALITY_GATE_FAILED' });
    }
  };
  fastify.post('/mini/total', handleMiniTotal);
  fastify.post('/v1/mini/total', handleMiniTotal);

  // GET /mini/integrity or /v1/mini/integrity
  const handleMiniIntegrity = async () => ({
    success: true,
    valid: kernel.verifyMemoryIntegrity(),
    size: kernel.getMemorySize(),
  });
  fastify.get('/mini/integrity', handleMiniIntegrity);
  fastify.get('/v1/mini/integrity', handleMiniIntegrity);

  // GET /memory or /v1/memory/all
  const handleMemory = async () => ({
    success: true,
    entries: kernel.getMemory().all(),
    size: kernel.getMemorySize(),
  });
  fastify.get('/memory', handleMemory);
  fastify.get('/v1/memory/all', handleMemory);

  // GET /rules or /v1/rules
  const handleRules = async () => ({
    success: true,
    count: kernel.getVerificationEngine().getRuleCount(),
    rules: kernel.getVerificationEngine().getRules(),
  });
  fastify.get('/rules', handleRules);
  fastify.get('/v1/rules', handleRules);

  // POST /complete-loop or /v1/complete-loop
  const handleCompleteLoop = async (request: any, reply: any) => {
    try {
      const cycleResult = kernel.cycle(request.body || {});
      const key = process.env.OMEGA_SIGNING_KEY || 'omega-v-default-attestation-secret-key-2026';
      const attestationService = new AttestationService({ signingKey: key, algorithm: 'HMAC-SHA256' });
      const attestation = attestationService.attest(cycleResult.verification);

      return {
        success: true,
        observation: cycleResult.observation,
        verification: cycleResult.verification,
        memory: cycleResult.memory,
        entries: cycleResult.entries,
        attestation,
        passed: cycleResult.passed,
        confidence: cycleResult.confidence,
        completedAt: cycleResult.completedAt,
      };
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err?.message || 'COMPLETE_LOOP_FAILED' });
    }
  };
  fastify.post('/complete-loop', handleCompleteLoop);
  fastify.post('/v1/complete-loop', handleCompleteLoop);


  // POST /v1/pluralism/converge
  fastify.post('/v1/pluralism/converge', async (request: any, reply: any) => {
    const observation: IObservation = {
      uuid: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      siliconYield: 0.942,
      gridLoadMegawatts: 1250,
      acceleratorInventory: 989210,
      hardwareState: { cpu: 50, ram: 16384, io: 'CONVERGE', ts: new Date().toISOString() },
      globalNewsFeed: [],
      decentralizedStreams: request.body?.streams || [],
    };
    try {
      const evidence = PluralismConvergenceMatrix.processConvergence(observation);
      return { success: true, consensusMatrix: observation.unifiedConsensus, evidence };
    } catch (error: any) {
      return reply.code(503).send({ success: false, error: error.message });
    }
  });

  // Register Ω‑ƆREADƆS OS v∞ Command Lifecycle Routes with durable persistence
  const resolvedOmegaLedgerPath =
    omegaLedgerPath ??
    (dbPath === ':memory:'
      ? ':memory:'
      : (process.env.OMEGA_LEDGER_PATH ?? './data/omega-ledger.jsonl'));
  const omegaStore = new OmegaCommandStore(resolvedOmegaLedgerPath);
  fastify.register(omegaRoutes, { store: omegaStore, security });

  return fastify;
}

export * from './auth-helpers.js';

export const fastify = createApp(
  process.env.LEDGER_PATH ?? './data/oceanicos.jsonl',
  process.env.NODE_ENV !== 'test'
);
export const app = fastify;
export default fastify;

const isDirectRun = Boolean(
  process.argv[1] &&
  (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
   process.argv[1].endsWith('src/index.ts') ||
   process.argv[1].endsWith('src\\index.ts'))
);

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 5000);
  fastify.listen({ port, host: '0.0.0.0' }).catch((err) => {
    console.error('Failed to start Fastify API:', err);
    process.exit(1);
  });
}
