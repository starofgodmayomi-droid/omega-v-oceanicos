import { OceanicosClient } from '@omega-v/sdk';
import { EventLogEntry } from '@omega-v/types';

export type SchedulerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';

export interface ScheduleConfig {
  /** Interval in milliseconds between verification runs */
  intervalMs: number;

  /** The claim to submit for each scheduled run */
  claim: string;

  /** Maximum number of runs (0 = unlimited) */
  maxRuns?: number;

  /** Callback invoked after each completed run */
  onRun?: (runResult: ScheduledRunResult) => void;

  /** Callback invoked on any run failure */
  onError?: (error: Error, runIndex: number) => void;
}

export interface ScheduledRunResult {
  runIndex: number;
  scheduledAt: string;
  completedAt: string;
  passed: boolean;
  confidence: number;
  attestationId: string;
  signature: string;
  logEntry: EventLogEntry;
}

export interface SchedulerState {
  status: SchedulerStatus;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  startedAt: string | null;
  history: ScheduledRunResult[];
}

/**
 * VerificationScheduler: Autonomous periodic execution of the Ω∞v kernel loop.
 *
 * MOTION=CONTINUOUS — runs Observe→Verify→Attest→Record on a configured cadence,
 * making the system self-sustaining without requiring human invocation.
 *
 * 💧 Ω∞v ::= 0 → (🌎 ⇄ ✓)∞
 */
export class VerificationScheduler {
  private client: OceanicosClient;
  private config: ScheduleConfig;
  private status: SchedulerStatus = 'IDLE';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private runIndex = 0;
  private history: ScheduledRunResult[] = [];
  private startedAt: string | null = null;
  private lastRunAt: string | null = null;
  private passedRuns = 0;
  private failedRuns = 0;

  constructor(client?: OceanicosClient, config?: Partial<ScheduleConfig>) {
    this.client = client || new OceanicosClient();
    this.config = {
      intervalMs: config?.intervalMs ?? 30000,
      claim: config?.claim ?? 'Ω∞v scheduled verification loop',
      maxRuns: config?.maxRuns ?? 0,
      onRun: config?.onRun,
      onError: config?.onError,
    };
  }

  /**
   * Start the autonomous verification loop
   */
  public start(): void {
    if (this.status === 'RUNNING') return;

    this.status = 'RUNNING';
    this.startedAt = new Date().toISOString();

    // Execute first run immediately, then on interval
    this.executeRun();

    this.timerId = setInterval(() => {
      if (this.status !== 'RUNNING') return;
      if (this.config.maxRuns && this.runIndex >= this.config.maxRuns) {
        this.stop();
        return;
      }
      this.executeRun();
    }, this.config.intervalMs);
  }

  /**
   * Pause the scheduler (can be resumed)
   */
  public pause(): void {
    if (this.status === 'RUNNING') {
      this.status = 'PAUSED';
    }
  }

  /**
   * Resume a paused scheduler
   */
  public resume(): void {
    if (this.status === 'PAUSED') {
      this.status = 'RUNNING';
    }
  }

  /**
   * Stop the scheduler permanently and clear the interval
   */
  public stop(): void {
    this.status = 'STOPPED';
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Get current scheduler state snapshot
   */
  public getState(): SchedulerState {
    const now = new Date().toISOString();
    const nextRunAt =
      this.status === 'RUNNING' && this.lastRunAt
        ? new Date(new Date(this.lastRunAt).getTime() + this.config.intervalMs).toISOString()
        : null;

    return {
      status: this.status,
      totalRuns: this.runIndex,
      passedRuns: this.passedRuns,
      failedRuns: this.failedRuns,
      lastRunAt: this.lastRunAt,
      nextRunAt,
      startedAt: this.startedAt,
      history: [...this.history].slice(-20), // Last 20 runs
    };

    void now; // suppress unused var
  }

  /**
   * Update the claim or interval without restarting
   */
  public reconfigure(partial: Partial<ScheduleConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Execute a single scheduled verification run
   */
  private async executeRun(): Promise<void> {
    const scheduledAt = new Date().toISOString();
    const currentIndex = ++this.runIndex;

    try {
      const result = await this.client.runLoop({ claim: this.config.claim });

      const completedAt = new Date().toISOString();
      const passed = result.verification.summary.passed;

      if (passed) {
        this.passedRuns++;
      } else {
        this.failedRuns++;
      }

      this.lastRunAt = completedAt;

      const logEntries = this.client.getLogEntries();
      const latestEntry = logEntries[logEntries.length - 1];

      const runResult: ScheduledRunResult = {
        runIndex: currentIndex,
        scheduledAt,
        completedAt,
        passed,
        confidence: result.verification.summary.confidence,
        attestationId: result.attestation.id,
        signature: result.attestation.signature,
        logEntry: latestEntry,
      };

      this.history.push(runResult);

      if (this.config.onRun) {
        this.config.onRun(runResult);
      }
    } catch (err) {
      this.failedRuns++;
      this.lastRunAt = new Date().toISOString();

      if (this.config.onError) {
        this.config.onError(err instanceof Error ? err : new Error(String(err)), currentIndex);
      }
    }
  }
}

export default VerificationScheduler;
