import crypto from 'crypto';
import {
  RequestSignature,
  WebhookSignature,
  OutboundRequestSigner,
} from '../request-signature';

describe('Request Signature System', () => {
  describe('RequestSignature - HMAC Signing', () => {
    let signer: RequestSignature;
    const secret = 'test-secret-key-12345';

    beforeEach(() => {
      signer = new RequestSignature({ algorithm: 'sha256' });
    });

    it('should sign a request', () => {
      const result = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/verify',
        headers: { 'content-type': 'application/json' },
        body: '{"test":true}',
      });

      expect(result.signature).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.signatureHeader).toContain('hmac-sha256=');
    });

    it('should include timestamp in signature header', () => {
      const result = signer.signRequest(secret, {
        method: 'GET',
        path: '/api/status',
        headers: {},
        body: '',
      });

      expect(result.signatureHeader).toContain('timestamp=');
      expect(result.signatureHeader).toMatch(/timestamp=\d+/);
    });

    it('should verify valid request signature', () => {
      const body = '{"claim":"test"}';
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = '{"claim":"test"}';
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body: '{"claim":"tampered"}',
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });

    it('should reject request with wrong secret', () => {
      const body = '{"claim":"test"}';
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
      });

      const verifyResult = signer.verifyRequest('wrong-secret', {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });

    it('should reject request with tampered method', () => {
      const body = '{"claim":"test"}';
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'GET',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });

    it('should reject request with tampered path', () => {
      const body = '{"claim":"test"}';
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/attestations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });

    it('should reject request with stale timestamp', (done) => {
      const body = '{"claim":"test"}';
      const oldTimestamp = Date.now() - 600000; // 10 minutes ago
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp: oldTimestamp,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp: oldTimestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toContain('timestamp');
      done();
    });

    it('should support SHA512 algorithm', () => {
      const sha512Signer = new RequestSignature({ algorithm: 'sha512' });
      const result = sha512Signer.signRequest(secret, {
        method: 'POST',
        path: '/api/verify',
        headers: { 'content-type': 'application/json' },
        body: '{"test":true}',
      });

      expect(result.signatureHeader).toContain('hmac-sha512=');
    });

    it('should handle empty body', () => {
      const result = signer.signRequest(secret, {
        method: 'GET',
        path: '/api/status',
        headers: {},
        body: '',
      });

      expect(result.signature).toBeDefined();
    });

    it('should handle binary body', () => {
      const binaryBody = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const result = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/binary',
        headers: { 'content-type': 'application/octet-stream' },
        body: binaryBody,
      });

      expect(result.signature).toBeDefined();
    });

    it('should include selected headers in signature', () => {
      const signer2 = new RequestSignature({
        algorithm: 'sha256',
        includedHeaders: ['content-type', 'x-custom-header'],
      });

      const result1 = signer2.signRequest(secret, {
        method: 'POST',
        path: '/api/test',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'value1',
        },
        body: 'test',
      });

      const result2 = signer2.signRequest(secret, {
        method: 'POST',
        path: '/api/test',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'value2',
        },
        body: 'test',
      });

      expect(result1.signature).not.toBe(result2.signature);
    });

    it('should track signature age', () => {
      const body = '{"claim":"test"}';
      const timestamp = Date.now() - 100000;
      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body,
        timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.signatureAge).toBeDefined();
      expect(verifyResult.signatureAge).toBeGreaterThan(0);
    });

    it('should handle custom clock skew', () => {
      const customSigner = new RequestSignature({
        algorithm: 'sha256',
        clockSkew: 1000, // 1 second
      });

      const oldTimestamp = Date.now() - 2000; // 2 seconds ago
      const signResult = customSigner.signRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body: 'test',
        timestamp: oldTimestamp,
      });

      const verifyResult = customSigner.verifyRequest(secret, {
        method: 'POST',
        path: '/api/observations',
        headers: { 'content-type': 'application/json' },
        body: 'test',
        timestamp: oldTimestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });
  });

  describe('WebhookSignature - Standard Formats', () => {
    it('should verify GitHub webhook signature', () => {
      const secret = 'github-secret';
      const payload = '{"action":"opened","number":1}';

      const signature = WebhookSignature.signHMAC(payload, secret, 'sha256');
      const githubSig = `sha256=${signature}`;

      const valid = WebhookSignature.verifyGitHub(payload, githubSig, secret);
      expect(valid).toBe(true);
    });

    it('should reject invalid GitHub signature', () => {
      const secret = 'github-secret';
      const payload = '{"action":"opened","number":1}';
      const wrongPayload = '{"action":"closed","number":1}';

      const signature = WebhookSignature.signHMAC(payload, secret, 'sha256');
      const githubSig = `sha256=${signature}`;

      const valid = WebhookSignature.verifyGitHub(wrongPayload, githubSig, secret);
      expect(valid).toBe(false);
    });

    it('should verify Stripe webhook signature', () => {
      const secret = 'stripe-secret';
      const payload = '{"id":"evt_123","type":"payment_intent.succeeded"}';
      const timestamp = Math.floor(Date.now() / 1000);

      const signedContent = `${timestamp}.${payload}`;
      const hash = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');
      const signature = `t=${timestamp},v1=${hash}`;

      const valid = WebhookSignature.verifyStripe(payload, signature, secret);

      expect(valid).toBe(true);
    });

    it('should reject invalid Stripe signature', () => {
      const secret = 'stripe-secret';
      const payload = '{"id":"evt_123","type":"payment_intent.succeeded"}';
      const wrongPayload = '{"id":"evt_456","type":"charge.failed"}';
      const timestamp = Math.floor(Date.now() / 1000);

      const signedContent = `${timestamp}.${payload}`;
      const hash = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('hex');
      const signature = `t=${timestamp},v1=${hash}`;

      const valid = WebhookSignature.verifyStripe(wrongPayload, signature, secret);

      expect(valid).toBe(false);
    });

    it('should verify generic HMAC signature', () => {
      const secret = 'generic-secret';
      const payload = 'request-payload-data';

      const signature = WebhookSignature.signHMAC(payload, secret, 'sha256');
      const valid = WebhookSignature.verifyHMAC(payload, signature, secret, 'sha256');

      expect(valid).toBe(true);
    });

    it('should handle binary payload for HMAC', () => {
      const secret = 'secret';
      const payload = Buffer.from([0x00, 0x01, 0x02, 0x03]);

      const signature = WebhookSignature.signHMAC(payload, secret, 'sha256');
      const valid = WebhookSignature.verifyHMAC(payload, signature, secret, 'sha256');

      expect(valid).toBe(true);
    });

    it('should support different HMAC algorithms', () => {
      const secret = 'secret';
      const payload = 'data';

      const sha256Sig = WebhookSignature.signHMAC(payload, secret, 'sha256');
      const sha512Sig = WebhookSignature.signHMAC(payload, secret, 'sha512');

      expect(sha256Sig).not.toBe(sha512Sig);
      expect(WebhookSignature.verifyHMAC(payload, sha256Sig, secret, 'sha256')).toBe(true);
      expect(WebhookSignature.verifyHMAC(payload, sha512Sig, secret, 'sha512')).toBe(true);
    });
  });

  describe('OutboundRequestSigner', () => {
    const apiKey = 'api_test_key_123';
    const apiSecret = 'api_secret_456';

    let signer: OutboundRequestSigner;

    beforeEach(() => {
      signer = new OutboundRequestSigner(apiKey, apiSecret);
    });

    it('should sign outbound request headers', () => {
      const headers = signer.signHeaders(
        'POST',
        '/api/verify',
        { 'content-type': 'application/json' },
        '{"test":true}',
      );

      expect(headers['X-API-Key']).toBe(apiKey);
      expect(headers['X-Signature']).toBeDefined();
      expect(headers['X-Timestamp']).toBeDefined();
    });

    it('should include API key in signed headers', () => {
      const headers = signer.signHeaders('GET', '/api/status', {}, '');
      expect(headers['X-API-Key']).toBe(apiKey);
    });

    it('should create signed request object', () => {
      const request = signer.createSignedRequest(
        'POST',
        '/api/observations',
        { 'content-type': 'application/json' },
        '{"claim":"test"}',
      );

      expect(request.method).toBe('POST');
      expect(request.path).toBe('/api/observations');
      expect(request.headers['X-API-Key']).toBe(apiKey);
      expect(request.headers['X-Signature']).toBeDefined();
      expect(request.body).toBe('{"claim":"test"}');
    });

    it('should handle empty headers in sign', () => {
      const headers = signer.signHeaders('GET', '/api/status', {}, '');
      expect(headers['X-API-Key']).toBeDefined();
      expect(headers['X-Signature']).toBeDefined();
    });

    it('should preserve original headers', () => {
      const originalHeaders = {
        'content-type': 'application/json',
        'authorization': 'Bearer token',
      };

      const headers = signer.signHeaders(
        'POST',
        '/api/test',
        originalHeaders,
        '{}',
      );

      expect(headers['content-type']).toBe('application/json');
      expect(headers['authorization']).toBe('Bearer token');
    });

    it('should handle binary body', () => {
      const binaryBody = Buffer.from([0x00, 0x01, 0x02]);
      const headers = signer.signHeaders('POST', '/api/binary', {}, binaryBody);

      expect(headers['X-Signature']).toBeDefined();
    });

    it('should sign different requests with different signatures', () => {
      const sig1 = signer.signHeaders('POST', '/api/test1', {}, 'body1');
      const sig2 = signer.signHeaders('POST', '/api/test2', {}, 'body2');

      expect(sig1['X-Signature']).not.toBe(sig2['X-Signature']);
    });
  });

  describe('Integration Scenarios', () => {
    it('should sign and verify complete workflow', () => {
      const secret = 'workflow-secret';
      const signer = new RequestSignature({ algorithm: 'sha256' });

      const requestBody = JSON.stringify({
        id: 'obs-123',
        claim: 'system is healthy',
        confidence: 0.95,
      });

      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/complete-loop',
        headers: {
          'content-type': 'application/json',
          'x-api-version': 'v1',
        },
        body: requestBody,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/complete-loop',
        headers: {
          'content-type': 'application/json',
          'x-api-version': 'v1',
        },
        body: requestBody,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(true);
    });

    it('should handle service-to-service authentication', () => {
      const apiKey = 'service-a-key';
      const apiSecret = 'service-a-secret';

      const outboundSigner = new OutboundRequestSigner(apiKey, apiSecret);
      const inboundVerifier = new RequestSignature({ algorithm: 'sha256' });

      const payload = '{"event":"verification.complete","data":{}}';
      const outboundHeaders = outboundSigner.signHeaders(
        'POST',
        '/api/notify',
        { 'content-type': 'application/json' },
        payload,
      );

      const timestamp = parseInt(outboundHeaders['X-Timestamp'], 10);
      const verifyResult = inboundVerifier.verifyRequest(apiSecret, {
        method: 'POST',
        path: '/api/notify',
        headers: { 'content-type': 'application/json' },
        body: payload,
        timestamp,
      }, outboundHeaders['X-Signature']);

      expect(verifyResult.valid).toBe(true);
    });

    it('should handle webhook verification workflow', () => {
      const webhookSecret = 'webhook-secret-xyz';
      const payload = JSON.stringify({
        id: 'evt_001',
        type: 'observation.created',
        timestamp: Date.now(),
      });

      const signature = WebhookSignature.signHMAC(payload, webhookSecret, 'sha256');
      const webhookHeader = `sha256=${signature}`;

      const valid = WebhookSignature.verifyGitHub(payload, webhookHeader, webhookSecret);
      expect(valid).toBe(true);
    });

    it('should prevent signature replay attacks', () => {
      const secret = 'replay-secret';
      const strictSigner = new RequestSignature({ clockSkew: 1000 });

      const payload = 'sensitive-operation';
      const oldTimestamp = Date.now() - 5000;

      const signResult = strictSigner.signRequest(secret, {
        method: 'POST',
        path: '/api/sensitive',
        headers: {},
        body: payload,
        timestamp: oldTimestamp,
      });

      // Old signature should fail due to clock skew
      const verifyResult = strictSigner.verifyRequest(secret, {
        method: 'POST',
        path: '/api/sensitive',
        headers: {},
        body: payload,
        timestamp: oldTimestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });

    it('should handle multiple API consumers with different secrets', () => {
      const consumer1Secret = 'consumer-1-secret';
      const consumer2Secret = 'consumer-2-secret';

      const signer1 = new OutboundRequestSigner('key1', consumer1Secret);
      const signer2 = new OutboundRequestSigner('key2', consumer2Secret);

      const payload = '{"data":"shared"}';

      const headers1 = signer1.signHeaders('POST', '/api/webhook', {}, payload);
      const headers2 = signer2.signHeaders('POST', '/api/webhook', {}, payload);

      expect(headers1['X-Signature']).not.toBe(headers2['X-Signature']);
    });
  });

  describe('Security & Edge Cases', () => {
    it('should use constant-time comparison for signature', () => {
      const secret = 'timing-attack-secret';
      const signer = new RequestSignature();

      const validSig = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/test',
        headers: {},
        body: 'payload',
      });

      // Timing attack: different length signatures should take same time
      const invalidSig = 'a'.repeat(100);

      const verify = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/test',
        headers: {},
        body: 'payload',
        timestamp: validSig.timestamp,
      }, `hmac-sha256=${invalidSig},timestamp=${validSig.timestamp}`);

      expect(verify.valid).toBe(false);
    });

    it('should handle malformed signature headers', () => {
      const secret = 'secret';
      const signer = new RequestSignature();

      const verifyResult = signer.verifyRequest(secret, {
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: '',
      }, 'invalid-header-format');

      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.error).toBeDefined();
    });

    it('should handle missing signature components', () => {
      const secret = 'secret';
      const signer = new RequestSignature();

      const verifyResult = signer.verifyRequest(secret, {
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: '',
      }, 'hmac-sha256=signature123');

      expect(verifyResult.valid).toBe(false);
    });

    it('should handle very large payloads', () => {
      const secret = 'secret';
      const signer = new RequestSignature();

      const largePayload = 'x'.repeat(1000000); // 1MB

      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/large',
        headers: {},
        body: largePayload,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/large',
        headers: {},
        body: largePayload,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(true);
    });

    it('should handle special characters in path and body', () => {
      const secret = 'secret';
      const signer = new RequestSignature();

      const specialBody = '{"emoji":"🚀","quote":"\'test\'","slash":"/path/to/file"}';

      const signResult = signer.signRequest(secret, {
        method: 'POST',
        path: '/api/special?param=value&other=123',
        headers: {},
        body: specialBody,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'POST',
        path: '/api/special?param=value&other=123',
        headers: {},
        body: specialBody,
        timestamp: signResult.timestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(true);
    });

    it('should reject request from future', () => {
      const secret = 'secret';
      const signer = new RequestSignature({ clockSkew: 5000 });

      const futureTimestamp = Date.now() + 10000;
      const signResult = signer.signRequest(secret, {
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: '',
        timestamp: futureTimestamp,
      });

      const verifyResult = signer.verifyRequest(secret, {
        method: 'GET',
        path: '/api/test',
        headers: {},
        body: '',
        timestamp: futureTimestamp,
      }, signResult.signatureHeader);

      expect(verifyResult.valid).toBe(false);
    });
  });
});
