import assert from 'node:assert/strict';
import { test } from 'node:test';
import OceanicosWorkerPool from '../../packages/worker/src/index.ts';

test('worker lifecycle remains fail-closed and capacity accounting is bounded', async (t) => {
  await t.test('does not allow completion after lease expiry and requeues the job', async () => {
    const pool = new OceanicosWorkerPool('worker-test-key');
    const job = pool.submitJob({
      name: 'expiry-boundary',
      requiredCapability: 'COMPILE',
      payload: { fixture: 'expiry' },
      maxRetries: 2,
    });

    assert.ok(pool.leaseJob('worker-node-primary-01', 1));
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.throws(
      () => pool.completeJob(job.jobId, 'worker-node-primary-01', { ok: true }),
      /lease has expired/,
    );

    const reassigned = pool.leaseJob('worker-node-edge-02');
    assert.equal(reassigned?.jobId, job.jobId);
    assert.equal(reassigned?.status, 'LEASED');
    assert.equal(pool.getWorkers().find((worker) => worker.workerId === 'worker-node-primary-01')?.activeJobs, 0);
  });

  await t.test('retries become leaseable and terminal jobs cannot be mutated', () => {
    const pool = new OceanicosWorkerPool('worker-test-key');
    const job = pool.submitJob({
      name: 'retry-boundary',
      requiredCapability: 'VERIFY',
      payload: { fixture: 'retry' },
      maxRetries: 2,
    });

    assert.ok(pool.leaseJob('worker-node-primary-01'));
    assert.equal(pool.failJob(job.jobId, 'worker-node-primary-01', 'TRANSIENT').status, 'RETRYING');
    assert.ok(pool.leaseJob('worker-node-edge-02'));
    const completed = pool.completeJob(job.jobId, 'worker-node-edge-02', { ok: true }).job;
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.assignedWorkerId, undefined);
    assert.equal(completed.leaseExpiresAt, undefined);
    assert.throws(() => pool.completeJob(job.jobId, 'worker-node-edge-02', { ok: true }), /is not active/);
    assert.throws(() => pool.failJob(job.jobId, 'worker-node-edge-02', 'LATE'), /is not active/);
  });

  await t.test('clears ownership when a retry budget is exhausted', () => {
    const pool = new OceanicosWorkerPool('worker-test-key');
    const job = pool.submitJob({
      name: 'terminal-failure-boundary',
      requiredCapability: 'VERIFY',
      payload: { fixture: 'terminal-failure' },
      maxRetries: 1,
    });

    assert.ok(pool.leaseJob('worker-node-primary-01'));
    const failed = pool.failJob(job.jobId, 'worker-node-primary-01', 'PERMANENT');
    assert.equal(failed.status, 'FAILED');
    assert.equal(failed.assignedWorkerId, undefined);
    assert.equal(failed.leaseExpiresAt, undefined);
  });

  await t.test('reports reproducibility drift instead of a hard-coded healthy metric', () => {
    const pool = new OceanicosWorkerPool('worker-test-key');
    const first = pool.submitJob({ name: 'repro-a', requiredCapability: 'COMPILE', payload: { build: 'a' } });
    assert.ok(pool.leaseJob('worker-node-primary-01'));
    pool.completeJob(first.jobId, 'worker-node-primary-01', { binary: 'a' }, [
      { name: 'a.bin', path: 'dist/a.bin', contentHash: 'hash-a', sizeBytes: 1, mimeType: 'application/octet-stream' },
    ]);
    const second = pool.submitJob({ name: 'repro-b', requiredCapability: 'COMPILE', payload: { build: 'b' } });
    assert.ok(pool.leaseJob('worker-node-primary-01'));
    pool.completeJob(second.jobId, 'worker-node-primary-01', { binary: 'b' }, [
      { name: 'b.bin', path: 'dist/b.bin', contentHash: 'hash-b', sizeBytes: 1, mimeType: 'application/octet-stream' },
    ]);
    assert.equal(pool.getStats().reproducibilityRate, 0);
  });

  await t.test('refuses default secret and denies unauthorized or expired leases', () => {
    assert.throws(() => new OceanicosWorkerPool('omega-v-builder-secret-key'), /default signing secret is forbidden/);
    const pool = new OceanicosWorkerPool('worker-test-key');
    pool.registerWorker({
      workerId: 'worker-no-auth',
      name: 'no-auth',
      capabilities: ['COMPILE'],
    });
    pool.submitJob({ name: 'no-auth-job', requiredCapability: 'COMPILE', payload: { x: 1 } });
    assert.equal(pool.leaseJob('worker-no-auth'), null);
    pool.registerWorker({
      workerId: 'worker-expired-auth',
      name: 'expired',
      capabilities: ['COMPILE'],
      authoritySubject: 'did:omega:test:expired',
      policyId: 'omega.worker.v1.seed',
      expiresAt: '2000-01-01T00:00:00.000Z',
    });
    pool.submitJob({ name: 'expired-job', requiredCapability: 'COMPILE', payload: { x: 2 } });
    assert.equal(pool.leaseJob('worker-expired-auth'), null);
  });

  await t.test('rejects malformed scheduling inputs before they enter worker state', () => {
    const pool = new OceanicosWorkerPool('worker-test-key');
    assert.throws(
      () => pool.registerWorker({ workerId: ' ', name: 'invalid', capabilities: ['COMPILE'] }),
      /workerId must be a non-empty string/,
    );
    assert.throws(
      () => pool.registerWorker({ workerId: 'invalid', name: 'invalid', capabilities: [], maxConcurrency: 1 }),
      /at least one capability/,
    );
    assert.throws(
      () => pool.registerWorker({ workerId: 'invalid', name: 'invalid', capabilities: ['COMPILE'], maxConcurrency: 0 }),
      /maxConcurrency must be an integer between 1 and 64/,
    );
    assert.throws(
      () => pool.submitJob({ name: 'invalid', requiredCapability: 'COMPILE', payload: {}, priority: 11 }),
      /priority must be an integer between 1 and 10/,
    );
    assert.throws(
      () => pool.submitJob({ name: 'invalid', requiredCapability: 'COMPILE', payload: {}, maxRetries: -1 }),
      /maxRetries must be an integer between 0 and 10/,
    );
    assert.throws(() => pool.leaseJob('worker-node-primary-01', 0), /leaseDurationMs must be an integer between 1/);
    assert.equal(pool.getJobs().length, 0);
  });
});
