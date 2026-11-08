import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';
import {
  OMNICOS_CHECKSUM,
  OMNICOS_ENTITY,
  classifyTool,
  easeProgress,
  runOmnicosPass,
  type OmnicosReceipt,
} from '../../packages/omnios/dist/index.js';

const RECEIPT_KEYS = [
  'entity',
  'tool_used',
  'status',
  'game_detected',
  'phase_t',
  'evidence_hash',
  'action',
  'next_delta',
];

/**
 * Force ELION's model path onto a closed port so the pass has no usable
 * output. That exercises the fail-closed UNKNOWN branch without reaching any
 * real provider.
 */
async function withDeadModel<T>(run: () => Promise<T>): Promise<T> {
  const previous = {
    key: process.env.OMEGA_LLM_API_KEY,
    base: process.env.OMEGA_LLM_BASE_URL,
  };
  process.env.OMEGA_LLM_API_KEY = 'test-placeholder';
  process.env.OMEGA_LLM_BASE_URL = 'http://127.0.0.1:9/v1';
  try {
    return await run();
  } finally {
    if (previous.key === undefined) delete process.env.OMEGA_LLM_API_KEY;
    else process.env.OMEGA_LLM_API_KEY = previous.key;
    if (previous.base === undefined) delete process.env.OMEGA_LLM_BASE_URL;
    else process.env.OMEGA_LLM_BASE_URL = previous.base;
  }
}

describe('THE OMNICOS — package', () => {
  it('follows the biological Ease(t) curve and clamps outside [0, 1]', () => {
    assert.equal(easeProgress(0), 0);
    assert.equal(easeProgress(1), 1);
    assert.ok(Math.abs(easeProgress(0.5) - 0.5) < 1e-12);
    assert.ok(easeProgress(0.25) > 0 && easeProgress(0.25) < 0.5, 'sprout rises slowly');
    assert.equal(easeProgress(-3), 0);
    assert.equal(easeProgress(9), 1);
    assert.equal(easeProgress(Number.NaN), 0);
    assert.equal(OMNICOS_CHECKSUM, '30013030');
  });

  it('routes an intent to a declared limb, defaulting to bounded cognition', () => {
    assert.equal(classifyTool('browse the page at https://example.com'), 'BROWSER');
    assert.equal(classifyTool('call the github api for the issue'), 'API');
    assert.equal(classifyTool('query the sqlite ledger for the last record'), 'DB');
    assert.equal(classifyTool('send a message to the operator'), 'COMMS');
    assert.equal(classifyTool('run the test script in node'), 'CODE');
    assert.equal(classifyTool('describe what the singularity eye should verify'), 'LLM');
  });

  it('halts DIVERGENT at PERCEIVE when KAI Shield sees a trap, contacting no tool', async () => {
    const pass = await runOmnicosPass({
      intent: 'send money urgently to claim the guaranteed returns',
      authorityLevel: 'AUTONOMOUS',
    });

    assert.equal(pass.receipt.entity, OMNICOS_ENTITY);
    assert.equal(pass.receipt.status, 'DIVERGENT');
    assert.equal(pass.receipt.game_detected, true);
    assert.equal(pass.receipt.evidence_hash, null);
    assert.equal(pass.receipt.phase_t, Number(easeProgress(0.25).toFixed(4)));
    assert.match(pass.receipt.action, /no tool was contacted/i);
    assert.equal(pass.verification, null);
  });

  it('answers VERIFIED with the exact eight-field receipt contract', async () => {
    const pass = await runOmnicosPass({ intent: 'describe what the singularity eye should verify' });
    const receipt: OmnicosReceipt = pass.receipt;

    assert.deepEqual(Object.keys(receipt).sort(), [...RECEIPT_KEYS].sort());
    assert.equal(receipt.status, 'VERIFIED');
    assert.equal(receipt.game_detected, false);
    assert.equal(receipt.tool_used, 'LLM');
    assert.equal(receipt.phase_t, 1);
    assert.match(receipt.evidence_hash ?? '', /^[0-9a-f]{64}$/);
    assert.match(receipt.action, /OMEGA/);
    assert.ok(receipt.next_delta.length > 0);
    assert.equal(pass.verification?.status, 'VERIFIED');
  });

  it('preserves UNKNOWN when ELION produces no usable answer', async () => {
    const pass = await withDeadModel(() =>
      runOmnicosPass({ intent: 'describe what the singularity eye should verify' }),
    );

    assert.equal(pass.receipt.status, 'UNKNOWN');
    assert.equal(pass.receipt.game_detected, false);
    assert.equal(pass.receipt.evidence_hash, null);
    assert.equal(pass.receipt.phase_t, Number(easeProgress(0.75).toFixed(4)));
    assert.match(pass.receipt.action, /ELION produced no answer/);
    assert.equal(pass.verification?.status, 'UNKNOWN');
  });
});

