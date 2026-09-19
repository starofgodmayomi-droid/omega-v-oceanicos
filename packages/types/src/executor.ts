/**
 * C5 Executor Engine Core Type Definitions.
 *
 * Enforces sandboxed worker execution, before/after state diffing,
 * strict capability containment, and unforgeable execution receipt generation.
 */

import type { OmegaCommand, OmegaCommandResult } from './index.js';

export type ExecutionIsolationMode =
  | 'sandboxed'
  | 'container'
  | 'dry-run'
  | 'in-process';

export interface SandboxCapabilityBoundary {
  readonly allowlistedTargets: readonly string[];
  readonly allowNetwork: boolean;
  readonly allowFileSystemWrite: boolean;
  readonly maxDurationMs: number;
  readonly maxBufferBytes: number;
  readonly workingDirectory?: string;
}

export interface StateDeltaEntry {
  readonly path: string;
  readonly previousValue?: unknown;
  readonly nextValue?: unknown;
  readonly mutationType: 'ADDED' | 'MODIFIED' | 'DELETED';
}

export interface StateDiff {
  readonly stateBeforeHash: string;
  readonly stateAfterHash: string;
  readonly mutations: readonly StateDeltaEntry[];
  readonly summary: string;
}

export interface ExecutionReceipt {
  readonly executionId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'TIMEOUT' | 'REJECTED';
  readonly isolationMode: ExecutionIsolationMode;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly outputSummary: string;
  readonly stateDiff: StateDiff;
  readonly executedBy: string;
  readonly executionAttestationDigest: string;
  readonly timestamps: {
    readonly startedAt: string;
    readonly completedAt: string;
  };
  readonly rawResult?: OmegaCommandResult;
  readonly dissentNotes?: readonly string[];
}

export interface ExecutorOptions {
  readonly isolationMode?: ExecutionIsolationMode;
  readonly boundaryOverride?: Partial<SandboxCapabilityBoundary>;
  readonly signingKey?: string;
  readonly executorIdentity?: string;
}

export interface IOmegaExecutor {
  readonly isolationMode: ExecutionIsolationMode;
  execute(command: OmegaCommand, options?: ExecutorOptions): Promise<OmegaCommandResult>;
  executeWithReceipt(command: OmegaCommand, options?: ExecutorOptions): Promise<ExecutionReceipt>;
  calculateStateDiff(before: Record<string, unknown>, after: Record<string, unknown>): StateDiff;
}
