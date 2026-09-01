import { OceanicosThresholdAttestorEngine } from '../index';

describe('@omega-v/attestor — Decentralized Threshold Attestation Network Engine', () => {
  let engine: OceanicosThresholdAttestorEngine;

  beforeEach(() => {
    engine = new OceanicosThresholdAttestorEngine('test-attestor-secret', 0.67);
  });

  it('should register attestor nodes with custom weights', () => {
    const node = engine.registerAttestor({
      nodeDid: 'did:omega:attestor:01',
      moniker: 'Sentinel Node 1',
      publicKey: '0xpubkey_01',
      weight: 20,
    });

    expect(node.nodeDid).toBe('did:omega:attestor:01');
    expect(node.weight).toBe(20);
    expect(node.status).toBe('ACTIVE');
    expect(engine.getAttestors()).toHaveLength(1);
  });

  it('should create attestation session with calculated quorum threshold weight', () => {
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:01', moniker: 'N1', publicKey: '0x01', weight: 10 });
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:02', moniker: 'N2', publicKey: '0x02', weight: 10 });
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:03', moniker: 'N3', publicKey: '0x03', weight: 10 });

    // Total weight = 30; 67% threshold => 21 required weight
    const session = engine.createSession({
      subjectHash: '0xdeadbeef_canonical_state_root',
      domain: 'STATE_CHECKPOINT',
      payload: { epoch: 42 },
    });

    expect(session.sessionId).toMatch(/^ses-/);
    expect(session.requiredWeight).toBe(21);
    expect(session.status).toBe('COLLECTING');
  });

  it('should collect signature shares and automatically generate Quorum Certificate (QC) upon reaching threshold', () => {
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:01', moniker: 'N1', publicKey: '0x01', weight: 10 });
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:02', moniker: 'N2', publicKey: '0x02', weight: 10 });
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:03', moniker: 'N3', publicKey: '0x03', weight: 10 });

    const session = engine.createSession({
      subjectHash: '0xabc123_block_header',
      domain: 'BLOCK_FINALITY',
    });

    // Submit share 1 (Weight: 10/21)
    const res1 = engine.submitShare({
      sessionId: session.sessionId,
      nodeDid: 'did:omega:attestor:01',
      shareSignature: '0xshare_sig_1',
    });
    expect(res1.session.status).toBe('COLLECTING');
    expect(res1.qc).toBeUndefined();

    // Submit share 2 (Weight: 20/21)
    const res2 = engine.submitShare({
      sessionId: session.sessionId,
      nodeDid: 'did:omega:attestor:02',
      shareSignature: '0xshare_sig_2',
    });
    expect(res2.session.status).toBe('COLLECTING');

    // Submit share 3 (Weight: 30/21 >= threshold) => generates QC
    const res3 = engine.submitShare({
      sessionId: session.sessionId,
      nodeDid: 'did:omega:attestor:03',
      shareSignature: '0xshare_sig_3',
    });
    expect(res3.session.status).toBe('ATTESTED');
    expect(res3.qc).toBeDefined();
    expect(res3.qc?.signers).toHaveLength(3);
    expect(res3.qc?.aggregatedSignature).toMatch(/^0x/);
    expect(res3.qc?.qcProof).toMatch(/^0x/);

    // Verify QC validity
    expect(engine.verifyQC(res3.qc!)).toBe(true);
  });

  it('should reject duplicate shares from the same attestor', () => {
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:01', moniker: 'N1', publicKey: '0x01', weight: 10 });
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:02', moniker: 'N2', publicKey: '0x02', weight: 20 });
    const session = engine.createSession({
      subjectHash: '0x1234',
      domain: 'TEST',
    });

    engine.submitShare({
      sessionId: session.sessionId,
      nodeDid: 'did:omega:attestor:01',
      shareSignature: '0xsig1',
    });

    expect(() => {
      engine.submitShare({
        sessionId: session.sessionId,
        nodeDid: 'did:omega:attestor:01',
        shareSignature: '0xsig1_dup',
      });
    }).toThrow('already submitted a share');
  });

  it('should produce accurate telemetry stats', () => {
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:01', moniker: 'N1', publicKey: '0x01', weight: 15 });
    engine.registerAttestor({ nodeDid: 'did:omega:attestor:02', moniker: 'N2', publicKey: '0x02', weight: 15 });

    const s = engine.createSession({ subjectHash: '0xstate', domain: 'CONSENSUS' });
    engine.submitShare({ sessionId: s.sessionId, nodeDid: 'did:omega:attestor:01', shareSignature: '0xs1' });
    engine.submitShare({ sessionId: s.sessionId, nodeDid: 'did:omega:attestor:02', shareSignature: '0xs2' });

    const stats = engine.getStats();
    expect(stats.totalAttestors).toBe(2);
    expect(stats.activeAttestors).toBe(2);
    expect(stats.totalWeight).toBe(30);
    expect(stats.completedQCs).toBe(1);
    expect(stats.activeSessions).toBe(0);
  });
});
