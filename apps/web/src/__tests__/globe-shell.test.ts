import assert from 'node:assert/strict';
import { test } from 'node:test';
import { globeRealityKind, globeShellCaption } from '../globe-shell.ts';

test('preserves UNKNOWN when nothing was observed', () => {
  assert.equal(globeRealityKind(null), 'UNKNOWN');
  assert.equal(globeRealityKind(undefined), 'UNKNOWN');
  assert.equal(globeRealityKind(''), 'UNKNOWN');
});

test('does not promote decorative mood into VERIFIED', () => {
  assert.equal(globeRealityKind('connected'), 'UNKNOWN');
  assert.equal(globeRealityKind('healthy'), 'UNKNOWN');
  assert.equal(globeRealityKind('GREEN'), 'UNKNOWN');
});

test('passes through bounded classifications only', () => {
  assert.equal(globeRealityKind('VERIFIED'), 'VERIFIED');
  assert.equal(globeRealityKind('divergent'), 'DIVERGENT');
  assert.equal(globeRealityKind('not executed'), 'NOT_EXECUTED');
});

test('states that globe view is not verification', () => {
  assert.equal(
    globeShellCaption(null),
    'UI shell · reality status UNKNOWN · globe view is not verification',
  );
  assert.match(globeShellCaption('VERIFIED'), /VERIFIED/);
  assert.match(globeShellCaption('VERIFIED'), /not verification/);
});
