/**
 * @omega-v/attestor — Decentralized Threshold Multi-Signature Attestation Network
 * Threshold Signature Aggregation, Distributed Key Quorums,
 * and Verifiable Quorum Certificates (QC)
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

import { createHmac, randomUUID } from 'crypto';

/* ─── Types ─────────────────────────────────────────────────────── */

export type AttestorStatus = 'ACTIVE' | 'OFFLINE' | 'REVOKED';

export interface AttestorNode {
  nodeDid: string;
  moniker: string;
  publicKey: string;
  weight: number;
  status: AttestorStatus;
  sharesContributed: number;
  registeredEpoch: number;
  lastSeenAt: string;
}

export interface SignatureShare {
  nodeDid: string;
  shareIndex: number;
  shareSignature: string;
  timestamp: string;
}

export interface QuorumCertificate {
  qcId: string;
  sessionId: string;
  subjectHash: string;
  domain: string;
  accumulatedWeight: number;
  thresholdWeight: number;
  signers: string[];
  aggregatedSignature: string;
  qcProof: string;
  epoch: number;
  issuedAt: string;
}

export interface AttestationSession {
  sessionId: string;
  subjectHash: string;
  domain: string;
  payload: Record<string, unknown>;
  requiredWeight: number;
  collectedWeight: number;
  status: 'COLLECTING' | 'ATTESTED' | 'EXPIRED' | 'REJECTED';
  shares: Map<string, SignatureShare>;
  qc?: QuorumCertificate;
  createdAt: string;
  expiresAt: string;
}

export interface AttestorStats {
  totalAttestors: number;
  activeAttestors: number;
  totalWeight: number;
  thresholdFraction: number;
  totalSessions: number;
  completedQCs: number;
  activeSessions: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Engine ─────────────────────────────────────────────────────── */

export class OceanicosThresholdAttestorEngine {
  private readonly secret: string;
  private attestors: Map<string, AttestorNode> = new Map();
  private sessions: Map<string, AttestationSession> = new Map();
  private thresholdFraction = 0.67; // 2/3+1 supermajority default
  private currentEpoch = 1;

  constructor(secret = 'threshold-attestor-omega-v-secret', thresholdFraction = 0.67) {
    this.secret = secret;
    this.thresholdFraction = thresholdFraction;
  }

  /* ── 1. Attestor Node Registry ── */

  registerAttestor(opts: {
    nodeDid: string;
    moniker: string;
    publicKey: string;
    weight?: number;
  }): AttestorNode {
    if (!opts.nodeDid.startsWith('did:')) {
      throw new Error('Invalid node DID format');
    }
    if (this.attestors.has(opts.nodeDid)) {
      throw new Error(`Attestor ${opts.nodeDid} is already registered`);
    }

    const weight = opts.weight ?? 10;
    const now = new Date().toISOString();

    const node: AttestorNode = {
      nodeDid: opts.nodeDid,
      moniker: opts.moniker,
      publicKey: opts.publicKey,
      weight,
      status: 'ACTIVE',
      sharesContributed: 0,
      registeredEpoch: this.currentEpoch,
      lastSeenAt: now,
    };

    this.attestors.set(opts.nodeDid, node);
    return { ...node };
  }

  getAttestors(): AttestorNode[] {
    return Array.from(this.attestors.values());
  }

  /* ── 2. Attestation Session & Quorum Gathering ── */

