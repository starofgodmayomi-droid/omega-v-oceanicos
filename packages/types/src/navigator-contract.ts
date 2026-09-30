/**
 * Read-only evidence snapshot for presentation surfaces such as Navigator.
 *
 * This contract carries provenance and uncertainty; it does not grant authority,
 * execute transitions, or imply deployment/health beyond the included evidence.
 */
export const NAVIGATOR_EVIDENCE_CONTRACT = 'omega-navigator-evidence.v1' as const;

export const NAVIGATOR_EVIDENCE_STATUSES = [
  'VERIFIED',
  'SUPPORTED',
  'UNVERIFIED',
  'DIVERGENT',
  'UNKNOWN',
] as const;

export type NavigatorEvidenceStatus = (typeof NAVIGATOR_EVIDENCE_STATUSES)[number];

export interface NavigatorEvidenceSource {
  readonly repository: string;
  readonly commit: string;
  readonly branch: string;
  readonly observedAt: string;
  readonly locator: string;
}

export interface NavigatorEvidenceItem {
  readonly id: string;
  readonly status: NavigatorEvidenceStatus;
  readonly claim: string;
  readonly observedAt: string;
  readonly source: NavigatorEvidenceSource;
  readonly policyVersion: string;
  readonly attestationId?: string;
  readonly limitations: readonly string[];
}

export interface NavigatorEvidenceSnapshot {
  readonly contract: typeof NAVIGATOR_EVIDENCE_CONTRACT;
  readonly generatedAt: string;
  readonly source: NavigatorEvidenceSource;
  readonly overallStatus: NavigatorEvidenceStatus;
  readonly evidence: readonly NavigatorEvidenceItem[];
  readonly readOnly: true;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const NON_EMPTY = /\S/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

function isStatus(value: unknown): value is NavigatorEvidenceStatus {
  return typeof value === 'string' && (NAVIGATOR_EVIDENCE_STATUSES as readonly string[]).includes(value);
}

function isSource(value: unknown): value is NavigatorEvidenceSource {
  return (
    isRecord(value) &&
    typeof value.repository === 'string' &&
    NON_EMPTY.test(value.repository) &&
    typeof value.commit === 'string' &&
    NON_EMPTY.test(value.commit) &&
    typeof value.branch === 'string' &&
    NON_EMPTY.test(value.branch) &&
    isIsoDate(value.observedAt) &&
    typeof value.locator === 'string' &&
    NON_EMPTY.test(value.locator)
  );
}

function isEvidence(value: unknown): value is NavigatorEvidenceItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    NON_EMPTY.test(value.id) &&
    isStatus(value.status) &&
    typeof value.claim === 'string' &&
    NON_EMPTY.test(value.claim) &&
    isIsoDate(value.observedAt) &&
    isSource(value.source) &&
    typeof value.policyVersion === 'string' &&
    NON_EMPTY.test(value.policyVersion) &&
    (value.attestationId === undefined ||
      (typeof value.attestationId === 'string' && NON_EMPTY.test(value.attestationId))) &&
    Array.isArray(value.limitations) &&
    value.limitations.every((item) => typeof item === 'string' && NON_EMPTY.test(item))
  );
}

/**
 * Parse an untrusted JSON value into the read-only presentation contract.
 * `UNKNOWN` and `DIVERGENT` are preserved; no status is inferred or upgraded.
 */
export function parseNavigatorEvidenceSnapshot(value: unknown): NavigatorEvidenceSnapshot {
  if (
    !isRecord(value) ||
    value.contract !== NAVIGATOR_EVIDENCE_CONTRACT ||
    !isIsoDate(value.generatedAt) ||
    !isSource(value.source) ||
    !isStatus(value.overallStatus) ||
    value.readOnly !== true ||
    !Array.isArray(value.evidence) ||
    !value.evidence.every(isEvidence)
  ) {
    throw new Error('Invalid omega-navigator-evidence.v1 snapshot');
  }

  return value as unknown as NavigatorEvidenceSnapshot;
}
