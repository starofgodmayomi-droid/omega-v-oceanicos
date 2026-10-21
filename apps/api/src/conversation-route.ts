import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

type JsonError = (reply: any, status: number, error: string, extra?: Record<string, unknown>) => unknown;

const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES = 32;
const MAX_CONTENT_CHARS = 4_000;
const MAX_TITLE_CHARS = 120;

export interface ConversationTranscriptMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface ConversationModelRequest {
  readonly conversationId: string;
  readonly messages: readonly ConversationTranscriptMessage[];
}

export interface ConversationModelResult {
  readonly content: string;
}

/** Server-owned model adapter. Request bodies cannot supply this function. */
export type ConversationModel = (
  input: ConversationModelRequest,
) => ConversationModelResult | Promise<ConversationModelResult>;

interface StoredMessage extends ConversationTranscriptMessage {
  readonly id: string;
  readonly at: string;
  readonly origin: 'user' | 'model-provider';
  readonly verified: false;
  readonly executed: false;
}

interface StoredConversation {
  readonly id: string;
  readonly title: string | null;
  readonly createdAt: string;
  readonly messages: StoredMessage[];
}

const LIMITATION =
  'in-memory conversation record is not durable, not command execution, not verification, and not a model reply unless a server-side provider is configured';

function parseObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) return null;
  return text;
}

export function registerConversationRoute(
  fastify: FastifyInstance,
  jsonError: JsonError,
  model?: ConversationModel,
): void {
  const conversations = new Map<string, StoredConversation>();

  const snapshot = (conversation: StoredConversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    messageCount: conversation.messages.length,
    messages: conversation.messages,
    limitation: LIMITATION,
  });

  fastify.post('/v1/conversations', async (request, reply) => {
    const body = parseObject(request.body) ?? {};
    if (request.body !== undefined && request.body !== null && !parseObject(request.body)) {
      return jsonError(reply, 400, 'INVALID_CONVERSATION');
    }
    if (Object.keys(body).some((field) => field !== 'title')) {
      return jsonError(reply, 400, 'CONVERSATION_CONTROL_NOT_ACCEPTED');
    }
    let title: string | null = null;
    if (body.title !== undefined) {
      title = boundedText(body.title, MAX_TITLE_CHARS);
      if (!title) return jsonError(reply, 400, 'INVALID_CONVERSATION_TITLE');
    }
    if (conversations.size >= MAX_CONVERSATIONS) {
      return jsonError(reply, 503, 'CONVERSATION_CAPACITY_EXHAUSTED');
    }
    const conversation: StoredConversation = {
      id: `conv-${randomUUID()}`,
      title,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    conversations.set(conversation.id, conversation);
    return reply.status(201).send({
      success: true,
      conversation: snapshot(conversation),
      modelConfigured: Boolean(model),
      executed: false,
    });
  });

  fastify.get('/v1/conversations/:id', async (request, reply) => {
    const id = (request.params as { id?: string }).id ?? '';
    const conversation = conversations.get(id);
    if (!conversation) return jsonError(reply, 404, 'CONVERSATION_NOT_FOUND');
    return { success: true, conversation: snapshot(conversation), executed: false };
  });

  fastify.post('/v1/conversations/:id/messages', async (request, reply) => {
    const id = (request.params as { id?: string }).id ?? '';
    const conversation = conversations.get(id);
    if (!conversation) return jsonError(reply, 404, 'CONVERSATION_NOT_FOUND');
    const body = parseObject(request.body);
    if (!body) return jsonError(reply, 400, 'INVALID_CONVERSATION_MESSAGE');
    if (Object.keys(body).some((field) => field !== 'content')) {
      return jsonError(reply, 400, 'CONVERSATION_CONTROL_NOT_ACCEPTED');
    }
    const content = boundedText(body.content, MAX_CONTENT_CHARS);
    if (!content) return jsonError(reply, 400, 'INVALID_CONVERSATION_MESSAGE');
    if (conversation.messages.length >= MAX_MESSAGES) {
      return jsonError(reply, 409, 'CONVERSATION_MESSAGE_LIMIT');
    }

    const userMessage: StoredMessage = {
      id: `msg-${randomUUID()}`,
      role: 'user',
      content,
      at: new Date().toISOString(),
      origin: 'user',
      verified: false,
      executed: false,
    };
    conversation.messages.push(userMessage);

    if (!model) {
      return {
        success: true,
        conversation: snapshot(conversation),
        completion: {
          status: 'NOT_EXECUTED',
          verified: false,
          executed: false,
          commandCreated: false,
          reason: 'MODEL_PROVIDER_UNAVAILABLE',
        },
      };
    }

    let completion: ConversationModelResult;
    try {
      completion = await model({
        conversationId: conversation.id,
        messages: conversation.messages.map((message) => ({ role: message.role, content: message.content })),
      });
    } catch {
      return {
        success: true,
        conversation: snapshot(conversation),
        completion: {
          status: 'FAILED',
          verified: false,
          executed: false,
          commandCreated: false,
          reason: 'MODEL_PROVIDER_FAILED',
        },
      };
    }

    const assistantContent = boundedText(completion?.content, MAX_CONTENT_CHARS);
    if (!assistantContent) {
      return {
        success: true,
        conversation: snapshot(conversation),
        completion: {
          status: 'FAILED',
          verified: false,
          executed: false,
          commandCreated: false,
          reason: 'MODEL_OUTPUT_REJECTED',
        },
      };
    }

    conversation.messages.push({
      id: `msg-${randomUUID()}`,
      role: 'assistant',
      content: assistantContent,
      at: new Date().toISOString(),
      origin: 'model-provider',
      verified: false,
      executed: false,
    });
    return {
      success: true,
      conversation: snapshot(conversation),
      completion: {
        status: 'MODEL_OUTPUT',
        verified: false,
        executed: false,
        commandCreated: false,
      },
    };
  });
}
