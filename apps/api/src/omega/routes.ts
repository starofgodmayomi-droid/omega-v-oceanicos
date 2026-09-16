import crypto from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type {
  OmegaCommand,
  OmegaCommandResult,
  OmegaCommandStatus,
  OmegaObservation,
  OmegaNextSliceProposal,
} from '@oceanicos/types';
import {
  synthesizeOmegaLearning,
  proposeNextOmegaSlice,
  compileNextLoopIntent,
  type AttestationEntry,
} from '@oceanicos/mini';

import { WorkerRegistry } from './registry.js';
import { IntentNormalizer } from './normalizer.js';
import { PlanCompiler } from './plan-compiler.js';
import { AuthorizedCommandExecutor } from './executor.js';
import { RealityObserverEngine } from './reality-observer.js';
import { OmegaCommandStore } from './store.js';

export interface OmegaRouteOptions {
  store?: OmegaCommandStore;
  registry?: WorkerRegistry;
}

export const omegaRoutes: FastifyPluginAsync<OmegaRouteOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const store = opts.store || new OmegaCommandStore();
  const registry = opts.registry || new WorkerRegistry();
  const compiler = new PlanCompiler(registry);
  const executor = new AuthorizedCommandExecutor(registry);

  // GET /v1/omega/workers
  fastify.get('/v1/omega/workers', async () => {
    return {
      success: true,
      workers: registry.listWorkers(),
    };
  });

  // GET /v1/omega/commands
  fastify.get('/v1/omega/commands', async (request: any) => {
    const limit = Math.min(parseInt(request.query?.limit || '50', 10), 100);
    return {
      success: true,
      commands: store.listCommands(limit),
    };
  });

  // POST /v1/omega/commands (Propose)
  fastify.post('/v1/omega/commands', async (request: any, reply) => {
    const body = request.body || {};
    const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : `idem_${crypto.randomUUID()}`;

    // Check duplicate idempotency
    const existing = store.getCommandByIdempotencyKey(idempotencyKey);
    if (existing) {
      const existingResult = store.getResult(existing.commandId);
      return reply.code(200).send({
        success: true,
        command: existing,
        result: existingResult,
        idempotentReplay: true,
      });
    }

    try {
      const normalized = IntentNormalizer.normalize(body.prompt, body.context);
      const requestedWorkers: string[] = Array.isArray(body.requestedWorkers) && body.requestedWorkers.length > 0
        ? body.requestedWorkers
        : ['worker-observer', 'worker-planner'];

      const irPlan = compiler.compileIR(
        normalized.sanitizedPrompt,
        requestedWorkers,
        normalized.boundedContext
      );

      const commandId = `cmd_${crypto.randomUUID()}`;
      const command: OmegaCommand = {
        commandId,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : `sess_${crypto.randomUUID()}`,
        requestedBy: typeof body.requestedBy === 'string' ? body.requestedBy : 'human:local-source',
        timestamp: new Date().toISOString(),
        prompt: normalized.sanitizedPrompt,
        boundedContext: normalized.boundedContext,
        requestedWorkers,
        irPlan,
        idempotencyKey,
        dryRun: Boolean(body.dryRun),
        redacted: normalized.redacted,
        redactedFields: normalized.redactedFields,
        status: 'PROPOSED',
        statusReason: 'Created from human intent; pending policy admission.',
      };

      store.saveCommand(command);

      return reply.code(201).send({
        success: true,
        command,
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: err.message,
      });
    }
  });

  // GET /v1/omega/commands/:id (Inspect)
  fastify.get('/v1/omega/commands/:id', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }
    const result = store.getResult(id);
    return {
      success: true,
      command,
      result,
    };
  });

  // POST /v1/omega/commands/:id/admit (Policy & Authority Admission)
  fastify.post('/v1/omega/commands/:id/admit', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }

    if (command.status !== 'PROPOSED') {
      return reply.code(409).send({
        success: false,
        error: `INVALID_STATE_FOR_ADMISSION: Current status is ${command.status}`,
      });
    }

    // Safety checks against prohibited operations
    const lower = command.prompt.toLowerCase();
    const prohibitedKeywords = [
      'rm -rf',
      'sudo',
      'drop database',
      'truncate table',
      'transfer_funds',
      'buy_crypto',
      'delete_bucket',
    ];

    for (const kw of prohibitedKeywords) {
      if (lower.includes(kw)) {
        store.updateCommandStatus(command.commandId, 'DENIED', `Prohibited action detected: "${kw}"`);
        return {
          success: true,
          verdict: 'DENY',
          command,
          reason: `Violates Safety Charter: Prohibited action "${kw}".`,
        };
      }
    }

    // Check if requested workers require human approval
    const workerCheck = registry.validateRequestedWorkers(command.requestedWorkers);
    if (workerCheck.requiresApproval) {
      store.updateCommandStatus(
        command.commandId,
        'REVIEW',
        'Command requests mutating or consequential worker(s); requires attributable human review.'
      );
      return {
        success: true,
        verdict: 'REVIEW',
        command,
        reason: 'Requires human approval before executing local mutation.',
      };
    }

    // Otherwise, admit as AUTHORIZED
    store.updateCommandStatus(command.commandId, 'AUTHORIZED', 'All declared policy checks passed.');
    return {
      success: true,
      verdict: 'ALLOW',
      command,
      reason: 'Read-only or bounded operations verified against active policy set.',
    };
  });

  // POST /v1/omega/commands/:id/approve (Human Approval for REVIEW)
  fastify.post('/v1/omega/commands/:id/approve', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }

    if (command.status !== 'REVIEW') {
      return reply.code(409).send({
        success: false,
        error: `CANNOT_APPROVE_NON_REVIEW_STATUS: Current status is ${command.status}`,
      });
    }

    const approvedBy = request.body?.approvedBy || request.headers['x-user-id'] || 'human:authorized-steward';
    const rationale = request.body?.rationale || 'Human steward verified scope and risk.';

    command.approval = {
      approvedBy,
      approvedAt: new Date().toISOString(),
      rationale,
    };

    store.updateCommandStatus(command.commandId, 'AUTHORIZED', `Approved by ${approvedBy}`);

    return {
      success: true,
      command,
    };
  });

  // POST /v1/omega/commands/:id/execute (Authorized Executor)
  fastify.post('/v1/omega/commands/:id/execute', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }

    if (command.status !== 'AUTHORIZED') {
      return reply.code(403).send({
        success: false,
        error: `EXECUTION_REFUSED: Command status is ${command.status}, expected AUTHORIZED`,
      });
    }

    try {
      const result = await executor.execute(command, {
        signingKey: process.env.OMEGA_SIGNING_KEY,
        executorIdentity: request.body?.executorIdentity || 'omega:api-kernel',
      });

      store.updateCommandStatus(command.commandId, 'EXECUTED', 'Executed by authorized worker pipeline.');
      store.saveResult(result);

      return {
        success: true,
        command,
        result,
      };
    } catch (err: any) {
      store.updateCommandStatus(command.commandId, 'FAILED', err.message);
      return reply.code(500).send({
        success: false,
        error: err.message,
      });
    }
  });

  // POST /v1/omega/commands/:id/observe (Attach Observation)
  fastify.post('/v1/omega/commands/:id/observe', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }

    const result = store.getResult(id);
    if (!result) {
      return reply.code(409).send({
        success: false,
        error: 'COMMAND_NOT_YET_EXECUTED: Cannot observe before execution.',
      });
    }

    const body = request.body || {};
    const observerType = body.observerType || command.irPlan.observationSpec.observerType;
    const target = body.target || command.irPlan.observationSpec.target;
    const observedData = body.observedData || { status: 'OBSERVED_CLEAN', target };

    let observation: OmegaObservation;
    if (observerType === 'git_working_tree' && !body.observedData) {
      observation = RealityObserverEngine.observeGitWorkingTree();
    } else if (observerType === 'api_health' && !body.observedData) {
      observation = await RealityObserverEngine.observeApiHealth(target || 'http://127.0.0.1:5000/health');
    } else if (observerType === 'build_test' && !body.observedData) {
      observation = RealityObserverEngine.observeBuildArtifacts();
    } else {
      observation = RealityObserverEngine.createObservation(observerType, target, observedData);
    }
    result.observation = observation;
    store.saveResult(result);

    return {
      success: true,
      command,
      observation,
    };
  });

  // POST /v1/omega/commands/:id/verify-reality (Verify Reality)
  fastify.post('/v1/omega/commands/:id/verify-reality', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }

    const result = store.getResult(id);
    if (!result) {
      return reply.code(409).send({
        success: false,
        error: 'COMMAND_NOT_YET_EXECUTED: Cannot verify reality before execution.',
      });
    }

    const verdict = RealityObserverEngine.verifyReality(result, result.observation);
    result.realityVerdict = verdict;

    const newStatus: OmegaCommandStatus = verdict.verdict === 'VERIFIED'
      ? 'VERIFIED'
      : verdict.verdict === 'DIVERGENT'
      ? 'DIVERGENT'
      : 'UNKNOWN';

    store.updateCommandStatus(command.commandId, newStatus, `Reality verification verdict: ${verdict.verdict}`);
    result.status = newStatus;
    store.saveResult(result);

    return {
      success: true,
      verdict: verdict.verdict,
      command,
      result,
    };
  });

  const getAttestationEntries = (): AttestationEntry[] => {
    return store.listResults().map((res, index) => {
      const discrepancies: string[] = res.realityVerdict?.discrepancies ?? [];
      const isCompleted =
        res.status === 'EXECUTED' ||
        res.status === 'ATTESTED' ||
        res.status === 'VERIFIED' ||
        res.status === 'DIVERGENT';
      const isRefused = res.status === 'DENIED' || res.status === 'REVIEW';

      return {
        index,
        changeId: res.commandId,
        transitionStatus: isCompleted ? 'EXECUTED' : isRefused ? 'REFUSED' : res.status,
        attestationId: res.attestationId,
        realityVerdict: res.realityVerdict?.verdict,
        claimedStateHash: res.realityVerdict?.claimedStateHash ?? '',
        observedStateHash: res.realityVerdict?.observedStateHash ?? '',
        discrepancies,
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: res.attestationDigest ?? `attest_${res.commandId}`,
        timestamp: res.completedAt ?? new Date().toISOString(),
      };
    });
  };

  // GET /v1/omega/learning (Learning Feedback & Empirical Metrics)
  fastify.get('/v1/omega/learning', async () => {
    const entries = getAttestationEntries();
    const learning = synthesizeOmegaLearning(entries);
    return {
      success: true,
      learning,
    };
  });

  // GET /v1/omega/commands/:id/next-slice & GET /v1/omega/next-slice (Continuous Loop Recompiler)
  const handleNextSlice = async (commandId?: string) => {
    const command = commandId ? store.getCommand(commandId) : store.listCommands(1)[0];
    const result = command ? store.getResult(command.commandId) : undefined;
    const entries = getAttestationEntries();
    const latestEntry = entries.find((e) => e.changeId === command?.commandId) ?? entries[entries.length - 1];
    const feedback = synthesizeOmegaLearning(entries);

    const proposal = proposeNextOmegaSlice({
      latestCommand: command,
      latestResult: result,
      latestEntry,
      feedback,
    });

    return {
      success: true,
      proposal,
      feedback,
    };
  };

  fastify.get('/v1/omega/commands/:id/next-slice', async (request: any, reply) => {
    const { id } = request.params;
    const command = store.getCommand(id);
    if (!command) {
      return reply.code(404).send({ success: false, error: 'COMMAND_NOT_FOUND' });
    }
    return handleNextSlice(id);
  });

  fastify.get('/v1/omega/next-slice', async () => {
    return handleNextSlice();
  });

  // POST /v1/omega/recompile (Compile Next Slice to IR)
  fastify.post('/v1/omega/recompile', async (request: any) => {
    const body = request.body || {};
    let proposal: OmegaNextSliceProposal = body.proposal;
    if (!proposal) {
      const sliceRes = await handleNextSlice();
      proposal = sliceRes.proposal;
    }

    const compileInput = compileNextLoopIntent(proposal);
    return {
      success: true,
      proposal,
      compileInput,
    };
  });
};

