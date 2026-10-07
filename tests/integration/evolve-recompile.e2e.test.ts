import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileOmegaIntent, validateOmegaIR } from '../../packages/mini/dist/index.js';
import { EvolutionEngine } from '../../packages/evolution/dist/index.js';
import { RuleCompiler } from '../../packages/compiler/dist/index.js';
import { OceanicumVM } from '../../packages/ir/dist/index.js';

describe('ΩIR source line provenance', () => {
  const compileWithSources = (sourceRefs) => compileOmegaIntent({
    intent: 'preserve source lineage',
    subject: 'repo:source-lineage',
    stateBefore: 'S0',
    evidenceRefs: [],
    sourceRefs,
    policyRefs: [],
    workerPlan: [],
    transition: { dryRun: true },
    observation: {
      observerId: 'source-lineage-test',
      targets: ['repo:source-lineage'],
      evidenceRequired: ['source locator and line range'],
    },
  });

  it('preserves distinct locators and line ranges without promoting either source', () => {
    const ir = compileWithSources([
      { id: 'source-1', kind: 'document', locator: 'attachment:pasted_content.txt', state: 'RETRIEVED', provenance: 'user-provided-attachment', lineRange: { startLine: 1129, endLine: 1147 } },
      { id: 'source-2', kind: 'document', locator: 'attachment:pasted_content_2.txt', state: 'RETRIEVED', provenance: 'user-provided-attachment', lineRange: { startLine: 218, endLine: 247 } },
    ]);

    assert.deepEqual(ir.sourceRefs?.map(({ locator, lineRange, state }) => ({ locator, lineRange, state })), [
      { locator: 'attachment:pasted_content.txt', lineRange: { startLine: 1129, endLine: 1147 }, state: 'RETRIEVED' },
      { locator: 'attachment:pasted_content_2.txt', lineRange: { startLine: 218, endLine: 247 }, state: 'RETRIEVED' },
    ]);
    assert.equal(validateOmegaIR(ir).valid, true);
    assert.equal(ir.sourceRefs?.every((ref) => !ref.authority && !ref.evidenceRef), true);
  });

  it('rejects reversed and malformed line ranges at compile and validation boundaries', () => {
    assert.throws(
      () => compileWithSources([{ id: 'source-1', kind: 'document', locator: 'source.txt', state: 'RETRIEVED', provenance: 'test', lineRange: { startLine: 10, endLine: 9 } }]),
      /source line range/,
    );

    const valid = compileWithSources([{ id: 'source-1', kind: 'document', locator: 'source.txt', state: 'RETRIEVED', provenance: 'test', lineRange: { startLine: 1, endLine: 2 } }]);
    const nonPositive = { ...valid, sourceRefs: [{ ...valid.sourceRefs[0], lineRange: { startLine: 0, endLine: 2 } }] };
    assert.deepEqual(validateOmegaIR(nonPositive).issues.map((issue) => issue.path), ['sourceRefs[0].lineRange.startLine']);
    const malformed = { ...valid, sourceRefs: [{ ...valid.sourceRefs[0], lineRange: null }] };
    assert.deepEqual(validateOmegaIR(malformed).issues.map((issue) => issue.path), ['sourceRefs[0].lineRange']);
  });
});

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
