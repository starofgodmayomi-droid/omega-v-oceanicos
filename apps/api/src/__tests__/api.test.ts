import app from '../index';

describe('Ω∞v Oceanicos API Server', () => {
  it('should expose verification loop endpoints in app instance', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should have Express stack layers defined for endpoints', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routes = (app as any)._router.stack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.route)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.route.path);

    expect(routes).toContain('/health');
    expect(routes).toContain('/complete-loop');
    expect(routes).toContain('/swarm');
    expect(routes).toContain('/observations');
    expect(routes).toContain('/verifications');
    expect(routes).toContain('/attestations');
    expect(routes).toContain('/lineage');
    expect(routes).toContain('/agents');
    expect(routes).toContain('/metrics');
    expect(routes).toContain('/mood');
    expect(routes).toContain('/friction');
    expect(routes).toContain('/dissent');
    expect(routes).toContain('/graph');
    expect(routes).toContain('/security/token');
    expect(routes).toContain('/security/audit');
    expect(routes).toContain('/evolution/proposals');
    expect(routes).toContain('/evolution/recompile');
    expect(routes).toContain('/edge/batch');
  });
});
