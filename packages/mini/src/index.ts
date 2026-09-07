import { ObserverEngine } from '@oceanicos/observer';
import { VerificationEngine } from '@oceanicos/verification';
import { RememberEngine } from '@oceanicos/remember';
import { IMiniBlock } from '@oceanicos/types';

export class MiniKernelCoordinator {
  constructor(private remember: RememberEngine) {}

  public executeCycle(): IMiniBlock {
    const observation = ObserverEngine.generateTelemetry();
    const evidence = VerificationEngine.evaluate(observation);
    return this.remember.append(observation, evidence);
  }
}
