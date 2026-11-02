const baseUrl = (process.env.OMEGA_STAGING_URL || 'http://127.0.0.1:5181').replace(/\/$/, '');
const readToken = process.env.OMEGA_STAGING_READ_TOKEN?.trim();
const adminToken = process.env.OMEGA_STAGING_ADMIN_TOKEN?.trim();

async function request(path, method = 'GET', body) {
  const token = method === 'GET' ? readToken : adminToken;
  const headers = {
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${payload.error || 'unknown error'}`);
  return payload;
}

const suffix = Date.now().toString(36);
const proposal = await request('/v1/omega/commands', 'POST', {
  intent: 'staging durable coordination smoke test',
  requestedBy: 'staging-smoke',
  workers: ['planner', 'tester'],
  idempotencyKey: `staging-${suffix}`,
});
if (proposal.command.status !== 'REVIEW') throw new Error(`expected REVIEW, got ${proposal.command.status}`);
const commandId = proposal.command.commandId;
const inspected = await request(`/v1/omega/commands/${commandId}`);
if (inspected.command.commandId !== commandId) throw new Error('command was not durable');
const body = await request('/v1/ecosystem/body');
if (body.bodyVersion !== 'omega.fullstack.body.v1') throw new Error(`unexpected body version: ${body.bodyVersion}`);
if (body.expansion?.bounded !== true || body.expansion?.readOnly !== true) {
  throw new Error('ecosystem body did not report bounded read-only expansion invariants');
}
const registered = await request('/v1/omega/workers/register', 'POST', { workerId: `staging-worker-${suffix}`, capabilities: ['TEST'] });
const workerId = registered.worker.workerId;
const lease = await request(`/v1/omega/workers/${workerId}/lease`, 'POST', { commandId, capability: 'TEST', durationMs: 5000 });
if (!lease.lease.leaseId) throw new Error('lease was not issued');
await request(`/v1/omega/workers/${workerId}/lease/${lease.lease.leaseId}/release`, 'POST');
const events = await request(`/v1/omega/events?commandId=${commandId}`);
if (events.events.length < 1) throw new Error('durable event log was empty');
console.log(JSON.stringify({
  ok: true,
  commandId,
  status: proposal.command.status,
  workerId,
  eventCount: events.events.length,
  bodyVersion: body.bodyVersion,
  bodyStatus: body.status,
  authorization: { readTokenConfigured: Boolean(readToken), adminTokenConfigured: Boolean(adminToken) },
  coordination: 'sqlite-transaction',
  evidenceBoundary: 'staging observation only; no deployment, custody, or production-health claim',
}));
