import type { FastifyInstance } from 'fastify';
import {
  buildOmegaCommand,
  executeAuthorizedTransition,
  listOmegaWorkers,
  resolveChangeAdmission,
  verifyExecutedReality,
} from '@oceanicos/mini';
import type { OmegaCommand, OmegaCommandResult, OmegaCommandStatus, OmegaWorkerId } from '@oceanicos/types';
import { decisionToStatus, validateOmegaCommandInput } from '@oceanicos/types';
import { OmegaDurableStore } from './omega-persistence.js';

type StoredCommand = OmegaCommand & {
  readonly result?: OmegaCommandResult;
};

const MAX_COMMANDS = 256;

export class OmegaCommandStore {
  private readonly durable: OmegaDurableStore;

  constructor(path = ':memory:') {
    this.durable = new OmegaDurableStore(path);
  }

  close(): void {
    this.durable.close();
  }

  create(input: Parameters<typeof buildOmegaCommand>[0]): StoredCommand {
    const existing = this.durable.getCommand(`omega-${input.idempotencyKey}`) as StoredCommand | undefined;
    if (existing) return existing;
    const command = buildOmegaCommand(input);
    const stored = { ...command };
    if (this.durable.listEvents().length >= MAX_COMMANDS * 2) throw new Error('OMEGA_COMMAND_CAPACITY_REACHED');
    this.durable.putCommand(stored);
    this.record('command.proposed', stored);
    return stored;
  }

  get(id: string): StoredCommand | undefined { return this.durable.getCommand(id) as StoredCommand | undefined; }

  update(command: StoredCommand, patch: Partial<StoredCommand>): StoredCommand {
    const next = { ...command, ...patch };
    this.durable.putCommand(next);
    return next;
  }

  record(type: string, command: StoredCommand, extra: Record<string, unknown> = {}): void {
    this.durable.appendEvent({ type, commandId: command.commandId, status: command.status, at: new Date().toISOString(), ...extra });
  }

  listEvents(commandId?: string): readonly Record<string, unknown>[] {
    return this.durable.listEvents(commandId);
  }

  listCommands(): readonly StoredCommand[] {
    return this.durable.listCommands() as StoredCommand[];
  }

  registerWorker(input: { workerId: string; capabilities: string[] }) { return this.durable.registerWorker(input); }
  heartbeatWorker(workerId: string) { return this.durable.heartbeatWorker(workerId); }
  listWorkers() { return this.durable.listWorkers(); }
  acquireWorkerLease(workerId: string, commandId: string, capability: string, durationMs?: number) { return this.durable.acquireLease(workerId, commandId, capability, durationMs); }
  releaseWorkerLease(leaseId: string, workerId: string) { return this.durable.releaseLease(leaseId, workerId); }
}

function bodyOf(request: any): Record<string, unknown> {
  return request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : {};
}

function commandResult(command: StoredCommand, nextAction: string): OmegaCommandResult {
  return { command, status: command.status, ...(command.result?.execution ? { execution: command.result.execution } : {}), ...(command.result?.reality ? { reality: command.result.reality } : {}), nextAction };
}

function statusForDecision(decision: 'ALLOW' | 'DENY' | 'REVIEW'): OmegaCommandStatus {
  return decisionToStatus(decision);
}

