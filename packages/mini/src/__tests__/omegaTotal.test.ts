import { MiniKernel } from '../index';
import { OmegaTotalCompressor } from '../omegaTotal';
import { VerificationRule } from '@omega-v/types';

const DEFAULT_RULE: VerificationRule = {
  name: 'response-time-threshold',
  version: '1.0.0',
  appliesTo: ['mini-cycle'],
  definition: 'responseTime < 100',
  description: 'Test rule for omega total',
  createdAt: new Date().toISOString(),
  active: true,
};

describe('OmegaTotalCompressor', () => {
  let compressor: OmegaTotalCompressor;

  beforeEach(() => {
    const kernel = new MiniKernel({ rules: [DEFAULT_RULE] });
    compressor = new OmegaTotalCompressor(kernel);
  });

  test('lockTotalityIntoNow produces a valid manifest', () => {
    const manifest = compressor.lockTotalityIntoNow({
      claim: 'Totality test',
      metadata: { responseTime: 30 },
    });

    expect(manifest.stateRoot).toBe('Ø');
    expect(manifest.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
    expect(manifest.cycleResult).toBeDefined();
    expect(manifest.cycleResult.passed).toBe(true);
    expect(manifest.memoryIntegrityValid).toBe(true);
    expect(manifest.memorySize).toBeGreaterThan(0);
    expect(manifest.lockedAt).toBeDefined();
  });

  test('lockTotalityIntoNow throws when verification fails', () => {
    expect(() =>
      compressor.lockTotalityIntoNow({
        claim: 'Totality should fail',
        metadata: { responseTime: 500 }, // exceeds threshold
      })
    ).toThrow(/verification did not pass/);
  });

  test('lockTotalityIntoNow throws when no rules are applied', () => {
    // Create a kernel with no rules
    const bareKernel = new MiniKernel();
    const bareCompressor = new OmegaTotalCompressor(bareKernel);

    // With no rules registered for 'mini-cycle', rulesApplied === 0
    // but the verification engine returns passed=true by default when no rules match.
    // So this should throw because rulesApplied < 1
    expect(() =>
      bareCompressor.lockTotalityIntoNow({
        claim: 'No rules test',
      })
    ).toThrow(/no rules were applied/);
  });

  test('multiple lockTotalityIntoNow calls maintain memory integrity', () => {
    for (let i = 0; i < 5; i++) {
      const manifest = compressor.lockTotalityIntoNow({
        claim: `Totality cycle ${i}`,
        metadata: { responseTime: 10 + i },
      });
      expect(manifest.memoryIntegrityValid).toBe(true);
    }

    expect(compressor.getKernel().getMemorySize()).toBe(15); // 5 × 3
    expect(compressor.getKernel().verifyMemoryIntegrity()).toBe(true);
  });

  test('manifest stateRoot is always Ø', () => {
    const m1 = compressor.lockTotalityIntoNow({ claim: 'Test 1', metadata: { responseTime: 10 } });
    const m2 = compressor.lockTotalityIntoNow({ claim: 'Test 2', metadata: { responseTime: 20 } });

    expect(m1.stateRoot).toBe('Ø');
    expect(m2.stateRoot).toBe('Ø');
  });

  test('manifest stewardshipAxiom is always TOOLS_FOR_EVOLUTION_NOT_WAR', () => {
    const manifest = compressor.lockTotalityIntoNow({
      claim: 'Axiom test',
      metadata: { responseTime: 15 },
    });
    expect(manifest.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
  });

  test('getKernel returns the underlying MiniKernel', () => {
    expect(compressor.getKernel()).toBeDefined();
    expect(compressor.getKernel()).toBeInstanceOf(MiniKernel);
  });
});
