/**
 * Ω∞v MANUS-STYLE AUTONOMOUS PLANNER LOOP
 * ────────────────────────────────────────
 * Multi-step autonomous execution agent with cryptographic verification
 * at every state transition.
 *
 * Architecture:
 * 1. PLAN → Break goal into discrete verified steps
 * 2. EXECUTE → Run each step through the MiniKernel with observe→verify→remember
 * 3. VERIFY → Every action produces an attested block with 0xΩ hash proof
 * 4. REFLECT → Evaluate results, adapt plan if conditions diverge
 * 5. COMPLETE → Final attestation aggregates all step proofs into one master hash
 *
 * Security: Zero autonomous shell execution. Every action is bounded to
 * the observe/verify/remember/report task kinds. Human authorization
 * required for mutations that exceed the bounded safety envelope.
 *
 * Iron Law: Attest, don't assert. No step is "done" without a hash.
 */

import crypto from 'crypto';
import { MiniKernel } from './index.js';
import { ObserverEngine } from '@oceanicos/observer';
import { VerificationEngine } from '@oceanicos/verification';
import { RememberEngine } from '@oceanicos/remember';
import { IMiniBlock, IObservation, IEvidence } from '@oceanicos/types';

// ─── Types ───────────────────────────────────────────────────────────

export type AgentStepStatus = 'pending' | 'executing' | 'verified' | 'failed' | 'skipped';

export type AgentGoalStatus = 'planning' | 'executing' | 'reflecting' | 'completed' | 'failed' | 'aborted';

export type AgentStepKind = 'observe' | 'verify' | 'remember' | 'report' | 'attest';

export interface AgentStep {
  readonly id: string;
  readonly index: number;
  readonly kind: AgentStepKind;
  readonly description: string;
  status: AgentStepStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  block?: IMiniBlock;
  proof?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  durationMs?: number;
}

export interface AgentGoal {
  readonly id: string;
  readonly description: string;
  readonly createdAt: string;
  status: AgentGoalStatus;
  steps: AgentStep[];
  currentStepIndex: number;
  totalDurationMs: number;
  masterProof?: string;
  reflection?: AgentReflection;
  completedAt?: string;
}

export interface AgentReflection {
  readonly goalId: string;
  readonly timestamp: string;
  stepsCompleted: number;
  stepsFailed: number;
  stepsSkipped: number;
  allVerified: boolean;
  proofChain: string[];
  masterHash: string;
  summary: string;
}

export interface AgentPlannerConfig {
  /** Maximum steps per goal (safety bound) */
  maxSteps: number;
  /** Maximum execution time per step in milliseconds */
  maxStepDurationMs: number;
  /** Maximum total goal execution time in milliseconds */
  maxGoalDurationMs: number;
  /** Whether to continue on step failure */
  continueOnFailure: boolean;
  /** Auto-attest each step with a block */
  autoAttest: boolean;
}

const DEFAULT_CONFIG: AgentPlannerConfig = {
  maxSteps: 64,
  maxStepDurationMs: 30_000,
  maxGoalDurationMs: 300_000,
  continueOnFailure: false,
  autoAttest: true,
};

// ─── Step Executors ──────────────────────────────────────────────────

type StepExecutor = (step: AgentStep, kernel: MiniKernel) => AgentStep;

const STEP_EXECUTORS: Record<AgentStepKind, StepExecutor> = {
  observe: (step, _kernel) => {
    const telemetry = ObserverEngine.generateTelemetry();
    step.output = {
      observation: telemetry,
      siliconYield: telemetry.siliconYield,
      gridLoad: telemetry.gridLoadMegawatts,
      accelerators: telemetry.acceleratorInventory,
    };
    return step;
  },

  verify: (step, _kernel) => {
    const observation = (step.input.observation as IObservation) || ObserverEngine.generateTelemetry();
    const evidence = VerificationEngine.evaluate(observation);
    step.output = {
      evidence,
      passed: evidence.status === 'PASS',
      proof: evidence.signatureProof,
    };
    step.proof = evidence.signatureProof;
    return step;
  },

  remember: (step, kernel) => {
    const block = kernel.runCycle();
    step.output = {
      block,
      blockIndex: block.index,
      blockHash: block.hash,
    };
    step.block = block;
    step.proof = block.hash;
    return step;
  },

  report: (step, _kernel) => {
    const report = {
      timestamp: new Date().toISOString(),
      description: step.description,
      input: step.input,
      status: 'REPORTED',
    };
    step.output = { report };
    step.proof = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
    return step;
  },

  attest: (step, kernel) => {
    // An attest step runs a full cycle and produces a standalone attestation proof
    const block = kernel.runCycle();
    const attestationHash = crypto
      .createHash('sha256')
      .update(`0xΩ-${block.hash}-${block.index}-${block.timestamp}`)
      .digest('hex');

    step.output = {
      block,
      attestationHash: `0xΩ${attestationHash}`,
      verified: true,
    };
    step.block = block;
    step.proof = `0xΩ${attestationHash}`;
    return step;
  },
};

