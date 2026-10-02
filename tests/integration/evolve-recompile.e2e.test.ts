import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EvolutionEngine } from '../../packages/evolution/dist/index.js';
import { RuleCompiler } from '../../packages/compiler/dist/index.js';
import { OceanicumVM } from '../../packages/ir/dist/index.js';

describe('Evolve → Recompile → Execute', () => {
  it('promotes only a syntactically valid rule whose compiled program passes reality execution', () => {
    const evolution = new EvolutionEngine();
    const compiler = new RuleCompiler();
    const vm = new OceanicumVM();
    const existingRule = {
      name: 'latency-check',
      version: '1.0.0',
      appliesTo: ['health'],
      definition: 'responseTime < 100',
      description: 'Response time under 100ms',
      createdAt: '2026-10-01T00:00:00.000Z',
      active: true,
    };

    const drift = evolution.analyzeDrift(existingRule.name, [
      { passed: false },
      { passed: false },
      { passed: true },
      { passed: false },
    ]);
    assert.equal(drift.recommendedAction, 'RECOMPILE_DSL');

    const proposal = evolution.proposeRecompilation(existingRule, 'responseTime < 250', 'bounded P99 threshold revision');
    const program = compiler.compile(existingRule.name, proposal.candidateDefinition, '2.0.0');
    const execution = vm.execute(program, { metadata: { responseTime: 200 } });

    assert.equal(program.version, '2.0.0');
    assert.equal(execution.passed, true);
    assert.equal(proposal.status, 'PROPOSED');
    assert.equal(evolution.promote(proposal.id)?.status, 'PROMOTED');
  });
});
