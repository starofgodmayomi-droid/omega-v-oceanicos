import { LocalJobError, LocalJobLedger } from '../jobs';

const provenance = {
  source: 'api' as const,
  actor: 'operator-a',
  requestId: 'req-job-test',
  correlationId: 'corr-job-test',
  observedAt: '2026-08-20T00:00:00.000Z',
  schemaVersion: '1' as const,
};

const input = {
  kind: 'synthetic-observe' as const,
  idempotencyKey: 'job-key-1',
  sourceUri: 'local://fixture/one',
  actor: 'operator-a',
};

describe('LocalJobLedger', () => {
  it('is disabled by default and does not accept work', () => {
    const ledger = new LocalJobLedger(false);
    expect(ledger.status()).toEqual({
      enabled: false,
      durable: false,
      source: 'memory',
      counts: { queued: 0, running: 0, succeeded: 0, failed: 0, unknown: 0 },
      recentWindow: 40,
    });
    expect(() => ledger.create(input, provenance)).toThrowError(
      expect.objectContaining({ code: 'JOB_INVALID' })
    );
  });

  it('creates an auditable queued job and replays idempotently', () => {
    const ledger = new LocalJobLedger(true);
    const created = ledger.create(input, provenance);
    expect(created.job.state).toBe('queued');
    expect(created.event.type).toBe('created');
    expect(created.job.provenance).toEqual(provenance);
    expect(() => ledger.create(input, provenance)).toThrowError(
      expect.objectContaining({ code: 'JOB_DUPLICATE' })
    );
    expect(() =>
      ledger.create({ ...input, sourceUri: 'local://fixture/two' }, provenance)
    ).toThrowError(expect.objectContaining({ code: 'JOB_IDEMPOTENCY_CONFLICT' }));
  });

  it('enforces claim ownership and terminal transitions', () => {
    const ledger = new LocalJobLedger(true);
    const created = ledger.create(input, provenance);
    expect(() =>
      ledger.complete(created.job.id, 'worker-a', 'before claim', provenance)
    ).toThrowError(expect.objectContaining({ code: 'JOB_CLAIM_REQUIRED' }));
    const claimed = ledger.claim(created.job.id, 'worker-a', provenance);
    expect(claimed.job.state).toBe('running');
    expect(claimed.job.attempt).toBe(1);
    expect(() => ledger.claim(created.job.id, 'worker-b', provenance)).toThrowError(
      expect.objectContaining({ code: 'JOB_NOT_CLAIMABLE' })
    );
    const completed = ledger.complete(created.job.id, 'worker-a', 'synthetic result', provenance);
    expect(completed.job.state).toBe('succeeded');
    expect(() => ledger.fail(created.job.id, 'worker-a', 'late_failure', provenance)).toThrowError(
      expect.objectContaining({ code: 'JOB_TERMINAL' })
    );
  });

  it('keeps bounded status and rejects unsafe source or limits', () => {
    const ledger = new LocalJobLedger(true);
    expect(() =>
      ledger.create({ ...input, sourceUri: 'https://example.com' }, provenance)
    ).toThrowError(expect.objectContaining({ code: 'JOB_INVALID' }));
    expect(() => ledger.list(0)).toThrowError(LocalJobError);
    expect(() => ledger.list(41)).toThrowError(LocalJobError);
    expect(ledger.recentEvents(40)).toHaveLength(0);
  });
});
