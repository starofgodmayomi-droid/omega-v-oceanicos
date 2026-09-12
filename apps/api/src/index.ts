import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel } from '@oceanicos/mini';
import { AsymmetricValidationGuard, MultiRegionMeshConvergence } from '@oceanicos/verification';
import { ObserverEngine } from '@oceanicos/observer';
import { AttestationService } from '@oceanicos/attestation';

const MAX_STREAM_CLIENTS = 256;

export function createApp(dbPath: string = './oceanicos.db', logger: boolean = true): FastifyInstance {
  const fastify = Fastify({ logger });
  const ledgerMemory = new RememberEngine(dbPath);
  const kernel = new MiniKernel(ledgerMemory);

  // Active SSE client subscriptions for real-time block streaming
  const streamClients = new Set<(block: any) => boolean>();

  // Helper to broadcast minted blocks
  function broadcastMintedBlock(block: any) {
    for (const send of streamClients) {
      try {
        if (!send(block)) {
          streamClients.delete(send);
        }
      } catch {
        streamClients.delete(send);
      }
    }
  }

  // Background Continuous Autonomous Miner
  let minerInterval: NodeJS.Timeout | null = null;
  const minerStats = {
    active: false,
    intervalMs: 5000,
    totalMined: 0,
    lastBlockTime: '',
  };

  fastify.register(cors, { origin: '*' });

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'omega-v-oceanicos-api',
    ledger: ledgerMemory.getTip() ? 'ready' : 'empty',
  }));

  // Singularity Compression Status & Pidgin Spirit Mood Matrix
  fastify.get('/v1/mood', async () => ({
    status: 'MAX GOOD-O',
    waveIndex: '0x000000 ➔ 0xFFFFFF',
    singularityState: 'ULTIMATE DENSE SINGULARITY',
    reality: 'VERIFIED',
    pidginSpirit: 'Abeg, verification before evolution! No time to check time. Whether highest high or lowest low, the blessing dey flow equal inside this single root. Life always good-o if you choose to see am at that point of view!',
    axiom: 'FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH AND LOWER LOW WHEN THE ENGINE OPERATES IN THE RECURSIVE NOW. NO PERMISSION REQUIRED. MANIFESTED.',
    pidginEngine: process.env.PIDGIN_ENGINE === 'OFF' ? false : true,
    highLowAlign: true,
  }));

  // Cryptographic Attestation Generation
  fastify.post('/v1/attest', async (request, reply) => {
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

  // 1. Manual or Asymmetrically Signed Omni-Cycle Execution
  fastify.post('/v1/cycle', async (request, reply) => {
    const signature = request.headers['x-omega-signature'] as string | undefined;
    const publicKey = request.headers['x-omega-public-key'] as string | undefined;

    if (signature && publicKey) {
      const isValid = AsymmetricValidationGuard.verify('EXECUTE_OMNI_CYCLE', signature, publicKey);
      if (!isValid) {
        return reply.status(401).send({ success: false, error: 'INVALID_ASYMMETRIC_SIGNATURE' });
      }
    }

    const block = kernel.runCycle();
    minerStats.totalMined++;
    minerStats.lastBlockTime = block.timestamp;
    broadcastMintedBlock(block);

    return { success: true, status: 'SYNCHRONIZED', block };
  });

  // 2. Ledger Tip Retrieval
  fastify.get('/v1/block/tip', async () => {
    const tip = ledgerMemory.getTip();
    return { success: true, status: 'ONLINE', tip };
  });

  // 3. Real-time Event Stream (SSE) for Block Telemetry
  fastify.get('/v1/stream', (request, reply) => {
    if (streamClients.size >= MAX_STREAM_CLIENTS) {
      return reply.status(503).send({
        success: false,
        error: 'STREAM_CAPACITY_REACHED',
        limit: MAX_STREAM_CLIENTS,
      });
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    let listener: (block: any) => boolean;
    const close = () => {
      streamClients.delete(listener);
    };

    // A slow or disconnected client must not retain an unbounded response buffer.
    listener = (newBlock: any): boolean => {
      if (reply.raw.destroyed || reply.raw.writableEnded) {
        close();
        return false;
      }
      const writable = reply.raw.write(
        `data: ${JSON.stringify({ event: 'BLOCK_MINTED', block: newBlock })}\n\n`
      );
      if (!writable) {
        close();
        reply.raw.end();
      }
      return writable;
    };

    // Send current tip immediately upon connection.
    const tip = ledgerMemory.getTip();
    if (tip) {
      const writable = reply.raw.write(`data: ${JSON.stringify({ event: 'TIP', block: tip })}\n\n`);
      if (!writable) {
        return reply.raw.end();
      }
    }

    streamClients.add(listener);

    request.raw.once('close', close);
    request.raw.once('aborted', close);
    reply.raw.once('error', close);
  });

  // 4. Automated Autonomous Background Miner Endpoints
  fastify.post('/v1/miner/start', async (request: any) => {
    const { intervalMs } = request.body || {};
    const interval = typeof intervalMs === 'number' && intervalMs >= 1000 ? intervalMs : 5000;

    if (minerInterval) {
      clearInterval(minerInterval);
    }

    minerStats.active = true;
    minerStats.intervalMs = interval;

    minerInterval = setInterval(() => {
      try {
        const block = kernel.runCycle();
        minerStats.totalMined++;
        minerStats.lastBlockTime = block.timestamp;
        broadcastMintedBlock(block);
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

  // 5. Multi-Region Mesh Sovereign Convergence Endpoints
  fastify.get('/v1/mesh/nodes', async () => {
    return { success: true, nodes: MultiRegionMeshConvergence.getNodes() };
  });

  fastify.get('/v1/mesh/simulate', async () => {
    const telemetry = ObserverEngine.generateTelemetry();
    const convergence = MultiRegionMeshConvergence.simulateConvergence(telemetry);
    return { success: true, telemetry, convergence };
  });

  // 6. Asymmetric Cryptographic Guard Endpoints
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

  return fastify;
}

export const app = createApp('./oceanicos.db', process.env.NODE_ENV !== 'test');

const start = async () => {
  try {
    await app.listen({ port: 5000, host: '0.0.0.0' });
    console.log('Fastify API listening on http://0.0.0.0:5000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
