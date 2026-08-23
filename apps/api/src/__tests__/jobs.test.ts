import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  const withStorage = (run: (storagePath: string) => void): void => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-job-ledger-'));
    try {
      run(join(directory, 'ledger.json'));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  };
  it('is disabled by default and does not accept work', () => {
    const ledger = new LocalJobLedger(false);
    expect(ledger.status()).toEqual({
      enabled: false,
      durable: false,
      source: 'memory',
      encryption: 'disabled',
      counts: { queued: 0, running: 0, succeeded: 0, failed: 0, unknown: 0 },
      recentWindow: 40,
    });
    expect(() => ledger.create(input, provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_INVALID' })
    );
  });

  it('creates an auditable queued job and replays idempotently', () => {
    const ledger = new LocalJobLedger(true);
    const created = ledger.create(input, provenance);
    expect(created.job.state).toBe('queued');
    expect(created.event.type).toBe('created');
    expect(created.job.provenance).toEqual(provenance);
    expect(() => ledger.create(input, provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_DUPLICATE' })
    );
    expect(() => ledger.create({ ...input, sourceUri: 'local://fixture/two' }, provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_IDEMPOTENCY_CONFLICT' })
    );
  });

  it('enforces claim ownership and terminal transitions', () => {
    const ledger = new LocalJobLedger(true);
    const created = ledger.create(input, provenance);
    expect(() => ledger.complete(created.job.id, 'worker-a', 'before claim', provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_CLAIM_REQUIRED' })
    );
    const claimed = ledger.claim(created.job.id, 'worker-a', provenance);
    expect(claimed.job.state).toBe('running');
    expect(claimed.job.attempt).toBe(1);
    expect(() => ledger.claim(created.job.id, 'worker-b', provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_NOT_CLAIMABLE' })
    );
    const completed = ledger.complete(created.job.id, 'worker-a', 'synthetic result', provenance);
    expect(completed.job.state).toBe('succeeded');
    expect(() => ledger.fail(created.job.id, 'worker-a', 'late_failure', provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_TERMINAL' })
    );
  });

  it('keeps bounded status and rejects unsafe source or limits', () => {
    const ledger = new LocalJobLedger(true);
    expect(() => ledger.create({ ...input, sourceUri: 'https://example.com' }, provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_INVALID' })
    );
    expect(() => ledger.list(0)).toThrow(LocalJobError);
    expect(() => ledger.list(41)).toThrow(LocalJobError);
    expect(ledger.recentEvents(40)).toHaveLength(0);
  });

  it('persists an encrypted ledger and restores jobs, idempotency, and events', () => {
    withStorage((storagePath) => {
      const first = new LocalJobLedger({
        enabled: true,
        storagePath,
        encryptionKey: 'local-job-test-key',
      });
      const created = first.create(input, provenance);
      expect(first.status()).toMatchObject({
        enabled: true,
        durable: true,
        source: 'file',
        encryption: 'aes-256-gcm',
      });
      expect(readFileSync(storagePath, 'utf8')).not.toContain('local://fixture/one');

      const restored = new LocalJobLedger({
        enabled: true,
        storagePath,
        encryptionKey: 'local-job-test-key',
      });
      expect(restored.get(created.job.id)).toEqual(created.job);
      expect(restored.recentEvents()).toEqual([created.event]);
      expect(() => restored.create(input, provenance)).toThrow(
        expect.objectContaining({ code: 'JOB_DUPLICATE' })
      );
    });
  });

  it('requires paired storage and encryption configuration and rejects tampering', () => {
    expect(
      () => new LocalJobLedger({ enabled: true, storagePath: '/tmp/omega-ledger.json' })
    ).toThrow(/must be configured together/);
    withStorage((storagePath) => {
      const ledger = new LocalJobLedger({
        enabled: true,
        storagePath,
        encryptionKey: 'local-job-test-key',
      });
      ledger.create(input, provenance);
      const envelope = JSON.parse(readFileSync(storagePath, 'utf8')) as { ciphertext: string };
      envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}aa`;
      writeFileSync(storagePath, JSON.stringify(envelope));
      expect(
        () =>
          new LocalJobLedger({
            enabled: true,
            storagePath,
            encryptionKey: 'local-job-test-key',
          })
      ).toThrow(/failed authentication/);
    });
  });
});
