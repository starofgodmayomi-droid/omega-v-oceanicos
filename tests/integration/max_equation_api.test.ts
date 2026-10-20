import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';

describe('🌊 Ω∞v Max Equation Compression & Optimization API Vertical Slice', () => {
  const app = createApp(':memory:', false);

  let prevKey: string | undefined;

  before(async () => {
    prevKey = process.env.OMEGA_SIGNING_KEY;
    process.env.OMEGA_SIGNING_KEY = 'omega-dev-local-signing-key-32chars-min';
    await app.ready();
  });

  after(async () => {
    if (prevKey === undefined) delete process.env.OMEGA_SIGNING_KEY;
    else process.env.OMEGA_SIGNING_KEY = prevKey;
    await app.close();
  });

  it('GET /health in local dev mode reports attester ready', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'ok');
    assert.equal(body.checks.attester, 'ready');
    assert.equal(body.checks.verifier, 'ready');
  });

  it('GET /v1/verification/max-equation returns governing contract and equations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/verification/max-equation',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.metadata.contract, 'Ω∞v-MAX-EQUATION-COMPRESSION-V1');
    assert.equal(body.metadata.governingEquation, 'Ω∞v = VERIFY( Δ(Intent, Reality) )');
    assert.equal(body.metadata.optimizationFormula, 'Δ* = argmax_{Δ ∈ F} [ Verified Value(Δ) / ( Risk(Δ) + Cost(Δ) + ε ) ]');
    assert.equal(body.metadata.priorityScoreFormula, 'PriorityScore(Δ) = [ V_hat(Δ) * Q_E(Δ) ] / [ R_hat(Δ) + C_hat(Δ) + ε ]');
    assert.equal(body.metadata.feasibleSetRules.length, 4);
    assert.equal(body.metadata.tieBreakerHierarchy.length, 4);
  });

  it('POST /v1/verification/optimize-slice selects optimal delta slice (Δ*) with hard gate enforcement', async () => {
    const candidates = [
      {
        id: 'slice-attester-ready',
        intent: 'Harden local attester signing key so health check reports ready',
        valueEstimate: 85,
        evidenceQuality: 0.95,
        riskEstimate: 2,
        costEstimate: 3,
        authority: true,
        policy: true,
        scoped: true,
        acceptanceCriteria: ['/health reports ready'],
      },
      {
        id: 'slice-rest-routes',
        intent: 'Expose max-equation API routes',
        valueEstimate: 90,
        evidenceQuality: 0.95,
        riskEstimate: 3,
        costEstimate: 5,
        authority: true,
        policy: true,
        scoped: true,
        acceptanceCriteria: ['endpoints return 200'],
      },
      {
        id: 'slice-unauthorized-takeover',
        intent: 'Unsafe unauthorized mutation',
        valueEstimate: 1000,
        evidenceQuality: 1.0,
        riskEstimate: 0,
        costEstimate: 0,
        authority: false, // Fails hard gate
        policy: false,
        scoped: false,
        acceptanceCriteria: [],
      },
    ];

    const res = await app.inject({
      method: 'POST',
      url: '/v1/verification/optimize-slice',
      payload: { candidates },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.result.contract, 'Ω∞v-MAX-EQUATION-COMPRESSION-V1');
    assert.equal(body.result.totalCandidates, 3);
    assert.equal(body.result.eligibleCandidatesCount, 2);

    // Optimal slice is slice-attester-ready because of higher priority score (85 * 0.95 / 5 = 16.15 vs 90 * 0.95 / 8 = 10.68)
    assert.equal(body.result.optimalSlice.id, 'slice-attester-ready');
    assert.equal(body.result.optimalSlice.verdict, 'ALLOW');
    assert.equal(body.result.optimalSlice.rank, 1);

    // Unauthorized candidate must be DENIED and excluded from feasible set F
    const deniedCandidate = body.result.rankedSlices.find((s: any) => s.id === 'slice-unauthorized-takeover');
    assert.ok(deniedCandidate);
    assert.equal(deniedCandidate.eligible, false);
    assert.equal(deniedCandidate.verdict, 'DENY');
    assert.equal(deniedCandidate.priorityScore, 0);
    assert.ok(deniedCandidate.denialReasons.length > 0);
  });
});
