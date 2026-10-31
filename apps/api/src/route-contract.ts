export type ApiRouteMethod = 'GET' | 'POST';

/**
 * Public HTTP contract for the API runtime.
 *
 * This inventory is intentionally independent from Fastify registration. A
 * supported module must either register every route listed here or be removed
 * from the contract and its tests/docs in the same change.
 */
export const API_ROUTE_INVENTORY = [
  'GET /',
  'GET /assets/*',
  'GET /health',
  // Ω∞v evidence kernel
  'GET /v1/kernel/capabilities',
  'GET /v1/mood',
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
  // Reality fixpoint (Ω∞v)
  'GET /v1/reality/state',
  'POST /v1/reality/step',
  'POST /v1/reality/run',
  // Governed command OS
  'GET /v1/omega/workers',
  'POST /v1/omega/workers/register',
  'POST /v1/omega/workers/:workerId/heartbeat',
  'POST /v1/omega/workers/:workerId/lease',
  'POST /v1/omega/workers/:workerId/lease/:leaseId/release',
  'POST /v1/omega/commands',
  'GET /v1/omega/commands/:id',
  'POST /v1/omega/commands/:id/admit',
  'POST /v1/omega/commands/:id/approve',
  'POST /v1/omega/commands/:id/execute',
  'POST /v1/omega/commands/:id/observe',
  'POST /v1/omega/commands/:id/verify-reality',
  'GET /v1/omega/events',
  // Persistence
  'GET /persistence/status',
  'POST /persistence/acknowledge',
  'POST /persistence/reencrypt',
  // Bounded local job ledger
  'GET /jobs',
  'POST /jobs',
  'GET /jobs/:jobId',
  'POST /jobs/:jobId/claim',
  'POST /jobs/:jobId/complete',
  'POST /jobs/:jobId/fail',
  // Attestation
  'GET /attest/revocations',
  'POST /attest/revoke',
  'GET /attest/policy',
] as const;

export type ApiRouteContract = (typeof API_ROUTE_INVENTORY)[number];
