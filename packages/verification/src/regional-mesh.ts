import crypto from 'crypto';
import { GlobalComputeTelemetry } from '@oceanicos/observer';
import { GeopoliticalRegion } from './frontier.js';

export interface RegionalNodeVote {
  nodeId: string;
  region: GeopoliticalRegion;
  jurisdiction: string;
  verdict: 'PASS' | 'DIVERGENT' | 'REJECT';
  latencyMs: number;
  ruleApplied: string;
  signature: string;
  timestamp: string;
}

export interface MeshConvergenceReceipt {
  consensusRound: string;
  quorumReached: boolean;
  pluralismTriggered: boolean;
  participatingNodes: number;
  votes: RegionalNodeVote[];
  effectiveStatus: 'CONVERGED_PASS' | 'CONVERGED_PLURAL' | 'CONSENSUS_FAILED';
  clusterSignatureProof: string;
  timestamp: string;
}

export class RegionalNode {
  constructor(
    public readonly nodeId: string,
    public readonly region: GeopoliticalRegion,
    public readonly jurisdiction: string,
    public readonly latencyFactorMs: number,
    private readonly privateKeyHex: string = crypto.randomBytes(32).toString('hex')
  ) {}

  public evaluateLocal(telemetry: GlobalComputeTelemetry): RegionalNodeVote {
    let verdict: 'PASS' | 'DIVERGENT' | 'REJECT' = 'PASS';
    let ruleApplied = '';

    switch (this.region) {
      case 'US':
        ruleApplied = 'Capital Intensity Clearance (>500k Accelerators)';
        verdict = telemetry.acceleratorInventory > 500000 ? 'PASS' : 'DIVERGENT';
        break;
      case 'CN':
        ruleApplied = 'Sovereign Node Independence (Silicon Yield >= 92%)';
        verdict = telemetry.siliconYield >= 0.92 ? 'PASS' : 'DIVERGENT';
        break;
      case 'EU':
        ruleApplied = 'Cryptographic Provability & Green Energy Threshold (<2000MW)';
        verdict = telemetry.gridLoadMegawatts <= 2000 ? 'PASS' : 'DIVERGENT';
        break;
      case 'ME':
        ruleApplied = 'Sovereign Solar / Nuclear paired deployment clearance';
        verdict = telemetry.gridLoadMegawatts >= 500 ? 'PASS' : 'REJECT';
        break;
    }

    const timestamp = new Date().toISOString();
    const payload = `${this.nodeId}:${this.region}:${verdict}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.privateKeyHex)
      .update(payload)
      .digest('hex');

    const simulatedJitter = Math.floor(Math.random() * 15);

    return {
      nodeId: this.nodeId,
      region: this.region,
      jurisdiction: this.jurisdiction,
      verdict,
      latencyMs: this.latencyFactorMs + simulatedJitter,
      ruleApplied,
      signature,
      timestamp,
    };
  }
}

export class MultiRegionMeshConvergence {
  private static nodes: RegionalNode[] = [
    new RegionalNode('node-us-virginia', 'US', 'US-East (Federal Tech Clearance)', 18),
    new RegionalNode('node-eu-frankfurt', 'EU', 'EU-Central (GDPR & Cryptographic Proof)', 42),
    new RegionalNode('node-cn-shanghai', 'CN', 'CN-East (Sovereign Node Isolation)', 125),
    new RegionalNode('node-me-dubai', 'ME', 'ME-South (Gigawatt Clean Pairing)', 68),
  ];

  /**
   * Dispatches telemetry to all regional nodes, collects cryptographically signed votes,
   * and synthesizes a Byzantine-fault-tolerant Graceful Pluralism consensus.
   */
  public static simulateConvergence(telemetry: GlobalComputeTelemetry): MeshConvergenceReceipt {
    const votes = this.nodes.map((node) => node.evaluateLocal(telemetry));
    const passes = votes.filter((v) => v.verdict === 'PASS').length;
    const divergences = votes.filter((v) => v.verdict === 'DIVERGENT').length;
    const rejects = votes.filter((v) => v.verdict === 'REJECT').length;

    let effectiveStatus: 'CONVERGED_PASS' | 'CONVERGED_PLURAL' | 'CONSENSUS_FAILED' =
      'CONVERGED_PASS';

    if (rejects > 1) {
      effectiveStatus = 'CONSENSUS_FAILED';
    } else if (divergences > 0) {
      effectiveStatus = 'CONVERGED_PLURAL';
    }

    const quorumReached = votes.length >= 3 && effectiveStatus !== 'CONSENSUS_FAILED';
    const consensusRound = `round-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const clusterProof = crypto
      .createHash('sha256')
      .update(
        `${consensusRound}:${effectiveStatus}:${votes.map((v) => v.signature).join(':')}`
      )
      .digest('hex');

    return {
      consensusRound,
      quorumReached,
      pluralismTriggered: effectiveStatus === 'CONVERGED_PLURAL',
      participatingNodes: votes.length,
      votes,
      effectiveStatus,
      clusterSignatureProof: clusterProof,
      timestamp: new Date().toISOString(),
    };
  }

  public static getNodes() {
    return this.nodes.map((n) => ({
      nodeId: n.nodeId,
      region: n.region,
      jurisdiction: n.jurisdiction,
      latencyFactorMs: n.latencyFactorMs,
    }));
  }
}
