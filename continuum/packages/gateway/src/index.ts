import * as crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RateLimitTier = 'FREE' | 'PRO' | 'ENTERPRISE' | 'SYSTEM';

export interface RateLimitConfig {
  tier: RateLimitTier;
  requestsPerMinute: number;
  burstCapacity: number;
  cooldownSeconds: number;
}

export interface RateLimitState {
  clientId: string;
  tier: RateLimitTier;
  windowStart: number;
  requestCount: number;
  burstCount: number;
  blocked: boolean;
  blockedUntil: number | null;
  lastRequestAt: number;
}

export interface GatewayDecision {
  allowed: boolean;
  clientId: string;
  tier: RateLimitTier;
  remainingRequests: number;
  retryAfterMs: number | null;
  reason: string;
  timestamp: string;
}

export interface AnomalyAlert {
  alertId: string;
  clientId: string;
  type: 'RATE_SPIKE' | 'SIGNATURE_MISMATCH' | 'REPLAY_ATTACK' | 'UNKNOWN_CLIENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: string;
}

export interface SignedRequest {
  clientId: string;
  timestamp: string;
  nonce: string;
  signature: string;
  payload?: string;
}

export interface GatewayStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  anomaliesDetected: number;
  activeClients: number;
  avgRequestsPerMinute: number;
}

// ─── Default Tier Limits ──────────────────────────────────────────────────────

const DEFAULT_TIER_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  FREE: { tier: 'FREE', requestsPerMinute: 30, burstCapacity: 5, cooldownSeconds: 60 },
  PRO: { tier: 'PRO', requestsPerMinute: 120, burstCapacity: 20, cooldownSeconds: 30 },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    requestsPerMinute: 600,
    burstCapacity: 100,
    cooldownSeconds: 10,
  },
  SYSTEM: { tier: 'SYSTEM', requestsPerMinute: 10000, burstCapacity: 1000, cooldownSeconds: 5 },
};

/**
 * OceanicosGatewayEngine: Adaptive Rate Limiter, Request Signing & Anomaly Detection
 *
 * ```
 * 💧 Ω∞v ::= Request → Signature Verify → Rate Check → Anomaly Scan → Allow/Deny → Audit
 * ```
 *
 * Features:
 *   - Sliding-window rate limiting per client with tier-based quotas
 *   - HMAC-SHA256 request signature verification (anti-replay with nonce)
 *   - Anomaly detection: rate spikes, signature mismatches, replay attacks
 *   - Full audit trail of gateway decisions
 */
export class OceanicosGatewayEngine {
  private tierConfigs: Map<RateLimitTier, RateLimitConfig> = new Map();
  private clientStates: Map<string, RateLimitState> = new Map();
  private clientTiers: Map<string, RateLimitTier> = new Map();
  private anomalies: AnomalyAlert[] = [];
  private decisions: GatewayDecision[] = [];
  private usedNonces: Set<string> = new Set();
  private secretKey: string;

