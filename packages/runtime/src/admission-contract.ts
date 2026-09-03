export const ADMISSION_SCHEMA_VERSION = 'admission.v1' as const;

export const ADMISSION_CAPABILITIES = ['observe-local', 'embed-local'] as const;
export type AdmissionCapability = (typeof ADMISSION_CAPABILITIES)[number];

export const ADMISSION_RETENTION_CLASSES = [
  'ephemeral',
  'bounded-operational',
  'operator-reviewed',
] as const;
export type AdmissionRetentionClass = (typeof ADMISSION_RETENTION_CLASSES)[number];

export const ADMISSION_ACCESS_CLASSES = ['operator-only', 'local-process'] as const;
export type AdmissionAccessClass = (typeof ADMISSION_ACCESS_CLASSES)[number];

export type AdmissionProvenance = {
  requestId: string;
  correlationId: string | null;
  actor: string;
  observedAt: string;
};

export type EmbeddingAdmissionMetadata = {
  model: string;
  dimensions: number;
  contentId: string;
  sourceId: string;
  checksum: `sha256:${string}`;
  createdAt: string;
};

export type AdmissionContract = {
  schemaVersion: typeof ADMISSION_SCHEMA_VERSION;
  sourceUri: string;
  allowedHosts: string[];
  capabilities: AdmissionCapability[];
  retention: AdmissionRetentionClass;
  access: AdmissionAccessClass;
  provenance: AdmissionProvenance;
  embedding: EmbeddingAdmissionMetadata | null;
  network: false;
  shell: false;
};

type ValidationFailure = { ok: false; code: string; message: string };
type ValidationSuccess = { ok: true; value: AdmissionContract };
export type AdmissionValidation = ValidationFailure | ValidationSuccess;

