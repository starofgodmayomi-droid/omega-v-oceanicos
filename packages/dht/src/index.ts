/**
 * @omega-v/dht — Distributed Hash Table Engine
 * Kademlia-Style Content-Addressable Routing, Persistent Key-Value Overlay Network
 * with Verifiable Lookups and Cryptographic Record Attestations
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export interface DHTNodeDescriptor {
  nodeId: string;
  did: string;
  address: string;
  bucketIndex: number;
  lastSeen: string;
  storedKeys: number;
}

export interface DHTRecord {
  key: string;
  value: string;
  publisherDid: string;
  ttlMs: number;
  replicationFactor: number;
  storedAt: string;
  expiresAt: string;
  lookupProof: string; // HMAC attestation of record existence
}

export interface DHTLookupResult {
  key: string;
  found: boolean;
  value?: string;
  hops: number;
  resolvedNodeId?: string;
  lookupDurationMs: number;
  verificationProof: string;
}

export interface DHTStats {
  totalNodes: number;
  totalRecords: number;
  totalLookups: number;
  cacheHitRate: number;
  avgLookupHops: number;
  avgLookupDurationMs: number;
  replicatedRecords: number;
  expiredRecords: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function xorDistance(a: string, b: string): number {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dist += Math.abs(a.charCodeAt(i) - b.charCodeAt(i));
  }
  return dist;
}

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosDHTEngine {
  private readonly secret: string;
  private nodes: DHTNodeDescriptor[] = [];
  private records: DHTRecord[] = [];
  private lookups: DHTLookupResult[] = [];
  private expiredCount = 0;

  constructor(secret = 'dht-kademlia-omega-v-secret') {
    this.secret = secret;
  }

  /* ── Node Management ── */

  registerNode(opts: { did: string; address: string }): DHTNodeDescriptor {
    const nodeId = `dht-${randomUUID().slice(0, 12)}`;
    const bucketIndex = Math.floor(Math.random() * 256);
    const node: DHTNodeDescriptor = {
      nodeId,
      did: opts.did,
      address: opts.address,
      bucketIndex,
      lastSeen: new Date().toISOString(),
      storedKeys: 0,
    };
    this.nodes.push(node);
    return node;
  }

  getNodes(): DHTNodeDescriptor[] {
    return [...this.nodes];
  }

  /* ── Record Store ── */

  putRecord(opts: {
    key: string;
    value: string;
    publisherDid: string;
    ttlMs?: number;
    replicationFactor?: number;
  }): DHTRecord {
    const ttl = opts.ttlMs ?? 3600000;
    const repl = opts.replicationFactor ?? 3;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    const record: DHTRecord = {
      key: opts.key,
      value: opts.value,
      publisherDid: opts.publisherDid,
      ttlMs: ttl,
      replicationFactor: repl,
      storedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lookupProof: hmac(this.secret, `${opts.key}:${opts.value}:${now.toISOString()}`),
    };
    this.records.push(record);

    // Simulate replication across closest nodes
    const closestNodes = this.findClosestNodes(opts.key, repl);
    for (const n of closestNodes) {
      n.storedKeys++;
      n.lastSeen = now.toISOString();
    }

    return record;
  }

  getRecords(): DHTRecord[] {
    return [...this.records];
  }

  /* ── Lookup ── */

  lookup(key: string): DHTLookupResult {
    const startTime = Date.now();
    const record = this.records.find((r) => r.key === key);

    // Check if expired
    if (record && new Date(record.expiresAt).getTime() < Date.now()) {
      this.expiredCount++;
      const result: DHTLookupResult = {
        key,
        found: false,
        hops: 0,
        lookupDurationMs: Date.now() - startTime,
        verificationProof: hmac(this.secret, `EXPIRED:${key}:${Date.now()}`),
      };
      this.lookups.push(result);
      return result;
    }

    const hops = record
      ? Math.max(1, Math.floor(Math.log2(Math.max(this.nodes.length, 2))))
      : Math.floor(Math.log2(Math.max(this.nodes.length, 2))) + 2;

    const closestNode = record ? this.findClosestNodes(key, 1)[0] : undefined;

    const result: DHTLookupResult = {
      key,
      found: !!record,
      value: record?.value,
      hops,
      resolvedNodeId: closestNode?.nodeId,
      lookupDurationMs: Date.now() - startTime,
      verificationProof: hmac(
        this.secret,
        `LOOKUP:${key}:${record ? record.value : 'NOT_FOUND'}:${Date.now()}`
      ),
    };
    this.lookups.push(result);
    return result;
  }

  /* ── Stats ── */

  getStats(): DHTStats {
    const totalLookups = this.lookups.length;
    const cacheHits = this.lookups.filter((l) => l.found).length;
    const totalHops = this.lookups.reduce((s, l) => s + l.hops, 0);
    const totalDur = this.lookups.reduce((s, l) => s + l.lookupDurationMs, 0);
    const replicated = this.records.filter((r) => r.replicationFactor > 1).length;

    return {
      totalNodes: this.nodes.length,
      totalRecords: this.records.length,
      totalLookups,
      cacheHitRate: totalLookups > 0 ? cacheHits / totalLookups : 0,
      avgLookupHops: totalLookups > 0 ? totalHops / totalLookups : 0,
      avgLookupDurationMs: totalLookups > 0 ? totalDur / totalLookups : 0,
      replicatedRecords: replicated,
      expiredRecords: this.expiredCount,
    };
  }

  /* ── Kademlia helpers ── */

  private findClosestNodes(key: string, count: number): DHTNodeDescriptor[] {
    if (this.nodes.length === 0) return [];
    return [...this.nodes]
      .sort((a, b) => xorDistance(key, a.nodeId) - xorDistance(key, b.nodeId))
      .slice(0, count);
  }
}
