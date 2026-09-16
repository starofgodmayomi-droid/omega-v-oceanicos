import type { AttestationEntry } from './attestation-memory.js';
import type { OmegaLearningFeedback, OmegaDiscrepancyGroup } from '@oceanicos/types';

/**
 * C8: Omega Learning Engine
 *
 * Synthesizes historical attestation memory and reality reconciliation records
 * into empirical reliability metrics, failure taxonomy, and operating recommendations.
 *
 * Invariant: Pure and deterministic computation based strictly on executable evidence
 * stored in the append-only attestation chain.
 */
export function synthesizeOmegaLearning(entries: readonly AttestationEntry[]): OmegaLearningFeedback {
  const totalEvaluated = entries.length;
  if (totalEvaluated === 0) {
    return {
      totalEvaluated: 0,
      completedCount: 0,
      refusedCount: 0,
      verifiedCount: 0,
      divergentCount: 0,
      unknownCount: 0,
      reliabilityScore: 1.0,
      workerReliability: {},
      recurrentDiscrepancies: [],
      recommendations: [
        'No historical attestations recorded yet. Run an initial observation cycle to establish baseline.',
      ],
      analyzedAt: new Date().toISOString(),
    };
  }

  let completedCount = 0;
  let refusedCount = 0;
  let verifiedCount = 0;
  let divergentCount = 0;
  let unknownCount = 0;

  const discrepancyMap = new Map<string, string[]>();

  for (const entry of entries) {
    const status = entry.transitionStatus?.toUpperCase();
    if (status === 'EXECUTED' || status === 'COMPLETED') {
      completedCount++;
    } else if (status === 'REFUSED') {
      refusedCount++;
    }


    if (entry.realityVerdict === 'VERIFIED') {
      verifiedCount++;
    } else if (entry.realityVerdict === 'DIVERGENT') {
      divergentCount++;
    } else {
      unknownCount++;
    }

    if (entry.discrepancies && entry.discrepancies.length > 0) {
      for (const disc of entry.discrepancies) {
        const kind = disc.includes(':') ? disc.split(':')[0].trim() : 'general_discrepancy';
        const list = discrepancyMap.get(kind) ?? [];
        list.push(disc);
        discrepancyMap.set(kind, list);
      }
    }
  }

  // Calculate weighted reliability score: 40% execution completion + 60% reality verification
  const rawScore = (completedCount * 0.4 + verifiedCount * 0.6) / totalEvaluated;
  const reliabilityScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 10000) / 10000));

  // Recurrent discrepancies
  const recurrentDiscrepancies: OmegaDiscrepancyGroup[] = [];
  for (const [kind, samples] of discrepancyMap.entries()) {
    recurrentDiscrepancies.push({
      kind,
      count: samples.length,
      samples: samples.slice(0, 5),
    });
  }
  recurrentDiscrepancies.sort((a, b) => b.count - a.count);

  // Recommendations
  const recommendations: string[] = [];
  if (divergentCount > 0) {
    recommendations.push(
      `Reality divergence detected in ${divergentCount} run(s). Inspect observation target alignment and eliminate unmodeled side effects.`
    );
  }
  if (refusedCount > 0) {
    recommendations.push(
      `Transition execution was refused in ${refusedCount} instance(s). Verify policy clearance and human authorization before retrying.`
    );
  }
  if (divergentCount === 0 && refusedCount === 0 && verifiedCount > 0) {
    recommendations.push(
      'Operational loop verified clean across all runs. Safe for routine progression and pipeline advancement.'
    );
  }
  if (unknownCount > 0 && verifiedCount === 0 && divergentCount === 0) {
    recommendations.push(
      'Pending reality verification. Capture observation probes to prove external physical truth.'
    );
  }

  return {
    totalEvaluated,
    completedCount,
    refusedCount,
    verifiedCount,
    divergentCount,
    unknownCount,
    reliabilityScore,
    workerReliability: {
      'system-executor': completedCount > 0 ? Math.round((completedCount / totalEvaluated) * 100) / 100 : 1.0,
      'reality-observer': verifiedCount > 0 ? Math.round((verifiedCount / totalEvaluated) * 100) / 100 : 1.0,
    },
    recurrentDiscrepancies,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}
