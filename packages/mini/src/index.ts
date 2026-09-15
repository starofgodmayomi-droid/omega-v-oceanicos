import crypto from 'node:crypto';
import { Observer, ObserverEngine, observePlanetaryBase } from '@oceanicos/observer';
import {
  VerificationEngine,
  verifyPlanetarySovereignty,
} from '@oceanicos/verification';
import {
  Remember,
  RememberEngine,
  PluralisticHashChain,
  type CryptographicBlock,
} from '@oceanicos/remember';
import type {
  IMiniBlock,
  Observation,
  VerificationResult,
  VerificationRule,
  MemoryRecord,
  MiniCycleResult,
} from '@oceanicos/types';

export interface MiniKernelOptions {
  observer?: Observer;
  verificationEngine?: VerificationEngine;
  memory?: Remember;
  rules?: VerificationRule[];
}

/**
 * MiniKernel: The foundational composition layer for Ω∞v.
 *
 * Supports both:
 * 1. Cognitive verification cycle: Observe ➔ Verify ➔ Remember (MiniCycleResult)
 * 2. High-throughput block mining: PoW block consensus (IMiniBlock)
 */
export class MiniKernel {
  private readonly observer: Observer;
  private readonly verificationEngine: VerificationEngine;
  private readonly memory: Remember;
  private readonly ledger: RememberEngine;

  constructor(
    optionsOrLedger?: MiniKernelOptions | RememberEngine
  ) {
    if (optionsOrLedger instanceof RememberEngine) {
      this.ledger = optionsOrLedger;
      this.observer = new Observer();
      this.verificationEngine = new VerificationEngine();
      this.memory = new Remember();
    } else {
      const opts = optionsOrLedger ?? {};
      this.observer = opts.observer ?? new Observer();
      this.verificationEngine = opts.verificationEngine ?? new VerificationEngine();
      this.memory = opts.memory ?? new Remember();
      this.ledger = new RememberEngine(':memory:');

      if (opts.rules) {
        for (const rule of opts.rules) {
          this.verificationEngine.registerRule(rule);
        }
      }
    }
  }

  /**
   * Run a full cognitive MINI cycle: Observe ➔ Verify ➔ Remember
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
    parentId?: string;
    lineage?: string[];
  }): MiniCycleResult {
    const observation = this.observe(input);
    const verification = this.verify(observation);
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
    parentId?: string;
    lineage?: string[];
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
      parentId: input.parentId,
      lineage: input.lineage,
    });
  }

  /**
   * Step 2: Verify an observation against registered rules.
   */
  public verify(observation: Observation): VerificationResult {
    return this.verificationEngine.verify(observation);
  }

  /**
   * Run high-throughput PoW consensus block cycle.
   */
  public runCycle(io = 'EXEC'): IMiniBlock {
    const observation = ObserverEngine.generateTelemetry(io);
    const evidence = VerificationEngine.evaluate(observation);
    const previousHash = this.ledger.getTip()?.hash ?? '8a3f91c2e4f9011b989210ffffffffff';
    let nonce = 0;
    let hash = '';
    while (true) {
      hash = crypto
        .createHash('sha256')
        .update(`0xΩ-${this.ledger.height}-${previousHash}-${evidence.signatureProof}-${nonce}`)
        .digest('hex');
      if (hash.startsWith('00')) break;
      nonce++;
    }
    const block: IMiniBlock = {
      index: this.ledger.height,
      timestamp: new Date().toISOString(),
      observation,
      evidence,
      previousHash,
      hash,
      nonce,
    };
    this.ledger.append(block);
    return block;
  }

  public executeCycle(io = 'EXEC'): IMiniBlock {
    return this.runCycle(io);
  }

  public verifyMemoryIntegrity(): boolean {
    return this.memory.verifyIntegrity();
  }

  public getMemorySize(): number {
    return this.memory.size();
  }

  public recallMemory(memoryId: string): MemoryRecord | undefined {
    return this.memory.recallMemory(memoryId);
  }

  public getMemory(): Remember {
    return this.memory;
  }

  public getVerificationEngine(): VerificationEngine {
    return this.verificationEngine;
  }

  public getObserver(): Observer {
    return this.observer;
  }
}

export function executeOceanicosMaxExpansion(): CryptographicBlock {
  const kernelChain = new PluralisticHashChain();
  const telemetry = observePlanetaryBase();
  const verificationReceipt = verifyPlanetarySovereignty(telemetry);
  const securelyMintedBlock = kernelChain.commitState(verificationReceipt);
  return securelyMintedBlock;
}

export { OperatingSystemKernel } from './os.js';
export { OmegaTotalCompressor } from './omegaTotal.js';
export * from './agent.js';
export default MiniKernel;
