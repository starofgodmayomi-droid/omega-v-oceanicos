import type { RealityStatus } from './index.js';

export const TENSOR_SIZES = [4, 6, 8] as const;
export type TensorSize = (typeof TENSOR_SIZES)[number];

export interface TensorObservation {
  readonly id: string;
  readonly observedAt: string;
  readonly source: 'companion-python' | 'typescript-fallback';
  readonly size: TensorSize;
  readonly shape_4d: readonly [number, number, number, number];
  readonly shape_2d: readonly [number, number];
  readonly min_val: number;
  readonly max_val: number;
  readonly checksum: number;
  readonly matrix_2d: readonly (readonly number[])[];
}

export interface TensorVerification {
  readonly status: RealityStatus;
  readonly ruleVersion: 'tensor.dav.v1';
  readonly observationId: string;
  readonly checksumExpected: number;
  readonly maxValExpected: number;
  readonly passedRules: readonly string[];
  readonly failedRules: readonly string[];
  readonly digest: string;
}
