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

  it('POST /v1/verification/convergence evaluates Maximum Total Convergence Singularity (Ψ)', async () => {
    // 1. Balanced Harmonic Zero Entropy Equilibrium: <A, B>*S + C = 0 -> 0
    const resBalanced = await app.inject({
      method: 'POST',
      url: '/v1/verification/convergence',
      payload: {
        A: [1, 2, 3, 4],
        B: [1, 1, 1, 1],
        C: -10,
        S: 1,
      },
    });

    assert.equal(resBalanced.statusCode, 200);
    const bodyBalanced = JSON.parse(resBalanced.payload);
    assert.equal(bodyBalanced.success, true);
    assert.equal(bodyBalanced.contract, 'Ω∞v-TOTAL-CONVERGENCE-SINGULARITY-V1');
    assert.equal(bodyBalanced.evaluation.balanced, true);
    assert.equal(bodyBalanced.evaluation.balanceMetric, 0);
    assert.equal(bodyBalanced.evaluation.result, 0);

    // 2. Active Reality Verification Branch: <A, B>*S + C = 5 != 0 -> { "Ω∞v": "..." }
    const resActive = await app.inject({
      method: 'POST',
      url: '/v1/verification/convergence',
      payload: {
        A: [1, 2],
        B: [3, -1],
        C: 5,
        S: 2,
        delta: {
          intent: 'SOVEREIGN_REALITY_STABILITY',
          reality: 'SOVEREIGN_REALITY_STABILITY',
        },
      },
    });

    assert.equal(resActive.statusCode, 200);
    const bodyActive = JSON.parse(resActive.payload);
    assert.equal(bodyActive.success, true);
    assert.equal(bodyActive.evaluation.balanced, false);
    assert.equal(bodyActive.evaluation.balanceMetric, 7);
    assert.deepEqual(bodyActive.evaluation.result, {
      'Ω∞v': 'VERIFIED(SOVEREIGN_REALITY_STABILITY)',
    });
  });

  it('POST /v1/verification/step executes recursive update O_{t+1} = REMEMBER(VERIFY(OBSERVE(O_t, Δ)))', async () => {
    // 1. Authorized, matching observation -> VERIFIED
    const resVerified = await app.inject({
      method: 'POST',
      url: '/v1/verification/step',
      payload: {
        currentState: {
          epoch: 17,
          stateHash: '1def428b80fe33eae8fc94bca0fbf47c82fd02d1147e04c704d886222cbcdbfa',
          parentHash: '86d77b24503518470b0f14a08511986e5790d30e8794a048b401de1eeaf6499b',
          intent: 'V1111_SINGULARITY_RADICAL_COMPRESSION',
          verified: true,
          outcome: 'VERIFIED',
          value: 100,
          timestamp: '2026-10-20T04:20:00.000Z',
        },
        candidate: {
          id: 'slice-v1111-fluid-matrix',
          intent: 'FLUID_COMPUTING_MATRIX_TORUS_STABILIZATION',
          valueEstimate: 99,
          evidenceQuality: 1.0,
          riskEstimate: 1,
          costEstimate: 2,
          authority: true,
          policy: true,
          scoped: true,
          acceptanceCriteria: ['Water geometry torus stable', 'Light-cone zero-entropy satisfied'],
        },
        observedReality: 'FLUID_COMPUTING_MATRIX_TORUS_STABILIZATION',
      },
    });

    assert.equal(resVerified.statusCode, 200);
    const bodyVerified = JSON.parse(resVerified.payload);
    assert.equal(bodyVerified.success, true);
    assert.equal(bodyVerified.contract, 'Ω∞v-RECURSIVE-STATE-UPDATE-V1');
    assert.equal(bodyVerified.step.verification.outcome, 'VERIFIED');
    assert.equal(bodyVerified.step.verification.decision, 'ALLOW');
    assert.equal(bodyVerified.step.nextState.epoch, 18);
    assert.equal(bodyVerified.step.nextState.parentHash, '1def428b80fe33eae8fc94bca0fbf47c82fd02d1147e04c704d886222cbcdbfa');
    assert.equal(typeof bodyVerified.step.nextState.stateHash, 'string');
    assert.equal(bodyVerified.step.nextState.value, 99);

    // 2. Fail-closed: missing authority -> NOT_EXECUTED & DENY
    const resDenied = await app.inject({
      method: 'POST',
      url: '/v1/verification/step',
      payload: {
        candidate: {
          id: 'unauthorized-slice',
          intent: 'UNAUTHORIZED_MUTATION',
          valueEstimate: 1000,
          evidenceQuality: 1.0,
          riskEstimate: 0,
          costEstimate: 0,
          authority: false,
          policy: true,
          scoped: true,
          acceptanceCriteria: [],
        },
      },
    });

    assert.equal(resDenied.statusCode, 200);
    const bodyDenied = JSON.parse(resDenied.payload);
    assert.equal(bodyDenied.step.verification.outcome, 'NOT_EXECUTED');
    assert.equal(bodyDenied.step.verification.decision, 'DENY');
    assert.equal(bodyDenied.step.nextState.verified, false);
    assert.equal(bodyDenied.step.nextState.value, 0);
  });
});

