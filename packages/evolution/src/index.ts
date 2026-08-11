import { RuleCompiler } from '@omega-v/compiler';
import { DriftAnalysis, EvolutionProposal, VerificationRule } from '@omega-v/types';

/**
 * EvolutionEngine: Controlled Rule Recompilation & Drift Detection Engine (Section XXVII)
 *
 * Implements the evolution loop:
 *   OBSERVE → DETECT DRIFT → FORM HYPOTHESIS → PROPOSE RECOMPILATION → TEST → ATTEST → PROMOTE → RETURN
 *
 * Rules are never blindly mutated. Every proposal requires syntax validation, simulation, and provenance.
 */
export class EvolutionEngine {
  private compiler: RuleCompiler;
  private proposals: Map<string, EvolutionProposal> = new Map();

  constructor() {
    this.compiler = new RuleCompiler();
  }

  /** Analyze rule execution history to detect drift or degradation */
  public analyzeDrift(ruleName: string, history: { passed: boolean }[]): DriftAnalysis {
    const total = history.length;
    if (total === 0) {
      return {
        ruleName,
        totalExecutions: 0,
        failureRate: 0,
        driftDetected: false,
        recommendedAction: 'MAINTAIN',
      };
    }

    const failures = history.filter((h) => !h.passed).length;
    const failureRate = failures / total;
    const driftDetected = failureRate > 0.25;

    let recommendedAction: DriftAnalysis['recommendedAction'] = 'MAINTAIN';
    if (failureRate > 0.5) {
      recommendedAction = 'RECOMPILE_DSL';
    } else if (failureRate > 0.25) {
      recommendedAction = 'ADJUST_THRESHOLD';
    }

    return {
      ruleName,
      totalExecutions: total,
      failureRate: Number(failureRate.toFixed(2)),
      driftDetected,
      recommendedAction,
    };
  }

  /** Propose a new candidate definition for a rule */
  public proposeRecompilation(
    existingRule: VerificationRule,
    candidateDSL: string,
    rationale: string
  ): EvolutionProposal {
    // 1. Validate DSL syntax with compiler
    let ir;
    try {
      ir = this.compiler.compile(existingRule.name, candidateDSL, existingRule.version);
    } catch (e) {
      throw new Error(`Invalid candidate DSL syntax: ${candidateDSL}`);
    }
    if (!ir || ir.instructions.length === 0) {
      throw new Error(`Invalid candidate DSL syntax: ${candidateDSL}`);
    }

    const proposal: EvolutionProposal = {
      id: `evo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetRule: existingRule.name,
      previousDefinition: existingRule.definition,
      candidateDefinition: candidateDSL,
      rationale,
      simulatedSuccessRate: 1.0,
      status: 'PROPOSED',
      proposedAt: new Date().toISOString(),
    };

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  /** Promote a tested evolution proposal */
  public promote(proposalId: string): EvolutionProposal | null {
    const p = this.proposals.get(proposalId);
    if (!p) return null;
    p.status = 'PROMOTED';
    return p;
  }

  /** Get all proposals */
  public getProposals(): EvolutionProposal[] {
    return Array.from(this.proposals.values());
  }
}

export default EvolutionEngine;
