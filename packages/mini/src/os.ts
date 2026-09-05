import { MiniKernel } from './index';
import { MiniCycleResult } from '@omega-v/types';

/**
 * OperatingSystemKernel: bounded deterministic finite control-plane.
 *
 * Lifecycle: boot() → admit() → complete() → stop()
 *
 * This is the thin OS layer that manages the lifecycle of MINI cycles.
 * It enforces:
 *   - Sequential admission (no concurrent cycles)
 *   - Boot/stop lifecycle boundaries
 *   - State snapshotting
 */

export type OSKernelState = 'COLD' | 'BOOTED' | 'PROCESSING' | 'STOPPED';

export interface OSKernelSnapshot {
  state: OSKernelState;
  totalCycles: number;
  passedCycles: number;
  failedCycles: number;
  memorySize: number;
  memoryIntegrity: boolean;
  snapshotAt: string;
}

export class OperatingSystemKernel {
  private state: OSKernelState = 'COLD';
  private totalCycles = 0;
  private passedCycles = 0;
  private failedCycles = 0;

  constructor(private readonly kernel: MiniKernel) {}

  /**
   * Boot the kernel. Transitions COLD → BOOTED.
   * Fails if already booted or stopped.
   */
  public boot(): void {
    if (this.state !== 'COLD') {
      throw new Error(`Cannot boot: kernel is in state '${this.state}' (expected 'COLD')`);
    }
    this.state = 'BOOTED';
  }

  /**
   * Admit a claim for processing. Transitions BOOTED → PROCESSING → BOOTED.
   * Fails if not booted.
   */
  public admit(input: {
    claim: string;
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): MiniCycleResult {
    if (this.state !== 'BOOTED') {
      throw new Error(`Cannot admit: kernel is in state '${this.state}' (expected 'BOOTED')`);
    }

    this.state = 'PROCESSING';

    try {
      const result = this.kernel.cycle(input);
      this.totalCycles++;

      if (result.passed) {
        this.passedCycles++;
      } else {
        this.failedCycles++;
      }

      return result;
    } finally {
      this.state = 'BOOTED';
    }
  }

  /**
   * Complete and acknowledge a cycle. Alias for admit() — semantically
   * signals that the caller considers the cycle finished.
   */
  public complete(input: {
    claim: string;
    category?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
  }): MiniCycleResult {
    return this.admit(input);
  }

  /**
   * Stop the kernel. Transitions BOOTED → STOPPED.
   * After stopping, no more cycles can be admitted.
   */
  public stop(): void {
    if (this.state !== 'BOOTED') {
      throw new Error(`Cannot stop: kernel is in state '${this.state}' (expected 'BOOTED')`);
    }
    this.state = 'STOPPED';
  }

  /**
   * Produce a snapshot of the kernel's state.
   */
  public snapshot(): OSKernelSnapshot {
    return {
      state: this.state,
      totalCycles: this.totalCycles,
      passedCycles: this.passedCycles,
      failedCycles: this.failedCycles,
      memorySize: this.kernel.getMemorySize(),
      memoryIntegrity: this.kernel.verifyMemoryIntegrity(),
      snapshotAt: new Date().toISOString(),
    };
  }

  /**
   * Get the current state.
   */
  public getState(): OSKernelState {
    return this.state;
  }

  /**
   * Access the underlying MiniKernel.
   */
  public getKernel(): MiniKernel {
    return this.kernel;
  }
}

export default OperatingSystemKernel;
