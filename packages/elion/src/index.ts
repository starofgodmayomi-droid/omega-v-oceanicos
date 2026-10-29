/**
 * ELION — the Hands of the Ω∞v body.
 *
 * ELION runs a bounded plan only when a named human authorized it and admission was
 * granted. It reports `EXECUTED_NOT_VERIFIED`: doing the work is not evidence that the
 * work succeeded. Reconciliation belongs to OMEGA (`packages/omega`).
 *
 * ```text
 * AUTHORIZED BY HUMAN + ADMITTED → RUN → EXECUTED_NOT_VERIFIED
 * anything else                  → NOT_EXECUTED (fail closed)
 * ```
 */

export type ElionStatus = 'EXECUTED_NOT_VERIFIED' | 'NOT_EXECUTED';

export interface ElionAuthorization {
  /** The person who authorized the action. Empty means no authority. */
  authorizedBy: string;
  /** Admission outcome from the bounded gate. Anything but `true` fails closed. */
  admitted: boolean;
  /** What this authority covers, so it cannot be stretched to other work. */
  scope: string;
}

export interface ElionPlan<T> {
  id: string;
  description: string;
  run: () => T | Promise<T>;
}

export interface ElionExecution<T> {
  readonly id: string;
  readonly description: string;
  readonly status: ElionStatus;
  readonly authorization: { authorizedBy: string; scope: string } | null;
  readonly output?: T;
  readonly reason?: string;
  /** ELION never returns a verdict. Only OMEGA can. */
  readonly verification: 'PENDING_OMEGA';
  readonly executedAt: string;
}

const refusal = <T>(
  plan: ElionPlan<T>,
  reason: string
): ElionExecution<T> => ({
  id: plan.id,
  description: plan.description,
  status: 'NOT_EXECUTED',
  authorization: null,
  reason,
  verification: 'PENDING_OMEGA',
  executedAt: new Date().toISOString(),
});

/**
 * Run one bounded plan under an explicit authorization.
 *
 * Refuses on: missing human authority, admission not granted, or an empty scope. A
 * handler that throws is reported as NOT_EXECUTED with the thrown message, never as a
 * partial success.
 */
export async function executeBoundedAction<T>(
  plan: ElionPlan<T>,
  authorization: ElionAuthorization
): Promise<ElionExecution<T>> {
  const authorizedBy = authorization.authorizedBy.trim();
  const scope = authorization.scope.trim();

  if (authorizedBy.length === 0) {
    return refusal(plan, 'human authority required: authorizedBy was empty');
  }
  if (authorization.admitted !== true) {
    return refusal(plan, 'admission not granted: the bounded gate did not admit this plan');
  }
  if (scope.length === 0) {
    return refusal(plan, 'authority scope required: admitted without a stated scope');
  }

  try {
    const output = await plan.run();
    return {
      id: plan.id,
      description: plan.description,
      status: 'EXECUTED_NOT_VERIFIED',
      authorization: { authorizedBy, scope },
      output,
      verification: 'PENDING_OMEGA',
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ...refusal(plan, `handler threw: ${reason}`),
      authorization: { authorizedBy, scope },
    };
  }
}
