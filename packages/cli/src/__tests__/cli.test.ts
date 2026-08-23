import { OceanicosCLI } from '../index';

describe('OceanicosCLI', () => {
  let cli: OceanicosCLI;

  beforeEach(() => {
    cli = new OceanicosCLI();
  });

  it('should display help menu', async () => {
    const res = await cli.run(['help']);
    expect(res.success).toBe(true);
    expect(res.message).toContain('Ω∞v Oceanicos CLI');
  });

  it('should execute loop command', async () => {
    const res = await cli.run(['loop', 'CLI automated check']);
    expect(res.success).toBe(true);
    expect(res.message).toContain('PASSED');
    expect(res.output).toHaveProperty('signature');
  });

  it('should return metrics command output', async () => {
    await cli.run(['loop', 'Test claim']);
    const res = await cli.run(['metrics']);
    expect(res.success).toBe(true);
    expect(res.output).toHaveProperty('totalObservations', 1);
  });

  it('should execute swarm command with multi-agent cycle', async () => {
    const res = await cli.run(['swarm', 'CLI multi-agent claim']);
    expect(res.success).toBe(true);
    expect(res.message).toContain('Formless Swarm Cycle');
    expect(res.output).toHaveProperty('agentsCount', 6);
  });

  it('should execute edge command with Merkle batching', async () => {
    const res = await cli.run(['edge', 'CLI Edge Batch Check']);
    expect(res.success).toBe(true);
    expect(res.message).toContain('Edge Observation Batch Synced');
    expect(res.output).toHaveProperty('merkleRoot');
  });

  it('should execute analytics command for pattern extraction', async () => {
    await cli.run(['loop', 'Analytics input claim']);
    const res = await cli.run(['analytics']);
    expect(res.success).toBe(true);
    expect(res.message).toContain('Verification Analytics');
    expect(res.output).toHaveProperty('overallPassRate');
  });
});
