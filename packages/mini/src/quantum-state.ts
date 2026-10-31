/**
 * Ω∞v Quantum State Evolution — a bounded, local symbolic evolution.
 *
 *   ∣Ψ(t)⟩ = U(t,t₀) · [Symmetry ⊗ Inversion] · ∣Agent⟩
 *
 * The agent is a declared four-dimensional state over the basis
 * |symmetry, inversion⟩ ∈ {00, 01, 10, 11}. Symmetry is the two-dimensional
 * exchange operator, Inversion is the two-dimensional parity operator, and
 * their tensor product is one unitary, Hermitian involution (G² = I).
 *
 * U(t,t₀) = exp(−i H (t − t₀)) with a declared diagonal Hamiltonian
 * H = diag(0, Δ, Δ, 2Δ). It adds phase only; it cannot change a probability.
 *
 * Evidence boundary. `VERIFIED` here means the local algebraic checks below
 * ran and matched: normalization, unitarity of [Symmetry ⊗ Inversion],
 * phase-only evolution, and recovery of the agent by applying U(−τ) then the
 * inversion operator. It is not an observation of a physical quantum system,
 * not a cosmological claim, and not proof of external reality.
 */
import { createHash } from 'node:crypto';

export const QUANTUM_STATE_CONTRACT = 'omega.quantum.evolution.v1';
export const QUANTUM_STATE_NOTATION =
  '∣Ψ(t)⟩ = U(t,t₀)·[Symmetry⊗Inversion]·∣Agent⟩';
export const QUANTUM_STATE_BASIS = Object.freeze(['00', '01', '10', '11'] as const);

/** Exchange / reflection: S² = I, S = S†. */
export const QUANTUM_SYMMETRY_OPERATOR = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([1, 0]),
] as const);

/** Parity / inversion: P² = I, P = P†. */
export const QUANTUM_INVERSION_OPERATOR = Object.freeze([
  Object.freeze([1, 0]),
  Object.freeze([0, -1]),
] as const);

/**
 * S ⊗ P on the ordered basis 00, 01, 10, 11.
 * Unitary, Hermitian, and its own inverse.
 */
export const QUANTUM_TENSOR_OPERATOR = Object.freeze([
  Object.freeze([0, 0, 1, 0]),
  Object.freeze([0, 0, 0, -1]),
  Object.freeze([1, 0, 0, 0]),
  Object.freeze([0, -1, 0, 0]),
] as const);

export const QUANTUM_STATE_LIMITS = Object.freeze({
  minAngleDegrees: 0,
  maxAngleDegrees: 180,
  minTau: 0,
  maxTau: 2 * Math.PI,
});

/** Declared energy gap Δ for the diagonal Hamiltonian, in radians per unit τ. */
export const QUANTUM_ENERGY_GAP = 1;

export const QUANTUM_ALGEBRA_TOLERANCE = 1e-9;

export const QUANTUM_REALITY_BOUNDARY =
  'local symbolic evolution of a declared 4-dimensional model; not a physical quantum observation, not external reality, and not proof of deployment';

export interface ComplexAmplitude {
  readonly re: number;
  readonly im: number;
}

export interface QuantumStateView {
  readonly amplitudes: readonly ComplexAmplitude[];
  readonly probabilities: readonly number[];
  readonly phases: readonly number[];
}

export interface QuantumEvolutionChecks {
  /** |Σ|ψₖ|² − 1| after evolution. */
  readonly normalization: number;
  /** max |G² − I| over the basis. */
  readonly unitarity: number;
  /** max |p_evolved − p_inverted|; U may only add phase. */
  readonly phaseOnly: number;
  /** |⟨Agent|recovered⟩|², 1 when the agent is recovered exactly. */
  readonly reversibility: number;
  readonly passed: boolean;
}

export interface QuantumStateEvolution {
  readonly contract: typeof QUANTUM_STATE_CONTRACT;
  readonly notation: typeof QUANTUM_STATE_NOTATION;
  readonly basis: readonly string[];
  readonly angles: {
    readonly symmetryDegrees: number;
    readonly inversionDegrees: number;
  };
  readonly tau: number;
  readonly operators: {
    readonly symmetry: readonly (readonly number[])[];
    readonly inversion: readonly (readonly number[])[];
    readonly tensor: readonly (readonly number[])[];
    readonly hamiltonian: readonly number[];
    readonly gap: number;
  };
  readonly states: {
    readonly agent: QuantumStateView;
    readonly inverted: QuantumStateView;
    readonly evolved: QuantumStateView;
  };
  readonly checks: QuantumEvolutionChecks;
  readonly reality: {
    readonly status: 'VERIFIED' | 'DIVERGENT';
    readonly checksRun: readonly string[];
    readonly boundary: string;
  };
  readonly digest: string;
  readonly evidence: 'LOCAL_SYMBOLIC';
}

