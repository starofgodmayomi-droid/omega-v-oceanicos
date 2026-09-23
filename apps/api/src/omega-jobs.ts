import { randomUUID } from 'node:crypto';
import {
  executeAuthorizedTransition,
  resolveChangeAdmission,
  verifyExecutedReality,
} from '@oceanicos/mini';
import type {
  OmegaCommand,
  OmegaCommandResult,
  OmegaJob,
  OmegaJobMode,
  OmegaJobStatus,
  OmegaJobStep,
  OmegaWorkerId,
} from '@oceanicos/types';
import { validateOmegaCommandInput } from '@oceanicos/types';
import type { FastifyInstance } from 'fastify';
import { OmegaCommandStore } from './omega.js';
import { OmegaDurableStore } from './omega-persistence.js';

type StoredCommand = OmegaCommand & { readonly result?: OmegaCommandResult };

const MAX_JOBS = 128;
const MAX_STEPS = 6;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;

function bodyOf(request: any): Record<string, unknown> {
  return request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {};
}

function jobStatusAfterObservation(steps: readonly OmegaJobStep[]): OmegaJobStatus {
  const classifications = steps.map((step) => step.reality?.classification);
  if (classifications.every((value) => value === 'VERIFIED')) return 'VERIFIED';
  if (classifications.some((value) => value === 'DIVERGENT')) return 'DIVERGENT';
  if (classifications.some((value) => value === 'UNKNOWN')) return 'UNKNOWN';
  if (steps.some((step) => step.status === 'FAILED')) return 'FAILED';
  return 'UNKNOWN';
}

export class OmegaJobStore {
  private readonly durable: OmegaDurableStore;
  private readonly commands: OmegaCommandStore;

  constructor(path = ':memory:', commands?: OmegaCommandStore) {
    this.durable = new OmegaDurableStore(path);
    this.commands = commands ?? new OmegaCommandStore(path);
  }

  close(): void {
    this.durable.close();
    if (!this.commands) return;
  }

  create(input: {
    requestedBy: string;
    intent: string;
    mode: OmegaJobMode;
    steps: readonly { stepId: string; intent: string; worker: OmegaWorkerId }[];
    idempotencyKey: string;
  }): OmegaJob {
    if (this.durable.listJobs().length >= MAX_JOBS) throw new Error('OMEGA_JOB_CAPACITY_REACHED');
    if (!ID.test(input.requestedBy) || !ID.test(input.idempotencyKey)) throw new Error('INVALID_JOB_IDENTIFIER');
    if (input.intent.trim().length < 1 || input.intent.length > 2000) throw new Error('INVALID_JOB_INTENT');
    if (input.steps.length < 1 || input.steps.length > MAX_STEPS) throw new Error('INVALID_JOB_STEP_COUNT');

    const jobId = `job-${input.idempotencyKey}`;
    const existing = this.durable.getJob(jobId) as OmegaJob | undefined;
    if (existing) return existing;

    const seen = new Set<string>();
    const steps: OmegaJobStep[] = [];
    for (const step of input.steps) {
      if (!ID.test(step.stepId) || seen.has(step.stepId)) throw new Error('INVALID_JOB_STEP_ID');
      seen.add(step.stepId);
      validateOmegaCommandInput({
        intent: step.intent,
        requestedBy: input.requestedBy,
        workers: [step.worker],
        idempotencyKey: `${input.idempotencyKey}-${step.stepId}`,
      });
      const command = this.commands.create({
        intent: step.intent,
        requestedBy: input.requestedBy,
        workers: [step.worker],
        idempotencyKey: `${input.idempotencyKey}-${step.stepId}`,
        context: { jobId, stepId: step.stepId },
      });
      steps.push({
        stepId: step.stepId,
        intent: step.intent,
        worker: step.worker,
        commandId: command.commandId,
        status: command.status,
      });
    }

    const now = new Date().toISOString();
    const job: OmegaJob = {
      version: 'omega.job.v1',
      jobId,
      requestedBy: input.requestedBy,
      intent: input.intent,
      mode: input.mode,
      status: 'REVIEW',
      createdAt: now,
      updatedAt: now,
      approvedBy: null,
      steps,
      limitations: [
        'execution is bounded to the existing local Omega command executor',
        'parallel mode coordinates independent local commands; it is not distributed execution',
        'external mutation remains disabled unless a separately authorized capability exists',
        'reality verification requires attributable observed state for every executed step',
      ],
      redacted: true,
    };
    this.durable.putJob(job);
    this.record(job, 'job.proposed', 'Multi-job proposal created; no step has executed');
    return job;
  }

  get(jobId: string): OmegaJob | undefined {
    return this.durable.getJob(jobId) as OmegaJob | undefined;
  }

  list(): readonly OmegaJob[] {
    return this.durable.listJobs() as OmegaJob[];
  }

  events(jobId: string): readonly Record<string, unknown>[] {
    return this.durable.listJobEvents(jobId);
  }

