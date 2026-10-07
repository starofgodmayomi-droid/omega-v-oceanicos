import crypto from 'node:crypto';
import path from 'node:path';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type {
  OmegaCommand,
  OmegaCommandResult,
  OmegaCommandStatus,
  OmegaObservation,
  OmegaNextSliceProposal,
  OmegaLifecycleEvent,
} from '@oceanicos/types';
import {
  synthesizeOmegaLearning,
  proposeNextOmegaSlice,
  compileNextLoopIntent,
  type AttestationEntry,
  OceanicosKernel,
  type KernelIntegrityReport,
} from '@oceanicos/mini';

import { WorkerRegistry } from './registry.js';
import { IntentNormalizer } from './normalizer.js';
import { PlanCompiler } from './plan-compiler.js';
import { AuthorizedCommandExecutor } from './executor.js';
import { RealityObserverEngine } from './reality-observer.js';
import { OmegaCommandStore } from './store.js';
import { createOmegaSecurityHook, type OmegaSecurityOptions } from './security.js';
import { evaluateAuthorization } from '@oceanicos/authorization';

export interface OmegaRouteOptions {
  store?: OmegaCommandStore;
  registry?: WorkerRegistry;
  security?: OmegaSecurityOptions;
  kernel?: OceanicosKernel;
  kernelStatePath?: string;
}

