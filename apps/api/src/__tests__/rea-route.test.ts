import { evaluateReaTarget } from '../rea-route.js';

describe('🔍 REA (Reverse Engineer Anything) Engine & Work Mood Suite', () => {
  it('evaluates default REA target and produces valid unforgeable contract', () => {
    const report = evaluateReaTarget();
    expect(report.success).toBe(true);
    expect(report.contract).toBe('Ω∞v-REA-REVERSE-ENGINEER-ANYTHING-V1');
    expect(report.steward).toBe('did:omega:human:starofgodmayomi');
    expect(report.target).toBe('https://github.com/morluto/rea');
    expect(report.workMood.state).toBe('OPTIMAL_FLOW');
    expect(report.workMood.autopilotLevel).toBe(4);
    expect(report.evaluationHash).toHaveLength(64);
  });

  it('evaluates customized binary or web targets with clean 5-tier matrix', () => {
    const customTarget = 'https://app.custom-domain.xyz/bundle.js';
    const report = evaluateReaTarget(customTarget);
    expect(report.target).toBe(customTarget);
    expect(report.capabilities).toHaveLength(5);
    const layers = report.capabilities.map((c) => c.layer);
    expect(layers).toEqual([
      'DISASSEMBLY',
      'AST_INTROSPECTION',
      'PROTOCOL_RECONSTRUCTION',
      'UI_EXTRACTION',
      'SOVEREIGN_SYNTHESIS',
    ]);
  });

  it('preserves fail-closed MCP bridge security bounds', () => {
    const report = evaluateReaTarget('sample.exe');
    expect(report.mcpBridge.status).toBe('ACTIVE_BOUNDED');
    expect(report.mcpBridge.failClosed).toBe(true);
    expect(report.mcpBridge.permissions).toContain('READ_ONLY_INSPECT');
    expect(report.mcpBridge.permissions).toContain('VERIFY_INVARIANTS');
  });
});
