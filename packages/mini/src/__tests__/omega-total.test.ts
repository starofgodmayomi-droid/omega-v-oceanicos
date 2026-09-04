import { OmegaTotalAdapter, TotalityMetadata } from '../index';
import { VerificationRule } from '@omega-v/types';

const statusRule: VerificationRule = {
  name: 'status-code-check',
  version: '1.0.0',
  appliesTo: ['health-check'],
  definition: 'statusCode === 200',
  description: 'HTTP status must be 200',
  createdAt: '2026-09-04T00:00:00.000Z',
  active: true,
};

const validMetadata: TotalityMetadata = {
  claim: 'Service is healthy',
  category: 'health-check',
  source: { system: 'health-api', version: '1.0.0', environment: 'test' },
  observedBy: 'omega-total-test',
  metadata: { statusCode: 200 },
  confidence: 0.9,
  confidenceReason: 'test fixture',
};

describe('OmegaTotalAdapter', () => {
  it('returns a manifest populated by a verified Observe → Verify → Remember cycle', () => {
    const adapter = new OmegaTotalAdapter({ rules: [statusRule] });

    const manifest = adapter.run(validMetadata);

    expect(manifest.observation.claim.statement).toBe(validMetadata.claim);
    expect(manifest.verification.summary.passed).toBe(true);
    expect(manifest.memory.verified).toBe(true);
    expect(manifest.entries).toHaveLength(3);
    expect(manifest.completion).toEqual({
      observationId: manifest.observation.id,
      verificationId: manifest.verification.id,
      memoryId: manifest.memory.id,
    });
    expect(adapter.memory.verifyIntegrity()).toBe(true);
  });

  it('records a failed verification as unverified evidence', () => {
    const adapter = new OmegaTotalAdapter({ rules: [statusRule] });

    const manifest = adapter.run({ ...validMetadata, metadata: { statusCode: 503 } });

    expect(manifest.verification.summary.passed).toBe(false);
    expect(manifest.memory.verified).toBe(false);
    expect(manifest.entries).toHaveLength(3);
  });

  it('rejects invalid metadata before observing it', () => {
    const adapter = new OmegaTotalAdapter({ rules: [statusRule] });
    const invalid = {
      ...validMetadata,
      source: { ...validMetadata.source, environment: '' },
      metadata: [],
    } as unknown as TotalityMetadata;

    expect(() => adapter.run(invalid)).toThrow(
      'Totality metadata validation failed: source.environment must be a non-empty string; metadata must be a record'
    );
    expect(adapter.memory.size()).toBe(0);
  });

  it('does not make completion or authorization claims for unverified data', () => {
    const adapter = new OmegaTotalAdapter({ rules: [statusRule] });

    const manifest = adapter.run({ ...validMetadata, metadata: { statusCode: 500 } });

    expect(manifest).not.toHaveProperty('completion');
    expect(manifest).not.toHaveProperty('authorization');
    expect(manifest.memory.verified).toBe(false);
  });
});
