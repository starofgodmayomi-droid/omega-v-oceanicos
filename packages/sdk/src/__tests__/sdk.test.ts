import { OceanicosClient } from '../index';

describe('OceanicosClient (SDK)', () => {
  it('should run full loop in local embedded mode', async () => {
    const client = new OceanicosClient({ mode: 'local' });

    const result = await client.runLoop({
      claim: 'Service gateway response time under limit',
      category: 'health-check',
      metadata: { statusCode: 200, responseTime: 35 },
    });

    expect(result.observation).toBeDefined();
    expect(result.verification.summary.passed).toBe(true);
    expect(result.attestation.verified).toBe(true);
    expect(result.attestation.signature).toMatch(/^0x/);

    expect(client.getLogEntries()).toHaveLength(3);
    expect(client.verifyIntegrity().valid).toBe(true);
  });

  it('should compute metrics correctly through SDK', async () => {
    const client = new OceanicosClient();
    await client.runLoop({ claim: 'Claim 1' });
    await client.runLoop({ claim: 'Claim 2' });

    const metrics = client.getMetrics();
    expect(metrics.totalObservations).toBe(2);
    expect(metrics.totalAttestations).toBe(2);
  });

  it('should register custom rules and query events through SDK', async () => {
    const client = new OceanicosClient();
    client.registerRule({
      name: 'custom-sdk-rule',
      version: '1.0.0',
      appliesTo: ['custom-check'],
      definition: 'status == true',
      description: 'Custom rule via SDK',
      createdAt: new Date().toISOString(),
      active: true,
    });

    const rules = client.getRules();
    expect(rules.some((r) => r.name === 'custom-sdk-rule')).toBe(true);

    await client.runLoop({ claim: 'Custom Claim', category: 'custom-check' });
    const query = client.queryEvents({ type: 'OBSERVATION' });
    expect(query.events.length).toBeGreaterThan(0);

    const exported = client.exportChain();
    expect(exported.integrity.valid).toBe(true);
    expect(exported.events.length).toBe(3);

    expect(client.getStore()).toBeDefined();
    expect(client.getProvenanceStore()).toBeDefined();
    expect(client.getVerificationEngine()).toBeDefined();
    expect(client.getObserver()).toBeDefined();
    expect(client.getAttestationService()).toBeDefined();
  });

  it('should run grand-flow locally with all 10 stages', async () => {
    const client = new OceanicosClient({ mode: 'local' });
    const res = await client.runGrandFlow({
      intentClaim: 'Grand Flow SDK verification test',
      actorDid: 'did:omega:agent:tester',
      swapAmount: 100,
    });

    expect(res.continuumFlowId).toBeDefined();
    expect(res.intermediateForm.verificationPassed).toBe(true);
    expect(res.executionForm.evmGasUsed).toBe(21000);
    expect(res.canonicalState.verificationStatus).toBe('VERIFIED');
    expect(res.maxForm.vaultEpoch).toBe(1);
  });

  it('should run hyper-flow locally with all 22 stages', async () => {
    const client = new OceanicosClient({ mode: 'local' });
    const res = await client.runHyperFlow({
      intentClaim: 'Hyper Flow 22-Stage SDK execution test',
      actorDid: 'did:omega:agent:hyper-tester',
      swapAmount: 200,
    });

    expect(res.stageCount).toBe(22);
    expect(res.success).toBe(true);
    expect(res.zkStage.circuitId).toBe('circuit-latency-bound');
    expect(res.shardingStage.state).toBe('COMMITTED');
    expect(res.bridgeStage.status).toBe('FINALIZED');
    expect(res.consensusStage.quorumReached).toBe(true);
    expect(res.learningStage.recommendation).toBe('MAINTAIN');
    expect(res.moodStage.state).toBe('OPTIMAL_FLOW');
  });

  it('should run foundational mini cycle through SDK', () => {
    const client = new OceanicosClient();
    const result = client.runMiniCycle({
      claim: 'Mini cycle verification test',
      category: 'health-check',
      metadata: { responseTime: 40, statusCode: 200 },
    });

    expect(result.observation).toBeDefined();
    expect(result.verification).toBeDefined();
    expect(result.memory).toBeDefined();
    expect(result.passed).toBe(true);
    expect(client.getMiniKernel()).toBeDefined();
    expect(client.getRemember()).toBeDefined();
    expect(client.getRemember().verifyIntegrity()).toBe(true);
  });

  it('should lock totality into now through SDK', () => {
    const client = new OceanicosClient();
    const manifest = client.lockTotality({
      claim: 'Totality test via SDK',
      category: 'health-check',
      metadata: { responseTime: 25, statusCode: 200 },
    });

    expect(manifest.stateRoot).toBe('Ø');
    expect(manifest.stewardshipAxiom).toBe('TOOLS_FOR_EVOLUTION_NOT_WAR');
    expect(manifest.cycleResult.passed).toBe(true);
    expect(manifest.memoryIntegrityValid).toBe(true);
    expect(client.getOmegaTotalCompressor()).toBeDefined();
    expect(client.getOSKernel()).toBeDefined();
  });
});
