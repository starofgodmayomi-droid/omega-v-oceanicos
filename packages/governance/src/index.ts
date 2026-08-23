import { GovernanceRule, GovernanceDecision, GovernanceAction } from '@omega-v/types';

/**
 * Governance Engine: Implements Section XXIX (Governance)
 * Governance constrains power. Evaluates rules for system actions.
 */
export class GovernanceEngine {
  private rules: Map<string, GovernanceRule> = new Map();

  /**
   * Register a new governance rule
   */
  public registerRule(rule: GovernanceRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Request authorization for an action under governance constraints
   */
  public requestAction(
    action: GovernanceAction,
    requestedBy: string,
    context: { confidence?: number; risk?: number; [key: string]: unknown }
  ): GovernanceDecision {
    const applicableRules = Array.from(this.rules.values()).filter(
      (r) => r.action === action && r.active
    );

    if (applicableRules.length === 0) {
      // Fail closed: If no rule allows it, deny it.
      return this.createDecision(
        action,
        requestedBy,
        context,
        false,
        'No active governance rules permit this action.',
        false
      );
    }

    let requiresHumanApproval = false;
    let allowed = true;
    let reason = 'Action permitted by governance rules.';

    for (const rule of applicableRules) {
      if (rule.requiresHumanApproval) {
        requiresHumanApproval = true;
      }

      const confidence = context.confidence ?? 0;
      if (confidence < rule.minimumConfidenceThreshold) {
        allowed = false;
        reason = `Confidence (${confidence}) is below the required threshold (${rule.minimumConfidenceThreshold}).`;
        break;
      }

      const risk = context.risk ?? 1; // Default to max risk if unknown
      if (risk > rule.maximumRiskThreshold) {
        allowed = false;
        reason = `Risk (${risk}) exceeds the maximum threshold (${rule.maximumRiskThreshold}).`;
        break;
      }
    }

    if (allowed && requiresHumanApproval) {
      allowed = false;
      reason = 'Action requires human approval before proceeding.';
    }

    return this.createDecision(
      action,
      requestedBy,
      context,
      allowed,
      reason,
      requiresHumanApproval
    );
  }

  private createDecision(
    action: GovernanceAction,
    requestedBy: string,
    context: Record<string, unknown>,
    allowed: boolean,
    reason: string,
    requiresHumanApproval: boolean
  ): GovernanceDecision {
    return {
      id: `gov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      requestedBy,
      context,
      allowed,
      reason,
      requiresHumanApproval,
      decidedAt: new Date().toISOString(),
    };
  }
}

export default GovernanceEngine;
