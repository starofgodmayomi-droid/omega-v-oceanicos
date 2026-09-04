import {
  RoleManager,
  ResourceManager,
  AttributeManager,
  PolicyEngine,
  AccessDecisionPoint,
  AuthorizationHub,
  Permission,
  Role,
  Resource,
  Policy,
  PolicyStatement,
} from '../authorization';

describe('Advanced Authorization & Access Control System', () => {
  describe('RoleManager', () => {
    let roleManager: RoleManager;

    beforeEach(() => {
      roleManager = new RoleManager();
    });

    afterEach(async () => {
      await roleManager.clear();
    });

    it('should create role', () => {
      const role = roleManager.createRole('admin', 'system');

      expect(role.id).toBeDefined();
      expect(role.name).toBe('admin');
      expect(role.type).toBe('system');
      expect(role.permissions).toEqual([]);
    });

    it('should create permission', () => {
      const permission = roleManager.createPermission('create', 'observation', 'public');

      expect(permission.id).toBeDefined();
      expect(permission.action).toBe('create');
      expect(permission.resource).toBe('observation');
      expect(permission.scope).toBe('public');
    });

    it('should add permission to role', () => {
      const role = roleManager.createRole('editor');
      const permission = roleManager.createPermission('update', 'verification');

      const result = roleManager.addPermissionToRole(role.id, permission.id);

      expect(result).toBe(true);
      expect(role.permissions.length).toBe(1);
      expect(role.permissions[0].id).toBe(permission.id);
    });

    it('should remove permission from role', () => {
      const role = roleManager.createRole('editor');
      const permission = roleManager.createPermission('update', 'verification');

      roleManager.addPermissionToRole(role.id, permission.id);
      const result = roleManager.removePermissionFromRole(role.id, permission.id);

      expect(result).toBe(true);
      expect(role.permissions.length).toBe(0);
    });

    it('should get role', () => {
      const role = roleManager.createRole('viewer', 'custom');

      const retrieved = roleManager.getRole(role.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('viewer');
    });

    it('should get permissions for role with inheritance', () => {
      const parentRole = roleManager.createRole('base');
      const childRole = roleManager.createRole('editor', 'custom', [parentRole.id]);
      const perm1 = roleManager.createPermission('read', 'observation');
      const perm2 = roleManager.createPermission('update', 'observation');

      roleManager.addPermissionToRole(parentRole.id, perm1.id);
      roleManager.addPermissionToRole(childRole.id, perm2.id);

      const permissions = roleManager.getPermissionsForRole(childRole.id);

      expect(permissions.length).toBe(2);
      expect(permissions.some((p) => p.id === perm1.id)).toBe(true);
      expect(permissions.some((p) => p.id === perm2.id)).toBe(true);
    });

    it('should check permission on role', () => {
      const role = roleManager.createRole('admin');
      const permission = roleManager.createPermission('admin', 'user');

      roleManager.addPermissionToRole(role.id, permission.id);

      expect(roleManager.hasPermission(role.id, 'admin', 'user')).toBe(true);
      expect(roleManager.hasPermission(role.id, 'read', 'user')).toBe(false);
    });

    it('should get roles by name', () => {
      roleManager.createRole('admin', 'system');
      roleManager.createRole('admin', 'custom');

      const roles = roleManager.getRolesByName('admin');

      expect(roles.length).toBe(2);
      expect(roles.every((r) => r.name === 'admin')).toBe(true);
    });
  });

  describe('ResourceManager', () => {
    let resourceManager: ResourceManager;

    beforeEach(() => {
      resourceManager = new ResourceManager();
    });

    afterEach(async () => {
      await resourceManager.clear();
    });

    it('should create resource', () => {
      const resource = resourceManager.createResource('observation', 'user1', { status: 'active' });

      expect(resource.id).toBeDefined();
      expect(resource.type).toBe('observation');
      expect(resource.owner).toBe('user1');
      expect(resource.attributes.status).toBe('active');
    });

    it('should get resource', () => {
      const resource = resourceManager.createResource('verification', 'user1', {});

      const retrieved = resourceManager.getResource(resource.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(resource.id);
    });

    it('should get resources by owner', () => {
      resourceManager.createResource('observation', 'user1', {});
      resourceManager.createResource('observation', 'user1', {});
      resourceManager.createResource('observation', 'user2', {});

      const resources = resourceManager.getResourcesByOwner('user1');

      expect(resources.length).toBe(2);
      expect(resources.every((r) => r.owner === 'user1')).toBe(true);
    });

    it('should get resources by type', () => {
      resourceManager.createResource('observation', 'user1', {});
      resourceManager.createResource('verification', 'user1', {});
      resourceManager.createResource('observation', 'user2', {});

      const observations = resourceManager.getResourcesByType('observation');

      expect(observations.length).toBe(2);
      expect(observations.every((r) => r.type === 'observation')).toBe(true);
    });

    it('should update resource', () => {
      const resource = resourceManager.createResource('attestation', 'user1', { status: 'pending' });

      const result = resourceManager.updateResource(resource.id, { status: 'completed' });

      expect(result).toBe(true);
      expect(resource.attributes.status).toBe('completed');
    });

    it('should delete resource', () => {
      const resource = resourceManager.createResource('event', 'user1', {});

      const result = resourceManager.deleteResource(resource.id);

      expect(result).toBe(true);
      expect(resourceManager.getResource(resource.id)).toBeUndefined();
    });
  });

  describe('AttributeManager', () => {
    let attributeManager: AttributeManager;

    beforeEach(() => {
      attributeManager = new AttributeManager();
    });

    afterEach(async () => {
      await attributeManager.clear();
    });

    it('should set attribute', () => {
      const attr = attributeManager.setAttribute('user1', 'department', 'engineering');

      expect(attr.userId).toBe('user1');
      expect(attr.key).toBe('department');
      expect(attr.value).toBe('engineering');
      expect(attr.timestamp).toBeDefined();
    });

    it('should get attribute', () => {
      attributeManager.setAttribute('user1', 'role', 'admin');

      const attr = attributeManager.getAttribute('user1', 'role');

      expect(attr).toBeDefined();
      expect(attr?.value).toBe('admin');
    });

    it('should get all attributes for user', () => {
      attributeManager.setAttribute('user1', 'department', 'engineering');
      attributeManager.setAttribute('user1', 'role', 'admin');
      attributeManager.setAttribute('user1', 'level', 5);

      const attrs = attributeManager.getAttributes('user1');

      expect(attrs.length).toBe(3);
    });

    it('should remove attribute', () => {
      attributeManager.setAttribute('user1', 'temp', 'value');

      const result = attributeManager.removeAttribute('user1', 'temp');

      expect(result).toBe(true);
      expect(attributeManager.getAttribute('user1', 'temp')).toBeUndefined();
    });

    it('should evaluate conditions', () => {
      attributeManager.setAttribute('user1', 'department', 'engineering');
      attributeManager.setAttribute('user1', 'level', 5);

      const result1 = attributeManager.evaluateCondition('user1', {
        department: 'engineering',
        level: { operator: 'greaterThan', value: 3 },
      });

      expect(result1).toBe(true);

      const result2 = attributeManager.evaluateCondition('user1', {
        department: 'sales',
      });

      expect(result2).toBe(false);
    });
  });

  describe('PolicyEngine', () => {
    let policyEngine: PolicyEngine;

    beforeEach(() => {
      policyEngine = new PolicyEngine();
    });

    afterEach(async () => {
      await policyEngine.clear();
    });

    it('should create policy', () => {
      const statements: PolicyStatement[] = [
        {
          id: 'stmt1',
          effect: 'allow',
          actions: ['read'],
          resources: ['observation'],
          priority: 100,
        },
      ];

      const policy = policyEngine.createPolicy('read-obs', statements);

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('read-obs');
      expect(policy.statements.length).toBe(1);
    });

    it('should attach policy to user', () => {
      const statements: PolicyStatement[] = [
        {
          id: 'stmt1',
          effect: 'allow',
          actions: ['create'],
          resources: ['verification'],
          priority: 100,
        },
      ];
      const policy = policyEngine.createPolicy('create-ver', statements);

      const result = policyEngine.attachPolicyToUser('user1', policy.id);

      expect(result).toBe(true);
    });

    it('should evaluate allow policy', () => {
      const statements: PolicyStatement[] = [
        {
          id: 'stmt1',
          effect: 'allow',
          actions: ['read'],
          resources: ['observation', 'verification'],
          priority: 100,
        },
      ];
      const policy = policyEngine.createPolicy('read-all', statements);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const result = policyEngine.evaluatePolicy('user1', 'read', 'observation');

      expect(result.allowed).toBe(true);
      expect(result.matchedPolicies.length).toBeGreaterThan(0);
    });

    it('should evaluate deny policy', () => {
      const denyStatements: PolicyStatement[] = [
        {
          id: 'stmt1',
          effect: 'deny',
          actions: ['delete'],
          resources: ['user'],
          priority: 200,
        },
      ];
      const allowStatements: PolicyStatement[] = [
        {
          id: 'stmt2',
          effect: 'allow',
          actions: ['delete'],
          resources: ['user'],
          priority: 100,
        },
      ];

      const denyPolicy = policyEngine.createPolicy('deny-delete-user', denyStatements);
      const allowPolicy = policyEngine.createPolicy('allow-delete-user', allowStatements);

      policyEngine.attachPolicyToUser('user1', denyPolicy.id);
      policyEngine.attachPolicyToUser('user1', allowPolicy.id);

      const result = policyEngine.evaluatePolicy('user1', 'delete', 'user');

      expect(result.allowed).toBe(false);
    });

    it('should get policies for user', () => {
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['read'], resources: ['observation'], priority: 100 },
      ];
      const policy1 = policyEngine.createPolicy('policy1', stmts);
      const policy2 = policyEngine.createPolicy('policy2', stmts);

      policyEngine.attachPolicyToUser('user1', policy1.id);
      policyEngine.attachPolicyToUser('user1', policy2.id);

      const policies = policyEngine.getPoliciesForUser('user1');

      expect(policies.length).toBe(2);
    });
  });

  describe('AccessDecisionPoint', () => {
    let roleManager: RoleManager;
    let resourceManager: ResourceManager;
    let attributeManager: AttributeManager;
    let policyEngine: PolicyEngine;
    let adp: AccessDecisionPoint;

    beforeEach(() => {
      roleManager = new RoleManager();
      resourceManager = new ResourceManager();
      attributeManager = new AttributeManager();
      policyEngine = new PolicyEngine();
      adp = new AccessDecisionPoint(roleManager, resourceManager, attributeManager, policyEngine);
    });

    afterEach(async () => {
      await roleManager.clear();
      await resourceManager.clear();
      await attributeManager.clear();
      await policyEngine.clear();
      await adp.clear();
    });

    it('should allow access with valid policy', () => {
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['read'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-read', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const decision = adp.decide({
        userId: 'user1',
        action: 'read',
        resource: 'observation',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should deny access without policy', () => {
      const decision = adp.decide({
        userId: 'user1',
        action: 'delete',
        resource: 'user',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('Policy denies access');
    });

    it('should deny access to non-owned resource', () => {
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['update'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-update', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const resource = resourceManager.createResource('observation', 'user2', {});

      const decision = adp.decide({
        userId: 'user1',
        action: 'update',
        resource: 'observation',
        resourceId: resource.id,
      });

      expect(decision.allowed).toBe(false);
    });

    it('should allow access to owned resource', () => {
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['update'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-update', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const resource = resourceManager.createResource('observation', 'user1', {});

      const decision = adp.decide({
        userId: 'user1',
        action: 'update',
        resource: 'observation',
        resourceId: resource.id,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('Owner access granted');
    });

    it('should track audit logs', () => {
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['read'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-read', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      adp.decide({
        userId: 'user1',
        action: 'read',
        resource: 'observation',
      });

      const logs = adp.getAuditLogs('user1');

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].userId).toBe('user1');
      expect(logs[0].action).toBe('read');
      expect(logs[0].resource).toBe('observation');
    });

    it('should cache decisions', () => {
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['read'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-read', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const decision1 = adp.decide({
        userId: 'user1',
        action: 'read',
        resource: 'observation',
      });

      const decision2 = adp.decide({
        userId: 'user1',
        action: 'read',
        resource: 'observation',
      });

      expect(decision1.allowed).toBe(decision2.allowed);
    });
  });

  describe('AuthorizationHub', () => {
    let hub: AuthorizationHub;

    beforeEach(() => {
      hub = new AuthorizationHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide role manager', () => {
      const roleManager = hub.getRoleManager();
      expect(roleManager).toBeDefined();
    });

    it('should provide resource manager', () => {
      const resourceManager = hub.getResourceManager();
      expect(resourceManager).toBeDefined();
    });

    it('should provide attribute manager', () => {
      const attributeManager = hub.getAttributeManager();
      expect(attributeManager).toBeDefined();
    });

    it('should provide policy engine', () => {
      const policyEngine = hub.getPolicyEngine();
      expect(policyEngine).toBeDefined();
    });

    it('should provide access decision point', () => {
      const adp = hub.getAccessDecisionPoint();
      expect(adp).toBeDefined();
    });

    it('should authorize access', () => {
      const policyEngine = hub.getPolicyEngine();
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['read'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-read', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const decision = hub.authorize({
        userId: 'user1',
        action: 'read',
        resource: 'observation',
      });

      expect(decision.allowed).toBe(true);
    });

    it('should check access convenience method', () => {
      const policyEngine = hub.getPolicyEngine();
      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['create'], resources: ['verification'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-create', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const canAccess = hub.canAccess('user1', 'create', 'verification');

      expect(canAccess).toBe(true);
    });

    it('should integrate all components for complex scenario', () => {
      const roleManager = hub.getRoleManager();
      const resourceManager = hub.getResourceManager();
      const attributeManager = hub.getAttributeManager();
      const policyEngine = hub.getPolicyEngine();

      const role = roleManager.createRole('editor');
      const permission = roleManager.createPermission('update', 'observation');
      roleManager.addPermissionToRole(role.id, permission.id);

      attributeManager.setAttribute('user1', 'org', 'acme');

      const resource = resourceManager.createResource('observation', 'user1', { org: 'acme' });

      const stmts: PolicyStatement[] = [
        { id: 'stmt1', effect: 'allow', actions: ['update'], resources: ['observation'], priority: 100 },
      ];
      const policy = policyEngine.createPolicy('allow-update-obs', stmts);
      policyEngine.attachPolicyToUser('user1', policy.id);

      const canUpdate = hub.canAccess('user1', 'update', 'observation', resource.id);

      expect(canUpdate).toBe(true);
    });
  });
});
