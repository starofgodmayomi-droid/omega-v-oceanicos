/**
 * @omega-v/relay — Decentralized Cross-Shard & Cross-Rollup Message Relaying
 * Packet Routing, Replay Protection, Merkle Delivery Receipts & Verifiable Acknowledgments
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type PacketStatus = 'DISPATCHED' | 'RELAYED' | 'ACKNOWLEDGED' | 'EXPIRED';

export interface RelayPacket {
  packetId: string;
  sourceDomain: string;
  targetDomain: string;
  sequenceNonce: number;
  senderDid: string;
  recipientDid: string;
  payload: Record<string, unknown>;
  packetHash: string;
  proofWitness: string;
  status: PacketStatus;
  relayedBy?: string;
  targetReceiptHash?: string;
  dispatchedAt: string;
  relayedAt?: string;
  acknowledgedAt?: string;
}

export interface DeliveryReceipt {
  receiptId: string;
  packetId: string;
  sourceDomain: string;
  targetDomain: string;
  relayerDid: string;
  targetReceiptHash: string;
  ackProof: string;
  timestamp: string;
}

export interface RelayerNode {
  relayerDid: string;
  moniker: string;
  stakeAmount: number;
  packetsRelayed: number;
  status: 'ACTIVE' | 'PAUSED';
  registeredAt: string;
}

export interface RelayStats {
  totalPackets: number;
  dispatchedCount: number;
  relayedCount: number;
  acknowledgedCount: number;
  activeRelayers: number;
  totalChannels: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosRelayEngine {
  private readonly secret: string;
  private packets: Map<string, RelayPacket> = new Map();
  private receipts: Map<string, DeliveryReceipt> = new Map();
  private relayers: Map<string, RelayerNode> = new Map();
  private channelNonces: Map<string, number> = new Map();

  constructor(secret = 'relay-omega-v-secret') {
    this.secret = secret;
  }

  /* ── 1. Relayer Registry ── */

  registerRelayer(opts: {
    relayerDid: string;
    moniker: string;
    stakeAmount?: number;
  }): RelayerNode {
    if (!opts.relayerDid.startsWith('did:')) {
      throw new Error('relayerDid must be a valid DID');
    }
    if (this.relayers.has(opts.relayerDid)) {
      throw new Error(`Relayer ${opts.relayerDid} is already registered`);
    }

    const relayer: RelayerNode = {
      relayerDid: opts.relayerDid,
      moniker: opts.moniker,
      stakeAmount: opts.stakeAmount ?? 1000,
      packetsRelayed: 0,
      status: 'ACTIVE',
      registeredAt: new Date().toISOString(),
    };

    this.relayers.set(opts.relayerDid, relayer);
    return { ...relayer };
  }

  getRelayers(): RelayerNode[] {
    return Array.from(this.relayers.values());
  }

  /* ── 2. Dispatch Packet (Source Domain) ── */

  dispatchPacket(opts: {
    sourceDomain: string;
    targetDomain: string;
    senderDid: string;
    recipientDid: string;
    payload: Record<string, unknown>;
  }): RelayPacket {
    if (!opts.sourceDomain || !opts.targetDomain) {
      throw new Error('sourceDomain and targetDomain are required');
    }
    if (opts.sourceDomain === opts.targetDomain) {
      throw new Error('sourceDomain and targetDomain must be different');
    }

    const channelKey = `${opts.sourceDomain}->${opts.targetDomain}`;
    const nextNonce = (this.channelNonces.get(channelKey) ?? 0) + 1;
    this.channelNonces.set(channelKey, nextNonce);

    const packetId = `pkt-${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();

    const packetHash = hmac(
      this.secret,
      `PACKET:${packetId}:${channelKey}:${nextNonce}:${opts.senderDid}:${opts.recipientDid}:${JSON.stringify(opts.payload)}:${now}`
    );

    const proofWitness = hmac(
      this.secret,
      `WITNESS:${packetHash}:${opts.senderDid}:${now}`
    );

    const packet: RelayPacket = {
      packetId,
      sourceDomain: opts.sourceDomain,
      targetDomain: opts.targetDomain,
      sequenceNonce: nextNonce,
      senderDid: opts.senderDid,
      recipientDid: opts.recipientDid,
      payload: opts.payload,
      packetHash,
      proofWitness,
      status: 'DISPATCHED',
      dispatchedAt: now,
    };

    this.packets.set(packetId, packet);
    return { ...packet };
  }

  /* ── 3. Relay Packet to Destination ── */

  relayPacket(packetId: string, relayerDid: string): RelayPacket {
    const packet = this.packets.get(packetId);
    if (!packet) {
      throw new Error(`Packet ${packetId} not found`);
    }
    if (packet.status !== 'DISPATCHED') {
      throw new Error(`Cannot relay packet in status ${packet.status}`);
    }

    const relayer = this.relayers.get(relayerDid);
    if (!relayer || relayer.status !== 'ACTIVE') {
      throw new Error(`Relayer ${relayerDid} is not active`);
    }

    const now = new Date().toISOString();
    packet.status = 'RELAYED';
    packet.relayedBy = relayerDid;
    packet.relayedAt = now;
    relayer.packetsRelayed++;

    return { ...packet };
  }

  /* ── 4. Acknowledge Delivery & Produce Cryptographic Receipt ── */

  acknowledgeDelivery(packetId: string, targetReceiptHash: string): DeliveryReceipt {
    const packet = this.packets.get(packetId);
    if (!packet) {
      throw new Error(`Packet ${packetId} not found`);
    }
    if (packet.status !== 'RELAYED') {
      throw new Error(`Packet ${packetId} must be in RELAYED status to acknowledge (current: ${packet.status})`);
    }
    if (!targetReceiptHash.startsWith('0x')) {
      throw new Error('targetReceiptHash must be a valid 0x-prefixed hexadecimal hash');
    }

    const now = new Date().toISOString();
    const receiptId = `rcpt-${randomUUID().slice(0, 10)}`;
    const ackProof = hmac(
      this.secret,
      `ACK:${receiptId}:${packet.packetId}:${packet.packetHash}:${targetReceiptHash}:${now}`
    );

    packet.status = 'ACKNOWLEDGED';
    packet.targetReceiptHash = targetReceiptHash;
    packet.acknowledgedAt = now;

    const receipt: DeliveryReceipt = {
      receiptId,
      packetId: packet.packetId,
      sourceDomain: packet.sourceDomain,
      targetDomain: packet.targetDomain,
      relayerDid: packet.relayedBy ?? 'did:omega:relayer:default',
      targetReceiptHash,
      ackProof,
      timestamp: now,
    };

    this.receipts.set(receiptId, receipt);
    return { ...receipt };
  }

  /* ── 5. Verification & Query ── */

  verifyPacket(packetId: string): boolean {
    const packet = this.packets.get(packetId);
    if (!packet) return false;
    const channelKey = `${packet.sourceDomain}->${packet.targetDomain}`;
    const expectedHash = hmac(
      this.secret,
      `PACKET:${packet.packetId}:${channelKey}:${packet.sequenceNonce}:${packet.senderDid}:${packet.recipientDid}:${JSON.stringify(packet.payload)}:${packet.dispatchedAt}`
    );
    return expectedHash === packet.packetHash;
  }

  getPackets(filterStatus?: PacketStatus): RelayPacket[] {
    const list = Array.from(this.packets.values());
    if (filterStatus) {
      return list.filter((p) => p.status === filterStatus);
    }
    return list;
  }

  getReceipts(): DeliveryReceipt[] {
    return Array.from(this.receipts.values());
  }

  getStats(): RelayStats {
    const list = Array.from(this.packets.values());
    return {
      totalPackets: list.length,
      dispatchedCount: list.filter((p) => p.status === 'DISPATCHED').length,
      relayedCount: list.filter((p) => p.status === 'RELAYED').length,
      acknowledgedCount: list.filter((p) => p.status === 'ACKNOWLEDGED').length,
      activeRelayers: Array.from(this.relayers.values()).filter((r) => r.status === 'ACTIVE').length,
      totalChannels: this.channelNonces.size,
    };
  }
}