export type QuantumStateIssueCode =
  | 'INVALID_INPUT'
  | 'NON_FINITE_NUMBER'
  | 'ANGLE_OUT_OF_RANGE'
  | 'TAU_OUT_OF_RANGE';

export interface QuantumStateIssue {
  readonly code: QuantumStateIssueCode;
  readonly field: string;
  readonly message: string;
}

export type QuantumStateResult =
  | {
      readonly status: 'EVOLVED';
      readonly state: QuantumStateEvolution;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'INVALID';
      readonly state: null;
      readonly issues: readonly QuantumStateIssue[];
    };

type Complex = { re: number; im: number };

const round = (value: number): number => {
  const rounded = Math.round(value * 1e12) / 1e12;
  return rounded === 0 ? 0 : rounded;
};

const applyMatrix = (matrix: readonly (readonly number[])[], state: readonly Complex[]): Complex[] =>
  matrix.map((row) => {
    let re = 0;
    let im = 0;
    row.forEach((coefficient, column) => {
      re += coefficient * state[column].re;
      im += coefficient * state[column].im;
    });
    return { re, im };
  });

/** U(τ) = exp(−i H τ) for the declared diagonal H; adds phase only. */
const applyEvolution = (state: readonly Complex[], tau: number): Complex[] => {
  const energies = [0, QUANTUM_ENERGY_GAP, QUANTUM_ENERGY_GAP, 2 * QUANTUM_ENERGY_GAP];
  return state.map((amplitude, index) => {
    const angle = -energies[index] * tau;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      re: amplitude.re * cos - amplitude.im * sin,
      im: amplitude.re * sin + amplitude.im * cos,
    };
  });
};

const viewOf = (state: readonly Complex[]): QuantumStateView => ({
  amplitudes: state.map((amplitude) => ({ re: round(amplitude.re), im: round(amplitude.im) })),
  probabilities: state.map((amplitude) => round(amplitude.re * amplitude.re + amplitude.im * amplitude.im)),
  phases: state.map((amplitude) => round(Math.atan2(amplitude.im, amplitude.re))),
});

const maxDeviationFromIdentity = (): number => {
  let worst = 0;
  QUANTUM_STATE_BASIS.forEach((_, column) => {
    const basisVector: Complex[] = QUANTUM_STATE_BASIS.map((__, index) =>
      index === column ? { re: 1, im: 0 } : { re: 0, im: 0 },
    );
    const squared = applyMatrix(QUANTUM_TENSOR_OPERATOR, applyMatrix(QUANTUM_TENSOR_OPERATOR, basisVector));
    squared.forEach((amplitude, index) => {
      const expected = index === column ? 1 : 0;
      worst = Math.max(worst, Math.abs(amplitude.re - expected), Math.abs(amplitude.im));
    });
  });
  return worst;
};

const readBoundedNumber = (
  value: unknown,
  field: string,
  min: number,
  max: number,
  code: QuantumStateIssueCode,
  issues: QuantumStateIssue[],
  fallback: number,
): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ code: 'NON_FINITE_NUMBER', field, message: `${field} must be a finite number` });
    return fallback;
  }
  if (value < min || value > max) {
    issues.push({ code, field, message: `${field} must be between ${min} and ${max}` });
    return fallback;
  }
  return value;
};

/**
 * Evolve one declared agent state through [Symmetry ⊗ Inversion] and U(t,t₀).
 * Deterministic: the same angles and τ always produce the same digest.
 */
