import { omegaGate, reconcile } from './index';

describe('OMEGA — the Judge', () => {
  it('verifies an exact match that carries a named source', () => {
    const result = reconcile(
      { status: 'ok', port: 5000 },
      { value: { port: 5000, status: 'ok' }, source: 'curl http://localhost:5000/health' }
    );

    expect(result.verdict).toBe('VERIFIED');
    expect(result.allow).toBe(true);
    expect(omegaGate(result.verdict)).toBe(true);
  });

  it('names the differing fields and refuses the next step', () => {
    const result = reconcile(
      { status: 'ok', port: 5000 },
      { value: { status: 'ok', port: 3000 }, source: 'curl' }
    );

    expect(result.verdict).toBe('DIVERGENT');
    expect(result.differences).toEqual(['port']);
    expect(result.allow).toBe(false);
  });

  it('preserves UNKNOWN when there is no observation', () => {
    const result = reconcile({ status: 'ok' }, undefined);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.allow).toBe(false);
    expect(result.reasons[0]).toContain('no observation');
  });

  it('refuses an observation with no provenance, even when the values match', () => {
    const result = reconcile('ok', { value: 'ok', source: '   ' });

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.allow).toBe(false);
    expect(result.reasons[0]).toContain('no source');
  });

  it('keeps a gate closed for every non-verified verdict', () => {
    expect(omegaGate('DIVERGENT')).toBe(false);
    expect(omegaGate('UNKNOWN')).toBe(false);
    expect(omegaGate('NOT_EXECUTED')).toBe(false);
  });
});
