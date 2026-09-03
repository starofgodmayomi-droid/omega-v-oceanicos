import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import type {
  LocalJob,
  LocalJobCreateInput,
  LocalJobEvent,
  LocalJobEventType,
  LocalJobLedgerStatus,
  LocalJobMutationResult,
  LocalJobProvenance,
  LocalJobState,
} from '@omega-v/types';

export const LOCAL_JOB_WINDOW = 40;
export const LOCAL_JOB_MAX_IDEMPOTENCY_KEY = 128;
export const LOCAL_JOB_MAX_ACTOR = 96;
export const LOCAL_JOB_MAX_SOURCE_URI = 256;
export const LOCAL_JOB_MAX_RESULT_SUMMARY = 500;

export type LocalJobLedgerOptions = {
  enabled?: boolean;
  storagePath?: string;
  encryptionKey?: string;
};

type StoredLedger = {
  version: 1;
  jobs: LocalJob[];
  idempotency: Record<string, { digest: string; jobId: string }>;
  events: LocalJobEvent[];
};

type LedgerEnvelope = {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
};

export class LocalJobError extends Error {
  constructor(
    public readonly code:
      | 'JOB_INVALID'
      | 'JOB_DUPLICATE'
      | 'JOB_IDEMPOTENCY_CONFLICT'
      | 'JOB_NOT_FOUND'
      | 'JOB_NOT_CLAIMABLE'
      | 'JOB_CLAIM_REQUIRED'
      | 'JOB_TERMINAL',
    message: string
  ) {
    super(message);
    this.name = 'LocalJobError';
  }
}

const digestInput = (input: LocalJobCreateInput): string =>
  `sha256:${createHash('sha256').update(JSON.stringify(input), 'utf8').digest('hex')}`;

const validIdentifier = (value: string, maximum: number): boolean =>
  value.length > 0 && value.length <= maximum && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const validSourceUri = (value: string): boolean =>
  value.length > 0 && value.length <= LOCAL_JOB_MAX_SOURCE_URI && value.startsWith('local://');

const nowIso = (): string => new Date().toISOString();

