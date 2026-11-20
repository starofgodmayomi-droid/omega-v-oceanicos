import crypto from 'node:crypto';
import type { TensorObservation, TensorVerification } from '@oceanicos/types';

export const TENSOR_RULE_VERSION = 'tensor.dav.v1' as const;

const canonical = (observation: TensorObservation): string => JSON.stringify({
  id: observation.id,
  size: observation.size,
  shape_4d: observation.shape_4d,
  shape_2d: observation.shape_2d,
  min_val: observation.min_val,
  max_val: observation.max_val,
  checksum: observation.checksum,
  matrix_2d: observation.matrix_2d,
});

export function verifyTensorObservation(observation: TensorObservation): TensorVerification {
  const expectedChecksum = 2 * Math.pow(observation.size, 4) * (observation.size - 1);
  const expectedMaxVal = 4 * (observation.size - 1);
  const passedRules: string[] = [];
  const failedRules: string[] = [];
  const checks: Array<[string, boolean]> = [
    ['TENSOR_SIZE_SUPPORTED', observation.size === 4 || observation.size === 6 || observation.size === 8],
    ['TENSOR_SHAPE_4D', JSON.stringify(observation.shape_4d) === JSON.stringify([observation.size, observation.size, observation.size, observation.size])],
    ['TENSOR_SHAPE_2D', JSON.stringify(observation.shape_2d) === JSON.stringify([observation.size ** 2, observation.size ** 2])],
    ['TENSOR_MIN_ZERO', observation.min_val === 0],
    ['TENSOR_MAX_FORMULA', observation.max_val === expectedMaxVal],
    ['TENSOR_CHECKSUM_FORMULA', observation.checksum === expectedChecksum],
    ['TENSOR_MATRIX_ROWS', observation.matrix_2d.length === observation.size ** 2],
    ['TENSOR_MATRIX_VALUES', matrixMatchesFormula(observation)],
  ];
  for (const [rule, passed] of checks) (passed ? passedRules : failedRules).push(rule);
  const status = failedRules.length === 0 ? 'VERIFIED' : 'DIVERGENT';
  const digest = crypto.createHash('sha256').update(canonical(observation)).digest('hex');
  return {
    status,
    ruleVersion: TENSOR_RULE_VERSION,
    observationId: observation.id,
    checksumExpected: expectedChecksum,
    maxValExpected: expectedMaxVal,
    passedRules,
    failedRules,
    digest,
  };
}

function matrixMatchesFormula(observation: TensorObservation): boolean {
  const width = observation.size ** 2;
  if (observation.matrix_2d.length !== width) return false;
  for (let row = 0; row < width; row += 1) {
    const values = observation.matrix_2d[row];
    if (!Array.isArray(values) || values.length !== width) return false;
    const i = Math.floor(row / observation.size);
    const k = row % observation.size;
    for (let column = 0; column < width; column += 1) {
      const j = Math.floor(column / observation.size);
      const l = column % observation.size;
      if (values[column] !== i + j + k + l) return false;
    }
  }
  return true;
}
