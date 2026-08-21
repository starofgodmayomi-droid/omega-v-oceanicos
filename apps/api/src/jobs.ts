import { createHash, randomUUID } from 'node:crypto';
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

export class LocalJobLedger {
  private readonly jobs = new Map<string, LocalJob>();
  private readonly idempotency = new Map<string, { digest: string; jobId: string }>();
  private readonly events: LocalJobEvent[] = [];

  constructor(private readonly enabled = process.env.OMEGA_LOCAL_JOB_LEDGER === 'on') {}

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
    return {
      enabled: this.enabled,
      durable: false,
      source: 'memory',
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
}
