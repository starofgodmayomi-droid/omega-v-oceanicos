import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boundedStatus,
  HUMAN_PRINCIPLES,
  HUMAN_ROOT_DISTINCTIONS,
  isLocalSimulationOnly,
  NON_COLLAPSE_DISTINCTIONS,
  runtimeModeLabel,
  statusCounts,
} from '../whole-ecosystem-dashboard-model.ts';
import {
  BODY_ORGANS,
  CONSTITUTION_LAWS,
  HUMAN_ROOT_MATERIAL,
  LIFECYCLE_STAGES,
  MODEL_AGNOSTIC_NOTE,
  MYTHIC_LINES,
  NAVIGATOR_LAYERS,
  NEXT_DELTAS,
  NON_COLLAPSE_STATES,
  REPOSITORY_STATUS_NOTE,
  VALUE_NON_COLLAPSE,
  VALUE_PATH,
  VALUE_STATUS_DEFAULT,
  VALUE_STATUS_NOTE,
  reconciliationLabel,
  resolveNavigatorCommand,
} from '../oceanicos-navigator-model.ts';

test('unknown values never become verified dashboard status', () => {
  assert.equal(boundedStatus('healthy'), 'UNKNOWN');
  assert.equal(boundedStatus('verified'), 'VERIFIED');
  assert.equal(boundedStatus('not executed'), 'NOT_EXECUTED');
});

test('status counts preserve current evidence and historical observations', () => {
  assert.deepEqual(statusCounts([
    { evidence: { status: 'DIVERGENT' } },
    { evidence: { status: 'untrusted-label' } },
  ], 'VERIFIED'), {
    VERIFIED: 1,
    UNKNOWN: 1,
    DIVERGENT: 1,
    NOT_EXECUTED: 0,
  });
});

test('empty state is explicitly unknown rather than complete', () => {
  assert.deepEqual(statusCounts([], null), {
    VERIFIED: 0,
    UNKNOWN: 1,
    DIVERGENT: 0,
    NOT_EXECUTED: 0,
  });
});

test('dashboard preserves all ten human-centered charter principles', () => {
  assert.equal(HUMAN_PRINCIPLES.length, 10);
  assert.ok(HUMAN_PRINCIPLES.includes('Humans remain accountable'));
  assert.ok(HUMAN_PRINCIPLES.includes('Respect dignity, privacy, and consent'));
  assert.ok(HUMAN_PRINCIPLES.includes('Steward for future generations'));
});

test('dashboard distinguishes lifecycle states instead of collapsing them', () => {
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('CAPABILITY ≠ AUTHORITY'));
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('EXECUTED ≠ OBSERVED'));
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('OBSERVED ≠ VERIFIED'));
  assert.ok(NON_COLLAPSE_DISTINCTIONS.includes('DEPLOYED ≠ HEALTHY'));
});

test('dashboard does not present a mode as verified live reality', () => {
  assert.equal(runtimeModeLabel(true, false), 'BOUNDED SIMULATION');
  assert.equal(runtimeModeLabel(false, false), 'AWAITING OBSERVATION');
  assert.equal(runtimeModeLabel(false, true), 'STREAM CONNECTED · REALITY UNVERIFIED');
});

test('execution mode is simulation only when the kernel explicitly reports it', () => {
  assert.equal(isLocalSimulationOnly('local-simulation-only'), true);
  assert.equal(isLocalSimulationOnly('LOCAL_SIMULATION_ONLY'), true);
  assert.equal(isLocalSimulationOnly(undefined), false);
  assert.equal(isLocalSimulationOnly('LIVE'), false);
  assert.equal(isLocalSimulationOnly('unknown-mode'), false);
});

test('dashboard preserves raw human meaning without upgrading it into fact', () => {
  assert.equal(HUMAN_ROOT_DISTINCTIONS.length, 8);
  assert.ok(HUMAN_ROOT_DISTINCTIONS.includes('RAW ≠ TRUE'));
  assert.ok(HUMAN_ROOT_DISTINCTIONS.includes('DREAM ≠ PROPHECY'));
  assert.ok(HUMAN_ROOT_DISTINCTIONS.includes('SYMBOL ≠ EVIDENCE'));
  assert.ok(HUMAN_ROOT_DISTINCTIONS.includes('CLAIM ≠ REALITY'));
});

