import { MiniKernel } from '../index.js';
import { OmegaTotalCompressor } from '../omegaTotal.js';
import { VerificationRule } from '@omega-v/types';

const healthRule: VerificationRule = {
  name: 'status-code-check',
  version: '1.0.0',
  appliesTo: ['health-check'],
  definition: 'statusCode === 200',
  description: 'HTTP status must be 200',
  createdAt: '2026-08-14T00:00:00.000Z',
  active: true,
};

const input = {
  claim: 'Service X is healthy',
  category: 'health-check',
  source: {
    system: 'omega-total-test',
    version: '1.0.0',
    environment: 'test',
  },
  observedBy: 'omega-total-test',
  metadata: { statusCode: 200 },
  confidence: 0.2,
  confidenceReason: 'submitter supplied confidence; verifier must decide',
};

describe('OmegaTotalCompressor', () => {
  it('composes the real MINI Observe → Verify → Remember path', () => {
    const omega = new OmegaTotalCompressor({ rules: [healthRule] });

    const result = omega.lockTotalityIntoNow(input);

    expect(result.manifest.stateRoot).toBe('Ø');
    expect(result.manifest.kernelPhase).toBe('mini');
    expect(result.manifest.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
    expect(result.cycle.verification.summary.passed).toBe(true);
    expect(result.cycle.verification.summary.confidence).toBe(0.98);
    expect(result.cycle.verification.summary.claimedConfidence).toBe(0.2);
    expect(result.cycle.entries).toHaveLength(3);
    expect(omega.kernel.verifyMemoryIntegrity()).toBe(true);
  });

  it('fails closed when no verification rule applies', () => {
    const omega = new OmegaTotalCompressor();

    expect(() => omega.lockTotalityIntoNow(input)).toThrow(
      'no verification rule was applied'
    );
  });

  it('fails closed when an applied rule fails', () => {
    const omega = new OmegaTotalCompressor({ rules: [healthRule] });

    expect(() =>
      omega.lockTotalityIntoNow({ ...input, metadata: { statusCode: 503 } })
    ).toThrow('verification did not pass');
  });

  it('fails closed when required evidence is missing', () => {
    const omega = new OmegaTotalCompressor({ rules: [healthRule] });

    expect(() =>
      omega.lockTotalityIntoNow({ ...input, metadata: {} })
    ).toThrow('verification did not pass');
  });

  it('preserves injected MINI kernel composition', () => {
    const kernel = new MiniKernel({ rules: [healthRule] });
    const omega = new OmegaTotalCompressor({ kernel });

    expect(omega.kernel).toBe(kernel);
    const result = omega.lockTotalityIntoNow(input);
    expect(result.cycle.memory.observationId).toBe(result.cycle.observation.id);
  });
});
