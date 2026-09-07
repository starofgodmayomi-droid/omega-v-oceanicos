import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernelCoordinator } from '@oceanicos/mini';

const server = Fastify({ logger: true });
const remember = new RememberEngine('oceanicos.db');
const coordinator = new MiniKernelCoordinator(remember);

server.register(cors, { origin: '*' });

server.post('/v1/cycle', async (_request, reply) => {
  try {
    const block = coordinator.executeCycle();
    return { status: 'SYNCHRONIZED', block };
  } catch (error: any) {
    return reply.status(500).send({ status: 'PANIC', message: error.message });
  }
});

server.get('/v1/block/tip', async (_request, _reply) => {
  return { status: 'ONLINE', tip: remember.getTip() };
});

const start = async () => {
  try {
    await server.listen({ port: 4102, host: '0.0.0.0' });
    console.log('Fastify server gateway listening on http://0.0.0.0:4102');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