const boundedText = (value: unknown, minimum: number, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length >= minimum && value.trim().length <= maximum;

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

const fail = (code: string, message: string): ValidationFailure => ({ ok: false, code, message });

export function validateAdmissionContract(input: unknown): AdmissionValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fail('ADMISSION_INVALID', 'Admission contract must be an object');
  }
  const candidate = input as Record<string, unknown>;
  if (candidate.schemaVersion !== ADMISSION_SCHEMA_VERSION) {
    return fail('ADMISSION_SCHEMA_UNSUPPORTED', 'Admission schema version is unsupported');
  }
  if (!boundedText(candidate.sourceUri, 1, 2048)) {
    return fail('ADMISSION_SOURCE_INVALID', 'Admission sourceUri must be 1–2048 characters');
  }
  if (!Array.isArray(candidate.allowedHosts) || candidate.allowedHosts.length === 0) {
    return fail('ADMISSION_ALLOWLIST_REQUIRED', 'Admission requires at least one allowed host');
  }
  if (
    candidate.allowedHosts.some(
      (host) => !boundedText(host, 1, 253) || host.includes('/') || host.includes(' ')
    )
  ) {
    return fail(
      'ADMISSION_ALLOWLIST_INVALID',
      'Admission allowedHosts must contain host names only'
    );
  }
  let source: URL;
  try {
    source = new URL(candidate.sourceUri);
  } catch {
    return fail('ADMISSION_SOURCE_INVALID', 'Admission sourceUri must be a valid URL');
  }
  if (source.protocol !== 'https:') {
    return fail('ADMISSION_SOURCE_SCHEME', 'Admission sources must use https');
  }
  if (!candidate.allowedHosts.includes(source.hostname)) {
    return fail('ADMISSION_SOURCE_NOT_ALLOWED', 'Admission source host is not allowlisted');
  }
  if (
    !Array.isArray(candidate.capabilities) ||
    candidate.capabilities.length === 0 ||
    candidate.capabilities.some(
      (capability) =>
        typeof capability !== 'string' ||
        !ADMISSION_CAPABILITIES.includes(capability as AdmissionCapability)
    )
  ) {
    return fail(
      'ADMISSION_CAPABILITY_INVALID',
      'Admission capabilities must use the closed local set'
    );
  }
  if (
    candidate.capabilities.some((capability) => capability === 'embed-local') &&
    (!candidate.embedding ||
      typeof candidate.embedding !== 'object' ||
      Array.isArray(candidate.embedding))
  ) {
    return fail('ADMISSION_EMBEDDING_REQUIRED', 'embed-local requires embedding metadata');
  }
  if (
    typeof candidate.retention !== 'string' ||
    !ADMISSION_RETENTION_CLASSES.includes(candidate.retention as AdmissionRetentionClass)
  ) {
    return fail('ADMISSION_RETENTION_INVALID', 'Admission retention class is unsupported');
  }
  if (
    typeof candidate.access !== 'string' ||
    !ADMISSION_ACCESS_CLASSES.includes(candidate.access as AdmissionAccessClass)
  ) {
    return fail('ADMISSION_ACCESS_INVALID', 'Admission access class is unsupported');
  }
  if (candidate.network !== false || candidate.shell !== false) {
    return fail(
      'ADMISSION_CAPABILITY_ESCALATION',
      'Network and shell capabilities must remain false'
    );
  }
  if (
    !candidate.provenance ||
    typeof candidate.provenance !== 'object' ||
    Array.isArray(candidate.provenance)
  ) {
    return fail('ADMISSION_PROVENANCE_REQUIRED', 'Admission provenance is required');
  }
  const provenance = candidate.provenance as Record<string, unknown>;
  if (
    !boundedText(provenance.requestId, 1, 200) ||
    !boundedText(provenance.actor, 1, 200) ||
    (provenance.correlationId !== null && !boundedText(provenance.correlationId, 1, 200)) ||
    !isIsoDate(provenance.observedAt)
  ) {
    return fail('ADMISSION_PROVENANCE_INVALID', 'Admission provenance is malformed');
  }
  let embedding: EmbeddingAdmissionMetadata | null = null;
  if (candidate.embedding !== null) {
    if (
      !candidate.embedding ||
      typeof candidate.embedding !== 'object' ||
      Array.isArray(candidate.embedding)
    ) {
      return fail('ADMISSION_EMBEDDING_INVALID', 'Embedding metadata is malformed');
    }
    const metadata = candidate.embedding as Record<string, unknown>;
    if (
      !boundedText(metadata.model, 1, 200) ||
      !Number.isInteger(metadata.dimensions) ||
      (metadata.dimensions as number) < 1 ||
      (metadata.dimensions as number) > 8192 ||
      !boundedText(metadata.contentId, 1, 300) ||
      !boundedText(metadata.sourceId, 1, 300) ||
      typeof metadata.checksum !== 'string' ||
      !/^sha256:[a-f0-9]{16,128}$/u.test(metadata.checksum) ||
      !isIsoDate(metadata.createdAt)
    ) {
      return fail('ADMISSION_EMBEDDING_INVALID', 'Embedding metadata is malformed or unbounded');
    }
    embedding = {
      model: metadata.model as string,
      dimensions: metadata.dimensions as number,
      contentId: metadata.contentId as string,
      sourceId: metadata.sourceId as string,
      checksum: metadata.checksum as `sha256:${string}`,
      createdAt: metadata.createdAt as string,
    };
  }
  return {
    ok: true,
    value: {
      schemaVersion: ADMISSION_SCHEMA_VERSION,
      sourceUri: candidate.sourceUri,
      allowedHosts: [...candidate.allowedHosts] as string[],
      capabilities: [...candidate.capabilities] as AdmissionCapability[],
      retention: candidate.retention as AdmissionRetentionClass,
      access: candidate.access as AdmissionAccessClass,
      provenance: {
        requestId: provenance.requestId,
        correlationId: provenance.correlationId as string | null,
        actor: provenance.actor,
        observedAt: provenance.observedAt,
      },
      embedding,
      network: false,
      shell: false,
    },
  };
}
