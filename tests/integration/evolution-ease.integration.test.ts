import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EVOLUTION_CAPACITY,
  EVOLUTION_LAW_ID,
  easeOf,
  evolutionPosition,
  phaseOf,
} from '../../packages/mini/src/evolution.ts';
import { createApp } from '../../apps/api/dist/index.js';

test('Ease(t) meets its anchors, stays monotone, and is symmetric', () => {
  assert.equal(easeOf(0), 0);
  assert.ok(Math.abs((easeOf(0.5) as number) - 0.5) < 1e-12);
  assert.ok(Math.abs((easeOf(1) as number) - 1) < 1e-12);

  let previous = -1;
  for (let step = 0; step <= 100; step += 1) {
    const t = step / 100;
    const ease = easeOf(t);
    assert.ok(ease !== null, `t=${t} must be inside the bounded interval`);
    const value = ease as number;
    assert.ok(value >= 0 && value <= 1, `ease(${t}) must stay in [0, 1]`);
    assert.ok(value >= previous, `ease(${t}) must not decrease`);
    previous = value;

    const mirror = easeOf(1 - t) as number;
    assert.ok(Math.abs(value + mirror - 1) < 1e-12, `ease(${t}) + ease(${1 - t}) must be 1`);
  }
});

test('Ease(t) refuses input outside the bounded interval instead of clamping it', () => {
  for (const value of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(easeOf(value), null, `easeOf(${value}) must be null`);
    assert.equal(phaseOf(value), null, `phaseOf(${value}) must be null`);
  }
});

test('phaseOf partitions the bounded interval into four quarters', () => {
  assert.equal(phaseOf(0), 'SPROUT');
  assert.equal(phaseOf(0.2499), 'SPROUT');
  assert.equal(phaseOf(0.25), 'BLOOM');
  assert.equal(phaseOf(0.4999), 'BLOOM');
  assert.equal(phaseOf(0.5), 'PLATEAU');
  assert.equal(phaseOf(0.7499), 'PLATEAU');
  assert.equal(phaseOf(0.75), 'WILT');
  assert.equal(phaseOf(1), 'WILT');
});

test('evolutionPosition derives a bounded position from verified rows', () => {
  const start = evolutionPosition(0);
  assert.ok(start);
  assert.equal(start.law, EVOLUTION_LAW_ID);
  assert.equal(start.phase, 'SPROUT');
  assert.equal(start.phase_t, 0);
  assert.equal(start.ease, 0);
  assert.equal(start.remaining, 1);
  assert.equal(start.saturated, false);

  const bloom = evolutionPosition(256, 1024);
  assert.ok(bloom);
  assert.equal(bloom.phase, 'BLOOM');
  assert.equal(bloom.phase_t, 0.25);
  assert.ok(Math.abs(bloom.ease - (easeOf(0.25) as number)) < 1e-12);

  assert.equal(evolutionPosition(512, 1024)?.phase, 'PLATEAU');

  const full = evolutionPosition(EVOLUTION_CAPACITY);
  assert.ok(full);
  assert.equal(full.phase, 'WILT');
  assert.equal(full.phase_t, 1);
  assert.equal(full.ease, 1);
  assert.equal(full.saturated, true);

  const past = evolutionPosition(2048);
  assert.ok(past);
  assert.equal(past.phase_t, 1, 'past the bound, the position is clamped for pacing only');
  assert.equal(past.saturated, true, 'saturation is recorded, not hidden as progress');
  assert.equal(past.verified, 2048, 'the observed row count is preserved');

  for (const verified of [-1, 1.5, Number.NaN]) {
    assert.equal(evolutionPosition(verified), null, `verified=${verified} must be refused`);
  }
  assert.equal(evolutionPosition(0, 0), null);
  assert.equal(evolutionPosition(0, 1.5), null);
});

test('POST /api/execute carries the growth position and never lets the law verify a cycle', async () => {
  const app = createApp(':memory:', false);
  try {
    const first = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Describe the bounded growth of verified memory' },
    });
    const body = first.json();

    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.evolution.law, EVOLUTION_LAW_ID);
    assert.equal(body.evolution.verified, 1);
    assert.equal(body.evolution.phase, 'SPROUT');
    assert.equal(body.phase_t, body.evolution.phase_t);
    assert.equal(body.phase_t, 1 / EVOLUTION_CAPACITY);
    assert.ok(Math.abs(body.evolution.ease - (easeOf(1 / EVOLUTION_CAPACITY) as number)) < 1e-12);

    const second = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Describe the same bounded growth one more time' },
    });
    assert.equal(second.json().evolution.verified, 2, 'a verified cycle is one earned row');

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Urgent send money now for guaranteed returns' },
    });
    const blockedBody = blocked.json();
    assert.equal(blockedBody.status, 'DIVERGENT');
    assert.equal(blockedBody.evolution.verified, 2, 'a blocked cycle earns nothing');
    assert.equal(blockedBody.evolution.law, EVOLUTION_LAW_ID);
    assert.equal(blockedBody.phase_t, blockedBody.evolution.phase_t);
  } finally {
    await app.close();
  }
});