test('Navigator exposes all compressed levels in the supplied sequence', () => {
  assert.deepEqual(NAVIGATOR_LAYERS.map((layer) => layer.level), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '∞']);
  assert.equal(NAVIGATOR_LAYERS.find((layer) => layer.id === 'body')?.title, 'THE BODY');
  assert.equal(NAVIGATOR_LAYERS.find((layer) => layer.id === 'invitation')?.title, 'THE INVITATION');
});

test('expand commands are local, recognize aliases, and reject unrelated text', () => {
  assert.deepEqual(resolveNavigatorCommand('expand Law'), { kind: 'expand-layer', layerId: 'law' });
  assert.deepEqual(resolveNavigatorCommand('expand Next Δ'), { kind: 'expand-layer', layerId: 'next-delta' });
  assert.deepEqual(resolveNavigatorCommand('expand ALL'), { kind: 'expand-all' });
  assert.deepEqual(resolveNavigatorCommand('collapse all'), { kind: 'collapse-all' });
  assert.deepEqual(resolveNavigatorCommand('collapse body'), { kind: 'collapse-layer', layerId: 'body' });
  assert.deepEqual(resolveNavigatorCommand('send this to a model'), { kind: 'invalid' });
});

test('Navigator keeps command execution, observation, and reconciliation separate', () => {
  assert.equal(reconciliationLabel('PROPOSED'), 'PROPOSED · NOT EXECUTED');
  assert.equal(reconciliationLabel('AUTHORIZED'), 'AUTHORIZED · NOT EXECUTED');
  assert.equal(reconciliationLabel('EXECUTED'), 'AWAITING OBSERVATION');
  assert.equal(reconciliationLabel('EXECUTED', 'VERIFIED'), 'VERIFIED');
  assert.equal(reconciliationLabel('EXECUTED', 'DIVERGENT'), 'DIVERGENT');
  assert.equal(reconciliationLabel(null, null), 'NOT YET RECONCILED');
});

test('body, repository, and model wording does not imply unverified runtime connections', () => {
  assert.ok(BODY_ORGANS.some((organ) => organ.name === 'MIRRIO'));
  assert.ok(BODY_ORGANS.some((organ) => organ.name === 'TRUTHOS'));
  assert.ok(BODY_ORGANS.some((organ) => organ.name === 'KAI'));
  assert.match(REPOSITORY_STATUS_NOTE, /does not query live GitHub/i);
  assert.match(MODEL_AGNOSTIC_NOTE, /infrastructure/i);
  assert.doesNotMatch(MODEL_AGNOSTIC_NOTE, /ChatGPT|Manus|Grok|Groq/);
});

test('constitution, lifecycle, and human-root material retain source text with evidence boundaries', () => {
  assert.equal(CONSTITUTION_LAWS.length, 10);
  assert.ok(CONSTITUTION_LAWS.includes('Memory is immortal'));
  assert.ok(LIFECYCLE_STAGES.includes('VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED'));
  assert.ok(HUMAN_ROOT_MATERIAL.includes('Dreams'));
  assert.ok(MYTHIC_LINES.length === 3);
});

test('Next Δ list is a candidate list rather than an implied completion record', () => {
  assert.equal(NEXT_DELTAS.length, 12);
  assert.ok(NEXT_DELTAS.includes('Build Navigator'));
});

test('whole-body value path preserves actual-value distinctions', () => {
  assert.ok(VALUE_PATH.includes('HUMAN NEED'));
  assert.ok(VALUE_PATH.includes('EVIDENCE'));
  assert.ok(VALUE_PATH.includes('REVENUE / IMPACT'));
  assert.ok(VALUE_NON_COLLAPSE.includes('REVENUE IDEA ≠ REVENUE'));
  assert.ok(VALUE_NON_COLLAPSE.includes('REVENUE CLAIM ≠ REVENUE'));
  assert.equal(VALUE_STATUS_DEFAULT, 'UNKNOWN');
  assert.match(VALUE_STATUS_NOTE, /does not query/i);
});
