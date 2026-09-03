import {
  ADMISSION_SCHEMA_VERSION,
  validateAdmissionContract,
  type AdmissionContract,
} from './admission-contract';

const validAdmission = (): AdmissionContract => ({
  schemaVersion: ADMISSION_SCHEMA_VERSION,
  sourceUri: 'https://example.com/source/page',
  allowedHosts: ['example.com'],
  capabilities: ['observe-local'],
  retention: 'bounded-operational',
  access: 'operator-only',
  provenance: {
    requestId: 'req-admission-1',
    correlationId: 'corr-admission-1',
    actor: 'operator-1',
    observedAt: '2026-09-03T00:00:00.000Z',
  },
  embedding: null,
  network: false,
  shell: false,
});

describe('crawler/vector admission contract', () => {
  it('accepts a bounded local observation admission', () => {
    const result = validateAdmissionContract(validAdmission());
    expect(result).toEqual({ ok: true, value: validAdmission() });
  });

  it.each([
    ['missing allowlist', { allowedHosts: [] }, 'ADMISSION_ALLOWLIST_REQUIRED'],
    ['non-https source', { sourceUri: 'http://example.com/page' }, 'ADMISSION_SOURCE_SCHEME'],
    [
      'source outside allowlist',
      { sourceUri: 'https://other.example/page' },
      'ADMISSION_SOURCE_NOT_ALLOWED',
    ],
    ['unknown capability', { capabilities: ['network'] }, 'ADMISSION_CAPABILITY_INVALID'],
    ['network escalation', { network: true }, 'ADMISSION_CAPABILITY_ESCALATION'],
    ['shell escalation', { shell: true }, 'ADMISSION_CAPABILITY_ESCALATION'],
    ['missing provenance', { provenance: null }, 'ADMISSION_PROVENANCE_REQUIRED'],
    ['invalid retention', { retention: 'forever' }, 'ADMISSION_RETENTION_INVALID'],
  ])('rejects %s', (_label, override, code) => {
    const result = validateAdmissionContract({ ...validAdmission(), ...override });
    expect(result).toMatchObject({ ok: false, code });
  });

  it('requires bounded embedding metadata for embed-local', () => {
    const missing = validateAdmissionContract({
      ...validAdmission(),
      capabilities: ['embed-local'],
    });
    expect(missing).toMatchObject({ ok: false, code: 'ADMISSION_EMBEDDING_REQUIRED' });

    const accepted = validateAdmissionContract({
      ...validAdmission(),
      capabilities: ['observe-local', 'embed-local'],
      embedding: {
        model: 'local-model-v1',
        dimensions: 768,
        contentId: 'chunk-1',
        sourceId: 'source-1',
        checksum: 'sha256:0123456789abcdef0123456789abcdef',
        createdAt: '2026-09-03T00:00:00.000Z',
      },
    });
    expect(accepted).toMatchObject({ ok: true, value: { embedding: { dimensions: 768 } } });
  });

  it('rejects unbounded embedding metadata and invalid provenance', () => {
    const result = validateAdmissionContract({
      ...validAdmission(),
      capabilities: ['embed-local'],
      embedding: {
        model: 'local-model-v1',
        dimensions: 9000,
        contentId: 'chunk-1',
        sourceId: 'source-1',
        checksum: 'sha256:0123456789abcdef',
        createdAt: 'not-a-date',
      },
      provenance: { ...validAdmission().provenance, requestId: '' },
    });
    expect(result).toMatchObject({ ok: false, code: 'ADMISSION_PROVENANCE_INVALID' });
  });
});
