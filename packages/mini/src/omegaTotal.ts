import { MiniKernel, MiniObserveInput } from './index.js';
import { MiniCycleResult, VerificationRule } from '@omega-v/types';

export const OMEGA_TOTAL_STEWARDSHIP = 'TOOLS_FOR_EVOLUTION_NOT_WAR' as const;

export type OmegaTotalManifest = {
  stateRoot: 'Ø';
  kernelPhase: 'mini';
  runtimeMood: 'MAX_REALITY_AI_USAGE';
  stewardshipAxiom: typeof OMEGA_TOTAL_STEWARDSHIP;
  systemChecksum: string;
};

export type OmegaTotalOptions = {
  kernel?: MiniKernel;
  rules?: VerificationRule[];
};

/**
 * Thin composition layer for the Ω∞v totality manifest.
 *
 * This deliberately delegates observation, verification, and memory to the
 * existing MINI contracts instead of inventing parallel capture/commit APIs.
 * It is a manifest/runtime adapter, not a claim of autonomous deployment.
 */
export class OmegaTotalCompressor {
  public static readonly REPO_ID = 'starofgodmayomi-droid/omega-v-oceanicos';
  public readonly kernel: MiniKernel;

  constructor(options: OmegaTotalOptions = {}) {
    this.kernel = options.kernel ?? new MiniKernel({ rules: options.rules });
  }

  /**
   * Execute one honest totality cycle using the repository's real MINI path.
   */
  public lockTotalityIntoNow(input: MiniObserveInput): {
    manifest: OmegaTotalManifest;
    cycle: MiniCycleResult;
  } {
    const cycle = this.kernel.cycle(input);

    if (!cycle.verification.summary.passed) {
      throw new Error('Totality integrity gate rejected: verification did not pass.');
    }

    if (cycle.verification.summary.rulesApplied === 0) {
      throw new Error('Totality integrity gate rejected: no verification rule was applied.');
    }

    if (!this.kernel.verifyMemoryIntegrity()) {
      throw new Error('Totality integrity gate rejected: memory chain is invalid.');
    }

    return {
      manifest: {
        stateRoot: 'Ø',
        kernelPhase: 'mini',
        runtimeMood: 'MAX_REALITY_AI_USAGE',
        stewardshipAxiom: OMEGA_TOTAL_STEWARDSHIP,
        systemChecksum: cycle.verification.id,
      },
      cycle,
    };
  }
}

export default OmegaTotalCompressor;
