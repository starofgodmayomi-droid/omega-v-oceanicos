/**
 * Request signature verification using HMAC-based signatures
 * Enables cryptographically secure request verification and non-repudiation
 */

import crypto from 'crypto';

export interface SignatureConfig {
  algorithm?: 'sha256' | 'sha512';
  includedHeaders?: string[];
  clockSkew?: number;
}

export interface SignatureVerifyResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
  signatureAge?: number;
}

export interface RequestSignatureOptions {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | Buffer;
  timestamp?: number;
}

/**
 * Sign a request using HMAC
 */
export class RequestSignature {
  private algorithm: 'sha256' | 'sha512';
  private includedHeaders: Set<string>;
  private clockSkew: number;

  constructor(config: SignatureConfig = {}) {
    this.algorithm = config.algorithm || 'sha256';
    this.includedHeaders = new Set(
      config.includedHeaders || ['content-type', 'x-api-version'],
    );
    this.clockSkew = config.clockSkew || 300000; // 5 minutes default
  }

  /**
   * Sign a request with a secret key
   */
  signRequest(
    secret: string,
    options: RequestSignatureOptions,
  ): {
    signature: string;
    timestamp: number;
    signatureHeader: string;
  } {
    const timestamp = options.timestamp || Date.now();
    const body = this.normalizeBody(options.body);

    const signatureData = this.buildSignatureString(
      options.method,
      options.path,
      options.headers,
      body,
      timestamp,
    );

    const signature = crypto
      .createHmac(this.algorithm, secret)
      .update(signatureData)
      .digest('hex');

    const signatureHeader = `hmac-${this.algorithm}=${signature},timestamp=${timestamp}`;

    return {
      signature,
      timestamp,
      signatureHeader,
    };
  }

  /**
   * Verify a request signature
   */
  verifyRequest(
    secret: string,
    options: RequestSignatureOptions,
    signatureHeader: string,
  ): SignatureVerifyResult {
    const parsed = this.parseSignatureHeader(signatureHeader);

    if (!parsed) {
      return {
        valid: false,
        error: 'Invalid signature header format',
      };
    }

    const { signature: providedSignature, timestamp } = parsed;

    // Check timestamp freshness
    const now = Date.now();
    const signatureAge = now - timestamp;

    if (Math.abs(signatureAge) > this.clockSkew) {
      return {
        valid: false,
        error: 'Request timestamp too old or in the future',
        timestamp,
        signatureAge,
      };
    }

    // Recalculate signature
    const body = this.normalizeBody(options.body);
    const signatureData = this.buildSignatureString(
      options.method,
      options.path,
      options.headers,
      body,
      timestamp,
    );

    const expectedSignature = crypto
      .createHmac(this.algorithm, secret)
      .update(signatureData)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    let valid = false;
    try {
      valid = crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature),
      );
    } catch {
      // timingSafeEqual throws if buffers have different lengths
      valid = false;
    }

    return {
      valid,
      timestamp,
      signatureAge,
    };
  }

  /**
   * Build the signature string from request components
   */
  private buildSignatureString(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string,
    timestamp: number,
  ): string {
    const parts: string[] = [
      method.toUpperCase(),
      path,
      timestamp.toString(),
    ];

    // Include selected headers in signature
    const selectedHeaders = this.selectHeaders(headers);
    for (const [key, value] of Object.entries(selectedHeaders)) {
      parts.push(`${key}=${value}`);
    }

    // Include body hash
    const bodyHash = crypto
      .createHash(this.algorithm)
      .update(body)
      .digest('hex');
    parts.push(`body=${bodyHash}`);

    return parts.join('\n');
  }

  /**
   * Select headers to include in signature
   */
  private selectHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const selected: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (this.includedHeaders.has(lowerKey)) {
        selected[lowerKey] = value;
      }
    }

    return selected;
  }

  /**
   * Parse signature header
   */
  private parseSignatureHeader(
    header: string,
  ): { signature: string; timestamp: number } | null {
    try {
      const parts = header.split(',');
      let signature: string | undefined;
      let timestamp: number | undefined;

      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === `hmac-${this.algorithm}`) {
          signature = value;
        } else if (key === 'timestamp') {
          timestamp = parseInt(value, 10);
        }
      }

      if (!signature || !timestamp) {
        return null;
      }

      return { signature, timestamp };
    } catch {
      return null;
    }
  }

  /**
   * Normalize request body
   */
  private normalizeBody(body: string | Buffer): string {
    if (typeof body === 'string') {
      return body;
    }
    return body.toString('utf-8');
  }
}

/**
 * Webhook signature verification for GitHub, Stripe, etc.
 */
export class WebhookSignature {
  /**
   * Verify GitHub webhook signature
   */
  static verifyGitHub(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedSignature = `sha256=${hmac}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Verify Stripe webhook signature
   */
  static verifyStripe(
    body: string,
    signature: string,
    secret: string,
    tolerance: number = 300, // 5 minutes
  ): boolean {
    try {
      const parts = signature.split(',');
      if (parts.length === 0) return false;

      const tPart = parts[0].split('=')[1];
      const vPart = parts.find((p) => p.startsWith('v1='));

      if (!tPart || !vPart) return false;

      const timestamp = tPart;
      const hash = vPart.split('=')[1];

      // Check timestamp freshness
      const now = Math.floor(Date.now() / 1000);
      const requestTs = parseInt(timestamp, 10);

      if (Math.abs(now - requestTs) > tolerance) {
        return false;
      }

      // Verify signature
      const signedContent = `${timestamp}.${body}`;
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(expectedHash),
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate Stripe-compatible signature
   */
  static signStripe(payload: string, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedContent = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    return `t=${timestamp},${signature}`;
  }

  /**
   * Verify generic HMAC signature
   */
  static verifyHMAC(
    payload: string | Buffer,
    signature: string,
    secret: string,
    algorithm: string = 'sha256',
  ): boolean {
    const hmac = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hmac),
    );
  }

  /**
   * Generate generic HMAC signature
   */
  static signHMAC(
    payload: string | Buffer,
    secret: string,
    algorithm: string = 'sha256',
  ): string {
    return crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
  }
}

/**
 * Request signing helper for outbound API calls
 */
export class OutboundRequestSigner {
  private signer: RequestSignature;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string, config?: SignatureConfig) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.signer = new RequestSignature(config);
  }

  /**
   * Sign headers for outbound request
   */
  signHeaders(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string | Buffer = '',
  ): Record<string, string> {
    const signResult = this.signer.signRequest(this.apiSecret, {
      method,
      path,
      headers,
      body,
    });

    return {
      ...headers,
      'X-API-Key': this.apiKey,
      'X-Signature': signResult.signatureHeader,
      'X-Timestamp': signResult.timestamp.toString(),
    };
  }

  /**
   * Create complete signed request object
   */
  createSignedRequest(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body: string | Buffer = '',
  ): {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: string | Buffer;
  } {
    const signedHeaders = this.signHeaders(method, path, headers, body);

    return {
      method,
      path,
      headers: signedHeaders,
      body,
    };
  }
}
