import { OceanicosWebhookEngine, WebhookPayload } from '../index';

describe('@omega-v/webhook — OceanicosWebhookEngine', () => {
  let webhookEngine: OceanicosWebhookEngine;

  beforeEach(() => {
    webhookEngine = new OceanicosWebhookEngine();
  });

  describe('Subscription Management', () => {
    it('should bootstrap canonical webhook subscriptions', () => {
      const subs = webhookEngine.getSubscriptions();
      expect(subs.length).toBeGreaterThanOrEqual(2);
      expect(subs.some((s) => s.id === 'webhook-ci-alerts')).toBe(true);
      expect(subs.some((s) => s.id === 'webhook-security-alerts')).toBe(true);
    });

    it('should register custom webhook subscription', () => {
      const sub = webhookEngine.registerSubscription({
        id: 'sub-slack-notifier',
        name: 'Slack Alerts Webhook',
        url: 'https://hooks.slack.com/services/T00/B00/X00',
        events: ['VERIFICATION_FAILED', 'POLICY_VIOLATED'],
        secret: 'whsec_slack_custom',
        active: true,
      });

      expect(sub.id).toBe('sub-slack-notifier');
      expect(webhookEngine.getSubscription('sub-slack-notifier')).toBeDefined();
    });

    it('should delete a subscription', () => {
      webhookEngine.registerSubscription({
        id: 'sub-temp',
        name: 'Temp Sub',
        url: 'https://temp.org/hook',
        events: ['ALL'],
      });
      expect(webhookEngine.deleteSubscription('sub-temp')).toBe(true);
      expect(webhookEngine.getSubscription('sub-temp')).toBeUndefined();
    });
  });

  describe('HMAC Signature Generation & Verification', () => {
    it('should generate valid HMAC-SHA256 signature for payload', () => {
      const payload: WebhookPayload = {
        eventId: 'evt-12345',
        event: 'ATTESTATION_CREATED',
        timestamp: '2026-08-23T00:00:00.000Z',
        data: { claim: 'server-latency < 50ms', confidence: 0.99 },
      };
      const secret = 'test-webhook-secret';
      const sig = webhookEngine.signPayload(payload, secret);

      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(webhookEngine.verifySignature(payload, sig, secret)).toBe(true);
    });

    it('should reject tampered payload or invalid secret', () => {
      const payload: WebhookPayload = {
        eventId: 'evt-12345',
        event: 'ATTESTATION_CREATED',
        timestamp: '2026-08-23T00:00:00.000Z',
        data: { claim: 'legit' },
      };
      const secret = 'correct-secret';
      const sig = webhookEngine.signPayload(payload, secret);

      // Verify with wrong secret
      expect(webhookEngine.verifySignature(payload, sig, 'wrong-secret')).toBe(false);

      // Verify with modified payload
      const tampered = { ...payload, data: { claim: 'tampered' } };
      expect(webhookEngine.verifySignature(tampered, sig, secret)).toBe(false);
    });
  });

  describe('Event Dispatching & Delivery Retries', () => {
    it('should dispatch events to matching subscriptions', async () => {
      const attempts = await webhookEngine.dispatchEvent('ATTESTATION_CREATED', {
        attestationId: 'att-123',
        verified: true,
      });

      expect(attempts.length).toBeGreaterThanOrEqual(1);
      expect(attempts.every((a) => a.status === 'SUCCESS')).toBe(true);
      expect(attempts[0].signature).toMatch(/^sha256=/);
    });

    it('should retry failed dispatches up to maxRetries', async () => {
      let callCount = 0;
      webhookEngine.setDispatcher(async () => {
        callCount++;
        if (callCount < 3) {
          return { ok: false, status: 503, error: 'Service Unavailable' };
        }
        return { ok: true, status: 200 };
      });

      const attempts = await webhookEngine.dispatchEvent('ATTESTATION_CREATED', {
        test: 'retry-event',
      });

      expect(attempts[0].attemptNumber).toBe(3);
      expect(attempts[0].status).toBe('SUCCESS');
    });

    it('should log failed attempt when all retries are exhausted', async () => {
      webhookEngine.setDispatcher(async () => ({
        ok: false,
        status: 500,
        error: 'Internal Server Error',
      }));

      const attempts = await webhookEngine.dispatchEvent('POLICY_VIOLATED', {
        rule: 'data-residency-us',
      });

      expect(attempts.some((a) => a.status === 'FAILED')).toBe(true);
      const history = webhookEngine.getDeliveryHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should calculate delivery statistics', async () => {
      webhookEngine.setDispatcher(async () => ({ ok: true, status: 200 }));
      await webhookEngine.dispatchEvent('ATTESTATION_CREATED', { test: true });

      const stats = webhookEngine.getStats();
      expect(stats.totalSubscriptions).toBeGreaterThanOrEqual(2);
      expect(stats.totalDispatches).toBeGreaterThan(0);
      expect(stats.successfulDeliveries).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
    });
  });
});