  approve(jobId: string, operator: string): OmegaJob {
    const job = this.require(jobId);
    if (job.status !== 'REVIEW') throw new Error('OMEGA_JOB_APPROVAL_REQUIRES_REVIEW');
    if (!ID.test(operator)) throw new Error('INVALID_JOB_OPERATOR');

    const approvedSteps: OmegaJobStep[] = [];
    for (const step of job.steps) {
      const command = this.commands.get(step.commandId) as StoredCommand | undefined;
      if (!command || command.status !== 'REVIEW') throw new Error('OMEGA_JOB_STEP_NOT_REVIEWABLE');
      const admitted = resolveChangeAdmission(
        { ...command.change, authority: `human:${operator}`, policy: 'human-review' },
        { authorityVerified: true, policySatisfied: true },
      );
      if (admitted.decision !== 'ALLOW') throw new Error('OMEGA_JOB_STEP_NOT_AUTHORIZED');
      const updated = this.commands.update(command, { change: admitted, status: 'AUTHORIZED' });
      this.commands.record('command.approved', updated, { operator, jobId, stepId: step.stepId });
      approvedSteps.push({ ...step, status: 'AUTHORIZED' });
    }

    const updatedJob: OmegaJob = {
      ...job,
      status: 'AUTHORIZED',
      approvedBy: operator,
      updatedAt: new Date().toISOString(),
      steps: approvedSteps,
    };
    this.durable.putJob(updatedJob);
    this.record(updatedJob, 'job.approved', `All ${approvedSteps.length} steps authorized by human operator`);
    return updatedJob;
  }

  async execute(jobId: string): Promise<OmegaJob> {
    const job = this.require(jobId);
    if (job.status !== 'AUTHORIZED') throw new Error('OMEGA_JOB_EXECUTION_REQUIRES_AUTHORIZATION');

    let running: OmegaJob = { ...job, status: 'RUNNING', updatedAt: new Date().toISOString() };
    this.durable.putJob(running);
    this.record(running, 'job.started', `Executing ${running.steps.length} bounded steps in ${running.mode} mode`);

    const executeStep = (step: OmegaJobStep): OmegaJobStep => {
      const command = this.commands.get(step.commandId) as StoredCommand | undefined;
      if (!command || command.status !== 'AUTHORIZED') throw new Error(`OMEGA_JOB_STEP_NOT_AUTHORIZED:${step.stepId}`);
      const execution = executeAuthorizedTransition(command.change, () => ({
        stateAfter: `bounded-local-job-step:${step.stepId}:complete`,
        consequence: 'bounded local job step recorded; no remote mutation performed',
      }));
      if (execution.status !== 'EXECUTED' || !execution.attestationId) throw new Error(`OMEGA_JOB_STEP_EXECUTION_FAILED:${step.stepId}`);
      const updated = this.commands.update(command, {
        change: execution.record,
        status: 'EXECUTED',
        result: {
          command,
          status: 'EXECUTED',
          execution: {
            stateAfter: execution.record.stateAfter ?? '',
            consequence: execution.record.consequence ?? '',
            attestationId: execution.attestationId,
          },
          nextAction: 'observe and verify the result',
        },
      });
      this.commands.record('command.executed', updated, { jobId, stepId: step.stepId });
      return {
        ...step,
        status: 'EXECUTED',
        execution: {
          stateAfter: execution.record.stateAfter ?? '',
          consequence: execution.record.consequence ?? '',
          attestationId: execution.attestationId,
        },
      };
    };

    try {
      const steps = running.mode === 'parallel'
        ? await Promise.all(running.steps.map(async (step) => executeStep(step)))
        : running.steps.map(executeStep);
      running = {
        ...running,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString(),
        steps,
      };
      this.durable.putJob(running);
      this.record(running, 'job.completed', 'All authorized steps executed; reality remains unverified');
      return running;
    } catch (error) {
      const failed: OmegaJob = {
        ...running,
        status: 'FAILED',
        updatedAt: new Date().toISOString(),
      };
      this.durable.putJob(failed);
      this.record(failed, 'job.failed', error instanceof Error ? error.message : 'bounded job execution failed');
      return failed;
    }
  }

