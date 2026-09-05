import { FormlessSwarm, ObserverAgent, VerifierAgent, SecurityAgent, GrandContinuumAgent } from '../index';
import { OceanicosClient } from '@omega-v/sdk';

describe('Formless Swarm & Agents', () => {
  let sdk: OceanicosClient;

  beforeEach(() => {
    sdk = new OceanicosClient({ mode: 'local' });
  });

  it('ObserverAgent should record an observation and produce evidence', async () => {
    const agent = new ObserverAgent(sdk);
    const result = await agent.executeTask({ claim: 'Signal test observation' });
    expect(result.agentRole).toBe('Observer');
    expect(result.verified).toBe(true);
    expect(result.evidence).toHaveProperty('observationId');
  });

  it('VerifierAgent should compile and execute IR rules', async () => {
    const agent = new VerifierAgent(sdk);
    const result = await agent.executeTask({
      ruleName: 'latency-check',
      ruleDefinition: 'responseTime < 100',
      metadata: { responseTime: 25 },
    });
    expect(result.agentRole).toBe('Verifier');
    expect(result.verified).toBe(true);
  });

  it('SecurityAgent should verify event chain integrity', async () => {
    const agent = new SecurityAgent(sdk);
    const result = await agent.executeTask({});
    expect(result.agentRole).toBe('Security');
    expect(result.verified).toBe(true);
  });

  it('GrandContinuumAgent should orchestrate full grand flow cycle', async () => {
    const agent = new GrandContinuumAgent(sdk);
    const result = await agent.executeTask({
      claim: 'Apex Continuum Convergence',
      actorDid: 'did:omega:agent:grand-apex',
    });
    expect(result.agentRole).toBe('GrandContinuum');
    expect(result.verified).toBe(true);
    expect(result.action).toBe('GRAND_CONTINUUM_CYCLE');
    expect(result.evidence.success).toBe(true);
  });

  it('FormlessSwarm should execute full multi-agent cycle', async () => {
    const swarm = new FormlessSwarm(sdk);
    const cycleRes = await swarm.executeSwarmCycle({
      claim: 'Multi-agent system verification run',
      ruleName: 'health-rule',
      ruleDefinition: 'responseTime < 100',
      metadata: { responseTime: 40 },
    });

    expect(cycleRes.success).toBe(true);
    expect(cycleRes.agentResults).toHaveLength(6);
    expect(cycleRes.isGreen).toBe(true);
    expect(cycleRes.fullLoopResult.attestation.verified).toBe(true);
  });
});

