import { OceanicosKernel } from '../index';

describe('@omega-v/kernel — Oceanic Finite State Machine Kernel', () => {
  let kernel: OceanicosKernel;

  beforeEach(() => {
    kernel = new OceanicosKernel('test-canonical-kernel-secret');
  });

  it('should compile canonical state transition Sn from intent, observation, and machine evidence', () => {
    const state = kernel.transition({
      intent: {
        claim: 'Deploy verified consensus upgrade',
        actors: ['did:omega:agent:builder-01', 'did:omega:agent:verifier-01'],
        inputs: { version: '1.2.0', targetEpoch: 42 },
        expectedOutputs: { deployed: true, gasConsumed: 15000 },
        constraints: ['latency < 100ms', 'zero-dissent-quorum'],
        permissions: ['EXECUTE_UPGRADE'],
        dependencies: ['consensus-v1.1'],
        maxRiskScore: 0.15,
        economicTarget: { targetValue: 1000, resourceBudget: 50 },
      },
      observation: {
        source: 'telemetry:system-monitor',
        observedAt: new Date().toISOString(),
        rawTelemetry: { cpuUsage: 0.22, memoryMb: 512 },
        epistemicType: 'FACT',
        confidence: 0.99,
      },
      evidenceItems: [
        {
          claim: 'Unit tests 100% passing',
          source: 'jest-runner',
          observationId: 'obs-test-01',
          commandOrTest: 'npx jest --no-coverage',
          status: 'PASSED',
          confidence: 1.0,
        },
        {
          claim: 'Formal verification invariants held',
          source: 'verifier-engine',
          observationId: 'obs-formal-01',
          commandOrTest: 'verifyInvariants()',
          status: 'PASSED',
          confidence: 0.98,
        },
      ],
      actionPlan: {
        targetService: 'consensus-engine',
        payload: { upgrade: 'v1.2.0' },
        isDestructive: false,
        isFinancial: false,
        gasLimit: 50000,
        reversibility: 'REVERSIBLE',
      },
      autoAuthorizeIfNonDestructive: true,
    });

    expect(state.stateId).toMatch(/^state-1-/);
    expect(state.verificationStatus).toBe('VERIFIED');
    expect(state.evidence).toHaveLength(2);
    expect(state.evidence[0].proofWitness).toMatch(/^0x/);
    expect(state.stateDeltaHash).toMatch(/^0x/);
    expect(state.attestationSignature).toMatch(/^0x/);
    expect(state.authorization.isAuthorized).toBe(true);
    expect(state.action.status).toBe('READY');
  });

  it('should preserve multi-model dissent without silently averaging away', () => {
    const state = kernel.transition({
      intent: {
        claim: 'Reallocate liquidity pool depth',
        actors: ['did:omega:agent:allocator'],
        inputs: { pool: 'USDC-ETH', amount: 50000 },
        expectedOutputs: { slippageReduction: 0.02 },
        constraints: ['max-slippage < 0.01'],
        permissions: ['REBALANCE_POOL'],
        dependencies: [],
        maxRiskScore: 0.3,
        economicTarget: { targetValue: 500, resourceBudget: 20 },
      },
      observation: {
        source: 'oracle:dex-feed',
        observedAt: new Date().toISOString(),
        rawTelemetry: { spotPrice: 3200 },
        epistemicType: 'INFERENCE',
        confidence: 0.88,
      },
      evidenceItems: [
        {
          claim: 'Liquidity depth meets minimum invariant',
          source: 'amm-math',
          observationId: 'obs-amm',
          commandOrTest: 'checkDepth()',
          status: 'PASSED',
          confidence: 0.95,
        },
      ],
      dissentItems: [
        {
          agentOrModelDid: 'did:omega:model:risk-sentinel',
          dissentingHypothesis: 'High volatility regime could cause impermanent loss spike',
          conflictWeight: 0.45,
        },
      ],
      actionPlan: {
        targetService: 'intent-settlement',
        payload: { shift: 50000 },
        isDestructive: false,
        isFinancial: true,
        gasLimit: 20000,
        reversibility: 'REVERSIBLE',
      },
    });

    expect(state.verificationStatus).toBe('DISSENT_CONTAINED');
    expect(state.dissent).toHaveLength(1);
    expect(state.dissent[0].agentOrModelDid).toBe('did:omega:model:risk-sentinel');
    expect(state.dissent[0].dissentEvidenceProof).toMatch(/^0x/);
    // Financial action must require human authorization
    expect(state.authorization.requiresHumanApproval).toBe(true);
    expect(state.authorization.isAuthorized).toBe(false);
    expect(state.action.status).toBe('PENDING_AUTH');
  });

  it('should gate sensitive actions and execute only after explicit human authorization', () => {
    const state = kernel.transition({
      intent: {
        claim: 'Execute irreversible state migration',
        actors: ['did:omega:agent:migrator'],
        inputs: { targetShard: 4 },
        expectedOutputs: { migrated: true },
        constraints: ['zero-loss'],
        permissions: ['MIGRATE_SHARD'],
        dependencies: [],
        maxRiskScore: 0.5,
        economicTarget: { targetValue: 2000, resourceBudget: 100 },
      },
      observation: {
        source: 'system:sharding',
        observedAt: new Date().toISOString(),
        rawTelemetry: { shardCount: 1024 },
        epistemicType: 'FACT',
        confidence: 1.0,
      },
      evidenceItems: [
        {
          claim: 'Target shard has capacity',
          source: 'shard-router',
          observationId: 'obs-shard',
          commandOrTest: 'checkCapacity()',
          status: 'PASSED',
          confidence: 1.0,
        },
      ],
      actionPlan: {
        targetService: 'sharding-engine',
        payload: { shardId: 4 },
        isDestructive: true,
        isFinancial: false,
        gasLimit: 100000,
        reversibility: 'IRREVERSIBLE',
      },
    });

    expect(state.authorization.requiresHumanApproval).toBe(true);
    expect(state.authorization.isAuthorized).toBe(false);

    // Authorize via Human DID
    const authorizedState = kernel.authorizeAction({
      stateId: state.stateId,
      authorizerDid: 'did:omega:human:admin-01',
      authorizationSignature: '0xsignature_human_verified_ok',
    });

    expect(authorizedState.authorization.isAuthorized).toBe(true);
    expect(authorizedState.authorization.authorizedByDid).toBe('did:omega:human:admin-01');
    expect(authorizedState.action.status).toBe('READY');
  });

  it('should record consequence, evaluate economic efficiency, and trigger adaptive recompilation', () => {
    const state = kernel.transition({
      intent: {
        claim: 'Optimize cache policy',
        actors: ['did:omega:agent:tuner'],
        inputs: { ttl: 600 },
        expectedOutputs: { hitRate: 0.95 },
        constraints: [],
        permissions: [],
        dependencies: [],
        maxRiskScore: 0.05,
        economicTarget: { targetValue: 300, resourceBudget: 10 },
      },
      observation: {
        source: 'cache-stats',
        observedAt: new Date().toISOString(),
        rawTelemetry: { hitRate: 0.8 },
        epistemicType: 'FACT',
        confidence: 1.0,
      },
      evidenceItems: [
        {
          claim: 'Cache memory available',
          source: 'dht-memory',
          observationId: 'obs-mem',
          commandOrTest: 'getFreeMem()',
          status: 'PASSED',
          confidence: 1.0,
        },
      ],
      actionPlan: {
        targetService: 'dht-engine',
        payload: { ttl: 600 },
        isDestructive: false,
        isFinancial: false,
        gasLimit: 5000,
        reversibility: 'REVERSIBLE',
      },
      autoAuthorizeIfNonDestructive: true,
    });

    const settledState = kernel.applyConsequence({
      stateId: state.stateId,
      observedStatus: 'SUCCESS',
      realizedEffects: { newHitRate: 0.96, latencyDropMs: 12 },
      executionDurationMs: 45,
      verifiedValueGenerated: 350,
      resourceCost: 5,
    });

    expect(settledState.consequence?.observedStatus).toBe('SUCCESS');
    expect(settledState.consequence?.verifiedValueGenerated).toBe(350);
    expect(settledState.consequence?.efficiencyRatio).toBeGreaterThan(0);
    expect(settledState.learning?.recompileTriggered).toBe(true);
    expect(settledState.learning?.rewardSignal).toBe(1.0);
  });

  it('should maintain cryptographically verifiable parent-to-child state lineage', () => {
    const s1 = kernel.transition({
      intent: {
        claim: 'Step 1: Ingest Data Blob',
        actors: ['did:omega:agent:da'],
        inputs: { blobId: 'blob-1' },
        expectedOutputs: { committed: true },
        constraints: [],
        permissions: [],
        dependencies: [],
        maxRiskScore: 0.1,
        economicTarget: { targetValue: 100, resourceBudget: 5 },
      },
      observation: {
        source: 'da-ledger',
        observedAt: new Date().toISOString(),
        rawTelemetry: { size: 1024 },
        epistemicType: 'FACT',
        confidence: 1.0,
      },
      evidenceItems: [
        {
          claim: 'Blob hash verified',
          source: 'da-hasher',
          observationId: 'obs-b1',
          commandOrTest: 'verifyBlob()',
          status: 'PASSED',
          confidence: 1.0,
        },
      ],
      actionPlan: {
        targetService: 'da-engine',
        payload: { blobId: 'blob-1' },
        isDestructive: false,
        isFinancial: false,
        gasLimit: 5000,
        reversibility: 'REVERSIBLE',
      },
      autoAuthorizeIfNonDestructive: true,
    });

    const s2 = kernel.transition({
      intent: {
        claim: 'Step 2: Settle Rollup Batch',
        actors: ['did:omega:agent:rollup'],
        inputs: { prevBatch: s1.stateDeltaHash },
        expectedOutputs: { settled: true },
        constraints: [],
        permissions: [],
        dependencies: [s1.stateId],
        maxRiskScore: 0.1,
        economicTarget: { targetValue: 200, resourceBudget: 10 },
      },
      observation: {
        source: 'rollup-l2',
        observedAt: new Date().toISOString(),
        rawTelemetry: { batchSize: 50 },
        epistemicType: 'FACT',
        confidence: 1.0,
      },
      evidenceItems: [
        {
          claim: 'Rollup state diff validated',
          source: 'zk-prover',
          observationId: 'obs-r1',
          commandOrTest: 'proveBatch()',
          status: 'PASSED',
          confidence: 1.0,
        },
      ],
      actionPlan: {
        targetService: 'rollup-engine',
        payload: { batchId: 'batch-2' },
        isDestructive: false,
        isFinancial: false,
        gasLimit: 10000,
        reversibility: 'REVERSIBLE',
      },
      autoAuthorizeIfNonDestructive: true,
    });

    expect(s2.parentStateHash).toBe(s1.stateDeltaHash);

    const lineage = kernel.getStateLineage(s2.stateId);
    expect(lineage).toHaveLength(2);
    expect(lineage[0].stateId).toBe(s1.stateId);
    expect(lineage[1].stateId).toBe(s2.stateId);

    const stats = kernel.getStats();
    expect(stats.totalTransitions).toBe(2);
    expect(stats.verifiedStates).toBe(2);
    expect(stats.currentRootStateHash).toBe(s2.stateDeltaHash);
  });
});
