import { createApp } from '../apps/api/dist/index.js';

process.env.OMEGA_AUTH_MODE = 'required';
process.env.OMEGA_READ_TOKEN = 'probe-read-token';
process.env.OMEGA_ADMIN_TOKEN = 'probe-admin-token';
const app = createApp(':memory:', false, { allowUnsignedCycle: true, attestationSigningKey: 'probe-attestation-key-2026-strong' });
await app.ready();
const checks = [];
for (const [name, request, expected] of [
  ['health-open', { method: 'GET', url: '/health' }, 200],
  ['tip-without-token', { method: 'GET', url: '/v1/block/tip' }, 401],
  ['tip-with-read-token', { method: 'GET', url: '/v1/block/tip', headers: { authorization: 'Bearer probe-read-token' } }, 200],
  ['cycle-with-read-token', { method: 'POST', url: '/v1/cycle', payload: {} , headers: { authorization: 'Bearer probe-read-token' } }, 401],
  ['cycle-with-admin-token', { method: 'POST', url: '/v1/cycle', payload: {}, headers: { authorization: 'Bearer probe-admin-token' } }, 200],
]) {
  const response = await app.inject(request);
  checks.push({ name, status: response.statusCode, expected });
  if (response.statusCode !== expected) throw new Error(`${name}: expected ${expected}, got ${response.statusCode}: ${response.body}`);
}
console.log(JSON.stringify({ checks }, null, 2));
await app.close();
