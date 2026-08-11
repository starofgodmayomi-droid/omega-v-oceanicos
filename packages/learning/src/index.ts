import { Prediction, LearningEvent, LearningInsight, VerificationResult } from '@omega-v/types';

/**
 * Learning Engine: Implements Section XXVI (Learning)
 * Learning must be grounded in observed outcomes compared to predictions.
 */
export class LearningEngine {
  private predictions: Map<string, Prediction> = new Map();
  private learningEvents: Map<string, LearningEvent> = new Map();

  /**
   * Make a prediction about a future verification result based on a rule
   */
  public makePrediction(expectedOutcome: string, confidence: number, basedOnRule: string): Prediction {
    const prediction: Prediction = {
      id: `pred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      expectedOutcome,
      confidence,
      basedOnRule,
      madeAt: new Date().toISOString(),
    };

    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  /**
   * Compare a prediction to reality (VerificationResult) and generate a learning event
   */
  public evaluatePrediction(predictionId: string, result: VerificationResult): LearningEvent {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }

    const actualOutcome = result.summary.passed ? 'PASS' : 'FAIL';
    const isMatch = prediction.expectedOutcome === actualOutcome;
    
    // Error is 0 if it matches, up to 1 based on confidence if it doesn't match
    // High confidence + mismatch = high error (max 1.0)
    // Low confidence + mismatch = lower error
    const error = isMatch ? 0 : prediction.confidence;

    let recommendation = 'MAINTAIN';
    if (error > 0.8) {
        recommendation = 'IMMEDIATE_REVISION_REQUIRED';
    } else if (error > 0.5) {
        recommendation = 'REVIEW_RULE_ASSUMPTIONS';
    } else if (error > 0) {
        recommendation = 'MONITOR_DRIFT';
    }

    const insight: LearningInsight = {
      description: isMatch 
        ? `Prediction validated for rule '${prediction.basedOnRule}'.`
        : `Prediction failed for rule '${prediction.basedOnRule}'. Expected ${prediction.expectedOutcome}, got ${actualOutcome}.`,
      confidence: isMatch ? prediction.confidence : (1 - error),
      affectedRule: prediction.basedOnRule,
      recommendation,
      learnedAt: new Date().toISOString(),
    };

    const learningEvent: LearningEvent = {
      id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      predictionId,
      prediction,
      actualOutcome,
      error,
      insight,
      recordedAt: new Date().toISOString(),
    };

    this.learningEvents.set(learningEvent.id, learningEvent);
    return learningEvent;
  }

  /**
   * Retrieve all learning events
   */
  public getLearningHistory(): LearningEvent[] {
    return Array.from(this.learningEvents.values());
  }
}

export default LearningEngine;
