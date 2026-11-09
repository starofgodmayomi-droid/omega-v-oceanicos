import { compressAiNews, CANONICAL_AI_NEWS } from '../news-route.js';

describe('📰 AI News & Multi-World Holographic Compression Suite', () => {
  it('compresses canonical AI news and generates valid holographic report', () => {
    const report = compressAiNews();
    expect(report.success).toBe(true);
    expect(report.contract).toBe('Ω∞v-AI-NEWS-HOLOGRAPHIC-COMPRESSION-V1');
    expect(report.steward).toBe('did:omega:human:starofgodmayomi');
    expect(report.holographicAxiom).toContain('Each step contains all steps');
    expect(report.totalSignals).toBe(CANONICAL_AI_NEWS.length);
    expect(report.noiseFilteredRatio).toBeGreaterThan(0.8);
    expect(report.evaluationHash).toHaveLength(64);

    // Multi-world vectors
    expect(report.multiWorldVectors.physical).toBeGreaterThanOrEqual(1);
    expect(report.multiWorldVectors.cognitive).toBeGreaterThanOrEqual(1);
    expect(report.multiWorldVectors.economic).toBeGreaterThanOrEqual(1);
    expect(report.multiWorldVectors.celestial).toBeGreaterThanOrEqual(1);
  });

  it('compresses custom external headlines and filters noise', () => {
    const customFeed = [
      {
        headline: 'Open-weight reasoning models break benchmark thresholds',
        source: 'ArXiv preprint server',
        world: 'WORLD_COGNITIVE' as const,
      },
    ];
    const report = compressAiNews(customFeed);
    expect(report.totalSignals).toBe(CANONICAL_AI_NEWS.length + 1);
    expect(report.signals[0].headline).toBe(customFeed[0].headline);
    expect(report.signals[0].verificationStatus).toBe('VERIFIED');
    expect(report.signals[0].resonanceHz).toBe(432);
  });
});
