export type OmegaWorkerMode =
  | 'read-only'
  | 'build-test'
  | 'local-mutating'
  | 'external-consequence';

export interface OmegaWorkerCapability {
  readonly id: string;
  readonly version: string;
  readonly role: string;
  readonly mode: OmegaWorkerMode;
  readonly description: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly authorityRequired: boolean;
  readonly approvalRequired: boolean;
  readonly policyRefs: readonly string[];
  readonly evidenceRequired: readonly string[];
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
  readonly retries: number;
  readonly dryRunSupported: boolean;
  readonly rollbackSupported: boolean;
}

export interface OmegaWorkerRegistry {
  readonly version: 'omega-workers.v1';
  readonly workers: readonly OmegaWorkerCapability[];
}

export interface OmegaWorkerRegistryIssue {
  readonly path: string;
  readonly message: string;
}
