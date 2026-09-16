import crypto from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface OmegaSecurityOptions {
  signingKey?: string;
  enforceSignature?: boolean;
  maxClockSkewSeconds?: number;
}

/**
 * Generate cryptographic HMAC-SHA256 signature for an Ω API request.
 * Format: sha256=<hex_digest>
 * Payload canonicalization: `${timestamp}:${method.toUpperCase()}:${url}:${serializedBody}`
 */
export function generateOmegaSignature(
  signingKey: string,
  timestamp: string,
  method: string,
  url: string,
  body?: unknown
): string {
  const normalizedBody =
    body === undefined || body === null
      ? ''
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);

  const canonicalString = `${timestamp}:${method.toUpperCase()}:${url}:${normalizedBody}`;
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(canonicalString);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify cryptographic HMAC-SHA256 signature using constant-time comparison.
 */
export function verifyOmegaSignature(
  signingKey: string,
  timestamp: string,
  method: string,
  url: string,
  body: unknown,
  signatureHeader: string,
  maxClockSkewSeconds: number = 300
): { valid: boolean; reason?: string } {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return { valid: false, reason: 'MALFORMED_SIGNATURE_HEADER' };
  }

  // Clock-skew / replay protection
  const requestTime = new Date(timestamp).getTime();
  if (isNaN(requestTime)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP_HEADER' };
  }

  const now = Date.now();
  const skewSeconds = Math.abs(now - requestTime) / 1000;
  if (skewSeconds > maxClockSkewSeconds) {
    return { valid: false, reason: `CLOCK_SKEW_EXCEEDED: ${skewSeconds.toFixed(1)}s > ${maxClockSkewSeconds}s` };
  }

  const expectedSignature = generateOmegaSignature(signingKey, timestamp, method, url, body);

  const suppliedBytes = Buffer.from(signatureHeader);
  const expectedBytes = Buffer.from(expectedSignature);

  if (suppliedBytes.length !== expectedBytes.length) {
    return { valid: false, reason: 'SIGNATURE_LENGTH_MISMATCH' };
  }

  const matches = crypto.timingSafeEqual(suppliedBytes, expectedBytes);
  if (!matches) {
    return { valid: false, reason: 'SIGNATURE_VERIFICATION_FAILED' };
  }

  return { valid: true };
}

/**
 * Fastify preHandler hook for enforcing fail-closed signature verification on mutating endpoints.
 */
export function createOmegaSecurityHook(options: OmegaSecurityOptions = {}) {
  const signingKey =
    options.signingKey ??
    process.env.OMEGA_SIGNING_KEY ??
    (process.env.NODE_ENV !== 'production' ? 'dev-omega-companion-signing-key-default-2026' : undefined);
  const enforce =
    options.enforceSignature ??
    (process.env.OMEGA_AUTH_MODE === 'required' || process.env.OMEGA_ENFORCE_SIGNATURE === 'true');
  const maxSkew = options.maxClockSkewSeconds ?? 300;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Only guard mutating HTTP methods: POST, PUT, DELETE, PATCH
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method.toUpperCase());
    if (!isMutating) return;

    const signatureHeader = request.headers['x-omega-signature'] as string | undefined;
    const timestampHeader = request.headers['x-omega-timestamp'] as string | undefined;

    if (!signatureHeader) {
      if (enforce) {
        return reply.code(401).send({
          success: false,
          error: 'UNAUTHORIZED: X-Omega-Signature header is required for mutating operations.',
        });
      }
      return; // Permissive local dev mode when enforcement is off
    }

    if (!timestampHeader) {
      return reply.code(401).send({
        success: false,
        error: 'UNAUTHORIZED: X-Omega-Timestamp header is required when X-Omega-Signature is supplied.',
      });
    }

    if (!signingKey) {
      return reply.code(503).send({
        success: false,
        error: 'SERVICE_UNAVAILABLE: OMEGA_SIGNING_KEY not configured on server.',
      });
    }

    const verification = verifyOmegaSignature(
      signingKey,
      timestampHeader,
      request.method,
      request.url,
      request.body,
      signatureHeader,
      maxSkew
    );

    if (!verification.valid) {
      return reply.code(401).send({
        success: false,
        error: `UNAUTHORIZED_SIGNATURE: ${verification.reason}`,
      });
    }
  };
}
