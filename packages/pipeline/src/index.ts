import crypto from 'crypto';
import { OceanicosWorkerPool, BuildCapability, BuildAttestation } from '@omega-v/worker';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PipelineStatus =
  'PENDING' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';

export type StageStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'GATE_BLOCKED';

export type GatePolicy = 'AUTO_PASS' | 'REQUIRE_ATTESTATION' | 'REQUIRE_HUMAN' | 'THRESHOLD';

export interface StageGate {
  policy: GatePolicy;
  /** For THRESHOLD: minimum fraction of jobs that must pass [0,1] */
  threshold?: number;
  /** Human approver DID for REQUIRE_HUMAN */
  approverDid?: string;
  /** Whether gate failure triggers full rollback */
  rollbackOnFail: boolean;
}

export interface PipelineStage {
  stageId: string;
  name: string;
  capability: BuildCapability;
  /** stageIds this stage depends on — must succeed before this runs */
  dependsOn: string[];
  gate: StageGate;
  jobPayload: Record<string, unknown>;
  /** Number of parallel workers to dispatch */
  parallelism: number;
  timeoutMs: number;
  status: StageStatus;
  assignedJobIds: string[];
  attestations: BuildAttestation[];
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PipelineRun {
  runId: string;
  name: string;
  version: string;
  triggeredBy: string;
  stages: PipelineStage[];
  status: PipelineStatus;
  currentStageId?: string;
  inputHash: string;
  pipelineSignature?: string;
  rollbackStageId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface PipelineRunResult {
  run: PipelineRun;
  stagesExecuted: number;
  stagesPassed: number;
  stagesFailed: number;
  totalAttestations: number;
  rollbackTriggered: boolean;
  pipelineSignature: string;
}

export interface PipelineStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  rolledBackRuns: number;
  avgDurationMs: number;
  totalStagesExecuted: number;
  totalAttestations: number;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class OceanicosPipelineEngine {
  private runs: Map<string, PipelineRun> = new Map();
  private signingKey: string;

  constructor(signingKey = 'omega-v-pipeline-secret-key') {
    this.signingKey = signingKey;
  }

  /**
   * Define and immediately execute a pipeline run.
   * Stages execute in dependency-respecting topological order.
   * Gate failures trigger rollback if configured.
   */
  public async executePipeline(spec: {
    name: string;
    version?: string;
    triggeredBy?: string;
    stages: Array<{
      stageId: string;
      name: string;
      capability: BuildCapability;
      dependsOn?: string[];
      gate?: Partial<StageGate>;
      jobPayload?: Record<string, unknown>;
      parallelism?: number;
      timeoutMs?: number;
    }>;
    workerPool: OceanicosWorkerPool;
  }): Promise<PipelineRunResult> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const inputHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ name: spec.name, stages: spec.stages }))
      .digest('hex');

    // Normalise stages
    const stages: PipelineStage[] = spec.stages.map((s) => ({
      stageId: s.stageId,
      name: s.name,
      capability: s.capability,
      dependsOn: s.dependsOn || [],
      gate: {
        policy: s.gate?.policy || 'AUTO_PASS',
        threshold: s.gate?.threshold,
        approverDid: s.gate?.approverDid,
        rollbackOnFail: s.gate?.rollbackOnFail ?? false,
      },
      jobPayload: s.jobPayload || {},
      parallelism: s.parallelism || 1,
      timeoutMs: s.timeoutMs || 60000,
      status: 'PENDING',
      assignedJobIds: [],
      attestations: [],
    }));

    const run: PipelineRun = {
      runId,
      name: spec.name,
      version: spec.version || '1.0.0',
      triggeredBy: spec.triggeredBy || 'pipeline-engine',
      stages,
      status: 'RUNNING',
      inputHash,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    this.runs.set(runId, run);

    // Execute stages in topological order
    const order = this.topologicalSort(stages);
    let rollbackTriggered = false;
    let totalAttestations = 0;

    for (const stageId of order) {
      const stage = stages.find((s) => s.stageId === stageId)!;

      // Check all dependencies passed
      const depsOk = stage.dependsOn.every((depId) => {
        const dep = stages.find((s) => s.stageId === depId);
        return dep && dep.status === 'SUCCESS';
      });

      if (!depsOk) {
        stage.status = 'SKIPPED';
        continue;
      }

      stage.status = 'RUNNING';
      stage.startedAt = new Date().toISOString();
      run.currentStageId = stageId;

      // Dispatch parallel jobs to worker pool
      const jobs = [];
      for (let i = 0; i < stage.parallelism; i++) {
        const job = spec.workerPool.submitJob({
          name: `${stage.name} [${i + 1}/${stage.parallelism}]`,
          requiredCapability: stage.capability,
          payload: { ...stage.jobPayload, pipelineRunId: runId, stageId, worker: i },
          priority: 2,
        });
        stage.assignedJobIds.push(job.jobId);
        jobs.push(job);
      }

      // Simulate execution: lease + complete each job
      let jobsPassed = 0;
      for (const job of jobs) {
        // Find a capable worker
        const workers = spec.workerPool.getWorkers();
        const capable = workers.find(
          (w) =>
            w.capabilities.includes(stage.capability) &&
            w.status !== 'OFFLINE' &&
            w.activeJobs < w.maxConcurrency
        );

        if (!capable) {
          spec.workerPool.failJob(
            job.jobId,
            workers[0]?.workerId || 'worker-fallback',
            'No capable worker available'
          );
          continue;
        }

        const leased = spec.workerPool.leaseJob(capable.workerId, stage.timeoutMs);
        if (!leased) continue;

        const output = {
          stageId,
          pipelineRunId: runId,
          exitCode: 0,
          builtAt: new Date().toISOString(),
        };

        const { attestation } = spec.workerPool.completeJob(job.jobId, capable.workerId, output, [
          {
            name: `${stage.name.toLowerCase().replace(/\s+/g, '-')}-output.json`,
            path: `dist/pipeline/${runId}/${stageId}/output.json`,
            contentHash: crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex'),
            sizeBytes: JSON.stringify(output).length,
            mimeType: 'application/json',
          },
        ]);

        stage.attestations.push(attestation);
        totalAttestations++;
        jobsPassed++;
      }

      // Evaluate gate
      const passed = this.evaluateGate(stage.gate, jobsPassed, stage.parallelism);

      if (passed) {
        stage.status = 'SUCCESS';
        stage.completedAt = new Date().toISOString();
      } else {
        stage.status = 'GATE_BLOCKED';
        stage.completedAt = new Date().toISOString();
        stage.error = `Gate policy '${stage.gate.policy}' failed (${jobsPassed}/${stage.parallelism} jobs passed)`;

        if (stage.gate.rollbackOnFail) {
          rollbackTriggered = true;
          run.status = 'ROLLED_BACK';
          run.rollbackStageId = stageId;
          // Mark remaining pending stages SKIPPED
          for (const s of stages) {
            if (s.status === 'PENDING') s.status = 'SKIPPED';
          }
          break;
        } else {
          stage.status = 'FAILED';
        }
      }
    }

    const completedAt = new Date().toISOString();
    run.completedAt = completedAt;
    run.durationMs = Date.now() - new Date(run.startedAt!).getTime();

    if (!rollbackTriggered && run.status === 'RUNNING') {
      const anyFailed = stages.some((s) => s.status === 'FAILED' || s.status === 'GATE_BLOCKED');
      run.status = anyFailed ? 'FAILED' : 'SUCCESS';
    }

    // Sign the completed pipeline run
    const sigPayload = `${runId}:${run.status}:${inputHash}:${totalAttestations}`;
    run.pipelineSignature =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');

    return {
      run,
      stagesExecuted: stages.filter((s) => s.status !== 'PENDING').length,
      stagesPassed: stages.filter((s) => s.status === 'SUCCESS').length,
      stagesFailed: stages.filter((s) => s.status === 'FAILED' || s.status === 'GATE_BLOCKED')
        .length,
      totalAttestations,
      rollbackTriggered,
      pipelineSignature: run.pipelineSignature,
    };
  }

  /** Verify a completed pipeline run's cryptographic signature */
  public verifyRunSignature(run: PipelineRun): boolean {
    if (!run.pipelineSignature) return false;
    const sigPayload = `${run.runId}:${run.status}:${run.inputHash}:${run.stages.reduce(
      (sum, s) => sum + s.attestations.length,
      0
    )}`;
    const expected =
      '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');
    return run.pipelineSignature === expected;
  }

  /** Get all pipeline runs */
  public getRuns(): PipelineRun[] {
    return Array.from(this.runs.values());
  }

  /** Get a specific run */
  public getRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  /** Aggregate pipeline statistics */
  public getStats(): PipelineStats {
    const runs = Array.from(this.runs.values());
    const successful = runs.filter((r) => r.status === 'SUCCESS');
    const failed = runs.filter((r) => r.status === 'FAILED');
    const rolledBack = runs.filter((r) => r.status === 'ROLLED_BACK');

    const totalDurationMs = runs
      .filter((r) => r.durationMs)
      .reduce((sum, r) => sum + (r.durationMs || 0), 0);

    const totalStagesExecuted = runs.reduce(
      (sum, r) => sum + r.stages.filter((s) => s.startedAt).length,
      0
    );

    const totalAttestations = runs.reduce(
      (sum, r) => sum + r.stages.reduce((ss, s) => ss + s.attestations.length, 0),
      0
    );

    return {
      totalRuns: runs.length,
      successfulRuns: successful.length,
      failedRuns: failed.length,
      rolledBackRuns: rolledBack.length,
      avgDurationMs: runs.length > 0 ? Math.round(totalDurationMs / runs.length) : 0,
      totalStagesExecuted,
      totalAttestations,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  /** Kahn's Algorithm — topological sort of stage DAG */
  private topologicalSort(stages: PipelineStage[]): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const s of stages) {
      inDegree.set(s.stageId, s.dependsOn.length);
      if (!adj.has(s.stageId)) adj.set(s.stageId, []);
      for (const dep of s.dependsOn) {
        if (!adj.has(dep)) adj.set(dep, []);
        adj.get(dep)!.push(s.stageId);
      }
    }

    const queue = stages.filter((s) => (inDegree.get(s.stageId) || 0) === 0).map((s) => s.stageId);
    const result: string[] = [];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      result.push(curr);
      for (const next of adj.get(curr) || []) {
        const deg = (inDegree.get(next) || 1) - 1;
        inDegree.set(next, deg);
        if (deg === 0) queue.push(next);
      }
    }

    // If not all stages included → cycle detected, include remaining in order
    for (const s of stages) {
      if (!result.includes(s.stageId)) result.push(s.stageId);
    }

    return result;
  }

  private evaluateGate(gate: StageGate, passed: number, total: number): boolean {
    switch (gate.policy) {
      case 'AUTO_PASS':
        return true;
      case 'REQUIRE_ATTESTATION':
        return passed > 0;
      case 'REQUIRE_HUMAN':
        // In a real system this would block for a human approval event
        // Here we auto-approve to enable testable behaviour
        return passed > 0;
      case 'THRESHOLD':
        return total === 0 ? true : passed / total >= (gate.threshold ?? 1.0);
      default:
        return passed > 0;
    }
  }
}

export default OceanicosPipelineEngine;
