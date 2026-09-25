const baseUrl = (process.env.OMEGA_STAGING_URL || 'http://127.0.0.1:5181').replace(/\/$/, '');

async function request(path, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
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
const registered = await request('/v1/omega/workers/register', 'POST', { workerId: `staging-worker-${suffix}`, capabilities: ['TEST'] });
const workerId = registered.worker.workerId;
const lease = await request(`/v1/omega/workers/${workerId}/lease`, 'POST', { commandId, capability: 'TEST', durationMs: 5000 });
if (!lease.lease.leaseId) throw new Error('lease was not issued');
await request(`/v1/omega/workers/${workerId}/lease/${lease.lease.leaseId}/release`, 'POST');
const events = await request(`/v1/omega/events?commandId=${commandId}`);
if (events.events.length < 1) throw new Error('durable event log was empty');
console.log(JSON.stringify({ ok: true, commandId, status: proposal.command.status, workerId, eventCount: events.events.length, coordination: 'sqlite-transaction' }));
