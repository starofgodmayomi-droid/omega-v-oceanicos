import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/dist/index.js';
import {
  OMNICOS_CHECKSUM,
  OMNICOS_ENTITY,
  classifyTool,
  easeProgress,
  extractUrl,
  observePage,
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

/** The BROWSER limb is exercised with an injected fetch and resolver: no test reaches the network. */
const PUBLIC_DNS = async () => ['93.184.216.34'];

const pageResponse = (body: string, status = 200): Response =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

describe('THE OMNICOS — BROWSER limb', () => {
  it('extracts one explicit http(s) URL and trims trailing punctuation', () => {
    assert.equal(extractUrl('browse the page at https://example.com/docs.'), 'https://example.com/docs');
    assert.equal(extractUrl('read http://example.com'), 'http://example.com/');
    assert.equal(extractUrl('describe the singularity eye'), null);
  });

  it('refuses loopback, private, non-http and private-DNS targets before any fetch', async () => {
    let fetched = 0;
    const spy = (async () => {
      fetched += 1;
      return pageResponse('<p>should never be read</p>');
    }) as unknown as typeof fetch;

    for (const url of [
      'http://127.0.0.1/health',
      'http://[::1]/',
      'http://10.0.0.7/',
      'http://localhost/',
      'file:///etc/passwd',
    ]) {
      const page = await observePage(url, { fetchImpl: spy, resolveHost: PUBLIC_DNS });
      assert.equal(page.ok, false, `${url} must be refused`);
      assert.ok(page.error, `${url} must declare a reason`);
    }

    const privateDns = await observePage('https://internal.example/', {
      fetchImpl: spy,
      resolveHost: async () => ['10.0.0.7'],
    });
    assert.equal(privateDns.error, 'PRIVATE_HOST_REFUSED');

    let redirectHops = 0;
    const privateRedirect = await observePage('https://public.example/start', {
      fetchImpl: (async () => {
        redirectHops += 1;
        return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } });
      }) as unknown as typeof fetch,
      resolveHost: PUBLIC_DNS,
    });
    assert.equal(privateRedirect.error, 'PRIVATE_HOST_REFUSED');
    assert.equal(redirectHops, 1, 'the first public hop was fetched; the private redirect never was');

    assert.equal(fetched, 0, 'no refused target was ever fetched');
  });

  it('reads one page and keeps only the readable text', async () => {
    const page = await observePage('https://public.example/news', {
      fetchImpl: (async () =>
        pageResponse(
          '<html><head><title>The Drop</title><script>steal()</script></head><body><p>Observed: the tide is low.</p></body></html>',
        )) as unknown as typeof fetch,
      resolveHost: PUBLIC_DNS,
    });

    assert.equal(page.ok, true);
    assert.equal(page.status, 200);
    assert.equal(page.text, 'The Drop — Observed: the tide is low.');
    assert.ok(page.bytes > 0);
    assert.equal(page.finalUrl, 'https://public.example/news');
  });

  it('refuses a page larger than its byte cap', async () => {
    const page = await observePage('https://public.example/big', {
      fetchImpl: (async () => pageResponse(`<p>${'x'.repeat(2000)}</p>`)) as unknown as typeof fetch,
      resolveHost: PUBLIC_DNS,
      maxBytes: 500,
    });

    assert.equal(page.ok, false);
    assert.equal(page.error, 'PAGE_TOO_LARGE');
  });

  it('answers VERIFIED from the observed page and hashes the extracted text', async () => {
    const pass = await runOmnicosPass({
      intent: 'browse the page at https://public.example/news',
      browser: {
        fetchImpl: (async () =>
          pageResponse(
            '<title>The Drop</title><p>The observed page says the tide is low.</p>',
          )) as unknown as typeof fetch,
        resolveHost: PUBLIC_DNS,
      },
    });

    assert.equal(pass.receipt.tool_used, 'BROWSER');
    assert.equal(pass.receipt.status, 'VERIFIED');
    assert.match(pass.receipt.evidence_hash ?? '', /^[0-9a-f]{64}$/);
    assert.match(pass.receipt.action, /BROWSER limb read https:\/\/public\.example\/news/);
    assert.equal(pass.verification?.status, 'VERIFIED');
  });

  it('preserves UNKNOWN when the BROWSER intent names no URL', async () => {
    const pass = await runOmnicosPass({ intent: 'browse the page for the tide' });

    assert.equal(pass.receipt.tool_used, 'BROWSER');
    assert.equal(pass.receipt.status, 'UNKNOWN');
    assert.equal(pass.receipt.evidence_hash, null);
    assert.match(pass.receipt.action, /no explicit http\(s\) URL/);
    assert.equal(pass.verification, null);
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

  it('runs the BROWSER limb over HTTP and refuses a loopback target', async () => {
    const app = createApp(':memory:', false);
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/omnios/intent',
        payload: { intent: 'browse the page at http://127.0.0.1/health' },
      });
      assert.equal(response.statusCode, 200, 'a refusal is a verdict, not an HTTP failure');
      const receipt = response.json() as OmnicosReceipt;
      assert.equal(receipt.tool_used, 'BROWSER');
      assert.equal(receipt.status, 'UNKNOWN');
      assert.equal(receipt.evidence_hash, null);
      assert.match(receipt.action, /BROWSER limb could not read/);

      const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
      assert.equal(memory.json().total, 0, 'a refused read is never remembered');
    } finally {
      await app.close();
    }
  });
});
