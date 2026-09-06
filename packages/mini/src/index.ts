import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { Remember } from '@omega-v/remember';
import {
  Observation,
  VerificationResult,
  VerificationRule,
  MemoryRecord,
  MiniCycleResult,
} from '@omega-v/types';

/**
 * MiniKernel: the foundational composition layer for Ω∞v.
 *
 * cycle(input) := Observe → Verify → Remember
 *
 * This is a *thin* wiring class — it delegates all logic to Observer,
 * VerificationEngine, and Remember. It introduces no new domain logic.
 *
 * ONE ROOT. ONE CURRENT. INFINITE FORMS.
 */
export class MiniKernel {
  private readonly observer: Observer;
  private readonly verificationEngine: VerificationEngine;
  private readonly memory: Remember;

  constructor(
    options: {
      observer?: Observer;
      verificationEngine?: VerificationEngine;
      memory?: Remember;
      rules?: VerificationRule[];
    } = {}
  ) {
    this.observer = options.observer ?? new Observer();
    this.verificationEngine = options.verificationEngine ?? new VerificationEngine();
    this.memory = options.memory ?? new Remember();

    // Register any provided rules
    if (options.rules) {
      for (const rule of options.rules) {
        this.verificationEngine.registerRule(rule);
      }
    }
  }

  /**
   * Run a full MINI cycle: Observe → Verify → Remember
   *
   * @param input The claim and supporting metadata to process
   * @returns MiniCycleResult containing the observation, verification, and memory
   */
  public cycle(input: {
    claim: string;
    category?: string;
    source?: {
      system: string;
      version: string;
      environment: string;
    };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): MiniCycleResult {
    // Step 1: Observe
    const observation = this.observe(input);

    // Step 2: Verify
    const verification = this.verify(observation);

    // Step 3: Remember
    const { memory, entries } = this.memory.rememberWithEntries(observation, verification);

    return {
      observation,
      verification,
      memory,
      entries,
      passed: verification.summary.passed,
      confidence: verification.summary.confidence,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Step 1: Observe a claim.
   */
  public observe(input: {
    claim: string;
    category?: string;
    source?: {
      system: string;
      version: string;
      environment: string;
    };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): Observation {
    return this.observer.observe({
      claim: input.claim,
      category: input.category ?? 'mini-cycle',
      source: input.source ?? {
        system: 'mini-kernel',
        version: '0.1.0',
        environment: 'local',
      },
      observedBy: input.observedBy ?? 'mini-kernel',
      metadata: input.metadata ?? {},
      confidence: input.confidence ?? 0.9,
      confidenceReason: input.confidenceReason ?? 'MINI kernel cycle input',
    });
  }

  /**
   * Step 2: Verify an observation.
   */
  public verify(observation: Observation): VerificationResult {
    return this.verificationEngine.verify(observation);
  }

  /**
   * Verify the integrity of the hash chain in memory.
   */
  public verifyMemoryIntegrity(): boolean {
    return this.memory.verifyIntegrity();
  }

  /**
   * Get the current memory size (number of entries).
   */
  public getMemorySize(): number {
    return this.memory.size();
  }

  /**
   * Recall a memory record by its id.
   */
  public recallMemory(memoryId: string): MemoryRecord | undefined {
    return this.memory.recallMemory(memoryId);
  }

  /**
   * Access the underlying Remember instance.
   */
  public getMemory(): Remember {
    return this.memory;
  }

  /**
   * Access the underlying VerificationEngine.
   */
  public getVerificationEngine(): VerificationEngine {
    return this.verificationEngine;
  }

  /**
   * Access the underlying Observer.
   */
  public getObserver(): Observer {
    return this.observer;
  }
}

export { OperatingSystemKernel } from './os.js';
export { OmegaTotalCompressor } from './omegaTotal.js';

export default MiniKernel;