  private totalRequests = 0;
  private allowedRequests = 0;
  private blockedRequests = 0;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || 'Ω∞v-GATEWAY-SIGNING-KEY-v1';
    // Bootstrap default tier configs
    for (const [tier, config] of Object.entries(DEFAULT_TIER_CONFIGS)) {
      this.tierConfigs.set(tier as RateLimitTier, config);
    }
  }

  /** Register a client with a specific rate-limit tier */
  public registerClient(clientId: string, tier: RateLimitTier = 'FREE'): RateLimitState {
    this.clientTiers.set(clientId, tier);
    const state: RateLimitState = {
      clientId,
      tier,
      windowStart: Date.now(),
      requestCount: 0,
      burstCount: 0,
      blocked: false,
      blockedUntil: null,
      lastRequestAt: Date.now(),
    };
    this.clientStates.set(clientId, state);
    return state;
  }

  /** Process a gateway request — checks rate limit + anomaly detection */
  public processRequest(clientId: string): GatewayDecision {
    this.totalRequests++;
    const now = Date.now();
    const timestamp = new Date(now).toISOString();

    // Unknown client detection
    if (!this.clientStates.has(clientId)) {
      this.anomalies.push({
        alertId: `alert-${crypto.randomBytes(4).toString('hex')}`,
        clientId,
        type: 'UNKNOWN_CLIENT',
        severity: 'MEDIUM',
        description: `Unknown client '${clientId}' attempted access. Auto-registering as FREE tier.`,
        detectedAt: timestamp,
      });
      this.registerClient(clientId, 'FREE');
    }

    const state = this.clientStates.get(clientId)!;
    const tier = this.clientTiers.get(clientId) || 'FREE';
    const config = this.tierConfigs.get(tier) || DEFAULT_TIER_CONFIGS.FREE;

    // Check if currently in cooldown
    if (state.blocked && state.blockedUntil && now < state.blockedUntil) {
      this.blockedRequests++;
      const decision: GatewayDecision = {
        allowed: false,
        clientId,
        tier,
        remainingRequests: 0,
        retryAfterMs: state.blockedUntil - now,
        reason: `Rate limit exceeded. Cooldown active for ${Math.ceil((state.blockedUntil - now) / 1000)}s`,
        timestamp,
      };
      this.decisions.push(decision);
      return decision;
    }

    // Reset window if expired
    const windowMs = 60_000; // 1 minute sliding window
    if (now - state.windowStart > windowMs) {
      state.windowStart = now;
      state.requestCount = 0;
      state.burstCount = 0;
      state.blocked = false;
      state.blockedUntil = null;
    }

    state.requestCount++;
    state.lastRequestAt = now;

    // Burst detection
    const timeSinceWindowStart = now - state.windowStart;
    if (timeSinceWindowStart < 5000 && state.requestCount > config.burstCapacity) {
      state.burstCount++;
    }

    // Rate spike anomaly detection
    if (
      state.requestCount > config.requestsPerMinute * 0.8 &&
      state.requestCount <= config.requestsPerMinute
    ) {
      this.anomalies.push({
        alertId: `alert-${crypto.randomBytes(4).toString('hex')}`,
        clientId,
        type: 'RATE_SPIKE',
        severity: 'LOW',
        description: `Client '${clientId}' approaching rate limit (${state.requestCount}/${config.requestsPerMinute} rpm)`,
        detectedAt: timestamp,
      });
    }

    // Enforce rate limit
    if (state.requestCount > config.requestsPerMinute) {
      state.blocked = true;
      state.blockedUntil = now + config.cooldownSeconds * 1000;
      this.blockedRequests++;

      this.anomalies.push({
        alertId: `alert-${crypto.randomBytes(4).toString('hex')}`,
        clientId,
        type: 'RATE_SPIKE',
        severity: 'HIGH',
        description: `Client '${clientId}' exceeded rate limit (${state.requestCount}/${config.requestsPerMinute} rpm). Blocking for ${config.cooldownSeconds}s`,
        detectedAt: timestamp,
      });

      const decision: GatewayDecision = {
        allowed: false,
        clientId,
        tier,
        remainingRequests: 0,
        retryAfterMs: config.cooldownSeconds * 1000,
        reason: `Rate limit exceeded (${config.requestsPerMinute} rpm). Blocked for ${config.cooldownSeconds}s`,
        timestamp,
      };
      this.decisions.push(decision);
      return decision;
    }

    // Allow
    this.allowedRequests++;
    const remaining = config.requestsPerMinute - state.requestCount;
    const decision: GatewayDecision = {
      allowed: true,
      clientId,
      tier,
      remainingRequests: remaining,
      retryAfterMs: null,
      reason: 'Request allowed',
      timestamp,
    };
    this.decisions.push(decision);
    return decision;
  }

  /** Sign a request payload with HMAC-SHA256 for verification */
  public signRequest(clientId: string, payload?: string): SignedRequest {
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomBytes(8).toString('hex');
    const data = `${clientId}:${timestamp}:${nonce}:${payload || ''}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');

    return { clientId, timestamp, nonce, signature, payload };
  }

  /** Verify a signed request — detects replay attacks and signature mismatches */
  public verifySignedRequest(signed: SignedRequest): { valid: boolean; reason: string } {
    const now = Date.now();
    const requestTime = new Date(signed.timestamp).getTime();

    // Reject requests older than 5 minutes
    if (now - requestTime > 5 * 60 * 1000) {
      return { valid: false, reason: 'Request timestamp too old (>5m)' };
    }

    // Replay attack detection via nonce
    if (this.usedNonces.has(signed.nonce)) {
      this.anomalies.push({
        alertId: `alert-${crypto.randomBytes(4).toString('hex')}`,
        clientId: signed.clientId,
        type: 'REPLAY_ATTACK',
        severity: 'CRITICAL',
        description: `Replay attack detected — nonce '${signed.nonce}' already used by client '${signed.clientId}'`,
        detectedAt: new Date().toISOString(),
      });
      return { valid: false, reason: 'Replay attack — nonce already used' };
    }

    // Verify HMAC signature
    const data = `${signed.clientId}:${signed.timestamp}:${signed.nonce}:${signed.payload || ''}`;
    const expectedSig = crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');

    if (signed.signature !== expectedSig) {
      this.anomalies.push({
        alertId: `alert-${crypto.randomBytes(4).toString('hex')}`,
        clientId: signed.clientId,
        type: 'SIGNATURE_MISMATCH',
        severity: 'HIGH',
        description: `Signature mismatch on request from '${signed.clientId}'`,
        detectedAt: new Date().toISOString(),
      });
      return { valid: false, reason: 'Signature mismatch' };
    }

    // Mark nonce as used
    this.usedNonces.add(signed.nonce);
    return { valid: true, reason: 'Signature verified' };
  }

  /** Get all anomaly alerts */
  public getAnomalies(): AnomalyAlert[] {
    return [...this.anomalies];
  }

  /** Get gateway statistics */
  public getStats(): GatewayStats {
    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      blockedRequests: this.blockedRequests,
      anomaliesDetected: this.anomalies.length,
      activeClients: this.clientStates.size,
      avgRequestsPerMinute:
        this.totalRequests > 0
          ? Math.round(this.totalRequests / Math.max(1, this.clientStates.size))
          : 0,
    };
  }

  /** Get client state */
  public getClientState(clientId: string): RateLimitState | undefined {
    return this.clientStates.get(clientId);
  }

  /** Get all client states */
  public getAllClients(): RateLimitState[] {
    return Array.from(this.clientStates.values());
  }

  /** Get decision history */
  public getDecisionHistory(): GatewayDecision[] {
    return [...this.decisions];
  }

  /** Get tier configurations */
  public getTierConfigs(): RateLimitConfig[] {
    return Array.from(this.tierConfigs.values());
  }
}

export default OceanicosGatewayEngine;
