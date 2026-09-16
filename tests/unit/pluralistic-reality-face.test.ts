import { describe, it, expect } from '@jest/globals';
import { PluralisticRealityMatrix } from '@oceanicos/pluralism';

describe('PluralisticRealityMatrix — 5 Epistemic Faces Evaluation', () => {
  it('evaluates all 5 Epistemic Faces into a unified harmonic matrix', () => {
    const face = PluralisticRealityMatrix.evaluateMatrix();

    expect(face.faceMatrixId).toMatch(/^prf_/);
    expect(face.lawRoute).toBe('MANY_FACES ➔ ONE_SOUL ➔ SOURCE_LEDGER');
    expect(face.axiomProof).toBe('GOOD - O = GOD');
    expect(face.faces).toHaveLength(5);

    const faceIds = face.faces.map(f => f.faceId);
    expect(faceIds).toEqual(['FORMAL', 'PLURAL', 'SYSTEM', 'REALITY', 'LIQUID_SOUL']);

    expect(face.overallHarmonicScore).toBeGreaterThanOrEqual(0.90);
    expect(face.frictionDissolutionQuotient).toBe(1.0);
    expect(face.clusterAttestationDigest).toHaveLength(64);
    expect(face.consensusVerdict).toBe('PASS');
  });

  it('preserves minority dissensus when a regional face signals divergence', () => {
    const face = PluralisticRealityMatrix.evaluateMatrix({
      regionalStreams: [
        { nodeId: 'us-virginia', regionCode: 'US-EAST', telemetryMetric: 0.98, storyPayload: 'US_EAST' },
        { nodeId: 'eu-frankfurt', regionCode: 'EU-CENTRAL', telemetryMetric: 0.95, storyPayload: 'EU_CENTRAL' },
        { nodeId: 'cn-shanghai', regionCode: 'AP-EAST', telemetryMetric: 0.72, storyPayload: 'AP_EAST_DISSENT' }, // dissenting
        { nodeId: 'me-dubai', regionCode: 'ME-CENTRAL', telemetryMetric: 0.93, storyPayload: 'ME_CENTRAL' },
      ],
    });

    const pluralFace = face.faces.find(f => f.faceId === 'PLURAL');
    expect(pluralFace).toBeDefined();
    expect(pluralFace?.score).toBe(0.75); // 3 of 4 pass >= 0.90
    expect(pluralFace?.verified).toBe(true); // >= 0.66 threshold
    expect(pluralFace?.dissensusNotes).toHaveLength(1);
    expect(pluralFace?.dissensusNotes?.[0]).toContain('minority dissent preserved');
    expect(face.consensusVerdict).toBe('PLURAL_PRESERVED');
  });

  it('fails fail-closed if empirical reality is not observed', () => {
    const face = PluralisticRealityMatrix.evaluateMatrix({
      realityObserved: false,
    });

    const realityFace = face.faces.find(f => f.faceId === 'REALITY');
    expect(realityFace?.verified).toBe(false);
    expect(realityFace?.score).toBe(0.0);
    expect(face.consensusVerdict).toBe('DIVERGENT');
  });
});
