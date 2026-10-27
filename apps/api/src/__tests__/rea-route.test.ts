import { evaluateReaTarget } from '../rea-route.js';

describe('🔍 REA (Reverse Engineer Anything) Engine & Work Mood Suite', () => {
  it('evaluates default REA target and produces valid unforgeable contract with Water Intelligence', () => {
    const report = evaluateReaTarget();
    expect(report.success).toBe(true);
    expect(report.contract).toBe('Ω∞v-REA-REVERSE-ENGINEER-ANYTHING-V1');
    expect(report.steward).toBe('did:omega:human:starofgodmayomi');
    expect(report.target).toBe('https://github.com/morluto/rea');
    expect(report.workMood.state).toBe('OPTIMAL_FLOW');
    expect(report.workMood.autopilotLevel).toBe(4);
    expect(report.evaluationHash).toHaveLength(64);

    // Water Intelligence Invariants
    expect(report.waterIntelligence.fluidityCoefficient).toBeCloseTo(0.992, 3);
    expect(report.waterIntelligence.waterState).toBe('LIQUID_FLOW');
    expect(report.waterIntelligence.resonanceFrequency).toBe(432);
    expect(report.waterIntelligence.currentDepthZone.name).toBe('MESOPELAGIC');
    expect(report.waterIntelligence.permeabilityAxiom).toContain('Water no get enemy');
  });

  it('evaluates customized binary or web targets with clean 5-tier matrix and depth zones', () => {
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

    // Check depth zones mapping
    const depthZones = report.capabilities.map((c) => c.oceanDepth);
    expect(depthZones).toEqual([
      'ABYSSAL',
      'BATHYPELAGIC',
      'MESOPELAGIC',
      'EPIPELAGIC',
      'HADOPELAGIC',
    ]);
  });

  it('determines ABYSSAL depth zone for native binary targets', () => {
    const report = evaluateReaTarget('engine.exe');
    expect(report.waterIntelligence.currentDepthZone.name).toBe('ABYSSAL');
    expect(report.waterIntelligence.currentDepthZone.meters).toContain('4000m');
  });

  it('preserves fail-closed MCP bridge security bounds', () => {
    const report = evaluateReaTarget('sample.exe');
    expect(report.mcpBridge.status).toBe('ACTIVE_BOUNDED');
    expect(report.mcpBridge.failClosed).toBe(true);
    expect(report.mcpBridge.permissions).toContain('READ_ONLY_INSPECT');
    expect(report.mcpBridge.permissions).toContain('VERIFY_INVARIANTS');
  });
});
