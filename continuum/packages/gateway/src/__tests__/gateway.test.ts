import { OceanicosGatewayEngine } from '../index';

describe('@omega-v/gateway — OceanicosGatewayEngine', () => {
  let gateway: OceanicosGatewayEngine;

  beforeEach(() => {
    gateway = new OceanicosGatewayEngine('test-gateway-key');
  });

  describe('Client Registration & Tier Management', () => {
    it('should register clients with default FREE tier', () => {
      const state = gateway.registerClient('client-1');
      expect(state.clientId).toBe('client-1');
      expect(state.tier).toBe('FREE');
      expect(state.requestCount).toBe(0);
      expect(state.blocked).toBe(false);
    });

    it('should register clients with specified tiers', () => {
      const pro = gateway.registerClient('client-pro', 'PRO');
      const enterprise = gateway.registerClient('client-ent', 'ENTERPRISE');
      expect(pro.tier).toBe('PRO');
      expect(enterprise.tier).toBe('ENTERPRISE');
    });

    it('should list tier configurations', () => {
      const configs = gateway.getTierConfigs();
      expect(configs.length).toBe(4);
      expect(configs.some((c) => c.tier === 'FREE')).toBe(true);
      expect(configs.some((c) => c.tier === 'ENTERPRISE')).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      gateway.registerClient('client-1', 'FREE');
      const decision = gateway.processRequest('client-1');
      expect(decision.allowed).toBe(true);
      expect(decision.remainingRequests).toBe(29);
      expect(decision.reason).toBe('Request allowed');
    });

    it('should block requests exceeding rate limit', () => {
      gateway.registerClient('burst-client', 'FREE');
      // Exhaust the 30 rpm limit
      for (let i = 0; i < 30; i++) {
        gateway.processRequest('burst-client');
      }
      // 31st request should be blocked
      const blocked = gateway.processRequest('burst-client');
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
      expect(blocked.reason).toContain('Rate limit exceeded');
    });

    it('should auto-register unknown clients as FREE', () => {
      const decision = gateway.processRequest('unknown-client');
      expect(decision.allowed).toBe(true);
      expect(decision.tier).toBe('FREE');
      // Should have generated an anomaly
      const anomalies = gateway.getAnomalies();
      expect(anomalies.some((a) => a.type === 'UNKNOWN_CLIENT')).toBe(true);
    });
  });

  describe('Request Signing & Verification', () => {
    it('should sign and verify requests', () => {
      const signed = gateway.signRequest('client-1', 'hello');
      expect(signed.signature).toBeDefined();
      expect(signed.nonce).toHaveLength(16);

      const result = gateway.verifySignedRequest(signed);
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Signature verified');
    });

    it('should detect replay attacks via nonce reuse', () => {
      const signed = gateway.signRequest('client-1', 'data');
      // First verification succeeds
      expect(gateway.verifySignedRequest(signed).valid).toBe(true);
      // Second verification (same nonce) = replay attack
      const replay = gateway.verifySignedRequest(signed);
      expect(replay.valid).toBe(false);
      expect(replay.reason).toContain('Replay attack');
    });

    it('should detect signature tampering', () => {
      const signed = gateway.signRequest('client-1', 'data');
      // Tamper with signature
      const tampered = { ...signed, signature: 'tampered-signature' };
      const result = gateway.verifySignedRequest(tampered);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Signature mismatch');
    });

    it('should reject expired timestamps', () => {
      const signed = gateway.signRequest('client-1');
      // Set timestamp to 10 minutes ago
      const expired = {
        ...signed,
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      };
      const result = gateway.verifySignedRequest(expired);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too old');
    });
  });

  describe('Anomaly Detection & Audit', () => {
    it('should track gateway statistics', () => {
      gateway.registerClient('test-client', 'PRO');
      for (let i = 0; i < 5; i++) {
        gateway.processRequest('test-client');
      }
      const stats = gateway.getStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.allowedRequests).toBe(5);
      expect(stats.blockedRequests).toBe(0);
      expect(stats.activeClients).toBe(1);
    });

    it('should record decision history', () => {
      gateway.registerClient('audit-client');
      gateway.processRequest('audit-client');
      gateway.processRequest('audit-client');
      const history = gateway.getDecisionHistory();
      expect(history.length).toBe(2);
      expect(history.every((d) => d.clientId === 'audit-client')).toBe(true);
    });

    it('should detect signature mismatch anomalies', () => {
      const signed = gateway.signRequest('client-1');
      gateway.verifySignedRequest({ ...signed, signature: 'bad' });
      const anomalies = gateway.getAnomalies();
      expect(anomalies.some((a) => a.type === 'SIGNATURE_MISMATCH')).toBe(true);
      expect(anomalies.some((a) => a.severity === 'HIGH')).toBe(true);
    });
  });
});
