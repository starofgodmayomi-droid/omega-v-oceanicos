import { OceanicosDisputeEngine } from '../index';

describe('@omega-v/dispute — OceanicosDisputeEngine', () => {
  let disputeEngine: OceanicosDisputeEngine;

  beforeEach(() => {
    disputeEngine = new OceanicosDisputeEngine('test-dispute-secret');
  });

  describe('Case Lifecycle & Evidence Submission', () => {
    it('should bootstrap canonical dispute cases', () => {
      const cases = disputeEngine.getCases();
      expect(cases.length).toBeGreaterThanOrEqual(1);
      expect(cases[0].caseId).toBe('disp-latency-sla-001');
      expect(cases[0].status).toBe('CHALLENGE_OPEN');
      expect(cases[0].evidenceDossier.length).toBe(1);
    });

    it('should raise a new dispute case with stake amount', () => {
      const newCase = disputeEngine.raiseDispute({
        targetEventHash: '0x123456789abcdef0',
        claimantDid: 'did:omega:agent:node-2',
        challengerDid: 'did:omega:challenger:sentinel-9',
        stakeAmount: 1000,
        reason: 'Fraudulent attestation claim on uptime metric',
      });

      expect(newCase.caseId).toMatch(/^disp-/);
      expect(newCase.stakeAmount).toBe(1000);
      expect(newCase.status).toBe('CHALLENGE_OPEN');
      expect(disputeEngine.getCase(newCase.caseId)).toBeDefined();
    });

    it('should submit counter-evidence to open dispute case', () => {
      const newCase = disputeEngine.raiseDispute({
        targetEventHash: '0xabc',
        claimantDid: 'did:omega:agent:node-1',
        challengerDid: 'did:omega:challenger:sentinel-1',
        stakeAmount: 200,
        reason: 'Evidence check',
      });

      const evidence = disputeEngine.submitEvidence(newCase.caseId, {
        submitterDid: 'did:omega:challenger:sentinel-1',
        evidenceType: 'ZK_PROOF',
        description: 'Succinct proof of downtime during claimed 100% window',
        contentHash: '0xhashzkproof',
        signature: '0xsig',
      });

      expect(evidence.evidenceId).toMatch(/^ev-/);
      expect(disputeEngine.getCase(newCase.caseId)!.evidenceDossier.length).toBe(1);
    });
  });

  describe('Jury Voting & Arbitration Ruling', () => {
    it('should cast votes and calculate OVERTURNED ruling when overturn weight wins', () => {
      const newCase = disputeEngine.raiseDispute({
        targetEventHash: '0xdef',
        claimantDid: 'did:omega:agent:claimant',
        challengerDid: 'did:omega:auditor:challenger',
        stakeAmount: 300,
        reason: 'Contradicted observation metrics',
      });

      // Juror 1 votes OVERTURN (weight 2)
      disputeEngine.castVote(newCase.caseId, {
        jurorDid: 'did:omega:juror:1',
        choice: 'OVERTURN_ATTESTATION',
        weight: 2.0,
        rationale: 'Telemetry proof confirms latency violation',
        signature: '0xsig1',
      });

      // Juror 2 votes UPHOLD (weight 1)
      disputeEngine.castVote(newCase.caseId, {
        jurorDid: 'did:omega:juror:2',
        choice: 'UPHOLD_ATTESTATION',
        weight: 1.0,
        rationale: 'Telemetry within normal variance',
        signature: '0xsig2',
      });

      // Juror 3 votes OVERTURN (weight 1) -> Quorum reached (3 votes)
      const resolved = disputeEngine.castVote(newCase.caseId, {
        jurorDid: 'did:omega:juror:3',
        choice: 'OVERTURN_ATTESTATION',
        weight: 1.0,
        rationale: 'Agree with Juror 1 evidence',
        signature: '0xsig3',
      });

      expect(resolved.status).toBe('OVERTURNED');
      expect(resolved.ruling).toBeDefined();
      expect(resolved.ruling!.overturnWeight).toBe(3.0);
      expect(resolved.ruling!.upholdWeight).toBe(1.0);
      expect(resolved.ruling!.rulingReceiptHash).toMatch(/^0x/);
    });

    it('should reject duplicate vote from same juror', () => {
      const newCase = disputeEngine.raiseDispute({
        targetEventHash: '0xdef',
        claimantDid: 'did:omega:agent:claimant',
        challengerDid: 'did:omega:auditor:challenger',
        stakeAmount: 300,
        reason: 'Duplicate vote test',
      });

      disputeEngine.castVote(newCase.caseId, {
        jurorDid: 'did:omega:juror:repeat',
        choice: 'UPHOLD_ATTESTATION',
        weight: 1.0,
        rationale: 'Initial vote',
        signature: '0xsig',
      });

      expect(() => {
        disputeEngine.castVote(newCase.caseId, {
          jurorDid: 'did:omega:juror:repeat',
          choice: 'OVERTURN_ATTESTATION',
          weight: 1.0,
          rationale: 'Duplicate vote',
          signature: '0xsig2',
        });
      }).toThrow(/already voted/);
    });
  });

  describe('Stats & Querying', () => {
    it('should compute dispute stats accurately', () => {
      const stats = disputeEngine.getStats();
      expect(stats.totalCases).toBeGreaterThanOrEqual(1);
      expect(stats.activeChallenges).toBeGreaterThanOrEqual(1);
      expect(stats.totalStaked).toBeGreaterThan(0);
    });
  });
});
