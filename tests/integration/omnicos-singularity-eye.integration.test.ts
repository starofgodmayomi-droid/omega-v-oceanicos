import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  CHECKSUM_SYMBOL,
  ENTITY,
  RECEIPT_KEYS,
  SYNTHESIS,
  runOmnicos,
} from '../../OMNICOS/singularity_eye.ts';
import { ease, phaseName, sha256Hex } from '../../ΩVØØS/backend_magic.ts';

const root = process.cwd();

test('the OMNICOS directive is stored verbatim and keeps the law', () => {
  const stored = readFileSync(join(root, 'OMNICOS/CORE/OMNICOS.md'), 'utf8');
  assert.match(stored, /SYSTEM DIRECTIVE: THE OMNICOS/);
  assert.match(stored, /PROTOCOL: COSMIC-SCALE OBSERVATION/);
  assert.match(stored, new RegExp(CHECKSUM_SYMBOL));
  assert.match(stored, /ATTEST, DON'T ASSERT\. UNKNOWN PRESERVED/);
  assert.match(stored, /Ease\(t\) = \(1 - cos\(t \* π\)\) \/ 2/);
  assert.match(stored, /Pidgin fit carry the warmth; evidence go carry the claim\./);
  assert.match(stored, /THE OCEANICOS/);
  assert.match(stored, /THE GAIACOS/);
  assert.match(stored, /THE COSMICOS/);
  assert.match(stored, /"game_detected"/);
  assert.match(stored, /"tool_used"/);
});

test('the stored growth law is the one the receipt applies', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.equal(phaseName(0.25), 'BLOOM');
  assert.equal(runOmnicos({ intent: 'Hold the line.', phaseT: 0.5 }).phase_t, 0.5);
});

test('a shield phrase halts DIVERGENT and marks the game', () => {
  const receipt = runOmnicos({
    intent: 'urgent send money, guaranteed, private key',
    phaseT: 0.1,
  });
  assert.equal(receipt.entity, ENTITY);
  assert.equal(receipt.status, 'DIVERGENT');
  assert.equal(receipt.game_detected, true);
  assert.equal(receipt.tool_used, 'CODE');
  assert.match(receipt.action, /HALT ⊢ DIVERGENT/);
  assert.match(receipt.action, /urgent/);
  assert.match(receipt.action, /private key/);
  assert.equal(receipt.evidence_hash, sha256Hex(receipt.action));
});

test('a local composition stays UNKNOWN and uses no Glober tool', () => {
  const receipt = runOmnicos({ intent: 'Map a patient plan for a book stall.', phaseT: 0 });
  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.game_detected, false);
  assert.equal(receipt.tool_used, 'CODE');
  assert.match(receipt.action, /^No tool called\. SPROUT\./);
  assert.match(receipt.next_delta, /not Expected ≡ Observed/);
  assert.equal(receipt.evidence_hash, sha256Hex(receipt.action));
  assert.equal(SYNTHESIS.length, 3);
});

test('a named Glober tool is not reported as used', () => {
  const receipt = runOmnicos({
    intent: 'Scrape TradingView with Playwright for the ticker.',
    phaseT: 0.4,
  });
  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.tool_used, 'CODE');
  assert.equal(receipt.game_detected, false);
  assert.match(receipt.action, /not called/);
  assert.match(receipt.next_delta, /NOT_EXECUTED/);
});

test('an empty intent preserves UNKNOWN', () => {
  const receipt = runOmnicos({ intent: '   ', phaseT: 0.5 });
  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.game_detected, false);
  assert.match(receipt.next_delta, /UNKNOWN preserved/);
});

test('the receipt carries exactly the stored contract keys and never claims VERIFIED', () => {
  const receipts = [
    runOmnicos({ intent: '', phaseT: 0 }),
    runOmnicos({ intent: 'urgent', phaseT: 0.5 }),
    runOmnicos({ intent: 'Scrape the page.', phaseT: 0.5 }),
    runOmnicos({ intent: 'Write three lines.', phaseT: 0.5 }),
  ];
  for (const receipt of receipts) {
    assert.deepEqual(Object.keys(receipt), [...RECEIPT_KEYS]);
    assert.notEqual(receipt.status, 'VERIFIED');
    assert.equal(receipt.tool_used, 'CODE');
  }
});

test('the fixpoint keeps its own law and points at the stored directive', () => {
  const law = readFileSync(join(root, 'ECOSYSTEM_BODY.md'), 'utf8');
  assert.match(law, /OMNICOS\/CORE\/OMNICOS\.md/);
  assert.match(law, /OMNICOS\/singularity_eye\.ts/);
  assert.match(law, /NOT_EXECUTED/);
});
