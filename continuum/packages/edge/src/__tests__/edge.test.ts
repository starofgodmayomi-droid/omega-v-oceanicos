import { EdgeObserver } from '../index';

describe('EdgeObserver (@omega-v/edge)', () => {
  let edge: EdgeObserver;

  beforeEach(() => {
    edge = new EdgeObserver({
      nodeId: 'edge-node-alpha-1',
      environment: 'field-device',
      maxBufferSize: 100,
    });
  });

  it('should capture local edge observations with node metadata', () => {
    const obs = edge.capture('Local edge camera check', 'edge-health', { temperature: 32 });
    expect(obs).toBeDefined();
    expect(obs.claim.statement).toBe('Local edge camera check');
    expect(obs.source.system).toBe('edge-node:edge-node-alpha-1');
    expect(obs.metadata.edgeNodeId).toBe('edge-node-alpha-1');
    expect(edge.getBufferSize()).toBe(1);
  });

  it('should compute cryptographic Merkle root of buffered observations', () => {
    edge.capture('Obs 1', 'health');
    edge.capture('Obs 2', 'health');
    edge.capture('Obs 3', 'health');

    const merkleRoot = edge.computeMerkleRoot();
    expect(merkleRoot).toBeDefined();
    expect(merkleRoot).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should flush buffered observations when online', async () => {
    edge.capture('Obs 1', 'sensor');
    edge.capture('Obs 2', 'sensor');

    const mockSync = jest.fn().mockResolvedValue(true);
    const syncResult = await edge.flush(mockSync);

    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedCount).toBe(2);
    expect(edge.getBufferSize()).toBe(0);
    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('should fail to flush when offline and retain buffer', async () => {
    edge.capture('Obs Offline', 'sensor');
    edge.setOnline(false);

    const mockSync = jest.fn().mockResolvedValue(true);
    const syncResult = await edge.flush(mockSync);

    expect(syncResult.success).toBe(false);
    expect(syncResult.reason).toContain('offline');
    expect(edge.getBufferSize()).toBe(1);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it('should enforce max buffer size limit', () => {
    const smallEdge = new EdgeObserver({
      nodeId: 'constrained-edge',
      maxBufferSize: 2,
    });

    smallEdge.capture('Obs 1');
    smallEdge.capture('Obs 2');
    expect(() => smallEdge.capture('Obs 3')).toThrow(/Edge buffer capacity exceeded/);
  });
});
