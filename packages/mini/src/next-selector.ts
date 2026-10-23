/**
 * Finite selector for the continuum next-step formula.
 *
 *   NEXT = argmax_{Δ ∈ Authorized} EvidenceBackedValue(Δ) / (Risk(Δ) + Cost(Δ) + ε)
 *
 * Inputs are caller-supplied estimates. This function does not observe evidence,
 * grant authority, or execute the selected delta.
 */

export const NEXT_SELECTOR_EPSILON = 1e-9;
export const MAX_NEXT_CANDIDATES = 32;
const MAX_ESTIMATE = 1e15;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const CANDIDATE_FIELDS = new Set(['id', 'authorized', 'evidenceBackedValue', 'risk', 'cost']);
const REQUEST_FIELDS = new Set(['candidates', 'epsilon']);

export interface NextCandidate {
  readonly id: string;
  readonly authorized: boolean;
  readonly evidenceBackedValue: number;
  readonly risk: number;
  readonly cost: number;
}

export type NextSelectionStatus = 'SELECTED' | 'STOP';

export type NextSelectionIssueCode =
  | 'INVALID_REQUEST_SHAPE'
  | 'REQUEST_INSPECTION_FAILED'
  | 'UNSUPPORTED_FIELD'
  | 'INVALID_EPSILON'
  | 'INVALID_CANDIDATE_LIST'
  | 'INVALID_CANDIDATE_SHAPE'
  | 'INVALID_ID'
  | 'DUPLICATE_ID'
  | 'INVALID_AUTHORITY_FLAG'
  | 'INVALID_ESTIMATE'
  | 'NON_FINITE_SCORE';

export interface NextSelectionIssue {
  readonly code: NextSelectionIssueCode;
  readonly field: string;
  readonly message: string;
}

interface RankedCandidate {
  readonly id: string;
  readonly score: number;
}

interface SelectedNext {
  readonly status: 'SELECTED';
  readonly execution: 'NOT_STARTED';
  readonly evidence: 'CALLER_SUPPLIED_ESTIMATES';
  readonly authority: 'selection-is-not-permission';
  readonly meaning: 'one-next-or-stop';
  readonly epsilon: number;
  readonly selected: NextCandidate;
  readonly score: number;
  readonly considered: number;
  readonly excludedUnauthorized: number;
  readonly ranking: readonly RankedCandidate[];
  readonly issues: readonly [];
}

interface StoppedNext {
  readonly status: 'STOP';
  readonly execution: 'NOT_STARTED';
  readonly evidence: 'CALLER_SUPPLIED_ESTIMATES';
  readonly authority: 'selection-is-not-permission';
  readonly meaning: 'one-next-or-stop';
  readonly epsilon: number;
  readonly selected: null;
  readonly score: null;
  readonly considered: number;
  readonly excludedUnauthorized: number;
  readonly ranking: readonly [];
  readonly issues: readonly [];
}

interface InvalidNext {
  readonly status: 'INVALID';
  readonly execution: 'NOT_STARTED';
  readonly evidence: 'INPUT_STRUCTURE_ONLY';
  readonly authority: 'selection-is-not-permission';
  readonly issues: readonly NextSelectionIssue[];
}

export type NextSelectionResult = SelectedNext | StoppedNext | InvalidNext;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalid = (issues: readonly NextSelectionIssue[]): InvalidNext => ({
  status: 'INVALID',
  execution: 'NOT_STARTED',
  evidence: 'INPUT_STRUCTURE_ONLY',
  authority: 'selection-is-not-permission',
  issues: Object.freeze([...issues]),
});

const isEstimate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_ESTIMATE;

function freezeCandidate(candidate: NextCandidate): NextCandidate {
  return Object.freeze({
    id: candidate.id,
    authorized: candidate.authorized,
    evidenceBackedValue: candidate.evidenceBackedValue,
    risk: candidate.risk,
    cost: candidate.cost,
  });
}

/**
 * Choose one authorized candidate, or stop. A result never starts work.
 * Equal scores break toward the lexicographically smaller id.
 */
