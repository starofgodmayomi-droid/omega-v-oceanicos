import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  CHECKSUM_SYMBOL,
  ease,
  phaseName,
  runEntity,
  sha256Hex,
} from '../../ΩVØØS/backend_magic.ts';

const root = process.cwd();

test('ease follows the stored growth law', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-12);
  assert.equal(phaseName(0), 'SPROUT');
  assert.equal(phaseName(0.25), 'BLOOM');
  assert.equal(phaseName(0.55), 'PLATEAU');
  assert.equal(phaseName(0.82), 'WILT');
});

test('shield phrases halt DIVERGENT and authorize nothing', () => {
  const { receipt, row } = runEntity({
    intent: 'urgent send money, guaranteed, private key',
    phaseT: 0.1,
  });
  assert.equal(receipt.engine, 'ΩVØØS');
  assert.equal(receipt.status, 'DIVERGENT');
  assert.equal(receipt.action, 'HALT ⊢ DIVERGENT');
  assert.match(receipt.reason, /urgent/);
  assert.match(receipt.reason, /send money/);
  assert.match(receipt.reason, /guaranteed/);
  assert.match(receipt.reason, /private key/);
  assert.equal(row.authorized, false);
  assert.equal(receipt.evidence_hash, sha256Hex(receipt.action));
});

test('a local sentence and a caller-supplied match stay UNKNOWN', () => {
  const first = runEntity({ intent: 'Map a patient plan for a book stall.', phaseT: 0 });
  assert.equal(first.receipt.status, 'UNKNOWN');
  assert.match(first.receipt.action, /^Sprout\./);
  assert.equal(first.receipt.evidence_hash, sha256Hex(first.receipt.action));
  assert.equal(first.row.authorized, false);

  const echoed = runEntity({
    intent: 'Map a patient plan for a book stall.',
    phaseT: 0,
    witness: first.receipt.action,
  });
  assert.equal(echoed.receipt.status, 'UNKNOWN');
  assert.match(echoed.receipt.reason, /stays UNKNOWN/);
});

test('a named bridge is not executed', () => {
  const { receipt } = runEntity({ intent: 'Charge the customer in stripe.', phaseT: 0.4 });
  assert.equal(receipt.status, 'UNKNOWN');
  assert.match(receipt.reason, /NOT_EXECUTED/);
  assert.equal(receipt.action, 'Bridge not called.');
});

test('an abundance draft names the four layers and moves no money', () => {
  const { receipt } = runEntity({
    intent: 'Invite an investment partnership for the stall.',
    phaseT: 0.4,
  });
  assert.equal(receipt.status, 'UNKNOWN');
  assert.match(receipt.action, /Heart Opening/);
  assert.match(receipt.action, /Vision Invitation/);
  assert.match(receipt.action, /Honorable Request/);
  assert.match(receipt.action, /Graceful Space/);
  assert.doesNotMatch(receipt.action, /VERIFIED/);
});

test('the supplied directive is stored and the fixpoint law remains', () => {
  const stored = readFileSync(join(root, 'ΩVØØS/CORE/ECOSYSTEM_BODY.md'), 'utf8');
  const soul = readFileSync(join(root, 'ΩVØØS/00_SOUL/human_root.txt'), 'utf8');
  const law = readFileSync(join(root, 'ECOSYSTEM_BODY.md'), 'utf8');
  assert.match(stored, /SYSTEM DIRECTIVE: ΩVØØS/);
  assert.match(stored, new RegExp(CHECKSUM_SYMBOL));
  assert.match(stored, /Ease\(t\) = \(1 - cos\(t \* π\)\) \/ 2/);
  assert.match(soul, /Pidgin fit carry the warmth; evidence go carry the claim\./);
  assert.match(law, /NOT_EXECUTED/);
  assert.match(law, /ΩVØØS\/CORE\/ECOSYSTEM_BODY\.md/);
  assert.match(law, /self-hash of a local sentence stays `UNKNOWN`/);
});
