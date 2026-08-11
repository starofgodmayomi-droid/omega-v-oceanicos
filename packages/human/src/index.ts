import { HumanInput, HumanActionType } from '@omega-v/types';

/**
 * Human Intelligence Engine: Implements Section XXVIII
 * Provides an attributable boundary for human participation in the loop.
 */
export class HumanEngine {
  private humanInputs: Map<string, HumanInput> = new Map();

  /**
   * Record a human participation event in the loop
   */
  public recordInput(
    type: HumanActionType,
    humanId: string,
    rationale: string,
    payload: Record<string, unknown> = {},
    contextId?: string
  ): HumanInput {
    const input: HumanInput = {
      id: `hum-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      humanId,
      contextId,
      payload,
      rationale,
      recordedAt: new Date().toISOString()
    };

    this.humanInputs.set(input.id, input);
    return input;
  }

  /**
   * Retrieve a human input by its ID
   */
  public getInput(id: string): HumanInput | undefined {
    return this.humanInputs.get(id);
  }

  /**
   * Get all human inputs for a specific context (e.g. a specific governance decision or verification)
   */
  public getInputsForContext(contextId: string): HumanInput[] {
    return Array.from(this.humanInputs.values()).filter(input => input.contextId === contextId);
  }
}

export default HumanEngine;