export const omegaRoutes: FastifyPluginAsync<OmegaRouteOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const store = opts.store || new OmegaCommandStore();
  const registry = opts.registry || new WorkerRegistry();
  const kernelStatePath = opts.kernelStatePath || path.resolve(process.cwd(), '.omega', 'kernel-state.json');
  const kernel = opts.kernel || await OceanicosKernel.loadFromFile(kernelStatePath);
  const compiler = new PlanCompiler(registry);

  /** Non-blocking auto-save after kernel mutations */
  const persistKernel = () => {
    kernel.saveToFile(kernelStatePath).catch(() => {});
  };
  const executor = new AuthorizedCommandExecutor(registry);

  // Enforce fail-closed HMAC-SHA256 signature verification on mutating endpoints
  fastify.addHook('preHandler', createOmegaSecurityHook(opts.security));

  // GET /v1/omega/kernel/status (Head Hash, Stats, Chain Length)
  fastify.get('/v1/omega/kernel/status', async () => {
    return {
      success: true,
      chainLength: kernel.getChainLength(),
      head: kernel.getHead(),
      stats: kernel.getStats(),
    };
  });

  // GET /v1/omega/kernel/integrity (Audit Hash-Chain Links, State Hashes, Attestation Signatures)
  fastify.get('/v1/omega/kernel/integrity', async () => {
    const report: KernelIntegrityReport = kernel.verifyChainIntegrity();
    return {
      success: true,
      report,
    };
  });

  // GET /v1/omega/kernel/states (List canonical state nodes with consequences)
  fastify.get('/v1/omega/kernel/states', async () => {
    return {
      success: true,
      states: kernel.getStates(),
    };
  });

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

  // GET /v1/omega/events (Audit Log & Real-Time Event Stream)
  fastify.get('/v1/omega/events', async (request: any, reply) => {
    const isStream = request.query?.stream === 'true' || request.headers.accept === 'text/event-stream';
    const limit = Math.min(parseInt(request.query?.limit || '50', 10), 200);
    const commandId = typeof request.query?.commandId === 'string' ? request.query.commandId : undefined;
    const eventType = typeof request.query?.type === 'string' ? request.query.type : undefined;

    if (isStream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      reply.raw.write(': omega-event-stream-connected\n\n');

      const recent = store.listEvents({ commandId, eventType, limit: 10 });
      for (const ev of recent.reverse()) {
        reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
      }

      if (request.query?.once === 'true') {
        reply.raw.end();
        return;
      }

      const unsubscribe = store.onEvent((ev) => {
        if (commandId && ev.commandId !== commandId) return;
        if (eventType && ev.eventType !== eventType) return;
        try {
          reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
        } catch {
          unsubscribe();
        }
      });

      request.raw.on('close', () => {
        unsubscribe();
      });

      return;
    }

    return {
      success: true,
      events: store.listEvents({ commandId, eventType, limit }),
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
      const inputContext = body.context || body.boundedContext;
      const normalized = IntentNormalizer.normalize(body.prompt, inputContext);
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
      store.appendEvent({
        eventType: 'COMMAND_PROPOSED',
        commandId: command.commandId,
        status: 'PROPOSED',
        actor: command.requestedBy,
        payload: {
          prompt: command.prompt,
          requestedWorkers: command.requestedWorkers,
          redacted: command.redacted,
          redactedFields: command.redactedFields,
        },
      });

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
    const promptText = command.prompt || command.intent || '';
    const lower = promptText.toLowerCase();
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
        store.appendEvent({
          eventType: 'COMMAND_DENIED',
          commandId: command.commandId,
          status: 'DENIED',
          actor: 'kernel:safety-gate',
          payload: { reason: `Violates Safety Charter: Prohibited action "${kw}".` },
        });
        return {
          success: true,
          verdict: 'DENY',
          command,
          reason: `Violates Safety Charter: Prohibited action "${kw}".`,
        };
      }
    }

    // Evaluate canonical authorization per Constitution §6, §8, §9
    const requestedWorkers = [...(command.requestedWorkers || command.workers || [])];
    const workerCheck = registry.validateRequestedWorkers(requestedWorkers);
    const isDestructive =
      /delete|destroy|drop|purge|remove/i.test(command.irPlan.transitionSpec.action) ||
      workerCheck.requiresApproval;
    const isFinancial =
      lower.includes('transfer_funds') ||
      lower.includes('buy_crypto');
    const isIrreversible = !command.irPlan.transitionSpec.rollbackSupported;
    const hasDissentRecords = (command.irPlan.evidenceRefs || []).some((ref: string) =>
      ref.toLowerCase().includes('dissent') || ref.toLowerCase().includes('dispute')
    );

    const authDecision = evaluateAuthorization({
      subject: command.commandId,
      intent: promptText,
      isDestructive,
      isFinancial,
      isIrreversible,
      hasDissentRecords,
      requestedBy: command.requestedBy,
      evidence: command.irPlan.evidenceRefs,
      timestamp: new Date().toISOString(),
    });

    if (authDecision.decision === 'DENY') {
      store.updateCommandStatus(command.commandId, 'DENIED', authDecision.rationale);
      store.appendEvent({
        eventType: 'COMMAND_DENIED',
        commandId: command.commandId,
        status: 'DENIED',
        actor: 'kernel:safety-gate',
        payload: { reason: authDecision.rationale },
      });
      return {
        success: true,
        verdict: 'DENY',
        command,
        reason: authDecision.rationale,
      };
    }

    if (authDecision.decision === 'REVIEW') {
      store.updateCommandStatus(command.commandId, 'REVIEW', authDecision.rationale);
      store.appendEvent({
        eventType: 'COMMAND_REVIEW_REQUIRED',
        commandId: command.commandId,
        status: 'REVIEW',
        actor: 'kernel:admission-gate',
        payload: { reason: authDecision.rationale },
      });
      return {
        success: true,
        verdict: 'REVIEW',
        command,
        reason: authDecision.rationale,
      };
    }

    // Otherwise, admit as AUTHORIZED
    store.updateCommandStatus(command.commandId, 'AUTHORIZED', 'All declared policy checks passed.');
    store.appendEvent({
      eventType: 'COMMAND_ADMITTED',
      commandId: command.commandId,
      status: 'AUTHORIZED',
      actor: 'kernel:admission-gate',
      payload: { reason: 'Read-only or bounded operations verified against active policy set.' },
    });
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
    store.appendEvent({
      eventType: 'COMMAND_APPROVED',
      commandId: command.commandId,
      status: 'AUTHORIZED',
      actor: approvedBy,
      payload: { rationale },
    });

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
      store.appendEvent({
        eventType: 'COMMAND_EXECUTED',
        commandId: command.commandId,
        status: 'EXECUTED',
        actor: request.body?.executorIdentity || 'omega:api-kernel',
        payload: {
          consequence: result.consequence,
          attestationDigest: result.attestationDigest,
        },
      });

      // Advance canonical kernel state
      try {
        kernel.transition({
          intent: {
            claim: command.prompt || command.intent || '',
            actors: [command.requestedBy],
            inputs: (command.boundedContext || command.context || {}) as Record<string, unknown>,
            expectedOutputs: { consequence: result.consequence },
            constraints: command.irPlan.policyRefs,
            permissions: command.irPlan.requestedWorkers,
            dependencies: command.irPlan.evidenceRefs,
            maxRiskScore: 0.2,
            economicTarget: { targetValue: 1, resourceBudget: 1 },
          },
          observation: {
            source: 'omega:api-executor',
            observedAt: new Date().toISOString(),
            rawTelemetry: { commandId: command.commandId, status: result.status },
            epistemicType: 'FACT',
            confidence: 1.0,
          },
          evidenceItems: [
            {
              claim: `Command ${command.commandId} executed`,
              source: result.provenance?.executedBy || 'omega:api-kernel',
              observationId: `obs-${command.commandId}`,
              commandOrTest: command.prompt || command.intent || '',
              status: 'PASSED',
              confidence: 1.0,
            },
          ],
          actionPlan: {
            targetService: command.irPlan.transitionSpec.target,
            payload: { commandId: command.commandId },
            isDestructive: false,
            isFinancial: false,
            gasLimit: 1000,
            reversibility: command.irPlan.transitionSpec.rollbackSupported ? 'REVERSIBLE' : 'IRREVERSIBLE',
          },
          autoAuthorizeIfNonDestructive: true,
        });
        persistKernel();
      } catch {
        // Non-blocking fallback
      }

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
    } else if (observerType === 'coordination_probe' && !body.observedData) {
      observation = RealityObserverEngine.observeCoordinationEvidence(
        body.coordinationMode,
        body.coordinationReference,
        target || 'coordination_boundary'
      );
    } else {
      observation = RealityObserverEngine.createObservation(observerType, target, observedData);
    }
    result.observation = observation;
    store.saveResult(result);
    store.appendEvent({
      eventType: 'REALITY_OBSERVED',
      commandId: command.commandId,
      status: command.status,
      actor: observation.observerId,
      payload: {
        observerType: observation.observerType,
        target: observation.target,
        stateHash: observation.stateHash,
      },
    });

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
    store.appendEvent({
      eventType: 'REALITY_VERIFIED',
      commandId: command.commandId,
      status: newStatus,
      actor: 'kernel:reality-engine',
      payload: {
        verdict: verdict.verdict,
        discrepancies: verdict.discrepancies,
        claimedStateHash: verdict.claimedStateHash,
        observedStateHash: verdict.observedStateHash,
      },
    });

    // Apply consequence & empirical learning to the matching canonical kernel state
    let kernelSettledState = undefined;
    try {
      const states = kernel.getStates();
      const matchingState = [...states].reverse().find(
        (s) => (s.action.payload as any)?.commandId === command.commandId
      );
      if (matchingState) {
        kernelSettledState = kernel.applyConsequence({
          stateId: matchingState.stateId,
          observedStatus: verdict.verdict === 'VERIFIED' ? 'SUCCESS' : 'FAILURE',
          realizedEffects: {
            commandId: command.commandId,
            verdict: verdict.verdict,
            discrepancies: verdict.discrepancies,
            claimedStateHash: verdict.claimedStateHash,
            observedStateHash: verdict.observedStateHash,
          },
          executionDurationMs: 120,
          verifiedValueGenerated: verdict.verdict === 'VERIFIED' ? 100 : 0,
        });
        persistKernel();
      }
    } catch {
      // Non-blocking fallback
    }

    return {
      success: true,
      verdict: verdict.verdict,
      command,
      result,
      kernelSettledState,
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
        changeId: res.commandId ?? '',
        transitionStatus: isCompleted ? 'EXECUTED' : isRefused ? 'REFUSED' : res.status,
        attestationId: res.attestationId,
        realityVerdict: res.realityVerdict?.verdict,
        claimedStateHash: res.realityVerdict?.claimedStateHash ?? '',
        observedStateHash: res.realityVerdict?.observedStateHash ?? '',
        discrepancies,
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: res.attestationDigest ?? (res.commandId ? `attest_${res.commandId}` : `attest_${index}`),
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
    store.appendEvent({
      eventType: 'LOOP_RECOMPILED',
      commandId: proposal.sourceCommandId,
      actor: 'kernel:loop-recompiler',
      payload: {
        proposalAction: proposal.actionType,
        proposalTrigger: proposal.trigger,
        proposedIntent: proposal.proposedIntent,
        urgency: proposal.urgency,
      },
    });

    return {
      success: true,
      proposal,
      compileInput,
    };
  });
};

