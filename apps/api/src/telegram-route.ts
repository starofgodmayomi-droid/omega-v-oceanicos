/**
 * Ω∞v Telegram intake — the same bounded loop, reached from a chat.
 *
 *   GET  /v1/telegram/status   whether intake is configured (never the credential)
 *   POST /v1/telegram/webhook  Telegram update → KAI/ELION loop → reply in the same chat
 *
 * Laws enforced here:
 *   - NO TOKEN, NO INTAKE. Without TELEGRAM_BOT_TOKEN every update halts
 *     NOT_EXECUTED before ELION is reached, and nothing is written to KAI memory.
 *   - NO SECRET, NO INTAKE. A webhook that cannot prove it came from Telegram is
 *     refused, because an unauthenticated one could plant intents in KAI memory
 *     and make the body speak in someone else's chat.
 *   - CHAT ≠ AUTHORITY. A message always arrives with READ_ONLY authority; it can
 *     never ask the loop for AUTONOMOUS and never reaches an irreversible action.
 *   - DELIVERY IS OBSERVED. `delivered` is what the Bot API answered, not intent.
 */
import type { FastifyInstance } from 'fastify';
import { requireIntent, runExecuteLoop, type ExecuteEvidenceReader } from './execute-route.js';
import type { FileKaiMemoryStore } from './kai-memory.js';
import type { FileKaiVerifiedStore } from './kai-verified-memory.js';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

export const TELEGRAM_API_BASE = 'https://api.telegram.org';

const MAX_REPLY_LENGTH = 4000;

const LIMITATION =
  'Telegram intake reaches the same bounded executor as /v1/execute. A reply is what the Bot API answered, not proof of delivery to a human, and this sandbox has no deployment.';

export interface TelegramIntakeConfig {
  readonly botToken?: string;
  readonly webhookSecret?: string;
}

export interface TelegramRouteOptions {
  readonly store: FileKaiMemoryStore;
  readonly readEvidence?: ExecuteEvidenceReader;
  readonly verifiedStore?: FileKaiVerifiedStore;
  readonly config?: TelegramIntakeConfig;
  readonly telegramFetch?: typeof fetch;
}

export interface TelegramIntakeStatus {
  readonly intake: 'CONFIGURED' | 'UNCONFIGURED';
  readonly botToken: 'CONFIGURED' | 'MISSING';
  readonly webhookSecret: 'CONFIGURED' | 'MISSING';
}

/** Presence only. The credential is never echoed, hashed, or returned. */
export function telegramIntakeStatus(config: TelegramIntakeConfig = {}): TelegramIntakeStatus {
  const botToken = config.botToken?.trim() ? 'CONFIGURED' : 'MISSING';
  const webhookSecret = config.webhookSecret?.trim() ? 'CONFIGURED' : 'MISSING';
  return {
    intake: botToken === 'CONFIGURED' && webhookSecret === 'CONFIGURED' ? 'CONFIGURED' : 'UNCONFIGURED',
    botToken,
    webhookSecret,
  };
}

function parseObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** What the chat is told. The verdict first, then only what was observed. */
export function composeTelegramReply(payload: Record<string, unknown>): string {
  const status = typeof payload.status === 'string' ? payload.status : 'UNKNOWN';
  const reason = typeof payload.reason === 'string' ? payload.reason : null;
  const output = typeof payload.output === 'string' ? payload.output : null;
  const body = output ?? 'Nothing was observed, so nothing is claimed as done.';
  return `${status}${reason ? ` · ${reason}` : ''}\n\n${body}`.slice(0, MAX_REPLY_LENGTH);
}

async function deliver(
  fetchImpl: typeof fetch,
  botToken: string,
  chatId: number | string,
  text: string,
): Promise<{ delivered: boolean; error: string | null }> {
  try {
    const response = await fetchImpl(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!response.ok) return { delivered: false, error: `TELEGRAM_SEND_FAILED_${response.status}` };
    return { delivered: true, error: null };
  } catch {
    return { delivered: false, error: 'TELEGRAM_SEND_FAILED' };
  }
}

export function registerTelegramRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  options: TelegramRouteOptions,
): void {
  const config = options.config ?? {};

  fastify.get('/v1/telegram/status', async () => {
    const status = telegramIntakeStatus(config);
    return {
      success: true,
      contract: 'omega.telegram.intake.v1',
      intake: status.intake,
      credentials: { botToken: status.botToken, webhookSecret: status.webhookSecret },
      webhookPath: '/v1/telegram/webhook',
      chatAuthority: 'READ_ONLY',
      executor: 'ELION_BOUNDED_OBSERVED_STATE',
      limitation: LIMITATION,
    };
  });

  fastify.post('/v1/telegram/webhook', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request: any, reply) => {
    const botToken = config.botToken?.trim() ?? '';
    const webhookSecret = config.webhookSecret?.trim() ?? '';

    // FAIL CLOSED — no credential, no intake, and no memory write.
    if (!botToken) {
      return reply.status(503).send({
        success: false,
        status: 'NOT_EXECUTED',
        error: 'TELEGRAM_INTAKE_NOT_CONFIGURED',
        reason: 'TELEGRAM_BOT_TOKEN_MISSING',
        intake: 'UNCONFIGURED',
        remembered: false,
        limitation: LIMITATION,
      });
    }
    if (!webhookSecret) return jsonError(reply, 503, 'TELEGRAM_WEBHOOK_SECRET_NOT_CONFIGURED');
    const supplied = String(request.headers['x-telegram-bot-api-secret-token'] ?? '');
    if (supplied !== webhookSecret) return jsonError(reply, 401, 'TELEGRAM_WEBHOOK_SECRET_MISMATCH');

    const update = parseObject(request.body);
    const message = parseObject(update?.message);
    const chat = parseObject(message?.chat);
    const chatId = typeof chat?.id === 'number' || typeof chat?.id === 'string' ? chat.id : null;
    let intent: string;
    try {
      intent = requireIntent(message?.text);
    } catch {
      // An update without a text intent is preserved as not executed.
      return reply.status(202).send({
        success: true,
        status: 'NOT_EXECUTED',
        reason: 'TELEGRAM_UPDATE_HAS_NO_TEXT_INTENT',
        intake: 'CONFIGURED',
        remembered: false,
        limitation: LIMITATION,
      });
    }
    if (chatId === null) return jsonError(reply, 400, 'TELEGRAM_UPDATE_HAS_NO_CHAT');
    if (!options.store.verifyIntegrity()) return jsonError(reply, 503, 'KAI_MEMORY_INTEGRITY_DEGRADED');

    // A chat message never carries more than READ_ONLY authority.
    const result = runExecuteLoop(
      { intent, authorityLevel: 'READ_ONLY' },
      { store: options.store, readEvidence: options.readEvidence, verifiedStore: options.verifiedStore },
    );
    const text = composeTelegramReply(result.payload);
    const delivery = await deliver(options.telegramFetch ?? fetch, botToken, chatId, text);

    return reply.status(result.httpStatus).send({
      success: true,
      contract: 'omega.telegram.intake.v1',
      intake: 'CONFIGURED',
      chatAuthority: 'READ_ONLY',
      status: result.payload.status,
      reason: result.payload.reason ?? null,
      output: result.payload.output ?? null,
      telegram: { chatId, delivered: delivery.delivered, error: delivery.error, reply: text },
      loop: result.payload,
      limitation: LIMITATION,
    });
  });
}
