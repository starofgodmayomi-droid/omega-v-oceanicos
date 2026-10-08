/** Validation-only boundary for whole-conversation compression requests. */
export const MAX_TOTAL_COMPRESSION_LEASE_MS = 300_000;
export const TOTAL_COMPRESSION_PACKAGE_IDS = ['mini', 'worker', 'remember', 'api'] as const;
export type TotalCompressionPackage = (typeof TOTAL_COMPRESSION_PACKAGE_IDS)[number];
export type TotalCompressionScope = 'CONVERSATION_HISTORIC_COMPRESSION';

export interface TotalCompressionRequest {
  readonly archiveId: string;
  readonly evolutionScope: TotalCompressionScope;
  readonly activePackages: readonly TotalCompressionPackage[];
  readonly totalContextTokensProcessed: number;
  readonly rigidLeaseBoundMs: number;
}

export type TotalCompressionIssueCode =
  | 'INVALID_REQUEST_SHAPE'
  | 'REQUEST_INSPECTION_FAILED'
  | 'UNSUPPORTED_FIELD'
  | 'FINANCIAL_MUTATION_UNSUPPORTED'
  | 'SIGNATURE_VERIFICATION_UNSUPPORTED'
  | 'INVALID_ARCHIVE_ID'
  | 'UNSUPPORTED_SCOPE'
  | 'ACTUATION_SCOPE_UNSUPPORTED'
  | 'INVALID_PACKAGE_LIST'
  | 'UNSUPPORTED_PACKAGE'
  | 'DUPLICATE_PACKAGE'
  | 'INVALID_TOKEN_COUNT'
  | 'INVALID_LEASE_BOUND';

export interface TotalCompressionValidationIssue {
  readonly code: TotalCompressionIssueCode;
  readonly field: string;
  readonly message: string;
}

export type TotalCompressionValidationResult =
  | {
      readonly validation: 'VALID';
      readonly execution: 'NOT_STARTED';
      readonly evidence: 'INPUT_STRUCTURE_ONLY';
      readonly request: TotalCompressionRequest;
      readonly issues: readonly [];
    }
  | {
      readonly validation: 'INVALID';
      readonly execution: 'NOT_STARTED';
      readonly evidence: 'INPUT_STRUCTURE_ONLY';
      readonly issues: readonly TotalCompressionValidationIssue[];
    };

const allowedFields = new Set([
  'archiveId',
  'evolutionScope',
  'activePackages',
  'totalContextTokensProcessed',
  'rigidLeaseBoundMs',
]);
const supportedPackages = new Set<string>(TOTAL_COMPRESSION_PACKAGE_IDS);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const invalid = (
  issues: readonly TotalCompressionValidationIssue[]
): TotalCompressionValidationResult => ({
  validation: 'INVALID',
  execution: 'NOT_STARTED',
  evidence: 'INPUT_STRUCTURE_ONLY',
  issues: Object.freeze([...issues]),
});

export function validateTotalCompressionRequest(input: unknown): TotalCompressionValidationResult {
  if (!isRecord(input)) {
    return invalid([
      { code: 'INVALID_REQUEST_SHAPE', field: '$', message: 'request must be a non-null object' },
    ]);
  }
  try {
    const issues: TotalCompressionValidationIssue[] = [];
    for (const field of Object.keys(input)) {
      if (field === 'allocatedGenerationalCapitalWei') {
        issues.push({
          code: 'FINANCIAL_MUTATION_UNSUPPORTED',
          field,
          message: 'financial balance fields are outside this validator',
        });
      } else if (field === 'masterAsymmetricSignature') {
        issues.push({
          code: 'SIGNATURE_VERIFICATION_UNSUPPORTED',
          field,
          message: 'signatures are not verified or treated as authority here',
        });
      } else if (!allowedFields.has(field)) {
        issues.push({
          code: 'UNSUPPORTED_FIELD',
          field,
          message: `field ${field} is outside the compression-only contract`,
        });
      }
    }

    const archiveId = input.archiveId;
    if (typeof archiveId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(archiveId)) {
      issues.push({
        code: 'INVALID_ARCHIVE_ID',
        field: 'archiveId',
        message: 'archiveId must be 1-128 safe ASCII characters',
      });
    }

    if (input.evolutionScope === 'EVERYTHING_ONLINE_ACTUATION') {
      issues.push({
        code: 'ACTUATION_SCOPE_UNSUPPORTED',
        field: 'evolutionScope',
        message: 'online actuation is outside this validation-only boundary',
      });
    } else if (input.evolutionScope !== 'CONVERSATION_HISTORIC_COMPRESSION') {
      issues.push({
        code: 'UNSUPPORTED_SCOPE',
        field: 'evolutionScope',
        message: 'only CONVERSATION_HISTORIC_COMPRESSION is supported',
      });
    }

    const activePackages: TotalCompressionPackage[] = [];
    if (
      !Array.isArray(input.activePackages) ||
      input.activePackages.length < 1 ||
      input.activePackages.length > TOTAL_COMPRESSION_PACKAGE_IDS.length
    ) {
      issues.push({
        code: 'INVALID_PACKAGE_LIST',
        field: 'activePackages',
        message: `activePackages must contain 1-${TOTAL_COMPRESSION_PACKAGE_IDS.length} package IDs`,
      });
    } else {
      const seen = new Set<string>();
      input.activePackages.forEach((packageId, index) => {
        if (typeof packageId !== 'string' || !supportedPackages.has(packageId)) {
          issues.push({
            code: 'UNSUPPORTED_PACKAGE',
            field: `activePackages[${index}]`,
            message: 'package ID is not supported',
          });
          return;
        }
        if (seen.has(packageId)) {
          issues.push({
            code: 'DUPLICATE_PACKAGE',
            field: `activePackages[${index}]`,
            message: 'package IDs must be unique',
          });
          return;
        }
        seen.add(packageId);
        activePackages.push(packageId as TotalCompressionPackage);
      });
    }

    const tokenCount = input.totalContextTokensProcessed;
    if (typeof tokenCount !== 'number' || !Number.isSafeInteger(tokenCount) || tokenCount < 0) {
      issues.push({
        code: 'INVALID_TOKEN_COUNT',
        field: 'totalContextTokensProcessed',
        message: 'token count must be a non-negative safe integer',
      });
    }

    const leaseMs = input.rigidLeaseBoundMs;
    if (
      typeof leaseMs !== 'number' ||
      !Number.isSafeInteger(leaseMs) ||
      leaseMs < 1 ||
      leaseMs > MAX_TOTAL_COMPRESSION_LEASE_MS
    ) {
      issues.push({
        code: 'INVALID_LEASE_BOUND',
        field: 'rigidLeaseBoundMs',
        message: `lease bound must be 1-${MAX_TOTAL_COMPRESSION_LEASE_MS} ms`,
      });
    }

    if (issues.length) return invalid(issues);

    const request: TotalCompressionRequest = Object.freeze({
      archiveId: archiveId as string,
      evolutionScope: 'CONVERSATION_HISTORIC_COMPRESSION',
      activePackages: Object.freeze([...activePackages]),
      totalContextTokensProcessed: tokenCount as number,
      rigidLeaseBoundMs: leaseMs as number,
    });
    return {
      validation: 'VALID',
      execution: 'NOT_STARTED',
      evidence: 'INPUT_STRUCTURE_ONLY',
      request,
      issues: Object.freeze([]),
    };
  } catch {
    return invalid([
      { code: 'REQUEST_INSPECTION_FAILED', field: '$', message: 'request could not be safely inspected' },
    ]);
  }
}
