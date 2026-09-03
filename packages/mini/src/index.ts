import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { Remember } from '@omega-v/remember';
import { MiniCycleResult, Observation, VerificationResult, VerificationRule } from '@omega-v/types';

/**
 * Input accepted by one MINI kernel cycle.
 * Mirrors Observer.observe input so MINI stays a thin composition layer.
 */
export type MiniObserveInput = {
  claim: string;
  category?: string;
  source: {
    system: string;
    version: string;
    environment: string;
  };
  observedBy: string;
  metadata: Record<string, unknown>;
  confidence: number;
  confidenceReason: string;
  parentId?: string;
  lineage?: string[];
};

export type MiniKernelOptions = {
  observer?: Observer;
  verification?: VerificationEngine;
  memory?: Remember;
  rules?: VerificationRule[];
};

/**
 * Ω∞v MINI kernel
 *
 * ```text
 * 0
 * │
 * ▼
 * 💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
 * ```
 *
 * Zero is the origin. Mini is the first living system.
 * Everything after this package is verified expansion.
 */
export class MiniKernel {
  public readonly observer: Observer;
  public readonly verification: VerificationEngine;
  public readonly memory: Remember;

  constructor(options: MiniKernelOptions = {}) {
    this.observer = options.observer ?? new Observer();
    this.verification = options.verification ?? new VerificationEngine();
    this.memory = options.memory ?? new Remember();

    if (options.rules) {
      for (const rule of options.rules) {
        this.verification.registerRule(rule);
      }
    }
  }

  /**
   * Register a verification rule with the kernel.
   */
  public registerRule(rule: VerificationRule): void {
    this.verification.registerRule(rule);
  }

  /**
   * Run one full MINI cycle: Observe → Verify → Remember.
   */
  public cycle(input: MiniObserveInput): MiniCycleResult {
    const observation = this.observer.observe(input);
    const verification = this.verification.verify(observation);
    const beforeSize = this.memory.size();
    const memory = this.memory.remember(observation, verification);
    const entries = this.memory.all().slice(beforeSize);

    return {
      observation,
      verification,
      memory,
      entries: [...entries],
    };
  }

  /**
   * Observe only (without verifying or remembering).
   * Useful when composing expansions on top of MINI.
   */
  public observe(input: MiniObserveInput): Observation {
    return this.observer.observe(input);
  }

  /**
   * Verify a previously normalized observation.
   */
  public verify(observation: Observation): VerificationResult {
    return this.verification.verify(observation);
  }

  /**
   * Integrity check over remembered history.
   */
  public verifyMemoryIntegrity(): boolean {
    return this.memory.verifyIntegrity();
  }
}

export { OperatingSystemKernel } from './os.js';
export type {
  OperatingSystemEvent,
  OperatingSystemOptions,
  OperatingSystemSnapshot,
  OperatingSystemState,
  OperatingSystemTask,
  OperatingSystemTaskKind,
} from './os.js';

export default MiniKernel;
