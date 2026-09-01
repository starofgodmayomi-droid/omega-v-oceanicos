import { OceanicosDHTEngine } from '../index';

describe('@omega-v/dht — Distributed Hash Table Engine', () => {
  let engine: OceanicosDHTEngine;

  beforeEach(() => {
    engine = new OceanicosDHTEngine('test-dht-secret');
  });

  it('should register DHT nodes with Kademlia bucket indices', () => {
    const node = engine.registerNode({ did: 'did:omega:dht:alpha', address: '10.0.0.1:9000' });
    expect(node.nodeId).toMatch(/^dht-/);
    expect(node.did).toBe('did:omega:dht:alpha');
    expect(node.bucketIndex).toBeGreaterThanOrEqual(0);
    expect(node.bucketIndex).toBeLessThan(256);
    expect(engine.getNodes()).toHaveLength(1);
  });

  it('should put and lookup records with cryptographic proof', () => {
    engine.registerNode({ did: 'did:omega:dht:n1', address: '10.0.0.1:9000' });
    engine.registerNode({ did: 'did:omega:dht:n2', address: '10.0.0.2:9000' });
    engine.registerNode({ did: 'did:omega:dht:n3', address: '10.0.0.3:9000' });

    const record = engine.putRecord({
      key: 'omega:state:latest-block',
      value: '0xabc123def',
      publisherDid: 'did:omega:sequencer:main',
      replicationFactor: 3,
    });

    expect(record.key).toBe('omega:state:latest-block');
    expect(record.lookupProof).toMatch(/^0x/);
    expect(record.replicationFactor).toBe(3);

    const result = engine.lookup('omega:state:latest-block');
    expect(result.found).toBe(true);
    expect(result.value).toBe('0xabc123def');
    expect(result.hops).toBeGreaterThanOrEqual(1);
    expect(result.verificationProof).toMatch(/^0x/);
  });

  it('should return not-found for missing keys', () => {
    engine.registerNode({ did: 'did:omega:dht:n1', address: '10.0.0.1:9000' });
    const result = engine.lookup('non-existent-key');
    expect(result.found).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.verificationProof).toMatch(/^0x/);
  });

  it('should replicate records across closest nodes', () => {
    const n1 = engine.registerNode({ did: 'did:omega:dht:n1', address: '10.0.0.1:9000' });
    const n2 = engine.registerNode({ did: 'did:omega:dht:n2', address: '10.0.0.2:9000' });
    engine.registerNode({ did: 'did:omega:dht:n3', address: '10.0.0.3:9000' });

    engine.putRecord({
      key: 'omega:blob:42',
      value: 'blob-data-payload',
      publisherDid: 'did:omega:da:submitter',
      replicationFactor: 2,
    });

    // At least 2 nodes should have stored keys incremented
    const nodes = engine.getNodes();
    const withKeys = nodes.filter((n) => n.storedKeys > 0);
    expect(withKeys.length).toBe(2);
  });

  it('should produce accurate stats and telemetry', () => {
    engine.registerNode({ did: 'did:omega:dht:n1', address: '10.0.0.1:9000' });
    engine.registerNode({ did: 'did:omega:dht:n2', address: '10.0.0.2:9000' });

    engine.putRecord({ key: 'k1', value: 'v1', publisherDid: 'did:omega:test', replicationFactor: 2 });
    engine.putRecord({ key: 'k2', value: 'v2', publisherDid: 'did:omega:test', replicationFactor: 1 });

    engine.lookup('k1');
    engine.lookup('k2');
    engine.lookup('k3'); // miss

    const stats = engine.getStats();
    expect(stats.totalNodes).toBe(2);
    expect(stats.totalRecords).toBe(2);
    expect(stats.totalLookups).toBe(3);
    expect(stats.cacheHitRate).toBeCloseTo(2 / 3, 1);
    expect(stats.replicatedRecords).toBe(1); // only k1 has repl > 1
  });
});