const deriveEncryptionKey = (raw: string): Buffer =>
  createHash('sha256').update(raw, 'utf8').digest();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class LocalJobLedger {
  private readonly jobs = new Map<string, LocalJob>();
  private readonly idempotency = new Map<string, { digest: string; jobId: string }>();
  private readonly events: LocalJobEvent[] = [];
  private readonly enabled: boolean;
  private readonly storagePath: string | null;
  private readonly encryptionKey: Buffer | null;

  constructor(enabledOrOptions: boolean | LocalJobLedgerOptions = {}) {
    const options =
      typeof enabledOrOptions === 'boolean' ? { enabled: enabledOrOptions } : enabledOrOptions;
    this.enabled = options.enabled ?? process.env.OMEGA_LOCAL_JOB_LEDGER === 'on';
    this.storagePath =
      (options.storagePath ?? process.env.OMEGA_LOCAL_JOB_LEDGER_PATH)?.trim() || null;
    const rawEncryptionKey =
      (options.encryptionKey ?? process.env.OMEGA_LOCAL_JOB_LEDGER_KEY?.trim()) || null;

    if (this.enabled && Boolean(this.storagePath) !== Boolean(rawEncryptionKey)) {
      throw new Error(
        'OMEGA_LOCAL_JOB_LEDGER_PATH and OMEGA_LOCAL_JOB_LEDGER_KEY must be configured together'
      );
    }
    this.encryptionKey = rawEncryptionKey ? deriveEncryptionKey(rawEncryptionKey) : null;
    if (this.enabled && this.storagePath) this.restore();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  status(): LocalJobLedgerStatus {
    const counts: Record<LocalJobState, number> = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      unknown: 0,
    };
    for (const job of this.jobs.values()) counts[job.state] += 1;
    const fileBacked = this.enabled && Boolean(this.storagePath && this.encryptionKey);
    return {
      enabled: this.enabled,
      durable: fileBacked,
      source: fileBacked ? 'file' : 'memory',
      encryption: fileBacked ? 'aes-256-gcm' : 'disabled',
      counts,
      recentWindow: LOCAL_JOB_WINDOW,
    };
  }

  create(input: LocalJobCreateInput, provenance: LocalJobProvenance): LocalJobMutationResult {
    if (!this.enabled) throw new LocalJobError('JOB_INVALID', 'Local job ledger is disabled');
    if (
      input.kind !== 'synthetic-observe' ||
      !validIdentifier(input.idempotencyKey, LOCAL_JOB_MAX_IDEMPOTENCY_KEY) ||
      !validIdentifier(input.actor, LOCAL_JOB_MAX_ACTOR) ||
      !validSourceUri(input.sourceUri)
    ) {
      throw new LocalJobError(
        'JOB_INVALID',
        'kind, idempotencyKey, actor, and a local:// sourceUri are required'
      );
    }
    const payloadDigest = digestInput(input);
    const prior = this.idempotency.get(input.idempotencyKey);
    if (prior) {
      if (prior.digest !== payloadDigest) {
        throw new LocalJobError(
          'JOB_IDEMPOTENCY_CONFLICT',
          'The idempotency key was already used with a different job payload'
        );
      }
      const existing = this.jobs.get(prior.jobId);
      if (!existing)
        throw new LocalJobError('JOB_INVALID', 'The idempotency record is inconsistent');
      const existingEvent = this.events.find((event) => event.jobId === existing.id);
      if (!existingEvent)
        throw new LocalJobError('JOB_INVALID', 'The job event record is inconsistent');
      throw new LocalJobError('JOB_DUPLICATE', existing.id);
    }

    const timestamp = nowIso();
    const job: LocalJob = {
      id: `job-${randomUUID()}`,
      kind: input.kind,
      state: 'queued',
      idempotencyKey: input.idempotencyKey,
      payloadDigest,
      sourceUri: input.sourceUri,
      actor: input.actor,
      workerId: null,
      attempt: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      finishedAt: null,
      resultSummary: null,
      errorClass: null,
      provenance,
    };
    this.jobs.set(job.id, job);
    this.idempotency.set(input.idempotencyKey, { digest: payloadDigest, jobId: job.id });
    const event = this.addEvent(
      job,
      'created',
      provenance,
      'Job accepted into local evidence ledger'
    );
    this.persist();
    return { job, event };
  }

  get(id: string): LocalJob | undefined {
    return this.jobs.get(id);
  }

  list(limit = LOCAL_JOB_WINDOW, state?: LocalJobState): LocalJob[] {
    if (!Number.isInteger(limit) || limit < 1 || limit > LOCAL_JOB_WINDOW) {
      throw new LocalJobError(
        'JOB_INVALID',
        `limit must be an integer between 1 and ${LOCAL_JOB_WINDOW}`
      );
    }
    return [...this.jobs.values()]
      .filter((job) => state === undefined || job.state === state)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit);
  }

  claim(id: string, workerId: string, provenance: LocalJobProvenance): LocalJobMutationResult {
    const job = this.require(id);
    if (!validIdentifier(workerId, LOCAL_JOB_MAX_ACTOR)) {
      throw new LocalJobError('JOB_INVALID', 'A bounded workerId is required');
    }
    if (job.state !== 'queued') throw new LocalJobError('JOB_NOT_CLAIMABLE', 'Job is not queued');
    job.state = 'running';
    job.workerId = workerId;
    job.attempt += 1;
    job.updatedAt = nowIso();
    const event = this.addEvent(job, 'started', provenance, 'Job claimed by local worker');
    this.persist();
    return { job, event };
  }

  complete(
    id: string,
    workerId: string,
    resultSummary: string,
    provenance: LocalJobProvenance
  ): LocalJobMutationResult {
    const job = this.requireMutable(id, workerId);
    if (resultSummary.trim().length === 0 || resultSummary.length > LOCAL_JOB_MAX_RESULT_SUMMARY) {
      throw new LocalJobError(
        'JOB_INVALID',
        `resultSummary must be between 1 and ${LOCAL_JOB_MAX_RESULT_SUMMARY} characters`
      );
    }
    job.state = 'succeeded';
    job.resultSummary = resultSummary.trim();
    job.updatedAt = nowIso();
    job.finishedAt = job.updatedAt;
    const event = this.addEvent(job, 'completed', provenance, 'Job completed by local worker');
    this.persist();
    return { job, event };
  }

  fail(
    id: string,
    workerId: string,
    errorClass: string,
    provenance: LocalJobProvenance
  ): LocalJobMutationResult {
    const job = this.requireMutable(id, workerId);
    if (!validIdentifier(errorClass, LOCAL_JOB_MAX_RESULT_SUMMARY)) {
      throw new LocalJobError('JOB_INVALID', 'errorClass must be a bounded identifier');
    }
    job.state = 'failed';
    job.errorClass = errorClass;
    job.updatedAt = nowIso();
    job.finishedAt = job.updatedAt;
    const event = this.addEvent(job, 'failed', provenance, 'Job failed with a bounded error class');
    this.persist();
    return { job, event };
  }

  recentEvents(limit = LOCAL_JOB_WINDOW): LocalJobEvent[] {
    return this.events.slice(-limit).reverse();
  }

  private require(id: string): LocalJob {
    const job = this.jobs.get(id);
    if (!job) throw new LocalJobError('JOB_NOT_FOUND', 'Job not found');
    return job;
  }

  private requireMutable(id: string, workerId: string): LocalJob {
    const job = this.require(id);
    if (job.state === 'succeeded' || job.state === 'failed') {
      throw new LocalJobError('JOB_TERMINAL', 'Terminal jobs cannot be changed');
    }
    if (job.state !== 'running' || job.workerId !== workerId) {
      throw new LocalJobError('JOB_CLAIM_REQUIRED', 'A matching running worker claim is required');
    }
    return job;
  }

  private addEvent(
    job: LocalJob,
    type: LocalJobEventType,
    provenance: LocalJobProvenance,
    message: string
  ): LocalJobEvent {
    const event: LocalJobEvent = {
      id: `job-event-${randomUUID()}`,
      jobId: job.id,
      type,
      sequence: this.events.length + 1,
      at: nowIso(),
      provenance,
      details: { state: job.state, message },
    };
    this.events.push(event);
    if (this.events.length > LOCAL_JOB_WINDOW)
      this.events.splice(0, this.events.length - LOCAL_JOB_WINDOW);
    return event;
  }

  private persist(): void {
    if (!this.storagePath || !this.encryptionKey) return;
    const payload: StoredLedger = {
      version: 1,
      jobs: [...this.jobs.values()],
      idempotency: Object.fromEntries(this.idempotency),
      events: this.events,
    };
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const envelope: LedgerEnvelope = {
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
    mkdirSync(dirname(this.storagePath), { recursive: true });
    const temporaryPath = `${this.storagePath}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(envelope), { encoding: 'utf8', mode: 0o600 });
    renameSync(temporaryPath, this.storagePath);
  }

  private restore(): void {
    if (!this.storagePath || !this.encryptionKey || !existsSync(this.storagePath)) return;
    let envelope: unknown;
    try {
      envelope = JSON.parse(readFileSync(this.storagePath, 'utf8'));
    } catch (error) {
      throw new Error(`Local job ledger storage is unreadable: ${String(error)}`);
    }
    if (
      !isRecord(envelope) ||
      envelope.version !== 1 ||
      envelope.algorithm !== 'aes-256-gcm' ||
      typeof envelope.iv !== 'string' ||
      typeof envelope.tag !== 'string' ||
      typeof envelope.ciphertext !== 'string'
    ) {
      throw new Error('Local job ledger storage has an invalid authenticated envelope');
    }
    let stored: unknown;
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(envelope.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      stored = JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
          decipher.final(),
        ]).toString('utf8')
      );
    } catch (error) {
      throw new Error(`Local job ledger storage failed authentication: ${String(error)}`);
    }
    if (
      !isRecord(stored) ||
      stored.version !== 1 ||
      !Array.isArray(stored.jobs) ||
      !isRecord(stored.idempotency) ||
      !Array.isArray(stored.events)
    ) {
      throw new Error('Local job ledger storage has an invalid payload');
    }
    for (const job of stored.jobs) {
      if (!isRecord(job) || typeof job.id !== 'string' || typeof job.idempotencyKey !== 'string') {
        throw new Error('Local job ledger storage contains an invalid job');
      }
      this.jobs.set(job.id, job as unknown as LocalJob);
    }
    for (const [key, value] of Object.entries(stored.idempotency)) {
      if (!isRecord(value) || typeof value.digest !== 'string' || typeof value.jobId !== 'string') {
        throw new Error('Local job ledger storage contains an invalid idempotency record');
      }
      this.idempotency.set(key, { digest: value.digest, jobId: value.jobId });
    }
    for (const event of stored.events) {
      if (!isRecord(event) || typeof event.id !== 'string' || typeof event.jobId !== 'string') {
        throw new Error('Local job ledger storage contains an invalid event');
      }
      this.events.push(event as unknown as LocalJobEvent);
    }
    if (this.events.length > LOCAL_JOB_WINDOW) {
      this.events.splice(0, this.events.length - LOCAL_JOB_WINDOW);
    }
  }
}