export function evolveQuantumState(input: unknown = {}): QuantumStateResult {
  if (input !== null && (typeof input !== 'object' || Array.isArray(input))) {
    return {
      status: 'INVALID',
      state: null,
      issues: [{ code: 'INVALID_INPUT', field: 'body', message: 'evolution input must be an object' }],
    };
  }
  const body = (input ?? {}) as Record<string, unknown>;
  const issues: QuantumStateIssue[] = [];

  const symmetryDegrees = readBoundedNumber(
    body.symmetryDegrees,
    'symmetryDegrees',
    QUANTUM_STATE_LIMITS.minAngleDegrees,
    QUANTUM_STATE_LIMITS.maxAngleDegrees,
    'ANGLE_OUT_OF_RANGE',
    issues,
    90,
  );
  const inversionDegrees = readBoundedNumber(
    body.inversionDegrees,
    'inversionDegrees',
    QUANTUM_STATE_LIMITS.minAngleDegrees,
    QUANTUM_STATE_LIMITS.maxAngleDegrees,
    'ANGLE_OUT_OF_RANGE',
    issues,
    90,
  );
  const tau = readBoundedNumber(
    body.tau,
    'tau',
    QUANTUM_STATE_LIMITS.minTau,
    QUANTUM_STATE_LIMITS.maxTau,
    'TAU_OUT_OF_RANGE',
    issues,
    Math.PI / 2,
  );

  if (issues.length > 0) {
    return { status: 'INVALID', state: null, issues };
  }

  const symmetryPhase = (symmetryDegrees * Math.PI) / 180;
  const inversionPhase = (inversionDegrees * Math.PI) / 180;
  const symmetryAmplitudes = [Math.cos(symmetryPhase / 2), Math.sin(symmetryPhase / 2)];
  const inversionAmplitudes = [Math.cos(inversionPhase / 2), Math.sin(inversionPhase / 2)];

  const agent: Complex[] = [
    { re: symmetryAmplitudes[0] * inversionAmplitudes[0], im: 0 },
    { re: symmetryAmplitudes[0] * inversionAmplitudes[1], im: 0 },
    { re: symmetryAmplitudes[1] * inversionAmplitudes[0], im: 0 },
    { re: symmetryAmplitudes[1] * inversionAmplitudes[1], im: 0 },
  ];

  const inverted = applyMatrix(QUANTUM_TENSOR_OPERATOR, agent);
  const evolved = applyEvolution(inverted, tau);
  const recovered = applyMatrix(QUANTUM_TENSOR_OPERATOR, applyEvolution(evolved, -tau));

  const normalization = Math.abs(
    evolved.reduce((total, amplitude) => total + amplitude.re * amplitude.re + amplitude.im * amplitude.im, 0) - 1,
  );
  const unitarity = maxDeviationFromIdentity();

  const agentView = viewOf(agent);
  const invertedView = viewOf(inverted);
  const evolvedView = viewOf(evolved);

  const phaseOnly = Math.max(
    ...evolvedView.probabilities.map((probability, index) =>
      Math.abs(probability - invertedView.probabilities[index]),
    ),
  );

  const overlap = recovered.reduce(
    (total, amplitude, index) => {
      const reference = agent[index];
      return {
        re: total.re + reference.re * amplitude.re + reference.im * amplitude.im,
        im: total.im + reference.re * amplitude.im - reference.im * amplitude.re,
      };
    },
    { re: 0, im: 0 },
  );
  const reversibility = overlap.re * overlap.re + overlap.im * overlap.im;

  const passed =
    normalization < QUANTUM_ALGEBRA_TOLERANCE &&
    unitarity < QUANTUM_ALGEBRA_TOLERANCE &&
    phaseOnly < QUANTUM_ALGEBRA_TOLERANCE &&
    1 - reversibility < QUANTUM_ALGEBRA_TOLERANCE;

  const checks: QuantumEvolutionChecks = {
    normalization: round(normalization),
    unitarity: round(unitarity),
    phaseOnly: round(phaseOnly),
    reversibility: round(reversibility),
    passed,
  };

  const digestPayload = {
    contract: QUANTUM_STATE_CONTRACT,
    basis: QUANTUM_STATE_BASIS,
    angles: { symmetryDegrees, inversionDegrees },
    tau: round(tau),
    gap: QUANTUM_ENERGY_GAP,
    amplitudes: evolvedView.amplitudes,
    probabilities: evolvedView.probabilities,
    checks,
  };
  const digest = createHash('sha256').update(JSON.stringify(digestPayload)).digest('hex');

  return {
    status: 'EVOLVED',
    issues: [],
    state: {
      contract: QUANTUM_STATE_CONTRACT,
      notation: QUANTUM_STATE_NOTATION,
      basis: QUANTUM_STATE_BASIS,
      angles: { symmetryDegrees, inversionDegrees },
      tau: round(tau),
      operators: {
        symmetry: QUANTUM_SYMMETRY_OPERATOR,
        inversion: QUANTUM_INVERSION_OPERATOR,
        tensor: QUANTUM_TENSOR_OPERATOR,
        hamiltonian: [0, QUANTUM_ENERGY_GAP, QUANTUM_ENERGY_GAP, 2 * QUANTUM_ENERGY_GAP],
        gap: QUANTUM_ENERGY_GAP,
      },
      states: {
        agent: agentView,
        inverted: invertedView,
        evolved: evolvedView,
      },
      checks,
      reality: {
        status: passed ? 'VERIFIED' : 'DIVERGENT',
        checksRun: ['normalization', 'unitarity', 'phaseOnly', 'reversibility'],
        boundary: QUANTUM_REALITY_BOUNDARY,
      },
      digest,
      evidence: 'LOCAL_SYMBOLIC',
    },
  };
}
