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

export const MAX_CONNECTOR_TIMEOUT_MS = 10_000;
export const MAX_CONNECTOR_ATTEMPTS = 3;

const supportedModes: readonly OmegaWorkerMode[] = [
  'read-only',
  'build-test',
  'local-mutating',
  'external-consequence',
];

const nonEmpty = (value: string): boolean => value.trim().length > 0;

const isBoundedPositiveInteger = (value: number, max: number): boolean =>
  Number.isSafeInteger(value) && value > 0 && value <= max;

const broadScope = (value: string): boolean => ['*', 'all', '/**'].includes(value.trim().toLowerCase());

const looksLikeInlineSecret = (value: string): boolean =>
  /^(sk-|ghp_|github_pat_|akia[0-9a-z]{16}|bearer\s)/i.test(value.trim());

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
  if (connector.scope.some(broadScope)) {
    issues.push('connector scope must not use an unbounded wildcard');
  }
  if (/\s/.test(connector.authRef.trim()) || looksLikeInlineSecret(connector.authRef)) {
    issues.push('connector authRef must identify secret configuration without containing secret material');
  }
  if (!supportedModes.includes(connector.mode)) issues.push('connector mode is unsupported');
  if (connector.policyRefs.length === 0 || connector.policyRefs.some((entry) => !nonEmpty(entry))) {
    issues.push('connector policy references must be declared');
  }
  if (!nonEmpty(connector.stopCondition)) issues.push('connector stop condition must be declared');
  if (!nonEmpty(connector.expectedObservation)) issues.push('connector expected observation must be declared');
  if (!isBoundedPositiveInteger(connector.timeoutMs, MAX_CONNECTOR_TIMEOUT_MS)) {
    issues.push(`connector timeoutMs must be an integer from 1 to ${MAX_CONNECTOR_TIMEOUT_MS}`);
  }
  if (!isBoundedPositiveInteger(connector.maxAttempts, MAX_CONNECTOR_ATTEMPTS)) {
    issues.push(`connector maxAttempts must be an integer from 1 to ${MAX_CONNECTOR_ATTEMPTS}`);
  }

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
