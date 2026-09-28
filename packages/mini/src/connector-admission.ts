import type { OmegaWorkerMode } from '@oceanicos/types';

export interface OmegaConnectorDeclaration {
  readonly id: string;
  readonly version: string;
  readonly system: string;
  readonly capability: string;
  /** Reference to an auth configuration; never the secret itself. */
  readonly authRef: string;
  readonly scope: readonly string[];
  readonly mode: OmegaWorkerMode;
  readonly policyRefs: readonly string[];
  readonly stopCondition: string;
  readonly expectedObservation: string;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly rollbackSupported: boolean;
}

export interface OmegaConnectorAdmissionInput {
  readonly connector: OmegaConnectorDeclaration;
  /** Evidence supplied by an upstream authority/policy gate; never inferred here. */
  readonly authorityVerified: boolean;
  readonly policySatisfied: boolean;
  /** Required for external-consequence connectors. */
  readonly approvalVerified: boolean;
}

export type OmegaConnectorAdmissionDecision = 'ADMIT' | 'DENY' | 'REVIEW';

export interface OmegaConnectorAdmissionResult {
  readonly decision: OmegaConnectorAdmissionDecision;
  readonly admitted: boolean;
  readonly issues: readonly string[];
}

const supportedModes: readonly OmegaWorkerMode[] = [
  'read-only',
  'build-test',
  'local-mutating',
  'external-consequence',
];

const nonEmpty = (value: string): boolean => value.trim().length > 0;

const hasPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

/**
 * Validate and admit a connector declaration without authenticating or executing it.
 *
 * This is a fail-closed boundary between a connector catalog and runtime action.
 * `authRef` identifies configuration only; secret material never enters this API.
 */
export function admitOmegaConnector(
  input: OmegaConnectorAdmissionInput,
): OmegaConnectorAdmissionResult {
  const { connector } = input;
  const issues: string[] = [];

  if (!nonEmpty(connector.id)) issues.push('connector id must be non-empty');
  if (!nonEmpty(connector.version)) issues.push('connector version must be non-empty');
  if (!nonEmpty(connector.system)) issues.push('connector system must be non-empty');
  if (!nonEmpty(connector.capability)) issues.push('connector capability must be non-empty');
  if (!nonEmpty(connector.authRef)) issues.push('connector authRef must be a reference, not empty');
  if (connector.scope.length === 0 || connector.scope.some((entry) => !nonEmpty(entry))) {
    issues.push('connector scope must contain non-empty bounded entries');
  }
  if (!supportedModes.includes(connector.mode)) issues.push('connector mode is unsupported');
  if (connector.policyRefs.length === 0 || connector.policyRefs.some((entry) => !nonEmpty(entry))) {
    issues.push('connector policy references must be declared');
  }
  if (!nonEmpty(connector.stopCondition)) issues.push('connector stop condition must be declared');
  if (!nonEmpty(connector.expectedObservation)) issues.push('connector expected observation must be declared');
  if (!hasPositiveInteger(connector.timeoutMs)) issues.push('connector timeoutMs must be a positive integer');
  if (!hasPositiveInteger(connector.maxAttempts)) issues.push('connector maxAttempts must be a positive integer');

  if (!input.authorityVerified) issues.push('connector authority evidence is missing');
  if (!input.policySatisfied) issues.push('connector policy evidence is missing');
  if (connector.mode === 'external-consequence' && !input.approvalVerified) {
    issues.push('external-consequence connector requires explicit approval evidence');
  }

  if (issues.length > 0) {
    return { decision: input.authorityVerified && input.policySatisfied ? 'REVIEW' : 'DENY', admitted: false, issues };
  }

  return { decision: 'ADMIT', admitted: true, issues: [] };
}
