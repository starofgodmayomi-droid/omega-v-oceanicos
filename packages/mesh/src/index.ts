import crypto from 'crypto';

export type PeerStatus = 'CONNECTED' | 'DISCONNECTED' | 'SUSPECT' | 'BANNED';
export type GossipMessageType = 'BLOCK_ANNOUNCE' | 'TX_PROPAGATE' | 'ATTESTATION_SHARE' | 'PEER_DISCOVERY' | 'HEARTBEAT' | 'SYNC_REQUEST' | 'SYNC_RESPONSE';

export interface MeshPeer {
  peerId: string;
  did: string;
  endpoint: string;
  status: PeerStatus;
  latencyMs: number;
  messagesReceived: number;
  messagesSent: number;
  lastSeen: string;
  joinedAt: string;
  region: string;
}

export interface GossipMessage {
  messageId: string;
  type: GossipMessageType;
  senderDid: string;
  payload: Record<string, unknown>;
  ttl: number;
  hopCount: number;
  signature: string;
  timestamp: string;
  receivedBy: string[]; // peerId list for epidemic tracking
}

export interface GossipPropagationReceipt {
  messageId: string;
  totalPeers: number;
  reachedPeers: number;
  propagationRatio: number;
  avgHops: number;
  ttlRemaining: number;
  timestamp: string;
}

export interface MeshSyncState {
  syncId: string;
  peerDid: string;
  merkleRoot: string;
  blocksRequested: number;
  blocksSynced: number;
  status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
  startedAt: string;
  completedAt?: string;
}

export interface MeshStats {
  totalPeers: number;
  connectedPeers: number;
  totalMessagesGossiped: number;
  totalSyncs: number;
  avgLatencyMs: number;
  networkPartitions: number;
}

export class OceanicosMeshEngine {
  private peers: Map<string, MeshPeer> = new Map();
  private messages: Map<string, GossipMessage> = new Map();
  private syncs: MeshSyncState[] = [];
  private signingKey: string;

  constructor(signingKey = 'omega-v-mesh-gossip-key') {
    this.signingKey = signingKey;
    this.seedNetwork();
  }

  private seedNetwork(): void {
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
    const seedPeers = [
      { did: 'did:omega:peer:alpha-seed', endpoint: 'wss://alpha.mesh.omega-v.io:9944', region: regions[0] },
      { did: 'did:omega:peer:beta-seed', endpoint: 'wss://beta.mesh.omega-v.io:9944', region: regions[1] },
      { did: 'did:omega:peer:gamma-seed', endpoint: 'wss://gamma.mesh.omega-v.io:9944', region: regions[2] },
    ];

    for (const seed of seedPeers) {
      this.addPeer({
        did: seed.did,
        endpoint: seed.endpoint,
        region: seed.region,
      });
    }
  }

  public addPeer(spec: { did: string; endpoint: string; region?: string }): MeshPeer {
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const peer: MeshPeer = {
      peerId,
      did: spec.did,
      endpoint: spec.endpoint,
      status: 'CONNECTED',
      latencyMs: Math.floor(Math.random() * 80) + 5,
      messagesReceived: 0,
      messagesSent: 0,
      lastSeen: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      region: spec.region || 'unknown',
    };
    this.peers.set(spec.did, peer);
    return peer;
  }

  public removePeer(did: string): void {
    const peer = this.peers.get(did);
    if (!peer) throw new Error(`Peer '${did}' not found`);
    peer.status = 'DISCONNECTED';
  }

  public banPeer(did: string, reason: string): MeshPeer {
    const peer = this.peers.get(did);
    if (!peer) throw new Error(`Peer '${did}' not found`);
    peer.status = 'BANNED';
    // Store ban reason on the peer as extra info (could be extended)
    void reason;
    return peer;
  }

