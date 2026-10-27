import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReaTarget } from '../rea-route.js';

describe('🔍 REA (Reverse Engineer Anything) Engine & Work Mood Suite', () => {
  it('evaluates default REA target and produces valid unforgeable contract', () => {
    const report = evaluateReaTarget();
    assert.equal(report.success, true);
    assert.equal(report.contract, 'Ω∞v-REA-REVERSE-ENGINEER-ANYTHING-V1');
    assert.equal(report.steward, 'did:omega:human:starofgodmayomi');
    assert.equal(report.target, 'https://github.com/morluto/rea');
    assert.equal(report.workMood.state, 'OPTIMAL_FLOW');
    assert.equal(report.workMood.autopilotLevel, 4);
    assert.ok(report.evaluationHash.length === 64);
  });

  it('evaluates customized binary or web targets with clean 5-tier matrix', () => {
    const customTarget = 'https://app.custom-domain.xyz/bundle.js';
    const report = evaluateReaTarget(customTarget);
    assert.equal(report.target, customTarget);
    assert.equal(report.capabilities.length, 5);
    const layers = report.capabilities.map((c) => c.layer);
    assert.deepEqual(layers, [
      'DISASSEMBLY',
      'AST_INTROSPECTION',
      'PROTOCOL_RECONSTRUCTION',
      'UI_EXTRACTION',
      'SOVEREIGN_SYNTHESIS',
    ]);
  });

  it('preserves fail-closed MCP bridge security bounds', () => {
    const report = evaluateReaTarget('sample.exe');
    assert.equal(report.mcpBridge.status, 'ACTIVE_BOUNDED');
    assert.equal(report.mcpBridge.failClosed, true);
    assert.ok(report.mcpBridge.permissions.includes('READ_ONLY_INSPECT'));
    assert.ok(report.mcpBridge.permissions.includes('VERIFY_INVARIANTS'));
  });
});
