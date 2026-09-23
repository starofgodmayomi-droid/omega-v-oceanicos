import type { OmegaCommandStatus, OmegaWorkerId } from './omega-command.js';

export const OMEGA_JOB_VERSION = 'omega.job.v1' as const;

export type OmegaJobMode = 'sequential' | 'parallel';
export type OmegaJobStatus =
  | 'REVIEW'
  | 'AUTHORIZED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'PARTIAL'
  | 'DIVERGENT'
  | 'UNKNOWN'
  | 'FAILED';

export interface OmegaJobStep {
  readonly stepId: string;
  readonly intent: string;
  readonly worker: OmegaWorkerId;
  readonly commandId: string;
  readonly status: OmegaCommandStatus;
  readonly execution?: {
    readonly stateAfter: string;
    readonly consequence: string;
    readonly attestationId: string;
  };
  readonly reality?: {
    readonly observedState: string;
    readonly evidence: string;
    readonly classification: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
    readonly observedAt: string;
  };
}

export interface OmegaJob {
  readonly version: typeof OMEGA_JOB_VERSION;
  readonly jobId: string;
  readonly requestedBy: string;
  readonly intent: string;
  readonly mode: OmegaJobMode;
  readonly status: OmegaJobStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedBy: string | null;
  readonly steps: readonly OmegaJobStep[];
  readonly limitations: readonly string[];
  readonly redacted: true;
}

export interface OmegaJobEvent {
  readonly sequence: number;
  readonly jobId: string;
  readonly type:
    | 'job.proposed'
    | 'job.approved'
    | 'job.started'
    | 'job.completed'
    | 'job.observed'
    | 'job.failed';
  readonly at: string;
  readonly status: OmegaJobStatus;
  readonly detail: string;
}
