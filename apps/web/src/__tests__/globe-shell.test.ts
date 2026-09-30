import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bindGlobeEvidence,
  globeRealityKind,
  globeShellCaption,
  globeShellCaptionFromEvidence,
} from '../globe-shell.ts';

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

test('does not invent VERIFIED when /v1/block/tip is unreachable', () => {
  const evidence = bindGlobeEvidence({
    reachable: false,
    tipRouteStatus: 'ONLINE',
    tipEvidenceStatus: 'VERIFIED',
    chainIntact: true,
  });
  assert.equal(evidence.source, 'UNREACHABLE');
  assert.equal(evidence.status, 'UNKNOWN');
  assert.equal(evidence.chainIntact, null);
  assert.match(globeShellCaptionFromEvidence(evidence), /not invented/);
  assert.match(globeShellCaptionFromEvidence(evidence), /UNKNOWN/);
  assert.doesNotMatch(globeShellCaptionFromEvidence(evidence), /VERIFIED/);
});

test('does not treat ONLINE or healthy as a reality classification', () => {
  const online = bindGlobeEvidence({
    reachable: true,
    tipRouteStatus: 'ONLINE',
    tipEvidenceStatus: 'ONLINE',
    chainIntact: true,
  });
  assert.equal(online.status, 'UNKNOWN');
  const healthy = bindGlobeEvidence({
    reachable: true,
    tipRouteStatus: 'ONLINE',
    tipEvidenceStatus: 'healthy',
    chainIntact: true,
  });
  assert.equal(healthy.status, 'UNKNOWN');
});

test('degraded ledger chain is DIVERGENT, not VERIFIED', () => {
  const fromRoute = bindGlobeEvidence({
    reachable: true,
    tipRouteStatus: 'DEGRADED',
    tipEvidenceStatus: 'VERIFIED',
    chainIntact: true,
  });
  assert.equal(fromRoute.source, 'LIVE');
  assert.equal(fromRoute.status, 'DIVERGENT');
  assert.equal(fromRoute.chainIntact, false);
  assert.match(globeShellCaptionFromEvidence(fromRoute), /DEGRADED/);

  const fromIntegrity = bindGlobeEvidence({
    reachable: true,
    tipRouteStatus: 'ONLINE',
    tipEvidenceStatus: 'VERIFIED',
    chainIntact: false,
  });
  assert.equal(fromIntegrity.status, 'DIVERGENT');
});

test('empty live tip stays UNKNOWN until evidence is observed', () => {
  const evidence = bindGlobeEvidence({
    reachable: true,
    tipRouteStatus: 'ONLINE',
    tipEvidenceStatus: null,
    chainIntact: true,
  });
  assert.equal(evidence.source, 'EMPTY');
  assert.equal(evidence.status, 'UNKNOWN');
  assert.match(globeShellCaptionFromEvidence(evidence), /no \/v1 tip observed/);
});

test('passes live tip evidence through only after /v1 is reachable', () => {
  const evidence = bindGlobeEvidence({
    reachable: true,
    tipRouteStatus: 'ONLINE',
    tipEvidenceStatus: 'VERIFIED',
    chainIntact: true,
  });
  assert.equal(evidence.source, 'LIVE');
  assert.equal(evidence.status, 'VERIFIED');
  assert.match(globeShellCaptionFromEvidence(evidence), /\/v1 live/);
  assert.match(globeShellCaptionFromEvidence(evidence), /not verification/);
});