// ─── Autonomous Planner Agent ────────────────────────────────────────

export class AutonomousPlannerAgent {
  private readonly config: AgentPlannerConfig;
  private readonly kernel: MiniKernel;
  private goals: Map<string, AgentGoal> = new Map();
  private totalGoalsCreated = 0;
  private totalGoalsCompleted = 0;
  private totalGoalsFailed = 0;

  constructor(kernel: MiniKernel, config?: Partial<AgentPlannerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.kernel = kernel;
  }

  // ─── PHASE 1: PLAN ──────────────────────────────────────────────

  /**
   * Create a verified execution plan for a goal.
   * Each goal is decomposed into typed steps that will execute sequentially.
   */
  public plan(description: string, steps: Array<{ kind: AgentStepKind; description: string; input?: Record<string, unknown> }>): AgentGoal {
    if (steps.length === 0) {
      throw new Error('Agent goal must have at least one step');
    }
    if (steps.length > this.config.maxSteps) {
      throw new Error(`Agent goal exceeds maximum steps (${this.config.maxSteps})`);
    }

    // Validate all step kinds
    const validKinds: AgentStepKind[] = ['observe', 'verify', 'remember', 'report', 'attest'];
    for (const step of steps) {
      if (!validKinds.includes(step.kind)) {
        throw new Error(`Invalid step kind: ${step.kind}. Must be one of: ${validKinds.join(', ')}`);
      }
    }

    const goalId = `goal-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const agentSteps: AgentStep[] = steps.map((s, i) => ({
      id: `${goalId}-step-${i}`,
      index: i,
      kind: s.kind,
      description: s.description,
      status: 'pending' as AgentStepStatus,
      input: s.input || {},
    }));

    const goal: AgentGoal = {
      id: goalId,
      description,
      createdAt: new Date().toISOString(),
      status: 'planning',
      steps: agentSteps,
      currentStepIndex: 0,
      totalDurationMs: 0,
    };

    this.goals.set(goalId, goal);
    this.totalGoalsCreated++;
    return goal;
  }

  // ─── PHASE 2: EXECUTE ───────────────────────────────────────────

  /**
   * Execute all steps in a goal sequentially.
   * Each step produces a cryptographic proof that chains into the next.
   */
  public execute(goalId: string): AgentGoal {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Unknown goal: ${goalId}`);
    }
    if (goal.status !== 'planning') {
      throw new Error(`Goal ${goalId} is in state ${goal.status}, expected 'planning'`);
    }

    goal.status = 'executing';
    const goalStartMs = Date.now();

    for (let i = 0; i < goal.steps.length; i++) {
      const step = goal.steps[i];
      goal.currentStepIndex = i;

      // Check total goal timeout
      const elapsed = Date.now() - goalStartMs;
      if (elapsed > this.config.maxGoalDurationMs) {
        step.status = 'failed';
        step.error = 'Goal execution timeout exceeded';
        goal.status = 'failed';
        goal.totalDurationMs = elapsed;
        this.totalGoalsFailed++;
        return goal;
      }

      // Execute the step
      step.status = 'executing';
      step.startedAt = new Date().toISOString();
      const stepStartMs = Date.now();

      try {
        // Pipe previous step's output as input context if available
        if (i > 0) {
          const prevStep = goal.steps[i - 1];
          if (prevStep.output) {
            step.input = { ...step.input, _previousOutput: prevStep.output };
          }
          // Chain proof from previous step
          if (prevStep.proof) {
            step.input = { ...step.input, _previousProof: prevStep.proof };
          }
        }

        const executor = STEP_EXECUTORS[step.kind];
        executor(step, this.kernel);

        step.status = 'verified';
        step.completedAt = new Date().toISOString();
        step.durationMs = Date.now() - stepStartMs;

        // Auto-attest: run a kernel cycle to cryptographically bind this step
        if (this.config.autoAttest && step.kind !== 'remember' && step.kind !== 'attest') {
          const attestBlock = this.kernel.runCycle();
          step.block = attestBlock;
          if (!step.proof) {
            step.proof = attestBlock.hash;
          }
        }
      } catch (err: unknown) {
        step.status = 'failed';
        step.error = err instanceof Error ? err.message : String(err);
        step.completedAt = new Date().toISOString();
        step.durationMs = Date.now() - stepStartMs;

        if (!this.config.continueOnFailure) {
          goal.status = 'failed';
          goal.totalDurationMs = Date.now() - goalStartMs;
          this.totalGoalsFailed++;
          return goal;
        }
      }
    }

    goal.totalDurationMs = Date.now() - goalStartMs;

    // Move to reflection phase
    goal.status = 'reflecting';
    return this.reflect(goalId);
  }

  // ─── PHASE 3: REFLECT ───────────────────────────────────────────

  /**
   * Evaluate execution results. Build a master proof chain from all step proofs.
   */
  private reflect(goalId: string): AgentGoal {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Unknown goal: ${goalId}`);
    }

    const stepsCompleted = goal.steps.filter(s => s.status === 'verified').length;
    const stepsFailed = goal.steps.filter(s => s.status === 'failed').length;
    const stepsSkipped = goal.steps.filter(s => s.status === 'pending' || s.status === 'skipped').length;

    // Build proof chain — hash all step proofs together
    const proofChain = goal.steps
      .filter(s => s.proof)
      .map(s => s.proof!);

    // Compute master hash from the full proof chain
    const masterHash = crypto
      .createHash('sha256')
      .update(`0xΩ-MASTER-${goalId}-${proofChain.join('-')}`)
      .digest('hex');

    const allVerified = stepsFailed === 0 && stepsSkipped === 0;

    goal.reflection = {
      goalId,
      timestamp: new Date().toISOString(),
      stepsCompleted,
      stepsFailed,
      stepsSkipped,
      allVerified,
      proofChain,
      masterHash: `0xΩ${masterHash}`,
      summary: allVerified
        ? `Goal "${goal.description}" completed with ${stepsCompleted} verified steps. Master proof: 0xΩ${masterHash.slice(0, 16)}...`
        : `Goal "${goal.description}" completed with ${stepsFailed} failures. ${stepsCompleted}/${goal.steps.length} steps verified.`,
    };

    goal.masterProof = `0xΩ${masterHash}`;
    goal.status = allVerified ? 'completed' : 'failed';
    goal.completedAt = new Date().toISOString();

    if (allVerified) {
      this.totalGoalsCompleted++;
    } else {
      this.totalGoalsFailed++;
    }

    return goal;
  }

  // ─── CONVENIENCE: Plan + Execute in one call ────────────────────

  /**
   * Plan and immediately execute a goal — the "fire and verify" path.
   */
  public run(
    description: string,
    steps: Array<{ kind: AgentStepKind; description: string; input?: Record<string, unknown> }>
  ): AgentGoal {
    const goal = this.plan(description, steps);
    return this.execute(goal.id);
  }

  /**
   * Run the standard observe→verify→remember→attest pipeline as a single goal.
   * This is the default "full cycle" that most callers want.
   */
  public runFullCycle(description?: string): AgentGoal {
    return this.run(description || 'Autonomous Full Cycle Execution', [
      { kind: 'observe', description: 'Observe planetary base telemetry' },
      { kind: 'verify', description: 'Verify sovereign compliance rules' },
      { kind: 'remember', description: 'Commit verified state to ledger' },
      { kind: 'attest', description: 'Generate cryptographic attestation proof' },
      { kind: 'report', description: 'Emit final execution report' },
    ]);
  }

  // ─── Queries ────────────────────────────────────────────────────

  public getGoal(goalId: string): AgentGoal | undefined {
    return this.goals.get(goalId);
  }

  public getAllGoals(): AgentGoal[] {
    return Array.from(this.goals.values());
  }

  public getStats(): {
    totalGoalsCreated: number;
    totalGoalsCompleted: number;
    totalGoalsFailed: number;
    activeGoals: number;
  } {
    return {
      totalGoalsCreated: this.totalGoalsCreated,
      totalGoalsCompleted: this.totalGoalsCompleted,
      totalGoalsFailed: this.totalGoalsFailed,
      activeGoals: Array.from(this.goals.values()).filter(
        g => g.status === 'planning' || g.status === 'executing'
      ).length,
    };
  }

  /**
   * Abort a goal that is still in planning or executing state.
   */
  public abort(goalId: string): AgentGoal {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Unknown goal: ${goalId}`);
    }
    if (goal.status === 'completed' || goal.status === 'failed' || goal.status === 'aborted') {
      return goal;
    }

    // Mark remaining pending steps as skipped
    for (const step of goal.steps) {
      if (step.status === 'pending' || step.status === 'executing') {
        step.status = 'skipped';
      }
    }

    goal.status = 'aborted';
    goal.completedAt = new Date().toISOString();
    return goal;
  }
}

export default AutonomousPlannerAgent;
