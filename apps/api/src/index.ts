import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel } from '@oceanicos/mini';
import { AsymmetricValidationGuard } from '@oceanicos/verification';

const fastify = Fastify({ logger: true });
const ledgerMemory = new RememberEngine('./oceanicos.db');
const kernel = new MiniKernel(ledgerMemory);

fastify.register(cors, { origin: '*' });

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
  return { success: true, status: 'SYNCHRONIZED', block };
});

fastify.get('/v1/block/tip', async () => {
  const tip = ledgerMemory.getTip();
  return { success: true, status: 'ONLINE', tip };
});

// Asymmetric Cryptographic Guard Endpoints
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