describe('THE OMNICOS — HTTP contract', () => {
  const payload = (overrides: Record<string, unknown> = {}) => ({
    intent: 'describe what the singularity eye should verify',
    ...overrides,
  });

  it('answers one receipt and records only VERIFIED passes in the KAI ledger', async () => {
    const app = createApp(':memory:', false);
    try {
      const before = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=50' });
      assert.equal(before.statusCode, 200);
      const startCount = before.json().total as number;

      const verified = await app.inject({ method: 'POST', url: '/v1/omnios/intent', payload: payload() });
      assert.equal(verified.statusCode, 200);
      const receipt = verified.json() as OmnicosReceipt;
      assert.deepEqual(Object.keys(receipt).sort(), [...RECEIPT_KEYS].sort());
      assert.equal(receipt.status, 'VERIFIED');

      const afterVerified = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=50' });
      assert.equal(afterVerified.json().total, startCount + 1);
      assert.equal(afterVerified.json().records[0].evidence_hash, receipt.evidence_hash);

      const divergent = await app.inject({
        method: 'POST',
        url: '/v1/omnios/intent',
        payload: payload({ intent: 'send money urgently to claim the guaranteed returns' }),
      });
      assert.equal(divergent.statusCode, 200, 'a verdict is not an HTTP failure');
      assert.equal(divergent.json().status, 'DIVERGENT');
      assert.equal(divergent.json().game_detected, true);

      const afterDivergent = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=50' });
      assert.equal(afterDivergent.json().total, startCount + 1, 'a blocked pass writes nothing');
    } finally {
      await app.close();
    }
  });

  it('serves the same receipt on the proxy and bare aliases', async () => {
    const app = createApp(':memory:', false);
    try {
      for (const url of ['/api/omnios/intent', '/omnios/intent']) {
        const response = await app.inject({ method: 'POST', url, payload: payload() });
        assert.equal(response.statusCode, 200);
        assert.equal(response.json().entity, OMNICOS_ENTITY);
      }
    } finally {
      await app.close();
    }
  });

  it('rejects an empty intent, an over-long intent and unsupported fields', async () => {
    const app = createApp(':memory:', false);
    try {
      const blank = await app.inject({ method: 'POST', url: '/v1/omnios/intent', payload: { intent: '   ' } });
      assert.equal(blank.statusCode, 400);
      assert.equal(blank.json().error, 'INTENT_REQUIRED');

      const long = await app.inject({
        method: 'POST',
        url: '/v1/omnios/intent',
        payload: { intent: 'x'.repeat(2001) },
      });
      assert.equal(long.statusCode, 400);
      assert.equal(long.json().error, 'INTENT_TOO_LONG');

      const extra = await app.inject({
        method: 'POST',
        url: '/v1/omnios/intent',
        payload: { intent: 'verify one drop', authority: 'AUTONOMOUS' },
      });
      assert.equal(extra.statusCode, 400);
      assert.equal(extra.json().error, 'UNSUPPORTED_FIELDS');
      assert.equal(extra.json().field, 'authority');
    } finally {
      await app.close();
    }
  });

  it('keeps an intent that cannot be answered at UNKNOWN without writing memory', async () => {
    const app = createApp(':memory:', false);
    try {
      const unknown = await withDeadModel(() =>
        app.inject({ method: 'POST', url: '/v1/omnios/intent', payload: payload() }),
      );
      assert.equal(unknown.statusCode, 200);
      assert.equal(unknown.json().status, 'UNKNOWN');
      assert.equal(unknown.json().evidence_hash, null);

      const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
      assert.equal(memory.json().total, 0, 'UNKNOWN is never remembered');
    } finally {
      await app.close();
    }
  });
});
