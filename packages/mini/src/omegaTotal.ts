import { MiniKernel } from './index.js';
import { OmegaTotalManifest } from '@omega-v/types';

/**
 * OmegaTotalCompressor: thin composition layer that enforces totality.
 *
 * lockTotalityIntoNow(input) := cycle(input) → assert(passed, rulesApplied > 0, memoryIntegrity) → OmegaTotalManifest
 *
 * This compressor NEVER relaxes the verification gate:
 *   - Verification must pass
 *   - At least one rule must have been applied
 *   - Memory hash chain must be intact
 *
 * If any condition fails, it throws — totality is not negotiable.
 *
 * stateRoot: 'Ø'  — the empty axiom
 * stewardshipAxiom: 'TOOLS_FOR_EVOLUTION_NOT_WAR'
 */
export class OmegaTotalCompressor {
  constructor(private readonly kernel: MiniKernel = new MiniKernel()) {}

  /**
   * Lock totality into the present moment.
   *
   * Runs a full MINI cycle, then verifies:
   *   1. The cycle passed verification
   *   2. At least one rule was applied
   *   3. Memory integrity is intact
   *
   * @throws Error if any totality gate fails
   */
  public lockTotalityIntoNow(input: {
    claim: string;
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): OmegaTotalManifest {
    // Run the full MINI cycle
    const cycleResult = this.kernel.cycle(input);

    // Gate 1: Verification must pass
    if (!cycleResult.passed) {
      throw new Error(
        `OmegaTotal: verification did not pass. ` +
          `Passed: ${cycleResult.verification.summary.rulesPassed}/${cycleResult.verification.summary.rulesApplied}. ` +
          `Totality cannot be achieved without verification.`
      );
    }

    // Gate 2: At least one rule must have been applied
    if (cycleResult.verification.summary.rulesApplied < 1) {
      throw new Error(
        `OmegaTotal: no rules were applied during verification. ` +
          `Totality requires at least one executable rule.`
      );
    }

    // Gate 3: Memory integrity
    const memoryIntegrity = this.kernel.verifyMemoryIntegrity();
    if (!memoryIntegrity) {
      throw new Error(
        `OmegaTotal: memory integrity check failed. ` +
          `The hash chain is broken. Totality cannot be achieved with corrupted memory.`
      );
    }

    return {
      stateRoot: 'Ø',
      stewardshipAxiom: 'TOOLS_FOR_EVOLUTION_NOT_WAR',
      cycleResult,
      memoryIntegrityValid: true,
      memorySize: this.kernel.getMemorySize(),
      lockedAt: new Date().toISOString(),
    };
  }

  /**
   * Access the underlying MiniKernel.
   */
  public getKernel(): MiniKernel {
    return this.kernel;
  }
}

export default OmegaTotalCompressor;