export function registerOmegaRoutes(fastify: FastifyInstance, store: OmegaCommandStore): void {
  fastify.get('/v1/omega/workers', async () => ({ success: true, workers: listOmegaWorkers(), activeWorkers: store.listWorkers(), limitations: ['coordination is durable on the configured SQLite volume', 'worker output is evidence, not authority', 'cross-host coordination requires a shared filesystem or a future network database'] }));

  fastify.post('/v1/omega/workers/register', async (request, reply) => {
    const body = bodyOf(request);
    if (typeof body.workerId !== 'string' || !Array.isArray(body.capabilities) || body.capabilities.length > 16 || body.capabilities.some((value) => typeof value !== 'string' || value.length > 96)) {
      return reply.status(400).send({ success: false, error: 'INVALID_WORKER_REGISTRATION' });
    }
    return { success: true, worker: store.registerWorker({ workerId: body.workerId, capabilities: body.capabilities as string[] }), coordination: 'sqlite-wal' };
  });

  fastify.post('/v1/omega/workers/:workerId/heartbeat', async (request, reply) => {
    const workerId = (request.params as { workerId?: string }).workerId ?? '';
    const worker = store.heartbeatWorker(workerId);
    if (!worker) return reply.status(404).send({ success: false, error: 'OMEGA_WORKER_NOT_FOUND' });
    return { success: true, worker };
  });

  fastify.post('/v1/omega/workers/:workerId/lease', async (request, reply) => {
    const workerId = (request.params as { workerId?: string }).workerId ?? '';
    const body = bodyOf(request);
    if (typeof body.commandId !== 'string' || typeof body.capability !== 'string') return reply.status(400).send({ success: false, error: 'LEASE_COMMAND_AND_CAPABILITY_REQUIRED' });
    const lease = store.acquireWorkerLease(workerId, body.commandId, body.capability, typeof body.durationMs === 'number' ? Math.min(Math.max(body.durationMs, 1000), 300000) : undefined);
    if (!lease) return reply.status(409).send({ success: false, error: 'OMEGA_WORKER_LEASE_UNAVAILABLE' });
    return { success: true, lease, coordination: 'sqlite-transaction' };
  });

  fastify.post('/v1/omega/workers/:workerId/lease/:leaseId/release', async (request, reply) => {
    const params = request.params as { workerId?: string; leaseId?: string };
    const released = store.releaseWorkerLease(params.leaseId ?? '', params.workerId ?? '');
    if (!released) return reply.status(409).send({ success: false, error: 'OMEGA_WORKER_LEASE_NOT_FOUND' });
    return { success: true, released: true };
  });

  fastify.post('/v1/omega/commands', async (request, reply) => {
    const body = bodyOf(request);
    try {
      validateOmegaCommandInput({ intent: body.intent, requestedBy: body.requestedBy, workers: body.workers, idempotencyKey: body.idempotencyKey, context: body.context });
      const command = store.create({
        intent: body.intent as string,
        requestedBy: body.requestedBy as string,
        workers: body.workers as OmegaWorkerId[],
        idempotencyKey: body.idempotencyKey as string,
        context: (body.context as Record<string, string> | undefined),
      });
      return reply.status(201).send({ success: true, ...commandResult(command, 'admit the command with explicit authority and policy evidence') });
    } catch (error) {
      return reply.status(400).send({ success: false, error: error instanceof Error ? error.message : 'INVALID_OMEGA_COMMAND' });
    }
  });

  fastify.get('/v1/omega/commands', async () => {
    const commands = store.listCommands();
    return {
      success: true,
      count: commands.length,
      commands: commands.map((c) => ({
        commandId: c.commandId,
        intent: c.intent,
        requestedBy: c.requestedBy,
        status: c.status,
        createdAt: c.createdAt,
        workers: c.workers,
        decision: c.change?.decision ?? null,
        authority: c.change?.authority ?? null,
        policy: c.change?.policy ?? null,
        execution: c.result?.execution ?? null,
        reality: c.result?.reality ?? null,
      })),
      redacted: true,
    };
  });

  fastify.get('/v1/omega/commands/:id/provenance', async (request, reply) => {
    const id = (request.params as { id?: string }).id ?? '';
    const command = store.get(id);
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    const events = store.listEvents(id);
    return {
      success: true,
      provenance: {
        commandId: command.commandId,
        intent: command.intent,
        requestedBy: command.requestedBy,
        createdAt: command.createdAt,
        context: command.context,
        workers: command.workers,
        status: command.status,
        ir: command.ir,
        change: command.change,
        execution: command.result?.execution ?? null,
        reality: command.result?.reality ?? null,
        events,
        lineage: events.map((e: any) => ({ type: e.type, at: e.at, status: e.status })),
        redacted: true,
      },
    };
  });

  fastify.get('/v1/omega/commands/:id', async (request, reply) => {
    const id = (request.params as { id?: string }).id ?? '';
    const command = store.get(id);
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    return { success: true, ...commandResult(command, command.status === 'PROPOSED' || command.status === 'REVIEW' ? 'admit or approve the command' : 'observe and verify the result') };
  });

  fastify.post('/v1/omega/commands/:id/admit', async (request, reply) => {
    const command = store.get((request.params as { id?: string }).id ?? '');
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    if (command.status !== 'PROPOSED' && command.status !== 'REVIEW') return reply.status(409).send({ success: false, error: 'OMEGA_COMMAND_STALE' });
    const body = bodyOf(request);
    const authority = typeof body.authority === 'string' ? body.authority : null;
    const policy = typeof body.policy === 'string' ? body.policy : null;
    const admitted = resolveChangeAdmission({ ...command.change, authority, policy }, { authorityVerified: body.authorityVerified === true, policySatisfied: body.policySatisfied === true });
    const status = statusForDecision(admitted.decision);
    const updated = store.update(command, { change: admitted, status });
    store.record('command.admitted', updated, { decision: admitted.decision });
    return { success: true, ...commandResult(updated, status === 'AUTHORIZED' ? 'execute the authorized bounded action' : status === 'DENIED' ? 'review the denial evidence; no execution is permitted' : 'obtain attributable human approval') };
  });

  fastify.post('/v1/omega/commands/:id/approve', async (request, reply) => {
    const command = store.get((request.params as { id?: string }).id ?? '');
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    if (command.status !== 'REVIEW') return reply.status(409).send({ success: false, error: 'OMEGA_APPROVAL_REQUIRES_REVIEW' });
    const body = bodyOf(request);
    const operator = typeof body.operator === 'string' && body.operator.trim() ? body.operator : 'dashboard-operator';
    const policy = typeof body.policy === 'string' && body.policy.trim() ? body.policy : 'human-review';
    const admitted = resolveChangeAdmission({ ...command.change, authority: `human:${operator}`, policy }, { authorityVerified: true, policySatisfied: true });
    const updated = store.update(command, { change: admitted, status: 'AUTHORIZED' });
    store.record('command.approved', updated, { operator });
    return { success: true, ...commandResult(updated, 'execute the authorized bounded action') };
  });

  fastify.post('/v1/omega/commands/:id/execute', async (request, reply) => {
    const command = store.get((request.params as { id?: string }).id ?? '');
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    if (command.status !== 'AUTHORIZED') return reply.status(409).send({ success: false, error: 'OMEGA_EXECUTION_REQUIRES_AUTHORIZATION' });
    const execution = executeAuthorizedTransition(command.change, () => ({ stateAfter: 'bounded-local-action-complete', consequence: 'bounded local action recorded; no remote mutation performed' }));
    const status: OmegaCommandStatus = execution.status === 'EXECUTED' ? 'EXECUTED' : 'FAILED';
    const result = execution.status === 'EXECUTED' && execution.attestationId ? { execution: { stateAfter: execution.record.stateAfter ?? '', consequence: execution.record.consequence ?? '', attestationId: execution.attestationId } } : undefined;
    const updated = store.update(command, { change: execution.record, status, result: result ? { command, status, ...result, nextAction: 'observe and verify the result' } : undefined });
    store.record('command.executed', updated);
    return { success: execution.status === 'EXECUTED', ...commandResult(updated, execution.status === 'EXECUTED' ? 'observe and verify the result' : 'inspect the execution failure') };
  });

  fastify.post('/v1/omega/commands/:id/observe', async (request, reply) => {
    const command = store.get((request.params as { id?: string }).id ?? '');
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    if (command.status !== 'EXECUTED' && command.status !== 'ATTESTED') return reply.status(409).send({ success: false, error: 'OMEGA_OBSERVATION_REQUIRES_EXECUTION' });
    const body = bodyOf(request);
    if (typeof body.observedState !== 'string' || body.observedState.length > 512) return reply.status(400).send({ success: false, error: 'OBSERVED_STATE_REQUIRED' });
    const execution = { status: 'EXECUTED' as const, record: command.change, attestationId: command.change.attestationId };
    const verification = verifyExecutedReality(execution, () => body.observedState as string);
    const status: OmegaCommandStatus = verification.status === 'VERIFIED' ? 'VERIFIED' : verification.status === 'DIVERGENT' ? 'DIVERGENT' : 'UNKNOWN';
    const reality = { kind: 'supplied-state' as const, observedState: verification.observedState ?? body.observedState as string, evidence: verification.evidence, observedAt: new Date().toISOString(), classification: verification.status === 'VERIFIED' ? 'VERIFIED' as const : verification.status === 'DIVERGENT' ? 'DIVERGENT' as const : 'UNKNOWN' as const };
    const updated = store.update(command, { change: verification.record, status, result: { command, status, ...(command.result?.execution ? { execution: command.result.execution } : {}), reality, nextAction: status === 'VERIFIED' ? 'record what was learned and select the next bounded change' : 'review divergence before selecting the next change' } });
    store.record('command.reality-observed', updated, { classification: reality.classification });
    return { success: true, ...commandResult(updated, updated.result?.nextAction ?? 'review the observed result') };
  });

  fastify.post('/v1/omega/commands/:id/verify-reality', async (request, reply) => {
    const command = store.get((request.params as { id?: string }).id ?? '');
    if (!command) return reply.status(404).send({ success: false, error: 'OMEGA_COMMAND_NOT_FOUND' });
    if (!command.result?.reality) return reply.status(409).send({ success: false, error: 'OMEGA_REALITY_OBSERVATION_REQUIRED' });
    return { success: true, ...commandResult(command, command.result.nextAction) };
  });

  fastify.get('/v1/omega/events', async (request) => {
    const commandId = (request.query as { commandId?: string }).commandId;
    return { success: true, events: store.listEvents(commandId), redacted: true };
  });
}