  public gossip(spec: {
    senderDid: string;
    type: GossipMessageType;
    payload: Record<string, unknown>;
    ttl?: number;
  }): GossipPropagationReceipt {
    const sender = this.peers.get(spec.senderDid);
    if (!sender || sender.status !== 'CONNECTED') {
      throw new Error(`Peer '${spec.senderDid}' is not connected to gossip`);
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ttl = spec.ttl || 8;
    const timestamp = new Date().toISOString();

    // Sign message
    const sigPayload = `${messageId}:${spec.senderDid}:${spec.type}:${JSON.stringify(spec.payload)}:${timestamp}`;
    const signature = '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');

    // Simulate epidemic broadcast
    const connectedPeers = Array.from(this.peers.values()).filter(
      (p) => p.status === 'CONNECTED' && p.did !== spec.senderDid
    );

    // Fanout: each hop reaches sqrt(N) peers, simulating gossip dissemination
    const reachedSet = new Set<string>();
    let currentReach = [spec.senderDid];
    let hopCount = 0;
    const maxHops = Math.min(ttl, 5);

    while (hopCount < maxHops && reachedSet.size < connectedPeers.length) {
      const nextReach: string[] = [];
      for (const reacher of currentReach) {
        // Each node fans out to ~3 random peers
        const fanout = connectedPeers
          .filter((p) => !reachedSet.has(p.did) && p.did !== reacher)
          .slice(0, 3);
        for (const target of fanout) {
          if (!reachedSet.has(target.did)) {
            reachedSet.add(target.did);
            target.messagesReceived++;
            nextReach.push(target.did);
          }
        }
      }
      if (nextReach.length === 0) break;
      currentReach = nextReach;
      hopCount++;
    }

    sender.messagesSent++;

    const message: GossipMessage = {
      messageId,
      type: spec.type,
      senderDid: spec.senderDid,
      payload: spec.payload,
      ttl,
      hopCount,
      signature,
      timestamp,
      receivedBy: Array.from(reachedSet),
    };

    this.messages.set(messageId, message);

    return {
      messageId,
      totalPeers: connectedPeers.length,
      reachedPeers: reachedSet.size,
      propagationRatio: connectedPeers.length > 0 ? reachedSet.size / connectedPeers.length : 0,
      avgHops: hopCount,
      ttlRemaining: ttl - hopCount,
      timestamp,
    };
  }

  public verifyGossipSignature(messageId: string): { valid: boolean; messageId: string } {
    const message = this.messages.get(messageId);
    if (!message) throw new Error(`Message '${messageId}' not found`);

    const sigPayload = `${message.messageId}:${message.senderDid}:${message.type}:${JSON.stringify(message.payload)}:${message.timestamp}`;
    const expected = '0x' + crypto.createHmac('sha256', this.signingKey).update(sigPayload).digest('hex');

    return { valid: message.signature === expected, messageId };
  }

  public requestSync(spec: { peerDid: string; merkleRoot: string; blocksRequested: number }): MeshSyncState {
    const peer = this.peers.get(spec.peerDid);
    if (!peer || peer.status !== 'CONNECTED') {
      throw new Error(`Peer '${spec.peerDid}' is not connected for sync`);
    }

    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sync: MeshSyncState = {
      syncId,
      peerDid: spec.peerDid,
      merkleRoot: spec.merkleRoot,
      blocksRequested: spec.blocksRequested,
      blocksSynced: spec.blocksRequested, // Simulate immediate sync completion
      status: 'COMPLETE',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.syncs.push(sync);
    return sync;
  }

  public getPeers(): MeshPeer[] {
    return Array.from(this.peers.values());
  }

  public getMessages(): GossipMessage[] {
    return Array.from(this.messages.values());
  }

  public getSyncs(): MeshSyncState[] {
    return this.syncs;
  }

  public getStats(): MeshStats {
    const peers = Array.from(this.peers.values());
    const connected = peers.filter((p) => p.status === 'CONNECTED');
    const avgLatency = connected.length > 0
      ? connected.reduce((sum, p) => sum + p.latencyMs, 0) / connected.length
      : 0;

    return {
      totalPeers: peers.length,
      connectedPeers: connected.length,
      totalMessagesGossiped: this.messages.size,
      totalSyncs: this.syncs.length,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      networkPartitions: 0,
    };
  }
}

export default OceanicosMeshEngine;
