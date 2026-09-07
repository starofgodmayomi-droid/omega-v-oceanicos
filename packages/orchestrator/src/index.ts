import crypto from 'crypto';

export type TaskExecutionMode = 'PARALLEL' | 'SEQUENTIAL' | 'SPECULATIVE';
export type OrchestratorTaskStatus = 'QUEUED' | 'RUNNING' | 'ATTESTED' | 'FAILED' | 'ROLLED_BACK';

export interface OrchestratedTask {
  taskId: string;
  batchId?: string;
  name: string;
  assignedAgentDid: string;
  executionMode: TaskExecutionMode;
  payload: Record<string, unknown>;
  dependencies: string[];
  status: OrchestratorTaskStatus;
  resultWitness?: string;
  executionDurationMs?: number;
  dispatchedAt: string;
  completedAt?: string;
}

export interface ParallelBatchReceipt {
  batchId: string;
  taskCount: number;
  executionMode: TaskExecutionMode;
  completedCount: number;
  stateDeltaHash: string;
  batchAttestation: string;
  dispatchedAt: string;
  completedAt?: string;
}

export interface OrchestratorStats {
  totalDispatchedTasks: number;
  completedTasks: number;
  activeParallelBatches: number;
  registeredAgents: number;
  speculativeRollbacks: number;
  avgTaskExecutionMs: number;
}

export class OceanicosOrchestratorEngine {
  private tasks: Map<string, OrchestratedTask> = new Map();
  private batches: Map<string, ParallelBatchReceipt> = new Map();
  private agents: Set<string> = new Set();
  private signingKey: string;
  private totalDurationAccumulator: number = 0;
  private speculativeRollbackCount: number = 0;

  constructor(signingKey = 'omega-v-orchestrator-key') {
    this.signingKey = signingKey;
  }

  public registerAgent(agentDid: string): void {
    this.agents.add(agentDid);
  }

  public dispatchTask(spec: {
    name: string;
    assignedAgentDid: string;
    payload?: Record<string, unknown>;
    executionMode?: TaskExecutionMode;
    dependencies?: string[];
  }): OrchestratedTask {
    const taskId = 'task-' + crypto.randomBytes(8).toString('hex');
    this.registerAgent(spec.assignedAgentDid);

    const task: OrchestratedTask = {
      taskId,
      name: spec.name,
      assignedAgentDid: spec.assignedAgentDid,
      executionMode: spec.executionMode || 'PARALLEL',
      payload: spec.payload || {},
      dependencies: spec.dependencies || [],
      status: 'QUEUED',
      dispatchedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);
    return task;
  }

  public dispatchParallelBatch(spec: {
    batchName: string;
    tasks: Array<{
      name: string;
      assignedAgentDid: string;
      payload?: Record<string, unknown>;
      executionMode?: TaskExecutionMode;
    }>;
  }): ParallelBatchReceipt {
    const batchId = 'batch-' + crypto.randomBytes(8).toString('hex');
    const createdTasks: OrchestratedTask[] = [];

    for (const t of spec.tasks) {
      this.registerAgent(t.assignedAgentDid);
      const taskId = 'task-' + crypto.randomBytes(8).toString('hex');
      const task: OrchestratedTask = {
        taskId,
        batchId,
        name: t.name,
        assignedAgentDid: t.assignedAgentDid,
        executionMode: t.executionMode || 'PARALLEL',
        payload: t.payload || {},
        dependencies: [],
        status: 'RUNNING',
        dispatchedAt: new Date().toISOString(),
      };
      this.tasks.set(taskId, task);
      createdTasks.push(task);
    }

    const stateDeltaHash =
      '0x' +
      crypto
        .createHash('sha256')
        .update(`${batchId}:${createdTasks.map((t) => t.taskId).join(',')}`)
        .digest('hex');

    const batchAttestation =
      '0x' +
      crypto
        .createHmac('sha256', this.signingKey)
        .update(`BATCH_DISPATCH:${batchId}:${stateDeltaHash}`)
        .digest('hex');

    const receipt: ParallelBatchReceipt = {
      batchId,
      taskCount: createdTasks.length,
      executionMode: 'PARALLEL',
      completedCount: 0,
      stateDeltaHash,
      batchAttestation,
      dispatchedAt: new Date().toISOString(),
    };

    this.batches.set(batchId, receipt);
    return receipt;
  }

  public submitTaskAttestation(spec: {
    taskId: string;
    agentDid: string;
    resultWitness: string;
    durationMs?: number;
    hasConflict?: boolean;
  }): OrchestratedTask {
    const task = this.tasks.get(spec.taskId);
    if (!task) throw new Error(`Task ${spec.taskId} not found`);

    if (spec.hasConflict && task.executionMode === 'SPECULATIVE') {
      task.status = 'ROLLED_BACK';
      task.resultWitness = 'SPECULATIVE_CONFLICT_ROLLED_BACK';
      this.speculativeRollbackCount++;
      return task;
    }

    const duration = spec.durationMs || Math.round(15 + Math.random() * 45);
    task.status = 'ATTESTED';
    task.resultWitness = spec.resultWitness;
    task.executionDurationMs = duration;
    task.completedAt = new Date().toISOString();

    this.totalDurationAccumulator += duration;

    // Update batch counter if part of a batch
    if (task.batchId) {
      const batch = this.batches.get(task.batchId);
      if (batch) {
        batch.completedCount++;
        if (batch.completedCount >= batch.taskCount) {
          batch.completedAt = new Date().toISOString();
        }
      }
    }

    return task;
  }

  public getTasks(batchId?: string): OrchestratedTask[] {
    const all = Array.from(this.tasks.values());
    if (batchId) return all.filter((t) => t.batchId === batchId);
    return all;
  }

  public getBatches(): ParallelBatchReceipt[] {
    return Array.from(this.batches.values());
  }

  public getStats(): OrchestratorStats {
    const allTasks = Array.from(this.tasks.values());
    const completed = allTasks.filter((t) => t.status === 'ATTESTED').length;
    const activeBatches = Array.from(this.batches.values()).filter((b) => !b.completedAt).length;

    return {
      totalDispatchedTasks: allTasks.length,
      completedTasks: completed,
      activeParallelBatches: activeBatches,
      registeredAgents: this.agents.size,
      speculativeRollbacks: this.speculativeRollbackCount,
      avgTaskExecutionMs: completed > 0 ? Math.round(this.totalDurationAccumulator / completed) : 0,
    };
  }
}

export default OceanicosOrchestratorEngine;