  createSession(opts: {
    subjectHash: string;
    domain: string;
    payload?: Record<string, unknown>;
    ttlMs?: number;
  }): AttestationSession {
    if (!opts.subjectHash.startsWith('0x')) {
      throw new Error('subjectHash must be a valid 0x-prefixed hexadecimal hash');
    }

    const totalWeight = Array.from(this.attestors.values())
      .filter((a) => a.status === 'ACTIVE')
      .reduce((sum, a) => sum + a.weight, 0);

    if (totalWeight === 0) {
      throw new Error('Cannot create attestation session: zero active attestors registered');
    }

    const requiredWeight = Math.ceil(totalWeight * this.thresholdFraction);
    const sessionId = `ses-${randomUUID().slice(0, 10)}`;
    const now = new Date();
    const ttl = opts.ttlMs ?? 60000;
    const expiresAt = new Date(now.getTime() + ttl).toISOString();

    const session: AttestationSession = {
      sessionId,
      subjectHash: opts.subjectHash,
      domain: opts.domain,
      payload: opts.payload ?? {},
      requiredWeight,
      collectedWeight: 0,
      status: 'COLLECTING',
      shares: new Map(),
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.sessions.set(sessionId, session);
    return { ...session };
  }

  submitShare(opts: {
    sessionId: string;
    nodeDid: string;
    shareSignature: string;
  }): { session: AttestationSession; qc?: QuorumCertificate } {
    const session = this.sessions.get(opts.sessionId);
    if (!session) {
      throw new Error(`Attestation session ${opts.sessionId} not found`);
    }
    if (session.status !== 'COLLECTING') {
      throw new Error(`Session ${opts.sessionId} is no longer accepting shares (status: ${session.status})`);
    }

    const attestor = this.attestors.get(opts.nodeDid);
    if (!attestor || attestor.status !== 'ACTIVE') {
      throw new Error(`Attestor ${opts.nodeDid} is not active`);
    }

    if (session.shares.has(opts.nodeDid)) {
      throw new Error(`Attestor ${opts.nodeDid} has already submitted a share for session ${opts.sessionId}`);
    }

    const now = new Date().toISOString();
    const shareIndex = session.shares.size + 1;
    const share: SignatureShare = {
      nodeDid: opts.nodeDid,
      shareIndex,
      shareSignature: opts.shareSignature,
      timestamp: now,
    };

    session.shares.set(opts.nodeDid, share);
    session.collectedWeight += attestor.weight;
    attestor.sharesContributed++;
    attestor.lastSeenAt = now;

    // Check if threshold quorum reached
    if (session.collectedWeight >= session.requiredWeight) {
      const qc = this.aggregateQC(session);
      session.qc = qc;
      session.status = 'ATTESTED';
      return { session: { ...session }, qc };
    }

    return { session: { ...session } };
  }

  /* ── 3. Quorum Certificate (QC) Aggregation & Verification ── */

  private aggregateQC(session: AttestationSession): QuorumCertificate {
    const qcId = `qc-${randomUUID().slice(0, 10)}`;
    const signers = Array.from(session.shares.keys()).sort();
    const aggregatedSignature = hmac(
      this.secret,
      `AGG_SIG:${session.sessionId}:${session.subjectHash}:${signers.join(',')}`
    );
    const now = new Date().toISOString();
    const qcProof = hmac(
      this.secret,
      `QC_PROOF:${qcId}:${session.subjectHash}:${session.domain}:${session.collectedWeight}:${aggregatedSignature}:${now}`
    );

    return {
      qcId,
      sessionId: session.sessionId,
      subjectHash: session.subjectHash,
      domain: session.domain,
      accumulatedWeight: session.collectedWeight,
      thresholdWeight: session.requiredWeight,
      signers,
      aggregatedSignature,
      qcProof,
      epoch: this.currentEpoch,
      issuedAt: now,
    };
  }

  verifyQC(qc: QuorumCertificate): boolean {
    if (!qc.qcId || !qc.subjectHash || !qc.aggregatedSignature) {
      return false;
    }
    if (qc.accumulatedWeight < qc.thresholdWeight) {
      return false;
    }
    const expectedAggSig = hmac(
      this.secret,
      `AGG_SIG:${qc.sessionId}:${qc.subjectHash}:${qc.signers.sort().join(',')}`
    );
    return expectedAggSig === qc.aggregatedSignature;
  }

  getSessions(): AttestationSession[] {
    return Array.from(this.sessions.values());
  }

  getQCs(): QuorumCertificate[] {
    const list: QuorumCertificate[] = [];
    for (const s of this.sessions.values()) {
      if (s.qc) {
        list.push(s.qc);
      }
    }
    return list;
  }

  /* ── 4. Stats & Telemetry ── */

  getStats(): AttestorStats {
    const attestors = Array.from(this.attestors.values());
    const totalWeight = attestors.reduce((sum, a) => sum + a.weight, 0);
    const activeAttestors = attestors.filter((a) => a.status === 'ACTIVE').length;
    const completedQCs = Array.from(this.sessions.values()).filter((s) => s.status === 'ATTESTED').length;
    const activeSessions = Array.from(this.sessions.values()).filter((s) => s.status === 'COLLECTING').length;

    return {
      totalAttestors: attestors.length,
      activeAttestors,
      totalWeight,
      thresholdFraction: this.thresholdFraction,
      totalSessions: this.sessions.size,
      completedQCs,
      activeSessions,
    };
  }
}
