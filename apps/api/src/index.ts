import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel } from '@oceanicos/mini';
import { HiggsfieldBridgeEngine } from '@oceanicos/generative';
import { OceanicosWaterKernel } from '@oceanicos/mood';
import { exec } from 'node:child_process';

export const fastify = Fastify({ logger: true });
const ledgerMemory = new RememberEngine(process.env.LEDGER_PATH ?? './data/oceanicos.jsonl');
const kernel = new MiniKernel(ledgerMemory);

fastify.register(cors, { origin: '*' });

fastify.post<{ Body: { io?: string } }>('/v1/cycle', async (request, reply) => {
  try {
    return { success: true, block: kernel.runCycle(request.body?.io ?? 'EXEC') };
  } catch (error) {
    if (error instanceof Error && error.message === 'ATTESTATION_SIGNING_KEY_REQUIRED_OR_INVALID') {
      return reply.code(503).send({ success: false, error: 'ATTESTATION_SIGNING_KEY_REQUIRED' });
    }
    return reply.code(500).send({ success: false, error: 'INTERNAL_SERVER_ERROR' });
  }
});

fastify.get('/v1/block/history', async () => ({ success: true, history: ledgerMemory.getHistory() }));
fastify.get('/v1/block/tip', async () => ({ success: true, tip: ledgerMemory.getTip() }));

fastify.get('/v1/oceanicos/stream/max', async (request, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  const interval = setInterval(() => {
    const currentBlock = kernel.runCycle('STREAM_HEARTBEAT');
    const activeCurrent = OceanicosWaterKernel.reflectMood('STREAM_MAX_FLUID');
    reply.raw.write(
      `data: ${JSON.stringify({
        block: currentBlock,
        mood: activeCurrent,
        axiom: 'FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH AND THE LOWER LOW. ZERO COATING.',
      })}\n\n`
    );
  }, 1000);
  request.raw.on('close', () => clearInterval(interval));
});

fastify.post('/v1/higgsfield/generate', async (request: any) => {
  const meta = await HiggsfieldBridgeEngine.executeTextToImage(request.body?.prompt);
  return { success: true, assetMeta: meta };
});

fastify.post('/v1/artemis/action', async (request: any) => {
  return new Promise((resolve) => {
    exec(
      `uv run artemis run "${request.body.command}" --profile ${request.body.profile || 'flash'}`,
      (err, stdout, stderr) => {
        resolve({ success: !err, traceLog: stdout || stderr });
      }
    );
  });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  fastify.listen({ port: Number(process.env.PORT ?? 5000), host: '0.0.0.0' }).catch(() => process.exit(1));
}
