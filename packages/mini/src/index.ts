import crypto from 'node:crypto';
import { ObserverEngine } from '@oceanicos/observer';
import { VerificationEngine } from '@oceanicos/verification';
import { RememberEngine } from '@oceanicos/remember';
import { IMiniBlock } from '@oceanicos/types';

export class MiniKernel {
  constructor(private readonly ledger: RememberEngine) {}

  public runCycle(io = 'EXEC'): IMiniBlock {
    const observation = ObserverEngine.generateTelemetry(io);
    const evidence = VerificationEngine.evaluate(observation);
    const previousHash = this.ledger.getTip()?.hash ?? '8a3f91c2e4f9011b989210ffffffffff';
    let nonce = 0,
      hash = '';
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
}
