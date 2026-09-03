import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalJobError, LocalJobLedger, LOCAL_JOB_WINDOW } from '../jobs';

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

  const digestFor = (value: unknown): string =>
    `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`;

  const ledgerKey = 'local-job-test-key';

  // Mirrors LocalJobLedger's own encrypted-envelope format so tests can plant a
  // decryptable-but-malformed ledger on disk, the same way a corrupted or
  // partially-written ledger would look to restore().
  const writeEncryptedEnvelope = (storagePath: string, payload: unknown): void => {
    const key = createHash('sha256').update(ledgerKey, 'utf8').digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    writeFileSync(
      storagePath,
      JSON.stringify({
        version: 1,
        algorithm: 'aes-256-gcm',
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
      })
    );
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

  it('rejects a non-integer limit, distinct from an out-of-range integer limit', () => {
    // GET /jobs?limit=... does Number(rawLimit) before calling list(), so a
    // query like ?limit=abc (NaN) or ?limit=2.5 reaches this exact branch --
    // the !Number.isInteger(limit) operand, which list(0)/list(41) above
    // never actually make true.
    const ledger = new LocalJobLedger(true);
    expect(() => ledger.list(Number.NaN)).toThrow(
      expect.objectContaining({
        code: 'JOB_INVALID',
        message: expect.stringContaining('integer'),
      })
    );
    expect(() => ledger.list(2.5)).toThrow(expect.objectContaining({ code: 'JOB_INVALID' }));
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

  it('requires paired storage and encryption configuration in the reverse direction too', () => {
    // The sibling test below only exercises storagePath-set/encryptionKey-omitted.
    // Boolean(storagePath) !== Boolean(encryptionKey) is also true, and must
    // still throw, when it's the encryptionKey that's supplied alone.
    expect(() => new LocalJobLedger({ enabled: true, encryptionKey: 'some-key' })).toThrow(
      /must be configured together/
    );
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

  it('falls back to environment-driven configuration when constructed with no options', () => {
    const priorFlag = process.env.OMEGA_LOCAL_JOB_LEDGER;
    try {
      delete process.env.OMEGA_LOCAL_JOB_LEDGER;
      expect(new LocalJobLedger().isEnabled()).toBe(false);

      process.env.OMEGA_LOCAL_JOB_LEDGER = 'on';
      expect(new LocalJobLedger().isEnabled()).toBe(true);
    } finally {
      if (priorFlag === undefined) delete process.env.OMEGA_LOCAL_JOB_LEDGER;
      else process.env.OMEGA_LOCAL_JOB_LEDGER = priorFlag;
    }
  });

  it('persists via environment-driven storage path and encryption key, not just the enabled flag', () => {
    // Every other persistence test constructs storagePath/encryptionKey as
    // explicit constructor options. This proves the process.env fallback for
    // OMEGA_LOCAL_JOB_LEDGER_PATH / OMEGA_LOCAL_JOB_LEDGER_KEY actually wires
    // up file-backed persistence end-to-end, not just the enabled flag.
    withStorage((storagePath) => {
      const priorFlag = process.env.OMEGA_LOCAL_JOB_LEDGER;
      const priorPath = process.env.OMEGA_LOCAL_JOB_LEDGER_PATH;
      const priorKey = process.env.OMEGA_LOCAL_JOB_LEDGER_KEY;
      try {
        process.env.OMEGA_LOCAL_JOB_LEDGER = 'on';
        process.env.OMEGA_LOCAL_JOB_LEDGER_PATH = storagePath;
        process.env.OMEGA_LOCAL_JOB_LEDGER_KEY = ledgerKey;

        const first = new LocalJobLedger();
        expect(first.status()).toMatchObject({
          enabled: true,
          durable: true,
          source: 'file',
          encryption: 'aes-256-gcm',
        });
        const created = first.create(input, provenance);
        expect(readFileSync(storagePath, 'utf8')).not.toContain('local://fixture/one');

        const restored = new LocalJobLedger();
        expect(restored.status().source).toBe('file');
        expect(restored.get(created.job.id)).toEqual(created.job);
      } finally {
        if (priorFlag === undefined) delete process.env.OMEGA_LOCAL_JOB_LEDGER;
        else process.env.OMEGA_LOCAL_JOB_LEDGER = priorFlag;
        if (priorPath === undefined) delete process.env.OMEGA_LOCAL_JOB_LEDGER_PATH;
        else process.env.OMEGA_LOCAL_JOB_LEDGER_PATH = priorPath;
        if (priorKey === undefined) delete process.env.OMEGA_LOCAL_JOB_LEDGER_KEY;
        else process.env.OMEGA_LOCAL_JOB_LEDGER_KEY = priorKey;
      }
    });
  });

  it('lists the default window of jobs when no limit is supplied', () => {
    const ledger = new LocalJobLedger(true);
    ledger.create(input, provenance);
    const listed = ledger.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].idempotencyKey).toBe(input.idempotencyKey);
  });

  it('filters and orders multiple jobs by state and recency', async () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const ledger = new LocalJobLedger(true);
    const queuedOne = ledger.create(input, provenance);
    await wait(5);
    const queuedTwo = ledger.create({ ...input, idempotencyKey: 'job-key-2' }, provenance);
    await wait(5);
    ledger.claim(queuedTwo.job.id, 'worker-a', provenance);

    const queued = ledger.list(LOCAL_JOB_WINDOW, 'queued');
    expect(queued.map((job) => job.id)).toEqual([queuedOne.job.id]);

    const all = ledger.list(LOCAL_JOB_WINDOW);
    expect(all.map((job) => job.id)).toEqual([queuedTwo.job.id, queuedOne.job.id]);
  });

  it('rejects unbounded mutation inputs and unknown job ids', () => {
    const ledger = new LocalJobLedger(true);
    const created = ledger.create(input, provenance);

    expect(() => ledger.claim('job-does-not-exist', 'worker-a', provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_NOT_FOUND' })
    );
    expect(() => ledger.claim(created.job.id, '', provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_INVALID' })
    );

    ledger.claim(created.job.id, 'worker-a', provenance);
    expect(() => ledger.complete(created.job.id, 'worker-a', '   ', provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_INVALID' })
    );
    expect(() => ledger.complete(created.job.id, 'worker-a', 'x'.repeat(501), provenance)).toThrow(
      expect.objectContaining({ code: 'JOB_INVALID' })
    );

    expect(() =>
      ledger.fail(created.job.id, 'worker-a', 'not a bounded identifier!', provenance)
    ).toThrow(expect.objectContaining({ code: 'JOB_INVALID' }));
    // Mirrors the resultSummary length-boundary case above: errorClass reuses
    // the same 500-char bound via validIdentifier, but only its invalid-character
    // case was previously exercised, never the length boundary itself.
    expect(() => ledger.fail(created.job.id, 'worker-a', 'a'.repeat(501), provenance)).toThrow(
      expect.objectContaining({
        code: 'JOB_INVALID',
        message: expect.stringContaining('errorClass'),
      })
    );
    const failed = ledger.fail(created.job.id, 'worker-a', 'synthetic_failure', provenance);
    expect(failed.job.state).toBe('failed');
    expect(failed.job.errorClass).toBe('synthetic_failure');
  });

  it('treats a duplicate submission as inconsistent once its original event ages out of the window', () => {
    const ledger = new LocalJobLedger(true);
    const first = ledger.create(input, provenance);
    // Push enough subsequent events that the ring buffer evicts job #1's
    // 'created' event while its job record and idempotency entry persist
    // unbounded, reproducing a real read-after-eviction race.
    for (let index = 0; index < LOCAL_JOB_WINDOW; index += 1) {
      ledger.create({ ...input, idempotencyKey: `job-key-fill-${index}` }, provenance);
    }
    expect(
      ledger.recentEvents(LOCAL_JOB_WINDOW).some((event) => event.jobId === first.job.id)
    ).toBe(false);
    expect(ledger.get(first.job.id)).toBeDefined();
    expect(() => ledger.create(input, provenance)).toThrow(
      expect.objectContaining({
        code: 'JOB_INVALID',
        message: expect.stringContaining('event record'),
      })
    );
  });

  it('surfaces an idempotency record with no matching job as an inconsistent restored ledger', () => {
    withStorage((storagePath) => {
      writeEncryptedEnvelope(storagePath, {
        version: 1,
        jobs: [],
        idempotency: { [input.idempotencyKey]: { digest: digestFor(input), jobId: 'ghost-job' } },
        events: [],
      });
      const ledger = new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey });
      expect(() => ledger.create(input, provenance)).toThrow(
        expect.objectContaining({
          code: 'JOB_INVALID',
          message: expect.stringContaining('inconsistent'),
        })
      );
    });
  });

  it('rejects a restored ledger file that is not parseable JSON at all', () => {
    withStorage((storagePath) => {
      writeFileSync(storagePath, '{not valid json');
      expect(
        () => new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey })
      ).toThrow(/storage is unreadable/);
    });
  });

  it('rejects a restored ledger whose authenticated envelope has the wrong shape', () => {
    withStorage((storagePath) => {
      writeFileSync(
        storagePath,
        JSON.stringify({ version: 1, algorithm: 'aes-256-gcm', iv: 'aa==', tag: 'bb==' })
      );
      expect(
        () => new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey })
      ).toThrow(/invalid authenticated envelope/);
    });
  });

  it('rejects a decrypted ledger payload that is not a valid StoredLedger', () => {
    withStorage((storagePath) => {
      writeEncryptedEnvelope(storagePath, {
        version: 1,
        jobs: 'not-an-array',
        idempotency: {},
        events: [],
      });
      expect(
        () => new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey })
      ).toThrow(/invalid payload/);
    });
  });

  it('rejects a decrypted ledger containing a malformed job entry', () => {
    withStorage((storagePath) => {
      writeEncryptedEnvelope(storagePath, {
        version: 1,
        jobs: [{ notAJob: true }],
        idempotency: {},
        events: [],
      });
      expect(
        () => new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey })
      ).toThrow(/invalid job/);
    });
  });

  it('rejects a decrypted ledger containing a malformed idempotency entry', () => {
    withStorage((storagePath) => {
      writeEncryptedEnvelope(storagePath, {
        version: 1,
        jobs: [],
        idempotency: { 'job-key-1': { notADigest: true } },
        events: [],
      });
      expect(
        () => new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey })
      ).toThrow(/invalid idempotency record/);
    });
  });

  it('rejects a decrypted ledger containing a malformed event entry', () => {
    withStorage((storagePath) => {
      writeEncryptedEnvelope(storagePath, {
        version: 1,
        jobs: [],
        idempotency: {},
        events: [{ notAnEvent: true }],
      });
      expect(
        () => new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey })
      ).toThrow(/invalid event/);
    });
  });

  it('restores a job with a corrupted state field without validating it (documents a real gap)', () => {
    // restore()'s job validation (lines 373-378) only checks that job.id and
    // job.idempotencyKey are strings -- unlike the idempotency and event
    // records restored just below, it never checks that `state` is one of
    // the five valid LocalJobState values. status() then does
    // `counts[job.state] += 1` unconditionally, so a corrupted state that
    // still passes the id/idempotencyKey check silently produces a NaN count
    // under a bogus key instead of restore() raising the same kind of
    // "invalid job" error the sibling malformed-record tests assert for.
    withStorage((storagePath) => {
      writeEncryptedEnvelope(storagePath, {
        version: 1,
        jobs: [
          {
            id: 'job-corrupt-state',
            kind: 'synthetic-observe',
            state: 'not-a-real-state',
            idempotencyKey: 'job-key-corrupt',
            payloadDigest: digestFor(input),
            sourceUri: input.sourceUri,
            actor: input.actor,
            workerId: null,
            attempt: 0,
            createdAt: provenance.observedAt,
            updatedAt: provenance.observedAt,
            finishedAt: null,
            resultSummary: null,
            errorClass: null,
            provenance,
          },
        ],
        idempotency: {},
        events: [],
      });
      const ledger = new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey });
      // The corrupted record is accepted into the ledger rather than rejected...
      expect(ledger.get('job-corrupt-state')).toBeDefined();
      const counts = ledger.status().counts as unknown as Record<string, number>;
      // ...the five known states stay untouched by it...
      expect(counts).toMatchObject({ queued: 0, running: 0, succeeded: 0, failed: 0, unknown: 0 });
      // ...but status() silently created a bogus counts key with NaN, instead
      // of restore() catching the malformed state up front the way it does
      // for malformed idempotency and event records.
      expect(counts['not-a-real-state']).toBeNaN();
    });
  });

  it('trims a restored event log back to the retention window', () => {
    withStorage((storagePath) => {
      const events = Array.from({ length: LOCAL_JOB_WINDOW + 5 }, (_, index) => ({
        id: `job-event-${index}`,
        jobId: `job-${index}`,
        type: 'created',
        sequence: index + 1,
        at: provenance.observedAt,
        provenance,
        details: { state: 'queued', message: 'restored fixture' },
      }));
      writeEncryptedEnvelope(storagePath, { version: 1, jobs: [], idempotency: {}, events });
      const ledger = new LocalJobLedger({ enabled: true, storagePath, encryptionKey: ledgerKey });
      expect(ledger.recentEvents(LOCAL_JOB_WINDOW + 5)).toHaveLength(LOCAL_JOB_WINDOW);
    });
  });
});
