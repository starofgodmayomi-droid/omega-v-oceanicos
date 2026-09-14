import { OceanicosMeshEngine } from '../index';

describe('OceanicosMeshEngine — P2P Gossip Protocol & Verifiable Message Propagation', () => {
  let engine: OceanicosMeshEngine;

  beforeEach(() => {
    engine = new OceanicosMeshEngine('test-mesh-key');
  });

  describe('1. Peer Discovery & Management', () => {
    it('should seed 3 genesis peers connected across regions', () => {
      const peers = engine.getPeers();
      expect(peers.length).toBe(3);
      expect(peers.every((p) => p.status === 'CONNECTED')).toBe(true);
      const regions = new Set(peers.map((p) => p.region));
      expect(regions.size).toBe(3);
    });

    it('should add and ban peers', () => {
      const newPeer = engine.addPeer({
        did: 'did:omega:peer:rogue-01',
        endpoint: 'wss://rogue.mesh.evil.io:9944',
        region: 'us-west-2',
      });
      expect(newPeer.status).toBe('CONNECTED');

      const banned = engine.banPeer('did:omega:peer:rogue-01', 'Byzantine behavior detected');
      expect(banned.status).toBe('BANNED');
    });
  });

  describe('2. Epidemic Gossip Broadcast & Signature Verification', () => {
    it('should gossip a message to all connected peers with epidemic fanout and verify signature', () => {
      const receipt = engine.gossip({
        senderDid: 'did:omega:peer:alpha-seed',
        type: 'BLOCK_ANNOUNCE',
        payload: { blockHash: '0xabc', blockHeight: 42 },
        ttl: 8,
      });

      expect(receipt.messageId).toMatch(/^msg-/);
      expect(receipt.reachedPeers).toBeGreaterThanOrEqual(1);
      expect(receipt.propagationRatio).toBeGreaterThan(0);
      expect(receipt.ttlRemaining).toBeGreaterThanOrEqual(0);

      // Verify the gossip signature
      const verification = engine.verifyGossipSignature(receipt.messageId);
      expect(verification.valid).toBe(true);
    });

    it('should reject gossip from disconnected peers', () => {
      engine.removePeer('did:omega:peer:gamma-seed');
      expect(() => {
        engine.gossip({
          senderDid: 'did:omega:peer:gamma-seed',
          type: 'HEARTBEAT',
          payload: {},
        });
      }).toThrow(/not connected/);
    });
  });

  describe('3. Merkle Sync & Peer State Synchronization', () => {
    it('should request and complete Merkle sync with a peer', () => {
      const sync = engine.requestSync({
        peerDid: 'did:omega:peer:beta-seed',
        merkleRoot: '0xmerkle_root_abc123',
        blocksRequested: 100,
      });

      expect(sync.syncId).toMatch(/^sync-/);
      expect(sync.status).toBe('COMPLETE');
      expect(sync.blocksSynced).toBe(100);
      expect(sync.completedAt).toBeDefined();
    });
  });

  describe('4. Mesh Network Statistics', () => {
    it('should compute network topology stats', () => {
      const stats = engine.getStats();
      expect(stats.totalPeers).toBe(3);
      expect(stats.connectedPeers).toBe(3);
      expect(stats.avgLatencyMs).toBeGreaterThan(0);
    });
  });
});
