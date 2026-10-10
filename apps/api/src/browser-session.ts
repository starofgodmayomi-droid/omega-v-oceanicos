import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export const BROWSER_SESSION_PATH = '/v1/auth/browser-session';
export const BROWSER_SESSION_LOGOUT_PATH = `${BROWSER_SESSION_PATH}/logout`;
export const BROWSER_SESSION_COOKIE = '__Host-omega-read-session';
export const BROWSER_SESSION_TTL_SECONDS = 15 * 60;

const MAX_ACTIVE_SESSIONS = 5_000;

type HeaderValue = string | string[] | undefined;
type BrowserSessionRequest = {
  headers: { cookie?: HeaderValue; origin?: HeaderValue; referer?: HeaderValue };
};
type JsonError = (reply: any, status: number, error: string) => unknown;

export interface BrowserReadSessionStore {
  createSession(): string | null;
  requestHasSession(request: BrowserSessionRequest): boolean;
  requestCanExchange(request: BrowserSessionRequest): boolean;
  revokeRequestSession(request: BrowserSessionRequest): boolean;
}

const firstHeaderValue = (header: HeaderValue): string | undefined =>
  Array.isArray(header) ? header[0] : header;

const cookieValue = (header: HeaderValue, name: string): string | undefined => {
  const raw = firstHeaderValue(header);
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim() || undefined;
  }
  return undefined;
};

const digestSessionId = (sessionId: string): string =>
  createHash('sha256').update(sessionId).digest('hex');

const bearerTokenMatches = (candidate: string | undefined, expected: string): boolean => {
  if (!candidate || !expected) return false;
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
};

export function createBrowserReadSessionStore(
  allowedOrigins: readonly string[],
  now: () => number = Date.now,
): BrowserReadSessionStore {
  const sessions = new Map<string, number>();

  const originAllowed = (request: BrowserSessionRequest): boolean => {
    const origin = firstHeaderValue(request.headers.origin);
    if (origin) return allowedOrigins.includes(origin);
    const referer = firstHeaderValue(request.headers.referer);
    if (!referer) return false;
    try {
      return allowedOrigins.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  };

  const activeSessionId = (request: BrowserSessionRequest): string | undefined => {
    const sessionId = cookieValue(request.headers.cookie, BROWSER_SESSION_COOKIE);
    if (!sessionId) return undefined;
    const digest = digestSessionId(sessionId);
    const expiresAt = sessions.get(digest);
    if (expiresAt === undefined) return undefined;
    if (expiresAt <= now()) {
      sessions.delete(digest);
      return undefined;
    }
    return sessionId;
  };

  return {
    createSession() {
      const currentTime = now();
      for (const [digest, expiresAt] of sessions) {
        if (expiresAt <= currentTime) sessions.delete(digest);
      }
      if (sessions.size >= MAX_ACTIVE_SESSIONS) return null;
      const sessionId = randomBytes(32).toString('base64url');
      sessions.set(digestSessionId(sessionId), currentTime + BROWSER_SESSION_TTL_SECONDS * 1000);
      return sessionId;
    },
    requestHasSession(request) {
      return originAllowed(request) && activeSessionId(request) !== undefined;
    },
    requestCanExchange(request) {
      return originAllowed(request);
    },
    revokeRequestSession(request) {
      const sessionId = activeSessionId(request);
      if (!sessionId) return false;
      return sessions.delete(digestSessionId(sessionId));
    },
  };
}

export function registerBrowserReadSessionRoutes(
  fastify: FastifyInstance,
  options: {
    authMode: 'local' | 'required';
    readToken: string;
    sessions: BrowserReadSessionStore;
    jsonError: JsonError;
  },
): void {
  fastify.post(BROWSER_SESSION_PATH, {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request: any, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (options.authMode !== 'required') {
      return options.jsonError(reply, 404, 'BROWSER_SESSION_REQUIRES_REQUIRED_AUTH');
    }
    if (!options.sessions.requestCanExchange(request)) {
      return options.jsonError(reply, 403, 'BROWSER_SESSION_ORIGIN_NOT_ALLOWED');
    }
    const authorization = typeof request.headers.authorization === 'string'
      ? request.headers.authorization
      : undefined;
    const candidate = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    if (!bearerTokenMatches(candidate, options.readToken)) {
      return options.jsonError(reply, 401, 'READ_ACCESS_REQUIRED');
    }

    const sessionId = options.sessions.createSession();
    if (!sessionId) return options.jsonError(reply, 503, 'BROWSER_SESSION_CAPACITY_REACHED');
    reply.header(
      'Set-Cookie',
      `${BROWSER_SESSION_COOKIE}=${sessionId}; Max-Age=${BROWSER_SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=None`,
    );
    return reply.code(201).send({ success: true, expiresInSeconds: BROWSER_SESSION_TTL_SECONDS });
  });

  fastify.post(BROWSER_SESSION_LOGOUT_PATH, {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request: any, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (options.authMode !== 'required') {
      return options.jsonError(reply, 404, 'BROWSER_SESSION_REQUIRES_REQUIRED_AUTH');
    }
    if (!options.sessions.requestCanExchange(request)) {
      return options.jsonError(reply, 403, 'BROWSER_SESSION_ORIGIN_NOT_ALLOWED');
    }
    if (!options.sessions.revokeRequestSession(request)) {
      return options.jsonError(reply, 401, 'BROWSER_SESSION_REQUIRED');
    }
    reply.header(
      'Set-Cookie',
      `${BROWSER_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None`,
    );
    return reply.code(204).send();
  });
}
