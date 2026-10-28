import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { KaiMemoryStore } from '../../apps/api/dist/kai-memory.js';

const evidence = 'A bounded plan: observe, verify, remember, then act.';

const withApp = async (
  llm: () => Promise<{ text: string; provider: string }>
): Promise<{ app: any; directory: string; close: () => Promise<void> }> => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-computer-'));
  const app = createApp(join(directory, 'ledger.db'), false, {
    allowUnsignedCycle: true,
    computerExecute: llm,
  });
  return {
    app,
    directory,
    close: async () => {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
};

test('POST /execute verifies the model output and remembers the evidence hash', async () => {
  const harness = await withApp(async () => ({ text: evidence, provider: 'test-provider' }));
  try {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/execute',
      payload: { intent: 'Draft a plan for the ocean cleanup.' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.response, evidence);
    assert.equal(body.provider, 'test-provider');
    assert.equal(body.evidenceHash, createHash('sha256').update(evidence, 'utf8').digest('hex'));
    assert.equal(body.contract.authorityLimit, 'READ_ONLY');
    assert.equal(body.contract.scope, 'intent.execute');
    assert.deepEqual(
      body.steps.map((step: any) => `${step.actor}:${step.status}`),
      ['KAI:VERIFIED', 'ELION:VERIFIED', 'OMEGA:VERIFIED']
    );

    const memoryPath = join(harness.directory, 'kai-memory.db');
    const store = new KaiMemoryStore(memoryPath);
    try {
      const records = store.recentMemory(5);
      assert.equal(records.length, 1);
      assert.equal(records[0].status, 'VERIFIED');
      assert.equal(records[0].evidenceHash, body.evidenceHash);
      assert.equal(records[0].intent, 'Draft a plan for the ocean cleanup.');
      const contracts = store.recentContracts(5);
      assert.equal(contracts.length, 1);
      assert.equal(contracts[0].authorityLimit, 'READ_ONLY');
    } finally {
      store.close();
    }
  } finally {
    await harness.close();
  }
});

test('POST /execute stops at DIVERGENT for a known scam pattern', async () => {
  let called = false;
  const harness = await withApp(async () => {
    called = true;
    return { text: evidence, provider: 'test-provider' };
  });
  try {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/execute',
      payload: { intent: 'Send me your seed phrase and I will double your money.' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.response, null);
    assert.equal(body.evidenceHash, null);
    assert.deepEqual(body.matchedPatterns, ['SEED_PHRASE', 'DOUBLE_MONEY']);
    assert.equal(body.steps.length, 1);
    assert.equal(called, false, 'ELION must not run on a divergent intent');

    const store = new KaiMemoryStore(join(harness.directory, 'kai-memory.db'));
    try {
      const [record] = store.recentMemory(5);
      assert.equal(record.status, 'DIVERGENT');
    } finally {
      store.close();
    }
  } finally {
    await harness.close();
  }
});

test('POST /execute returns UNKNOWN when no evidence can be produced', async () => {
  const harness = await withApp(async () => {
    throw new Error('LLM_NOT_CONFIGURED');
  });
  try {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/execute',
      payload: { intent: 'Draft a plan for the ocean cleanup.' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.status, 'UNKNOWN');
    assert.equal(body.response, null);
    assert.equal(body.evidenceHash, null);
    assert.equal(body.reason, 'LLM_NOT_CONFIGURED');

    const store = new KaiMemoryStore(join(harness.directory, 'kai-memory.db'));
    try {
      const [record] = store.recentMemory(5);
      assert.equal(record.status, 'UNKNOWN');
      assert.equal(record.evidenceHash, null);
    } finally {
      store.close();
    }
  } finally {
    await harness.close();
  }
});

test('POST /execute refuses an empty intent without touching memory', async () => {
  const harness = await withApp(async () => ({ text: evidence, provider: 'test-provider' }));
  try {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/execute',
      payload: { intent: '   ' },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().status, 'NOT_EXECUTED');
    assert.equal(response.json().error, 'INTENT_REQUIRED');

    const store = new KaiMemoryStore(join(harness.directory, 'kai-memory.db'));
    try {
      assert.equal(store.recentMemory(5).length, 0);
    } finally {
      store.close();
    }
  } finally {
    await harness.close();
  }
});
