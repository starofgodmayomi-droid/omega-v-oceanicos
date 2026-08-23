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
    expect(client.getVerificationEngine()).toBeDefined();
    expect(client.getObserver()).toBeDefined();
    expect(client.getAttestationService()).toBeDefined();
  });
});