  observe(jobId: string, observations: readonly { stepId: string; observedState: string }[]): OmegaJob {
    const job = this.require(jobId);
    if (job.status !== 'COMPLETED' && job.status !== 'PARTIAL') throw new Error('OMEGA_JOB_OBSERVATION_REQUIRES_EXECUTION');
    if (observations.length !== job.steps.length) throw new Error('OMEGA_JOB_REQUIRES_ONE_OBSERVATION_PER_STEP');

    const observedByStep = new Map(observations.map((item) => [item.stepId, item.observedState]));
    const nextSteps: OmegaJobStep[] = job.steps.map((step) => {
      const observedState = observedByStep.get(step.stepId);
      if (!observedState || observedState.length > 512) throw new Error(`INVALID_OBSERVED_STATE:${step.stepId}`);
      const command = this.commands.get(step.commandId) as StoredCommand | undefined;
      if (!command || command.status !== 'EXECUTED') throw new Error(`OMEGA_JOB_STEP_NOT_EXECUTED:${step.stepId}`);
      const execution = {
        status: 'EXECUTED' as const,
        record: command.change,
        attestationId: command.change.attestationId,
      };
      const verification = verifyExecutedReality(execution, () => observedState);
      const classification = verification.status === 'VERIFIED' ? 'VERIFIED' : verification.status === 'DIVERGENT' ? 'DIVERGENT' : 'UNKNOWN';
      const status = classification === 'VERIFIED' ? 'VERIFIED' : classification === 'DIVERGENT' ? 'DIVERGENT' : 'UNKNOWN';
      const reality = {
        observedState,
        evidence: verification.evidence,
        classification,
        observedAt: new Date().toISOString(),
      };
      const updated = this.commands.update(command, {
        change: verification.record,
        status,
        result: {
          command,
          status,
          execution: command.result?.execution,
          reality: {
            kind: 'execution-result',
            observedState,
            evidence: verification.evidence,
            observedAt: reality.observedAt,
            classification,
          },
          nextAction: classification === 'VERIFIED' ? 'record what was learned and select the next bounded change' : 'review divergence before selecting the next change',
        },
      });
      this.commands.record('command.reality-observed', updated, { jobId, stepId: step.stepId, classification });
      return { ...step, status, reality };
    });

    const updatedJob: OmegaJob = {
      ...job,
      status: jobStatusAfterObservation(nextSteps),
      updatedAt: new Date().toISOString(),
      steps: nextSteps,
    };
    this.durable.putJob(updatedJob);
    this.record(updatedJob, 'job.observed', `Observed and reconciled ${nextSteps.length} job steps`);
    return updatedJob;
  }

  private require(jobId: string): OmegaJob {
    const job = this.get(jobId);
    if (!job) throw new Error('OMEGA_JOB_NOT_FOUND');
    return job;
  }

  private record(job: OmegaJob, type: 'job.proposed' | 'job.approved' | 'job.started' | 'job.completed' | 'job.observed' | 'job.failed', detail: string): void {
    this.durable.appendJobEvent({
      jobId: job.jobId,
      type,
      status: job.status,
      at: new Date().toISOString(),
      detail,
    });
  }
}

export function registerOmegaJobRoutes(
  fastify: FastifyInstance,
  store: OmegaJobStore,
): void {
  fastify.get('/v1/omega/jobs', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async () => ({
    success: true,
    jobs: store.list(),
    count: store.list().length,
  }));

  fastify.post('/v1/omega/jobs', async (request, reply) => {
    const body = bodyOf(request);
    try {
      if (body.mode !== 'sequential' && body.mode !== 'parallel') throw new Error('mode must be sequential or parallel');
      if (!Array.isArray(body.steps)) throw new Error('steps must be an array');
      const steps = body.steps.map((step: any) => ({
        stepId: String(step?.stepId ?? ''),
        intent: String(step?.intent ?? ''),
        worker: step?.worker as OmegaWorkerId,
      }));
      const job = store.create({
        requestedBy: String(body.requestedBy ?? ''),
        intent: String(body.intent ?? ''),
        mode: body.mode as OmegaJobMode,
        steps,
        idempotencyKey: String(body.idempotencyKey ?? ''),
      });
      return reply.status(201).send({ success: true, job, nextAction: 'obtain attributable human approval before execution' });
    } catch (error) {
      return reply.status(400).send({ success: false, error: error instanceof Error ? error.message : 'INVALID_OMEGA_JOB' });
    }
  });

  fastify.get('/v1/omega/jobs/:id', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const job = store.get((request.params as { id?: string }).id ?? '');
    if (!job) return reply.status(404).send({ success: false, error: 'OMEGA_JOB_NOT_FOUND' });
    return { success: true, job, events: store.events(job.jobId) };
  });

  fastify.post('/v1/omega/jobs/:id/approve', async (request, reply) => {
    try {
      const operator = String(bodyOf(request).operator ?? '');
      return { success: true, job: store.approve((request.params as { id?: string }).id ?? '', operator), nextAction: 'execute the authorized bounded job' };
    } catch (error) {
      return reply.status(409).send({ success: false, error: error instanceof Error ? error.message : 'OMEGA_JOB_APPROVAL_FAILED' });
    }
  });

  fastify.post('/v1/omega/jobs/:id/execute', async (request, reply) => {
    try {
      const job = await store.execute((request.params as { id?: string }).id ?? '');
      return { success: job.status !== 'FAILED', job, nextAction: job.status === 'COMPLETED' ? 'provide observed state for every step' : 'inspect failed job evidence' };
    } catch (error) {
      return reply.status(409).send({ success: false, error: error instanceof Error ? error.message : 'OMEGA_JOB_EXECUTION_FAILED' });
    }
  });

  fastify.post('/v1/omega/jobs/:id/observe', async (request, reply) => {
    try {
      const body = bodyOf(request);
      if (!Array.isArray(body.observations)) throw new Error('observations must be an array');
      return { success: true, job: store.observe((request.params as { id?: string }).id ?? '', body.observations as { stepId: string; observedState: string }[]), nextAction: 'record learning and choose the next bounded transition' };
    } catch (error) {
      return reply.status(409).send({ success: false, error: error instanceof Error ? error.message : 'OMEGA_JOB_OBSERVATION_FAILED' });
    }
  });
}