export function selectAuthorizedNext(input: unknown): NextSelectionResult {
  if (!isRecord(input)) {
    return invalid([
      {
        code: 'INVALID_REQUEST_SHAPE',
        field: '$',
        message: 'request must be a non-null object',
      },
    ]);
  }

  try {
    const issues: NextSelectionIssue[] = [];
    for (const field of Object.keys(input)) {
      if (!REQUEST_FIELDS.has(field)) {
        issues.push({
          code: 'UNSUPPORTED_FIELD',
          field,
          message: `field ${field} is outside the next-selector contract`,
        });
      }
    }

    const epsilon = input.epsilon === undefined ? NEXT_SELECTOR_EPSILON : input.epsilon;
    if (
      typeof epsilon !== 'number' ||
      !Number.isFinite(epsilon) ||
      epsilon <= 0 ||
      epsilon > 1
    ) {
      issues.push({
        code: 'INVALID_EPSILON',
        field: 'epsilon',
        message: 'epsilon must be a finite number in (0, 1]',
      });
    }

    const parsed: NextCandidate[] = [];
    const seen = new Set<string>();
    if (!Array.isArray(input.candidates) || input.candidates.length > MAX_NEXT_CANDIDATES) {
      issues.push({
        code: 'INVALID_CANDIDATE_LIST',
        field: 'candidates',
        message: `candidates must be an array of at most ${MAX_NEXT_CANDIDATES} items`,
      });
    } else {
      input.candidates.forEach((candidate, index) => {
        const field = `candidates[${index}]`;
        if (!isRecord(candidate)) {
          issues.push({
            code: 'INVALID_CANDIDATE_SHAPE',
            field,
            message: 'candidate must be an object',
          });
          return;
        }
        for (const key of Object.keys(candidate)) {
          if (!CANDIDATE_FIELDS.has(key)) {
            issues.push({
              code: 'UNSUPPORTED_FIELD',
              field: `${field}.${key}`,
              message: `field ${key} is outside the candidate contract`,
            });
          }
        }
        if (typeof candidate.id !== 'string' || !ID_PATTERN.test(candidate.id)) {
          issues.push({
            code: 'INVALID_ID',
            field: `${field}.id`,
            message: 'id must be 1-128 safe ASCII characters',
          });
        } else if (seen.has(candidate.id)) {
          issues.push({
            code: 'DUPLICATE_ID',
            field: `${field}.id`,
            message: 'candidate ids must be unique',
          });
        } else {
          seen.add(candidate.id);
        }
        if (typeof candidate.authorized !== 'boolean') {
          issues.push({
            code: 'INVALID_AUTHORITY_FLAG',
            field: `${field}.authorized`,
            message: 'authorized must be a boolean; omission is not permission',
          });
        }
        for (const estimate of ['evidenceBackedValue', 'risk', 'cost'] as const) {
          if (!isEstimate(candidate[estimate])) {
            issues.push({
              code: 'INVALID_ESTIMATE',
              field: `${field}.${estimate}`,
              message: `estimate must be a finite number from 0 to ${MAX_ESTIMATE}`,
            });
          }
        }
        if (
          typeof candidate.id === 'string' &&
          ID_PATTERN.test(candidate.id) &&
          typeof candidate.authorized === 'boolean' &&
          isEstimate(candidate.evidenceBackedValue) &&
          isEstimate(candidate.risk) &&
          isEstimate(candidate.cost)
        ) {
          parsed.push({
            id: candidate.id,
            authorized: candidate.authorized,
            evidenceBackedValue: candidate.evidenceBackedValue,
            risk: candidate.risk,
            cost: candidate.cost,
          });
        }
      });
    }

    if (issues.length || typeof epsilon !== 'number') return invalid(issues);

    const authorized = parsed.filter((candidate) => candidate.authorized);
    const excludedUnauthorized = parsed.length - authorized.length;
    if (authorized.length === 0) {
      return Object.freeze({
        status: 'STOP',
        execution: 'NOT_STARTED',
        evidence: 'CALLER_SUPPLIED_ESTIMATES',
        authority: 'selection-is-not-permission',
        meaning: 'one-next-or-stop',
        epsilon,
        selected: null,
        score: null,
        considered: parsed.length,
        excludedUnauthorized,
        ranking: Object.freeze([]),
        issues: Object.freeze([]),
      });
    }

    const ranking = authorized
      .map((candidate) => {
        const score =
          candidate.evidenceBackedValue / (candidate.risk + candidate.cost + epsilon);
        return { candidate, score };
      })
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        if (left.candidate.id < right.candidate.id) return -1;
        if (left.candidate.id > right.candidate.id) return 1;
        return 0;
      });

    if (ranking.some((entry) => !Number.isFinite(entry.score))) {
      return invalid([
        {
          code: 'NON_FINITE_SCORE',
          field: 'candidates',
          message: 'a candidate score was not finite',
        },
      ]);
    }

    const winner = ranking[0];
    if (!winner) {
      return invalid([
        {
          code: 'REQUEST_INSPECTION_FAILED',
          field: 'candidates',
          message: 'authorized set could not be ranked',
        },
      ]);
    }

    return Object.freeze({
      status: 'SELECTED',
      execution: 'NOT_STARTED',
      evidence: 'CALLER_SUPPLIED_ESTIMATES',
      authority: 'selection-is-not-permission',
      meaning: 'one-next-or-stop',
      epsilon,
      selected: freezeCandidate(winner.candidate),
      score: winner.score,
      considered: parsed.length,
      excludedUnauthorized,
      ranking: Object.freeze(
        ranking.map((entry) => Object.freeze({ id: entry.candidate.id, score: entry.score })),
      ),
      issues: Object.freeze([]),
    });
  } catch {
    return invalid([
      {
        code: 'REQUEST_INSPECTION_FAILED',
        field: '$',
        message: 'request could not be safely inspected',
      },
    ]);
  }
}
