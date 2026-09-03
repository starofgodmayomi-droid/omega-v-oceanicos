import {
  TenantManager,
  ContextPropagator,
  QuotaManager,
  IsolationManager,
  TenantAuditor,
  TenantHub,
  type QuotaMetric,
} from '../multitenancy';

describe('Multi-Tenant Architecture', () => {
  describe('TenantManager', () => {
    let manager: TenantManager;

    beforeEach(() => {
      manager = new TenantManager();
    });

    afterEach(async () => {
      await manager.clear();
    });

    it('should create tenant', () => {
      const tenant = manager.createTenant('acme', 'user1');

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('acme');
      expect(tenant.owner).toBe('user1');
      expect(tenant.status).toBe('active');
    });

    it('should get tenant by id', () => {
      const created = manager.createTenant('acme', 'user1');
      const retrieved = manager.getTenant(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('acme');
    });

    it('should get tenants by owner', () => {
      manager.createTenant('acme', 'user1');
      manager.createTenant('globex', 'user1');
      manager.createTenant('initech', 'user2');

      const user1Tenants = manager.getTenantsByOwner('user1');

      expect(user1Tenants.length).toBe(2);
      expect(user1Tenants.every((t) => t.owner === 'user1')).toBe(true);
    });

    it('should add feature to tenant', () => {
      const tenant = manager.createTenant('acme', 'user1');
      const result = manager.addFeature(tenant.id, 'analytics');

      expect(result).toBe(true);
      expect(manager.hasFeature(tenant.id, 'analytics')).toBe(true);
    });

    it('should remove feature from tenant', () => {
      const tenant = manager.createTenant('acme', 'user1');
      manager.addFeature(tenant.id, 'analytics');
      const result = manager.removeFeature(tenant.id, 'analytics');

      expect(result).toBe(true);
      expect(manager.hasFeature(tenant.id, 'analytics')).toBe(false);
    });

    it('should suspend tenant', () => {
      const tenant = manager.createTenant('acme', 'user1');
      const result = manager.suspendTenant(tenant.id);

      expect(result).toBe(true);
      const suspended = manager.getTenant(tenant.id);
      expect(suspended?.status).toBe('suspended');
    });

    it('should activate tenant', () => {
      const tenant = manager.createTenant('acme', 'user1');
      manager.suspendTenant(tenant.id);
      const result = manager.activateTenant(tenant.id);

      expect(result).toBe(true);
      const activated = manager.getTenant(tenant.id);
      expect(activated?.status).toBe('active');
    });

    it('should delete tenant', () => {
      const tenant = manager.createTenant('acme', 'user1');
      const result = manager.deleteTenant(tenant.id);

      expect(result).toBe(true);
      expect(manager.getTenant(tenant.id)).toBeUndefined();
    });
  });

  describe('ContextPropagator', () => {
    let propagator: ContextPropagator;

    beforeEach(() => {
      propagator = new ContextPropagator();
    });

    afterEach(async () => {
      await propagator.clear();
    });

    it('should establish context', () => {
      const context = propagator.establishContext('tenant1', 'user1');

      expect(context.tenantId).toBe('tenant1');
      expect(context.userId).toBe('user1');
      expect(context.requestId).toBeDefined();
      expect(context.correlationId).toBeDefined();
    });

    it('should get context by request id', () => {
      const established = propagator.establishContext('tenant1', 'user1');
      const retrieved = propagator.getContext(established.requestId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.tenantId).toBe('tenant1');
    });

    it('should validate context', () => {
      const context = propagator.establishContext('tenant1', 'user1');

      expect(propagator.validateContext(context)).toBe(true);
    });

    it('should invalidate expired context', () => {
      const context = propagator.establishContext('tenant1', 'user1');
      context.timestamp = Date.now() - 3700000; // 61+ minutes old

      expect(propagator.validateContext(context)).toBe(false);
    });

    it('should propagate context to child', () => {
      const parent = propagator.establishContext('tenant1', 'user1', { level: 'parent' });
      const child = propagator.propagateContext(parent, { level: 'child' });

      expect(child.tenantId).toBe(parent.tenantId);
      expect(child.userId).toBe(parent.userId);
      expect(child.metadata.level).toBe('child');
    });

    it('should clear context', () => {
      const context = propagator.establishContext('tenant1', 'user1');
      const result = propagator.clearContext(context.requestId);

      expect(result).toBe(true);
      expect(propagator.getContext(context.requestId)).toBeUndefined();
    });
  });

  describe('QuotaManager', () => {
    let manager: QuotaManager;

    beforeEach(() => {
      manager = new QuotaManager();
    });

    afterEach(async () => {
      await manager.clear();
    });

    it('should initialize quotas', () => {
      const limits = new Map<QuotaMetric, number>([
        ['storage', 100000],
        ['requests', 10000],
      ]);
      const quotas = manager.initializeQuotas('tenant1', limits);

      expect(quotas.tenantId).toBe('tenant1');
      expect(quotas.quotas.size).toBe(2);
    });

    it('should get quotas', () => {
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      manager.initializeQuotas('tenant1', limits);
      const quotas = manager.getQuotas('tenant1');

      expect(quotas).toBeDefined();
      expect(quotas?.tenantId).toBe('tenant1');
    });

    it('should record usage', () => {
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      manager.initializeQuotas('tenant1', limits);
      const result = manager.recordUsage('tenant1', 'storage', 5000);

      expect(result).toBe(true);
      const quota = manager.getQuotas('tenant1')?.quotas.get('storage');
      expect(quota?.current).toBe(5000);
    });

    it('should check quota availability', () => {
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      manager.initializeQuotas('tenant1', limits);
      manager.recordUsage('tenant1', 'storage', 95000);

      expect(manager.isWithinQuota('tenant1', 'storage', 4999)).toBe(true);
      expect(manager.isWithinQuota('tenant1', 'storage', 5001)).toBe(false);
    });

    it('should get remaining quota', () => {
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      manager.initializeQuotas('tenant1', limits);
      manager.recordUsage('tenant1', 'storage', 30000);

      const remaining = manager.getRemainingQuota('tenant1', 'storage');

      expect(remaining).toBe(70000);
    });

    it('should reset quotas', () => {
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      manager.initializeQuotas('tenant1', limits);
      manager.recordUsage('tenant1', 'storage', 50000);
      const result = manager.resetQuotas('tenant1');

      expect(result).toBe(true);
      const quota = manager.getQuotas('tenant1')?.quotas.get('storage');
      expect(quota?.current).toBe(0);
    });

    it('should update quota limit', () => {
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      manager.initializeQuotas('tenant1', limits);
      const result = manager.updateLimit('tenant1', 'storage', 200000);

      expect(result).toBe(true);
      const quota = manager.getQuotas('tenant1')?.quotas.get('storage');
      expect(quota?.limit).toBe(200000);
    });
  });

  describe('IsolationManager', () => {
    let manager: IsolationManager;

    beforeEach(() => {
      manager = new IsolationManager();
    });

    afterEach(async () => {
      await manager.clear();
    });

    it('should create isolation policy', () => {
      const rules = new Map<string, any>([['rule1', 'value1']]);
      const policy = manager.createPolicy('tenant1', 'logical', rules);

      expect(policy.tenantId).toBe('tenant1');
      expect(policy.level).toBe('logical');
      expect(policy.enforced).toBe(true);
    });

    it('should get policy', () => {
      const rules = new Map<string, any>([['rule1', 'value1']]);
      manager.createPolicy('tenant1', 'logical', rules);
      const policy = manager.getPolicy('tenant1');

      expect(policy).toBeDefined();
      expect(policy?.tenantId).toBe('tenant1');
    });

    it('should enforce isolation', () => {
      const rules = new Map<string, any>();
      manager.createPolicy('tenant1', 'logical', rules);

      expect(manager.enforceIsolation('tenant1', 'tenant1')).toBe(true);
      expect(manager.enforceIsolation('tenant1', 'tenant2')).toBe(false);
    });

    it('should validate cross-tenant access', () => {
      const rules = new Map<string, any>([['crossTenantPermissions', new Set(['read'])]]);
      manager.createPolicy('tenant1', 'logical', rules);

      expect(manager.validateCrossTenantAccess('tenant1', 'tenant2', 'read')).toBe(true);
      expect(manager.validateCrossTenantAccess('tenant1', 'tenant2', 'write')).toBe(false);
    });

    it('should add isolation rule', () => {
      const rules = new Map<string, any>();
      manager.createPolicy('tenant1', 'logical', rules);
      const result = manager.addIsolationRule('tenant1', 'newRule', 'newValue');

      expect(result).toBe(true);
      const policy = manager.getPolicy('tenant1');
      expect(policy?.rules.get('newRule')).toBe('newValue');
    });

    it('should disable isolation', () => {
      const rules = new Map<string, any>();
      manager.createPolicy('tenant1', 'logical', rules);
      const result = manager.disableIsolation('tenant1');

      expect(result).toBe(true);
      const policy = manager.getPolicy('tenant1');
      expect(policy?.enforced).toBe(false);
    });

    it('should enable isolation', () => {
      const rules = new Map<string, any>();
      manager.createPolicy('tenant1', 'logical', rules);
      manager.disableIsolation('tenant1');
      const result = manager.enableIsolation('tenant1');

      expect(result).toBe(true);
      const policy = manager.getPolicy('tenant1');
      expect(policy?.enforced).toBe(true);
    });
  });

  describe('TenantAuditor', () => {
    let auditor: TenantAuditor;

    beforeEach(() => {
      auditor = new TenantAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log event', () => {
      const event = auditor.logEvent('tenant1', 'user_created', 'user1');

      expect(event.id).toBeDefined();
      expect(event.tenantId).toBe('tenant1');
      expect(event.event).toBe('user_created');
      expect(event.userId).toBe('user1');
    });

    it('should get events by tenant', () => {
      auditor.logEvent('tenant1', 'user_created', 'user1');
      auditor.logEvent('tenant1', 'user_updated', 'user1');
      auditor.logEvent('tenant2', 'user_created', 'user2');

      const events = auditor.getEventsByTenant('tenant1');

      expect(events.length).toBe(2);
      expect(events.every((e) => e.tenantId === 'tenant1')).toBe(true);
    });

    it('should get events by user', () => {
      auditor.logEvent('tenant1', 'user_created', 'user1');
      auditor.logEvent('tenant1', 'user_created', 'user2');
      auditor.logEvent('tenant1', 'resource_created', 'user1');

      const events = auditor.getEventsByUser('tenant1', 'user1');

      expect(events.length).toBe(2);
      expect(events.every((e) => e.userId === 'user1')).toBe(true);
    });

    it('should get events by resource', () => {
      auditor.logEvent('tenant1', 'resource_created', 'user1', 'res1');
      auditor.logEvent('tenant1', 'resource_updated', 'user1', 'res1');
      auditor.logEvent('tenant1', 'resource_created', 'user1', 'res2');

      const events = auditor.getEventsByResource('tenant1', 'res1');

      expect(events.length).toBe(2);
      expect(events.every((e) => e.resourceId === 'res1')).toBe(true);
    });

    it('should count events by type', () => {
      auditor.logEvent('tenant1', 'user_created', 'user1');
      auditor.logEvent('tenant1', 'user_created', 'user2');
      auditor.logEvent('tenant1', 'resource_created', 'user1');

      const count = auditor.countEventsByType('tenant1', 'user_created');

      expect(count).toBe(2);
    });

    it('should get audit stats', () => {
      auditor.logEvent('tenant1', 'user_created', 'user1');
      auditor.logEvent('tenant1', 'user_created', 'user2');
      auditor.logEvent('tenant1', 'resource_created', 'user1', 'res1');

      const stats = auditor.getAuditStats('tenant1');

      expect(stats.totalEvents).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.uniqueResources).toBe(1);
      expect(stats.eventTypes.user_created).toBe(2);
    });
  });

  describe('TenantHub', () => {
    let hub: TenantHub;

    beforeEach(() => {
      hub = new TenantHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide tenant manager', () => {
      const manager = hub.getTenantManager();
      expect(manager).toBeDefined();
    });

    it('should provide context propagator', () => {
      const propagator = hub.getContextPropagator();
      expect(propagator).toBeDefined();
    });

    it('should provide quota manager', () => {
      const manager = hub.getQuotaManager();
      expect(manager).toBeDefined();
    });

    it('should provide isolation manager', () => {
      const manager = hub.getIsolationManager();
      expect(manager).toBeDefined();
    });

    it('should provide auditor', () => {
      const auditor = hub.getAuditor();
      expect(auditor).toBeDefined();
    });

    it('should create tenant with audit', () => {
      const tenant = hub.createTenant('acme', 'user1');

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('acme');

      const stats = hub.getTenantAuditStats(tenant.id);
      expect(stats.eventTypes.tenant_created).toBe(1);
    });

    it('should establish context with audit', () => {
      const tenant = hub.createTenant('acme', 'user1');
      const context = hub.establishContext(tenant.id, 'user2');

      expect(context.tenantId).toBe(tenant.id);
      expect(context.userId).toBe('user2');

      const stats = hub.getTenantAuditStats(tenant.id);
      expect(stats.eventTypes.context_established).toBe(1);
    });

    it('should initialize quotas', () => {
      const tenant = hub.createTenant('acme', 'user1');
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      const quotas = hub.initializeQuotas(tenant.id, limits);

      expect(quotas.tenantId).toBe(tenant.id);
    });

    it('should create isolation policy with audit', () => {
      const tenant = hub.createTenant('acme', 'user1');
      const rules = new Map<string, any>();
      const policy = hub.createIsolationPolicy(tenant.id, 'logical', rules);

      expect(policy.tenantId).toBe(tenant.id);

      const stats = hub.getTenantAuditStats(tenant.id);
      expect(stats.eventTypes.isolation_policy_created).toBe(1);
    });

    it('should record usage', () => {
      const tenant = hub.createTenant('acme', 'user1');
      const limits = new Map<QuotaMetric, number>([['storage', 100000]]);
      hub.initializeQuotas(tenant.id, limits);

      const result = hub.recordUsage(tenant.id, 'storage', 5000);

      expect(result).toBe(true);
    });

    it('should enforce isolation', () => {
      const tenant = hub.createTenant('acme', 'user1');
      const rules = new Map<string, any>();
      hub.createIsolationPolicy(tenant.id, 'logical', rules);

      expect(hub.enforceIsolation(tenant.id, tenant.id)).toBe(true);
    });

    it('should suspend tenant with audit', () => {
      const tenant = hub.createTenant('acme', 'user1');
      const result = hub.suspendTenant(tenant.id);

      expect(result).toBe(true);

      const stats = hub.getTenantAuditStats(tenant.id);
      expect(stats.eventTypes.tenant_suspended).toBe(1);
    });

    it('should integrate all components for complex multi-tenant scenario', () => {
      const tenant = hub.createTenant('acme', 'owner1');
      const limits = new Map<QuotaMetric, number>([
        ['storage', 100000],
        ['requests', 10000],
      ]);
      hub.initializeQuotas(tenant.id, limits);

      const rules = new Map<string, any>([['level', 'logical']]);
      hub.createIsolationPolicy(tenant.id, 'logical', rules);

      const ctx1 = hub.establishContext(tenant.id, 'user1');
      const ctx2 = hub.establishContext(tenant.id, 'user2');

      hub.recordUsage(tenant.id, 'storage', 50000);
      hub.recordUsage(tenant.id, 'requests', 5000);

      expect(hub.enforceIsolation(tenant.id, tenant.id)).toBe(true);

      const stats = hub.getTenantAuditStats(tenant.id);
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.uniqueUsers).toBe(3); // owner1, user1, user2
    });
  });
});
