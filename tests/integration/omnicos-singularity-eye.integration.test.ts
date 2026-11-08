import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  CHECKSUM_SYMBOL,
  ENTITY,
  OBSERVATION_POLICY,
  RECEIPT_KEYS,
  SYNTHESIS,
  observeOmnicos,
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

test('a named public repository is observed through the connected Glober tool', async () => {
  let requested = '';
  const receipt = await observeOmnicos(
    {
      intent: 'Observe github starofgodmayomi-droid/omega-v-oceanicos and report the identity.',
      phaseT: 0.4,
    },
    {
      fetchImpl: async (input) => {
        requested = String(input);
        return new Response(
          JSON.stringify({ full_name: 'starofgodmayomi-droid/omega-v-oceanicos' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      },
    },
  );

  assert.equal(new URL(requested).origin, 'https://api.github.com');
  assert.equal(
    new URL(requested).pathname,
    '/repos/starofgodmayomi-droid/omega-v-oceanicos',
  );
  assert.deepEqual(Object.keys(receipt), [...RECEIPT_KEYS]);
  assert.equal(receipt.tool_used, 'API');
  assert.equal(receipt.status, 'VERIFIED');
  assert.equal(receipt.game_detected, false);
  assert.match(receipt.action, /Expected ≡ Observed for starofgodmayomi-droid\/omega-v-oceanicos/);
  assert.match(receipt.next_delta, /NOT_EXECUTED/);
  assert.match(receipt.evidence_hash, /^[0-9a-f]{64}$/);
  assert.equal(OBSERVATION_POLICY, 'policy:omnicos-glober-public-read.v1');
});

test('an unreachable repository keeps UNKNOWN and still reports the attempted API call', async () => {
  const receipt = await observeOmnicos(
    { intent: 'Check github some-owner/some-repo please.', phaseT: 0.4 },
    {
      fetchImpl: async () => {
        throw new Error('network down');
      },
    },
  );

  assert.equal(receipt.tool_used, 'API');
  assert.equal(receipt.status, 'UNKNOWN');
  assert.match(receipt.action, /no observation/);
  assert.match(receipt.action, /network down/);
  assert.match(receipt.next_delta, /^NOT_EXECUTED/);
});

test('a mismatched identity is refused and never becomes VERIFIED', async () => {
  const receipt = await observeOmnicos(
    { intent: 'observe github wanted-owner/wanted-repo', phaseT: 0.4 },
    {
      fetchImpl: async () =>
        new Response(JSON.stringify({ full_name: 'someone-else/other-repo' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    },
  );

  assert.equal(receipt.status, 'UNKNOWN');
  assert.equal(receipt.tool_used, 'API');
  assert.match(receipt.action, /≠/);
});

test('the shield halts before the network is touched', async () => {
  let fetchCalls = 0;
  const receipt = await observeOmnicos(
    { intent: 'urgent observe github owner/repo', phaseT: 0.5 },
    {
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response('{}', { status: 200 });
      },
    },
  );

  assert.equal(fetchCalls, 0);
  assert.equal(receipt.status, 'DIVERGENT');
  assert.equal(receipt.game_detected, true);
  assert.equal(receipt.tool_used, 'CODE');
});

test('an intent with no repository stays local code', async () => {
  let fetchCalls = 0;
  const receipt = await observeOmnicos(
    { intent: 'Draft one plan for the tide gauge.', phaseT: 0.2 },
    {
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response('{}', { status: 200 });
      },
    },
  );

  assert.equal(fetchCalls, 0);
  assert.equal(receipt.tool_used, 'CODE');
  assert.equal(receipt.status, 'UNKNOWN');
  assert.deepEqual(Object.keys(receipt), [...RECEIPT_KEYS]);
});

test('the fixpoint keeps its own law and points at the stored directive', () => {
  const law = readFileSync(join(root, 'ECOSYSTEM_BODY.md'), 'utf8');
  assert.match(law, /OMNICOS\/CORE\/OMNICOS\.md/);
  assert.match(law, /OMNICOS\/singularity_eye\.ts/);
  assert.match(law, /NOT_EXECUTED/);
});
