/**
 * ELION — the Hands of the Ω∞v body.
 *
 * ELION executes only what a human explicitly authorized, then hands the
 * result to OMEGA for reconciliation. Without a complete, named authorization
 * the handler is never called. Execution is not proof of desired reality.
 */
import { reconcile } from '@oceanicos/omega';
import type { GateResult } from '@oceanicos/omega';

export type ElionStatus = 'EXECUTED' | 'REFUSED' | 'FAILED' | 'DIVERGENT' | 'UNKNOWN';

export interface HumanAuthorization {
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly scope: string;
}

export interface ElionResult<T> {
  readonly status: ElionStatus;
  readonly executed: boolean;
  readonly verified: boolean;
  readonly observed?: T;
  readonly verification: GateResult | null;
  readonly reason: string;
}

export interface ElionRequest<T> {
  readonly intent: string;
  readonly handler: () => T | Promise<T>;
  readonly authorization?: HumanAuthorization;
  /** When declared, the handler's output is reconciled against it. */
  readonly expected?: unknown;
}

const isAuthorization = (value: unknown): value is HumanAuthorization => {
  if (value === null || typeof value !== 'object') return false;
  const authorization = value as HumanAuthorization;
  return [authorization.approvedBy, authorization.approvedAt, authorization.scope].every(
    (field) => typeof field === 'string' && field.trim().length > 0,
  );
};

export const executeAuthorized = async <T>(
  request: ElionRequest<T>,
): Promise<ElionResult<T>> => {
  if (!isAuthorization(request.authorization)) {
    return {
      status: 'REFUSED',
      executed: false,
      verified: false,
      verification: null,
      reason:
        'HUMAN_AUTHORITY_REQUIRED: approvedBy, approvedAt, and scope must all be declared. The handler was not called.',
    };
  }

  let observed: T;
  try {
    observed = await request.handler();
  } catch (error) {
    return {
      status: 'FAILED',
      executed: true,
      verified: false,
      verification: null,
      reason: `HANDLER_THREW: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (request.expected === undefined) {
    return {
      status: 'EXECUTED',
      executed: true,
      verified: false,
      observed,
      verification: null,
      reason: 'Executed. No expected value was declared, so nothing was reconciled.',
    };
  }

  const verification = reconcile(request.expected, observed);
  const status: ElionStatus =
    verification.status === 'VERIFIED'
      ? 'EXECUTED'
      : verification.status === 'DIVERGENT'
        ? 'DIVERGENT'
        : 'UNKNOWN';

  return {
    status,
    executed: true,
    verified: verification.status === 'VERIFIED',
    observed,
    verification,
    reason: verification.reason,
  };
};
