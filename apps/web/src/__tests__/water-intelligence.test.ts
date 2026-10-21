import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WATER_BEHAVIORS,
  WATER_LAW,
  emptyWaterInput,
  readWaterIntelligence,
} from '../water-intelligence.ts';

test('idle water stays still and does not verify the ocean', () => {
  const view = readWaterIntelligence(emptyWaterInput());
  assert.equal(view.core, 'NOT_EXECUTED');
  assert.equal(view.claim, 'NOT_EXECUTED');
  assert.equal(view.readings.find((reading) => reading.behavior === 'STILL')?.active, true);
  assert.equal(view.readings.find((reading) => reading.behavior === 'CONTAINMENT')?.active, true);
  assert.equal(view.readings.some((reading) => reading.status === 'VERIFIED'), false);
  assert.match(view.law, /does not mint verification/);
  assert.equal(view.law, WATER_LAW);
});

test('naming an intent and a route starts flow without executing it', () => {
  const view = readWaterIntelligence({
    ...emptyWaterInput(),
    intent: 'Read the repository metadata',
    route: 'OBSERVATION',
    current: 'OBSERVATION',
    events: 1,
  });
  const flow = view.readings.find((reading) => reading.behavior === 'FLOW');
  assert.equal(flow?.active, true);
  assert.equal(flow?.status, 'NOT_EXECUTED');
  assert.match(flow?.evidence ?? '', /No worker was admitted/);
  assert.equal(view.core, 'NOT_EXECUTED');
});

test('a field match without a verifier stays UNKNOWN', () => {
  const view = readWaterIntelligence({
    ...emptyWaterInput(),
    expected: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
    actual: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
    verified: false,
    sourceShown: true,
  });
  assert.equal(view.claim, 'UNKNOWN');
  assert.equal(view.core, 'UNKNOWN');
  assert.equal(view.readings.find((reading) => reading.behavior === 'REFLECTION')?.status, 'UNKNOWN');
  assert.equal(view.readings.find((reading) => reading.behavior === 'TURBULENCE')?.active, false);
  assert.match(view.readings.find((reading) => reading.behavior === 'REFLECTION')?.evidence ?? '', /Verification was not run/);
});

test('a mismatched field becomes turbulence and never a success glow', () => {
  const view = readWaterIntelligence({
    ...emptyWaterInput(),
    expected: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
    actual: 'github:other/repo:metadata',
    verified: true,
  });
  assert.equal(view.claim, 'DIVERGENT');
  assert.equal(view.core, 'DIVERGENT');
  assert.equal(view.readings.find((reading) => reading.behavior === 'TURBULENCE')?.active, true);
  assert.equal(view.readings.some((reading) => reading.status === 'VERIFIED'), false);
});

test('an explicit verifier can mark only the claim, not the ocean skin', () => {
  const view = readWaterIntelligence({
    ...emptyWaterInput(),
    expected: 'field-a',
    actual: 'field-a',
    verified: true,
    sourceShown: true,
  });
  assert.equal(view.claim, 'VERIFIED');
  assert.equal(view.core, 'UNKNOWN');
  assert.equal(view.readings.find((reading) => reading.behavior === 'REFLECTION')?.status, 'VERIFIED');
  assert.equal(view.readings.find((reading) => reading.behavior === 'FLOW')?.status, 'NOT_EXECUTED');
});

test('a verified flag with no observation does not count', () => {
  const view = readWaterIntelligence({
    ...emptyWaterInput(),
    verified: true,
  });
  assert.equal(view.claim, 'NOT_EXECUTED');
  assert.equal(view.core, 'NOT_EXECUTED');
});

test('the behavior language is the closed twelve', () => {
  assert.deepEqual(WATER_BEHAVIORS, [
    'FLOW',
    'CONFLUENCE',
    'DEPTH',
    'TRANSPARENCY',
    'TIDES',
    'RIPPLES',
    'CURRENTS',
    'STILL',
    'TURBULENCE',
    'FILTRATION',
    'CONTAINMENT',
    'REFLECTION',
  ]);
});
