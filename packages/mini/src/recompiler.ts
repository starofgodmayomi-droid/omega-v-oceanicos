import type {
  OmegaNextSliceProposal,
  OmegaLearningFeedback,
  OmegaCommand,
  OmegaCommandResult,
} from '@oceanicos/types';
import type { AttestationEntry } from './attestation-memory.js';
import type { OmegaCompileInput } from './compiler.js';

export interface ProposeNextSliceInput {
  readonly latestEntry?: AttestationEntry;
  readonly latestCommand?: OmegaCommand;
  readonly latestResult?: OmegaCommandResult;
  readonly feedback: OmegaLearningFeedback;
}

/**
 * C9: Omega Loop Recompiler & Next Slice Selector
 *
 * Implements:
 * REMEMBER → LEARN → RECOMPILE → NEXT ↺∞
 *
 * Evaluates execution attestations, reality reconciliation outcomes, and empirical
 * learning metrics to deterministically select the next highest-value authorized slice.
 */
export function proposeNextOmegaSlice(input: ProposeNextSliceInput): OmegaNextSliceProposal {
  const { latestEntry, latestCommand, latestResult, feedback } = input;
  const now = new Date().toISOString();

  // Case 1: Reality Divergence -> Must remediate
  const isDivergent =
    latestEntry?.realityVerdict === 'DIVERGENT' ||
    latestResult?.realityVerdict?.verdict === 'DIVERGENT';

  if (isDivergent) {
    const target =
      latestCommand?.irPlan?.observationSpec?.target ??
      latestResult?.observation?.target ??
      'system_state';
    const discSummary =
      latestEntry?.discrepancies?.join(', ') ||
      latestResult?.realityVerdict?.discrepancies?.join(', ') ||
      'state hash mismatch';

    return {
      sourceCommandId: latestCommand?.commandId ?? latestResult?.commandId ?? latestEntry?.changeId,
      trigger: 'REALITY_DIVERGENT',
      actionType: 'REMEDIATE',
      rationale: `Reality divergence observed on target '${target}'. Discrepancies: ${discSummary}. Must isolate divergence root cause before further mutation.`,
      proposedIntent: `Remediate state divergence on '${target}' and verify clean baseline.`,
      suggestedWorkers: ['observer', 'researcher', 'tester'],
      suggestedObservationType: 'git_working_tree',
      suggestedObservationTarget: target,
      urgency: 'elevated',
      generatedAt: now,
    };
  }

  // Case 2: Transition Refused -> Policy escalation or authorization
  const isRefused =
    latestEntry?.transitionStatus?.toUpperCase() === 'REFUSED' ||
    latestCommand?.status === 'DENIED' ||
    latestCommand?.status === 'REVIEW' ||
    latestResult?.status === 'DENIED';


  if (isRefused) {
    const intent = latestCommand?.prompt ?? 'transition';
    return {
      sourceCommandId: latestCommand?.commandId ?? latestResult?.commandId ?? latestEntry?.changeId,
      trigger: 'TRANSITION_REFUSED',
      actionType: 'POLICY_ESCALATION',
      rationale: `Transition execution was refused by fail-closed admission gate. Operator approval or policy clearance required.`,
      proposedIntent: `Review security policies and operator clearances for: ${intent.slice(0, 80)}.`,
      suggestedWorkers: ['governance-reviewer', 'security-reviewer', 'planner'],
      suggestedObservationType: 'api_health',
      suggestedObservationTarget: 'api_health',
      urgency: 'critical',
      generatedAt: now,
    };
  }

  // Case 3: Reality Verified -> Advance next milestone
  const isVerified =
    latestEntry?.realityVerdict === 'VERIFIED' ||
    latestResult?.realityVerdict?.verdict === 'VERIFIED';

  if (isVerified) {
    const prevGoal = latestCommand?.prompt ?? latestResult?.outputSummary ?? 'milestone';
    return {
      sourceCommandId: latestCommand?.commandId ?? latestResult?.commandId ?? latestEntry?.changeId,
      trigger: 'REALITY_VERIFIED',
      actionType: 'ADVANCE',
      rationale: `Physical reality matches claimed transition. System reliability score is ${feedback.reliabilityScore}. Ready for next progression slice.`,
      proposedIntent: `Advance next operational slice following verified execution of: ${prevGoal.slice(0, 80)}.`,
      suggestedWorkers: ['planner', 'tester', 'observer'],
      suggestedObservationType: 'build_test',
      suggestedObservationTarget: 'build_test',
      urgency: 'routine',
      generatedAt: now,
    };
  }

  // Case 4: Default / Routine Initiative
  return {
    sourceCommandId: latestCommand?.commandId ?? latestResult?.commandId,
    trigger: 'OPERATOR_INITIATIVE',
    actionType: 'ADVANCE',
    rationale: 'Establishing operational baseline and executing routine verification scan.',
    proposedIntent: 'Inspect operational environment and verify core system health.',
    suggestedWorkers: ['observer', 'tester'],
    suggestedObservationType: 'api_health',
    suggestedObservationTarget: 'api_health',
    urgency: 'routine',
    generatedAt: now,
  };
}

/**
 * Compile a proposed slice directly into an executable OmegaCompileInput for C1 compiler.
 * Closes the loop from C9 back to C1.
 */
export function compileNextLoopIntent(proposal: OmegaNextSliceProposal): OmegaCompileInput {
  return {
    intent: proposal.proposedIntent,
    subject: proposal.suggestedObservationTarget,
    stateBefore: 'current_verified_tip',
    evidenceRefs: [
      {
        id: `ev-next-${Date.now()}`,
        kind: 'proposal_trigger',
        source: proposal.trigger,
      },
    ],
    policyRefs: [
      {
        id: 'pol-omega-loop-v1',
        version: '1.0.0',
        requirement: 'All operational loop transitions must be observable and verifiable.',
      },
    ],
    workerPlan: proposal.suggestedWorkers.map((role) => ({
      workerId: `omega-worker-${role}`,
      version: '1.0.0',
      capability: role,
      mode: 'read-only' as const,
      approvalRequired: false,
    })),
    transition: {
      requestedStateAfter: 'next_slice_executed',
      consequence: proposal.rationale,
      dryRun: false,
    },
    observation: {
      observerId: 'omega-reality-observer',
      targets: [proposal.suggestedObservationTarget],
      evidenceRequired: ['state_hash', 'timestamp'],
    },
  };
}

