import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel } from '@oceanicos/mini';

const fastify = Fastify({ logger: true });
const ledgerMemory = new RememberEngine('./oceanicos.db');
const kernel = new MiniKernel(ledgerMemory);

fastify.register(cors, { origin: '*' });

fastify.post('/v1/cycle', async () => {
  const block = kernel.runCycle();
  return { success: true, status: 'SYNCHRONIZED', block };
});

fastify.get('/v1/block/tip', async () => {
  const tip = ledgerMemory.getTip();
  return { success: true, status: 'ONLINE', tip };
});

const start = async () => {
  try {
    await fastify.listen({ port: 5000, host: '0.0.0.0' });
    console.log('Fastify API listening on http://0.0.0.0:5000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
