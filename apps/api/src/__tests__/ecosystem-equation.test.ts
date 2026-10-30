import { createApp } from '../index';

describe('ecosystem equation routes', () => {
  it('compresses upgraded work and expands it outward without claiming reality', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/equation' });
      const body = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.source).toBe('ECOSYSTEM_BODY.md');
      expect(body.evidenceScope).toBe('LOCAL_STRUCTURE_ONLY');
      expect(body.admitted).toBeGreaterThan(0);
      expect(body.halted).toBe(0);
      expect(body.expansion.length).toBe(body.admitted);
      expect(body.expansion.every((surface: { direction: string }) => surface.direction === 'outward')).toBe(true);
      expect(body.boundary).toMatch(/not a reality claim/i);
    } finally {
      await app.close();
    }
  });

  it('attaches the same fixpoint to the ecosystem body', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
      const body = response.json();
      expect(body.fixpoint.evidenceScope).toBe('LOCAL_STRUCTURE_ONLY');
      expect(body.fixpoint.expansion.length).toBe(body.fixpoint.admitted.length);
      expect(body.expansion.readOnly).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('evaluates one signal and does not persist it', async () => {
    const app = createApp(':memory:', false);
    try {
      const denied = await app.inject({
        method: 'POST',
        url: '/v1/ecosystem/equation',
        payload: {
          id: 'act-1',
          text: 'deploy the worker',
          evidence: 'plan text only',
          expected: 'deployed',
          observed: 'deployed',
          authority: 'READ_ONLY',
          requiredAuthority: 'AUTONOMOUS',
        },
      });
      expect(denied.statusCode).toBe(200);
      expect(denied.json().step.status).toBe('NOT_EXECUTED');
      expect(denied.json().step.evidenceScope).toBe('CALLER_SUPPLIED');
      expect(denied.json().memory).toEqual([]);

      const admitted = await app.inject({
        method: 'POST',
        url: '/v1/ecosystem/equation',
        payload: {
          id: 'obs-1',
          text: 'ledger tip',
          evidence: 'hash observed locally',
          expected: 'tip',
          observed: 'tip',
        },
      });
      expect(admitted.json().step.status).toBe('VERIFIED');
      expect(admitted.json().step.branch).toBe('CONTINUE');
      expect(admitted.json().memory).toHaveLength(1);

      const again = await app.inject({ method: 'GET', url: '/v1/ecosystem/equation' });
      expect(again.json().memory).not.toContain(admitted.json().memory[0]);
    } finally {
      await app.close();
    }
  });

  it('refuses a signal that tries to set its own evidence scope', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/ecosystem/equation',
        payload: { id: 'x', text: 'y', evidenceScope: 'LOCAL_STRUCTURE_ONLY' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('EQUATION_SIGNAL_INVALID');
    } finally {
      await app.close();
    }
  });
});
