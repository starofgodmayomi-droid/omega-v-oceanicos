import { KaiMind, KAI_VERSION } from './index';

describe('KAI — the Mind', () => {
  it('records a drop that is memory, not proof', () => {
    const kai = new KaiMind();
    const drop = kai.remember({
      claim: 'API health check returned 200',
      evidence: { status: 'PASS', source: 'curl /health' },
      provenance: ['local-run'],
    });

    expect(drop.version).toBe(KAI_VERSION);
    expect(drop.status).toBe('VERIFIED');
    expect(drop.memoryIsProof).toBe(false);
    expect(drop.authority).toBe('human_and_reality');
  });

  it('preserves UNKNOWN when the evidence status is unrecognized', () => {
    const kai = new KaiMind();
    const drop = kai.remember({ claim: 'external price', evidence: { status: 'PROBABLY', source: '' } });

    expect(drop.status).toBe('UNKNOWN');
    expect(drop.unknowns).toContain('evidence carried no source');
  });

  it('recalls only drops that match the query', () => {
    const kai = new KaiMind();
    kai.remember({ claim: 'ledger chain verified', evidence: { status: 'PASS', source: 'remember' } });
    kai.remember({ claim: 'untouched claim', evidence: { status: 'PASS', source: 'other' } });

    expect(kai.recall('ledger')).toHaveLength(1);
    expect(kai.recall('  ')).toHaveLength(0);
  });

  it('blocks decisive scam signals and never endorses', () => {
    const kai = new KaiMind();
    const blocked = kai.shield('Send your seed phrase to unlock the guaranteed profit');

    expect(blocked.decision).toBe('BLOCK');
    expect(blocked.signals.map((signal) => signal.id)).toContain('credential-request');
    expect(blocked.endorsement).toBe(false);
  });

  it('sends caution-only text to human review and keeps empty intent UNKNOWN', () => {
    const kai = new KaiMind();

    expect(kai.shield('Act now, limited slots').decision).toBe('REVIEW');
    expect(kai.shield('   ').decision).toBe('UNKNOWN');
    const clean = kai.shield('Summarize this repository README');
    expect(clean.decision).toBe('ALLOW');
    expect(clean.endorsement).toBe(false);
  });
});
