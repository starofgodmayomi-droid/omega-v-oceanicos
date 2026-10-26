/**
 * Validation-only reading of the supplied Autopus × Omega × Oceanicos root equation.
 * Reading it does not evolve a system, connect a model, grant authority, or verify a claim.
 */

export const ROOT_EQUATION_ID = 'autopus-omega-oceanicos-root-2026-10-26' as const;

export const ROOT_EQUATION_LAYERS = Object.freeze([
  'experience',
  'intelligence',
  'orchestration',
  'integration',
  'runtime',
  'data-knowledge',
  'verification',
  'security-governance',
  'operations',
  'value',
  'evolution',
] as const);

export const ROOT_EQUATION_STEPS = Object.freeze([
  'INTENT',
  'CONTEXT',
  'REASON',
  'PLAN',
  'AUTHORIZE',
  'ORCHESTRATE',
  'EXECUTE',
  'VERIFY',
  'VALUE',
  'LEARN',
  'NEXT_STATE',
] as const);

export type RootEquationLayer = (typeof ROOT_EQUATION_LAYERS)[number];
export type RootEquationStep = (typeof ROOT_EQUATION_STEPS)[number];

const steps = new Set<string>(ROOT_EQUATION_STEPS);
const fields = new Set(['step', 'autonomyRequested', 'authorityGranted', 'claim', 'evidenceRef', 'measurableValue']);

export interface RootEquationReading {
  readonly equationId: typeof ROOT_EQUATION_ID;
  readonly execution: 'NOT_STARTED';
  readonly evidence: 'SUPPLIED_SOURCE_ONLY';
  readonly invariants: {
    readonly autonomyAtMostGrantedAuthority: true;
    readonly claimsAtMostVerifiedEvidence: true;
    readonly everyActionNamesMeasurableValue: true;
  };
  readonly factors: {
    readonly lightIntelligence: 'SYMBOL';
    readonly lightSpirit: 'SYMBOL';
    readonly autopus: 'NOT_A_RUNTIME';
    readonly omega: 'GOVERNANCE_CONTRACT';
    readonly oceanicOs: 'EXPERIENCE_CONTRACT';
    readonly connectedAi: 'UNKNOWN_UNTIL_OBSERVED';
  };
  readonly layers: typeof ROOT_EQUATION_LAYERS;
  readonly steps: typeof ROOT_EQUATION_STEPS;
}

export type RootEquationDenyReason =
  | 'INVALID_SHAPE'
  | 'UNSUPPORTED_FIELD'
  | 'UNKNOWN_STEP'
  | 'AUTONOMY_EXCEEDS_AUTHORITY'
  | 'CLAIM_EXCEEDS_EVIDENCE'
  | 'VALUE_NOT_NAMED';

export type RootEquationAdmission =
  | {
      readonly decision: 'ALLOW_RECORD_ONLY';
      readonly execution: 'NOT_STARTED';
      readonly verification: 'NOT_PERFORMED';
      readonly step: RootEquationStep;
    }
  | {
      readonly decision: 'DENY';
      readonly execution: 'NOT_STARTED';
      readonly verification: 'NOT_PERFORMED';
      readonly reason: RootEquationDenyReason;
    };

const deny = (reason: RootEquationDenyReason): RootEquationAdmission => ({
  decision: 'DENY',
  execution: 'NOT_STARTED',
  verification: 'NOT_PERFORMED',
  reason,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function readRootEquation(): RootEquationReading {
  return Object.freeze({
    equationId: ROOT_EQUATION_ID,
    execution: 'NOT_STARTED',
    evidence: 'SUPPLIED_SOURCE_ONLY',
    invariants: Object.freeze({
      autonomyAtMostGrantedAuthority: true,
      claimsAtMostVerifiedEvidence: true,
      everyActionNamesMeasurableValue: true,
    }),
    factors: Object.freeze({
      lightIntelligence: 'SYMBOL',
      lightSpirit: 'SYMBOL',
      autopus: 'NOT_A_RUNTIME',
      omega: 'GOVERNANCE_CONTRACT',
      oceanicOs: 'EXPERIENCE_CONTRACT',
      connectedAi: 'UNKNOWN_UNTIL_OBSERVED',
    }),
    layers: ROOT_EQUATION_LAYERS,
    steps: ROOT_EQUATION_STEPS,
  });
}

/**
 * Admit a proposed step as a record only.
 * `ALLOW_RECORD_ONLY` means the shape respects the three invariants.
 * It is not execution, not verification, and not authority to act.
 */
export function admitRootEquationAction(input: unknown): RootEquationAdmission {
  if (!isRecord(input)) return deny('INVALID_SHAPE');
  const keys = Object.keys(input);
  if (keys.some((key) => !fields.has(key))) return deny('UNSUPPORTED_FIELD');
  if (keys.length !== fields.size) return deny('INVALID_SHAPE');

  const step = input.step;
  if (typeof step !== 'string' || !steps.has(step)) return deny('UNKNOWN_STEP');
  if (typeof input.autonomyRequested !== 'boolean' || typeof input.authorityGranted !== 'boolean') {
    return deny('INVALID_SHAPE');
  }
  if (typeof input.claim !== 'string' || typeof input.measurableValue !== 'string') return deny('INVALID_SHAPE');
  if (input.evidenceRef !== null && typeof input.evidenceRef !== 'string') return deny('INVALID_SHAPE');

  if (input.autonomyRequested && !input.authorityGranted) return deny('AUTONOMY_EXCEEDS_AUTHORITY');

  const claim = input.claim.trim();
  const evidence = typeof input.evidenceRef === 'string' ? input.evidenceRef.trim() : '';
  if (claim.length > 500 || evidence.length > 200) return deny('INVALID_SHAPE');
  if (claim.length > 0 && evidence.length === 0) return deny('CLAIM_EXCEEDS_EVIDENCE');

  const value = input.measurableValue.trim();
  if (value.length < 1 || value.length > 280) return deny('VALUE_NOT_NAMED');

  return {
    decision: 'ALLOW_RECORD_ONLY',
    execution: 'NOT_STARTED',
    verification: 'NOT_PERFORMED',
    step: step as RootEquationStep,
  };
}
