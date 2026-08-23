import { OceanicosClient, FullLoopResult } from '@omega-v/sdk';
import * as crypto from 'crypto';

export type TenantTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface Tenant {
  id: string;
  name: string;
  tier: TenantTier;
  quotaPerMinute: number;
  active: boolean;
  createdAt: string;
}

export interface TenantCredentials {
  tenant: Tenant;
  apiKey: string;
}

export interface TenantContext {
  tenantId: string;
  tier: TenantTier;
  name: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * VaaSGate: Multi-tenant Verification-as-a-Service isolation and quota enforcement
 */
export class VaaSGate {
  private tenants: Map<string, Tenant> = new Map();
  private apiKeys: Map<string, string> = new Map(); // apiKeyHash -> tenantId
  private usage: Map<string, { requestCount: number; windowStart: number }> = new Map();

  /**
   * Register a new organization / tenant in the VaaS ecosystem
   */
  public registerTenant(
    name: string,
    tier: TenantTier = 'FREE',
    quotaPerMinute?: number
  ): TenantCredentials {
    const defaultQuotas: Record<TenantTier, number> = {
      FREE: 60,
      PRO: 600,
      ENTERPRISE: 6000,
    };

    const id = `tenant-${crypto.randomBytes(6).toString('hex')}`;
    const rawApiKey = `vaas_${tier.toLowerCase()}_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = this.hashKey(rawApiKey);

    const tenant: Tenant = {
      id,
      name,
      tier,
      quotaPerMinute: quotaPerMinute ?? defaultQuotas[tier],
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.tenants.set(id, tenant);
    this.apiKeys.set(apiKeyHash, id);

    return {
      tenant,
      apiKey: rawApiKey,
    };
  }

  /**
   * Authenticate an API key and return tenant context
   */
  public authenticate(apiKey: string): TenantContext | null {
    if (!apiKey) return null;
    const keyHash = this.hashKey(apiKey);
    const tenantId = this.apiKeys.get(keyHash);
    if (!tenantId) return null;

    const tenant = this.tenants.get(tenantId);
    if (!tenant || !tenant.active) return null;

    return {
      tenantId: tenant.id,
      tier: tenant.tier,
      name: tenant.name,
    };
  }

  /**
   * Check rate limits and enforce tenant quotas
   */
  public checkRateLimit(tenantId: string): RateLimitResult {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { allowed: false, remaining: 0, resetInMs: 0 };
    }

    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute
    let userUsage = this.usage.get(tenantId);

    if (!userUsage || now - userUsage.windowStart > windowDuration) {
      userUsage = { requestCount: 0, windowStart: now };
      this.usage.set(tenantId, userUsage);
    }

    const remaining = Math.max(0, tenant.quotaPerMinute - userUsage.requestCount);
    const resetInMs = Math.max(0, windowDuration - (now - userUsage.windowStart));

    if (userUsage.requestCount >= tenant.quotaPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs,
      };
    }

    userUsage.requestCount++;
    return {
      allowed: true,
      remaining: remaining - 1,
      resetInMs,
    };
  }

  /**
   * Execute tenant-isolated verification with quota enforcement
   */
  public async executeVerification(
    apiKey: string,
    client: OceanicosClient,
    claim: string,
    metadata: Record<string, unknown> = {}
  ): Promise<FullLoopResult & { tenantId: string }> {
    const auth = this.authenticate(apiKey);
    if (!auth) {
      throw new Error('VaaS Authentication Failed: Invalid or revoked API key');
    }

    const rate = this.checkRateLimit(auth.tenantId);
    if (!rate.allowed) {
      throw new Error(
        `VaaS Quota Exceeded: Rate limit reached. Resets in ${Math.ceil(rate.resetInMs / 1000)}s`
      );
    }

    const loopResult = await client.runLoop({
      claim,
      category: 'vaas-tenant-verification',
      observedBy: `vaas-tenant-${auth.tenantId}`,
      sourceSystem: `vaas-service-${auth.tier.toLowerCase()}`,
      metadata: {
        ...metadata,
        tenantId: auth.tenantId,
        tenantTier: auth.tier,
      },
    });

    return {
      ...loopResult,
      tenantId: auth.tenantId,
    };
  }

  /**
   * List all registered tenants
   */
  public getTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  /**
   * Get tenant by ID
   */
  public getTenant(id: string): Tenant | null {
    return this.tenants.get(id) || null;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}

export default VaaSGate;
