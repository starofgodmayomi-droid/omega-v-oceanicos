export type ApiRouteMethod = 'GET' | 'POST';

/**
 * Public HTTP contract for the API runtime.
 *
 * This inventory is intentionally independent from Fastify registration. A
 * supported module must either register every route listed here or be removed
 * from the contract and its tests/docs in the same change.
 */
export const API_ROUTE_INVENTORY = [
  'GET /health',
  'GET /v1/kernel/capabilities',
  'GET /v1/mood',
  'POST /v1/mood/pipeline',
  'POST /v1/attest',
  'POST /v1/cycle',
  'POST /v1/pipeline',
  'GET /v1/block/tip',
  'GET /v1/stream',
  'POST /v1/miner/start',
  'POST /v1/miner/stop',
  'GET /v1/miner/status',
  'GET /v1/mesh/nodes',
  'GET /v1/mesh/simulate',
  'POST /v1/auth/keypair',
  'POST /v1/block/sign',
  'POST /v1/block/verify-signature',
  'GET /persistence/status',
  'POST /persistence/acknowledge',
  'POST /persistence/reencrypt',
  'GET /jobs',
  'POST /jobs',
  'GET /jobs/:jobId',
  'POST /jobs/:jobId/claim',
  'POST /jobs/:jobId/complete',
  'POST /jobs/:jobId/fail',
  'GET /attest/revocations',
  'POST /attest/revoke',
  'GET /attest/policy',
  'GET /v1/continuum',
  'GET /v1/lucid/phases',
  'POST /v1/lucid/loop',
  'GET /v1/pluralism/face',
  'POST /v1/pluralism/converge',
  'GET /v1/pluralism/tensor',
  'POST /v1/pluralism/tensor/meaning',
  'POST /v1/pluralism/tensor/evaluate',
  'GET /v1/pluralism/matrix',
  'POST /v1/pluralism/matrix/lambda',
  'POST /v1/pluralism/matrix/transition',
  'GET /v1/pluralism/matrix/continuum-compression',
  'POST /v1/pluralism/matrix/continuum-compression',
  'GET /v1/verification/contract',
  'POST /v1/verification/contract',
  'GET /v1/verification/max-equation',
  'POST /v1/verification/optimize-slice',
  'POST /v1/verification/convergence',
  'POST /v1/verification/step',
  'GET /v1/ecosystem/body',
  'GET /v1/notion/surfaces',
  'GET /',
  'GET /assets/*',
] as const;

export type ApiRouteContract = (typeof API_ROUTE_INVENTORY)[number];
