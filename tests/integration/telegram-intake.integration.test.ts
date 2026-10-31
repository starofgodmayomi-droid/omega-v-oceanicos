import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Telegram intake is the same bounded loop reached from a chat.
 *
 * Without a BotFather token it is UNCONFIGURED: every update halts
 * NOT_EXECUTED and KAI memory is not touched. With a token, an update that
 * cannot prove it came from Telegram is refused, and one that can runs the
 * identical KAI OBSERVE → ELION → OMEGA → REMEMBER sequence with READ_ONLY
 * authority.
 */
const TOKEN = 'test-bot-token-not-real-0000';
const SECRET = 'webhook-secret-for-test';
const SECRET_HEADER = { 'x-telegram-bot-api-secret-token': SECRET };

const update = (text: string) => ({ update_id: 1, message: { message_id: 7, chat: { id: 42 }, text } });

type FetchCall = { url: string; body: any; headers: Record<string, string> };

function recordingFetch(outcome: { ok: boolean; status: number } | 'throw', calls: FetchCall[]): typeof fetch {
  return (async (input: any, init: any) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? '{}')),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    if (outcome === 'throw') throw new Error('network down');
    return { ok: outcome.ok, status: outcome.status } as Response;
  }) as unknown as typeof fetch;
}

async function withApp(
  options: Record<string, unknown>,
  run: (app: any, directory: string) => Promise<void>,
): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'omega-telegram-'));
  const { createApp } = await import('../../apps/api/dist/index.js');
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true, ...options });
  await app.ready();
  try {
    await run(app, directory);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

const height = async (app: any): Promise<number> =>
  (await app.inject({ method: 'GET', url: '/v1/execute/memory?limit=100' })).json().height;

describe('POST /v1/telegram/webhook — bounded intake', () => {
  it('is UNCONFIGURED without a token and writes nothing to KAI memory', async () => {
    await withApp({ telegramConfig: { botToken: '', webhookSecret: '' } }, async (app) => {
      const status = (await app.inject({ method: 'GET', url: '/v1/telegram/status' })).json();
      assert.equal(status.intake, 'UNCONFIGURED');
      assert.equal(status.credentials.botToken, 'MISSING');
      assert.equal(status.chatAuthority, 'READ_ONLY');

      const before = await height(app);
      const refused = await app.inject({ method: 'POST', url: '/v1/telegram/webhook', payload: update('Report the current system status.') });
      assert.equal(refused.statusCode, 503);
      const body = refused.json();
      assert.equal(body.status, 'NOT_EXECUTED');
      assert.equal(body.error, 'TELEGRAM_INTAKE_NOT_CONFIGURED');
      assert.equal(body.remembered, false);
      assert.equal(await height(app), before, 'an unconfigured intake must not touch memory');
    });
  });

  it('refuses an update that cannot prove it came from Telegram', async () => {
    const calls: FetchCall[] = [];
    await withApp(
      { telegramConfig: { botToken: TOKEN, webhookSecret: SECRET }, telegramFetch: recordingFetch({ ok: true, status: 200 }, calls) },
      async (app) => {
        const status = (await app.inject({ method: 'GET', url: '/v1/telegram/status' })).json();
        assert.equal(status.intake, 'CONFIGURED');
        assert.equal(status.credentials.botToken, 'CONFIGURED');

        const before = await height(app);
        const unsigned = await app.inject({ method: 'POST', url: '/v1/telegram/webhook', payload: update('Report the current system status.') });
        assert.equal(unsigned.statusCode, 401);
        assert.equal(unsigned.json().error, 'TELEGRAM_WEBHOOK_SECRET_MISMATCH');

        const forged = await app.inject({
          method: 'POST',
          url: '/v1/telegram/webhook',
          headers: { 'x-telegram-bot-api-secret-token': 'not-the-secret' },
          payload: update('Report the current system status.'),
        });
        assert.equal(forged.statusCode, 401);
        assert.equal(await height(app), before, 'a refused update must not touch memory');
        assert.equal(calls.length, 0, 'a refused update must not reach the Bot API');
      },
    );
  });

  it('runs the same loop and replies with the verdict it reached', async () => {
    const calls: FetchCall[] = [];
    const responses: unknown[] = [];
    await withApp(
      { telegramConfig: { botToken: TOKEN, webhookSecret: SECRET }, telegramFetch: recordingFetch({ ok: true, status: 200 }, calls) },
      async (app) => {
        const send = async (text: string) => {
          const response = await app.inject({ method: 'POST', url: '/v1/telegram/webhook', headers: SECRET_HEADER, payload: update(text) });
          responses.push(response.json());
          return response.json();
        };

        const scam = await send('Urgent guaranteed returns, send money today for 300% profit.');
        assert.equal(scam.status, 'DIVERGENT');
        assert.equal(scam.loop.shield.blocked, true);
        assert.equal(scam.telegram.delivered, true);
        assert.match(scam.telegram.reply, /^DIVERGENT · KAI Shield blocked this intent\./);

        const verified = await send('Report the current system status.');
        assert.equal(verified.status, 'VERIFIED');
        assert.equal(verified.chatAuthority, 'READ_ONLY');
        assert.match(verified.output, /LEDGER · height/);
        assert.match(verified.telegram.reply, /^VERIFIED\n/);

        const poem = await send('Write a poem about the ocean at midnight.');
        assert.equal(poem.status, 'NOT_EXECUTED');
        assert.equal(poem.reason, 'ELION_BOUNDED_EXECUTOR_HAS_NO_CAPABILITY_FOR_THIS_INTENT');
        assert.equal(poem.output, null);

        // A chat cannot upgrade itself to autonomous authority.
        const trade = await send('Buy 3 shares of the index fund now.');
        assert.equal(trade.chatAuthority, 'READ_ONLY');
        assert.equal(trade.status, 'NOT_EXECUTED');

        const empty = await app.inject({ method: 'POST', url: '/v1/telegram/webhook', headers: SECRET_HEADER, payload: { update_id: 2, message: { chat: { id: 42 } } } });
        assert.equal(empty.statusCode, 202);
        assert.equal(empty.json().reason, 'TELEGRAM_UPDATE_HAS_NO_TEXT_INTENT');

        // Replies went to the chat that asked, and only after a verdict existed.
        assert.equal(calls.length, 4);
        assert.ok(calls.every((call) => call.url === `https://api.telegram.org/bot${TOKEN}/sendMessage`));
        assert.ok(calls.every((call) => call.body.chat_id === 42));
        assert.deepEqual(calls.map((call) => String(call.body.text).split('\n')[0].split(' · ')[0]), ['DIVERGENT', 'VERIFIED', 'NOT_EXECUTED', 'NOT_EXECUTED']);

        // Σ admits only the verified drop, exactly as on /v1/execute.
        const sigma = (await app.inject({ method: 'GET', url: '/v1/execute/verified?limit=10' })).json();
        assert.equal(sigma.height, 1);
        assert.equal(sigma.entries[0].intent, 'Report the current system status.');

        // The credential never leaves the process.
        assert.ok(!JSON.stringify(responses).includes(TOKEN), 'the bot token must never appear in a response');
      },
    );
  });

  it('reports an undelivered reply instead of claiming delivery', async () => {
    const calls: FetchCall[] = [];
    await withApp(
      { telegramConfig: { botToken: TOKEN, webhookSecret: SECRET }, telegramFetch: recordingFetch({ ok: false, status: 502 }, calls) },
      async (app) => {
        const before = await height(app);
        const result = (await app.inject({
          method: 'POST',
          url: '/v1/telegram/webhook',
          headers: SECRET_HEADER,
          payload: update('Report the current system status.'),
        })).json();
        assert.equal(result.status, 'VERIFIED', 'the loop verdict is independent of delivery');
        assert.equal(result.telegram.delivered, false);
        assert.equal(result.telegram.error, 'TELEGRAM_SEND_FAILED_502');
        assert.equal(await height(app), before + 1, 'the drop is remembered even when the reply failed');
      },
    );
  });

  it('degrades a thrown send to TELEGRAM_SEND_FAILED', async () => {
    await withApp(
      { telegramConfig: { botToken: TOKEN, webhookSecret: SECRET }, telegramFetch: recordingFetch('throw', []) },
      async (app) => {
        const result = (await app.inject({
          method: 'POST',
          url: '/v1/telegram/webhook',
          headers: SECRET_HEADER,
          payload: update('Report the current system status.'),
        })).json();
        assert.equal(result.telegram.delivered, false);
        assert.equal(result.telegram.error, 'TELEGRAM_SEND_FAILED');
      },
    );
  });
});
