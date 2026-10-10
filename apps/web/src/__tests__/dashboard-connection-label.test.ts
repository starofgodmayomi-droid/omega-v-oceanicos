import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dashboardConnectionLabel } from '../whole-ecosystem-dashboard-model.ts';

test('simulation mode is never labeled as a live connection', () => {
  assert.equal(dashboardConnectionLabel(true, true), 'BOUNDED SIMULATION');
  assert.equal(dashboardConnectionLabel(true, false), 'BOUNDED SIMULATION');
});

test('connected stream is labeled from the explicit connection observation', () => {
  assert.equal(dashboardConnectionLabel(false, true), 'STREAM CONNECTED');
});

test('disabled simulation without a connected stream remains unknown', () => {
  assert.equal(dashboardConnectionLabel(false, false), 'CONNECTION UNKNOWN');
});
