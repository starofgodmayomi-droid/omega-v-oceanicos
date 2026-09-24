import { RealityObserverEngine } from '../../apps/api/src/omega/reality-observer.js';
import type { OmegaCommandResult, OmegaObservation } from '@oceanicos/types';

describe('Coordination Evidence Probe Slice', () => {
  it('observes default local-single-process coordination boundary with bounded evidence', () => {
    const obs = RealityObserverEngine.observeCoordinationEvidence();

    expect(obs.observerType).toBe('coordination_probe');
    expect(obs.target).toBe('coordination_boundary');
    expect(obs.stateHash).toBeTruthy();
    expect(obs.timestamp).toBeTruthy();
    expect(obs.observerId).toMatch(/^obs_coord_/);

    const data = obs.observedData as Record<string, unknown>;
    expect(data.mode).toBe('local-single-process');
    expect(data.reference).toBeNull();
    expect(data.evidence).toBe('runtime-observed');
    expect(data.scope).toBe('single-process');
    expect(data.verified).toBe(false); // Invariant: coordination evidence never fabricates truth
    expect(data.isConfigured).toBe(true);
    expect(data.limitations).toEqual(
      expect.arrayContaining(['does not prove distributed consistency'])
    );
  });

  it('observes operator-coordinated policy with non-empty reference', () => {
    const obs = RealityObserverEngine.observeCoordinationEvidence(
      'operator-coordinated',
      'steward-reference-77'
    );

    const data = obs.observedData as Record<string, unknown>;
    expect(data.mode).toBe('operator-coordinated');
    expect(data.reference).toBe('steward-reference-77');
    expect(data.isConfigured).toBe(true);
    expect(data.verified).toBe(false);
  });

  it('fails closed to invalid mode when reference is missing for external coordinator', () => {
    const obs = RealityObserverEngine.observeCoordinationEvidence(
      'external-coordinator',
      undefined // missing required reference
    );

    const data = obs.observedData as Record<string, unknown>;
    expect(data.mode).toBe('invalid');
    expect(data.isConfigured).toBe(false);
    expect(data.reason).toContain('coordination policy reference is missing or invalid');
  });

  it('reconciles coordination observation against claimed execution result', () => {
    const obs = RealityObserverEngine.observeCoordinationEvidence(
      'operator-coordinated',
      'ref-alpha'
    );

    // Matching claimed target
    const resultMatching: OmegaCommandResult = {
      commandId: 'cmd-coord-1',
      status: 'EXECUTED',
      stateAfter: { transitionTarget: 'coordination_boundary' },
      observation: obs,
    };

    const verdictVerified = RealityObserverEngine.verifyReality(resultMatching, obs);
    expect(verdictVerified.verdict).toBe('VERIFIED');
    expect(verdictVerified.discrepancies).toHaveLength(0);

    // Mismatched target
    const resultDivergent: OmegaCommandResult = {
      commandId: 'cmd-coord-2',
      status: 'EXECUTED',
      stateAfter: { transitionTarget: 'wrong_target' },
      observation: obs,
    };

    const verdictDivergent = RealityObserverEngine.verifyReality(resultDivergent, obs);
    expect(verdictDivergent.verdict).toBe('DIVERGENT');
    expect(verdictDivergent.discrepancies.some((d) => d.includes('Target mismatch'))).toBe(true);
  });
});
