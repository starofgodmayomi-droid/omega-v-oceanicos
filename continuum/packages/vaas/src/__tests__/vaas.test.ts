import { VaaSGate } from '../index';
import { OceanicosClient } from '@omega-v/sdk';

describe('@omega-v/vaas (Verification-as-a-Service)', () => {
  let vaas: VaaSGate;
  let client: OceanicosClient;

  beforeEach(() => {
    vaas = new VaaSGate();
    client = new OceanicosClient();
  });

  it('should register tenant and authenticate with API key', () => {
    const creds = vaas.registerTenant('Acme Corp', 'PRO');
    expect(creds.tenant.id).toMatch(/^tenant-/);
    expect(creds.tenant.name).toBe('Acme Corp');
    expect(creds.tenant.tier).toBe('PRO');
    expect(creds.tenant.quotaPerMinute).toBe(600);
    expect(creds.apiKey).toMatch(/^vaas_pro_/);

    const auth = vaas.authenticate(creds.apiKey);
    expect(auth).not.toBeNull();
    expect(auth?.tenantId).toBe(creds.tenant.id);
    expect(auth?.tier).toBe('PRO');
  });

  it('should reject invalid or missing API keys', () => {
    expect(vaas.authenticate('invalid_key')).toBeNull();
    expect(vaas.authenticate('')).toBeNull();
  });

  it('should enforce rate limits and quotas per tenant', () => {
    const creds = vaas.registerTenant('Test Org', 'FREE', 2); // Quota = 2

    const r1 = vaas.checkRateLimit(creds.tenant.id);
    expect(r1.allowed).toBe(true);

    const r2 = vaas.checkRateLimit(creds.tenant.id);
    expect(r2.allowed).toBe(true);

    const r3 = vaas.checkRateLimit(creds.tenant.id);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('should execute tenant verification end-to-end with tenant metadata', async () => {
    const creds = vaas.registerTenant('Verified Corp', 'ENTERPRISE');

    const result = await vaas.executeVerification(
      creds.apiKey,
      client,
      'Tenant Enterprise SLA Claim',
      { customerId: 'cust-123' }
    );

    expect(result.tenantId).toBe(creds.tenant.id);
    expect(result.verification.summary.passed).toBe(true);
    expect(result.attestation.signature).toBeDefined();
    expect(result.observation.observedBy).toContain(creds.tenant.id);
  });
});
